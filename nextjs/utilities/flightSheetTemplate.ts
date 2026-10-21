import { FLIGHT_STATUSES, SHEET_COLUMNS, SheetColumn } from "@/utilities/flightSheetParser";

/**
 * An empty flight log spreadsheet in the club's layout, for the dev
 * environment (or a new aircraft): the columns of the club's sheet in their
 * order, its formulas pre-filled, and the website's four columns at the right
 * edge. scripts/flight-sheet-template.ts writes it as an .xlsx file, which
 * Google Sheets opens as is. See docs/FLIGHT_LOG_SETUP.md.
 */

export type CellStyle =
  | "header"
  | "websiteHeader"
  | "date"
  | "time"
  | "duration"
  | "formulaDuration"
  | "formulaNumber"
  | "website"
  | "title";

export interface TemplateCell {
  value?: string | number;
  formula?: string; // without the leading "="
  style?: CellStyle;
}

export interface TemplateValidation {
  range: string; // e.g. "AA3:AA1002"
  values: string[];
  title: string;
  message: string;
}

export interface TemplateSheet {
  name: string;
  widths: number[]; // per column, in characters
  rows: TemplateCell[][]; // rows[0] is row 1
  frozenRows: number;
  validations: TemplateValidation[];
}

// Same codes as the flight_purposes seed in postgres/init/01-schema.sql
export const TEMPLATE_PURPOSES: [string, string][] = [
  ["HAR", "Harrastuslento"],
  ["MAT", "Matkalento"],
  ["KOU", "Koululento"],
  ["KOUMAT", "Koulumatkalento"],
  ["KOUHAR", "Kouluharrastuslento"],
  ["TAR", "Tarkastuslento"],
  ["ESI", "Esittelylento"],
  ["SII", "Siirtolento"],
  ["KOE", "Koelento"],
  ["PALO", "Palolento"],
  ["PALOHAR", "Palolentoharjoitus"],
  ["SAR", "Etsintälento"],
  ["SARHAR", "Etsintälentoharjoitus"],
  ["HIN", "Hinauslento"],
  ["LAS", "Laskuvarjolento"],
];

type Column = {
  key: SheetColumn | "maintenanceInterval" | "month" | "year";
  width: number;
  style?: CellStyle;
};

// The club's sheet, A–X, then the website's columns
const LAYOUT: Column[] = [
  { key: "date", width: 11, style: "date" },
  { key: "pic", width: 16 },
  { key: "second", width: 16 },
  { key: "personsOnBoard", width: 8 },
  { key: "departure", width: 10 },
  { key: "arrival", width: 10 },
  { key: "takeoff", width: 9, style: "time" },
  { key: "landing", width: 9, style: "time" },
  { key: "airborne", width: 9 },
  { key: "airframeTotal", width: 11 },
  { key: "landings", width: 8 },
  { key: "landingsTotal", width: 10 },
  { key: "purpose", width: 10 },
  { key: "fuel", width: 9 },
  { key: "oil", width: 7 },
  { key: "hourMeter", width: 10 },
  { key: "remarks", width: 30 },
  { key: "logPage", width: 12 },
  { key: "bookTotal", width: 12 },
  { key: "bookError", width: 12 },
  { key: "maintenance", width: 12 },
  { key: "maintenanceInterval", width: 14 },
  { key: "month", width: 9 },
  { key: "year", width: 7 },
  { key: "id", width: 38, style: "website" },
  { key: "source", width: 8, style: "website" },
  { key: "status", width: 13, style: "website" },
  { key: "billingPeriod", width: 13, style: "website" },
];

// Headers the club's sheet has but the website doesn't read
const EXTRA_HEADERS = {
  maintenanceInterval: "Ilmassaoloaika huoltojen välillä",
  month: "Kuukausi",
  year: "Vuosi",
};

const WEBSITE_COLUMNS: string[] = ["id", "source", "status", "billingPeriod"];

/** 0 → A, 26 → AA */
export function letter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

const col = (key: Column["key"]) => letter(LAYOUT.findIndex((c) => c.key === key));

// The club's formulas. A row without a flight shows nothing in I and in the
// running totals J and L, as in the club's sheet.
function formulas(row: number): Partial<Record<Column["key"], TemplateCell>> {
  const [date, takeoff, landing, airborne, total, landings, landingsTotal] = [
    "date",
    "takeoff",
    "landing",
    "airborne",
    "airframeTotal",
    "landings",
    "landingsTotal",
  ].map((key) => col(key as Column["key"]));
  const r = row;
  const p = row - 1;
  return {
    airborne: {
      formula: `IF(${landing}${r}-${takeoff}${r}=0,,${landing}${r}-${takeoff}${r})`,
      style: "formulaDuration",
    },
    airframeTotal: {
      formula: `IF(${total}${p}+${airborne}${r}=${total}${p},,${total}${p}+${airborne}${r})`,
      style: "formulaDuration",
    },
    landingsTotal: {
      formula: `IF(${landingsTotal}${p}+${landings}${r}=${landingsTotal}${p},,${landingsTotal}${p}+${landings}${r})`,
      style: "formulaNumber",
    },
    month: { formula: `IF(${date}${r}="","",MONTH(${date}${r}))`, style: "formulaNumber" },
    year: { formula: `IF(${date}${r}="","",YEAR(${date}${r}))`, style: "formulaNumber" },
  };
}

