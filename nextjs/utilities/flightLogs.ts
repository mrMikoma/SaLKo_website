"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isFlightLogEnabled, isSampleFlightsEnabled } from "@/utilities/features";
import { syncFlightSheets, SyncSummary } from "@/utilities/flightSync";
import {
  nameKey,
  REVIEW_STATUSES,
  SHEET_ZONE,
  SheetFlightInput,
} from "@/utilities/flightSheetParser";
import {
  legTimeError,
  normalizeClock,
  overlappingLegs,
  sheetNameFor,
} from "@/utilities/flightFormInput";
import { RateLimiter, waitText } from "@/utilities/rateLimit";
import {
  appendFlightsToSheet,
  clearWebFlight,
  FlightSheetWriteError,
  PaperPageWrite,
  setFlightStatuses,
  StatusChange,
  writePaperPage,
} from "@/utilities/flightSheetWriter";
import { getFlightsOnDates } from "@/utilities/flightLogData";
import { sampleFlights } from "@/utilities/sampleFlights";
import {
  describeDifferences,
  ExistingFlight,
  matchPaperRows,
  PaperRow,
  readPaperGrid,
  RowMatch,
} from "@/utilities/paperPage";

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

const FLIGHT_LOG_DISABLED = "Lentopäiväkirja ei ole vielä käytössä";

// A Google error carries the request, with members' names and remarks in its
// body, so only its message goes to the log
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Each save or undo makes several Sheets requests and a sync, all as the one
// service account: one member can't use up its quota for everyone
const flightWrites = new RateLimiter("flight-log-writes", 20, 10 * 60_000, 10 * 60_000);

function tooManyWrites(userId: string): string | null {
  const wait = flightWrites.blockedFor(userId);
  if (wait > 0) {
    return `Liian monta tallennusta peräkkäin. Yritä uudelleen ${waitText(wait)} kuluttua.`;
  }
  flightWrites.hit(userId);
  return null;
}

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

/**
 * Development only (FLIGHT_LOG_SAMPLE_DATA): writes about a year of made-up
 * flights into an aircraft's tab, through the same writer as the entry form,
 * so the flight log, billing and statistics have something to show. The sheet
 * runs in date order, so a tab that already has flights from that year is
 * left alone.
 */
export async function addSampleFlights(registration: string): Promise<ActionResult<{ added: number }>> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }
  if (!isSampleFlightsEnabled()) {
    return { status: "error", error: "Esimerkkilennot ovat käytössä vain kehitysympäristössä" };
  }

  const today = DateTime.now().setZone(SHEET_ZONE).startOf("day");
  const from = today.minus({ months: 12 }).startOf("month");
  try {
    const aircraft = await pool.query(
      `SELECT a.registration,
              (SELECT max(f.flight_date) FROM sheet_flights f
               WHERE f.registration = a.registration AND f.missing_since IS NULL) AS latest
       FROM aircraft_sheets a WHERE a.registration = $1`,
      [registration]
    );
    if (aircraft.rows.length === 0) {
      return { status: "error", error: "Konetta ei löytynyt lentopäiväkirjasta" };
    }
    const latest = aircraft.rows[0].latest as Date | null;
    if (latest && DateTime.fromJSDate(latest).toISODate()! >= from.toISODate()!) {
      return {
        status: "error",
        error: `${registration}:n taulukossa on jo lentoja ${from.toFormat("d.M.yyyy")} jälkeen. Esimerkkilennot lisätään vain taulukkoon, jossa ei ole tämän vuoden lentoja.`,
      };
    }

    const inputs = sampleFlights({
      registration,
      from,
      until: today.minus({ days: 1 }),
      newId: randomUUID,
    });
    await appendFlightsToSheet(registration, inputs);
    await syncFlightSheets(access.user.fullName || "ylläpitäjä", { wait: true });
    revalidatePath("/admin/lennot");
    return { status: "success", result: { added: inputs.length } };
  } catch (error) {
    console.error("Error adding sample flights:", errorText(error));
    return {
      status: "error",
      error:
        error instanceof FlightSheetWriteError
          ? error.message
          : "Esimerkkilentojen lisäys epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.",
    };
  }
}

