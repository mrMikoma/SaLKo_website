import { describe, expect, test } from "bun:test";
import {
  columnLetter,
  findFlightIssues,
  nameKey,
  parseDuration,
  parseFlightSheet,
  parseSheetDate,
  parseTimeOfDay,
  SheetValues,
} from "@/utilities/flightSheetParser";

// Serial numbers as the Sheets API returns them
const SERIAL_2026_04_01 = 46113;
const SERIAL_2026_03_29 = 46110; // EU summer time starts that night
const time = (hours: number, minutes: number) => (hours * 60 + minutes) / 1440;

const HEADERS = [
  "Päivämäärä",
  "Päällikkö",
  "Oppilas / SIC",
  "Henkilömäärä",
  "Lentoonlähtöpaikka",
  "Laskupaikka",
  "Lentoonlähtöaika",
  "Laskuaika",
  "Ilmassa oloaika",
  "Kokonais ilmassaoloaika",
  "Laskujen määrä",
  "Laskujen kokonaismäärä",
  "Lennon tarkoitus ", // trailing space, as in the club's sheet
  "Tankkaus",
  "Öljy",
  "Tuntimittari",
  "Huomiot",
  "Sivunumero / Matkapvkirja #",
  "Total matkapäiväkirja",
  "Virhe kirjassa",
  "Huolto",
  "Ilmassaoloaika huoltojen välillä",
  "Kuukausi",
  "Vuosi",
  "ID",
  "Lähde",
  "Tila",
  "Laskutusjakso",
];

const flightRow = (overrides: Record<number, string | number> = {}) => {
  const row: (string | number)[] = [
    SERIAL_2026_04_01,
    "M. Meikäläinen",
    "",
    2,
    "EFSA",
    "EFSA",
    time(18, 42),
    time(19, 21),
    time(0, 39),
    5724 + 20 / 60 / 24, // not used by the tests below
    5,
    12061,
    "HAR",
  ];
  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value;
  }
  return row;
};

const sheet = (...rows: (string | number)[][]): SheetValues => [
  HEADERS,
  [null, null, null, null, null, null, null, null, null, 5723 / 24, null, 12056],
  ...rows,
];

describe("cell values", () => {
  test("serial dates and Finnish text dates", () => {
    expect(parseSheetDate(SERIAL_2026_04_01)).toBe("2026-04-01");
    expect(parseSheetDate("1.4.2026")).toBe("2026-04-01");
    expect(parseSheetDate("")).toBeNull();
  });

  test("times of day", () => {
    expect(parseTimeOfDay(time(18, 42))).toBe(18 * 60 + 42);
    expect(parseTimeOfDay(SERIAL_2026_04_01 + time(9, 5))).toBe(9 * 60 + 5);
    expect(parseTimeOfDay("14.05")).toBe(14 * 60 + 5);
    expect(parseTimeOfDay("25:00")).toBeNull();
  });

  test("durations are rounded to whole minutes", () => {
    // 12:32:59 in the club's sheet is a 33-minute flight
    expect(parseDuration((32 * 60 + 59) / 86400)).toBe(33);
    expect(parseDuration("5723:41")).toBe(5723 * 60 + 41);
    expect(parseDuration("-00:11:00")).toBe(-11);
  });

  test("name keys ignore case, spaces and dots", () => {
    expect(nameKey("M. Meikäläinen")).toBe(nameKey("m.meikäläinen"));
    expect(nameKey("Keikäläinen Kalle")).toBe("keikäläinenkalle");
  });

  test("column letters", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(24)).toBe("Y");
    expect(columnLetter(27)).toBe("AB");
  });
});

