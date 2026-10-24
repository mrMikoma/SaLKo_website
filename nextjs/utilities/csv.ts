/**
 * CSV for the accounting software, in Finnish Excel style: semicolons,
 * decimal commas, UTF-8 with a BOM.
 *
 * Text that starts like a formula (=, +, -, @, a tab or a carriage return)
 * gets a leading apostrophe, so a member's name such as "=HYPERLINK(…)"
 * stays text when the file is opened in Excel. Numbers and money amounts
 * are written as they are: "-5,00" is a credit, not a formula.
 */

// An amount already formatted for the file, written as is
export interface CsvMoney {
  money: string;
}
export type CsvValue = string | number | null | CsvMoney;

/** 1234 cents → "12,34" */
export const csvMoney = (cents: number): CsvMoney => ({
  money: (cents / 100).toFixed(2).replace(".", ","),
});

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  let text: string;
  if (value === null) text = "";
  else if (typeof value === "object") text = value.money;
  else if (typeof value === "number") text = String(value);
  else text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvBody = (rows: CsvValue[][]): string =>
  "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
