"use server";
import connectionPool from "@/utilities/db";

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
  "OH-PDX",
  "OH-816",
  "OH-829",
  "OH-475",
  "OH-386",
];

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
  email?: string; // Populated from users table when fetched
  phone?: string; // Populated from users table when fetched
  type: string;
  plane: string;
  description: string;
}

interface AddBookingParams {
  user_id: string;
  plane: string;
  start_time: number | string;
  end_time: number | string;
  type: string;
  title: string;
  description: string;
}

interface UpdateBookingParams {
  id: number;
  user_id: string;
  plane: string;
  start_time: number | string;
  end_time: number | string;
  type: string;
  title: string;
  description: string;
}

/*
 * Functions
 */

export async function fetchDayBookings(
  selectedPlane: string,
  selectedDate: string
): Promise<{ status: string; result: BookingType[] | Error }> {
  try {
    if (!allowedPlaneTypes.includes(selectedPlane)) {
      console.error("Invalid plane type");
      return {
        status: "error",
        result: new Error("Invalid plane type"),
      };
    }

    if (typeof selectedDate !== "string") {
      console.error("Invalid date format");
      return {
        status: "error",
        result: new Error("Invalid date format"),
      };
    } else {
      selectedDate = new Date(selectedDate).toISOString().split("T")[0]; // Convert to YYYY-MM-DD format
    }

    try {
      // Fetch bookings for the selected plane and date
      console.log(
        "Fetching bookings for plane:",
        selectedPlane,
        "on date:",
        selectedDate
      ); // debug
      const response = await connectionPool.query(
        `SELECT b.id, b.plane, b.start_time, b.end_time, b.user_id, u.full_name, u.email, u.phone, b.type, b.title, b.description
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.plane = $1 AND b.start_time::date = $2`,
        [selectedPlane, selectedDate]
      );
      console.log("Bookings query successful"); // debug

      if (response.rowCount === 0) {
        return {
          status: "success",
          result: [],
        };
      } else {
        // Change timeformat to ISO string
        response.rows.forEach((booking: BookingType) => {
          booking.start_time = new Date(booking.start_time).toISOString();
          booking.end_time = new Date(booking.end_time).toISOString();
        });
        console.log("Bookings after formatting:", response.rows); // debug

        return {
          status: "success",
          result: response.rows,
        };
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return {
        status: "error",
        result: error,
      };
    }
  } catch (error) {
    console.error("Error occurred:", error);
    throw error;
  }
}

export async function addRepeatingBookings({
  user_id,
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
  repeat_end_date,
}: AddBookingParams & { repeat_end_date: string }): Promise<{ status: string; data: null | Error; count?: number }> {
  try {
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    if (typeof user_id !== "string") {
      throw new Error("Invalid user ID");
    }

    // Parse dates
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    const repeatEndDate = new Date(repeat_end_date);

    if (startDate >= endDate) {
      throw new Error("Invalid time range");
    }

    if (repeatEndDate <= startDate) {
      throw new Error("Repeat end date must be after start date");
    }

    // Get the time of day for the booking
    const bookingStartHour = startDate.getHours();
    const bookingStartMinute = startDate.getMinutes();
    const bookingDurationMs = endDate.getTime() - startDate.getTime();

    let currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    const normalizedEndDate = new Date(repeatEndDate);
    normalizedEndDate.setHours(23, 59, 59, 999); // Set to end of day to include the full last day

    let bookingsCreated = 0;

    try {
      // Create a booking for each day (inclusive of end date)
      while (currentDate <= normalizedEndDate) {
        const dayStart = new Date(currentDate);
        dayStart.setHours(bookingStartHour, bookingStartMinute, 0, 0);

        const dayEnd = new Date(dayStart.getTime() + bookingDurationMs);

        await connectionPool.query(
          "INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [user_id, plane, dayStart.toISOString(), dayEnd.toISOString(), type, title, description]
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

export async function addBooking({
  user_id,
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
}: AddBookingParams): Promise<{ status: string; data: null | Error }> {
  try {
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    if (typeof start_time !== "number" || typeof end_time !== "number") {
      const start = new Date(start_time).getTime() / 1000;
      const end = new Date(end_time).getTime() / 1000;

      if (start >= end) {
        throw new Error("Invalid time range");
      }
    } else {
      throw new Error("Invalid time format");
    }

    if (typeof user_id !== "string") {
      throw new Error("Invalid user ID");
    }

    try {
      await connectionPool.query(
        "INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [user_id, plane, start_time, end_time, type, title, description]
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
  user_id,
  plane,
  start_time,
  end_time,
  type,
  title,
  description,
}: UpdateBookingParams): Promise<{ status: string; data: BookingType | Error }> {
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

    if (typeof start_time !== "number" || typeof end_time !== "number") {
      const start = new Date(start_time).getTime() / 1000;
      const end = new Date(end_time).getTime() / 1000;

      if (start >= end) {
        throw new Error("Invalid time range");
      }
    } else {
      throw new Error("Invalid time format");
    }

    if (typeof user_id !== "string") {
      throw new Error("Invalid user ID");
    }

    try {
      // Update booking in database
      const response = await connectionPool.query(
        `UPDATE bookings
         SET plane = $1, start_time = $2, end_time = $3, type = $4, title = $5, description = $6
         WHERE id = $7 AND user_id = $8
         RETURNING id, user_id, plane, start_time, end_time, type, title, description`,
        [plane, start_time, end_time, type, title, description, id, user_id]
      );

      if (response.rowCount === 0) {
        return {
          status: "error",
          data: new Error("Booking not found or unauthorized"),
        };
      }

      // Format timestamps to ISO string
      const updatedBooking = response.rows[0];
      updatedBooking.start_time = new Date(updatedBooking.start_time).toISOString();
      updatedBooking.end_time = new Date(updatedBooking.end_time).toISOString();

      // Fetch user details from users table
      const userResponse = await connectionPool.query(
        "SELECT full_name, email, phone FROM users WHERE id = $1",
        [user_id]
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
  bookingId: number,
  userId: string,
  userRole?: string
): Promise<{ status: string; result: null | Error }> {
  try {
    if (typeof bookingId !== "number") {
      throw new Error("Invalid booking ID");
    }

    if (typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }

    try {
      // Admin can delete any booking, regular users can only delete their own
      const query = userRole === "admin"
        ? "DELETE FROM bookings WHERE id = $1"
        : "DELETE FROM bookings WHERE id = $1 AND user_id = $2";

      const params = userRole === "admin" ? [bookingId] : [bookingId, userId];

      const result = await connectionPool.query(query, params);

      if (result.rowCount === 0) {
        return {
          status: "error",
          result: new Error("Booking not found or unauthorized to delete"),
        };
      }
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
