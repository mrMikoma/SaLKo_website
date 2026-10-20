import "server-only";

import { readFileSync } from "fs";
import path from "path";
import { google, sheets_v4 } from "googleapis";
import { columnLetter, SheetValues } from "@/utilities/flightSheetParser";

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

export interface FlightSheet {
  readonly kind: "google" | "fixture";
  readTab(tab: string): Promise<SheetValues>;
  writeCells(tab: string, cells: SheetCell[]): Promise<void>;
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

  async writeCells(tab: string, cells: SheetCell[]): Promise<void> {
    if (cells.length === 0) return;
    await this.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: cells.map((cell) => ({
          range: `${quoteTab(tab)}!${columnLetter(cell.column)}${cell.row}`,
          values: [[cell.value]],
        })),
      },
    });
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

  async writeCells(tab: string, cells: SheetCell[]): Promise<void> {
    const values = this.tabs()[tab];
    if (!values) {
      throw new Error(`Välilehteä ${tab} ei löydy taulukosta`);
    }
    for (const cell of cells) {
      while (values.length < cell.row) values.push([]);
      const row = values[cell.row - 1];
      while (row.length <= cell.column) row.push("");
      row[cell.column] = cell.value;
    }
  }

  async tabIds(): Promise<Map<string, number>> {
    return new Map();
  }

  rowUrl(): string | null {
    return null;
  }
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
    const file = path.resolve(
      process.cwd(),
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
