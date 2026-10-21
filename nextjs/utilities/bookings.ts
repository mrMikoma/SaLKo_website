"use server";
import connectionPool from "@/utilities/db";
import { auth } from "@/auth";
import {
  hasPermission,
  canManageBooking,
  canDeleteBooking,
} from "@/utilities/roles";

/*
 * Session helpers
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

/*
 * Allowed types
 */

const allowedFlightTypes: string[] = [
  "local",
  "trip",
  "training",
  "maintenance",
  "fire",
  "other",
];

const allowedPlaneTypes: string[] = [
  "OH-CON",
  "OH-816",
  "OH-829",
  "OH-475",
  "OH-386",
];

/**
 * Validates booking times to ensure they are on hour boundaries and at least 1 hour apart
 */
function validateBookingTimes(
  start_time: string | number,
  end_time: string | number
): void {
  if (typeof start_time === "number" || typeof end_time === "number") {
    throw new Error("Invalid time format");
  }

  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  const start = startDate.getTime() / 1000;
  const end = endDate.getTime() / 1000;

  if (start >= end) {
    throw new Error("Invalid time range");
  }

  // Enforce hour boundaries (minutes and seconds must be 0)
  if (startDate.getMinutes() !== 0 || startDate.getSeconds() !== 0) {
    throw new Error("Start time must be on the hour (e.g., 10:00)");
  }
  if (endDate.getMinutes() !== 0 || endDate.getSeconds() !== 0) {
    throw new Error("End time must be on the hour (e.g., 11:00)");
  }

  // Enforce minimum 1 hour duration
  const durationHours = (end - start) / 3600;
  if (durationHours < 1) {
    throw new Error("Booking must be at least 1 hour long");
  }
}

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

interface AddBookingParams {
  plane: string;
  start_time: number | string;
  end_time: number | string;
  type: string;
  title: string;
  description: string;
}

interface UpdateBookingParams {
  id: number;
  plane: string;
  start_time: number | string;
  end_time: number | string;
  type: string;
  title: string;
  description: string;
}

