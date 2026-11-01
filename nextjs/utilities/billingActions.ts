"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { syncFlightSheets } from "@/utilities/flightSync";
import { computeOpenPeriod, getBillingPeriod } from "@/utilities/billingData";
import { writePayerPaid } from "@/utilities/billingPayments";
import {
  BillingCellUpdate,
  FlightSheetWriteError,
  writeBillingCells,
} from "@/utilities/flightSheetWriter";
import { logger } from "@/utilities/logger";

const log = logger.child({ module: "billing" });

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

async function requireBillingAdmin() {
  if (!isBillingEnabled()) {
    return { error: "Laskutus ei ole vielä käytössä" };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    return { error: "Ei oikeuksia laskutukseen" };
  }
  return { user: session.user };
}

const revalidateBilling = () => {
  revalidatePath("/admin/laskutus", "layout");
  revalidatePath("/admin/laskut", "layout");
  revalidatePath("/jasenalue/laskut", "layout");
  revalidatePath("/admin/lennot");
  revalidatePath("/jasenalue/lentopaivakirja");
};

const pgCode = (error: unknown) => (error as { code?: string })?.code;

/** Runs a settings change; a database error is logged and answered in Finnish */
async function saving(what: string, work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work();
  } catch (error) {
    log.error("Saving billing settings failed", { err: error, what });
    return { status: "error", error: "Tallennus epäonnistui" };
  }
}

/*
 * Periods
 */

const periodSchema = z
  .object({
    name: z.string().trim().min(1, "Anna jaksolle nimi").max(40, "Nimi on liian pitkä"),
    startsOn: z.iso.date("Anna alkupäivä"),
    endsOn: z.iso.date("Anna loppupäivä"),
  })
  .refine((period) => period.endsOn >= period.startsOn, "Jakso ei voi päättyä ennen alkuaan");

