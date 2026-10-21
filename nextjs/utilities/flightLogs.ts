"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled } from "@/utilities/features";
import { syncFlightSheets, SyncSummary } from "@/utilities/flightSync";
import { nameKey, SHEET_ZONE, SheetFlightInput } from "@/utilities/flightSheetParser";
import { normalizeClock, sheetNameFor } from "@/utilities/flightFormInput";
import {
  appendFlightsToSheet,
  clearWebFlight,
  FlightSheetWriteError,
} from "@/utilities/flightSheetWriter";

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

  const summary = await syncFlightSheets(access.user.fullName || access.user.email || "ylläpitäjä", {
    wait: true,
  });
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
  await syncFlightSheets(access.user.fullName || access.user.email || "ylläpitäjä", {
    wait: true,
  });
  revalidatePath("/admin/lennot");
  revalidatePath("/jasenalue/lentopaivakirja");
  return { status: "success", result: null };
}

/*
 * Entering flights
 */

const clockField = z
  .string()
  .transform((value, ctx) => {
    const clock = normalizeClock(value);
    if (!clock) {
      ctx.addIssue({ code: "custom", message: "Anna kellonaika muodossa 14.05" });
      return z.NEVER;
    }
    return clock;
  });

const airfieldField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-ZÅÄÖ0-9]{2,8}$/, "Anna kenttä tunnuksella, esim. EFSA tai JÄÄ");

const optionalNumber = (max: number, message: string) =>
  z.number().min(0, message).max(max, message).nullable();

const legSchema = z.object({
  departure: airfieldField,
  arrival: airfieldField,
  takeoff: clockField,
  landing: clockField,
  landings: z.number().int("Laskujen määrä on kokonaisluku").min(0).max(99, "Liian monta laskua"),
  personsOnBoard: z.number().int().min(1, "Henkilöitä vähintään 1").max(6, "Henkilöitä enintään 6"),
  purposeCode: z.string().trim().toUpperCase().min(1, "Valitse lennon tarkoitus"),
  fuelLitres: optionalNumber(500, "Tarkista tankkausmäärä"),
  oilLitres: optionalNumber(20, "Tarkista öljymäärä"),
  hourMeter: optionalNumber(99999.9, "Tarkista tuntimittarin lukema"),
  remarks: z.string().trim().max(300, "Huomiot voivat olla enintään 300 merkkiä").nullable(),
});

const logFlightsSchema = z.object({
  registration: z.string().min(1, "Valitse kone"),
  flightDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valitse päivä"),
  // As PIC the other name is the student or SIC; as a student it is the PIC
  role: z.enum(["pic", "student"]),
  otherPilot: z.string().trim().max(60, "Nimi on liian pitkä").nullable(),
  legs: z.array(legSchema).min(1, "Lisää vähintään yksi lento").max(12, "Enintään 12 lentoa kerralla"),
});

export type LogFlightsInput = z.input<typeof logFlightsSchema>;

/**
 * How the member is written in the flight log. Their matched sheet name if
 * they have one; otherwise "T.Kuutti" from their full name, or the full name,
 * whichever nobody uses yet, matched to them now. A name already in the sheet
 * or in pilot_aliases is never claimed here: it may be another pilot's, and
 * matching it would hand them that pilot's flights and bills. The admin
 * matches those on /admin/lennot.
 */
