import "server-only";

import { createHash, randomUUID } from "crypto";
import { DateTime } from "luxon";
import type { PoolClient } from "pg";
import connectionPool from "@/utilities/db";
import { FlightSheet, getFlightSheet, SheetCell } from "@/utilities/flightSheetSource";
import { configuredServiceAccount, describeSheetError } from "@/utilities/googleSheetsSetup";
import {
  FlightIssue,
  findFlightIssues,
  findUndatedRowIssues,
  isBilledStatus,
  nameKey,
  parseFlightSheet,
  ParsedFlight,
  ParsedSheet,
  SHEET_ZONE,
} from "@/utilities/flightSheetParser";
import { inputHash } from "@/utilities/flightInputHash";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "flight-sync" });

/**
 * Copies the flight log sheet into sheet_flights. The sheet is the only place
 * flights are written: the sync only reads it, apart from giving rows without
 * an ID (or with an ID copied from another row) one (assignIds).
 */

// pg advisory lock: only one sync runs at a time, whoever starts it
const SYNC_LOCK_KEY = 4_201_962;
// Pages that show flights sync first when the copy is older than this
const STALE_AFTER_MS = 10 * 60 * 1000;
// After a failed sync, wait this long before the pages try again by themselves
const RETRY_AFTER_ERROR_MS = 2 * 60 * 1000;
const KEEP_SYNC_RUNS = 200;

export interface SyncSummary {
  status: "success" | "error" | "busy";
  rowsRead: number;
  rowsChanged: number;
  idsAssigned: number;
  issues: number;
  error?: string;
}

const emptySummary = (status: SyncSummary["status"], error?: string): SyncSummary => ({
  status,
  rowsRead: 0,
  rowsChanged: 0,
  idsAssigned: 0,
  issues: 0,
  error,
});

const round = (value: number | null) => (value === null ? null : Math.round(value));

function toRecord(flight: ParsedFlight) {
  return {
    id: flight.id,
    sheet_row: flight.row,
    flight_date: flight.flightDate,
    pic_name: flight.picName,
    pic_key: nameKey(flight.picName),
    second_name: flight.secondName,
    second_key: flight.secondName ? nameKey(flight.secondName) : null,
    persons_on_board: round(flight.personsOnBoard),
    departure: flight.departure,
    arrival: flight.arrival,
    takeoff_at: flight.takeoffAt,
    landing_at: flight.landingAt,
    airborne_minutes: flight.airborneMinutes,
    airframe_minutes: flight.airframeMinutes,
    landings: round(flight.landings),
    total_landings: round(flight.totalLandings),
    purpose_code: flight.purposeCode,
    fuel_litres: flight.fuelLitres,
    oil_quarts: flight.oilQuarts,
    hour_meter: flight.hourMeter,
    remarks: flight.remarks,
    log_page: flight.logPage,
    book_total: flight.bookTotal,
    book_error: flight.bookError,
    maintenance: flight.maintenance,
    source: flight.source,
    status: flight.status,
    billing_period: flight.billingPeriod,
    raw: flight.raw,
    content_hash: createHash("sha256").update(JSON.stringify(flight.raw)).digest("hex"),
    input_hash: inputHash(flight),
  };
}

