"use server";

import { z } from "zod";

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
 * Stub data
 */

const stubBookingData = [
  {
    id: 1,
    plane: "OH-CON",
    startTime: 1737194400, // 2025-01-18T10:00:00Z in UNIX time
    endTime: 1737198000, // 2025-01-18T11:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt. In magna irure ipsum occaecat. Labore commodo magna qui exercitation ipsum sint et pariatur cupidatat. Pariatur cupidatat quis incididunt officia pariatur non nisi elit. Laboris reprehenderit sit laboris cupidatat aute irure dolore consequat velit consectetur reprehenderit amet.",
  },
  {
    id: 2,
    plane: "OH-SEE",
    startTime: 1737194400, // 2025-01-18T10:00:00Z in UNIX time
    endTime: 1737198000, // 2025-01-18T11:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Culpa deserunt consequat ut exercitation irure elit occaecat cillum. Do eiusmod eu culpa aliqua id elit do aliquip dolor ex et. Dolor magna deserunt non velit minim. Anim ipsum Lorem sit ipsum esse do tempor duis tempor in pariatur cillum eiusmod.",
  },
  {
    id: 3,
    plane: "OH-CON",
    startTime: 1737280800, // 2025-01-19T10:00:00Z in UNIX time
    endTime: 1737295200, // 2025-01-19T14:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolor irure cupidatat aliqua eu labore velit elit id nostrud. Mollit ex",
  },
  {
    id: 4,
    plane: "OH-SEE",
    startTime: 1737280800, // 2025-01-19T10:00:00Z in UNIX time
    endTime: 1737295200, // 2025-01-19T14:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolor irure cupidatat aliqua eu labore velit elit id nostrud. Mollit ex",
  },
  {
    id: 5,
    plane: "OH-CON",
    startTime: 1737367200, // 2025-01-20T10:00:00Z in UNIX time
    endTime: 1737370800, // 2025-01-20T11:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolor irure cupidatat aliqua eu labore velit elit id nostrud. Mollit ex",
  },
  {
    id: 6,
    plane: "OH-SEE",
    startTime: 1737367200, // 2025-01-20T10:00:00Z in UNIX time
    endTime: 1737370800, // 2025-01-20T11:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolor irure cupidatat aliqua eu labore velit elit id nostrud. Mollit ex",
  },
  {
    id: 7,
    plane: "OH-CON",
    startTime: 1737453600, // 2025-01-21T10:00:00Z in UNIX time
    endTime: 1737457200, // 2025-01-21T11:00:00Z in UNIX time
    userId: "admin",
    type: "trip",
    title: "Lorem ipsum",
    description:
      "Dolor irure cupidatat aliqua eu labore velit elit id nostrud. Mollit ex",
  },
  {
    id: 8,
    plane: "OH-CON",
    startTime: 1737194400, // 2025-01-18T10:00:00Z in UNIX time
    endTime: 1737198000, // 2025-01-18T11:00:00Z in UNIX time
    userId: "admin",
    type: "local",
    title: "ipsum Lorem",
    description:
      "Dolore laborum ex officia aliqua proident esse officia veniam id eu aliquip qui incididunt. In magna irure ipsum occaecat. Labore commodo magna qui exercitation ipsum sint et pariatur cupidatat. Pariatur cupidatat quis incididunt officia pariatur non nisi elit. Laboris reprehenderit sit laboris cupidatat aute irure dolore consequat velit consectetur reprehenderit amet.",
  },
];
/*
 * Fetch day bookings
 */

export async function fetchDayBookings(selectedPlane, selectedDate) {
  try {
    console.log("Fetching day bookings..."); // debug

    let data = [];

    console.log(selectedPlane); // debug
    console.log(selectedDate); // debug

    // Validate and re-format the parameters
    if (!allowedPlaneTypes.includes(selectedPlane)) {
      throw new Error("Invalid plane type");
    }

    if (typeof selectedDate !== "string") {
      throw new Error("Invalid date");
    } else {
      selectedDate = new Date(selectedDate).getTime() / 1000;
    }

    console.log(selectedDate); // debug

    // Fetch the data from the database
    try {
      // data = await db.query("SELECT * FROM bookings WHERE plane = ? AND startTime >= ? AND endTime <= ?", [plane, date, date + 86400]);
      data = stubBookingData.filter(
        (booking) =>
          booking.plane === selectedPlane &&
          booking.startTime >= selectedDate &&
          booking.endTime <= selectedDate + 86400
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      return {
        status: "error",
        result: null,
      };
    }

    // Format the data
    if (data.length > 0) {
      data = data.map((booking) => {
        return {
          Id: booking.id,
          plane: booking.plane,
          startTime: booking.startTime,
          endTime: booking.endTime,
          userId: booking.userId,
          type: booking.type,
          title: booking.title,
          description: booking.description,
        };
      });
    } else {
      data = [];
    }

    console.log("Fetching day bookings successful"); // debug
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
}) {
  try {
    console.log("Adding new booking..."); // debug

    // Validate the parameters
    if (!allowedPlaneTypes.includes(plane)) {
      throw new Error("Invalid plane type");
    }

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      throw new Error("Invalid time parameters");
    }

    if (startTime >= endTime) {
      throw new Error("Invalid time range");
    }

    if (typeof userId !== "string") {
      throw new Error("Invalid user ID");
    }

    if (!allowedFlightTypes.includes(type)) {
      throw new Error("Invalid flight type");
    }

    // Add the data to the database
    try {
      // await db.query("INSERT INTO bookings (plane, startTime, endTime, userId, type) VALUES (?, ?, ?, ?, ?)", [plane, startTime, endTime, userId, type]);
      stubBookingData.push({
        Id: stubBookingData.length + 1,
        plane: plane,
        startTime: startTime,
        endTime: endTime,
        userId: userId,
        type: type,
      });
    } catch (error) {
      console.error("Error adding data:", error);
      return {
        status: "error",
        result: null,
      };
    }

    console.log("Adding new booking successful"); // debug
    return {
      status: "success",
      result: null,
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
    console.log("Removing booking..."); // debug

    // Validate the parameters
    if (typeof bookingId !== "number") {
      throw new Error("Invalid booking ID");
    }

    // Remove the data from the database
    try {
      // await db.query("DELETE FROM bookings WHERE id = ?", [bookingId]);
      console.log(bookingId); // debug
    } catch (error) {
      console.error("Error removing data:", error);
      return {
        status: "error",
        result: null,
      };
    }

    console.log("Removing booking successful"); // debug
    return {
      status: "success",
      result: null,
    };
  } catch (error) {
    console.error("Error occured:", error);
    throw error;
  }
}