const pilotAliasSchema = z.object({
  name: z.string().trim().min(1, "Nimi puuttuu").max(100, "Nimi on liian pitkä"),
  userId: z.string().min(1).nullable(),
});

/**
 * Admin: match a pilot name as written in the sheet to a member account, or,
 * with userId null, mark it as no member: their flights are then billed under
 * the name at the non-member price. removePilotAlias undoes either.
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
      // Only an account the member list offers (getMemberOptions): not the
      // system guest, a deactivated or an anonymised one
      const user = await pool.query(
        `SELECT 1 FROM users
         WHERE id = $1 AND NOT (roles = ARRAY['guest']::text[])
           AND deactivated_at IS NULL AND email NOT LIKE 'poistettu-%@salko.invalid'`,
        [parsed.data.userId]
      );
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

/**
 * Admin: forget what a pilot name was matched to, member or no member. The
 * name is then undecided again, and billing waits until it is matched.
 */
export async function removePilotAlias(name: string): Promise<ActionResult> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }
  const parsed = pilotAliasSchema.shape.name.safeParse(name);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }

  try {
    await pool.query("DELETE FROM pilot_aliases WHERE name_key = $1", [nameKey(parsed.data)]);
  } catch (error) {
    console.error("Error removing pilot alias:", errorText(error));
    return { status: "error", error: "Poisto epäonnistui" };
  }

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
  // Made by the form, so saving the same legs again finds them in the sheet.
  // Lower case, as the sheet parser and Postgres compare them
  id: z.uuid("Lomake on vanhentunut. Lataa sivu uudelleen.").transform((id) => id.toLowerCase()),
  departure: airfieldField,
  arrival: airfieldField,
  takeoff: clockField,
  landing: clockField,
  landings: z.number().int("Laskujen määrä on kokonaisluku").min(0).max(99, "Liian monta laskua"),
  personsOnBoard: z.number().int().min(1, "Henkilöitä vähintään 1").max(6, "Henkilöitä enintään 6"),
  purposeCode: z.string().trim().toUpperCase().min(1, "Valitse lennon tarkoitus"),
  fuelLitres: optionalNumber(500, "Tarkista tankkausmäärä"),
  oilQuarts: optionalNumber(20, "Tarkista öljymäärä"),
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
 * they have one; otherwise "M.Meikäläinen" from their full name, or the full name,
 * whichever nobody uses yet. A name already in the sheet or in pilot_aliases is
 * never taken here: it may be another pilot's, and matching it would hand them
 * that pilot's flights and bills. The admin matches those on /admin/lennot.
 * A new name is matched to the member (claimSheetName) only once their flights
 * are in the sheet, so a save that fails doesn't reserve a name.
 */
async function memberSheetName(
  userId: string,
  fullName: string
): Promise<{ name: string; isNew: boolean } | null> {
  const existing = await pool.query(
    "SELECT name FROM pilot_aliases WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1",
    [userId]
  );
  if (existing.rows.length > 0) return { name: existing.rows[0].name, isNew: false };

  for (const candidate of [sheetNameFor(fullName), fullName.trim()]) {
    if (!candidate) continue;
    const taken = await pool.query(
      `SELECT 1 FROM pilot_aliases WHERE name_key = $1
       UNION ALL SELECT 1 FROM sheet_flights WHERE pic_key = $1 OR second_key = $1
       LIMIT 1`,
      [nameKey(candidate)]
    );
    if (taken.rows.length === 0) return { name: candidate, isNew: true };
  }
  return null;
}

