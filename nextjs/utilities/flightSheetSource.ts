import "server-only";

import { readFileSync } from "fs";
import path from "path";
import { google, sheets_v4 } from "googleapis";
import {
  columnLetter,
  parseSheetDate,
  parseTimeOfDay,
  SheetValue,
  SheetValues,
} from "@/utilities/flightSheetParser";

/**
 * Where the flight log lives. In production that is the club's Google Sheet;
 * in development and tests it is a synthetic fixture held in memory, so
 * nothing ever touches the real sheet:
 *
 *   FLIGHT_SHEET_SOURCE=google   GOOGLE_SERVICE_ACCOUNT_KEY + FLIGHT_LOG_SPREADSHEET_ID
 *   FLIGHT_SHEET_SOURCE=fixture  FLIGHT_SHEET_FIXTURE (default e2e/fixtures/flight-sheet.json)
 *
 * Without FLIGHT_SHEET_SOURCE, Google is used when it is configured and the
 * fixture under `next dev`.
 */

export interface SheetCell {
  row: number; // 1-based
  column: number; // 0-based
  value: string;
}

export interface WriteOptions {
  // Let Sheets parse the values as if typed (USER_ENTERED): "2026-04-01" becomes
  // a date and "14:05" a time in any spreadsheet locale. Off writes them as-is.
  parse?: boolean;
}

export interface FlightSheet {
  readonly kind: "google" | "fixture";
  readTab(tab: string): Promise<SheetValues>;
  writeCells(tab: string, cells: SheetCell[], options?: WriteOptions): Promise<void>;
  // One column as formulas ("=H5-G5"), to find the rows that are pre-filled
  // with formulas; index 0 is row 1
  readFormulas(tab: string, column: number): Promise<string[]>;
  // Google's numeric id of each tab, for links into the sheet
  tabIds(): Promise<Map<string, number>>;
  // Link to a row, given the tab's id
  rowUrl(tabId: number | null, row: number): string | null;
}

const quoteTab = (tab: string) => `'${tab.replace(/'/g, "''")}'`;

class GoogleFlightSheet implements FlightSheet {
  readonly kind = "google";

  constructor(
    private readonly spreadsheetId: string,
    private readonly sheets: sheets_v4.Sheets
  ) {}

  async readTab(tab: string): Promise<SheetValues> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: quoteTab(tab),
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "SERIAL_NUMBER",
    });
    return (response.data.values ?? []) as SheetValues;
  }

  async writeCells(tab: string, cells: SheetCell[], options: WriteOptions = {}): Promise<void> {
    if (cells.length === 0) return;
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        valueInputOption: options.parse ? "USER_ENTERED" : "RAW",
        data: cells.map((cell) => ({
          range: `${quoteTab(tab)}!${columnLetter(cell.column)}${cell.row}`,
          values: [[cell.value]],
        })),
      },
    });
  }

  async readFormulas(tab: string, column: number): Promise<string[]> {
    const letter = columnLetter(column);
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${quoteTab(tab)}!${letter}:${letter}`,
      valueRenderOption: "FORMULA",
    });
    return (response.data.values ?? []).map((row) => String(row?.[0] ?? ""));
  }

  async tabIds(): Promise<Map<string, number>> {
    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties(sheetId,title)",
    });
    return new Map(
      (response.data.sheets ?? []).map((sheet) => [
        sheet.properties?.title ?? "",
        sheet.properties?.sheetId ?? 0,
      ])
    );
  }

  rowUrl(tabId: number | null, row: number): string | null {
    if (tabId === null) return null;
    return `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit#gid=${tabId}&range=A${row}`;
  }
}

// The fixture is kept on globalThis so that every route bundle of the server
// sees the same copy, including the IDs the sync writes into it
type FixtureTabs = Record<string, SheetValues>;
const fixtureStore = globalThis as typeof globalThis & {
  __flightSheetFixture?: FixtureTabs;
};

class FixtureFlightSheet implements FlightSheet {
  readonly kind = "fixture";

  constructor(private readonly file: string) {}

  private tabs(): FixtureTabs {
    if (!fixtureStore.__flightSheetFixture) {
      const fixture = JSON.parse(readFileSync(this.file, "utf8"));
      fixtureStore.__flightSheetFixture = fixture.tabs as FixtureTabs;
    }
    return fixtureStore.__flightSheetFixture;
  }

  async readTab(tab: string): Promise<SheetValues> {
    const values = this.tabs()[tab];
    if (!values) {
      throw new Error(`Välilehteä ${tab} ei löydy taulukosta`);
    }
    return values.map((row) => [...row]);
  }

  async writeCells(tab: string, cells: SheetCell[], options: WriteOptions = {}): Promise<void> {
    const values = this.tabs()[tab];
    if (!values) {
      throw new Error(`Välilehteä ${tab} ei löydy taulukosta`);
    }
    for (const cell of cells) {
      while (values.length < cell.row) values.push([]);
      const row = values[cell.row - 1];
      while (row.length <= cell.column) row.push("");
      row[cell.column] = options.parse ? parseLikeSheets(cell.value) : cell.value;
    }
  }

  async readFormulas(tab: string, column: number): Promise<string[]> {
    const values = await this.readTab(tab);
    // The fixture keeps computed values only; a number in the column stands
    // for a formula (the pre-filled rows hold 0)
    return values.map((row) => (typeof row[column] === "number" ? "=fixture" : ""));
  }

  async tabIds(): Promise<Map<string, number>> {
    return new Map();
  }

  rowUrl(): string | null {
    return null;
  }
}

// What Sheets makes of a typed value (USER_ENTERED), for the fixture: a leading
// apostrophe keeps the rest as text, ISO dates and HH:MM times become serial
// numbers, numbers become numbers
function parseLikeSheets(value: string): SheetValue {
  if (value.startsWith("'")) {
    return value.slice(1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = parseSheetDate(value)!;
    const days = (Date.parse(`${date}T00:00:00Z`) - Date.parse("1899-12-30T00:00:00Z")) / 86_400_000;
    return days;
  }
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    return parseTimeOfDay(value)! / 1440;
  }
  if (value !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

export class FlightSheetNotConfiguredError extends Error {
  constructor() {
    super(
      "Lentopäiväkirjan Google-taulukkoa ei ole määritetty (GOOGLE_SERVICE_ACCOUNT_KEY ja FLIGHT_LOG_SPREADSHEET_ID)"
    );
  }
}

export function getFlightSheet(): FlightSheet {
  const source = process.env.FLIGHT_SHEET_SOURCE;
  const spreadsheetId = process.env.FLIGHT_LOG_SPREADSHEET_ID;
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const googleConfigured = Boolean(spreadsheetId && serviceAccountKey);

  const useFixture =
    source === "fixture" ||
    (!source && !googleConfigured && process.env.NODE_ENV === "development");

  if (useFixture) {
    // Read at run time only: without the ignore comment, next build would copy
    // the whole project (data/ and docs/ too) into the standalone server.
    // That server runs in .next/standalone, so e2e passes an absolute path.
    const file = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      process.env.FLIGHT_SHEET_FIXTURE ?? "e2e/fixtures/flight-sheet.json"
    );
    return new FixtureFlightSheet(file);
  }

  if (!googleConfigured) {
    throw new FlightSheetNotConfiguredError();
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(serviceAccountKey!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return new GoogleFlightSheet(
    spreadsheetId!,
    google.sheets({ version: "v4", auth })
  );
}
