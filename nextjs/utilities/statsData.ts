import "server-only";

import { DateTime } from "luxon";
import connectionPool from "@/utilities/db";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import {
  aircraftReport,
  AircraftReport,
  byMonth,
  byPilot,
  byPurpose,
  IntroFlightDay,
  introFlightDays,
  mergeYearTotals,
  PilotStats,
  StatsFlight,
  totals,
  Totals,
  YearTotal,
} from "@/utilities/flightStats";

/**
 * Reads for the statistics page and its Excel export (the arithmetic is in
 * utilities/flightStats.ts). The pages check permissions first.
 */

export const thisYear = () => DateTime.now().setZone(SHEET_ZONE).year;

// A year as a date range, so the flight_date index can be used
const IN_YEAR = "flight_date >= make_date($1, 1, 1) AND flight_date < make_date($1 + 1, 1, 1)";

async function yearFlights(year: number): Promise<StatsFlight[]> {
  // The date as text: through a JS Date it would depend on the server's zone
  const response = await connectionPool.query(
    `SELECT registration, sheet_row, flight_date::text AS flight_date, pic_name, second_name,
            purpose_code, airborne_minutes, landings, persons_on_board, airframe_minutes, total_landings
     FROM sheet_flights
     WHERE missing_since IS NULL AND ${IN_YEAR}
     ORDER BY registration, sheet_row`,
    [year]
  );
  return response.rows.map((row) => ({
    registration: row.registration,
    sheetRow: row.sheet_row,
    flightDate: row.flight_date,
    picName: row.pic_name,
    secondName: row.second_name ?? null,
    purposeCode: row.purpose_code ?? null,
    airborneMinutes: row.airborne_minutes ?? null,
    landings: row.landings ?? null,
    personsOnBoard: row.persons_on_board ?? null,
    airframeMinutes: row.airframe_minutes ?? null,
    totalLandings: row.total_landings ?? null,
  }));
}

/** Hours per aircraft per year: the flight log's years, and those typed in */
export async function getYearTotals(): Promise<YearTotal[]> {
  const [fromFlights, entered] = await Promise.all([
    connectionPool.query(
      `SELECT registration, extract(year FROM flight_date)::int AS year,
              coalesce(sum(airborne_minutes), 0)::int AS minutes,
              coalesce(sum(landings), 0)::int AS landings, count(*)::int AS flights
       FROM sheet_flights WHERE missing_since IS NULL
       GROUP BY 1, 2`
    ),
    connectionPool.query("SELECT registration, year, minutes FROM aircraft_year_totals"),
  ]);
  return mergeYearTotals(
    fromFlights.rows.map((row) => ({ ...row, source: "flights" as const })),
    entered.rows.map((row) => ({ ...row, landings: null, flights: null, source: "entered" as const }))
  );
}

/**
 * Per aircraft, what the flights dated after the year add up to among the
 * rows above the year's last row (aircraftReport's laterAbove)
 */
async function laterEntriesAbove(year: number): Promise<Map<string, { minutes: number; landings: number }>> {
  const response = await connectionPool.query(
    `SELECT y.registration, coalesce(sum(f.airborne_minutes), 0)::int AS minutes,
            coalesce(sum(f.landings), 0)::int AS landings
     FROM (SELECT registration, max(sheet_row) AS last_row FROM sheet_flights
           WHERE missing_since IS NULL AND ${IN_YEAR} GROUP BY registration) y
     JOIN sheet_flights f ON f.registration = y.registration AND f.missing_since IS NULL
       AND f.sheet_row < y.last_row AND f.flight_date >= make_date($1 + 1, 1, 1)
     GROUP BY y.registration`,
    [year]
  );
  return new Map(response.rows.map((row) => [row.registration, { minutes: row.minutes, landings: row.landings }]));
}

