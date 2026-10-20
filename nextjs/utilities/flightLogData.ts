import "server-only";

import connectionPool from "@/utilities/db";
import { getFlightSheet } from "@/utilities/flightSheetSource";

/**
 * Reads of the synced flight log for server components. The pages check the
 * session and permissions before calling these.
 */

export interface SheetFlight {
  id: string;
  registration: string;
  sheetRow: number;
  flightDate: string;
  picName: string;
  secondName: string | null;
  personsOnBoard: number | null;
  departure: string | null;
  arrival: string | null;
  takeoffAt: string | null;
  landingAt: string | null;
  airborneMinutes: number | null;
  landings: number | null;
  purposeCode: string | null;
  purposeName: string | null;
  remarks: string | null;
  source: string | null;
  status: string | null;
  sheetUrl: string | null;
}

export interface FlightIssueRow {
  registration: string;
  sheetRow: number;
  flightId: string | null;
  kind: string;
  message: string;
  flightDate: string | null;
}

export interface SyncRun {
  status: "running" | "success" | "error";
  startedAt: string;
  finishedAt: string | null;
  triggeredBy: string;
  rowsRead: number | null;
  rowsChanged: number | null;
  idsAssigned: number | null;
  issues: number | null;
  error: string | null;
}

export interface AircraftSheet {
  registration: string;
  sheetName: string;
}

const toIso = (value: Date | string | null) =>
  value === null ? null : new Date(value).toISOString();

