import "server-only";

import connectionPool from "@/utilities/db";
import { getFlightSheet } from "@/utilities/flightSheetSource";
import {
  clearedFlightCells,
  findWritableRows,
  flightCells,
  isBilledStatus,
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
