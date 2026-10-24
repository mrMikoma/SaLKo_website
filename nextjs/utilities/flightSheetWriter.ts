import "server-only";

import { DateTime } from "luxon";
import connectionPool from "@/utilities/db";
import { getFlightSheet } from "@/utilities/flightSheetSource";
import {
  checkedCells,
  clearedFlightCells,
  findWritableRows,
  flightCells,
  flightTimes,
  isBilledStatus,
  nameKey,
  PAPER_COLUMNS,
  ParsedFlight,
  ParsedSheet,
  parseFlightSheet,
  parseTimeOfDay,
  ReviewStatus,
  SHEET_ZONE,
  SheetFlightInput,
} from "@/utilities/flightSheetParser";
import { inputHash } from "@/utilities/flightInputHash";

/**
 * Writes flights into an aircraft's tab of the flight log sheet. Only the
 * input columns are written, into the rows already pre-filled with the
 * formulas, so the sheet's running totals keep working. A Postgres advisory
 * lock per aircraft keeps two writers from picking the same rows.
 */

export class FlightSheetWriteError extends Error {}

// How long a writer waits for another one on the same aircraft. Each holds
// the lock for a few Sheets requests, which time out after 20 s
// (flightSheetSource.ts), so a hung request doesn't queue everyone for long.
const LOCK_TIMEOUT = "15s";

