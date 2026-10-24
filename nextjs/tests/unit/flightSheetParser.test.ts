import { describe, expect, test } from "bun:test";
import {
  columnLetter,
  findFlightIssues,
  findUndatedRowIssues,
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
// IDs are UUIDs; anything else is replaced by the sync
const ID_A = "0000000a-0000-4000-8000-000000000000";
const ID_B = "0000000b-0000-4000-8000-000000000000";

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
    expect(parseSheetDate("2026-04-01")).toBe("2026-04-01");
    expect(parseSheetDate("")).toBeNull();
    // Text Sheets didn't take as a date isn't one: no guessing
    for (const text of ["14.6.25", "14.6.", "31.6.2026", "14/6/2026", "siirto", "2025"]) {
      expect(parseSheetDate(text)).toBeNull();
    }
  });

  test("times of day", () => {
    expect(parseTimeOfDay(time(18, 42))).toBe(18 * 60 + 42);
    expect(parseTimeOfDay(SERIAL_2026_04_01 + time(9, 5))).toBe(9 * 60 + 5);
    expect(parseTimeOfDay("14.05")).toBe(14 * 60 + 5);
    expect(parseTimeOfDay("25:00")).toBeNull();
    // "14,05" typed into a Finnish sheet is the number 14.05, not 01:12
    expect(parseTimeOfDay(14.05)).toBeNull();
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
    const parsed = parseFlightSheet(sheet(flightRow({ 24: ID_A, 26: "Tarkistettu" })));
    expect(parsed.errors).toEqual([]);
    expect(parsed.flights).toHaveLength(1);
    const flight = parsed.flights[0];
    expect(flight).toMatchObject({
      id: ID_A,
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

  test("past midnight the club's formula goes negative; the times give the minutes", () => {
    // =IF(H-G=0;;H-G) for 23:40 → 00:20 is -23:20
    const parsed = parseFlightSheet(
      sheet(flightRow({ 6: time(23, 40), 7: time(0, 20), 8: time(0, 20) - time(23, 40) }))
    );
    expect(parsed.flights[0].sheetAirborneMinutes).toBe(-1400);
    expect(parsed.flights[0].airborneMinutes).toBe(40);
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
    expect(issuesOf(flightRow({ 24: ID_A }))).toEqual([]);
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
        flightRow({ 1: "Uusi Lentäjä", 6: time(20, 0), 7: time(20, 30), 8: time(0, 30) })
      )
    ).toEqual(["3:unknown_pilot"]);
  });

  test("duplicates, a copied ID and a meter going backwards", () => {
    expect(issuesOf(flightRow({ 24: ID_A }), flightRow({ 24: ID_B }))).toEqual([
      "4:duplicate",
    ]);
    expect(
      issuesOf(flightRow({ 24: ID_A }), flightRow({ 24: ID_A, 6: time(20, 0), 7: time(20, 30), 8: time(0, 30) }))
    ).toEqual(["4:duplicate_id"]);
    expect(
      issuesOf(
        flightRow({ 15: 5910.3 }),
        flightRow({ 15: 5909.8, 6: time(20, 0), 7: time(20, 30), 8: time(0, 30) })
      )
    ).toEqual(["4:hour_meter"]);
  });

  test("an unknown billing status", () => {
    expect(issuesOf(flightRow({ 26: "Hyväksytty" }))).toEqual(["3:unknown_status"]);
  });

  test("cells that don't hold what their column should are read as empty and reported", () => {
    const parsed = parseFlightSheet(
      sheet(
        flightRow({
          24: "not-an-id",
          // "1.5" in Öljy and a date in Henkilömäärä, as Sheets turns them
          14: 46143,
          3: 46024,
          6: 14.05,
        })
      )
    );
    const flight = parsed.flights[0];
    expect(flight).toMatchObject({ id: null, oilQuarts: null, personsOnBoard: null, takeoffAt: null });
    const messages = findFlightIssues(parsed.flights, context)
      .filter((issue) => issue.kind === "bad_value")
      .map((issue) => issue.message);
    expect(messages).toHaveLength(4);
    expect(messages.join("\n")).toContain('Lentoonlähtöaika "14.05" ei kelpaa: kirjoita kellonaika muodossa 14:05');
  });

  test("dates in the future, before 2000, or a year before the row above", () => {
    const issuesWithToday = (...rows: (string | number)[][]) =>
      findFlightIssues(parseFlightSheet(sheet(...rows)).flights, { ...context, today: "2026-04-01" }).map(
        (issue) => `${issue.row}:${issue.kind}`
      );
    expect(issuesWithToday(flightRow({ 0: SERIAL_2026_04_01 + 1 }))).toEqual(["3:odd_date"]);
    expect(issuesWithToday(flightRow({ 0: 2025 }))).toEqual(["3:odd_date"]);
    // 2015 typed for 2025 between two flights of this spring
    expect(
      issuesWithToday(
        flightRow({ 6: time(9, 0), 7: time(9, 30), 8: time(0, 30) }),
        flightRow({ 0: SERIAL_2026_04_01 - 3653 }),
        flightRow({ 6: time(20, 0), 7: time(20, 30), 8: time(0, 30) })
      )
    ).toEqual(["4:odd_date"]);
  });

  test("an airborne time typed by hand that doesn't match the times", () => {
    expect(issuesOf(flightRow({ 8: time(1, 0) }))).toEqual(["3:airborne_mismatch"]);
  });

  test("past midnight with the formula's negative time: type it in by hand", () => {
    const negative = flightRow({ 6: time(23, 40), 7: time(0, 20), 8: time(0, 20) - time(23, 40) });
    expect(issuesOf(negative)).toEqual(["3:midnight"]);
    const message = findFlightIssues(parseFlightSheet(sheet(negative)).flights, context)[0].message;
    expect(message).toContain("0:40");
    // Typed in by hand, as the club does
    expect(issuesOf(flightRow({ 6: time(23, 40), 7: time(0, 20), 8: time(0, 40) }))).toEqual([]);
  });
});

