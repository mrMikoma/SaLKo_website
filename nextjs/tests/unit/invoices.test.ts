import { describe, expect, test } from "bun:test";
import {
  flightInvoiceLines,
  formatIban,
  formatQuantity,
  formatReference,
  invoiceNumber,
  invoicePresets,
  ISSUER,
  isValidIban,
  isValidReference,
  parseEuros,
  parseQuantity,
  referenceNumber,
  virtualBarcode,
} from "@/utilities/invoices";
import type { BillLine } from "@/utilities/billing";

describe("reference numbers", () => {
  test("get the 7-3-1 check digit, as in the banks' examples", () => {
    expect(referenceNumber("123")).toBe("1232");
    expect(referenceNumber(1234)).toBe("12344");
    expect(isValidReference("868516259619897")).toBe(true);
    expect(isValidReference("86851 62596 19897")).toBe(true);
    expect(isValidReference("868516259619898")).toBe(false);
  });

  test("an invoice's reference is its number and the check digit", () => {
    const number = invoiceNumber(2026, 13);
    expect(number).toBe(20260013);
    const reference = referenceNumber(number);
    expect(reference).toHaveLength(9);
    expect(reference.slice(0, 8)).toBe("20260013");
    expect(isValidReference(reference)).toBe(true);
    expect(formatReference(reference)).toBe(`${reference.slice(0, 4)} ${reference.slice(4)}`);
  });

  test("a base must be 3–19 digits", () => {
    expect(() => referenceNumber("12")).toThrow();
    expect(() => referenceNumber("12a4")).toThrow();
  });
});

describe("the account", () => {
  test("the club's IBAN on Yhteystiedot is valid and Finnish", () => {
    expect(isValidIban(ISSUER.iban)).toBe(true);
    expect(ISSUER.iban.replace(/\s/g, "")).toMatch(/^FI\d{16}$/);
    expect(isValidIban("FI51 4108 0011 8965 15")).toBe(false);
    expect(formatIban("fi5141080011896514")).toBe("FI51 4108 0011 8965 14");
  });

  test("the business ID has its check digit", () => {
    const [base, check] = ISSUER.businessId.split("-");
    const weights = [7, 9, 10, 5, 8, 4, 2];
    const rest = [...base].reduce((sum, digit, i) => sum + Number(digit) * weights[i], 0) % 11;
    expect(Number(check)).toBe(rest === 0 ? 0 : 11 - rest);
  });
});

describe("the virtual barcode", () => {
  test("matches the banks' published example", () => {
    // Pankkiviivakoodi-opas, version 4
    expect(
      virtualBarcode({
        iban: "FI79 4405 2020 0360 82",
        cents: 488315,
        reference: "86851 62596 19897",
        dueDate: "2010-06-12",
      })
    ).toBe("479440520200360820048831500000000868516259619897100612");
  });

  test("is 54 digits for an invoice; none for other accounts or amounts", () => {
    const code = virtualBarcode({ iban: ISSUER.iban, cents: 21700, reference: "202600137", dueDate: "2026-11-06" });
    expect(code).toMatch(/^4\d{53}$/);
    expect(code!.endsWith("261106")).toBe(true);
    expect(virtualBarcode({ iban: "DE89370400440532013000", cents: 100, reference: "1232", dueDate: null })).toBeNull();
    expect(virtualBarcode({ iban: ISSUER.iban, cents: 0, reference: "1232", dueDate: null })).toBeNull();
    expect(virtualBarcode({ iban: ISSUER.iban, cents: 100_000_000, reference: "1232", dueDate: null })).toBeNull();
  });
});

describe("lines", () => {
  const line = (extra: Partial<BillLine>): BillLine => ({
    kind: "flight",
    flightId: "f1",
    registration: "OH-CON",
    flightDate: "2026-10-03",
    purposeCode: "HAR",
    minutes: 20,
    landings: 2,
    centsPerMinute: 310,
    amountCents: 6200,
    description: "EFSA–EFSA 10:00–10:20",
    inputHash: "h",
    ...extra,
  });

  test("a period's flights keep their minutes, price and amount", () => {
    const lines = flightInvoiceLines([
      line({}),
      line({ kind: "minimum", minutes: 10, amountCents: 3100, description: "Minimilaskutus 30 min (lento 20 min)" }),
      line({ kind: "credit", minutes: -60, amountCents: -18600, description: "Hyvitys: vapaatunti, 60 min" }),
      line({ kind: "adjustment", minutes: 5, centsPerMinute: null, amountCents: 1550, description: "Korjaus: x" }),
      line({ kind: "unbilled", amountCents: 0 }),
    ]);
    expect(lines.map((l) => l.description)).toEqual([
      "OH-CON HAR EFSA–EFSA 10:00–10:20",
      "OH-CON Minimilaskutus 30 min (lento 20 min)",
      "Hyvitys: vapaatunti, 60 min",
      "Korjaus: x",
    ]);
    expect(lines[0]).toMatchObject({ source: "flight", quantity: 20, unit: "min", unitCents: 310, amountCents: 6200 });
    expect(lines[3].unitCents).toBeNull();
    expect(lines.reduce((sum, l) => sum + l.amountCents, 0)).toBe(6200 + 3100 - 18600 + 1550);
  });

  test("money and quantities are read the Finnish way", () => {
    expect(parseEuros("60")).toBe(6000);
    expect(parseEuros("3,10")).toBe(310);
    expect(parseEuros("1 234,5 €")).toBe(123450);
    expect(parseEuros("-25")).toBe(-2500);
    expect(parseEuros("1,234")).toBeNull();
    expect(parseEuros("abc")).toBeNull();
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("0")).toBeNull();
    expect(formatQuantity(1.5, "h")).toBe("1,5 h");
    expect(formatQuantity(45, "min")).toBe("45 min");
  });

  test("the price list gives ready-made lines with prices, leaving out free ones", () => {
    const presets = invoicePresets();
    expect(presets).toContainEqual({
      group: "Jäsenmaksut",
      description: "Jäsenmaksu, varsinainen jäsen",
      unit: "kpl",
      unitCents: 6000,
    });
    expect(presets.find((p) => p.group === "Kalustomaksu")?.unitCents).toBe(35000);
    expect(presets.some((p) => p.description.includes("Kunniajäsen"))).toBe(false);
    expect(presets.find((p) => p.description === "Kustannusjakoperusteinen lennätys")?.unit).toBe("h");
    expect(presets.every((p) => p.unitCents > 0)).toBe(true);
  });
});
