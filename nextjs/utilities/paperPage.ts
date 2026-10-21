import { DateTime } from "luxon";
import { nameKey, SHEET_ZONE } from "@/utilities/flightSheetParser";
import { minutesBetween, normalizeClock } from "@/utilities/flightFormInput";

/**
 * Typing a page of the paper journey log into the sheet (/admin/lennot/tuonti):
 * reading the grid's cells, and matching each line with what pilots already
 * entered. Shared by the grid (client) and the server actions.
 */

export const PAPER_FIELDS = [
  "date",
  "pic",
  "second",
  "persons",
  "departure",
  "arrival",
  "takeoff",
  "landing",
  "landings",
  "purpose",
  "remarks",
] as const;
export type PaperField = (typeof PAPER_FIELDS)[number];
export type PaperCells = Record<PaperField, string>;

export const emptyPaperCells = (): PaperCells =>
  Object.fromEntries(PAPER_FIELDS.map((field) => [field, ""])) as PaperCells;

// A line of the paper book once its cells are read
export interface PaperRow {
  flightDate: string; // YYYY-MM-DD
  picName: string;
  secondName: string | null;
  personsOnBoard: number;
  departure: string;
  arrival: string;
  takeoff: string; // HH:MM
  landing: string;
  landings: number;
  purposeCode: string;
  remarks: string | null;
}

// A flight already in the sheet, in the same terms
export interface ExistingFlight extends PaperRow {
  id: string;
  sheetRow: number;
  source: string | null;
  status: string | null;
  inputHash: string | null;
}

// Ditto marks, as written in the paper book for "same as above"
const DITTO = /^("|〃|'')$/;
const isBlankRow = (cells: PaperCells) => PAPER_FIELDS.every((field) => !cells[field].trim());

/**
 * "14.6.2025", "14.6.25", "14.6." (the year of the line above, or this year),
 * or ISO. Returns YYYY-MM-DD or null.
 */
export function parsePaperDate(value: string, previous: string | null): string | null {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return DateTime.fromISO(text).isValid ? text : null;
  }
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})?$/);
  if (!match) return null;
  const year = match[3]
    ? match[3].length === 2
      ? 2000 + Number(match[3])
      : Number(match[3])
    : previous
      ? Number(previous.slice(0, 4))
      : DateTime.now().setZone(SHEET_ZONE).year;
  const date = DateTime.fromObject({ year, month: Number(match[2]), day: Number(match[1]) });
  return date.isValid ? date.toISODate() : null;
}

export interface ReadRow {
  index: number; // position in the grid
  row: PaperRow | null;
  errors: string[];
}

/**
 * Reads the grid. Blank lines are skipped. A ditto mark copies the cell from
 * the line above, and an empty date means the same day as the line above.
 */
export function readPaperGrid(grid: PaperCells[], today: string): ReadRow[] {
  const read: ReadRow[] = [];
  let above: PaperCells | null = null;
  let aboveDate: string | null = null;

  grid.forEach((raw, index) => {
    if (isBlankRow(raw)) return;
    const cells = { ...raw };
    for (const field of PAPER_FIELDS) {
      if (DITTO.test(cells[field].trim())) cells[field] = above?.[field] ?? "";
    }

    const errors: string[] = [];
    const flightDate = cells.date.trim() ? parsePaperDate(cells.date, aboveDate) : aboveDate;
    if (!flightDate) errors.push("Päivä puuttuu tai on väärin (esim. 14.6.2025)");
    else if (flightDate > today) errors.push("Päivä on tulevaisuudessa");

    const picName = cells.pic.trim();
    if (!picName) errors.push("Päällikkö puuttuu");
    const takeoff = normalizeClock(cells.takeoff);
    const landing = normalizeClock(cells.landing);
    if (!takeoff || !landing) errors.push("Anna lähtö- ja laskuaika, esim. 14.05");
    const departure = cells.departure.trim().toUpperCase();
    const arrival = cells.arrival.trim().toUpperCase();
    if (![departure, arrival].every((field) => /^[A-ZÅÄÖ0-9]{2,8}$/.test(field))) {
      errors.push("Anna kentät tunnuksella, esim. EFSA");
    }
    const landings = cells.landings.trim() === "" ? 1 : Number(cells.landings);
    if (!Number.isInteger(landings) || landings < 0 || landings > 99) {
      errors.push("Laskujen määrä on kokonaisluku");
    }
    const persons = cells.persons.trim() === "" ? 1 : Number(cells.persons);
    if (!Number.isInteger(persons) || persons < 1 || persons > 6) {
      errors.push("Henkilöitä 1–6");
    }
    const purposeCode = cells.purpose.trim().toUpperCase();
    if (!purposeCode) errors.push("Lennon tarkoitus puuttuu");

    read.push({
      index,
      errors,
      row:
        errors.length > 0
          ? null
          : {
              flightDate: flightDate!,
              picName,
              secondName: cells.second.trim() || null,
              personsOnBoard: persons,
              departure,
              arrival,
              takeoff: takeoff!,
              landing: landing!,
              landings,
              purposeCode,
              remarks: cells.remarks.trim() || null,
            },
    });
    above = cells;
    aboveDate = flightDate ?? aboveDate;
  });
  return read;
}

