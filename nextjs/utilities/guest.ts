/**
 * Guest booking utilities
 * Handles bookings for unauthenticated users
 */

import pool from "./db";

export interface GuestContactInfo {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface GuestBookingData {
  plane: string;
  startTime: string;
  endTime: string;
  type: string;
  title: string;
  description: string;
}

export interface CreateGuestBookingParams {
  bookingData: GuestBookingData;
  contactInfo: GuestContactInfo;
}

/**
 * System guest user email
 * This user is created during database initialization
 */
const GUEST_USER_EMAIL = "vieras@savonlinnanlentokerho.fi";

/**
 * Create a booking for a guest user (unauthenticated)
 * Guest bookings are linked to a system guest user and store contact info separately
 */
export async function createGuestBooking({
  bookingData,
  contactInfo,
}: CreateGuestBookingParams) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get system guest user (should always exist from seed data)
    const guestResult = await client.query(
      "SELECT id FROM users WHERE email = $1 AND role = 'guest' LIMIT 1",
      [GUEST_USER_EMAIL]
    );

    if (guestResult.rows.length === 0) {
      throw new Error("System guest user not found. Please check database initialization.");
    }

    const guestId = guestResult.rows[0].id;

    // Create booking with guest user
    // Include contact name in the title for easy identification
    const bookingTitle = `${bookingData.title} (${contactInfo.contactName})`;

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        guestId,
        bookingData.plane,
        bookingData.startTime,
        bookingData.endTime,
        bookingData.type,
        bookingTitle,
        bookingData.description,
      ]
    );

    const bookingId = bookingResult.rows[0].id;

    // Store guest contact information
    await client.query(
      `INSERT INTO guest_bookings (booking_id, contact_name, contact_email, contact_phone)
       VALUES ($1, $2, $3, $4)`,
      [bookingId, contactInfo.contactName, contactInfo.contactEmail, contactInfo.contactPhone]
    );

    await client.query("COMMIT");
    return { success: true, bookingId };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Guest booking error:", error);
    return { success: false, error };
  } finally {
    client.release();
  }
}

/**
 * Get guest contact information for a booking
 * Only available to admins
 */
export async function getGuestBookingContact(bookingId: number) {
  try {
    const result = await pool.query(
      "SELECT contact_name, contact_email, contact_phone, created_at FROM guest_bookings WHERE booking_id = $1",
      [bookingId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching guest booking contact:", error);
    return null;
  }
}

/**
 * Check if a booking is a guest booking
 */
export async function isGuestBooking(bookingId: number): Promise<boolean> {
  try {
    const result = await pool.query(
      "SELECT 1 FROM guest_bookings WHERE booking_id = $1",
      [bookingId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking if booking is guest booking:", error);
    return false;
  }
}

/**
 * Get all guest bookings (admin only)
 * Returns bookings with contact information
 */
export async function getAllGuestBookings() {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.plane,
        b.start_time,
        b.end_time,
        b.type,
        b.title,
        b.description,
        b.created_at,
        gb.contact_name,
        gb.contact_email,
        gb.contact_phone
       FROM bookings b
       INNER JOIN guest_bookings gb ON b.id = gb.booking_id
       ORDER BY b.start_time DESC`
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching all guest bookings:", error);
    return [];
  }
}
