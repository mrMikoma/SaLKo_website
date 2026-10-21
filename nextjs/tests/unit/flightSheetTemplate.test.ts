import { describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import path from "path";
import { crc32, inflateRawSync } from "zlib";
import {
  findWritableRows,
  parseFlightSheet,
  SHEET_COLUMNS,
  SheetValues,
} from "@/utilities/flightSheetParser";
import {
  buildFlightLogTab,
  buildFlightSheetTemplate,
  TEMPLATE_PURPOSES,
} from "@/utilities/flightSheetTemplate";
import { writeXlsx } from "@/utilities/xlsx";

// What the Sheets API would return for the empty template
const tab = buildFlightLogTab("OH-CON Matkapäiväkirja", 20);
const values = tab.rows.map((row) =>
  row.map((cell) => (cell.formula ? "" : (cell.value ?? "")))
) as SheetValues;

// The files in a zip archive, checked against their CRCs
function unzip(archive: Buffer): Map<string, string> {
  const files = new Map<string, string>();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const crc = archive.readUInt32LE(offset + 14);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const name = archive.toString("utf8", offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength;
    const data = inflateRawSync(archive.subarray(start, start + size));
    expect(crc32(data)).toBe(crc);
    files.set(name, data.toString("utf8"));
    offset = start + size;
  }
  return files;
}

describe("the empty flight log template", () => {
  test("has every column the website reads, and parses without errors", () => {
    const parsed = parseFlightSheet(values, 3);
    expect(parsed.errors).toEqual([]);
    expect(parsed.flights).toEqual([]);
    for (const key of Object.keys(SHEET_COLUMNS)) {
      expect(parsed.columns).toHaveProperty(key);
    }
  });

  test("every row from 3 on is ready for a flight", () => {
    const parsed = parseFlightSheet(values, 3);
    const airborne = parsed.columns.airborne!;
    // What the Sheets API returns for the column with FORMULA rendering
    const formulas = tab.rows.map((row) => (row[airborne].formula ? `=${row[airborne].formula}` : ""));
    expect(findWritableRows(values, parsed, formulas, 3)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 3)
    );
  });

  test("the club's formulas, row by row", () => {
    const row5 = tab.rows[4];
    expect(row5[8].formula).toBe("IF(H5-G5=0,,H5-G5)");
    expect(row5[9].formula).toBe("IF(J4+I5=J4,,J4+I5)");
    expect(row5[11].formula).toBe("IF(L4+K5=L4,,L4+K5)");
    expect(row5[22].formula).toBe('IF(A5="","",MONTH(A5))');
  });

  test("purpose codes are the ones in the database", () => {
    const schema = readFileSync(
      path.resolve(import.meta.dir, "../../../postgres/init/01-schema.sql"),
      "utf8"
    );
    const seed = schema.slice(schema.indexOf("INSERT INTO flight_purposes"));
    const codes = [...seed.slice(0, seed.indexOf(";")).matchAll(/\('([A-Z]+)', '([^']+)'/g)];
    expect(TEMPLATE_PURPOSES).toEqual(codes.map((m) => [m[1], m[2]]));
  });

  test("writes an .xlsx that unzips into a workbook with both tabs", () => {
    const files = unzip(writeXlsx(buildFlightSheetTemplate()));
    expect([...files.keys()]).toContain("xl/worksheets/sheet2.xml");
    expect(files.get("xl/workbook.xml")).toContain('<sheet name="OH-CON Matkapäiväkirja"');
    expect(files.get("xl/workbook.xml")).toContain('<sheet name="Ohje"');
    const sheet = files.get("xl/worksheets/sheet1.xml")!;
    expect(sheet).toContain("<f>IF(H1002-G1002=0,,H1002-G1002)</f>");
    expect(sheet).toContain('state="frozen"');
    expect(sheet).toContain("&quot;Korjattava,Tarkistettu,Laskutettu,Ei laskuteta,Maksettu&quot;");
  });
});