// pg returns DATE as a JS Date at local midnight; keep the calendar day
const toDateString = (value: Date | string) =>
  typeof value === "string"
    ? value.slice(0, 10)
    : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
        value.getDate()
      ).padStart(2, "0")}`;

function sheetUrlFor() {
  try {
    const sheet = getFlightSheet();
    return (gid: string | number | null, row: number) =>
      sheet.rowUrl(gid === null ? null : Number(gid), row);
  } catch {
    return () => null;
  }
}

const FLIGHT_COLUMNS = `
  f.id, f.registration, f.sheet_row, f.flight_date, f.pic_name, f.second_name,
  f.persons_on_board, f.departure, f.arrival, f.takeoff_at, f.landing_at,
  f.airborne_minutes, f.landings, f.purpose_code, p.name_fi AS purpose_name,
  f.remarks, f.source, f.status, a.sheet_gid`;

const FLIGHT_JOINS = `
  FROM sheet_flights f
  LEFT JOIN flight_purposes p ON p.code = f.purpose_code
  LEFT JOIN aircraft_sheets a ON a.registration = f.registration`;

function toFlight(
  row: Record<string, unknown>,
  rowUrl: (gid: string | number | null, row: number) => string | null
): SheetFlight {
  return {
    id: row.id as string,
    registration: row.registration as string,
    sheetRow: row.sheet_row as number,
    flightDate: toDateString(row.flight_date as Date),
    picName: row.pic_name as string,
    secondName: (row.second_name as string) ?? null,
    personsOnBoard: (row.persons_on_board as number) ?? null,
    departure: (row.departure as string) ?? null,
    arrival: (row.arrival as string) ?? null,
    takeoffAt: toIso(row.takeoff_at as Date | null),
    landingAt: toIso(row.landing_at as Date | null),
    airborneMinutes: (row.airborne_minutes as number) ?? null,
    landings: (row.landings as number) ?? null,
    purposeCode: (row.purpose_code as string) ?? null,
    purposeName: (row.purpose_name as string) ?? null,
    remarks: (row.remarks as string) ?? null,
    source: (row.source as string) ?? null,
    status: (row.status as string) ?? null,
    sheetUrl: rowUrl(row.sheet_gid as string | null, row.sheet_row as number),
  };
}

export async function getAircraftSheets(): Promise<AircraftSheet[]> {
  const response = await connectionPool.query(
    "SELECT registration, sheet_name FROM aircraft_sheets WHERE active ORDER BY registration"
  );
  return response.rows.map((row) => ({
    registration: row.registration,
    sheetName: row.sheet_name,
  }));
}

export async function getLatestSyncRuns(): Promise<{
  latest: SyncRun | null;
  lastSuccess: SyncRun | null;
}> {
  const toRun = (row: Record<string, unknown> | undefined): SyncRun | null =>
    row
      ? {
          status: row.status as SyncRun["status"],
          startedAt: toIso(row.started_at as Date)!,
          finishedAt: toIso(row.finished_at as Date | null),
          triggeredBy: row.triggered_by as string,
          rowsRead: row.rows_read as number | null,
          rowsChanged: row.rows_changed as number | null,
          idsAssigned: row.ids_assigned as number | null,
          issues: row.issues as number | null,
          error: row.error as string | null,
        }
      : null;

  const [latest, lastSuccess] = await Promise.all([
    connectionPool.query("SELECT * FROM sheet_sync_runs ORDER BY started_at DESC LIMIT 1"),
    connectionPool.query(
      "SELECT * FROM sheet_sync_runs WHERE status = 'success' ORDER BY finished_at DESC LIMIT 1"
    ),
  ]);
  return { latest: toRun(latest.rows[0]), lastSuccess: toRun(lastSuccess.rows[0]) };
}

/** Months (YYYY-MM) that have flights for the aircraft, newest first */
export async function getFlightMonths(registration: string): Promise<string[]> {
  const response = await connectionPool.query(
    `SELECT DISTINCT to_char(flight_date, 'YYYY-MM') AS month
     FROM sheet_flights
     WHERE registration = $1 AND missing_since IS NULL
     ORDER BY month DESC`,
    [registration]
  );
  return response.rows.map((row) => row.month);
}

export async function getFlightsForMonth(
  registration: string,
  month: string
): Promise<SheetFlight[]> {
  const rowUrl = sheetUrlFor();
  const response = await connectionPool.query(
    `SELECT ${FLIGHT_COLUMNS} ${FLIGHT_JOINS}
     WHERE f.registration = $1 AND f.missing_since IS NULL
       AND to_char(f.flight_date, 'YYYY-MM') = $2
     ORDER BY f.sheet_row`,
    [registration, month]
  );
  return response.rows.map((row) => toFlight(row, rowUrl));
}

export async function getFlightIssues(registration: string): Promise<FlightIssueRow[]> {
  const response = await connectionPool.query(
    `SELECT i.registration, i.sheet_row, i.flight_id, i.kind, i.message, f.flight_date
     FROM sheet_flight_issues i
     LEFT JOIN sheet_flights f ON f.id = i.flight_id
     WHERE i.registration = $1
     ORDER BY i.sheet_row DESC`,
    [registration]
  );
  return response.rows.map((row) => ({
    registration: row.registration,
    sheetRow: row.sheet_row,
    flightId: row.flight_id,
    kind: row.kind,
    message: row.message,
    flightDate: row.flight_date ? toDateString(row.flight_date) : null,
  }));
}

export interface UnmatchedPilot {
  name: string;
  nameKey: string;
  flights: number;
  lastFlight: string;
}

/**
 * Names in the sheet that aren't matched to a member yet: every PIC, and the
 * second pilot of a training flight (the student pays for those)
 */
export async function getUnmatchedPilots(): Promise<UnmatchedPilot[]> {
  const response = await connectionPool.query(
    `WITH names AS (
       SELECT pic_name AS name, pic_key AS name_key, flight_date
       FROM sheet_flights WHERE missing_since IS NULL
       UNION ALL
       SELECT f.second_name, f.second_key, f.flight_date
       FROM sheet_flights f
       JOIN flight_purposes p ON p.code = f.purpose_code AND p.is_training
       WHERE f.missing_since IS NULL AND f.second_key IS NOT NULL
     )
     SELECT min(n.name) AS name, n.name_key, count(*)::int AS flights,
            max(n.flight_date) AS last_flight
     FROM names n
     LEFT JOIN pilot_aliases a ON a.name_key = n.name_key AND a.user_id IS NOT NULL
     WHERE a.name_key IS NULL AND n.name_key <> ''
     GROUP BY n.name_key
     ORDER BY max(n.flight_date) DESC`
  );
  return response.rows.map((row) => ({
    name: row.name,
    nameKey: row.name_key,
    flights: row.flights,
    lastFlight: toDateString(row.last_flight),
  }));
}

export interface MatchedPilot {
  name: string;
  nameKey: string;
  userId: string;
  userName: string;
}

export async function getMatchedPilots(): Promise<MatchedPilot[]> {
  const response = await connectionPool.query(
    `SELECT a.name, a.name_key, a.user_id, u.full_name
     FROM pilot_aliases a JOIN users u ON u.id = a.user_id
     ORDER BY u.full_name, a.name`
  );
  return response.rows.map((row) => ({
    name: row.name,
    nameKey: row.name_key,
    userId: row.user_id,
    userName: row.full_name,
  }));
}

export interface MemberOption {
  id: string;
  name: string;
}

// Accounts a pilot name can be matched to (not the system guest account)
export async function getMemberOptions(): Promise<MemberOption[]> {
  const response = await connectionPool.query(
    `SELECT id, full_name FROM users
     WHERE NOT (roles = ARRAY['guest']::text[])
     ORDER BY full_name`
  );
  return response.rows.map((row) => ({ id: row.id, name: row.full_name }));
}

export interface MyFlight extends SheetFlight {
  // The member's seat: in command, or the second pilot / student
  role: "pic" | "second";
}

/** The member's flights, as PIC or as the second pilot, newest first */
export async function getMyFlights(userId: string): Promise<MyFlight[]> {
  const rowUrl = () => null;
  const response = await connectionPool.query(
    `SELECT ${FLIGHT_COLUMNS},
            CASE WHEN f.pic_key = ANY(k.keys) THEN 'pic' ELSE 'second' END AS role
     ${FLIGHT_JOINS}
     CROSS JOIN (
       SELECT array_agg(name_key) AS keys FROM pilot_aliases WHERE user_id = $1
     ) k
     WHERE f.missing_since IS NULL
       AND (f.pic_key = ANY(k.keys) OR f.second_key = ANY(k.keys))
     ORDER BY f.flight_date DESC, f.takeoff_at DESC NULLS LAST`,
    [userId]
  );
  return response.rows.map((row) => ({
    ...toFlight(row, rowUrl),
    role: row.role as MyFlight["role"],
  }));
}