export async function createBillingPeriod(
  input: z.input<typeof periodSchema>
): Promise<ActionResult<{ id: number }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  try {
    const response = await pool.query(
      `INSERT INTO billing_periods (name, starts_on, ends_on, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [parsed.data.name, parsed.data.startsOn, parsed.data.endsOn, access.user.id]
    );
    revalidateBilling();
    return { status: "success", result: { id: response.rows[0].id } };
  } catch (error) {
    if (pgCode(error) === "23505") {
      return { status: "error", error: "Samanniminen jakso on jo olemassa" };
    }
    if (pgCode(error) === "23P01") {
      return { status: "error", error: "Jakso menee päällekkäin toisen jakson kanssa" };
    }
    log.error("Creating billing period failed", { err: error });
    return { status: "error", error: "Jakson luonti epäonnistui" };
  }
}

/** An open period can be removed; it has billed nothing yet */
export async function deleteBillingPeriod(id: number): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!z.number().int().positive().safeParse(id).success) {
    return { status: "error", error: "Jaksoa ei löytynyt" };
  }
  return saving("billing period", async () => {
    const response = await pool.query(
      "DELETE FROM billing_periods WHERE id = $1 AND closed_at IS NULL",
      [id]
    );
    if (response.rowCount === 0) {
      return { status: "error", error: "Suljettua jaksoa ei voi poistaa" };
    }
    revalidateBilling();
    return { status: "success", result: null };
  });
}

/**
 * Closes a period: stores what it bills to whom, then marks its flights in
 * the sheet (Laskutettu or Ei laskuteta, and the period's name). The database
 * changes are committed only after the sheet has been written.
 */
export async function closeBillingPeriod(
  id: number
): Promise<ActionResult<{ payers: number; totalCents: number }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const period = await getBillingPeriod(id);
  if (!period) return { status: "error", error: "Jaksoa ei löytynyt" };
  if (period.closedAt) return { status: "error", error: "Jakso on jo suljettu" };

  await syncFlightSheets(access.user.fullName || "laskuttaja", { wait: true });
  const { bill, flights } = await computeOpenPeriod(period);
  if (bill.blockers.length > 0) {
    const rows = bill.blockers.reduce((sum, blocker) => sum + blocker.rows.length, 0);
    return {
      status: "error",
      error: `Jaksoa ei voi vielä sulkea: ${rows} ${rows === 1 ? "rivi vaatii" : "riviä vaativat"} huomiota.`,
    };
  }
  if (bill.payers.length === 0 && bill.unbilled.length === 0) {
    return { status: "error", error: "Jaksossa ei ole lentoja" };
  }

  // The sheet: every flight of the period, by aircraft
  const billedIds = new Set(
    bill.payers.flatMap((p) => p.lines.filter((l) => l.kind === "flight").map((l) => l.flightId))
  );
  const updates = new Map<string, BillingCellUpdate[]>();
  for (const flight of flights) {
    const status = billedIds.has(flight.id)
      ? "Laskutettu"
      : bill.unbilled.some((line) => line.flightId === flight.id)
        ? "Ei laskuteta"
        : null;
    if (!status) continue;
    updates.set(flight.registration, [
      ...(updates.get(flight.registration) ?? []),
      { id: flight.id, inputHash: flight.inputHash, status, period: period.name },
    ]);
  }

  const lines = [
    ...bill.payers.flatMap((payer) => payer.lines.map((line) => ({ ...line, payerKey: payer.key }))),
    ...bill.unbilled.map((line) => ({ ...line, payerKey: null })),
  ].map((line) => ({
    payer_key: line.payerKey,
    kind: line.kind,
    flight_id: line.flightId,
    registration: line.registration,
    flight_date: line.flightDate,
    purpose_code: line.purposeCode,
    minutes: line.minutes,
    landings: line.landings,
    cents_per_minute: line.centsPerMinute,
    amount_cents: line.amountCents,
    description: line.description,
    input_hash: line.inputHash,
  }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(
      "SELECT closed_at FROM billing_periods WHERE id = $1 FOR UPDATE",
      [id]
    );
    if (locked.rows[0]?.closed_at) {
      throw new FlightSheetWriteError("Jakso on jo suljettu");
    }
    await client.query(
      `INSERT INTO billing_payers (period_id, payer_key, payer_name, user_id, total_cents)
       SELECT $1, p.key, p.name, p.user_id, p.total
       FROM jsonb_to_recordset($2::jsonb) AS p(key text, name text, user_id text, total int)`,
      [
        id,
        JSON.stringify(
          bill.payers.map((p) => ({ key: p.key, name: p.name, user_id: p.userId, total: p.totalCents }))
        ),
      ]
    );
    await client.query(
      `INSERT INTO billing_lines (period_id, payer_key, kind, flight_id, registration, flight_date,
         purpose_code, minutes, landings, cents_per_minute, amount_cents, description, input_hash)
       SELECT $1, l.payer_key, l.kind, l.flight_id, l.registration, l.flight_date, l.purpose_code,
              l.minutes, l.landings, l.cents_per_minute, l.amount_cents, l.description, l.input_hash
       FROM jsonb_to_recordset($2::jsonb) AS l(payer_key text, kind text, flight_id uuid,
         registration text, flight_date date, purpose_code text, minutes int, landings int,
         cents_per_minute int, amount_cents int, description text, input_hash text)`,
      [id, JSON.stringify(lines)]
    );
    await client.query(
      "UPDATE billing_periods SET closed_at = NOW(), closed_by = $2 WHERE id = $1",
      [id, access.user.id]
    );
    // One write per aircraft tab. Only OH-CON has a tab today; with several,
    // a failure on a later tab would leave the earlier ones marked
    // Laskutettu with nothing stored, and those flights would then count as
    // billed by hand. Undo the earlier writes here before adding a tab.
    for (const [registration, cells] of updates) {
      await writeBillingCells(registration, cells, ["Tarkistettu"]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    log.error("Closing billing period failed", { err: error });
    return {
      status: "error",
      error:
        error instanceof FlightSheetWriteError
          ? error.message
          : "Jakson sulkeminen epäonnistui. Mitään ei tallennettu.",
    };
  } finally {
    client.release();
  }

  await syncFlightSheets(access.user.fullName || "laskuttaja", { wait: true });
  revalidateBilling();
  return { status: "success", result: { payers: bill.payers.length, totalCents: bill.totalCents } };
}

/**
 * Marks a payer's bill in a closed period paid (Maksettu in the sheet), or
 * not. Their invoice, if they have one, follows.
 */
export async function setPayerPaid(
  periodId: number,
  payerKey: string,
  paid: boolean
): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  // A server action takes whatever the request sends: a string "false" would
  // mark the sheet paid while the database stays unpaid
  if (!Number.isInteger(periodId) || typeof payerKey !== "string" || typeof paid !== "boolean") {
    return { status: "error", error: "Virheellinen pyyntö" };
  }

  const failed = await writePayerPaid(periodId, payerKey, paid, access.user.id);
  if (failed) return { status: "error", error: failed.error };

  await syncFlightSheets(access.user.fullName || "laskuttaja", { wait: true });
  revalidateBilling();
  return { status: "success", result: null };
}

/*
 * Settings
 */

// "3,10" or "3.10" € → 310 cents
const euroField = z
  .string()
  .trim()
  .regex(/^\d{1,3}([.,]\d{1,2})?$/, "Anna hinta euroina, esim. 3,10")
  .transform((value) => Math.round(Number(value.replace(",", ".")) * 100));

const rateSchema = z.object({
  registration: z.string().trim().min(1),
  validFrom: z.iso.date("Anna päivä, josta alkaen hinta on voimassa"),
  withFee: euroField,
  withoutFee: euroField,
  minimumLocalMinutes: z.number().int().min(0).max(120),
});

export async function saveRate(input: z.input<typeof rateSchema>): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { registration, validFrom, withFee, withoutFee, minimumLocalMinutes } = parsed.data;
  return saving("rate", async () => {
    await pool.query(
      `INSERT INTO aircraft_rates (registration, valid_from, cents_with_fee, cents_without_fee, minimum_local_minutes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (registration, valid_from) DO UPDATE
         SET cents_with_fee = EXCLUDED.cents_with_fee, cents_without_fee = EXCLUDED.cents_without_fee,
             minimum_local_minutes = EXCLUDED.minimum_local_minutes`,
      [registration, validFrom, withFee, withoutFee, minimumLocalMinutes]
    );
    revalidateBilling();
    return { status: "success", result: null };
  });
}

const rateKeySchema = z.object({
  registration: z.string().trim().min(1).max(20),
  validFrom: z.iso.date(),
});

export async function deleteRate(registration: string, validFrom: string): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = rateKeySchema.safeParse({ registration, validFrom });
  if (!parsed.success) return { status: "error", error: "Hintaa ei löytynyt" };
  return saving("rate", async () => {
    await pool.query("DELETE FROM aircraft_rates WHERE registration = $1 AND valid_from = $2", [
      parsed.data.registration,
      parsed.data.validFrom,
    ]);
    revalidateBilling();
    return { status: "success", result: null };
  });
}

const feeSchema = z.object({
  userId: z.string().min(1),
  season: z.number().int().min(2000).max(2100),
  paid: z.boolean(),
});

export async function setEquipmentFee(input: z.input<typeof feeSchema>): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = feeSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { userId, season, paid } = parsed.data;
  return saving("equipment fee", async () => {
    if (paid) {
      await pool.query(
        `INSERT INTO equipment_fee_seasons (user_id, season, created_by) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, season, access.user.id]
      );
    } else {
      await pool.query("DELETE FROM equipment_fee_seasons WHERE user_id = $1 AND season = $2", [
        userId,
        season,
      ]);
    }
    revalidateBilling();
    return { status: "success", result: null };
  });
}

