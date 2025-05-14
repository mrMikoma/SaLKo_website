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
];

/*
 * Types
 */

interface Booking {
  id: string;
  user_id: string;
  title: string;
  start_time: number;
  end_time: number;
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

export async function fetchDayBookings(
  selectedPlane: string,
  selectedDate: string
): Promise<{ status: string; result: Booking[] | Error }> {
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
      console.log("Fetching data from database..."); // debug
      console.log("Selected plane:", selectedPlane); // debug
      console.log("Selected date:", selectedDate); // debug
      const response = await connectionPool.query(
        `SELECT b.id, b.plane, b.start_time, b.end_time, u.full_name, b.type, b.title, b.description
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.plane = $1 AND b.start_time::date = $2`,
        [selectedPlane, selectedDate]
      );
      console.log("Response from database:", response.rows); // debug
      if (response.rowCount === 0) {
        return {
          status: "success",
          result: [],
        };
      } else {
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

export async function removeBooking(
  bookingId: number
): Promise<{ status: string; result: null | Error }> {
  try {
    if (typeof bookingId !== "number") {
      throw new Error("Invalid booking ID");
    }

    try {
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

// This function arranges bookings into columns if there are overlapping bookings
// It takes an array of bookings and returns a 2D array of bookings
// Each inner array represents a column of bookings
// The function assumes that the bookings are sorted by start_time
// If there are overlapping bookings, they will be arranged into separate columns
export async function arrangeBookingsColumns(
  bookings: Booking[]
): Promise<Booking[][]> {
  const columns: Booking[][] = [];
  const sortedBookings = bookings.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (const booking of sortedBookings) {
    let placed = false;

    for (const column of columns) {
      const lastBooking = column[column.length - 1];

      if (
        new Date(booking.start_time).getTime() >=
          new Date(lastBooking.end_time).getTime() ||
        new Date(booking.end_time).getTime() <=
          new Date(lastBooking.start_time).getTime()
      ) {
        column.push(booking);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([booking]);
    }
  }

  return columns;
}