async function claimSheetName(userId: string, name: string): Promise<void> {
  await pool.query(
    `INSERT INTO pilot_aliases (name_key, name, user_id) VALUES ($1, $2, $3)
     ON CONFLICT (name_key) DO NOTHING`,
    [nameKey(name), name, userId]
  );
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

  const now = DateTime.now().setZone(SHEET_ZONE);
  const day = DateTime.fromISO(flightDate, { zone: SHEET_ZONE });
  if (!day.isValid) {
    return { status: "error", error: "Valitse päivä" };
  }
  if (day > now.endOf("day")) {
    return { status: "error", error: "Päivä ei voi olla tulevaisuudessa" };
  }
  if (day < now.minus({ years: 1 }).startOf("day")) {
    return {
      status: "error",
      error: "Yli vuoden vanhaa lentoa ei kirjata täällä. Kerro siitä laskuttajalle.",
    };
  }
  if (role === "student" && !otherPilot) {
    return { status: "error", error: "Kirjoita päällikön (opettajan) nimi" };
  }
  const legName = (i: number) => (legs.length > 1 ? `Lento ${i + 1}: ` : "");
  for (const [i, leg] of legs.entries()) {
    const problem = legTimeError(leg.takeoff, leg.landing);
    if (problem) {
      return { status: "error", error: `${legName(i)}${problem}` };
    }
    // A landing before the takeoff is on the next day
    const landingDay = leg.landing < leg.takeoff ? day.plus({ days: 1 }) : day;
    const [hour, minute] = leg.landing.split(":").map(Number);
    if (landingDay.set({ hour, minute }) > now.plus({ minutes: 5 })) {
      return { status: "error", error: `${legName(i)}Laskuaika on tulevaisuudessa` };
    }
  }
  const overlap = overlappingLegs(legs.map((leg) => ({ takeoff: leg.takeoff!, landing: leg.landing! })));
  if (overlap) {
    return {
      status: "error",
      error: `Lennot ${overlap[0] + 1} ja ${overlap[1] + 1} ovat ajallisesti päällekkäin`,
    };
  }
  const ids = legs.map((leg) => leg.id);
  if (new Set(ids).size !== ids.length) {
    return { status: "error", error: "Lomake on vanhentunut. Lataa sivu uudelleen." };
  }
  const limited = tooManyWrites(session.user.id);
  if (limited) {
    return { status: "error", error: limited };
  }

  let inputs: SheetFlightInput[] = [];
  let sheetName: string | null = null;
  let newSheetName = false;
  try {
    const purposes = await pool.query(
      "SELECT code, is_training FROM flight_purposes WHERE active"
    );
    const training = new Map(purposes.rows.map((row) => [row.code, row.is_training as boolean]));
    const unknown = legs.find((leg) => !training.has(leg.purposeCode));
    if (unknown) {
      return { status: "error", error: `Tuntematon lennon tarkoitus ${unknown.purposeCode}` };
    }
    // As a student the member pays for the flight only when it is a training
    // flight; with another purpose the PIC (the instructor) would be billed
    const notTraining = legs.findIndex((leg) => !training.get(leg.purposeCode));
    if (role === "student" && notTraining !== -1) {
      const codes = [...training].filter(([, isTraining]) => isTraining).map(([code]) => code);
      return {
        status: "error",
        error: `${legName(notTraining)}Oppilaana lennetyn lennon tarkoitus on koululento (${codes.join(", ")})`,
      };
    }

    const member = await memberSheetName(
      session.user.id,
      session.user.fullName || session.user.name || ""
    );
    if (!member) {
      return {
        status: "error",
        error:
          "Nimesi on jo lentopäiväkirjassa, mutta sitä ei ole yhdistetty sinuun. Pyydä laskuttajaa yhdistämään nimesi, niin voit kirjata lentoja.",
      };
    }
    sheetName = member.name;
    newSheetName = member.isNew;

    // Saved already: the answer to an earlier try was lost on the way
    const saved = await pool.query(
      "SELECT user_id, undone_at FROM flight_log_web_entries WHERE id = ANY($1::uuid[])",
      [ids]
    );
    if (saved.rows.some((row) => row.user_id !== session.user.id || row.undone_at)) {
      return { status: "error", error: "Lomake on vanhentunut. Lataa sivu uudelleen." };
    }
    if (saved.rows.length === ids.length) {
      return { status: "success", result: { ids, sheetName } };
    }
    if (saved.rows.length > 0) {
      return {
        status: "error",
        error: "Osa lennoista on jo tallennettu. Tarkista Omat lennot ennen kuin tallennat uudelleen.",
      };
    }

    inputs = legs.map((leg) => ({
      id: leg.id,
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
      oilQuarts: leg.oilQuarts,
      hourMeter: leg.hourMeter,
      remarks: leg.remarks || null,
    }));

    await appendFlightsToSheet(registration, inputs);
  } catch (error) {
    console.error("Error logging flights:", errorText(error));
    return {
      status: "error",
      error:
        error instanceof FlightSheetWriteError
          ? error.message
          : "Lentojen tallennus epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.",
    };
  }

  // The flights are in the sheet now. Saving again finds them there by their
  // IDs and only finishes this step.
  try {
    if (newSheetName) await claimSheetName(session.user.id, sheetName);
    await pool.query(
      `INSERT INTO flight_log_web_entries (id, user_id, registration)
       SELECT unnest($1::uuid[]), $2, $3
       ON CONFLICT (id) DO NOTHING`,
      [ids, session.user.id, registration]
    );
  } catch (error) {
    console.error("Error recording logged flights:", errorText(error));
    return {
      status: "error",
      error: "Lento tallentui taulukkoon, mutta tallennus jäi kesken. Tallenna uudelleen, niin se viimeistellään.",
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
  const limited = tooManyWrites(session.user.id);
  if (limited) {
    return { status: "error", error: limited };
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
    console.error("Error undoing flight:", errorText(error));
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

const setFlightStatusSchema = z.object({
  registration: z.string().min(1),
  status: z.enum(REVIEW_STATUSES),
  flights: z
    .array(
      z.object({
        id: z.uuid(),
        inputHash: z.string().max(64).nullable(),
        // The Tila the page showed, so a change someone else made meanwhile
        // isn't overwritten
        status: z.string().max(40).nullable().optional(),
      })
    )
    .min(1, "Valitse ensin lennot")
    .max(500, "Enintään 500 lentoa kerralla"),
  // Why a flight is Korjattava; the pilot sees it with the flight
  note: z.string().trim().max(300, "Syy voi olla enintään 300 merkkiä").nullable().optional(),
});

/**
 * Admin: set Tila on flights compared with the paper book (Tarkistettu,
 * Korjattava, or back to Kirjattu). Written into the sheet, which stays the
 * source; flight_status_changes keeps who changed it and when.
 */
export async function setFlightStatus(
  input: z.input<typeof setFlightStatusSchema>
): Promise<ActionResult<{ changed: number }>> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }
  const parsed = setFlightStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }
  const { registration, status, flights } = parsed.data;
  const note = status === "Korjattava" ? parsed.data.note || null : null;

  let changes: StatusChange[] = [];
  let error: string | null = null;
  try {
    // A flight in a closed period is billed whatever its Tila says now
    const billed = await pool.query(
      `SELECT DISTINCT f.sheet_row FROM billing_lines b
       JOIN sheet_flights f ON f.id = b.flight_id
       WHERE b.flight_id = ANY($1::uuid[])
       ORDER BY f.sheet_row`,
      [flights.map((flight) => flight.id)]
    );
    if (billed.rows.length > 0) {
      error = `Rivit ${billed.rows.map((row) => row.sheet_row).join(", ")} kuuluvat jo suljettuun laskutusjaksoon, eikä niiden tilaa muuteta täällä.`;
    } else {
      changes = await setFlightStatuses(registration, flights, status);
    }
  } catch (caught) {
    console.error("Error setting flight status:", errorText(caught));
    error =
      caught instanceof FlightSheetWriteError
        ? caught.message
        : "Tilan tallennus epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.";
  }
  if (changes.length > 0) {
    try {
      await pool.query(
        `INSERT INTO flight_status_changes (flight_id, registration, old_status, new_status, changed_by, note)
         SELECT c.id, $2, NULLIF(c.old_status, ''), NULLIF($3, ''), $4, $5
         FROM jsonb_to_recordset($1::jsonb) AS c(id uuid, old_status text)`,
        [
          JSON.stringify(changes.map((c) => ({ id: c.id, old_status: c.oldStatus }))),
          registration,
          status,
          access.user.id,
          note,
        ]
      );
    } catch (caught) {
      // The sheet has the new Tila; only the record of who set it is missing
      console.error("Error recording flight status changes:", errorText(caught));
      error = "Tila tallentui taulukkoon, mutta muutoshistoriaan sitä ei saatu kirjattua.";
    }
  }

  // Sync either way: after a refusal the page then shows what changed
  await syncFlightSheets(access.user.fullName || "ylläpito", { wait: true });
  revalidatePath("/admin/lennot");
  revalidatePath("/jasenalue/lentopaivakirja");
  if (error) {
    return { status: "error", error };
  }
  return { status: "success", result: { changed: changes.length } };
}

/*
 * Bulk entry from the paper book
 */

const paperCellsSchema = z.object({
  date: z.string().max(20),
  pic: z.string().max(60),
  second: z.string().max(60),
  persons: z.string().max(4),
  departure: z.string().max(10),
  arrival: z.string().max(10),
  takeoff: z.string().max(8),
  landing: z.string().max(8),
  landings: z.string().max(4),
  purpose: z.string().max(10),
  remarks: z.string().max(300),
});

const paperPageSchema = z.object({
  registration: z.string().min(1, "Valitse kone"),
  logPage: z.string().trim().max(20, "Sivunumero on liian pitkä").nullable(),
  grid: z.array(paperCellsSchema).max(60, "Enintään 60 riviä kerralla"),
});

export type PaperPageInput = z.input<typeof paperPageSchema>;

export interface PaperPreviewRow {
  index: number;
  errors: string[];
  match: RowMatch | null;
}

/** Reads the grid and checks the purpose codes; rows with errors have no row */
async function readPage(grid: PaperPageInput["grid"]) {
  const today = DateTime.now().setZone(SHEET_ZONE).toISODate()!;
  const read = readPaperGrid(grid, today);
  const codes = new Set(
    (await pool.query("SELECT code FROM flight_purposes WHERE active")).rows.map((r) => r.code)
  );
  for (const line of read) {
    if (line.row && !codes.has(line.row.purposeCode)) {
      line.errors.push(`Tuntematon lennon tarkoitus ${line.row.purposeCode}`);
      line.row = null;
    }
  }
  return read;
}

/**
 * Admin: check a typed page of the paper book before saving it. Syncs first,
 * then pairs each line with a flight already in the sheet.
 */
export async function previewPaperPage(
  input: PaperPageInput
): Promise<ActionResult<{ rows: PaperPreviewRow[]; notOnPage: ExistingFlight[] }>> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }
  const parsed = paperPageSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }
  const { registration, grid } = parsed.data;

  try {
    const read = await readPage(grid);
    if (read.length === 0) {
      return { status: "error", error: "Kirjoita ensin sivun lennot" };
    }
    await syncFlightSheets(access.user.fullName || "ylläpito", { wait: true });
    const valid = read.filter((line) => line.row);
    const existing = await getFlightsOnDates(registration, [
      ...new Set(valid.map((line) => line.row!.flightDate)),
    ]);
    const matches = matchPaperRows(
      valid.map((line) => line.row!),
      existing
    );
    const matchByIndex = new Map(valid.map((line, i) => [line.index, matches[i]]));
    const matchedIds = new Set(matches.flatMap((m) => (m.kind === "new" ? [] : [m.flight.id])));
    return {
      status: "success",
      result: {
        rows: read.map((line) => ({
          index: line.index,
          errors: line.errors,
          match: matchByIndex.get(line.index) ?? null,
        })),
        // In the sheet on the page's days but not on the page: on the next
        // page, or an extra row in the sheet
        notOnPage: existing.filter((flight) => !matchedIds.has(flight.id)),
      },
    };
  } catch (error) {
    console.error("Error previewing paper page:", errorText(error));
    return { status: "error", error: "Sivun tarkistus epäonnistui" };
  }
}

