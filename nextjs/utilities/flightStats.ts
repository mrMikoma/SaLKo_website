import { nameKey } from "@/utilities/flightSheetParser";

/**
 * Statistics from the flight log: totals, months, pilots, purposes, the
 * Traficom annual report and intro-flight days. Pure: utilities/statsData.ts
 * reads the flights, and the pages and the Excel export show the results.
 */

export interface StatsFlight {
  registration: string;
  sheetRow: number;
  flightDate: string; // YYYY-MM-DD
  picName: string;
  secondName: string | null;
  purposeCode: string | null;
  airborneMinutes: number | null;
  landings: number | null;
  personsOnBoard: number | null;
  // The sheet's running totals after this flight
  airframeMinutes: number | null;
  totalLandings: number | null;
}

export interface Totals {
  flights: number;
  minutes: number;
  landings: number;
}

const empty = (): Totals => ({ flights: 0, minutes: 0, landings: 0 });
const add = (sum: Totals, flight: StatsFlight) => {
  sum.flights++;
  sum.minutes += flight.airborneMinutes ?? 0;
  sum.landings += flight.landings ?? 0;
  return sum;
};

export const totals = (flights: StatsFlight[]): Totals => flights.reduce(add, empty());

/** Twelve months of a year, January first */
export function byMonth(flights: StatsFlight[]): Totals[] {
  const months = Array.from({ length: 12 }, empty);
  for (const flight of flights) add(months[Number(flight.flightDate.slice(5, 7)) - 1], flight);
  return months;
}

/** Per purpose code, the most flown first */
export function byPurpose(flights: StatsFlight[]): { code: string; totals: Totals }[] {
  const purposes = new Map<string, Totals>();
  for (const flight of flights) {
    const code = flight.purposeCode ?? "–";
    purposes.set(code, add(purposes.get(code) ?? empty(), flight));
  }
  return [...purposes]
    .map(([code, sum]) => ({ code, totals: sum }))
    .sort((a, b) => b.totals.minutes - a.totals.minutes);
}

export interface PilotStats {
  key: string;
  name: string;
  member: boolean;
  // Matched to a member, marked as no member, or not decided on yet
  status: "member" | "non-member" | "unmatched";
  asPic: Totals;
  // As the student or second pilot
  asSecond: Totals;
}

/**
 * Per pilot, as PIC and as student or second pilot. Sheet names matched to a
 * member are counted together under the member's name.
 */
export function byPilot(
  flights: StatsFlight[],
  aliases: Map<string, string | null>,
  userNames: Map<string, string>
): PilotStats[] {
  const pilots = new Map<string, PilotStats>();
  const pilot = (sheetName: string) => {
    const userId = aliases.get(nameKey(sheetName)) ?? null;
    const key = userId ? `user:${userId}` : `name:${nameKey(sheetName)}`;
    if (!pilots.has(key)) {
      pilots.set(key, {
        key,
        name: (userId && userNames.get(userId)) || sheetName,
        member: userId !== null,
        status: userId !== null ? "member" : aliases.has(nameKey(sheetName)) ? "non-member" : "unmatched",
        asPic: empty(),
        asSecond: empty(),
      });
    }
    return pilots.get(key)!;
  };
  for (const flight of flights) {
    add(pilot(flight.picName).asPic, flight);
    if (flight.secondName) add(pilot(flight.secondName).asSecond, flight);
  }
  return [...pilots.values()].sort(
    (a, b) => b.asPic.minutes + b.asSecond.minutes - (a.asPic.minutes + a.asSecond.minutes)
  );
}

/*
 * Traficom's annual flight activity report (lentotoimintailmoitus), grouped
 * as the club's sheet does it
 */