describe("rows that aren't read as flights", () => {
  const formulaRow = (overrides: Record<number, string | number> = {}) => {
    const row: (string | number)[] = ["", "", "", "", "", "", "", "", 0, 0, "", 0];
    for (const [index, value] of Object.entries(overrides)) row[Number(index)] = value;
    return row;
  };

  test("a typed row whose date can't be read is reported, with its ID", () => {
    const parsed = parseFlightSheet(
      sheet(flightRow(), formulaRow({ 0: "14.6.25", 1: "M.Meikäläinen", 24: ID_A }), formulaRow({ 1: "K.Keikäläinen" }))
    );
    expect(parsed.flights).toHaveLength(1);
    expect(parsed.undatedRows).toEqual([
      { row: 4, id: ID_A, date: "14.6.25", typed: true },
      { row: 5, id: null, date: "", typed: true },
    ]);
    const messages = findUndatedRowIssues(parsed.undatedRows).map((issue) => issue.message);
    expect(messages[0]).toContain('Päivämäärää "14.6.25" ei voi lukea');
    expect(messages[0]).toContain("edellinen versio pidetään");
    expect(messages[1]).toContain("ei päivämäärää");
  });

  test("Tila filled down past the last flight is one issue per run of rows", () => {
    const parsed = parseFlightSheet(
      sheet(
        flightRow(),
        formulaRow({ 26: "Laskutettu" }),
        formulaRow({ 26: "Laskutettu" }),
        formulaRow({ 26: "Laskutettu" }),
        formulaRow(),
        formulaRow({ 27: "Kevät 2026" })
      )
    );
    const issues = findUndatedRowIssues(parsed.undatedRows);
    expect(issues.map((issue) => `${issue.row}:${issue.kind}`)).toEqual(["4:stray_status", "8:stray_status"]);
    expect(issues[0].message).toContain("Riveillä 4–6");
    expect(issues[1].message).toContain("Rivillä 8");
  });

  test("formula rows and a lone page number are not reported", () => {
    const parsed = parseFlightSheet(sheet(flightRow(), formulaRow(), formulaRow({ 17: 412 })));
    expect(parsed.undatedRows).toEqual([]);
  });
});
