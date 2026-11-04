"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import pool from "@/utilities/db";
import { hasPermission } from "@/utilities/roles";
import { parsePriceInput } from "@/utilities/priceFormat";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "price-list" });

type ActionResult<T = null> = { status: "success"; result: T } | { status: "error"; error: string };

/**
 * The price list is edited by admins and the treasurer. Unlike billing it is
 * on in production too, since the public price page reads it.
 */
async function requirePriceAdmin() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_PRICES")) {
    return { error: "Ei oikeuksia hinnastoon" };
  }
  return { user: session.user };
}

// Every page that shows a price from the list
const revalidatePrices = () => {
  for (const path of ["/kerho/hinnasto", "/kerho/jasenyys", "/kerho/hallit", "/koulutus", "/admin/hinnasto"]) {
    revalidatePath(path);
  }
  revalidatePath("/admin/laskut", "layout");
  revalidatePath("/admin/laskutus", "layout");
  revalidatePath("/jasenalue/lentopaivakirja/uusi");
};

async function saving<T>(what: string, work: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const result = await work();
    if (result.status === "success") revalidatePrices();
    return result;
  } catch (error) {
    log.error("Saving the price list failed", { err: error, what });
    return { status: "error", error: "Tallennus epäonnistui" };
  }
}

const SECTIONS = ["membership", "equipment", "demo", "hangar", "other", "training", "note"] as const;

const itemSchema = z
  .object({
    id: z.number().int().positive().nullable(),
    section: z.enum(SECTIONS),
    name: z.string().trim().min(1, "Anna nimi").max(1000, "Teksti on liian pitkä"),
    description: z.string().trim().max(1000, "Kuvaus on liian pitkä"),
    price: z.string().max(20),
    unit: z.string().trim().max(20, "Yksikkö on liian pitkä"),
    note: z.string().trim().max(200, "Lisätieto on liian pitkä"),
    active: z.boolean(),
  })
  .transform((item, ctx) => {
    const priceCents = parsePriceInput(item.price);
    if (priceCents === undefined) {
      ctx.addIssue({ code: "custom", message: "Anna hinta euroina, esim. 60 tai 12,50 (tyhjä: ei hintaa)" });
      return z.NEVER;
    }
    return { ...item, priceCents };
  });

/** Adds an item to the end of its section, or saves an existing one */
export async function savePriceItem(input: z.input<typeof itemSchema>): Promise<ActionResult<{ id: number }>> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const item = parsed.data;
  const values = [item.name, item.description, item.priceCents, item.unit, item.note, item.active, access.user.id];
  return saving<{ id: number }>("item", async () => {
    if (item.id === null) {
      const response = await pool.query(
        `INSERT INTO price_items (name, description, price_cents, unit, note, active, updated_by, section, sort_order)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, coalesce(max(sort_order), 0) + 10
         FROM price_items WHERE section = $8
         RETURNING id`,
        [...values, item.section]
      );
      return { status: "success", result: { id: response.rows[0].id } };
    }
    const response = await pool.query(
      `UPDATE price_items
       SET name = $1, description = $2, price_cents = $3, unit = $4, note = $5, active = $6,
           updated_by = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING id`,
      [...values, item.id]
    );
    if (response.rowCount === 0) return { status: "error", error: "Riviä ei löytynyt. Päivitä sivu." };
    return { status: "success", result: { id: item.id } };
  });
}

export async function deletePriceItem(id: number): Promise<ActionResult> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Virheellinen pyyntö" };
  return saving("delete", async () => {
    // A course's code is what /koulutus asks for: hide it instead
    const response = await pool.query("DELETE FROM price_items WHERE id = $1 AND code IS NULL", [id]);
    if (response.rowCount === 0) {
      return { status: "error", error: "Koulutuksen hintaa ei poisteta, koska Koulutus-sivu käyttää sitä. Piilota se." };
    }
    return { status: "success", result: null };
  });
}

