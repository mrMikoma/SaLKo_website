import { describe, expect, test } from "bun:test";
import { csvBody, csvCell, csvMoney } from "@/utilities/csv";

describe("CSV for the accounting software", () => {
  test("text that starts like a formula stays text", () => {
    expect(csvCell('=HYPERLINK("https://example.invalid";"x")')).toBe(
      `"'=HYPERLINK(""https://example.invalid"";""x"")"`
    );
    expect(csvCell("+358 40 123")).toBe("'+358 40 123");
    expect(csvCell("-merkki")).toBe("'-merkki");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("\tx")).toBe("'\tx");
  });

  test("numbers and money are written as they are, negative ones too", () => {
    expect(csvCell(-20)).toBe("-20");
    expect(csvCell(csvMoney(-500))).toBe("-5,00");
    expect(csvCell(csvMoney(21700))).toBe("217,00");
  });

  test("semicolons, quotes and line breaks are quoted; empty is empty", () => {
    expect(csvCell("Meikäläinen; Matti")).toBe('"Meikäläinen; Matti"');
    expect(csvCell(null)).toBe("");
    expect(csvBody([["a", 1], [null, csvMoney(5)]])).toBe("﻿a;1\r\n;0,05\r\n");
  });
});
