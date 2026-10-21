"use server";
import connectionPool from "@/utilities/db";
import { auth } from "@/auth";
import {
  hasPermission,
  canManageBooking,
  canDeleteBooking,
} from "@/utilities/roles";
import { DateTime, CLUB_ZONE } from "@/utilities/clubTime";
import { isBookablePlane } from "@/utilities/planeHelpers";
import {
  bookingInputSchema,
  guestContactSchema,
  repeatEndDateSchema,
  type BookingInput,
  type GuestContactInput,
} from "@/schemas/bookingSchema";

/*
 * Types
 */

export interface BookingType {
  id: number;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  full_name: string;
  email?: string; // Booker's email, logged-in viewers only
  phone?: string; // Booker's phone, logged-in viewers only
  type: string;
  plane: string;
  description: string;
  repeat_group_id?: string; // UUID to group repeating bookings together
  is_guest?: boolean; // True if this is a guest booking
  guest_contact_name?: string; // Members and admins only
  guest_contact_email?: string; // Admins only (VIEW_BOOKING_CONTACT_INFO)
  guest_contact_phone?: string; // Admins only (VIEW_BOOKING_CONTACT_INFO)
}

// Another booking on the same aircraft at an overlapping time. Anonymous
// visitors only learn when the aircraft is taken, not by whom.
export interface BookingConflict {
  id: number;
  plane: string;
  start_time: string;
  end_time: string;
  title: string;
  booker: string;
}

export type BookingResult<T = null> =
  | { status: "success"; result: T }
  | { status: "conflict"; conflicts: BookingConflict[] }
  | { status: "error"; error: string };

export interface BookingWriteOptions {
  // Save even though the aircraft is already booked (the user saw the warning)
  allowOverlap?: boolean;
}

/*
 * Helpers
 */

interface SessionUser {
  id: string;
  roles: string[];
}

// Identity always comes from the session, never from the caller's arguments
async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return { id: session.user.id, roles: session.user.roles ?? [] };
}

const MAX_REPEAT_DAYS = 366;
const MAX_FETCH_DAYS = 62;
const GUEST_USER_EMAIL = "vieras@savonlinnanlentokerho.fi";
const NOT_FOUND_OR_FORBIDDEN =
  "Varausta ei löytynyt tai sinulla ei ole oikeutta muuttaa sitä";

interface Slot {
  start: string;
  end: string;
}

const toIso = (value: Date | string): string => new Date(value).toISOString();

function parseBooking(
  input: unknown
): { booking: BookingInput } | { error: string } {
  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Virheelliset varaustiedot" };
  }
  return { booking: parsed.data };
}

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id >= 0;
}

/**
 * One slot per day, from the first booking's day up to and including the
 * repeat end date, at the same club-time hours each day so that DST changes
 * don't shift the series. An end at or before the start crosses midnight.
 */
function buildRepeatSlots(
  startIso: string,
  endIso: string,
  repeatEndDate: string
): Slot[] | string {
  const first = DateTime.fromISO(startIso, { zone: CLUB_ZONE });
  const firstEnd = DateTime.fromISO(endIso, { zone: CLUB_ZONE });
  const firstDay = first.startOf("day");
  const lastDay = DateTime.fromISO(repeatEndDate, { zone: CLUB_ZONE }).startOf("day");

  if (lastDay <= firstDay) {
    return "Toiston lopetuspäivän tulee olla aloituspäivän jälkeen";
  }
  if (lastDay.diff(firstDay, "days").days > MAX_REPEAT_DAYS) {
    return `Toistuva varaus voi kestää enintään ${MAX_REPEAT_DAYS} päivää`;
  }

  const slots: Slot[] = [];
  for (let day = firstDay; day <= lastDay; day = day.plus({ days: 1 })) {
    const start = day.set({ hour: first.hour, minute: first.minute });
    let end = day.set({ hour: firstEnd.hour, minute: firstEnd.minute });
    if (end <= start) {
      end = end.plus({ days: 1 });
    }
    slots.push({ start: start.toUTC().toISO(), end: end.toUTC().toISO() });
  }
  return slots;
}

