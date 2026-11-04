import "server-only";

import connectionPool from "@/utilities/db";
import planes from "@/data/planes.json";
import { DEFAULT_FREE_HOUR } from "@/utilities/billingData";
import type { FreeHourSettings } from "@/utilities/billing";
import type { AircraftPrice, PriceItem, PriceList, PriceSection } from "@/utilities/priceFormat";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "price-list" });

const day = (value: Date | string) =>
  value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value).slice(0, 10);

const toItem = (row: Record<string, unknown>): PriceItem => ({
  id: row.id as number,
  section: row.section as PriceSection,
  code: (row.code as string) ?? null,
  name: row.name as string,
  description: row.description as string,
  priceCents: (row.price_cents as number) ?? null,
  unit: row.unit as string,
  note: row.note as string,
  sortOrder: row.sort_order as number,
  active: row.active as boolean,
});

const EMPTY: PriceList = { validFrom: null, items: [], aircraft: [] };

/**
 * The price list as the public pages show it: the shown items, and each
 * active aircraft's price today with its minimum and free hour. Hidden
 * items too for the editor (`includeHidden`). An empty list without a
 * database, or when it fails: the pages then show no prices rather than an
 * error.
 */
export async function getPriceList(options: { includeHidden?: boolean } = {}): Promise<PriceList> {
  if (!connectionPool) return EMPTY;
  try {
    const [items, aircraft, settings] = await Promise.all([
      connectionPool.query(
        `SELECT id, section, code, name, description, price_cents, unit, note, sort_order, active
         FROM price_items ${options.includeHidden ? "" : "WHERE active"}
         ORDER BY sort_order, id`
      ),
      connectionPool.query(
        `SELECT a.registration, r.cents_per_hour_with_fee, r.cents_per_hour_without_fee,
                r.minimum_local_minutes
         FROM aircraft_sheets a
         JOIN LATERAL (
           SELECT * FROM aircraft_rates
           WHERE registration = a.registration AND valid_from <= CURRENT_DATE
           ORDER BY valid_from DESC LIMIT 1
         ) r ON TRUE
         WHERE a.active
         ORDER BY a.sort_order, a.registration`
      ),
      connectionPool.query(
        "SELECT key, value FROM flight_log_settings WHERE key IN ('free_hour', 'price_list_valid_from')"
      ),
    ]);
    const setting = new Map(settings.rows.map((row) => [row.key as string, row.value]));
    const freeHour: FreeHourSettings = { ...DEFAULT_FREE_HOUR, ...(setting.get("free_hour") ?? {}) };
    return {
      validFrom: typeof setting.get("price_list_valid_from") === "string" ? setting.get("price_list_valid_from") : null,
      items: items.rows.map(toItem),
      aircraft: aircraft.rows.map(
        (row): AircraftPrice => ({
          registration: row.registration,
          model: planes.find((plane) => plane.registeration === row.registration)?.name ?? null,
          centsPerHourWithFee: row.cents_per_hour_with_fee,
          centsPerHourWithoutFee: row.cents_per_hour_without_fee,
          minimumLocalMinutes: row.minimum_local_minutes,
          freeHour:
            freeHour.enabled && freeHour.aircraft.includes(row.registration)
              ? { paidMinutes: freeHour.paidMinutes, freeMinutes: freeHour.freeMinutes }
              : null,
        })
      ),
    };
  } catch (error) {
    log.error("Reading the price list failed", { err: error });
    return EMPTY;
  }
}

export interface AircraftRateRow {
  registration: string;
  validFrom: string;
  centsPerHourWithFee: number;
  centsPerHourWithoutFee: number;
  minimumLocalMinutes: number;
}

/** Every aircraft price with its start date, and the aircraft to price, for the editor */
export async function getAircraftRates(): Promise<{ aircraft: string[]; rates: AircraftRateRow[] }> {
  const [aircraft, rates] = await Promise.all([
    connectionPool.query("SELECT registration FROM aircraft_sheets WHERE active ORDER BY sort_order, registration"),
    connectionPool.query(
      `SELECT registration, valid_from, cents_per_hour_with_fee, cents_per_hour_without_fee,
              minimum_local_minutes
       FROM aircraft_rates ORDER BY registration, valid_from`
    ),
  ]);
  return {
    aircraft: aircraft.rows.map((row) => row.registration as string),
    rates: rates.rows.map((row) => ({
      registration: row.registration,
      validFrom: day(row.valid_from),
      centsPerHourWithFee: row.cents_per_hour_with_fee,
      centsPerHourWithoutFee: row.cents_per_hour_without_fee,
      minimumLocalMinutes: row.minimum_local_minutes,
    })),
  };
}
