"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { syncFlightSheets, SyncSummary } from "@/utilities/flightSync";
import { nameKey } from "@/utilities/flightSheetParser";

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

const FLIGHT_LOG_DISABLED = "Lentopäiväkirja ei ole vielä käytössä";

async function requireFlightLogAdmin() {
  if (!isFlightLogEnabled()) {
    return { error: FLIGHT_LOG_DISABLED };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_FLIGHT_LOG")) {
    return { error: "Ei oikeuksia lentopäiväkirjan hallintaan" };
  }
  return { user: session.user };
}

/** Admin: copy the sheet into the database now */
export async function runFlightSync(): Promise<ActionResult<SyncSummary>> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }

  const summary = await syncFlightSheets(access.user.fullName || access.user.email || "ylläpitäjä");
  revalidatePath("/admin/lennot");
  if (summary.status === "busy") {
    return { status: "error", error: "Synkronointi on jo käynnissä, yritä hetken päästä" };
  }
  if (summary.status === "error") {
    return { status: "error", error: summary.error ?? "Synkronointi epäonnistui" };
  }
  return { status: "success", result: summary };
}

const pilotAliasSchema = z.object({
  name: z.string().trim().min(1, "Nimi puuttuu").max(100, "Nimi on liian pitkä"),
  userId: z.string().min(1).nullable(),
});

/**
 * Admin: match a pilot name as written in the sheet to a member account, or
 * clear the match with userId null
 */
export async function setPilotAlias(
  name: string,
  userId: string | null
): Promise<ActionResult> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }

  const parsed = pilotAliasSchema.safeParse({ name, userId });
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  try {
    if (parsed.data.userId) {
      const user = await pool.query("SELECT 1 FROM users WHERE id = $1", [parsed.data.userId]);
      if (user.rowCount === 0) {
        return { status: "error", error: "Jäsentä ei löytynyt" };
      }
    }

    await pool.query(
      `INSERT INTO pilot_aliases (name_key, name, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (name_key) DO UPDATE
         SET name = EXCLUDED.name, user_id = EXCLUDED.user_id, updated_at = NOW()`,
      [nameKey(parsed.data.name), parsed.data.name, parsed.data.userId]
    );
  } catch (error) {
    console.error("Error saving pilot alias:", error);
    return { status: "error", error: "Tallennus epäonnistui" };
  }

  // Refresh the "not matched" issues
  await syncFlightSheets(access.user.fullName || access.user.email || "ylläpitäjä");
  revalidatePath("/admin/lennot");
  revalidatePath("/jasenalue/lentopaivakirja");
  return { status: "success", result: null };
}