const UPSERT_FLIGHTS = `
  INSERT INTO sheet_flights (
    id, registration, sheet_row, flight_date, pic_name, pic_key, second_name, second_key,
    persons_on_board, departure, arrival, takeoff_at, landing_at, airborne_minutes,
    airframe_minutes, landings, total_landings, purpose_code, fuel_litres, oil_quarts,
    hour_meter, remarks, log_page, book_total, book_error, maintenance, source, status,
    billing_period, raw, content_hash, input_hash, synced_at, missing_since
  )
  SELECT
    f.id, $2, f.sheet_row, f.flight_date, f.pic_name, f.pic_key, f.second_name, f.second_key,
    f.persons_on_board, f.departure, f.arrival, f.takeoff_at, f.landing_at, f.airborne_minutes,
    f.airframe_minutes, f.landings, f.total_landings, f.purpose_code, f.fuel_litres, f.oil_quarts,
    f.hour_meter, f.remarks, f.log_page, f.book_total, f.book_error, f.maintenance, f.source, f.status,
    f.billing_period, f.raw, f.content_hash, f.input_hash, NOW(), NULL
  FROM jsonb_to_recordset($1::jsonb) AS f(
    id uuid, sheet_row int, flight_date date, pic_name text, pic_key text, second_name text,
    second_key text, persons_on_board smallint, departure text, arrival text,
    takeoff_at timestamptz, landing_at timestamptz, airborne_minutes int, airframe_minutes int,
    landings int, total_landings int, purpose_code text, fuel_litres numeric, oil_quarts numeric,
    hour_meter numeric, remarks text, log_page text, book_total text, book_error text,
    maintenance text, source text, status text, billing_period text, raw jsonb, content_hash text,
    input_hash text
  )
  ON CONFLICT (id) DO UPDATE SET
    registration = EXCLUDED.registration, sheet_row = EXCLUDED.sheet_row,
    flight_date = EXCLUDED.flight_date, pic_name = EXCLUDED.pic_name, pic_key = EXCLUDED.pic_key,
    second_name = EXCLUDED.second_name, second_key = EXCLUDED.second_key,
    persons_on_board = EXCLUDED.persons_on_board, departure = EXCLUDED.departure,
    arrival = EXCLUDED.arrival, takeoff_at = EXCLUDED.takeoff_at, landing_at = EXCLUDED.landing_at,
    airborne_minutes = EXCLUDED.airborne_minutes, airframe_minutes = EXCLUDED.airframe_minutes,
    landings = EXCLUDED.landings, total_landings = EXCLUDED.total_landings,
    purpose_code = EXCLUDED.purpose_code, fuel_litres = EXCLUDED.fuel_litres,
    oil_quarts = EXCLUDED.oil_quarts, hour_meter = EXCLUDED.hour_meter, remarks = EXCLUDED.remarks,
    log_page = EXCLUDED.log_page, book_total = EXCLUDED.book_total,
    book_error = EXCLUDED.book_error, maintenance = EXCLUDED.maintenance, source = EXCLUDED.source,
    status = EXCLUDED.status, billing_period = EXCLUDED.billing_period, raw = EXCLUDED.raw,
    content_hash = EXCLUDED.content_hash, input_hash = EXCLUDED.input_hash, synced_at = NOW(),
    missing_since = NULL
  WHERE sheet_flights.content_hash IS DISTINCT FROM EXCLUDED.content_hash
     OR sheet_flights.input_hash IS DISTINCT FROM EXCLUDED.input_hash
     OR sheet_flights.sheet_row <> EXCLUDED.sheet_row
     OR sheet_flights.registration <> EXCLUDED.registration
     OR sheet_flights.missing_since IS NOT NULL
  RETURNING id`;

interface SyncContext {
  purposes: Map<string, { isTraining: boolean }>;
  knownPilots: Set<string>;
  tabIds: Map<string, number>;
  today: string;
}

/**
 * Gives every flight row an ID, writing the new ones into the sheet:
 * - A row without one gets a new UUID, or its old ID back when its ID was
 *   lost (the ID column cleared, a row cut and pasted without it): a flight
 *   of this aircraft in the database with the same input whose ID is nowhere
 *   in the tab.
 * - Of rows sharing an ID (a whole row copied), the one that matches the
 *   database keeps it and the copies get new ones, reported: their Tila and
 *   Laskutusjakso came with the copy.
 * - A row copied from another aircraft's tab gets a new ID too, while that
 *   tab still has the flight: syncing both would move the flight between
 *   the aircraft on every run. A row moved there (gone from the other tab
 *   since its last sync) keeps its ID and moves the flight.
 * Refuses a tab whose rows carry other flights' IDs, as after sorting the
 * flight columns without the website's: syncing it would pair Tila and the
 * history with the wrong flights.
 */