export type RowMatch =
  | { kind: "new" }
  | { kind: "same"; flight: ExistingFlight }
  | { kind: "differs"; flight: ExistingFlight; differences: string[] };

const clockMinutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

// A sheet row is the same flight when it is on the same day and took off
// within this many minutes, or has the same PIC and overlapping times
const MATCH_WINDOW = 15;

/** What the paper says differently from the sheet: "lasku 10:45 → 10:47" */
export function describeDifferences(paper: PaperRow, sheet: PaperRow): string[] {
  const found: string[] = [];
  const compare = (label: string, a: string | number | null, b: string | number | null) => {
    if ((a ?? "") !== (b ?? "")) found.push(`${label} ${b ?? "–"} → ${a ?? "–"}`);
  };
  if (nameKey(paper.picName) !== nameKey(sheet.picName)) {
    found.push(`päällikkö ${sheet.picName} → ${paper.picName}`);
  }
  if (nameKey(paper.secondName ?? "") !== nameKey(sheet.secondName ?? "")) {
    found.push(`oppilas/SIC ${sheet.secondName ?? "–"} → ${paper.secondName ?? "–"}`);
  }
  compare("mistä", paper.departure, sheet.departure);
  compare("minne", paper.arrival, sheet.arrival);
  compare("lähtö", paper.takeoff, sheet.takeoff);
  compare("lasku", paper.landing, sheet.landing);
  compare("laskuja", paper.landings, sheet.landings);
  compare("tarkoitus", paper.purposeCode, sheet.purposeCode);
  compare("henkilöitä", paper.personsOnBoard, sheet.personsOnBoard);
  return found;
}

/**
 * Pairs each line of the paper page with a flight already in the sheet, if
 * there is one: the closest takeoff on the same day. Each sheet flight is
 * used once. Remarks don't count as a difference: the sheet's are kept.
 */
export function matchPaperRows(rows: PaperRow[], existing: ExistingFlight[]): RowMatch[] {
  const used = new Set<string>();
  return rows.map((paper) => {
    const candidates = existing
      .filter((flight) => flight.flightDate === paper.flightDate && !used.has(flight.id))
      .map((flight) => {
        const gap = Math.abs(clockMinutes(flight.takeoff) - clockMinutes(paper.takeoff));
        const overlaps =
          nameKey(flight.picName) === nameKey(paper.picName) &&
          clockMinutes(flight.takeoff) < clockMinutes(paper.landing) &&
          clockMinutes(paper.takeoff) < clockMinutes(flight.landing);
        return { flight, gap, overlaps };
      })
      .filter((c) => c.gap <= MATCH_WINDOW || c.overlaps)
      .sort((a, b) => a.gap - b.gap);

    const best = candidates[0]?.flight;
    if (!best) return { kind: "new" };
    used.add(best.id);
    const found = describeDifferences(paper, best);
    return found.length === 0
      ? { kind: "same", flight: best }
      : { kind: "differs", flight: best, differences: found };
  });
}

/** Airborne minutes and landings of the read lines, for the page totals */
export function paperTotals(rows: (PaperRow | null)[]): { minutes: number; landings: number } {
  return rows.reduce(
    (sum, row) =>
      row
        ? {
            minutes: sum.minutes + (minutesBetween(row.takeoff, row.landing) ?? 0),
            landings: sum.landings + row.landings,
          }
        : sum,
    { minutes: 0, landings: 0 }
  );
}

/** "1:23" or "123:05" → minutes */
export function parseHoursMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,4})[:.,](\d{2})$/);
  if (!match || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
