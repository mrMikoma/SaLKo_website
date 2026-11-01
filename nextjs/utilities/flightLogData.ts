import "server-only";

import { DateTime } from "luxon";
import connectionPool from "@/utilities/db";
import { getFlightSheet } from "@/utilities/flightSheetSource";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import type { ExistingFlight } from "@/utilities/paperPage";
import pricesData from "@/data/prices.json";

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
  // What the biller saw, sent back when they set Tila (flightSync.inputHash)
  inputHash: string | null;
  // The latest Tila change made on the website (admin pages only)
  statusChangedBy: string | null;
  statusChangedAt: string | null;
  statusNote: string | null;
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
  f.remarks, f.source, f.status, f.input_hash, a.sheet_gid`;

const FLIGHT_JOINS = `
  FROM sheet_flights f
  LEFT JOIN flight_purposes p ON p.code = f.purpose_code
  LEFT JOIN aircraft_sheets a ON a.registration = f.registration`;

// Who last changed Tila on the website, when, why (the note), and to what:
// shown only while the sheet still has that Tila (toFlight), not after a
// hand edit or billing changed it
const STATUS_CHANGE = `
  LEFT JOIN LATERAL (
    SELECT u.full_name AS status_changed_by, c.changed_at AS status_changed_at,
           c.note AS status_note, c.new_status AS status_changed_to
    FROM flight_status_changes c
    LEFT JOIN users u ON u.id = c.changed_by
    WHERE c.flight_id = f.id
    ORDER BY c.changed_at DESC
    LIMIT 1
  ) sc ON TRUE`;

// Not yet compared with the paper book: Kirjattu, Korjattava or a Tila the
// sync doesn't know. A flight in a closed period counts as billed whatever
// its Tila says: someone may have edited it in the sheet since (the sync
// reports that).
const UNCHECKED = `
  ((f.status IS NULL
    OR lower(trim(f.status)) NOT IN ('tarkistettu', 'laskutettu', 'ei laskuteta', 'maksettu'))
   AND NOT EXISTS (SELECT 1 FROM billing_lines b WHERE b.flight_id = f.id))`;

const sameStatus = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

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
    inputHash: (row.input_hash as string) ?? null,
    ...(row.status_changed_at && sameStatus(row.status_changed_to, row.status)
      ? {
          statusChangedBy: (row.status_changed_by as string) ?? null,
          statusChangedAt: toIso(row.status_changed_at as Date),
          statusNote: (row.status_note as string) ?? null,
        }
      : { statusChangedBy: null, statusChangedAt: null, statusNote: null }),
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
    `SELECT ${FLIGHT_COLUMNS}, sc.* ${FLIGHT_JOINS} ${STATUS_CHANGE}
     WHERE f.registration = $1 AND f.missing_since IS NULL
       AND to_char(f.flight_date, 'YYYY-MM') = $2
     ORDER BY f.sheet_row`,
    [registration, month]
  );
  return response.rows.map((row) => toFlight(row, rowUrl));
}

// One page of the review list; more than this is a backlog to clear month by month
export const UNCHECKED_LIMIT = 500;

/** An aircraft's flights not yet compared with the paper book, in sheet order */
export async function getUncheckedFlights(registration: string): Promise<SheetFlight[]> {
  const rowUrl = sheetUrlFor();
  const response = await connectionPool.query(
    `SELECT ${FLIGHT_COLUMNS}, sc.* ${FLIGHT_JOINS} ${STATUS_CHANGE}
     WHERE f.registration = $1 AND f.missing_since IS NULL AND ${UNCHECKED}
     ORDER BY f.sheet_row
     LIMIT ${UNCHECKED_LIMIT}`,
    [registration]
  );
  return response.rows.map((row) => toFlight(row, rowUrl));
}

export async function getUncheckedCount(registration: string): Promise<number> {
  const response = await connectionPool.query(
    `SELECT count(*)::int AS count FROM sheet_flights f
     WHERE f.registration = $1 AND f.missing_since IS NULL AND ${UNCHECKED}`,
    [registration]
  );
  return response.rows[0].count;
}

// Enough to work through; the rest show up as those are fixed
export const ISSUE_LIMIT = 300;

/**
 * The sync's issues for an aircraft, newest rows first. Issues on flights
 * that are billed already are left out: years of hand-billed history would
 * otherwise bury the ones that still matter.
 */
export async function getFlightIssues(registration: string): Promise<FlightIssueRow[]> {
  const response = await connectionPool.query(
    `SELECT i.registration, i.sheet_row, i.flight_id, i.kind, i.message, f.flight_date
     FROM sheet_flight_issues i
     LEFT JOIN sheet_flights f ON f.id = i.flight_id
     WHERE i.registration = $1
       AND (f.status IS NULL OR lower(trim(f.status)) NOT IN ('laskutettu', 'ei laskuteta', 'maksettu'))
     ORDER BY i.sheet_row DESC
     LIMIT ${ISSUE_LIMIT}`,
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
 * Names in the sheet that the biller hasn't decided on yet: every PIC, and
 * the second pilot of a training flight (the student pays for those). A name
 * matched to a member, or marked as no member, is decided.
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
     LEFT JOIN pilot_aliases a ON a.name_key = n.name_key
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
  // null: marked as no member, billed under the name at the non-member price
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

export async function getMatchedPilots(): Promise<MatchedPilot[]> {
  const response = await connectionPool.query(
    `SELECT a.name, a.name_key, a.user_id, u.full_name, u.email
     FROM pilot_aliases a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY u.full_name NULLS LAST, a.name`
  );
  return response.rows.map((row) => ({
    name: row.name,
    nameKey: row.name_key,
    userId: row.user_id,
    userName: row.full_name,
    userEmail: row.email,
  }));
}

export interface MemberOption {
  id: string;
  name: string;
  email: string;
}

// Accounts a pilot name can be matched to: not the system guest account, a
// deactivated or an anonymised one. With the email, as two accounts can
// share a name.
export async function getMemberOptions(): Promise<MemberOption[]> {
  const response = await connectionPool.query(
    `SELECT id, full_name, email FROM users
     WHERE NOT (roles = ARRAY['guest']::text[])
       AND deactivated_at IS NULL
       AND email NOT LIKE 'poistettu-%@salko.invalid'
     ORDER BY full_name, email`
  );
  return response.rows.map((row) => ({ id: row.id, name: row.full_name, email: row.email }));
}

export interface MyFlight extends SheetFlight {
  // The member's seat: in command, or the second pilot / student
  role: "pic" | "second";
}

/** The member's flights, as PIC or as the second pilot, newest first */
export async function getMyFlights(userId: string): Promise<MyFlight[]> {
  const rowUrl = () => null;
  const response = await connectionPool.query(
    `SELECT ${FLIGHT_COLUMNS}, sc.*,
            CASE WHEN f.pic_key = ANY(k.keys) THEN 'pic' ELSE 'second' END AS role
     ${FLIGHT_JOINS} ${STATUS_CHANGE}
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