async function memberSheetName(userId: string, fullName: string): Promise<string | null> {
  const existing = await pool.query(
    "SELECT name FROM pilot_aliases WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0].name;

  for (const candidate of [sheetNameFor(fullName), fullName.trim()]) {
    if (!candidate) continue;
    const claimed = await pool.query(
      `INSERT INTO pilot_aliases (name_key, name, user_id)
       SELECT $1::text, $2::text, $3::text
       WHERE NOT EXISTS (SELECT 1 FROM sheet_flights WHERE pic_key = $1)
         AND NOT EXISTS (SELECT 1 FROM sheet_flights WHERE second_key = $1)
       ON CONFLICT (name_key) DO NOTHING
       RETURNING name`,
      [nameKey(candidate), candidate, userId]
    );
    if (claimed.rows.length > 0) return claimed.rows[0].name;
  }
  return null;
}

/**
 * Member: write one or more flights (legs of the same day and aircraft) into
 * the flight log sheet
 */
export async function logFlights(
  input: LogFlightsInput
): Promise<ActionResult<{ ids: string[]; sheetName: string }>> {
  if (!isFlightLogEnabled()) {
    return { status: "error", error: FLIGHT_LOG_DISABLED };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "LOG_OWN_FLIGHT")) {
    return { status: "error", error: "Kirjaudu sisään kirjataksesi lentoja" };
  }

  const parsed = logFlightsSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }
  const { registration, flightDate, role, otherPilot, legs } = parsed.data;

  const today = DateTime.now().setZone(SHEET_ZONE).toISODate()!;
  if (flightDate > today) {
    return { status: "error", error: "Päivä ei voi olla tulevaisuudessa" };
  }
  if (role === "student" && !otherPilot) {
    return { status: "error", error: "Kirjoita päällikön (opettajan) nimi" };
  }

  let inputs: SheetFlightInput[] = [];
  let sheetName: string | null = null;
  try {
    const purposes = await pool.query(
      "SELECT code FROM flight_purposes WHERE active AND code = ANY($1)",
      [legs.map((leg) => leg.purposeCode)]
    );
    const known = new Set(purposes.rows.map((row) => row.code));
    const unknown = legs.find((leg) => !known.has(leg.purposeCode));
    if (unknown) {
      return { status: "error", error: `Tuntematon lennon tarkoitus ${unknown.purposeCode}` };
    }

    sheetName = await memberSheetName(
      session.user.id,
      session.user.fullName || session.user.name || ""
    );
    if (!sheetName) {
      return {
        status: "error",
        error:
          "Nimesi on jo lentopäiväkirjassa, mutta sitä ei ole yhdistetty sinuun. Pyydä laskuttajaa yhdistämään nimesi, niin voit kirjata lentoja.",
      };
    }

    inputs = legs.map((leg) => ({
      id: randomUUID(),
      flightDate,
      picName: role === "pic" ? sheetName : otherPilot!,
      secondName: role === "pic" ? otherPilot : sheetName,
      personsOnBoard: leg.personsOnBoard,
      departure: leg.departure,
      arrival: leg.arrival,
      takeoff: leg.takeoff,
      landing: leg.landing,
      landings: leg.landings,
      purposeCode: leg.purposeCode,
      fuelLitres: leg.fuelLitres,
      oilLitres: leg.oilLitres,
      hourMeter: leg.hourMeter,
      remarks: leg.remarks || null,
    }));

    await appendFlightsToSheet(registration, inputs);
    await pool.query(
      `INSERT INTO flight_log_web_entries (id, user_id, registration)
       SELECT unnest($1::uuid[]), $2, $3`,
      [inputs.map((i) => i.id), session.user.id, registration]
    );
  } catch (error) {
    console.error("Error logging flights:", error);
    return {
      status: "error",
      error:
        error instanceof FlightSheetWriteError
          ? error.message
          : "Lentojen tallennus epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.",
    };
  }

  await syncFlightSheets(session.user.fullName || "jäsen", { wait: true });
  revalidatePath("/jasenalue/lentopaivakirja");
  revalidatePath("/admin/lennot");
  return { status: "success", result: { ids: inputs.map((i) => i.id), sheetName } };
}

/**
 * Member: undo a flight they entered on the site, while it is still the last
 * row of the sheet and nobody has checked it
 */
export async function undoFlight(id: string): Promise<ActionResult> {
  if (!isFlightLogEnabled()) {
    return { status: "error", error: FLIGHT_LOG_DISABLED };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "LOG_OWN_FLIGHT")) {
    return { status: "error", error: "Kirjaudu sisään" };
  }
  if (!z.uuid().safeParse(id).success) {
    return { status: "error", error: "Lentoa ei löytynyt" };
  }

  const entry = await pool.query(
    `SELECT registration FROM flight_log_web_entries
     WHERE id = $1 AND user_id = $2 AND undone_at IS NULL`,
    [id, session.user.id]
  );
  if (entry.rowCount === 0) {
    return { status: "error", error: "Voit kumota vain itse kirjaamasi lennon" };
  }

  try {
    await clearWebFlight(entry.rows[0].registration, id);
    await pool.query("UPDATE flight_log_web_entries SET undone_at = NOW() WHERE id = $1", [id]);
  } catch (error) {
    console.error("Error undoing flight:", error);
    return {
      status: "error",
      error:
        error instanceof FlightSheetWriteError
          ? error.message
          : "Kumoaminen epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.",
    };
  }

  await syncFlightSheets(session.user.fullName || "jäsen", { wait: true });
  revalidatePath("/jasenalue/lentopaivakirja");
  revalidatePath("/admin/lennot");
  return { status: "success", result: null };
}
