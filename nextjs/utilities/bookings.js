"use server";
import connectionPool from "@/utilities/db";

/*
 * Allowed types
 */

const allowedFlightTypes = [
  "local",
  "trip",
  "training",
  "maintenance",
  "fire",
  "other",
];
const allowedPlaneTypes = [
  "OH-CON",
  "OH-SEE",
  "OH-PDX",
  "OH-816",
  "OH-829",
  "OH-475",
];

/*
 * Fetch day bookings
 */

export async function fetchDayBookings(selectedPlane, selectedDate) {
  try {
    let data = [];

    if (!allowedPlaneTypes.includes(selectedPlane)) {
      throw new Error("Invalid plane type");
    }

    if (typeof selectedDate !== "string") {
      throw new Error("Invalid date");
    } else {
      selectedDate = new Date(selectedDate).getTime() / 1000;
    }

    try {
      const response = await connectionPool.query(
        "SELECT * FROM bookings WHERE plane = $1 AND start_time >= $2 AND end_time <= $3",
        [selectedPlane, selectedDate, selectedDate + 86400]
      );
      data = response.rows;
    } catch (error) {
      console.error("Error fetching data:", error);
      return {
        status: "error",
        result: error,
      };
    }

    if (data.length > 0) {
      data = data.map((booking) => {
        return {
          Id: booking.id,
          plane: booking.plane,
          startTime: booking.start_time,
          endTime: booking.end_time,
          userId: booking.userId,
          type: booking.type,
          title: booking.title,
          description: booking.description,
        };
      });
    } else {
      data = [];
    }
    return {
      status: "success",
      result: data,
    };
  } catch (error) {
    console.error("Error occured:", error);
    throw error;
  }
}

/*
 * Add new booking
 */

export async function addBooking({
  userId,
  plane,
  startTime,
  endTime,
  type,
  title,
  description,
}) {
  try {
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      const start = new Date(startTime).getTime() / 1000;
      const end = new Date(endTime).getTime() / 1000;

      if (start >= end) {
        throw new Error("Invalid time range");
      }
    } else {
      throw new Error("Invalid time format");
    }

    if (typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }

    try {
      await connectionPool.query(
        "INSERT INTO bookings (user_id, plane, start_time, end_time, type, title, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [userId, plane, startTime, endTime, type, title, description]
      );
    } catch (error) {
      console.error("Error inserting data:", error);
      return {
        status: "error",
        result: error,
      };
    }
    return {
      status: "success",
      data: null,
    };
  } catch (error) {
    console.error("Error occured:", error);
    throw error;
  }
}

/*
 * Remove booking
 */

export async function removeBooking(bookingId) {
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
    console.error("Error occured:", error);
    throw error;
  }
}
