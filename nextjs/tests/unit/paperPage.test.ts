import { describe, expect, test } from "bun:test";
import {
  emptyPaperCells,
  ExistingFlight,
  matchPaperRows,
  PaperCells,
  PaperRow,
  paperTotals,
  parseHoursMinutes,
  parsePaperDate,
  readPaperGrid,
} from "@/utilities/paperPage";

const line = (cells: Partial<PaperCells>): PaperCells => ({ ...emptyPaperCells(), ...cells });
const TODAY = "2026-10-21";

const paper = (row: Partial<PaperRow>): PaperRow => ({
  flightDate: "2026-06-14", picName: "M.Meikäläinen", secondName: null, personsOnBoard: 1,
  departure: "EFSA", arrival: "EFSA", takeoff: "10:05", landing: "10:45", landings: 1,
  purposeCode: "HAR", remarks: null, ...row,
});
const inSheet = (id: string, row: Partial<PaperRow>): ExistingFlight => ({
  ...paper(row), id, sheetRow: 40, source: "web", status: null, inputHash: "h",
});

describe("reading a paper page", () => {
  test("dates as the book has them", () => {
    expect(parsePaperDate("14.6.2025", null)).toBe("2025-06-14");
    expect(parsePaperDate("14.6.25", null)).toBe("2025-06-14");
    expect(parsePaperDate("1.7.", "2025-06-30")).toBe("2025-07-01");
    expect(parsePaperDate("2025-06-14", null)).toBe("2025-06-14");
    expect(parsePaperDate("31.2.2025", null)).toBeNull();
    expect(parsePaperDate("kesäkuu", null)).toBeNull();
  });

  test("an empty date or a ditto mark repeats the line above", () => {
    const read = readPaperGrid(
      [
        line({ date: "14.6.2025", pic: "M.Meikäläinen", departure: "efsa", arrival: "EFJO", takeoff: "1005", landing: "10.45", purpose: "mat" }),
        line({ pic: '"', departure: "EFJO", arrival: "EFSA", takeoff: "11.10", landing: "11.50", purpose: "〃" }),
        line({}),
        line({ date: '"', pic: "K.Keikäläinen", departure: "EFSA", arrival: "EFSA", takeoff: "13:00", landing: "13:30", landings: "3", purpose: "HAR" }),
      ],
      TODAY
    );
    expect(read.map((r) => r.index)).toEqual([0, 1, 3]);
    expect(read.every((r) => r.errors.length === 0)).toBe(true);
    expect(read[0].row).toMatchObject({ departure: "EFSA", takeoff: "10:05", purposeCode: "MAT", landings: 1 });
    expect(read[1].row).toMatchObject({ flightDate: "2025-06-14", picName: "M.Meikäläinen", purposeCode: "MAT" });
    expect(read[2].row).toMatchObject({ flightDate: "2025-06-14", landings: 3 });
  });

  test("lines with mistakes say what is wrong", () => {
    const [read] = readPaperGrid(
      [line({ date: "1.1.2099", takeoff: "25.00", landing: "10.00", departure: "EFSA", arrival: "EFSA", purpose: "HAR" })],
      TODAY
    );
    expect(read.row).toBeNull();
    expect(read.errors).toContain("Päivä on tulevaisuudessa");
    expect(read.errors).toContain("Päällikkö puuttuu");
    expect(read.errors).toContain("Anna lähtö- ja laskuaika, esim. 14.05");
  });

  test("page totals", () => {
    expect(paperTotals([paper({}), null, paper({ takeoff: "11:00", landing: "11:30", landings: 4 })])).toEqual({
      minutes: 70,
      landings: 5,
    });
    expect(parseHoursMinutes("1:10")).toBe(70);
    expect(parseHoursMinutes("12.05")).toBe(725);
    expect(parseHoursMinutes("1:75")).toBeNull();
  });
});

describe("matching the page with the sheet", () => {
  test("a pilot's own entry is the same flight, even written differently", () => {
    const [match] = matchPaperRows(
      [paper({ picName: "M. Meikäläinen" })],
      [inSheet("a", { picName: "M.Meikäläinen" })]
    );
    expect(match).toMatchObject({ kind: "same", flight: { id: "a" } });
  });

  test("a close takeoff with other details is the same flight, with differences", () => {
    const [match] = matchPaperRows(
      [paper({ takeoff: "10:07", landing: "10:47" })],
      [inSheet("a", {})]
    );
    expect(match.kind).toBe("differs");
    if (match.kind === "differs") {
      expect(match.differences).toEqual(["lähtö 10:05 → 10:07", "lasku 10:45 → 10:47"]);
    }
  });

  test("another day, or a takeoff far apart, is a new flight; each sheet row is used once", () => {
    const matches = matchPaperRows(
      [paper({}), paper({ takeoff: "10:06" }), paper({ flightDate: "2026-06-15" }), paper({ takeoff: "14:00", landing: "14:30" })],
      [inSheet("a", {})]
    );
    expect(matches.map((m) => m.kind)).toEqual(["same", "new", "new", "new"]);
  });
});