/** Moves an item one place up or down within its section */
export async function movePriceItem(id: number, direction: "up" | "down"): Promise<ActionResult> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id) || (direction !== "up" && direction !== "down")) {
    return { status: "error", error: "Virheellinen pyyntö" };
  }
  return saving("move", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const rows = await client.query(
        `SELECT id, sort_order FROM price_items
         WHERE section = (SELECT section FROM price_items WHERE id = $1)
         ORDER BY sort_order, id FOR UPDATE`,
        [id]
      );
      const order = rows.rows.map((row) => row.id as number);
      const at = order.indexOf(id);
      const to = direction === "up" ? at - 1 : at + 1;
      if (at !== -1 && to >= 0 && to < order.length) {
        [order[at], order[to]] = [order[to], order[at]];
        // Renumber the section in steps of ten, so equal numbers never tie
        await client.query(
          `UPDATE price_items p SET sort_order = n.position * 10
           FROM unnest($1::int[]) WITH ORDINALITY AS n(id, position)
           WHERE p.id = n.id`,
          [order]
        );
      }
      await client.query("COMMIT");
      return { status: "success", result: null };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });
}

const validFromSchema = z.iso.date("Anna päivä, josta hinnasto on voimassa");

export async function savePriceListValidFrom(date: string): Promise<ActionResult> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = validFromSchema.safeParse(date);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  return saving("valid_from", async () => {
    await pool.query(
      `INSERT INTO flight_log_settings (key, value, updated_by) VALUES ('price_list_valid_from', $1::jsonb, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(parsed.data), access.user.id]
    );
    return { status: "success", result: null };
  });
}

/*
 * Aircraft prices (aircraft_rates), which billing uses too
 */

// "186" or "186,50" € an hour → 18 650 cents
const hourlyPriceField = z
  .string()
  .trim()
  .regex(/^\d{1,4}([.,]\d{1,2})?$/, "Anna tuntihinta euroina, esim. 186,00")
  .transform((value) => Math.round(Number(value.replace(",", ".")) * 100));

const rateSchema = z.object({
  registration: z.string().trim().min(1).max(20),
  validFrom: z.iso.date("Anna päivä, josta alkaen hinta on voimassa"),
  withFee: hourlyPriceField,
  withoutFee: hourlyPriceField,
  minimumLocalMinutes: z.number().int().min(0).max(120),
});

export async function saveAircraftRate(input: z.input<typeof rateSchema>): Promise<ActionResult> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { registration, validFrom, withFee, withoutFee, minimumLocalMinutes } = parsed.data;
  return saving("rate", async () => {
    await pool.query(
      `INSERT INTO aircraft_rates (registration, valid_from, cents_per_hour_with_fee,
         cents_per_hour_without_fee, minimum_local_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (registration, valid_from) DO UPDATE
         SET cents_per_hour_with_fee = EXCLUDED.cents_per_hour_with_fee,
             cents_per_hour_without_fee = EXCLUDED.cents_per_hour_without_fee,
             minimum_local_minutes = EXCLUDED.minimum_local_minutes`,
      [registration, validFrom, withFee, withoutFee, minimumLocalMinutes]
    );
    return { status: "success", result: null };
  });
}

const rateKeySchema = z.object({
  registration: z.string().trim().min(1).max(20),
  validFrom: z.iso.date(),
});

export async function deleteAircraftRate(registration: string, validFrom: string): Promise<ActionResult> {
  const access = await requirePriceAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = rateKeySchema.safeParse({ registration, validFrom });
  if (!parsed.success) return { status: "error", error: "Hintaa ei löytynyt" };
  return saving("rate", async () => {
    await pool.query("DELETE FROM aircraft_rates WHERE registration = $1 AND valid_from = $2", [
      parsed.data.registration,
      parsed.data.validFrom,
    ]);
    return { status: "success", result: null };
  });
}
