import "server-only";

import connectionPool from "@/utilities/db";
import { getFlightSheet } from "@/utilities/flightSheetSource";
import {
  checkedCells,
  clearedFlightCells,
  findWritableRows,
  flightCells,
  isBilledStatus,
  PAPER_COLUMNS,
  parseFlightSheet,
  ReviewStatus,
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

async function withAircraftLock<T>(
  registration: string,
  work: (tab: { sheetName: string; firstDataRow: number }) => Promise<T>
): Promise<T> {
  const client = await connectionPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `flight-sheet:${registration}`,
    ]);
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

/** Appends flights after the last flight row; returns the rows they went to */
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

    const formulas = await sheet.readFormulas(sheetName, parsed.columns.airborne);
    const rows = findWritableRows(values, parsed, formulas, firstDataRow);
    if (rows.length < inputs.length) {
      throw new FlightSheetWriteError(
        "Lentopäiväkirjan valmiit kaavarivit ovat lopussa. Pyydä laskuttajaa jatkamaan kaavoja taulukossa."
      );
    }

    await sheet.writeCells(
      sheetName,
      inputs.flatMap((input, i) => flightCells(input, rows[i], parsed.columns)),
      { parse: true }
    );

    // Read back: each flight is where it was written, with its ID
    const after = parseFlightSheet(await sheet.readTab(sheetName), firstDataRow);
    inputs.forEach((input, i) => {
      const written = after.flights.find((flight) => flight.row === rows[i]);
      if (written?.id !== input.id) {
        throw new FlightSheetWriteError("Lennon tallennus taulukkoon epäonnistui");
      }
    });
    return rows.slice(0, inputs.length);
  });
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
      throw new FlightSheetWriteError(
        "Lentopäiväkirjan valmiit kaavarivit ovat lopussa. Jatka kaavoja taulukossa ja yritä uudelleen."
      );
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