export interface YearStats {
  year: number;
  years: number[];
  aircraft: string[];
  registration: string | null; // null: every aircraft
  totals: Totals;
  // The year before: up to the same day for the year still going (previousUntil
  // is then that day, MM-DD), the whole year otherwise
  previousTotals: Totals;
  previousUntil: string | null;
  // The year's flights not yet compared with the paper book; the stats count
  // them all the same, like the sheet's own
  unchecked: number;
  months: Totals[];
  previousMonths: Totals[];
  purposes: { code: string; name: string; totals: Totals }[];
  pilots: PilotStats[];
  reports: AircraftReport[];
  introDays: IntroFlightDay[];
}

export async function getYearStats(year: number, requested: string | null): Promise<YearStats> {
  const [flightsThisYear, flightsLastYear, laterAbove, unchecked, years, aircraft, purposes, aliases, users] =
    await Promise.all([
      yearFlights(year),
      yearFlights(year - 1),
      laterEntriesAbove(year),
      connectionPool.query(
        `SELECT registration, count(*)::int AS count FROM sheet_flights f
         WHERE missing_since IS NULL AND ${IN_YEAR}
           AND (status IS NULL OR lower(trim(status)) NOT IN
                ('tarkistettu', 'laskutettu', 'ei laskuteta', 'maksettu'))
           AND NOT EXISTS (SELECT 1 FROM billing_lines b WHERE b.flight_id = f.id)
         GROUP BY registration`,
        [year]
      ),
      connectionPool.query(
        `SELECT DISTINCT extract(year FROM flight_date)::int AS year FROM sheet_flights
         WHERE missing_since IS NULL ORDER BY 1 DESC`
      ),
      connectionPool.query("SELECT registration FROM aircraft_sheets ORDER BY registration"),
      connectionPool.query("SELECT code, name_fi FROM flight_purposes"),
      connectionPool.query("SELECT name_key, user_id FROM pilot_aliases"),
      connectionPool.query("SELECT id, coalesce(full_name, name, email) AS name FROM users"),
    ]);

  const registrations = aircraft.rows.map((row) => row.registration as string);
  // An aircraft the site doesn't know means every aircraft
  const registration = requested && registrations.includes(requested) ? requested : null;
  const pick = (flights: StatsFlight[]) =>
    registration ? flights.filter((f) => f.registration === registration) : flights;
  const flights = pick(flightsThisYear);
  const previous = pick(flightsLastYear);
  const purposeNames = new Map(purposes.rows.map((row) => [row.code, row.name_fi]));
  const yearList = years.rows.map((row) => row.year as number);
  // This year so far against last year up to the same day
  const today = DateTime.now().setZone(SHEET_ZONE);
  const previousUntil = year === today.year ? today.toFormat("MM-dd") : null;
  const previousSoFar = previousUntil
    ? previous.filter((f) => f.flightDate.slice(5) <= previousUntil)
    : previous;

  return {
    year,
    // The year asked for, and this one, even before they have flights
    years: [...new Set([thisYear(), year, ...yearList])].sort((a, b) => b - a),
    aircraft: registrations,
    registration,
    totals: totals(flights),
    previousTotals: totals(previousSoFar),
    previousUntil,
    unchecked: unchecked.rows
      .filter((row) => !registration || row.registration === registration)
      .reduce((sum, row) => sum + row.count, 0),
    months: byMonth(flights),
    previousMonths: byMonth(previous),
    purposes: byPurpose(flights).map((p) => ({ ...p, name: purposeNames.get(p.code) ?? "" })),
    pilots: byPilot(
      flights,
      new Map(aliases.rows.map((row) => [row.name_key, row.user_id])),
      new Map(users.rows.map((row) => [row.id, row.name]))
    ),
    reports: (registration ? [registration] : registrations)
      .map((reg) => aircraftReport(reg, flights, laterAbove.get(reg)))
      .filter((report) => report.rows.at(-1)!.totals.flights > 0),
    // Intro-flight days count for the club, whatever the aircraft
    introDays: introFlightDays(flightsThisYear),
  };
}
