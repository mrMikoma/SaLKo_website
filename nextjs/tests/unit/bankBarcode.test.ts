import { describe, expect, test } from "bun:test";
import { bankBarcodeBars, bankBarcodeValues, bankBarcodeWidths, CODE128_PATTERNS } from "@/utilities/bankBarcode";
import { virtualBarcode } from "@/utilities/invoices";

// Finance Finland's Bank Bar Code Guide, 13.1 and 13.2: each test invoice's
// value pairs and check character
const GUIDE: { pairs: string; check: number }[] = [
  { pairs: "47 94 40 52 02 00 36 08 20 04 88 31 50 00 00 00 08 68 51 62 59 61 98 97 10 06 12", check: 40 },
  { pairs: "45 81 01 71 00 00 00 12 20 00 48 29 90 00 00 00 05 59 58 22 43 29 46 71 12 01 31", check: 55 },
  { pairs: "40 25 00 04 64 00 01 30 20 00 69 38 00 00 00 06 98 75 67 20 83 43 53 64 11 07 24", check: 14 },
  { pairs: "41 56 60 10 00 15 30 64 10 07 44 45 40 00 00 00 77 58 47 47 90 64 74 89 19 12 19", check: 63 },
  { pairs: "41 68 00 01 40 00 50 26 70 00 93 58 50 00 00 07 87 77 67 96 56 62 86 87 00 00 00", check: 30 },
  { pairs: "47 33 13 13 00 10 00 05 80 00 00 00 00 00 00 00 00 00 00 00 00 86 86 24 13 08 09", check: 68 },
  { pairs: "48 33 30 10 00 11 00 77 51 50 00 02 00 00 92 12 53 74 25 25 39 89 77 37 16 05 25", check: 45 },
  { pairs: "43 93 63 63 00 20 92 49 20 00 00 10 30 00 00 00 00 00 00 05 90 73 83 90 23 03 11", check: 9 },
  { pairs: "49 23 93 90 00 10 03 39 10 00 00 00 20 00 00 00 00 00 00 00 01 35 79 14 99 12 24", check: 30 },
  // Version 5 (RF references)
  { pairs: "57 94 40 52 02 00 36 08 20 04 88 31 50 90 00 00 08 68 51 62 59 61 98 97 10 06 12", check: 74 },
  { pairs: "51 68 00 01 40 00 50 26 70 00 93 58 56 00 00 07 87 77 67 96 56 62 86 87 00 00 00", check: 15 },
];

describe("the bank barcode", () => {
  test("every Code 128 pattern is 11 modules, three bars and three spaces", () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    for (const pattern of CODE128_PATTERNS) {
      expect(pattern).toMatch(/^[1-4]{6}$/);
      expect([...pattern].reduce((sum, width) => sum + Number(width), 0)).toBe(11);
    }
  });

  test("the guide's test invoices: Start C, the pairs, the check character, Stop", () => {
    for (const { pairs, check } of GUIDE) {
      const values = pairs.split(" ").map(Number);
      expect(bankBarcodeValues(pairs.replace(/ /g, ""))).toEqual([105, ...values, check, 106]);
    }
  });

  test("the virtual barcode of the guide's invoices gives the same digits", () => {
    const digits = virtualBarcode({
      iban: "FI79 4405 2020 0360 82",
      cents: 488315,
      reference: "86851 62596 19897",
      dueDate: "2010-06-12",
    });
    expect(digits).toBe(GUIDE[0].pairs.replace(/ /g, ""));
    // No due date: zeros
    expect(
      virtualBarcode({ iban: "FI16 8000 1400 0502 67", cents: 93585, reference: "78 77767 96566 28687", dueDate: null })
    ).toBe(GUIDE[4].pairs.replace(/ /g, ""));
  });

  test("332 modules: 29 symbols of 11 and the 13-module stop; bars and spaces alternate", () => {
    const widths = bankBarcodeWidths(GUIDE[0].pairs.replace(/ /g, ""))!;
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(332);
    // Start Code C is 211232, the stop ends 2331112
    expect(widths.slice(0, 6)).toEqual([2, 1, 1, 2, 3, 2]);
    expect(widths.slice(-7)).toEqual([2, 3, 3, 1, 1, 1, 2]);
    const { bars, modules } = bankBarcodeBars(GUIDE[0].pairs.replace(/ /g, ""))!;
    expect(modules).toBe(332);
    expect(bars).toHaveLength(Math.ceil(widths.length / 2));
    expect(bars[0]).toEqual({ x: 0, width: 2 });
    expect(bars.at(-1)).toEqual({ x: 330, width: 2 });
  });

  test("anything but 54 digits of version 4 or 5 has no barcode", () => {
    expect(bankBarcodeValues("4".repeat(53))).toBeNull();
    expect(bankBarcodeValues(`2${"0".repeat(53)}`)).toBeNull();
    expect(bankBarcodeValues(`4${"0".repeat(52)}x`)).toBeNull();
    expect(bankBarcodeBars("")).toBeNull();
  });
});