export async function assignIds(
  client: PoolClient,
  registration: string,
  parsed: ParsedSheet
): Promise<{ newIds: SheetCell[]; issues: FlightIssue[] }> {
  const stored = new Map<string, { input_hash: string | null; sheet_row: number }>(
    (
      await client.query("SELECT id, input_hash, sheet_row FROM sheet_flights WHERE registration = $1", [
        registration,
      ])
    ).rows.map((row) => [row.id, row])
  );
  const storedByHash = new Map<string, string[]>();
  for (const [id, { input_hash }] of stored) {
    if (input_hash) storedByHash.set(input_hash, [...(storedByHash.get(input_hash) ?? []), id]);
  }

  const shuffled = parsed.flights.filter((flight) => {
    const before = flight.id ? stored.get(flight.id) : undefined;
    if (!before?.input_hash) return false;
    const hash = inputHash(flight);
    return hash !== before.input_hash && (storedByHash.get(hash) ?? []).some((id) => id !== flight.id);
  });
  if (shuffled.length >= 3) {
    throw new Error(
      `Taulukon ID-sarake ei enää vastaa lentoja (rivit ${shuffled
        .slice(0, 5)
        .map((f) => f.row)
        .join(", ")}${shuffled.length > 5 ? " …" : ""}). Onko lentojen sarakkeita lajiteltu tai siirretty ilman sarakkeita ID–Laskutusjakso? Palauta taulukon edellinen versio (Tiedosto → Versiohistoria) ja synkronoi sitten.`
    );
  }

  const rowsById = new Map<string, ParsedFlight[]>();
  for (const flight of parsed.flights) {
    if (flight.id) rowsById.set(flight.id, [...(rowsById.get(flight.id) ?? []), flight]);
  }
  const present = new Set([...rowsById.keys(), ...parsed.undatedRows.flatMap((row) => (row.id ? [row.id] : []))]);

  // Where each copy came from, for the report
  const copiedFrom = new Map<ParsedFlight, string>();
  const elsewhere = (
    await client.query(
      `SELECT id, registration FROM sheet_flights
       WHERE id = ANY($1::uuid[]) AND registration <> $2 AND missing_since IS NULL`,
      [[...rowsById.keys()], registration]
    )
  ).rows;
  for (const { id, registration: other } of elsewhere) {
    for (const copy of rowsById.get(id) ?? []) {
      copy.id = null;
      copiedFrom.set(copy, `koneen ${other} lennolla`);
    }
    rowsById.delete(id);
  }
  for (const [id, rows] of rowsById) {
    if (rows.length < 2) continue;
    const before = stored.get(id);
    const keeper =
      rows.find((flight) => before && inputHash(flight) === before.input_hash) ??
      rows.find((flight) => before && flight.row === before.sheet_row) ??
      rows[0];
    for (const copy of rows) {
      if (copy === keeper) continue;
      copy.id = null;
      copiedFrom.set(copy, `rivillä ${keeper.row}`);
    }
  }

  const lostByHash = new Map<string, string[]>();
  for (const [id, { input_hash }] of stored) {
    if (input_hash && !present.has(id)) lostByHash.set(input_hash, [...(lostByHash.get(input_hash) ?? []), id]);
  }

  const newIds: SheetCell[] = [];
  const issues: FlightIssue[] = [];
  for (const flight of parsed.flights) {
    if (flight.id) continue;
    const copyOf = copiedFrom.get(flight);
    flight.id = (copyOf === undefined ? lostByHash.get(inputHash(flight))?.shift() : undefined) ?? randomUUID();
    newIds.push({ row: flight.row, column: parsed.columns.id!, value: flight.id });
    if (copyOf !== undefined) {
      issues.push({
        row: flight.row,
        flightId: flight.id,
        kind: "copied_row",
        message: `Rivillä oli sama ID kuin ${copyOf}, joten se sai uuden.${
          flight.status || flight.billingPeriod
            ? ` Tarkista sen Tila (${flight.status ?? "tyhjä"}) ja Laskutusjakso (${flight.billingPeriod ?? "tyhjä"}): ne kopioituivat rivin mukana.`
            : ""
        }`,
      });
    }
  }
  return { newIds, issues };
}