async function findConflicts(
  plane: string,
  slots: Slot[],
  viewer: SessionUser | null,
  excludeId?: number
): Promise<BookingConflict[]> {
  const response = await connectionPool.query(
    `SELECT DISTINCT b.id, b.plane, b.start_time, b.end_time, b.title,
            u.full_name, gb.contact_name
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     LEFT JOIN guest_bookings gb ON gb.booking_id = b.id
     JOIN unnest($2::timestamptz[], $3::timestamptz[]) AS slot(start_at, end_at)
       ON b.start_time < slot.end_at AND b.end_time > slot.start_at
     WHERE b.plane = $1 AND ($4::int IS NULL OR b.id <> $4)
     ORDER BY b.start_time
     LIMIT 20`,
    [
      plane,
      slots.map((slot) => slot.start),
      slots.map((slot) => slot.end),
      excludeId ?? null,
    ]
  );

  return response.rows.map((row) => ({
    id: row.id,
    plane: row.plane,
    start_time: toIso(row.start_time),
    end_time: toIso(row.end_time),
    title: viewer ? row.title : "Varattu",
    booker: viewer ? row.contact_name ?? row.full_name : "",
  }));
}

/*
 * Reads
 */

/**
 * Fetches bookings for multiple planes across a date range in one query
 * (month view: 35 days × 5 planes). Dates are club-time days, YYYY-MM-DD,
 * both inclusive; multi-day bookings that overlap the range are included.
 *
 * What each booking reveals depends on the viewer: anonymous visitors only see
 * that the aircraft is taken, logged-in members see who booked it, why and how
 * to reach them, and only VIEW_BOOKING_CONTACT_INFO sees guest contact details.
 */
export async function fetchBookingsForDateRange(
  planes: string[],
  startDate: string,
  endDate: string
): Promise<BookingResult<BookingType[]>> {
  if (!Array.isArray(planes) || planes.length === 0 || !planes.every(isBookablePlane)) {
    return { status: "error", error: "Virheellinen lentokone" };
  }

  const rangeStart = DateTime.fromISO(startDate, { zone: CLUB_ZONE }).startOf("day");
  const rangeEnd = DateTime.fromISO(endDate, { zone: CLUB_ZONE })
    .plus({ days: 1 })
    .startOf("day");
  if (!rangeStart.isValid || !rangeEnd.isValid || rangeEnd <= rangeStart) {
    return { status: "error", error: "Virheellinen aikaväli" };
  }
  if (rangeEnd.diff(rangeStart, "days").days > MAX_FETCH_DAYS) {
    return { status: "error", error: "Liian pitkä aikaväli" };
  }

  try {
    const viewer = await getSessionUser();
    const canViewContactInfo =
      viewer !== null &&
      hasPermission(viewer.roles, "VIEW_BOOKING_CONTACT_INFO");

    const response = await connectionPool.query(
      `SELECT
         b.id, b.plane, b.start_time, b.end_time, b.user_id,
         u.full_name, u.email, u.phone,
         b.type, b.title, b.description, b.repeat_group_id,
         gb.contact_name as guest_contact_name,
         gb.contact_email as guest_contact_email,
         gb.contact_phone as guest_contact_phone,
         CASE WHEN gb.booking_id IS NOT NULL THEN true ELSE false END as is_guest
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN guest_bookings gb ON b.id = gb.booking_id
       WHERE
         b.plane = ANY($1)
         AND b.start_time < $3
         AND b.end_time > $2
       ORDER BY b.plane, b.start_time`,
      [planes, rangeStart.toUTC().toISO(), rangeEnd.toUTC().toISO()]
    );

    // Build each booking from an allowlist of fields for the viewer's access level
    const bookings: BookingType[] = response.rows.map((row) => {
      const start_time = toIso(row.start_time);
      const end_time = toIso(row.end_time);

      if (!viewer) {
        return {
          id: row.id,
          user_id: "",
          title: "Varattu",
          start_time,
          end_time,
          full_name: "",
          type: row.type,
          plane: row.plane,
          description: "",
          is_guest: row.is_guest,
        };
      }

      const booking: BookingType = {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        start_time,
        end_time,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        type: row.type,
        plane: row.plane,
        description: row.description,
        repeat_group_id: row.repeat_group_id,
        is_guest: row.is_guest,
        guest_contact_name: row.guest_contact_name,
      };

      if (canViewContactInfo) {
        booking.guest_contact_email = row.guest_contact_email;
        booking.guest_contact_phone = row.guest_contact_phone;
      }

      return booking;
    });

    return { status: "success", result: bookings };
  } catch (error) {
    console.error("Error fetching bookings for date range:", error);
    return { status: "error", error: "Varausten haku epäonnistui" };
  }
}