export interface FlightFormOptions {
  aircraft: { registration: string; minuteRate: number | null }[];
  purposes: { code: string; name: string; isTraining: boolean; billed: boolean }[];
  airfields: string[];
  // How the member is written in the sheet, if already known
  sheetName: string | null;
  pilotNames: string[];
  lastPurpose: string | null;
  lastAircraft: string | null;
}

// Per-minute price with the equipment fee, for the estimate on the form;
// billing itself comes later and uses its own rates
function minuteRate(registration: string): number | null {
  const rate = pricesData.aircraftRentalRates.find(
    (r) => "registration" in r && r.registration === registration
  ) as { pricePerMinuteWithEquipmentFee?: string } | undefined;
  const value = Number(rate?.pricePerMinuteWithEquipmentFee?.replace("~", "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function getFlightFormOptions(userId: string): Promise<FlightFormOptions> {
  const [aircraft, purposes, airfields, alias, names, last] = await Promise.all([
    connectionPool.query(
      "SELECT registration FROM aircraft_sheets WHERE active ORDER BY registration"
    ),
    connectionPool.query(
      "SELECT code, name_fi, is_training, payer FROM flight_purposes WHERE active ORDER BY sort_order"
    ),
    // The most used airfields of the last two years, home first
    connectionPool.query(
      `SELECT field FROM (
         SELECT departure AS field FROM sheet_flights
         WHERE missing_since IS NULL AND flight_date > NOW() - interval '2 years'
         UNION ALL
         SELECT arrival FROM sheet_flights
         WHERE missing_since IS NULL AND flight_date > NOW() - interval '2 years'
       ) f
       WHERE field IS NOT NULL
       GROUP BY field
       ORDER BY field = 'EFSA' DESC, count(*) DESC
       LIMIT 12`
    ),
    connectionPool.query(
      "SELECT name FROM pilot_aliases WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
      [userId]
    ),
    connectionPool.query(
      `SELECT name FROM pilot_aliases
       UNION
       SELECT DISTINCT pic_name FROM sheet_flights
       WHERE missing_since IS NULL AND flight_date > NOW() - interval '2 years'
       ORDER BY 1`
    ),
    connectionPool.query(
      `SELECT f.purpose_code, f.registration FROM sheet_flights f
       JOIN pilot_aliases a ON a.user_id = $1 AND a.name_key IN (f.pic_key, f.second_key)
       WHERE f.missing_since IS NULL
       ORDER BY f.flight_date DESC, f.takeoff_at DESC NULLS LAST
       LIMIT 1`,
      [userId]
    ),
  ]);

  const fields = airfields.rows.map((row) => row.field as string);
  return {
    aircraft: aircraft.rows.map((row) => ({
      registration: row.registration,
      minuteRate: minuteRate(row.registration),
    })),
    purposes: purposes.rows.map((row) => ({
      code: row.code,
      name: row.name_fi,
      isTraining: row.is_training,
      billed: row.payer !== "none",
    })),
    airfields: fields.includes("EFSA") ? fields : ["EFSA", ...fields],
    sheetName: alias.rows[0]?.name ?? null,
    pilotNames: names.rows.map((row) => row.name as string).filter(Boolean),
    lastPurpose: last.rows[0]?.purpose_code ?? null,
    lastAircraft: last.rows[0]?.registration ?? null,
  };
}

const clock = (value: Date | null) =>
  value ? DateTime.fromJSDate(value, { zone: SHEET_ZONE }).toFormat("HH:mm") : "";

/** An aircraft's flights on these days, to match a page of the paper book with */
export async function getFlightsOnDates(
  registration: string,
  dates: string[]
): Promise<ExistingFlight[]> {
  if (dates.length === 0) return [];
  const response = await connectionPool.query(
    `SELECT id, sheet_row, flight_date, pic_name, second_name, persons_on_board, departure,
            arrival, takeoff_at, landing_at, landings, purpose_code, remarks, source, status,
            input_hash
     FROM sheet_flights
     WHERE registration = $1 AND flight_date = ANY($2::date[]) AND missing_since IS NULL
     ORDER BY sheet_row`,
    [registration, dates]
  );
  return response.rows.map((row) => ({
    id: row.id,
    sheetRow: row.sheet_row,
    flightDate: toDateString(row.flight_date),
    picName: row.pic_name,
    secondName: row.second_name ?? null,
    personsOnBoard: row.persons_on_board ?? 1,
    departure: row.departure ?? "",
    arrival: row.arrival ?? "",
    takeoff: clock(row.takeoff_at),
    landing: clock(row.landing_at),
    landings: row.landings ?? 0,
    purposeCode: row.purpose_code ?? "",
    remarks: row.remarks ?? null,
    source: row.source ?? null,
    status: row.status ?? null,
    inputHash: row.input_hash ?? null,
  }));
}