/** One aircraft's tab into sheet_flights, in a transaction of its own */
async function syncTab(
  client: PoolClient,
  sheet: FlightSheet,
  { registration, sheet_name, first_data_row }: { registration: string; sheet_name: string; first_data_row: number },
  context: SyncContext
) {
  const parsed = parseFlightSheet(await sheet.readTab(sheet_name), first_data_row);
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.join("; "));
  }

  const { newIds, issues: idIssues } = await assignIds(client, registration, parsed);
  await sheet.writeCells(sheet_name, newIds);

  // A flight a closed period billed must still say so in the sheet. If Tila
  // was edited by hand, the site still counts it as billed, but marking the
  // payer paid would be refused until the sheet is fixed.
  const billed = new Map(
    (
      await client.query(
        `SELECT b.flight_id, bool_and(b.kind = 'unbilled') AS unbilled, min(p.name) AS period
         FROM billing_lines b JOIN billing_periods p ON p.id = b.period_id
         WHERE b.registration = $1 AND b.flight_id IS NOT NULL
         GROUP BY b.flight_id`,
        [registration]
      )
    ).rows.map((row) => [row.flight_id as string, row])
  );
  const billedIssues: FlightIssue[] = parsed.flights.flatMap((flight) => {
    const line = billed.get(flight.id!);
    if (!line || isBilledStatus(flight.status)) return [];
    return [
      {
        row: flight.row,
        flightId: flight.id,
        kind: "billed_status" as const,
        message: `Lento on laskutettu jaksossa ${line.period}, mutta sen Tila on ${
          flight.status ?? "tyhjä"
        }. Kirjoita Tilaksi takaisin ${line.unbilled ? "Ei laskuteta" : "Laskutettu (tai Maksettu, jos maksettu)"}.`,
      },
    ];
  });

  const issues = [
    ...findFlightIssues(parsed.flights, context),
    ...findUndatedRowIssues(parsed.undatedRows),
    ...idIssues,
    ...billedIssues,
  ].sort((a, b) => a.row - b.row);
  // A flight whose date can no longer be read keeps its last copy rather than
  // going missing: billing would take a missing flight as removed
  const seenIds = [
    ...parsed.flights.map((flight) => flight.id!),
    ...parsed.undatedRows.flatMap((row) => (row.id ? [row.id] : [])),
  ];

  await client.query("BEGIN");
  try {
    const upserted = await client.query(UPSERT_FLIGHTS, [
      JSON.stringify(parsed.flights.map(toRecord)),
      registration,
    ]);
    await client.query(
      `UPDATE sheet_flights SET missing_since = NOW()
       WHERE registration = $1 AND missing_since IS NULL AND NOT (id = ANY($2::uuid[]))`,
      [registration, seenIds]
    );
    await client.query("DELETE FROM sheet_flight_issues WHERE registration = $1", [registration]);
    await client.query(
      `INSERT INTO sheet_flight_issues (registration, sheet_row, flight_id, kind, message)
       SELECT $2, i.row, i.flight_id, i.kind, i.message
       FROM jsonb_to_recordset($1::jsonb) AS i(row int, flight_id uuid, kind text, message text)`,
      [
        JSON.stringify(
          issues.map((issue) => ({
            row: issue.row,
            flight_id: issue.flightId,
            kind: issue.kind,
            message: issue.message,
          }))
        ),
        registration,
      ]
    );
    if (context.tabIds.has(sheet_name)) {
      await client.query("UPDATE aircraft_sheets SET sheet_gid = $2 WHERE registration = $1", [
        registration,
        context.tabIds.get(sheet_name),
      ]);
    }
    await client.query("COMMIT");
    return {
      rowsRead: parsed.flights.length,
      rowsChanged: upserted.rowCount ?? 0,
      idsAssigned: newIds.length,
      issues: issues.length,
    };
  } catch (error) {
    // Before anything else on this connection, or the next query fails with
    // "current transaction is aborted" and hides this error
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export async function syncFlightSheets(
  triggeredBy: string,
  // Wait for a sync that is already running (someone pressed the button, or a
  // flight was just written) instead of giving up with "busy"
  { wait = false }: { wait?: boolean } = {}
): Promise<SyncSummary> {
  if (!connectionPool) {
    return emptySummary("error", "Tietokantayhteys puuttuu");
  }

  const client = await connectionPool.connect();
  // The sync lock is held by this connection's session. If it can't be
  // released, the connection is closed instead of going back to the pool,
  // where it would keep the lock and every later sync would be "busy".
  let closeConnection = false;
  let runId: number | null = null;
  const summary = emptySummary("success");
  const startedAt = Date.now();

  try {
    if (wait) {
      await client.query("SET lock_timeout = '30s'");
      try {
        await client.query("SELECT pg_advisory_lock($1)", [SYNC_LOCK_KEY]);
      } catch {
        return emptySummary("busy");
      } finally {
        await client.query("RESET lock_timeout");
      }
    } else {
      const lock = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [
        SYNC_LOCK_KEY,
      ]);
      if (!lock.rows[0].locked) {
        return emptySummary("busy");
      }
    }

    try {
      runId = (
        await client.query(
          "INSERT INTO sheet_sync_runs (status, triggered_by) VALUES ('running', $1) RETURNING id",
          [triggeredBy]
        )
      ).rows[0].id;

      const sheet = getFlightSheet();
      const aircraft = (
        await client.query(
          "SELECT registration, sheet_name, first_data_row FROM aircraft_sheets WHERE active ORDER BY registration"
        )
      ).rows;
      const context: SyncContext = {
        purposes: new Map(
          (await client.query("SELECT code, is_training FROM flight_purposes")).rows.map((row) => [
            row.code,
            { isTraining: row.is_training },
          ])
        ),
        // Matched to a member, or marked as no member: either way decided
        knownPilots: new Set(
          (await client.query("SELECT name_key FROM pilot_aliases")).rows.map((row) => row.name_key)
        ),
        tabIds: await sheet.tabIds(),
        today: DateTime.now().setZone(SHEET_ZONE).toISODate()!,
      };

      // One tab's problem doesn't stop the others
      const failures: string[] = [];
      for (const tab of aircraft) {
        try {
          const result = await syncTab(client, sheet, tab, context);
          summary.rowsRead += result.rowsRead;
          summary.rowsChanged += result.rowsChanged;
          summary.idsAssigned += result.idsAssigned;
          summary.issues += result.issues;
        } catch (error) {
          log.error("Flight log sync failed for an aircraft tab", { err: error, sheet: tab.sheet_name });
          failures.push(`${tab.sheet_name}: ${describeSheetError(error, configuredServiceAccount())}`);
        }
      }
      if (failures.length > 0) {
        summary.status = "error";
        summary.error = failures.join(" · ");
      }

      await client.query(
        `UPDATE sheet_sync_runs
         SET status = $6, finished_at = NOW(), rows_read = $2, rows_changed = $3,
             ids_assigned = $4, issues = $5, error = $7
         WHERE id = $1`,
        [
          runId,
          summary.rowsRead,
          summary.rowsChanged,
          summary.idsAssigned,
          summary.issues,
          summary.status,
          summary.error ?? null,
        ]
      );
      await client.query(
        `DELETE FROM sheet_sync_runs
         WHERE id < (SELECT id FROM sheet_sync_runs ORDER BY id DESC OFFSET $1 LIMIT 1)`,
        [KEEP_SYNC_RUNS]
      );
      log.info("Flight log sync finished", {
        runId,
        // triggeredBy is a person's name: only whether it was the automatic run
        automatic: triggeredBy === "automaattinen",
        status: summary.status,
        tabs: aircraft.length,
        failedTabs: failures.length,
        rowsRead: summary.rowsRead,
        rowsChanged: summary.rowsChanged,
        idsAssigned: summary.idsAssigned,
        issues: summary.issues,
        durationMs: Date.now() - startedAt,
      });
      return summary;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [SYNC_LOCK_KEY]).catch((error) => {
        log.error("Releasing the flight log sync lock failed", { err: error });
        closeConnection = true;
      });
    }
  } catch (error) {
    log.error("Flight log sync failed", { err: error });
    const message = error
      ? describeSheetError(error, configuredServiceAccount())
      : "Lentopäiväkirjan synkronointi epäonnistui";
    if (runId !== null) {
      await client
        .query(
          "UPDATE sheet_sync_runs SET status = 'error', finished_at = NOW(), error = $2 WHERE id = $1",
          [runId, message]
        )
        .catch(() => undefined);
    }
    return { ...summary, status: "error", error: message };
  } finally {
    client.release(closeConnection);
  }
}

/**
 * Syncs first when the copy is stale, so the pages show what the sheet has
 * now. A failing sheet doesn't break the pages: they show the last copy and
 * the error.
 */
export async function ensureFreshSync(): Promise<void> {
  if (!connectionPool) return;

  const latest = (
    await connectionPool.query(
      `SELECT status, started_at, finished_at,
              EXISTS (SELECT 1 FROM sheet_sync_runs WHERE status = 'success') AS has_copy
       FROM sheet_sync_runs
       ORDER BY started_at DESC LIMIT 1`
    )
  ).rows[0];
  // Before the first successful sync there is nothing to show, so a page
  // waits for a sync that is already running instead of rendering empty
  const hasCopy = Boolean(latest?.has_copy);
  if (latest) {
    const age = Date.now() - new Date(latest.finished_at ?? latest.started_at).getTime();
    if (latest.status === "success" && age < STALE_AFTER_MS) return;
    if (latest.status === "error" && age < RETRY_AFTER_ERROR_MS) return;
    if (latest.status === "running" && age < STALE_AFTER_MS && hasCopy) return;
  }

  await syncFlightSheets("automaattinen", { wait: !hasCopy });
}
