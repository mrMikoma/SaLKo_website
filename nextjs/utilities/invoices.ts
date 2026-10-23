import contacts from "@/data/contacts.json";
import prices from "@/data/prices.json";
import type { BillLine } from "@/utilities/billing";

/**
 * Invoices: the Finnish reference number and virtual bank barcode, the
 * club's details on an invoice, a billing period's flights as invoice lines,
 * and ready-made lines from the price list. Pure functions with unit tests;
 * invoiceData.ts and invoiceActions.ts do the database side.
 */

const digits = (text: string) => text.replace(/\D/g, "");

/**
 * A Finnish reference number (viitenumero): the base and a check digit, from
 * the base's digits weighted 7, 3, 1, 7, 3, 1… from the right
 */
export function referenceNumber(base: string | number): string {
  const text = String(base);
  if (!/^\d{3,19}$/.test(text)) {
    throw new Error(`A reference number's base is 3–19 digits, not "${text}"`);
  }
  const weights = [7, 3, 1];
  const sum = [...text].reverse().reduce((total, digit, i) => total + Number(digit) * weights[i % 3], 0);
  return text + ((10 - (sum % 10)) % 10);
}

export function isValidReference(reference: string): boolean {
  const text = digits(reference).replace(/^0+/, "");
  return text.length >= 4 && text.length <= 20 && referenceNumber(text.slice(0, -1)) === text;
}

/** In groups of five from the right, as banks print it: "2026 00013" */
export const formatReference = (reference: string) =>
  digits(reference).replace(/\B(?=(\d{5})+$)/g, " ");

/** An invoice number: the year and a running number, 2026 and 1 → 20260001 */
export const invoiceNumber = (year: number, running: number) => year * 10000 + running;

export function isValidIban(iban: string): boolean {
  const text = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(text)) return false;
  const rearranged = text.slice(4) + text.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
  return [...numeric].reduce((rest, digit) => (rest * 10 + Number(digit)) % 97, 0) === 1;
}

/** In groups of four: "FI51 4108 0011 8965 14" */
export const formatIban = (iban: string) =>
  iban.replace(/\s/g, "").toUpperCase().replace(/(.{4})(?=.)/g, "$1 ");

/**
 * The virtual bank barcode (virtuaaliviivakoodi), version 4, which members
 * paste into their bank app: the account, the amount, the reference and the
 * due date in 54 digits. Null for a non-Finnish account or an amount that
 * doesn't fit.
 */
export function virtualBarcode(input: {
  iban: string;
  cents: number;
  reference: string;
  dueDate: string | null; // "2026-11-06"
}): string | null {
  const account = input.iban.replace(/\s/g, "").toUpperCase();
  const reference = digits(input.reference);
  if (!/^FI\d{16}$/.test(account) || reference.length > 20) return null;
  if (!Number.isInteger(input.cents) || input.cents <= 0 || input.cents > 99_999_999) return null;
  const due = input.dueDate
    ? `${input.dueDate.slice(2, 4)}${input.dueDate.slice(5, 7)}${input.dueDate.slice(8, 10)}`
    : "000000";
  return (
    "4" +
    account.slice(2) +
    String(Math.floor(input.cents / 100)).padStart(6, "0") +
    String(input.cents % 100).padStart(2, "0") +
    "000" +
    reference.padStart(20, "0") +
    due
  );
}

export interface Issuer {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  businessId: string;
  iban: string;
  bic: string;
  bank: string;
}

/** The club as the invoice's sender, from data/contacts.json (Yhteystiedot) */
export const ISSUER: Issuer = {
  name: contacts.general.name,
  address: contacts.general.address,
  postalCode: contacts.general.postalCode,
  city: contacts.general.city,
  businessId: contacts.general.businessId,
  iban: contacts.general.IBAN,
  bic: contacts.general.BIC,
  bank: contacts.general.bank,
};

export interface InvoiceLineInput {
  source: "flight" | "other";
  lineDate: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitCents: number | null;
  amountCents: number;
}

/** A closed period's lines for one payer, as invoice lines */
export function flightInvoiceLines(lines: BillLine[]): InvoiceLineInput[] {
  return lines
    .filter((line) => line.kind !== "unbilled")
    .map((line) => ({
      source: "flight",
      lineDate: line.flightDate,
      description:
        line.kind === "flight"
          ? [line.registration, line.purposeCode, line.description].filter(Boolean).join(" ")
          : line.kind === "minimum"
            ? [line.registration, line.description].filter(Boolean).join(" ")
            : line.description,
      quantity: line.minutes,
      unit: "min",
      // A correction is a difference, not minutes × a price
      unitCents: line.kind === "adjustment" ? null : line.centsPerMinute,
      amountCents: line.amountCents,
    }));
}

/** "60", "60,5" or "1 234,00" € → cents; null if it isn't a sum of money */
export function parseEuros(text: string): number | null {
  const clean = text.replace(/[\s€]/g, "").replace(",", ".");
  if (!/^-?\d{1,6}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** "2" or "1,5" → a positive quantity with at most two decimals, or null */
export function parseQuantity(text: string): number | null {
  const clean = text.replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(clean) || Number(clean) <= 0) return null;
  return Number(clean);
}

export const lineAmount = (quantity: number, unitCents: number) => Math.round(quantity * unitCents);

/** 45 "min" → "45 min", 1.5 "h" → "1,5 h" */
export const formatQuantity = (quantity: number, unit: string) =>
  `${String(Number(quantity)).replace(".", ",")} ${unit}`;

export interface InvoicePreset {
  group: string;
  description: string;
  unit: string;
  unitCents: number;
}

// A price-list price in whole euros or with decimals; "-", "TBA" and "~1.67" aren't
const priceCents = (price: string) =>
  /^\d+([.,]\d{1,2})?$/.test(price.trim()) ? Math.round(Number(price.replace(",", ".")) * 100) : null;
const unitOf = (unit: string) => (unit.trim() === "€/h" ? "h" : "kpl");

/** Ready-made lines from the price list (data/prices.json); free items left out */
export function invoicePresets(): InvoicePreset[] {
  const presets: InvoicePreset[] = [];
  const add = (group: string, description: string, price: string, unit: string) => {
    const cents = priceCents(price);
    if (cents) presets.push({ group, description, unit: unitOf(unit), unitCents: cents });
  };
  for (const fee of prices.membershipFees) {
    add("Jäsenmaksut", `Jäsenmaksu, ${fee.type.toLowerCase()}`, fee.price, fee.unit);
  }
  for (const rate of prices.aircraftRentalRates) {
    if ("isEquipmentFee" in rate && rate.isEquipmentFee) add("Kalustomaksu", rate.category, rate.price, rate.unit);
  }
  for (const space of prices.hangarSpaces) {
    add("Hallipaikat", `Hallipaikka: ${space.type}`, space.price, space.unit);
  }
  for (const fee of [...prices.demonstrationFlights, ...prices.otherFees]) {
    add("Muut", fee.type, fee.price, fee.unit);
  }
  return presets;
}
