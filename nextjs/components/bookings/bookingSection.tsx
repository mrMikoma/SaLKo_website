"use client";

import { useState, useMemo, useEffect, use } from "react";
import { DateTime } from "luxon";
import BookingCell from "@/components/bookings/bookingCell";
import DatePicker from "@/components/bookings/datePicker";
import BookingUpdateModal from "@/components/bookings/bookingModal";
import {
  fetchDayBookings,
  addBooking,
  removeBooking,
} from "@/utilities/bookings";
import { BookingType } from "@/utilities/bookings";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { date } from "zod";

/*
 * Types and Constants
 */

const DEFAULT_BOOKING: BookingType = {
  id: -1,
  user_id: "",
  title: "",
  start_time: "",
  end_time: "",
  full_name: "",
  type: "local",
  plane: "OH-CON",
  description: "",
};

export interface FlightTypes {
  type: string;
  label: string;
  color: string;
  priority: number;
}

export const FLIGHT_TYPES: FlightTypes[] = [
  { type: "local", label: "Paikallislento", color: "#90EE90", priority: 3 }, // Light Green
  { type: "trip", label: "Matkalento", color: "#87CEEB", priority: 3 }, // Sky Blue
  { type: "training", label: "Koululento", color: "#ADD8E6", priority: 2 }, // Light Blue
  { type: "maintenance", label: "Huolto", color: "#FFB6C1", priority: 1 }, // Light Red
  { type: "fire", label: "Palolento", color: "#FFA500", priority: 1 }, // Orange
  { type: "other", label: "Muu lento", color: "#D3D3D3", priority: 2 }, // Light Grey
];

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];

interface BookingSectionProps {
  isLoggedIn: boolean;
}

/*
 * BookingSection Component
 * Displays a booking calendar with date selection, booking cells, and a modal for creating/updating bookings.
 */

// TO-DO:
// 1. Implement backend logic for adding and updating bookings.
// 2. Fix issue with booking cells not rendering correctly when lower priority bookings continue after a higher priority booking ends.
// 3. Ensure that the booking modal correctly handles the creation and updating of bookings.