async function withAircraftLock<T>(
  registration: string,
  work: (tab: { sheetName: string; firstDataRow: number }) => Promise<T>
): Promise<T> {
  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`);
    try {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `flight-sheet:${registration}`,
      ]);
    } catch (error) {
      if ((error as { code?: string }).code === "55P03") {
        throw new FlightSheetWriteError(
          "Lentopäiväkirjaan tallennetaan juuri toista lentoa. Yritä hetken päästä uudelleen."
        );
      }
      throw error;
    }
    const tab = await client.query(
      "SELECT sheet_name, first_data_row FROM aircraft_sheets WHERE registration = $1 AND active",
      [registration]
    );
    if (tab.rowCount === 0) {
      throw new FlightSheetWriteError(`Koneelle ${registration} ei ole lentopäiväkirjaa`);
    }
    const result = await work({
      sheetName: tab.rows[0].sheet_name,
      firstDataRow: tab.rows[0].first_data_row,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const inputTimes = (input: SheetFlightInput) =>
  flightTimes(input.flightDate, parseTimeOfDay(input.takeoff), parseTimeOfDay(input.landing));

/** Whether a row in the sheet is this input as it was written */
const isWrittenAs = (flight: ParsedFlight, input: SheetFlightInput) => {
  const { takeoffAt, landingAt } = inputTimes(input);
  return (
    flight.flightDate === input.flightDate &&
    nameKey(flight.picName) === nameKey(input.picName) &&
    flight.takeoffAt === takeoffAt &&
    flight.landingAt === landingAt
  );
};

const clock = (iso: string) => DateTime.fromISO(iso).setZone(SHEET_ZONE).toFormat("HH.mm");

/** A flight already in the tab that overlaps an input in time, if any */
function overlapping(parsed: ParsedSheet, inputs: SheetFlightInput[]) {
  for (const input of inputs) {
    const { takeoffAt, landingAt } = inputTimes(input);
    if (!takeoffAt || !landingAt) continue;
    const flight = parsed.flights.find(
      (f) =>
        f.takeoffAt &&
        f.landingAt &&
        Date.parse(f.takeoffAt) < Date.parse(landingAt) &&
        Date.parse(takeoffAt) < Date.parse(f.landingAt)
    );
    if (flight) return flight;
  }
  return null;
}

/**
 * Refuses a write that went over another flight. Sheets has no way to write
 * only if nothing changed, so a row inserted above the formula rows between
 * the read and the write would shift the last flight into the row being
 * written. Every flight that was in the tab before must still be there after,
 * unchanged (its input hash), apart from the rows the write itself changes.
 */
function checkNothingLost(before: ParsedSheet, after: ParsedSheet, changedIds: Set<string> = new Set()) {
  const left = new Map<string, number>();
  for (const flight of after.flights) {
    const hash = inputHash(flight);
    left.set(hash, (left.get(hash) ?? 0) + 1);
  }
  for (const flight of before.flights) {
    if (flight.id && changedIds.has(flight.id)) continue;
    const hash = inputHash(flight);
    const count = left.get(hash) ?? 0;
    if (count === 0) {
      throw new FlightSheetWriteError(
        `Taulukkoa muokattiin samaan aikaan, ja rivin ${flight.row} lento on voinut korvautua. Pyydä laskuttajaa tarkistamaan rivi ennen kuin tallennat uudelleen.`
      );
    }
    left.set(hash, count - 1);
  }
}

/**
 * Appends flights after the last flight row; returns the rows they went to.
 * Flights whose IDs are already in the tab, as written, aren't written again:
 * that is the same save sent twice, after a lost connection.
 */
export async function appendFlightsToSheet(
  registration: string,
  inputs: SheetFlightInput[]
): Promise<number[]> {
  return withAircraftLock(registration, async ({ sheetName, firstDataRow }) => {
    const sheet = getFlightSheet();
    const values = await sheet.readTab(sheetName);
    const parsed = parseFlightSheet(values, firstDataRow);
    if (parsed.errors.length > 0) {
      throw new FlightSheetWriteError(parsed.errors.join("; "));
    }
    if (parsed.columns.airborne === undefined) {
      throw new FlightSheetWriteError("Taulukosta puuttuu Ilmassa oloaika -sarake");
    }

    const already = inputs.map((input) => parsed.flights.find((flight) => flight.id === input.id));
    if (already.some(Boolean)) {
      const differs = already.findIndex((flight, i) => !flight || !isWrittenAs(flight, inputs[i]));
      if (differs === -1) return already.map((flight) => flight!.row);
      const row = already.find(Boolean)!.row;
      throw new FlightSheetWriteError(
        `Lento on jo taulukossa rivillä ${row}, mutta eri tiedoin. Tarkista Omat lennot ennen kuin tallennat uudelleen.`
      );
    }

    const overlap = overlapping(parsed, inputs);
    if (overlap) {
      throw new FlightSheetWriteError(
        `Koneella ${registration} on jo lento ${DateTime.fromISO(overlap.flightDate).toFormat("d.M.yyyy")} klo ${clock(
          overlap.takeoffAt!
        )}–${clock(overlap.landingAt!)} (${overlap.picName}, taulukon rivi ${overlap.row}), päällekkäin tämän kanssa. Jos se on sama lento, sitä ei tarvitse kirjata uudelleen.`
      );
    }

    const formulas = await sheet.readFormulas(sheetName, parsed.columns.airborne);
    const rows = findWritableRows(values, parsed, formulas, firstDataRow);
    if (rows.length < inputs.length) {
      throw new FlightSheetWriteError(noRowsLeft(values, parsed, formulas, rows, firstDataRow));
    }

    await sheet.writeCells(
      sheetName,
      inputs.flatMap((input, i) => flightCells(input, rows[i], parsed.columns)),
      { parse: true }
    );

    // Read back: each flight is where it was written, with its ID, and
    // nothing else was written over
    const after = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    inputs.forEach((input, i) => {
      const written = after.flights.find((flight) => flight.row === rows[i]);
      if (written?.id !== input.id) {
        throw new FlightSheetWriteError("Lennon tallennus taulukkoon epäonnistui");
      }
    });
    checkNothingLost(parsed, after);
    return rows.slice(0, inputs.length);
  });
}

/**
 * Why there aren't enough rows to write into: the formulas run out, or a row
 * after the last flight has something typed in it but no readable date
 */
function noRowsLeft(
  values: Parameters<typeof findWritableRows>[0],
  parsed: ParsedSheet,
  formulas: string[],
  rows: number[],
  firstDataRow: number
): string {
  const next = (rows.at(-1) ?? parsed.flights.reduce((last, f) => Math.max(last, f.row), firstDataRow - 1)) + 1;
  if (formulas[next - 1]?.startsWith("=") && (values[next - 1] ?? []).some((cell) => String(cell ?? "").trim())) {
    return `Taulukon rivillä ${next} on tietoja mutta ei luettavaa päivämäärää, joten uutta lentoa ei kirjoiteta sen päälle. Pyydä laskuttajaa täydentämään tai tyhjentämään rivi.`;
  }
  return "Lentopäiväkirjan valmiit kaavarivit ovat lopussa. Pyydä laskuttajaa jatkamaan kaavoja taulukossa.";
}

/**
 * Clears a flight the website wrote, while it is still the last row and
 * nobody has checked it. A row further up stays: clearing it would leave a
 * gap in the running totals, so the biller fixes those in the sheet.
 */
export async function clearWebFlight(registration: string, id: string): Promise<void> {
  await withAircraftLock(registration, async ({ sheetName, firstDataRow }) => {
    const sheet = getFlightSheet();
    const parsed = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    const flight = parsed.flights.find((f) => f.id === id);
    if (!flight) {
      throw new FlightSheetWriteError("Lentoa ei enää löydy taulukosta");
    }
    if (parsed.flights.some((f) => f.row > flight.row)) {
      throw new FlightSheetWriteError(
        "Taulukossa on jo myöhempiä lentoja, joten tätä ei voi enää kumota. Pyydä laskuttajaa korjaamaan rivi."
      );
    }
    if (flight.source !== "web" || flight.status) {
      throw new FlightSheetWriteError("Lento on jo käsitelty, eikä sitä voi enää kumota");
    }
    await sheet.writeCells(sheetName, clearedFlightCells(flight.row, parsed.columns));

    const after = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    if (after.flights.some((f) => f.id === id)) {
      throw new FlightSheetWriteError("Kumoaminen taulukossa epäonnistui");
    }
    checkNothingLost(parsed, after, new Set([id]));
  });
}

export interface StatusChange {
  id: string;
  oldStatus: string | null;
}

/**
 * Sets Tila on flights the biller has compared with the paper book. Each
 * flight comes with the input hash the biller saw: if the row has changed in
 * the sheet since then, nothing is written and the changed rows are named.
 * Flights in a closed billing period are not touched.
 */
export async function setFlightStatuses(
  registration: string,
  flights: { id: string; inputHash?: string | null }[],
  status: ReviewStatus
): Promise<StatusChange[]> {
  return withAircraftLock(registration, async ({ sheetName, firstDataRow }) => {
    const sheet = getFlightSheet();
    const parsed = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    if (parsed.errors.length > 0) {
      throw new FlightSheetWriteError(parsed.errors.join("; "));
    }
    const statusColumn = parsed.columns.status;
    if (statusColumn === undefined) {
      throw new FlightSheetWriteError("Taulukosta puuttuu Tila-sarake");
    }

    const byId = new Map(parsed.flights.map((flight) => [flight.id, flight]));
    const missing: string[] = [];
    const changedRows: number[] = [];
    const billedRows: number[] = [];
    for (const { id, inputHash: seen } of flights) {
      const flight = byId.get(id);
      if (!flight) missing.push(id);
      else if (seen && inputHash(flight) !== seen) changedRows.push(flight.row);
      else if (isBilledStatus(flight.status)) billedRows.push(flight.row);
    }
    if (missing.length > 0) {
      throw new FlightSheetWriteError(
        "Osaa lennoista ei enää löydy taulukosta. Päivitä sivu ja yritä uudelleen."
      );
    }
    if (changedRows.length > 0) {
      throw new FlightSheetWriteError(
        `Rivejä on muutettu taulukossa sen jälkeen, kun sivu avattiin: ${changedRows.join(", ")}. Päivitä sivu ja tarkista ne uudelleen.`
      );
    }
    if (billedRows.length > 0) {
      throw new FlightSheetWriteError(
        `Rivit ${billedRows.join(", ")} kuuluvat jo laskutukseen, eikä niiden tilaa muuteta täällä.`
      );
    }

    const changes = flights
      .map(({ id }) => byId.get(id)!)
      .filter((flight) => (flight.status ?? "") !== status);
    await sheet.writeCells(
      sheetName,
      changes.map((flight) => ({ row: flight.row, column: statusColumn, value: status }))
    );
    return changes.map((flight) => ({ id: flight.id!, oldStatus: flight.status }));
  });
}

export interface PaperPageWrite {
  // New flights, appended like a member's entry
  append: SheetFlightInput[];
  // Flights already in the sheet that the paper book corrects: their typed-in
  // cells are rewritten, keeping the ID and Lähde
  corrections: { id: string; inputHash: string | null; input: SheetFlightInput }[];
  // Flights already in the sheet that match the paper book as they are
  confirms: { id: string; inputHash: string | null }[];
  logPage: string | null;
}

/**
 * Writes one page of the paper book in a single batch: new flights into the
 * formula rows, corrections into their own rows, and Tila Tarkistettu plus the
 * page number on every flight of the page. Like setFlightStatuses it refuses
 * the whole page when a matched row changed since the preview, or is already
 * in billing.
 */
export async function writePaperPage(
  registration: string,
  page: PaperPageWrite
): Promise<{ appendedRows: number[]; matched: StatusChange[] }> {
  return withAircraftLock(registration, async ({ sheetName, firstDataRow }) => {
    const sheet = getFlightSheet();
    const values = await sheet.readTab(sheetName);
    const parsed = parseFlightSheet(values, firstDataRow);
    if (parsed.errors.length > 0) {
      throw new FlightSheetWriteError(parsed.errors.join("; "));
    }
    const { columns } = parsed;
    if (columns.status === undefined || columns.airborne === undefined) {
      throw new FlightSheetWriteError("Taulukosta puuttuu Tila- tai Ilmassa oloaika -sarake");
    }

    const byId = new Map(parsed.flights.map((flight) => [flight.id, flight]));
    const matched = [...page.corrections, ...page.confirms];
    const changedRows: number[] = [];
    const billedRows: number[] = [];
    for (const { id, inputHash: seen } of matched) {
      const flight = byId.get(id);
      if (!flight) {
        throw new FlightSheetWriteError(
          "Osa sivun lennoista on poistunut taulukosta. Tarkista sivu uudelleen."
        );
      }
      if (seen && inputHash(flight) !== seen) changedRows.push(flight.row);
      else if (isBilledStatus(flight.status)) billedRows.push(flight.row);
    }
    if (changedRows.length > 0) {
      throw new FlightSheetWriteError(
        `Rivejä on muutettu taulukossa tarkistuksen jälkeen: ${changedRows.join(", ")}. Tarkista sivu uudelleen.`
      );
    }
    if (billedRows.length > 0) {
      throw new FlightSheetWriteError(
        `Rivit ${billedRows.join(", ")} kuuluvat jo laskutukseen. Korjaa ne laskuttajan kanssa taulukossa.`
      );
    }

    const formulas = await sheet.readFormulas(sheetName, columns.airborne);
    const rows = findWritableRows(values, parsed, formulas, firstDataRow);
    if (rows.length < page.append.length) {
      throw new FlightSheetWriteError(noRowsLeft(values, parsed, formulas, rows, firstDataRow));
    }

    const checked = { status: "Tarkistettu" as const, logPage: page.logPage };
    // A correction rewrites what the paper says, and the remark only when the
    // paper has one; the row keeps its ID, Lähde, fuel, oil and hour meter
    const correctedColumns = (input: SheetFlightInput) =>
      new Set(
        [...PAPER_COLUMNS, ...(input.remarks ? (["remarks"] as const) : [])].map(
          (key) => columns[key]
        )
      );
    const cells = [
      ...page.append.flatMap((input, i) => flightCells({ ...input, ...checked }, rows[i], columns)),
      ...page.corrections.flatMap(({ id, input }) => {
        const row = byId.get(id)!.row;
        const keep = correctedColumns(input);
        return [
          ...flightCells({ ...input, id }, row, columns).filter((cell) => keep.has(cell.column)),
          ...checkedCells(row, columns, page.logPage),
        ];
      }),
      ...page.confirms.flatMap(({ id }) => checkedCells(byId.get(id)!.row, columns, page.logPage)),
    ];
    await sheet.writeCells(sheetName, cells, { parse: true });

    const after = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    page.append.forEach((input, i) => {
      if (after.flights.find((flight) => flight.row === rows[i])?.id !== input.id) {
        throw new FlightSheetWriteError("Sivun tallennus taulukkoon epäonnistui");
      }
    });
    checkNothingLost(parsed, after, new Set(page.corrections.map(({ id }) => id)));

    return {
      appendedRows: rows.slice(0, page.append.length),
      // Each confirmed or corrected flight with the Tila it had
      matched: matched.map(({ id }) => ({ id, oldStatus: byId.get(id)!.status })),
    };
  });
}

export interface BillingCellUpdate {
  id: string;
  // The flight as billed; null skips the check (marking a payment)
  inputHash: string | null;
  status: "Laskutettu" | "Ei laskuteta" | "Maksettu";
  period?: string;
}

/**
 * Writes what billing sets in the sheet: Tila Laskutettu or Ei laskuteta and
 * the period's name when a period closes, Maksettu (or back to Laskutettu)
 * for a payment. The whole write is refused if a flight has gone, changed
 * since it was billed, or isn't in a state this step comes after.
 */
export async function writeBillingCells(
  registration: string,
  updates: BillingCellUpdate[],
  allowedFrom: string[]
): Promise<void> {
  if (updates.length === 0) return;
  await withAircraftLock(registration, async ({ sheetName, firstDataRow }) => {
    const sheet = getFlightSheet();
    const parsed = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    if (parsed.errors.length > 0) {
      throw new FlightSheetWriteError(parsed.errors.join("; "));
    }
    const { status: statusColumn, billingPeriod: periodColumn } = parsed.columns;
    if (statusColumn === undefined || periodColumn === undefined) {
      throw new FlightSheetWriteError("Taulukosta puuttuu Tila- tai Laskutusjakso-sarake");
    }

    const byId = new Map(parsed.flights.map((flight) => [flight.id, flight]));
    const allowed = allowedFrom.map((status) => status.toLowerCase());
    const problems: string[] = [];
    for (const update of updates) {
      const flight = byId.get(update.id);
      if (!flight) {
        problems.push("lento puuttuu taulukosta");
      } else if (update.inputHash && inputHash(flight) !== update.inputHash) {
        problems.push(`rivi ${flight.row} on muuttunut`);
      } else if (!allowed.includes((flight.status ?? "").trim().toLowerCase())) {
        problems.push(`rivin ${flight.row} tila on ${flight.status ?? "Kirjattu"}`);
      }
    }
    if (problems.length > 0) {
      throw new FlightSheetWriteError(
        `Taulukko ei vastaa laskutusta (${[...new Set(problems)].join(", ")}). Synkronoi ja tarkista jakso uudelleen.`
      );
    }

    await sheet.writeCells(
      sheetName,
      updates.flatMap((update) => {
        const row = byId.get(update.id)!.row;
        return [
          { row, column: statusColumn, value: update.status },
          ...(update.period !== undefined ? [{ row, column: periodColumn, value: update.period }] : []),
        ];
      })
    );
  });
}
