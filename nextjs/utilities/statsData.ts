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

async function yearFlights(year: number): Promise<StatsFlight[]> {
  const response = await connectionPool.query(
    `SELECT registration, sheet_row, flight_date, pic_name, second_name, purpose_code,
            airborne_minutes, landings, persons_on_board, airframe_minutes, total_landings
     FROM sheet_flights
     WHERE missing_since IS NULL AND extract(year FROM flight_date)::int = $1
     ORDER BY registration, sheet_row`,
    [year]
  );
  return response.rows.map((row) => ({
    registration: row.registration,
    sheetRow: row.sheet_row,
    flightDate: DateTime.fromJSDate(row.flight_date).toISODate()!,
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

export interface YearStats {
  year: number;
  years: number[];
  aircraft: string[];
  registration: string | null; // null: every aircraft
  totals: Totals;
  previousTotals: Totals;
  months: Totals[];
  previousMonths: Totals[];
  purposes: { code: string; name: string; totals: Totals }[];
  pilots: PilotStats[];
  reports: AircraftReport[];
  introDays: IntroFlightDay[];
}

export async function getYearStats(year: number, requested: string | null): Promise<YearStats> {
  const [flightsThisYear, flightsLastYear, years, aircraft, purposes, aliases, users] =
    await Promise.all([
      yearFlights(year),
      yearFlights(year - 1),
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

  return {
    year,
    years: yearList.includes(thisYear()) ? yearList : [thisYear(), ...yearList],
    aircraft: registrations,
    registration,
    totals: totals(flights),
    previousTotals: totals(previous),
    months: byMonth(flights),
    previousMonths: byMonth(previous),
    purposes: byPurpose(flights).map((p) => ({ ...p, name: purposeNames.get(p.code) ?? "" })),
    pilots: byPilot(
      flights,
      new Map(aliases.rows.map((row) => [row.name_key, row.user_id])),
      new Map(users.rows.map((row) => [row.id, row.name]))
    ),
    reports: (registration ? [registration] : registrations)
      .map((reg) => aircraftReport(reg, flights))
      .filter((report) => report.rows.at(-1)!.totals.flights > 0),
    // Intro-flight days count for the club, whatever the aircraft
    introDays: introFlightDays(flightsThisYear),
  };
}