const freeHourSchema = z.object({
  enabled: z.boolean(),
  aircraft: z.array(z.string().min(1)).max(20),
  paidMinutes: z.number().int().min(1, "Maksettuja minuutteja vähintään 1").max(6000),
  freeMinutes: z.number().int().min(0).max(600),
});

export async function saveFreeHour(input: z.input<typeof freeHourSchema>): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = freeHourSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  return saving("free hour", async () => {
    await pool.query(
      `INSERT INTO flight_log_settings (key, value, updated_at, updated_by)
       VALUES ('free_hour', $1, NOW(), $2)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [JSON.stringify(parsed.data), access.user.id]
    );
    revalidateBilling();
    return { status: "success", result: null };
  });
}

export async function setPurposePayer(
  code: string,
  payer: "pic" | "student" | "none"
): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = z.enum(["pic", "student", "none"]).safeParse(payer);
  if (!parsed.success) return { status: "error", error: "Tuntematon maksaja" };
  if (!z.string().min(1).max(20).safeParse(code).success) {
    return { status: "error", error: "Tuntematon lennon tarkoitus" };
  }
  return saving("purpose payer", async () => {
    const updated = await pool.query("UPDATE flight_purposes SET payer = $2 WHERE code = $1", [
      code,
      parsed.data,
    ]);
    if (updated.rowCount === 0) return { status: "error", error: "Tuntematon lennon tarkoitus" };
    revalidateBilling();
    return { status: "success", result: null };
  });
}