const BookingSection = ({ isLoggedIn }: BookingSectionProps) => {
  const pathname = usePathname();
  const now = DateTime.now();
  const { replace } = useRouter();
  const [hourInterval] = useState(1);
  const [modalMode, setModalMode] = useState<
    "create" | "update" | "view" | null
  >(null);
  const [bookingData, setbookingData] = useState<BookingType[]>([]);
  const [selectedbooking, setSelectedbooking] =
    useState<BookingType>(DEFAULT_BOOKING);

  const fetchBookings = async (newDate: string) => {
    try {
      const promises = PLANES.map((plane) => fetchDayBookings(plane, newDate));
      const results = await Promise.all(promises);

      console.log("FETCHED BOOKINGS:", results);

      const fetchedBookings: BookingType[] = results
        .filter(
          (result) =>
            result.status === "success" &&
            Array.isArray(result.result) &&
            result.result.length > 0
        )
        .flatMap((result) => result.result as BookingType[]);

      setbookingData(fetchedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const handleDateChange = (date: DateTime) => {
    if (!date.isValid) {
      console.error("Invalid date provided:", date);
      return;
    } else {
      const newDate = date.toISODate();
      replace(`${pathname}?paiva=${newDate}`);
      fetchBookings(newDate);
    }
  };

  const dateParam = useSearchParams().get("paiva");
  useEffect(() => {
    handleDateChange(dateParam ? DateTime.fromISO(dateParam) : now);
  }, [dateParam]);

  //  Get the date from the URL parameters
  //  if (useSearchParams().has("paiva") === false) {
  //    handleDateChange(now);
  //  } else {
  //    // If a date is provided, parse it and set it as the selected date
  //    const dateParam = useSearchParams().get("paiva");
  //    const parsedDate = DateTime.fromISO(dateParam);
  //    if (parsedDate.isValid) {
  //      //fetchBookings(dateParam);
  //    } else {
  //      console.error("Invalid date format in URL parameter:", dateParam);
  //      handleDateChange(now);
  //    }
  //  }

  console.log("BOOKING DATA:", bookingData);

  const hours = useMemo(
    () =>
      Array.from(
        { length: (23 - 6 + 1) / hourInterval },
        (_, i) => `${6 + i * hourInterval}:00`
      ),
    [hourInterval]
  );

  const handleCellClick = (plane: string, hour: string) => {
    setSelectedbooking({
      ...DEFAULT_BOOKING,
      id: bookingData.length + 1,
      plane,
      start_time:
        (useSearchParams().get("paiva").toString() ?? "") +
        "T" +
        parseInt(hour.split(":")[0]) +
        ":00",
      end_time:
        (useSearchParams().get("paiva").toString() ?? "") +
        "T" +
        (parseInt(hour.split(":")[0]) + hourInterval) +
        ":00",
    });
    if (isLoggedIn) {
      setModalMode("create");
    } else {
      setModalMode("create"); // debug: view
    }
  };

  const handlebookingClick = (booking: BookingType) => {
    setSelectedbooking(booking);
    if (isLoggedIn) {
      setModalMode("update");
    } else {
      setModalMode("update"); // debug: view
    }
  };

  const handleSavebooking = () => {
    if (!isbookingValid(selectedbooking)) return;

    // handle backend save logic here

    setbookingData([...bookingData, selectedbooking]);
    resetModal();
  };

  const handleUpdatebooking = () => {
    if (!isbookingValid(selectedbooking)) return;

    // handle backend update logic here

    setbookingData((prevbookingData) =>
      prevbookingData.map((booking) =>
        booking.id === selectedbooking.id ? selectedbooking : booking
      )
    );
    resetModal();
  };

  const handleDeletebooking = async () => {
    if (!isbookingValid(selectedbooking)) return;
    if (selectedbooking.id < 0) return;

    const response = await removeBooking(selectedbooking.id);

    if (response.status !== "success") {
      console.error("Failed to delete booking:", response.result); // debug
      return;
    } else {
      console.log("Booking deleted successfully:", response.result); // debug
      // Remove the booking from the local state
      setbookingData((prevbookingData) =>
        prevbookingData.filter((booking) => booking.id !== selectedbooking.id)
      );
      resetModal();
    }
  };

  const resetModal = () => {
    setModalMode(null);
    setSelectedbooking(DEFAULT_BOOKING);
  };

  const isbookingValid = (booking: BookingType) => {
    return (
      booking.end_time &&
      booking.id >= 0 &&
      booking.start_time &&
      booking.title &&
      booking.type &&
      booking.plane
    );
  };

  // This function determines the "primary booking" for a specific time slot (hourValue) from a list of bookings (bookingsForCell).
  // 1. It filters bookings for the specified plane and hour.
  // 2. It checks if the booking's start and end times overlap with the specified hour.
  // 3. If there are no bookings, it returns null.
  // 4. If there are overlapping bookings, it sorts them by priority and returns the one with the highest priority.
  // 5. If there's only one booking, it returns that booking.
  // 6. If there are multiple bookings, it sorts them by priority and returns the one with the highest priority.
  // 7. If there are no overlapping bookings, it returns the first booking that matches the hour criteria.
  // 8. If there are multiple overlapping bookings, it sorts them by priority and returns the one with the highest priority.
  const getVisibleBookingForHour = (
    plane: string,
    hourValue: number,
    allBookings: BookingType[]
  ): BookingType | null => {
    const bookings = allBookings
      .filter((booking) => booking.plane === plane)
      .filter(
        (booking) =>
          DateTime.fromISO(booking.start_time).hour <= hourValue &&
          DateTime.fromISO(booking.end_time).hour > hourValue &&
          DateTime.fromISO(booking.start_time).hasSame(dateParam, "day")
      );

    if (bookings.length === 0) return null;

    // Check for overlapping bookings at this hour
    const overlapping = bookings.filter(
      (b) =>
        DateTime.fromISO(b.start_time).hour < hourValue &&
        DateTime.fromISO(b.end_time).hour > hourValue
    );

    if (overlapping.length <= 1) return overlapping[0] ?? bookings[0];

    // Sort by priority
    const sorted = overlapping.sort((a, b) => {
      const pa = FLIGHT_TYPES.find((t) => t.type === a.type)?.priority ?? 0;
      const pb = FLIGHT_TYPES.find((t) => t.type === b.type)?.priority ?? 0;
      return pb - pa;
    });

    return sorted[0];
  };

  return (
    <div className="p-4 text-black">
      {/* Date Picker */}
      <div className="flex justify-center items-center mb-4 text-swhite">
        <DatePicker onChange={handleDateChange} />
      </div>


      {/* Booking Table */}
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse bg-gray-50 table-fixed">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100 overflow-hidden">
                ALKAVA TUNTI
              </th>
              {PLANES.map((plane) => (
                <th
                  key={plane}
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ height: "50px" }}
                >
                  {plane}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <th
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ height: "50px" }}
                >
                  {hour}
                </th>
                {PLANES.map((plane) => {
                  const hourValue = parseInt(hour.split(":")[0]);
                  const topBooking = getVisibleBookingForHour(
                    plane,
                    hourValue,
                    bookingData
                  );

                  if (!topBooking) {
                    return (
                      <td
                        key={`${plane}-${hour}`}
                        onClick={() => handleCellClick(plane, hour)}
                        className="cursor-pointer border border-gray-300 p-2"
                        style={{ height: "50px" }}
                      >
                        <div></div>
                      </td>
                    );
                  }

                  // console.log("TOP BOOKING:", topBooking);

                  return (
                    <BookingCell
                      key={`${plane}-${hour}-${topBooking.id}`}
                      booking={topBooking}
                      hour={hour}
                      plane={plane}
                      onClick={() => handlebookingClick(topBooking)}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Render Booking Modal */}
      {modalMode && (
        <BookingUpdateModal
          mode={modalMode}
          booking={selectedbooking}
          onSave={handleSavebooking}
          onUpdate={handleUpdatebooking}
          onDelete={handleDeletebooking}
          onCancel={resetModal}
          onChange={setSelectedbooking}
        />
      )}
    </div>
  );
};

export default BookingSection;
