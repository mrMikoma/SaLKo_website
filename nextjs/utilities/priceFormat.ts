/**
 * The club's price list (price_items): its sections and how prices read.
 * Pure, for the public pages, the admin editor and the invoice presets.
 */

export type PriceSection = "membership" | "equipment" | "demo" | "hangar" | "other" | "training" | "note";

export const PRICE_SECTIONS: { key: PriceSection; label: string }[] = [
  { key: "membership", label: "Jäsenmaksut" },
  { key: "equipment", label: "Kalustomaksu" },
  { key: "demo", label: "Esittelylennot" },
  { key: "hangar", label: "Hallipaikat" },
  { key: "other", label: "Muut maksut" },
  { key: "training", label: "Koulutukset" },
  { key: "note", label: "Huomiot" },
];

export interface PriceItem {
  id: number;
  section: PriceSection;
  code: string | null; // courses: PPL, LAPL… as /koulutus asks for them
  name: string; // a note's text, for section "note"
  description: string;
  priceCents: number | null; // null: no price yet
  unit: string; // "€", "€/vuosi", "€/h"
  note: string;
  sortOrder: number;
  active: boolean;
}

// An aircraft's price today, from aircraft_rates
export interface AircraftPrice {
  registration: string;
  model: string | null;
  centsPerHourWithFee: number;
  centsPerHourWithoutFee: number;
  minimumLocalMinutes: number;
  // The free hour, when billing gives it on this aircraft
  freeHour: { paidMinutes: number; freeMinutes: number } | null;
}

export interface PriceList {
  validFrom: string | null; // YYYY-MM-DD
  items: PriceItem[];
  aircraft: AircraftPrice[];
}

/** 6000 → "60", 1050 → "10,50", 900000 → "9 000" (Finnish, a no-break space) */
export function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fi-FI", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A price with its unit, "60 €/vuosi", or `missing` when there's none yet */
export function formatPrice(item: Pick<PriceItem, "priceCents" | "unit">, missing = "Kysy hintaa"): string {
  if (item.priceCents === null) return missing;
  const unit = item.unit.trim();
  return unit ? `${formatEuros(item.priceCents)} ${unit}` : formatEuros(item.priceCents);
}

/** An aircraft's hourly price per minute: "3,10", or "≈ 1,67" when not whole cents */
export function minutePrice(centsPerHour: number): string {
  const text = (centsPerHour / 6000).toFixed(2).replace(".", ",");
  return centsPerHour % 60 === 0 ? text : `≈ ${text}`;
}

/** "60", "60,50", "1 234,5" or "" (no price) → cents, null; undefined if not a price */
export function parsePriceInput(text: string): number | null | undefined {
  const clean = text.replace(/[\s€]/g, "").replace(",", ".");
  if (clean === "") return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 100);
}

export const itemsIn = (list: Pick<PriceList, "items">, section: PriceSection): PriceItem[] =>
  list.items.filter((item) => item.section === section);

/** "Voimassa 18.3.2026 alkaen" style date */
export const finnishDate = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return `${day}.${month}.${year}`;
};
