"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { parseYearTable } from "@/utilities/flightStats";

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

async function requireStatsEditor() {
  if (!isFlightLogEnabled()) {
    return { error: "Tilastot eivät ole vielä käytössä" };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_FLIGHT_LOG")) {
    return { error: "Ei oikeuksia" };
  }
  return { user: session.user };
}

/**
 * Hours per aircraft per year from before the flight log, pasted from a
 * spreadsheet (flightStats.parseYearTable). Years already typed in are
 * replaced.
 */
export async function saveYearTotals(text: string): Promise<ActionResult<{ saved: number }>> {
  const access = await requireStatsEditor();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = z.string().max(20_000, "Liitetty taulukko on liian pitkä").safeParse(text);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  const { totals, errors } = parseYearTable(parsed.data);
  if (errors.length > 0) return { status: "error", error: errors.slice(0, 3).join("; ") };
  if (totals.length === 0) return { status: "error", error: "Taulukossa ei ole tunteja" };

  await pool.query(
    `INSERT INTO aircraft_year_totals (registration, year, minutes, updated_by)
     SELECT t.registration, t.year, t.minutes, $2
     FROM jsonb_to_recordset($1::jsonb) AS t(registration text, year int, minutes int)
     ON CONFLICT (registration, year) DO UPDATE
       SET minutes = EXCLUDED.minutes, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [JSON.stringify(totals), access.user.id]
  );
  revalidatePath("/admin/tilastot");
  return { status: "success", result: { saved: totals.length } };
}

export async function deleteYearTotal(registration: string, year: number): Promise<ActionResult> {
  const access = await requireStatsEditor();
  if ("error" in access) return { status: "error", error: access.error };
  await pool.query("DELETE FROM aircraft_year_totals WHERE registration = $1 AND year = $2", [
    registration,
    year,
  ]);
  revalidatePath("/admin/tilastot");
  return { status: "success", result: null };
}