export const REPORT_GROUPS: { codes: string[]; subtotal: string; cumulative?: boolean }[] = [
  { codes: ["KOU", "KOUMAT", "KOUHAR"], subtotal: "Koululennot yhteensä" },
  { codes: ["TAR"], subtotal: "DTO-koulutus yhteensä", cumulative: true },
  { codes: ["HAR", "MAT", "SII", "ESI", "KOE"], subtotal: "Muu yksityislentotoiminta yhteensä" },
  {
    codes: ["PALO", "PALOHAR", "SAR", "SARHAR", "HIN", "LAS"],
    subtotal: "Palo-, etsintä-, hinaus- ja laskuvarjolennot yhteensä",
  },
];

export interface ReportRow {
  kind: "code" | "subtotal" | "total";
  label: string;
  totals: Totals;
}

export interface AircraftReport {
  registration: string;
  rows: ReportRow[];
  // From the sheet's running totals: where they stood at the year's end, and
  // the rows of the year where they don't follow from the row above (a
  // copied row, a time fixed without the totals). null when the sheet lacks
  // them.
  counters: { airframeMinutes: number; totalLandings: number; breaks: number[] } | null;
}

/**
 * The report for one aircraft's flights in one year. `laterAbove` is what the
 * flights dated after the year add up to among the rows above the year's last
 * row: a late entry, such as December's last page typed in after January's
 * first flights, puts those into the running totals of the year's last row.
 */
export function aircraftReport(
  registration: string,
  flights: StatsFlight[],
  laterAbove: { minutes: number; landings: number } = { minutes: 0, landings: 0 }
): AircraftReport {
  const own = flights.filter((f) => f.registration === registration).sort((a, b) => a.sheetRow - b.sheetRow);
  const rows: ReportRow[] = [];
  const known = new Set(REPORT_GROUPS.flatMap((g) => g.codes));
  let previous: Totals = empty();
  for (const group of REPORT_GROUPS) {
    const groupTotals = empty();
    for (const code of group.codes) {
      const sum = totals(own.filter((f) => f.purposeCode === code));
      rows.push({ kind: "code", label: code, totals: sum });
      groupTotals.flights += sum.flights;
      groupTotals.minutes += sum.minutes;
      groupTotals.landings += sum.landings;
    }
    // DTO training adds TAR to the training flights above it
    const subtotal = group.cumulative
      ? {
          flights: previous.flights + groupTotals.flights,
          minutes: previous.minutes + groupTotals.minutes,
          landings: previous.landings + groupTotals.landings,
        }
      : groupTotals;
    rows.push({ kind: "subtotal", label: group.subtotal, totals: subtotal });
    previous = groupTotals;
  }
  const others = own.filter((f) => !f.purposeCode || !known.has(f.purposeCode));
  if (others.length > 0) {
    rows.push({ kind: "code", label: "Muut koodit", totals: totals(others) });
  }
  rows.push({ kind: "total", label: "Yhteensä", totals: totals(own) });

  const last = own.at(-1);
  // Each row's total is the row above's plus its own flight; durations are
  // rounded one by one, so a minute either way is drift
  const breaks = own.flatMap((flight, i) => {
    const above = own[i - 1];
    if (!above || above.sheetRow !== flight.sheetRow - 1) return [];
    const minutes = [above.airframeMinutes, flight.airborneMinutes, flight.airframeMinutes];
    const landings = [above.totalLandings, flight.landings, flight.totalLandings];
    const brokenMinutes =
      minutes.every((v) => v !== null) &&
      Math.abs(above.airframeMinutes! + flight.airborneMinutes! - flight.airframeMinutes!) > 1;
    const brokenLandings =
      landings.every((v) => v !== null) && above.totalLandings! + flight.landings! !== flight.totalLandings!;
    return brokenMinutes || brokenLandings ? [flight.sheetRow] : [];
  });
  const counters =
    last && last.airframeMinutes !== null && last.totalLandings !== null
      ? {
          airframeMinutes: last.airframeMinutes - laterAbove.minutes,
          totalLandings: last.totalLandings - laterAbove.landings,
          breaks,
        }
      : null;
  return { registration, rows, counters };
}

/*
 * Intro flights: OPS M1-33 allows them on at most six days a calendar year
 */

export const INTRO_FLIGHT_DAYS_PER_YEAR = 6;