const paperDecisionSchema = z.object({
  index: z.number().int().min(0),
  action: z.enum(["new", "confirm", "correct", "skip"]),
  id: z.uuid().nullable(),
  inputHash: z.string().max(64).nullable(),
});

const savePaperPageSchema = paperPageSchema.extend({
  decisions: z.array(paperDecisionSchema).max(60),
});

const toSheetInput = (row: PaperRow, id: string) => ({
  id,
  flightDate: row.flightDate,
  picName: row.picName,
  secondName: row.secondName,
  personsOnBoard: row.personsOnBoard,
  departure: row.departure,
  arrival: row.arrival,
  takeoff: row.takeoff,
  landing: row.landing,
  landings: row.landings,
  purposeCode: row.purposeCode,
  fuelLitres: null,
  oilQuarts: null,
  hourMeter: null,
  remarks: row.remarks,
});

/**
 * Admin: write a checked page of the paper book into the sheet. New lines are
 * appended, lines a pilot already entered are confirmed or corrected to match
 * the paper, and every flight of the page gets Tila Tarkistettu and the page
 * number.
 */
export async function savePaperPage(
  input: z.input<typeof savePaperPageSchema>
): Promise<ActionResult<{ added: number; confirmed: number; corrected: number }>> {
  const access = await requireFlightLogAdmin();
  if ("error" in access) {
    return { status: "error", error: access.error };
  }
  const parsed = savePaperPageSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0].message };
  }
  const { registration, logPage, grid, decisions } = parsed.data;

  const page: PaperPageWrite = { append: [], corrections: [], confirms: [], logPage: logPage || null };
  // The review log gets a line for every flight of the page
  const notes = new Map<string, string>();
  const pageLabel = page.logPage ? `Paperisivu ${page.logPage}` : "Paperisivu";
  let error: string | null = null;
  try {
    const read = await readPage(grid);
    const broken = read.find((line) => !line.row);
    if (broken) {
      return { status: "error", error: `Rivi ${broken.index + 1}: ${broken.errors[0]}` };
    }
    const byIndex = new Map(decisions.map((decision) => [decision.index, decision]));
    const inSheet = new Map(
      (
        await getFlightsOnDates(registration, [...new Set(read.map((line) => line.row!.flightDate))])
      ).map((flight) => [flight.id, flight])
    );
    for (const line of read) {
      const decision = byIndex.get(line.index);
      if (!decision) {
        return { status: "error", error: "Sivu on muuttunut. Tarkista se uudelleen ennen tallennusta." };
      }
      if (decision.action === "new") {
        const id = randomUUID();
        page.append.push(toSheetInput(line.row!, id));
        notes.set(id, `${pageLabel}, uusi`);
      } else if (decision.action !== "skip") {
        if (!decision.id) {
          return { status: "error", error: `Rivi ${line.index + 1}: taulukon riviä ei ole valittu` };
        }
        const matched = { id: decision.id, inputHash: decision.inputHash };
        if (decision.action === "confirm") {
          page.confirms.push(matched);
          notes.set(decision.id, `${pageLabel}, sama`);
        } else {
          page.corrections.push({ ...matched, input: toSheetInput(line.row!, decision.id) });
          const before = inSheet.get(decision.id);
          const changed = before ? describeDifferences(line.row!, before) : [];
          notes.set(
            decision.id,
            `${pageLabel}, korjattu${changed.length > 0 ? `: ${changed.join(", ")}` : ""}`
          );
        }
      }
    }
    if (page.append.length + page.confirms.length + page.corrections.length === 0) {
      return { status: "error", error: "Sivulla ei ole tallennettavaa" };
    }

    const { matched } = await writePaperPage(registration, page);
    const previous = new Map(matched.map((m) => [m.id, m.oldStatus]));
    await pool.query(
      `INSERT INTO flight_status_changes
         (flight_id, registration, old_status, new_status, changed_by, note)
       SELECT c.id, $2, NULLIF(c.old_status, ''), 'Tarkistettu', $3, c.note
       FROM jsonb_to_recordset($1::jsonb) AS c(id uuid, old_status text, note text)`,
      [
        JSON.stringify(
          [...notes].map(([id, note]) => ({ id, old_status: previous.get(id) ?? null, note }))
        ),
        registration,
        access.user.id,
      ]
    );
  } catch (caught) {
    console.error("Error saving paper page:", errorText(caught));
    error =
      caught instanceof FlightSheetWriteError
        ? caught.message
        : "Sivun tallennus epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.";
  }

  await syncFlightSheets(access.user.fullName || "ylläpito", { wait: true });
  revalidatePath("/admin/lennot");
  revalidatePath("/jasenalue/lentopaivakirja");
  if (error) {
    return { status: "error", error };
  }
  return {
    status: "success",
    result: {
      added: page.append.length,
      confirmed: page.confirms.length,
      corrected: page.corrections.length,
    },
  };
}
