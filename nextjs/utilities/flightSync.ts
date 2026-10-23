import "server-only";

import { createHash, randomUUID } from "crypto";
import connectionPool from "@/utilities/db";
import { getFlightSheet, SheetCell } from "@/utilities/flightSheetSource";
import { configuredServiceAccount, describeSheetError } from "@/utilities/googleSheetsSetup";
import {
  findFlightIssues,
  nameKey,
  parseFlightSheet,
  ParsedFlight,
} from "@/utilities/flightSheetParser";
import { inputHash } from "@/utilities/flightInputHash";

/**
 * Copies the flight log sheet into sheet_flights. The sheet is the only place
 * flights are written: the sync only reads it, apart from giving rows without
 * an ID (or with an ID copied from another row) a new one.
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
  let runId: number | null = null;
  let inTransaction = false;
  const summary = emptySummary("success");

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
      const purposes = new Map(
        (await client.query("SELECT code, is_training FROM flight_purposes")).rows.map(
          (row) => [row.code, { isTraining: row.is_training }]
        )
      );
      const knownPilots = new Set(
        (
          await client.query(
            "SELECT name_key FROM pilot_aliases WHERE user_id IS NOT NULL"
          )
        ).rows.map((row) => row.name_key)
      );
      const tabIds = await sheet.tabIds();

      for (const { registration, sheet_name, first_data_row } of aircraft) {
        const parsed = parseFlightSheet(await sheet.readTab(sheet_name), first_data_row);
        if (parsed.errors.length > 0) {
          throw new Error(`${sheet_name}: ${parsed.errors.join("; ")}`);
        }

        // Rows without an ID, or with one copied from another row, get a new one
        const seenIds = new Set<string>();
        const newIds: SheetCell[] = [];
        for (const flight of parsed.flights) {
          if (!flight.id || seenIds.has(flight.id)) {
            flight.id = randomUUID();
            newIds.push({ row: flight.row, column: parsed.columns.id!, value: flight.id });
          }
          seenIds.add(flight.id);
        }
        await sheet.writeCells(sheet_name, newIds);

        const issues = findFlightIssues(parsed.flights, { purposes, knownPilots });

        await client.query("BEGIN");
        inTransaction = true;

        const upserted = await client.query(UPSERT_FLIGHTS, [
          JSON.stringify(parsed.flights.map(toRecord)),
          registration,
        ]);
        await client.query(
          `UPDATE sheet_flights SET missing_since = NOW()
           WHERE registration = $1 AND missing_since IS NULL AND NOT (id = ANY($2::uuid[]))`,
          [registration, [...seenIds]]
        );
        await client.query("DELETE FROM sheet_flight_issues WHERE registration = $1", [
          registration,
        ]);
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
        if (tabIds.has(sheet_name)) {
          await client.query(
            "UPDATE aircraft_sheets SET sheet_gid = $2 WHERE registration = $1",
            [registration, tabIds.get(sheet_name)]
          );
        }

        await client.query("COMMIT");
        inTransaction = false;

        summary.rowsRead += parsed.flights.length;
        summary.rowsChanged += upserted.rowCount ?? 0;
        summary.idsAssigned += newIds.length;
        summary.issues += issues.length;
      }

      await client.query(
        `UPDATE sheet_sync_runs
         SET status = 'success', finished_at = NOW(), rows_read = $2, rows_changed = $3,
             ids_assigned = $4, issues = $5
         WHERE id = $1`,
        [runId, summary.rowsRead, summary.rowsChanged, summary.idsAssigned, summary.issues]
      );
      await client.query(
        `DELETE FROM sheet_sync_runs
         WHERE id < (SELECT id FROM sheet_sync_runs ORDER BY id DESC OFFSET $1 LIMIT 1)`,
        [KEEP_SYNC_RUNS]
      );
      return summary;
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [SYNC_LOCK_KEY]);
    }
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    console.error("Flight log sync failed:", error);
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
    client.release();
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