/*
 * Writes
 */

export async function addBooking(
  input: BookingInput,
  options: BookingWriteOptions = {}
): Promise<BookingResult<{ id: number }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "CREATE_OWN_BOOKING")) {
    return { status: "error", error: "Kirjaudu sisään tehdäksesi varauksen" };
  }

  const parsed = parseBooking(input);
  if ("error" in parsed) {
    return { status: "error", error: parsed.error };
  }
  const { booking } = parsed;

  try {
    if (!options.allowOverlap) {
      const conflicts = await findConflicts(
        booking.plane,
        [{ start: booking.start_time, end: booking.end_time }],
        user
      );
      if (conflicts.length > 0) {
        return { status: "conflict", conflicts };
      }
    }

    const response = await connectionPool.query(
      `INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        user.id,
        booking.plane,
        booking.start_time,
        booking.end_time,
        booking.type,
        booking.title,
        booking.description ?? "",
      ]
    );

    return { status: "success", result: { id: response.rows[0].id } };
  } catch (error) {
    console.error("Error adding booking:", error);
    return { status: "error", error: "Varauksen tallennus epäonnistui" };
  }
}

export async function addRepeatingBookings(
  input: BookingInput,
  repeatEndDate: string,
  options: BookingWriteOptions = {}
): Promise<BookingResult<{ count: number }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "CREATE_OWN_BOOKING")) {
    return {
      status: "error",
      error: "Kirjaudu sisään tehdäksesi toistuvan varauksen",
    };
  }

  const parsed = parseBooking(input);
  if ("error" in parsed) {
    return { status: "error", error: parsed.error };
  }
  const { booking } = parsed;

  const parsedEndDate = repeatEndDateSchema.safeParse(repeatEndDate);
  if (!parsedEndDate.success) {
    return { status: "error", error: parsedEndDate.error.issues[0].message };
  }

  const slots = buildRepeatSlots(
    booking.start_time,
    booking.end_time,
    parsedEndDate.data
  );
  if (typeof slots === "string") {
    return { status: "error", error: slots };
  }

  const client = await connectionPool.connect();
  try {
    if (!options.allowOverlap) {
      const conflicts = await findConflicts(booking.plane, slots, user);
      if (conflicts.length > 0) {
        return { status: "conflict", conflicts };
      }
    }

    // The whole series is saved or none of it
    await client.query("BEGIN");
    const repeatGroupId = crypto.randomUUID();
    await client.query(
      `INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description, repeat_group_id)
       SELECT $1, $2, slot.start_at, slot.end_at, $5, $6, $7, $8
       FROM unnest($3::timestamptz[], $4::timestamptz[]) AS slot(start_at, end_at)`,
      [
        user.id,
        booking.plane,
        slots.map((slot) => slot.start),
        slots.map((slot) => slot.end),
        booking.type,
        booking.title,
        booking.description ?? "",
        repeatGroupId,
      ]
    );
    await client.query("COMMIT");

    return { status: "success", result: { count: slots.length } };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error adding repeating bookings:", error);
    return { status: "error", error: "Toistuvan varauksen tallennus epäonnistui" };
  } finally {
    client.release();
  }
}

// Open to anonymous visitors on purpose: guests can create bookings, but never
// view, update or delete them afterwards
export async function addGuestBooking(
  input: BookingInput,
  contactInfo: GuestContactInput,
  options: BookingWriteOptions = {}
): Promise<BookingResult<{ id: number }>> {
  const parsed = parseBooking(input);
  if ("error" in parsed) {
    return { status: "error", error: parsed.error };
  }
  const { booking } = parsed;

  const contact = guestContactSchema.safeParse(contactInfo);
  if (!contact.success) {
    return { status: "error", error: contact.error.issues[0].message };
  }

  const client = await connectionPool.connect();
  try {
    if (!options.allowOverlap) {
      const conflicts = await findConflicts(
        booking.plane,
        [{ start: booking.start_time, end: booking.end_time }],
        null
      );
      if (conflicts.length > 0) {
        return { status: "conflict", conflicts };
      }
    }

    await client.query("BEGIN");

    const guestResult = await client.query(
      "SELECT id FROM users WHERE email = $1 AND 'guest' = ANY(roles) LIMIT 1",
      [GUEST_USER_EMAIL]
    );
    if (guestResult.rows.length === 0) {
      throw new Error("System guest user not found");
    }

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        guestResult.rows[0].id,
        booking.plane,
        booking.start_time,
        booking.end_time,
        booking.type,
        `${booking.title} (${contact.data.contactName})`,
        booking.description ?? "",
      ]
    );
    const bookingId = bookingResult.rows[0].id;

    await client.query(
      `INSERT INTO guest_bookings (booking_id, contact_name, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)`,
      [
        bookingId,
        contact.data.contactName,
        contact.data.contactEmail,
        contact.data.contactPhone,
      ]
    );

    await client.query("COMMIT");
    return { status: "success", result: { id: bookingId } };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating guest booking:", error);
    return { status: "error", error: "Vierasvarauksen tallennus epäonnistui" };
  } finally {
    client.release();
  }
}

export async function updateBooking(
  id: number,
  input: BookingInput,
  options: BookingWriteOptions = {}
): Promise<BookingResult<{ id: number }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "EDIT_OWN_BOOKING")) {
    return { status: "error", error: "Ei oikeuksia muokata varausta" };
  }
  if (!isValidId(id)) {
    return { status: "error", error: NOT_FOUND_OR_FORBIDDEN };
  }

  const parsed = parseBooking(input);
  if ("error" in parsed) {
    return { status: "error", error: parsed.error };
  }
  const { booking } = parsed;

  try {
    const existing = await connectionPool.query(
      "SELECT user_id FROM bookings WHERE id = $1",
      [id]
    );

    // Admins can update any booking, members only their own
    if (
      existing.rowCount === 0 ||
      !canManageBooking(user.roles, user.id, existing.rows[0].user_id)
    ) {
      return { status: "error", error: NOT_FOUND_OR_FORBIDDEN };
    }

    if (!options.allowOverlap) {
      const conflicts = await findConflicts(
        booking.plane,
        [{ start: booking.start_time, end: booking.end_time }],
        user,
        id
      );
      if (conflicts.length > 0) {
        return { status: "conflict", conflicts };
      }
    }

    await connectionPool.query(
      `UPDATE bookings
       SET plane = $1, start_time = $2, end_time = $3, type = $4, title = $5, description = $6
       WHERE id = $7`,
      [
        booking.plane,
        booking.start_time,
        booking.end_time,
        booking.type,
        booking.title,
        booking.description ?? "",
        id,
      ]
    );

    return { status: "success", result: { id } };
  } catch (error) {
    console.error("Error updating booking:", error);
    return { status: "error", error: "Varauksen päivitys epäonnistui" };
  }
}

/**
 * Removes a booking, and with deleteFollowing also the bookings after it in
 * the same repeat group
 */
export async function removeBooking(
  bookingId: number,
  deleteFollowing: boolean = false
): Promise<BookingResult<{ deletedCount: number }>> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "DELETE_OWN_BOOKING")) {
    return { status: "error", error: "Ei oikeuksia poistaa varausta" };
  }
  if (!isValidId(bookingId)) {
    return { status: "error", error: NOT_FOUND_OR_FORBIDDEN };
  }

  try {
    const existing = await connectionPool.query(
      "SELECT repeat_group_id, start_time, user_id FROM bookings WHERE id = $1",
      [bookingId]
    );

    // Admins can delete any booking, members only their own
    if (
      existing.rowCount === 0 ||
      !canDeleteBooking(user.roles, user.id, existing.rows[0].user_id)
    ) {
      return { status: "error", error: NOT_FOUND_OR_FORBIDDEN };
    }

    const booking = existing.rows[0];
    let response;

    if (deleteFollowing && booking.repeat_group_id) {
      // Members only remove their own bookings from the series
      response = hasPermission(user.roles, "DELETE_ANY_BOOKING")
        ? await connectionPool.query(
            "DELETE FROM bookings WHERE repeat_group_id = $1 AND start_time >= $2",
            [booking.repeat_group_id, booking.start_time]
          )
        : await connectionPool.query(
            "DELETE FROM bookings WHERE repeat_group_id = $1 AND start_time >= $2 AND user_id = $3",
            [booking.repeat_group_id, booking.start_time, user.id]
          );
    } else {
      response = await connectionPool.query(
        "DELETE FROM bookings WHERE id = $1",
        [bookingId]
      );
    }

    return { status: "success", result: { deletedCount: response.rowCount ?? 0 } };
  } catch (error) {
    console.error("Error removing booking:", error);
    return { status: "error", error: "Varauksen poisto epäonnistui" };
  }
}