export const TEMPLATE_FIRST_DATA_ROW = 3;

export function buildFlightLogTab(name: string, formulaRows = 1000): TemplateSheet {
  const header: TemplateCell[] = LAYOUT.map((column) => ({
    value:
      column.key in EXTRA_HEADERS
        ? EXTRA_HEADERS[column.key as keyof typeof EXTRA_HEADERS]
        : SHEET_COLUMNS[column.key as SheetColumn],
    style: WEBSITE_COLUMNS.includes(column.key) ? "websiteHeader" : "header",
  }));

  // Row 2: the aircraft's totals before the first flight in this sheet,
  // typed in by hand
  const openingFormulas = formulas(2);
  const opening: TemplateCell[] = LAYOUT.map((column) => {
    if (column.key === "airframeTotal") return { value: 0, style: "duration" };
    if (column.key === "landingsTotal") return { value: 0 };
    if (column.key === "month" || column.key === "year") return openingFormulas[column.key]!;
    return {};
  });

  const rows = [header, opening];
  for (let row = TEMPLATE_FIRST_DATA_ROW; row < TEMPLATE_FIRST_DATA_ROW + formulaRows; row++) {
    const cells = formulas(row);
    rows.push(LAYOUT.map((column) => cells[column.key] ?? { style: column.style }));
  }

  const last = TEMPLATE_FIRST_DATA_ROW + formulaRows - 1;
  const range = (key: Column["key"]) => `${col(key)}${TEMPLATE_FIRST_DATA_ROW}:${col(key)}${last}`;
  return {
    name,
    widths: LAYOUT.map((column) => column.width),
    rows,
    frozenRows: 1,
    validations: [
      {
        range: range("status"),
        values: [...FLIGHT_STATUSES],
        title: "Tila",
        message: "Tyhjä = Kirjattu. Muut: Korjattava, Tarkistettu, Laskutettu, Ei laskuteta, Maksettu.",
      },
      {
        range: range("purpose"),
        values: TEMPLATE_PURPOSES.map(([code]) => code),
        title: "Lennon tarkoitus",
        message: "Tuntematon koodi. Katso koodit Ohje-välilehdeltä.",
      },
    ],
  };
}

// The "Ohje" tab, in Finnish for whoever opens the sheet
function instructionsTab(aircraftTab: string): TemplateSheet {
  const lines: [string, CellStyle?][] = [
    ["SaLKo lentopäiväkirja: taulukon pohja", "title"],
    [""],
    [`Yksi välilehti per kone. Välilehden nimen pitää olla sama kuin sivuston asetuksissa (nyt "${aircraftTab}").`],
    ["Rivi 1 on otsikot. Sivusto etsii sarakkeet otsikon perusteella: sarakkeita voi siirtää, mutta otsikoita ei saa muuttaa."],
    ["Rivi 2 on avaussummat: koneen kokonaisilmassaoloaika (J2) ja laskujen kokonaismäärä (L2) ennen ensimmäistä lentoa."],
    ["Lennot alkavat riviltä 3. Harmaiden sarakkeiden kaavat on valmiina 1000 riville."],
    ["Kirjoita lento ensimmäiselle tyhjälle riville. Älä lisää rivejä loppuun: niissä ei ole kaavoja."],
    ["Kun kaavarivit loppuvat, valitse viimeinen rivi ja vedä se täyttökahvasta alaspäin."],
    ["Ajat ovat Suomen aikaa (14:05). Kello 24 jälkeen päättyvän lennon laskuaika kirjoitetaan sellaisenaan."],
    [""],
    ["Sivuston sarakkeet (sininen otsikko)", "title"],
    ["ID: sivusto täyttää. Älä muuta, poista tai kopioi sitä toiselle riville."],
    ["Lähde: web, kun lento on kirjattu sivustolla. Tyhjä, kun se on kirjoitettu taulukkoon."],
    ["Tila: tyhjä = Kirjattu, Korjattava, Tarkistettu, Laskutettu, Ei laskuteta tai Maksettu."],
    ["Laskutusjakso: sivusto täyttää, kun laskutusjakso suljetaan."],
    [""],
    ["Lennon tarkoitukset", "title"],
    ...TEMPLATE_PURPOSES.map(([code, name]): [string] => [`${code}: ${name}`]),
    [""],
    ["Asetukset", "title"],
    ["Tiedosto → Asetukset: kieli- ja alueasetus Suomi, aikavyöhyke (GMT+02:00) Helsinki."],
    ["Jaa taulukko sivuston palvelutilille muokkaajana. Ohje: nextjs/docs/FLIGHT_LOG_SETUP.md."],
  ];
  return {
    name: "Ohje",
    widths: [110],
    rows: lines.map(([text, style]) => [{ value: text, style }]),
    frozenRows: 0,
    validations: [],
  };
}

export function buildFlightSheetTemplate(aircraftTab = "OH-CON Matkapäiväkirja"): TemplateSheet[] {
  return [buildFlightLogTab(aircraftTab), instructionsTab(aircraftTab)];
}
