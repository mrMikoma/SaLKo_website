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
import {
  nameKey,
  REVIEW_STATUSES,
  SHEET_ZONE,
  SheetFlightInput,
} from "@/utilities/flightSheetParser";
import { normalizeClock, sheetNameFor } from "@/utilities/flightFormInput";
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
 * they have one; otherwise "M.Meikäläinen" from their full name, or the full name,
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

const setFlightStatusSchema = z.object({
  registration: z.string().min(1),
  status: z.enum(REVIEW_STATUSES),
  flights: z
    .array(z.object({ id: z.uuid(), inputHash: z.string().max(64).nullable() }))
    .min(1, "Valitse ensin lennot")
    .max(500, "Enintään 500 lentoa kerralla"),
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

  let changes: StatusChange[] = [];
  let error: string | null = null;
  try {
    changes = await setFlightStatuses(registration, flights, status);
    if (changes.length > 0) {
      await pool.query(
        `INSERT INTO flight_status_changes (flight_id, registration, old_status, new_status, changed_by)
         SELECT c.id, $2, NULLIF(c.old_status, ''), NULLIF($3, ''), $4
         FROM jsonb_to_recordset($1::jsonb) AS c(id uuid, old_status text)`,
        [
          JSON.stringify(changes.map((c) => ({ id: c.id, old_status: c.oldStatus }))),
          registration,
          status,
          access.user.id,
        ]
      );
    }
  } catch (caught) {
    console.error("Error setting flight status:", caught);
    error =
      caught instanceof FlightSheetWriteError
        ? caught.message
        : "Tilan tallennus epäonnistui. Lentopäiväkirjan taulukkoon ei saatu yhteyttä.";
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
    console.error("Error previewing paper page:", error);
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
  oilLitres: null,
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
    console.error("Error saving paper page:", caught);
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
