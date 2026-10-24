import { DateTime } from "luxon";
import { MAX_LEG_MINUTES } from "@/utilities/flightFormInput";

/**
 * Parses an aircraft's flight log tab as the Google Sheets API returns it
 * (valueRenderOption UNFORMATTED_VALUE, dateTimeRenderOption SERIAL_NUMBER):
 * dates and times are spreadsheet serial numbers, durations are fractions of
 * a day, and rows are ragged (trailing empty cells are left out).
 *
 * Pure functions only, so tests can run them without a database or Google.
 */

export type SheetValue = string | number | boolean | null;
export type SheetValues = SheetValue[][];

// Flight log times are Finnish wall-clock times
export const SHEET_ZONE = "Europe/Helsinki";

// Header text of each column the site reads. Columns are found by header, so
// the club can move them; the last four were added for the website.
export const SHEET_COLUMNS = {
  date: "Päivämäärä",
  pic: "Päällikkö",
  second: "Oppilas / SIC",
  personsOnBoard: "Henkilömäärä",
  departure: "Lentoonlähtöpaikka",
  arrival: "Laskupaikka",
  takeoff: "Lentoonlähtöaika",
  landing: "Laskuaika",
  airborne: "Ilmassa oloaika",
  airframeTotal: "Kokonais ilmassaoloaika",
  landings: "Laskujen määrä",
  landingsTotal: "Laskujen kokonaismäärä",
  purpose: "Lennon tarkoitus",
  fuel: "Tankkaus",
  oil: "Öljy",
  hourMeter: "Tuntimittari",
  remarks: "Huomiot",
  logPage: "Sivunumero / Matkapvkirja #",
  bookTotal: "Total matkapäiväkirja",
  bookError: "Virhe kirjassa",
  maintenance: "Huolto",
  id: "ID",
  source: "Lähde",
  status: "Tila",
  billingPeriod: "Laskutusjakso",
} as const;

export type SheetColumn = keyof typeof SHEET_COLUMNS;

// Without these the rows can't be read or kept in sync
const REQUIRED_COLUMNS: SheetColumn[] = [
  "date",
  "pic",
  "second",
  "departure",
  "arrival",
  "takeoff",
  "landing",
  "landings",
  "purpose",
  "id",
];

// Billing statuses of the Tila column; empty means Kirjattu
export const FLIGHT_STATUSES = [
  "Korjattava",
  "Tarkistettu",
  "Laskutettu",
  "Ei laskuteta",
  "Maksettu",
] as const;