export interface IntroFlightDay {
  date: string;
  flights: number;
  passengers: number; // people on board other than the pilot
  pilots: string[];
}

export function introFlightDays(flights: StatsFlight[]): IntroFlightDay[] {
  const days = new Map<string, IntroFlightDay>();
  for (const flight of flights.filter((f) => f.purposeCode === "ESI")) {
    const day = days.get(flight.flightDate) ?? {
      date: flight.flightDate,
      flights: 0,
      passengers: 0,
      pilots: [],
    };
    day.flights++;
    day.passengers += Math.max((flight.personsOnBoard ?? 1) - 1, 0);
    if (!day.pilots.includes(flight.picName)) day.pilots.push(flight.picName);
    days.set(flight.flightDate, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/*
 * Hours per aircraft per year, from the flight log and from totals typed in
 * for the years before it
 */

export interface YearTotal {
  registration: string;
  year: number;
  minutes: number;
  landings: number | null;
  flights: number | null;
  source: "flights" | "entered";
  // A total typed in for a year the flight log has flights in too, shown
  // beside the log's: one flight with a mistyped year would otherwise
  // replace the year's real hours without a word
  entered?: number;
}

/** The flight log's years win over entered totals for the same year */
export function mergeYearTotals(fromFlights: YearTotal[], entered: YearTotal[]): YearTotal[] {
  const key = (t: YearTotal) => `${t.registration}:${t.year}`;
  const merged = new Map(entered.map((t) => [key(t), t]));
  for (const total of fromFlights) {
    const typed = merged.get(key(total));
    merged.set(key(total), typed ? { ...total, entered: typed.minutes } : total);
  }
  return [...merged.values()].sort((a, b) => b.year - a.year || a.registration.localeCompare(b.registration));
}

/** "102:30", "102:30:00", "102,5" or "102.5" hours → minutes */
export function parseHours(value: string): number | null {
  const text = value.trim();
  const clock = text.match(/^(\d{1,5}):([0-5]\d)(?::[0-5]\d)?$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d{1,5}([.,]\d+)?$/.test(text)) return Math.round(Number(text.replace(",", ".")) * 60);
  return null;
}

/**
 * Yearly hours pasted from a spreadsheet: a header row of registrations,
 * then one row per year. Empty cells are skipped.
 *
 *   Vuosi   OH-CON   OH-SEE
 *   2002    102:00   279:00
 */
export function parseYearTable(text: string): {
  totals: { registration: string; year: number; minutes: number }[];
  errors: string[];
} {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => line.trim() !== "");
  const split = (line: string) => line.split(/\t|;/).map((cell) => cell.trim());
  const errors: string[] = [];
  const totals: { registration: string; year: number; minutes: number }[] = [];
  if (lines.length < 2) return { totals, errors: ["Liitä otsikkorivi ja vähintään yksi vuosi"] };

  const registrations = split(lines[0]).slice(1).map((cell) => cell.toUpperCase());
  if (registrations.length === 0 || registrations.some((reg) => !/^[A-Z0-9]{1,3}-[A-Z0-9]{2,5}$/.test(reg))) {
    return { totals, errors: ["Otsikkorivillä pitää olla tunnukset, esim. Vuosi, OH-CON, OH-SEE"] };
  }
  lines.slice(1).forEach((line, i) => {
    const [yearCell, ...values] = split(line);
    const year = Number(yearCell);
    if (!Number.isInteger(year) || year < 1950 || year > 2100) {
      errors.push(`Rivi ${i + 2}: vuosi "${yearCell}" ei kelpaa`);
      return;
    }
    values.forEach((value, column) => {
      if (value === "" || column >= registrations.length) return;
      const minutes = parseHours(value);
      if (minutes === null) {
        errors.push(`Rivi ${i + 2}, ${registrations[column]}: "${value}" ei ole tunteja`);
      } else {
        totals.push({ registration: registrations[column], year, minutes });
      }
    });
  });
  return { totals, errors };
}