interface GuestContactInfo {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

interface AddGuestBookingParams {
  plane: string;
  start_time: number | string;
  end_time: number | string;
  type: string;
  title: string;
  description: string;
  contactInfo: GuestContactInfo;
}

/*
 * Functions
 */

/**
 * Fetches bookings for multiple planes across a date range
 * Optimized for calendar views (month/week/day)
 *
 * This function consolidates what would normally be N×M queries (N dates × M planes)
 * into a single optimized query using:
 * - ANY($1) for multiple planes
 * - Range comparison instead of ::date cast for index usage
 * - Overlap detection for multi-day bookings
 *
 * What each booking reveals depends on the viewer: anonymous visitors only see
 * that the aircraft is taken, logged-in members see who booked it, why and how
 * to reach them, and only VIEW_BOOKING_CONTACT_INFO sees guest contact details.
 *
 * @param planes - Array of plane identifiers (e.g., ['OH-CON', 'OH-816'])
 * @param startDate - ISO date string (start of range, inclusive) - YYYY-MM-DD format
 * @param endDate - ISO date string (end of range, inclusive) - YYYY-MM-DD format
 * @returns Promise with bookings array or error
 *
 * Performance: Month view (35 days × 6 planes) = 210 queries → 1 query (99.5% reduction)
 */
export async function fetchBookingsForDateRange(
  planes: string[],
  startDate: string,
  endDate: string
): Promise<{ status: string; result: BookingType[] | Error }> {
  try {
    // Validate inputs
    if (!Array.isArray(planes) || planes.length === 0) {
      throw new Error("Invalid planes array");
    }

    const invalidPlanes = planes.filter(p => !allowedPlaneTypes.includes(p));
    if (invalidPlanes.length > 0) {
      throw new Error(`Invalid plane types: ${invalidPlanes.join(', ')}`);
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format");
    }
    if (start > end) {
      throw new Error("Start date must be before or equal to end date");
    }

    const viewer = await getSessionUser();
    const canViewContactInfo =
      viewer !== null &&
      hasPermission(viewer.roles, "VIEW_BOOKING_CONTACT_INFO");

    // Normalize to full day ranges in UTC
    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log(`Fetching bookings for ${planes.length} planes from ${startDate} to ${endDate}`);

    // OPTIMIZED QUERY: Fetches all planes and dates in one query
    // Uses timestamp range comparison instead of ::date cast for index usage
    // Handles multi-day bookings with overlap detection:
    //   - Booking starts before range end (start_time <= endOfDay)
    //   - Booking ends after range start (end_time >= startOfDay)
    const query = `
      SELECT
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
        AND b.start_time <= $3
        AND b.end_time >= $2
      ORDER BY b.plane, b.start_time
    `;

    const response = await connectionPool.query(query, [
      planes,
      startOfDay.toISOString(),
      endOfDay.toISOString(),
    ]);

    console.log(`Fetched ${response.rowCount} bookings in single bulk query`);

    // Build each booking from an allowlist of fields for the viewer's access level
    const bookings: BookingType[] = response.rows.map((row) => {
      const start_time = new Date(row.start_time).toISOString();
      const end_time = new Date(row.end_time).toISOString();

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
    return {
      status: "error",
      result: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function addRepeatingBookings({
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
  repeat_end_date,
}: AddBookingParams & { repeat_end_date: string }): Promise<{
  status: string;
  data: null | Error;
  count?: number;
}> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "CREATE_OWN_BOOKING")) {
    return {
      status: "error",
      data: new Error("Kirjaudu sisään tehdäksesi toistuvan varauksen"),
    };
  }

  try {
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    // Validate time format, range, hour boundaries, and minimum duration
    validateBookingTimes(start_time, end_time);

    // Parse dates
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const repeatEndDate = new Date(repeat_end_date);

    if (isNaN(repeatEndDate.getTime()) || repeatEndDate <= startDate) {
      throw new Error("Repeat end date must be after start date");
    }

    const repeatDays =
      (repeatEndDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    if (repeatDays > MAX_REPEAT_DAYS) {
      throw new Error(`Repeat period can be at most ${MAX_REPEAT_DAYS} days`);
    }

    // Get the time of day for the booking (local hours/minutes, same for every repeated day)
    const bookingStartHour = startDate.getHours();
    const bookingStartMinute = startDate.getMinutes();
    const bookingEndHour = endDate.getHours();
    const bookingEndMinute = endDate.getMinutes();

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    const normalizedEndDate = new Date(repeatEndDate);
    normalizedEndDate.setHours(23, 59, 59, 999); // Set to end of day to include the full last day

    let bookingsCreated = 0;

    // Generate a unique repeat_group_id for this series of repeating bookings
    const repeatGroupId = crypto.randomUUID();

    try {
      // Create a booking for each day (inclusive of end date)
      while (currentDate <= normalizedEndDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(bookingStartHour, bookingStartMinute, 0, 0);

        // Compute per-day end using only the time-of-day from the original end_time.
        // This ensures each repeated booking spans one day regardless of whether the
        // user entered start and end on different dates.
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(bookingEndHour, bookingEndMinute, 0, 0);
        if (dayEnd <= dayStart) {
          // End time is before or equal to start time on the same day (e.g. crosses midnight)
          dayEnd.setDate(dayEnd.getDate() + 1);
        }

        await connectionPool.query(
          "INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description, repeat_group_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            user.id,
            plane,
            dayStart.toISOString(),
            dayEnd.toISOString(),
            type,
            title,
            description,
            repeatGroupId,
          ]
        );

        bookingsCreated++;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        status: "success",
        data: null,
        count: bookingsCreated,
      };
    } catch (error) {
      console.error("Error inserting repeating bookings:", error);
      return {
        status: "error",
        data: error,
      };
    }
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

const GUEST_USER_EMAIL = "vieras@savonlinnanlentokerho.fi";

// Open to anonymous visitors on purpose: guests can create bookings, but never
// view, update or delete them afterwards
export async function addGuestBooking({
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
  contactInfo,
}: AddGuestBookingParams): Promise<{
  status: string;
  data: null | Error;
  bookingId?: number;
}> {
  const client = await connectionPool.connect();

  try {
    // Validate inputs
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    // Validate time format, range, hour boundaries, and minimum duration
    validateBookingTimes(start_time, end_time);

    // Validate contact info
    if (
      !contactInfo.contactName ||
      !contactInfo.contactEmail ||
      !contactInfo.contactPhone
    ) {
      throw new Error("Contact information is required for guest bookings");
    }

    await client.query("BEGIN");

    // Get the guest user ID
    const guestResult = await client.query(
      "SELECT id FROM users WHERE email = $1 AND 'guest' = ANY(roles) LIMIT 1",
      [GUEST_USER_EMAIL]
    );

    if (guestResult.rows.length === 0) {
      throw new Error("System guest user not found");
    }

    const guestId = guestResult.rows[0].id;

    // Create the booking with guest user ID
    const bookingTitle = `${title} (${contactInfo.contactName})`;
    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [guestId, plane, start_time, end_time, type, bookingTitle, description]
    );

    const bookingId = bookingResult.rows[0].id;

    // Insert guest contact information
    await client.query(
      `INSERT INTO guest_bookings (booking_id, contact_name, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)`,
      [
        bookingId,
        contactInfo.contactName,
        contactInfo.contactEmail,
        contactInfo.contactPhone,
      ]
    );

    await client.query("COMMIT");

    return {
      status: "success",
      data: null,
      bookingId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating guest booking:", error);
    return {
      status: "error",
      data: error,
    };
  } finally {
    client.release();
  }
}

export async function addBooking({
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
}: AddBookingParams): Promise<{ status: string; data: null | Error }> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "CREATE_OWN_BOOKING")) {
    return {
      status: "error",
      data: new Error("Kirjaudu sisään tehdäksesi varauksen"),
    };
  }

  try {
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    // Validate time format, range, hour boundaries, and minimum duration
    validateBookingTimes(start_time, end_time);

    try {
      await connectionPool.query(
        "INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [user.id, plane, start_time, end_time, type, title, description]
      );
    } catch (error) {
      console.error("Error inserting data:", error);
      return {
        status: "error",
        data: error,
      };
    }
    return {
      status: "success",
      data: null,
    };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

export async function updateBooking({
  id,
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
}: UpdateBookingParams): Promise<{
  status: string;
  data: BookingType | Error;
}> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "EDIT_OWN_BOOKING")) {
    return {
      status: "error",
      data: new Error("Ei oikeuksia muokata varausta"),
    };
  }

  try {
    // Validation
    if (typeof id !== "number" || id < 0) {
      throw new Error("Invalid booking ID");
    }

    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    // Validate time format, range, hour boundaries, and minimum duration
    validateBookingTimes(start_time, end_time);

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
        return {
          status: "error",
          data: new Error("Booking not found or unauthorized"),
        };
      }

      const response = await connectionPool.query(
        `UPDATE bookings
         SET plane = $1, start_time = $2, end_time = $3, type = $4, title = $5, description = $6
         WHERE id = $7
         RETURNING id, user_id, plane, start_time, end_time, type, title, description`,
        [plane, start_time, end_time, type, title, description, id]
      );

      if (response.rowCount === 0) {
        return {
          status: "error",
          data: new Error("Booking not found or unauthorized"),
        };
      }

      // Format timestamps to ISO string
      const updatedBooking = response.rows[0];
      updatedBooking.start_time = new Date(
        updatedBooking.start_time
      ).toISOString();
      updatedBooking.end_time = new Date(updatedBooking.end_time).toISOString();

      // Fetch user details from users table
      const userResponse = await connectionPool.query(
        "SELECT full_name, email, phone FROM users WHERE id = $1",
        [updatedBooking.user_id]
      );

      if (userResponse.rowCount > 0) {
        updatedBooking.full_name = userResponse.rows[0].full_name;
        updatedBooking.email = userResponse.rows[0].email;
        updatedBooking.phone = userResponse.rows[0].phone;
      }

      return {
        status: "success",
        data: updatedBooking,
      };
    } catch (error) {
      console.error("Error updating data:", error);
      return {
        status: "error",
        data: error,
      };
    }
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

export async function removeBooking(
  bookingId: number
): Promise<{ status: string; result: null | Error }> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "DELETE_OWN_BOOKING")) {
    return {
      status: "error",
      result: new Error("Ei oikeuksia poistaa varausta"),
    };
  }

  try {
    if (typeof bookingId !== "number") {
      throw new Error("Invalid booking ID");
    }

    try {
      const existing = await connectionPool.query(
        "SELECT user_id FROM bookings WHERE id = $1",
        [bookingId]
      );

      // Admins can delete any booking, members only their own
      if (
        existing.rowCount === 0 ||
        !canDeleteBooking(user.roles, user.id, existing.rows[0].user_id)
      ) {
        return {
          status: "error",
          result: new Error("Booking not found or unauthorized to delete"),
        };
      }

      await connectionPool.query("DELETE FROM bookings WHERE id = $1", [
        bookingId,
      ]);
    } catch (error) {
      console.error("Error removing data:", error);
      return {
        status: "error",
        result: error,
      };
    }
    return {
      status: "success",
      result: null,
    };
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

/**
 * Removes a booking and optionally all following bookings in the same repeat group
 *
 * @param bookingId - The ID of the booking to delete
 * @param deleteFollowing - If true, deletes all bookings in the same repeat group that start on or after this booking
 * @returns Promise with status and result
 */
export async function removeBookingWithRepeats(
  bookingId: number,
  deleteFollowing: boolean = false
): Promise<{ status: string; result: null | Error; deletedCount?: number }> {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.roles, "DELETE_OWN_BOOKING")) {
    return {
      status: "error",
      result: new Error("Ei oikeuksia poistaa varausta"),
    };
  }

  try {
    if (typeof bookingId !== "number") {
      throw new Error("Invalid booking ID");
    }

    const canDeleteAny = hasPermission(user.roles, "DELETE_ANY_BOOKING");

    // First, get the booking to check if it has a repeat_group_id and get its start_time
    const bookingQuery = await connectionPool.query(
      "SELECT repeat_group_id, start_time, user_id FROM bookings WHERE id = $1",
      [bookingId]
    );

    if (bookingQuery.rowCount === 0) {
      return {
        status: "error",
        result: new Error("Booking not found"),
      };
    }

    const booking = bookingQuery.rows[0];

    // Check authorization
    if (!canDeleteBooking(user.roles, user.id, booking.user_id)) {
      return {
        status: "error",
        result: new Error("Unauthorized to delete this booking"),
      };
    }

    try {
      let result;

      if (deleteFollowing && booking.repeat_group_id) {
        // Delete this booking and all following bookings in the same repeat group
        const query = canDeleteAny
          ? "DELETE FROM bookings WHERE repeat_group_id = $1 AND start_time >= $2"
          : "DELETE FROM bookings WHERE repeat_group_id = $1 AND start_time >= $2 AND user_id = $3";

        const params = canDeleteAny
          ? [booking.repeat_group_id, booking.start_time]
          : [booking.repeat_group_id, booking.start_time, user.id];

        result = await connectionPool.query(query, params);
      } else {
        // Just delete the single booking
        result = await connectionPool.query(
          "DELETE FROM bookings WHERE id = $1",
          [bookingId]
        );
      }

      if (result.rowCount === 0) {
        return {
          status: "error",
          result: new Error("Booking not found or unauthorized to delete"),
        };
      }

      return {
        status: "success",
        result: null,
        deletedCount: result.rowCount,
      };
    } catch (error) {
      console.error("Error removing booking(s):", error);
      return {
        status: "error",
        result: error instanceof Error ? error : new Error(String(error)),
      };
    }
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

export async function arrangeBookingsColumns(
  bookings: BookingType[]
): Promise<BookingType[][]> {
  // Simple column arrangement - just return bookings in a single column for now
  // This can be enhanced later to handle overlapping bookings in multiple columns
  return [bookings];
}