// The statuses the biller sets by hand while comparing flights with the paper
// book ("" is Kirjattu). The others are set when a billing period closes, and
// a flight that has one is no longer changed from the review page.
export const REVIEW_STATUSES = ["", "Korjattava", "Tarkistettu"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const isBilledStatus = (status: string | null): boolean =>
  status !== null &&
  ["laskutettu", "ei laskuteta", "maksettu"].includes(status.trim().toLowerCase());

export interface ParsedFlight {
  id: string | null; // null until the sync writes one into the ID column
  row: number; // 1-based sheet row
  flightDate: string; // YYYY-MM-DD
  picName: string;
  secondName: string | null;
  personsOnBoard: number | null;
  departure: string | null;
  arrival: string | null;
  takeoffAt: string | null; // ISO, UTC
  landingAt: string | null;
  airborneMinutes: number | null;
  // What the Ilmassa oloaika cell holds. The club's formula, landing minus
  // takeoff, goes negative past midnight; airborneMinutes is right either way.
  sheetAirborneMinutes: number | null;
  airframeMinutes: number | null;
  landings: number | null;
  totalLandings: number | null;
  purposeCode: string | null;
  fuelLitres: number | null;
  oilQuarts: number | null;
  hourMeter: number | null;
  remarks: string | null;
  logPage: string | null;
  bookTotal: string | null;
  bookError: string | null;
  maintenance: string | null;
  source: string | null;
  status: string | null;
  billingPeriod: string | null;
  // Cells that don't hold what their column should, such as an ID that isn't
  // a UUID or a time typed as "14,05": read as empty, and reported
  badCells: { column: SheetColumn; value: SheetValue }[];
  raw: SheetValue[];
}

// A row after the first data row that has something in it but no readable
// date, so it isn't read as a flight
export interface UndatedRow {
  row: number;
  id: string | null;
  date: SheetValue; // what the date cell holds, if anything
  // Typed into like a flight (pilot, times, ...); otherwise only the
  // website's columns are filled, e.g. Tila filled down past the last flight
  typed: boolean;
}

export interface ParsedSheet {
  // 0-based column index of each header that was found
  columns: Partial<Record<SheetColumn, number>>;
  flights: ParsedFlight[];
  // First row at or after firstDataRow whose date cell is empty: where the
  // next flight is written (the formula columns are filled further down)
  firstEmptyRow: number;
  undatedRows: UndatedRow[];
  errors: string[];
}

/*
 * Value conversions
 */

const normalizeHeader = (value: SheetValue) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isBlank = (value: SheetValue | undefined) =>
  value === undefined || value === null || String(value).trim() === "";

const text = (value: SheetValue | undefined): string | null =>
  isBlank(value) ? null : String(value).trim();

const numberOrNull = (value: SheetValue | undefined): number | null => {
  if (isBlank(value)) return null;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

// Spreadsheet serial dates count days from 30.12.1899
const SERIAL_EPOCH = DateTime.fromISO("1899-12-30", { zone: "UTC" });

/**
 * A date cell: a serial number, or text like 1.4.2026 or 2026-04-01. Other
 * text ("14.6.25", "2025", "siirto") is not a date.
 */
export function parseSheetDate(value: SheetValue | undefined): string | null {
  if (isBlank(value)) return null;
  if (typeof value === "number") {
    return SERIAL_EPOCH.plus({ days: Math.floor(value) }).toISODate();
  }
  const raw = String(value).trim();
  const finnish = DateTime.fromFormat(raw, "d.M.yyyy");
  if (finnish.isValid) return finnish.toISODate();
  const iso = DateTime.fromFormat(raw, "yyyy-MM-dd");
  return iso.isValid ? iso.toISODate() : null;
}

/** A time-of-day cell (fraction of a day, or text 14:05 / 14.05) in minutes */
export function parseTimeOfDay(value: SheetValue | undefined): number | null {
  if (isBlank(value)) return null;
  if (typeof value === "number") {
    // "14,05" typed into a Finnish sheet becomes the number 14.05, which is
    // no time of day. A date and time (a serial number in the tens of
    // thousands) is fine: its date part is ignored.
    if (value < 0 || (value >= 1 && value < 10_000)) return null;
    const fraction = value - Math.floor(value);
    return Math.round(fraction * 1440) % 1440;
  }
  const match = String(value).trim().match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/**
 * A duration cell (fraction of a day, or text like 5723:41) in whole
 * minutes. Rounded, because values typed long ago carry float drift
 * (12:32:59 is a 33-minute flight).
 */
export function parseDuration(value: SheetValue | undefined): number | null {
  if (isBlank(value)) return null;
  if (typeof value === "number") return Math.round(value * 1440);
  const match = String(value).trim().match(/^(-)?(\d+):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const minutes =
    Number(match[2]) * 60 + Number(match[3]) + Math.round(Number(match[4] ?? 0) / 60);
  return match[1] ? -minutes : minutes;
}

/**
 * A flight's takeoff and landing from its date and the wall-clock minutes,
 * as UTC ISO times. A landing earlier than the takeoff is after midnight.
 */
export function flightTimes(
  flightDate: string,
  takeoff: number | null,
  landing: number | null
): { takeoffAt: string | null; landingAt: string | null } {
  const day = DateTime.fromISO(flightDate, { zone: SHEET_ZONE });
  // Set the hour, don't add minutes, so a DST change on the day doesn't shift them
  const atTime = (date: DateTime, minutes: number) =>
    date.set({ hour: Math.floor(minutes / 60), minute: minutes % 60 });
  const nextDay = takeoff !== null && landing !== null && landing < takeoff;
  return {
    takeoffAt: takeoff === null ? null : atTime(day, takeoff).toUTC().toISO(),
    landingAt: landing === null ? null : atTime(nextDay ? day.plus({ days: 1 }) : day, landing).toUTC().toISO(),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What a number column can sensibly hold; anything else, such as a date that
// Sheets made of "1.5", is read as empty and reported
const NUMBER_RANGES: Partial<Record<SheetColumn, [number, number]>> = {
  personsOnBoard: [1, 20],
  landings: [0, 999],
  fuel: [0, 2000],
  oil: [0, 100],
  hourMeter: [0, 99_999.9],
};

/** "M. Meikäläinen", "m.meikäläinen" and "M.Meikäläinen" are the same pilot */
export const nameKey = (name: string): string =>
  name.toLowerCase().replace(/[\s.]+/g, "");

/** Spreadsheet column letter for a 0-based index (0 → A, 26 → AA) */
export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

/*
 * Parsing
 */

export function parseFlightSheet(
  values: SheetValues,
  firstDataRow = 3
): ParsedSheet {
  const headers = values[0] ?? [];
  const columns: Partial<Record<SheetColumn, number>> = {};
  const wanted = new Map(
    Object.entries(SHEET_COLUMNS).map(([key, header]) => [
      normalizeHeader(header),
      key as SheetColumn,
    ])
  );
  headers.forEach((header, index) => {
    const key = wanted.get(normalizeHeader(header));
    if (key && columns[key] === undefined) columns[key] = index;
  });

  const missing = REQUIRED_COLUMNS.filter((key) => columns[key] === undefined);
  if (missing.length > 0) {
    return {
      columns,
      flights: [],
      firstEmptyRow: firstDataRow,
      undatedRows: [],
      errors: [
        `Taulukosta puuttuu sarakkeita: ${missing
          .map((key) => SHEET_COLUMNS[key])
          .join(", ")}`,
      ],
    };
  }

  const cell = (row: SheetValue[], key: SheetColumn) =>
    columns[key] === undefined ? undefined : row[columns[key]!];

  const flights: ParsedFlight[] = [];
  const undatedRows: UndatedRow[] = [];
  let firstEmptyRow: number | null = null;

  for (let index = firstDataRow - 1; index < values.length; index++) {
    const row = values[index] ?? [];
    const rowNumber = index + 1;
    const flightDate = parseSheetDate(cell(row, "date"));

    // Rows without a date only hold the pre-filled formulas, unless someone
    // has typed into them
    if (!flightDate) {
      if (firstEmptyRow === null) firstEmptyRow = rowNumber;
      const filled = (keys: SheetColumn[]) => keys.some((key) => !isBlank(cell(row, key)));
      const typed = filled(INPUT_COLUMNS);
      if (typed || filled(WEBSITE_COLUMNS)) {
        const id = text(cell(row, "id"));
        undatedRows.push({
          row: rowNumber,
          id: id && UUID.test(id) ? id : null,
          date: cell(row, "date") ?? null,
          typed,
        });
      }
      continue;
    }

    const badCells: ParsedFlight["badCells"] = [];
    const timeCell = (key: SheetColumn) => {
      const value = cell(row, key);
      const minutes = parseTimeOfDay(value);
      if (minutes === null && !isBlank(value)) badCells.push({ column: key, value: value! });
      return minutes;
    };
    const numberCell = (key: SheetColumn) => {
      const value = cell(row, key);
      const number = numberOrNull(value);
      const [min, max] = NUMBER_RANGES[key] ?? [-Infinity, Infinity];
      if (number === null || number < min || number > max) {
        if (!isBlank(value)) badCells.push({ column: key, value: value! });
        return null;
      }
      return number;
    };
    const idText = text(cell(row, "id"));
    if (idText && !UUID.test(idText)) badCells.push({ column: "id", value: idText });

    const { takeoffAt, landingAt } = flightTimes(flightDate, timeCell("takeoff"), timeCell("landing"));

    // The sheet's own value unless it is empty, 0 (the formula's result for
    // equal times) or negative (past midnight): then the times give it
    const sheetAirborneMinutes = parseDuration(cell(row, "airborne"));
    let airborneMinutes = sheetAirborneMinutes;
    if ((airborneMinutes === null || airborneMinutes <= 0) && takeoffAt && landingAt) {
      airborneMinutes = Math.round((Date.parse(landingAt) - Date.parse(takeoffAt)) / 60_000);
    }

    const raw = Array.from({ length: Math.max(row.length, headers.length) }, (_, i) =>
      row[i] === undefined ? null : row[i]
    );

    flights.push({
      // Anything but a UUID is replaced by the sync, like a missing ID
      id: idText && UUID.test(idText) ? idText : null,
      row: rowNumber,
      flightDate,
      picName: text(cell(row, "pic")) ?? "",
      secondName: text(cell(row, "second")),
      personsOnBoard: numberCell("personsOnBoard"),
      departure: text(cell(row, "departure"))?.toUpperCase() ?? null,
      arrival: text(cell(row, "arrival"))?.toUpperCase() ?? null,
      takeoffAt,
      landingAt,
      airborneMinutes,
      sheetAirborneMinutes,
      airframeMinutes: parseDuration(cell(row, "airframeTotal")),
      landings: numberCell("landings"),
      totalLandings: numberOrNull(cell(row, "landingsTotal")),
      purposeCode: text(cell(row, "purpose"))?.toUpperCase() ?? null,
      fuelLitres: numberCell("fuel"),
      oilQuarts: numberCell("oil"),
      hourMeter: numberCell("hourMeter"),
      remarks: text(cell(row, "remarks")),
      logPage: text(cell(row, "logPage")),
      bookTotal: text(cell(row, "bookTotal")),
      bookError: text(cell(row, "bookError")),
      maintenance: text(cell(row, "maintenance")),
      source: text(cell(row, "source")),
      status: text(cell(row, "status")),
      billingPeriod: text(cell(row, "billingPeriod")),
      badCells,
      raw,
    });
  }

  return {
    columns,
    flights,
    firstEmptyRow: firstEmptyRow ?? Math.max(values.length + 1, firstDataRow),
    undatedRows,
    errors: [],
  };
}

/*
 * Checks
 */

export type FlightIssueKind =
  | "missing_field"
  | "unknown_purpose"
  | "unknown_pilot"
  | "time_order"
  | "duplicate"
  | "duplicate_id"
  | "hour_meter"
  | "unknown_status"
  | "midnight"
  | "bad_value"
  | "airborne_mismatch"
  | "odd_date"
  | "undated_row"
  | "stray_status"
  | "copied_row";

export interface FlightIssue {
  row: number;
  flightId: string | null;
  kind: FlightIssueKind;
  message: string;
}

export interface FlightCheckContext {
  // Purpose code → whether it is a training flight. On a dual flight the
  // student is in Oppilas / SIC; on a solo flight the student is the PIC.
  purposes: Map<string, { isTraining: boolean }>;
  // nameKey() of every pilot name that is matched to a member
  knownPilots: Set<string>;
  // Today in Finnish time (YYYY-MM-DD), for dates in the future
  today?: string;
}

/** 75 → "1:15" */
const clockText = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

const BAD_CELL_HINTS: Partial<Record<SheetColumn, string>> = {
  id: "synkronointi antaa rivillä uuden ID:n",
  takeoff: "kirjoita kellonaika muodossa 14:05 (14,05 on taulukolle desimaaliluku)",
  landing: "kirjoita kellonaika muodossa 14:05 (14,05 on taulukolle desimaaliluku)",
};

/**
 * Things the biller should look at: missing or unknown values, names that
 * aren't matched to a member, likely duplicates and meter readings that go
 * backwards. They don't stop the sync.
 */
export function findFlightIssues(
  flights: ParsedFlight[],
  context: FlightCheckContext
): FlightIssue[] {
  const issues: FlightIssue[] = [];
  const add = (flight: ParsedFlight, kind: FlightIssueKind, message: string) =>
    issues.push({ row: flight.row, flightId: flight.id, kind, message });

  const seenIds = new Map<string, number>();
  const seenSlots = new Map<string, number>();
  const unknownPilotsReported = new Set<string>();
  let lastMeter: { value: number; row: number } | null = null;
  let previous: ParsedFlight | null = null;

  for (const flight of flights) {
    for (const { column, value } of flight.badCells) {
      add(
        flight,
        "bad_value",
        `${SHEET_COLUMNS[column]} "${value}" ei kelpaa: ${BAD_CELL_HINTS[column] ?? "tarkista arvo"}`
      );
    }

    // A year typed wrong hides the flight from its year, and in the stats
    // it replaces that year's typed-in totals
    if (context.today && flight.flightDate > context.today) {
      add(flight, "odd_date", `Päivämäärä ${flight.flightDate} on tulevaisuudessa`);
    } else if (flight.flightDate < "2000-01-01") {
      add(flight, "odd_date", `Tarkista päivämäärä ${flight.flightDate}`);
    } else if (
      previous &&
      DateTime.fromISO(flight.flightDate) < DateTime.fromISO(previous.flightDate).minus({ days: 365 })
    ) {
      add(
        flight,
        "odd_date",
        `Päivämäärä ${flight.flightDate} on yli vuoden aiempi kuin rivillä ${previous.row}: tarkista vuosi`
      );
    }
    previous = flight;

    const missing = [
      !flight.picName && "päällikkö",
      !flight.takeoffAt && "lentoonlähtöaika",
      !flight.landingAt && "laskuaika",
      !flight.purposeCode && "lennon tarkoitus",
    ].filter(Boolean);
    if (missing.length > 0) {
      add(flight, "missing_field", `Puuttuu: ${missing.join(", ")}`);
    }

    const purpose = flight.purposeCode
      ? context.purposes.get(flight.purposeCode)
      : undefined;
    if (flight.purposeCode && !purpose) {
      add(flight, "unknown_purpose", `Tuntematon lennon tarkoitus ${flight.purposeCode}`);
    }

    for (const name of [flight.picName, purpose?.isTraining ? flight.secondName : null]) {
      if (!name) continue;
      const key = nameKey(name);
      if (!context.knownPilots.has(key) && !unknownPilotsReported.has(key)) {
        unknownPilotsReported.add(key);
        add(flight, "unknown_pilot", `${name} ei ole yhdistetty jäseneen`);
      }
    }

    if (
      flight.takeoffAt &&
      flight.landingAt &&
      flight.airborneMinutes !== null &&
      (flight.airborneMinutes <= 0 || flight.airborneMinutes > MAX_LEG_MINUTES)
    ) {
      add(flight, "time_order", "Tarkista lentoonlähtö- ja laskuaika");
    }

    // Typed in by hand (past midnight, say) and then a time changed
    if (
      flight.takeoffAt &&
      flight.landingAt &&
      flight.sheetAirborneMinutes !== null &&
      flight.sheetAirborneMinutes > 0
    ) {
      const fromTimes = Math.round((Date.parse(flight.landingAt) - Date.parse(flight.takeoffAt)) / 60_000);
      if (Math.abs(fromTimes - flight.sheetAirborneMinutes) > 2) {
        add(
          flight,
          "airborne_mismatch",
          `Ilmassa oloaika ${clockText(flight.sheetAirborneMinutes)} ei vastaa lentoonlähtö- ja laskuaikaa (${clockText(fromTimes)})`
        );
      }
    }

    // The formula's negative time throws off the sheet's running totals,
    // so the club types these by hand
    if (
      flight.sheetAirborneMinutes !== null &&
      flight.sheetAirborneMinutes < 0 &&
      flight.airborneMinutes !== null &&
      flight.airborneMinutes > 0
    ) {
      add(
        flight,
        "midnight",
        `Lento yli puolenyön: kirjoita Ilmassa oloajaksi ${clockText(flight.airborneMinutes)} käsin, niin taulukon kokonaisajat pysyvät oikein`
      );
    }

    if (flight.id) {
      const firstRow = seenIds.get(flight.id);
      if (firstRow !== undefined) {
        add(flight, "duplicate_id", `Sama ID kuin rivillä ${firstRow}`);
      } else {
        seenIds.set(flight.id, flight.row);
      }
    }

    if (flight.takeoffAt) {
      const slot = `${flight.takeoffAt}|${flight.departure ?? ""}`;
      const firstRow = seenSlots.get(slot);
      if (firstRow !== undefined) {
        add(flight, "duplicate", `Sama lähtöaika kuin rivillä ${firstRow}`);
      } else {
        seenSlots.set(slot, flight.row);
      }
    }

    if (flight.hourMeter !== null) {
      if (lastMeter && flight.hourMeter < lastMeter.value) {
        add(
          flight,
          "hour_meter",
          `Tuntimittari ${flight.hourMeter} on pienempi kuin rivillä ${lastMeter.row} (${lastMeter.value})`
        );
      }
      lastMeter = { value: flight.hourMeter, row: flight.row };
    }

    if (
      flight.status &&
      !FLIGHT_STATUSES.some((status) => status.toLowerCase() === flight.status!.toLowerCase())
    ) {
      add(flight, "unknown_status", `Tuntematon tila ${flight.status}`);
    }
  }

  return issues;
}

/**
 * Rows that aren't read as flights although something is in them. A typed
 * row without a readable date is one issue each. Rows that only have the
 * website's columns, like a Tila filled down past the last flight, are
 * grouped: a flight typed into one of them later would take that Tila.
 */
export function findUndatedRowIssues(rows: UndatedRow[]): FlightIssue[] {
  const issues: FlightIssue[] = [];
  let stray: { first: number; last: number } | null = null;
  const flushStray = () => {
    if (!stray) return;
    issues.push({
      row: stray.first,
      flightId: null,
      kind: "stray_status",
      message: `${
        stray.first === stray.last ? `Rivillä ${stray.first}` : `Riveillä ${stray.first}–${stray.last}`
      } on Tila, Lähde tai Laskutusjakso ilman lentoa. Tyhjennä ne, ettei niihin kirjoitettava lento saa niitä.`,
    });
    stray = null;
  };

  for (const row of rows) {
    if (!row.typed) {
      if (stray && row.row === stray.last + 1) stray.last = row.row;
      else {
        flushStray();
        stray = { first: row.row, last: row.row };
      }
      continue;
    }
    flushStray();
    const what = isBlank(row.date)
      ? "Rivillä on lennon tietoja mutta ei päivämäärää"
      : `Päivämäärää "${row.date}" ei voi lukea (esim. 14.6.2026)`;
    issues.push({
      row: row.row,
      flightId: row.id,
      kind: "undated_row",
      message: `${what}, joten riviä ei lueta lennoksi.${
        row.id ? " Lennon edellinen versio pidetään, kunnes päivämäärä on korjattu." : ""
      }`,
    });
  }
  flushStray();
  return issues;
}

/*
 * Writing
 */

// Columns a person types into; the website writes only these (and ID, Lähde)
const INPUT_COLUMNS: SheetColumn[] = [
  "date",
  "pic",
  "second",
  "personsOnBoard",
  "departure",
  "arrival",
  "takeoff",
  "landing",
  "landings",
  "purpose",
  "fuel",
  "oil",
  "hourMeter",
  "remarks",
  "id",
];

// The website's own columns, apart from ID
const WEBSITE_COLUMNS: SheetColumn[] = ["source", "status", "billingPeriod"];

/**
 * Rows a new flight can go into: the rows after the last flight that are
 * pre-filled with the formulas (formulas[i] is row i + 1 of the airborne-time
 * column) and still empty. Writing there keeps the running totals right.
 * Stops at a row someone has started typing into, so it is never overwritten.
 */
export function findWritableRows(
  values: SheetValues,
  parsed: ParsedSheet,
  formulas: string[],
  firstDataRow = 3
): number[] {
  const lastFlightRow = parsed.flights.reduce(
    (last, flight) => Math.max(last, flight.row),
    firstDataRow - 1
  );

  const rows: number[] = [];
  for (let row = lastFlightRow + 1; row <= formulas.length; row++) {
    if (!formulas[row - 1]?.startsWith("=")) break;
    const cells = values[row - 1] ?? [];
    const typedInto = INPUT_COLUMNS.some((key) => {
      const index = parsed.columns[key];
      return index !== undefined && !isBlank(cells[index]);
    });
    if (typedInto) break;
    rows.push(row);
  }
  return rows;
}

export interface SheetFlightInput {
  id: string;
  flightDate: string; // YYYY-MM-DD
  picName: string;
  secondName: string | null;
  personsOnBoard: number;
  departure: string;
  arrival: string;
  takeoff: string; // HH:MM, Finnish time
  landing: string; // HH:MM
  landings: number;
  purposeCode: string;
  fuelLitres: number | null;
  oilQuarts: number | null;
  hourMeter: number | null;
  remarks: string | null;
  // From bulk entry: the paper page, and Tila (the flight is checked already)
  logPage?: string | null;
  status?: ReviewStatus;
  // Lähde: "web" unless said otherwise (sample flights are "esimerkki")
  source?: string;
}

// Text for a cell written with USER_ENTERED: the leading apostrophe makes
// Sheets keep it as typed, so a remark like "=IMAGE(...)" never becomes a
// formula in the club's sheet and an ID never turns into a number. Sheets
// doesn't show or return the apostrophe.
const asText = (value: string | null): string => (value ? `'${value}` : "");
// "14:05" as a fraction of a day, the number a time cell holds
const timeOfDay = (clock: string): number | "" => {
  const minutes = parseTimeOfDay(clock);
  return minutes === null ? "" : minutes / 1440;
};

// A page number stays a number, as the club types them
const logPageValue = (page: string | null): string =>
  /^\d+$/.test(page ?? "") ? page! : asText(page);

/**
 * The cells of one flight for a sheet row, written with USER_ENTERED. The
 * date goes as ISO text, which Sheets reads as a date in any locale. Times
 * and other numbers go as numbers: a Finnish-locale sheet keeps the text
 * "14:05" as text (its formulas then show #VALUE!) and reads "1.5" as 1 May.
 * A time is a fraction of a day, which the sheet's time format shows as
 * 14.05. Optional columns the sheet doesn't have are skipped.
 */
export function flightCells(
  input: SheetFlightInput,
  row: number,
  columns: ParsedSheet["columns"]
): { row: number; column: number; value: string | number }[] {
  const values: Partial<Record<SheetColumn, string | number>> = {
    date: input.flightDate,
    pic: asText(input.picName),
    second: asText(input.secondName),
    personsOnBoard: input.personsOnBoard,
    departure: asText(input.departure),
    arrival: asText(input.arrival),
    takeoff: timeOfDay(input.takeoff),
    landing: timeOfDay(input.landing),
    landings: input.landings,
    purpose: asText(input.purposeCode),
    fuel: input.fuelLitres ?? "",
    oil: input.oilQuarts ?? "",
    hourMeter: input.hourMeter ?? "",
    remarks: asText(input.remarks),
    id: asText(input.id),
    source: asText(input.source ?? "web"),
    ...(input.logPage !== undefined && { logPage: logPageValue(input.logPage) }),
    // A new flight starts with its own Tila (empty is Kirjattu) and in no
    // billing period, also when someone filled those columns down into the
    // formula rows below the last flight
    status: asText(input.status ?? ""),
    billingPeriod: "",
  };
  return Object.entries(values)
    .filter(([key]) => columns[key as SheetColumn] !== undefined)
    .map(([key, value]) => ({ row, column: columns[key as SheetColumn]!, value: value! }));
}

/**
 * Tila Tarkistettu and the paper page: what bulk entry writes on a flight that
 * the paper book confirms as it is
 */
export function checkedCells(
  row: number,
  columns: ParsedSheet["columns"],
  logPage: string | null
): { row: number; column: number; value: string }[] {
  const values: Partial<Record<SheetColumn, string>> = {
    status: asText("Tarkistettu"),
    ...(logPage !== null && { logPage: logPageValue(logPage) }),
  };
  return Object.entries(values)
    .filter(([key]) => columns[key as SheetColumn] !== undefined)
    .map(([key, value]) => ({ row, column: columns[key as SheetColumn]!, value: value! }));
}

// What a page of the paper book says about a flight. A correction from bulk
// entry rewrites only these, so fuel, oil and the hour meter stay as entered.
export const PAPER_COLUMNS: SheetColumn[] = [
  "date",
  "pic",
  "second",
  "personsOnBoard",
  "departure",
  "arrival",
  "takeoff",
  "landing",
  "landings",
  "purpose",
];

/** The cells to clear when a web entry is undone: its input columns and source */
export function clearedFlightCells(
  row: number,
  columns: ParsedSheet["columns"]
): { row: number; column: number; value: string }[] {
  return [...INPUT_COLUMNS, "source" as SheetColumn]
    .filter((key) => columns[key] !== undefined)
    .map((key) => ({ row, column: columns[key]!, value: "" }));
}