describe("parseFlightSheet", () => {
  test("reads a flight row in club time", () => {
    const parsed = parseFlightSheet(sheet(flightRow({ 24: "abc", 26: "Tarkistettu" })));
    expect(parsed.errors).toEqual([]);
    expect(parsed.flights).toHaveLength(1);
    const flight = parsed.flights[0];
    expect(flight).toMatchObject({
      id: "abc",
      row: 3,
      flightDate: "2026-04-01",
      picName: "M. Meikäläinen",
      secondName: null,
      departure: "EFSA",
      // 18:42 Finnish summer time
      takeoffAt: "2026-04-01T15:42:00.000Z",
      landingAt: "2026-04-01T16:21:00.000Z",
      airborneMinutes: 39,
      landings: 5,
      purposeCode: "HAR",
      status: "Tarkistettu",
    });
  });

  test("keeps wall-clock times on the day summer time starts", () => {
    const parsed = parseFlightSheet(
      sheet(flightRow({ 0: SERIAL_2026_03_29, 6: time(10, 0), 7: time(11, 0), 8: time(1, 0) }))
    );
    // 10:00 EEST is 07:00 UTC; adding 600 minutes to midnight would give 11:00
    expect(parsed.flights[0].takeoffAt).toBe("2026-03-29T07:00:00.000Z");
    expect(parsed.flights[0].airborneMinutes).toBe(60);
  });

  test("a landing before the takeoff is after midnight", () => {
    const parsed = parseFlightSheet(
      sheet(flightRow({ 6: time(23, 30), 7: time(0, 20), 8: 0 }))
    );
    expect(parsed.flights[0].landingAt).toBe("2026-04-01T21:20:00.000Z");
    expect(parsed.flights[0].airborneMinutes).toBe(50);
  });

  test("skips formula-only rows and finds the first empty row", () => {
    const formulaRow = [null, null, null, null, null, null, null, null, 0, 0, null, 0, null];
    const parsed = parseFlightSheet(
      sheet(flightRow(), formulaRow as (string | number)[], flightRow({ 0: SERIAL_2026_04_01 + 1 }))
    );
    expect(parsed.flights.map((f) => f.row)).toEqual([3, 5]);
    expect(parsed.firstEmptyRow).toBe(4);
  });

  test("the first empty row is after the data when nothing is pre-filled", () => {
    const parsed = parseFlightSheet(sheet(flightRow(), flightRow()));
    expect(parsed.firstEmptyRow).toBe(5);
  });

  test("reports missing columns", () => {
    const values = sheet(flightRow());
    values[0] = HEADERS.filter((header) => header !== "ID");
    const parsed = parseFlightSheet(values);
    expect(parsed.flights).toEqual([]);
    expect(parsed.errors[0]).toContain("ID");
  });
});

describe("findFlightIssues", () => {
  const context = {
    purposes: new Map([
      ["HAR", { isTraining: false }],
      ["KOU", { isTraining: true }],
    ]),
    knownPilots: new Set([nameKey("M. Meikäläinen")]),
  };

  const issuesOf = (...rows: (string | number)[][]) =>
    findFlightIssues(parseFlightSheet(sheet(...rows)).flights, context).map(
      (issue) => `${issue.row}:${issue.kind}`
    );

  test("a clean flight has no issues", () => {
    expect(issuesOf(flightRow({ 24: "a" }))).toEqual([]);
  });

  test("unknown purpose and unknown pilots", () => {
    expect(issuesOf(flightRow({ 12: "XYZ" }))).toEqual(["3:unknown_purpose"]);
    expect(issuesOf(flightRow({ 1: "Uusi Lentäjä" }))).toEqual(["3:unknown_pilot"]);
    // The student of a dual training flight is checked too
    expect(issuesOf(flightRow({ 12: "KOU", 2: "Uusi Oppilas" }))).toEqual(["3:unknown_pilot"]);
  });

  test("a solo training flight has no student, and that is fine", () => {
    expect(issuesOf(flightRow({ 12: "KOU" }))).toEqual([]);
  });

  test("an unknown pilot is reported once", () => {
    expect(
      issuesOf(
        flightRow({ 1: "Uusi Lentäjä" }),
        flightRow({ 1: "Uusi Lentäjä", 6: time(20, 0), 7: time(20, 30) })
      )
    ).toEqual(["3:unknown_pilot"]);
  });

  test("duplicates, a copied ID and a meter going backwards", () => {
    expect(issuesOf(flightRow({ 24: "a" }), flightRow({ 24: "b" }))).toEqual([
      "4:duplicate",
    ]);
    expect(
      issuesOf(flightRow({ 24: "a" }), flightRow({ 24: "a", 6: time(20, 0), 7: time(20, 30) }))
    ).toEqual(["4:duplicate_id"]);
    expect(
      issuesOf(
        flightRow({ 15: 5910.3 }),
        flightRow({ 15: 5909.8, 6: time(20, 0), 7: time(20, 30) })
      )
    ).toEqual(["4:hour_meter"]);
  });

  test("an unknown billing status", () => {
    expect(issuesOf(flightRow({ 26: "Hyväksytty" }))).toEqual(["3:unknown_status"]);
  });
});
