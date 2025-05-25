"use client";

import { useState, useMemo, useEffect } from "react";
import { DateTime } from "luxon";
import BookingCell from "@/components/bookings/bookingCell";
import DatePicker from "@/components/bookings/datePicker";
import BookingModal from "@/components/bookings/bookingModal";
import { fetchDayBookings } from "@/utilities/bookings";
import { BookingType } from "@/utilities/bookings";

const DEFAULT_BOOKING: BookingType = {
  id: -1,
  user_id: "",
  title: "",
  start_time: "",
  end_time: "",
  type: "other",
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
  { type: "local", label: "Paikallinen lento", color: "#90EE90", priority: 3 }, // Light Green
  { type: "trip", label: "Matkalento", color: "#87CEEB", priority: 3 }, // Sky Blue
  { type: "training", label: "Koululento", color: "#ADD8E6", priority: 2 }, // Light Blue
  { type: "maintenance", label: "Huolto", color: "#FFB6C1", priority: 1 }, // Light Red
  { type: "fire", label: "Palolento", color: "#FFA500", priority: 1 }, // Orange
  { type: "other", label: "Muu lento", color: "#D3D3D3", priority: 2 }, // Light Grey
];

const PLANES = ["OH-CON", "OH-PDX", "OH-816", "OH-829", "OH-475", "OH-386"];

interface BookingSectionProps {
  isLoggedIn: boolean;
}

const BookingSection = ({ isLoggedIn }: BookingSectionProps) => {
  const now = DateTime.now();
  const [selectedDate, setSelectedDate] = useState<DateTime>(now);
  const [hourInterval] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "update" | null>(null);
  const [bookingData, setbookingData] = useState<BookingType[]>(bookingS);
  const [selectedbooking, setSelectedbooking] =
    useState<BookingType>(DEFAULT_BOOKING);

  // NOT IN USE AS OF NOW
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const promises = PLANES.map((plane) =>
          fetchDayBookings(plane, selectedDate.toISODate() ?? "")
        );
        const results = await Promise.all(promises);

        console.log("FETCHED BOOKINGS:", results);

        const fetchedBookings: BookingType[] = results
          .filter((result) => result.status === "success")
          .flatMap((result) => result.result as BookingType[]);

        // setbookingData(fetchedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    fetchBookings();
  }, [selectedDate]);

  const hours = useMemo(
    () =>
      Array.from(
        { length: 24 / hourInterval },
        (_, i) => `${i * hourInterval}:00`
      ),
    [hourInterval]
  );

  const handleDateChange = (date: DateTime | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCellClick = (plane: string, hour: string) => {
    setSelectedbooking({
      ...DEFAULT_BOOKING,
      id: bookingData.length + 1,
      plane,
      start_time:
        selectedDate.set({ hour: parseInt(hour.split(":")[0]) }).toISO() ?? "",
      end_time:
        selectedDate
          .set({ hour: parseInt(hour.split(":")[0]) })
          .plus({ hours: hourInterval })
          .toISO() ?? "",
    });
    setModalMode("create");
  };

  const handlebookingClick = (booking: BookingType) => {
    setSelectedbooking(booking);
    setModalMode("update");
  };

  const handleSavebooking = () => {
    if (!isbookingValid(selectedbooking)) return;

    setbookingData([...bookingData, selectedbooking]);
    resetModal();
  };

  const handleUpdatebooking = () => {
    if (!isbookingValid(selectedbooking)) return;

    setbookingData((prevbookingData) =>
      prevbookingData.map((booking) =>
        booking.id === selectedbooking.id ? selectedbooking : booking
      )
    );
    resetModal();
  };

  const handleDeletebooking = () => {
    if (selectedbooking.id < 0) return;
    setbookingData((prevbookingData) =>
      prevbookingData.filter((booking) => booking.id !== selectedbooking.id)
    );
    resetModal();
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

  const isbookingInSelectedDate = (booking: BookingType) => {
    const bookingDate = DateTime.fromISO(booking.start_time);
    return bookingDate.hasSame(selectedDate, "day");
  };

  // This function determines the "primary booking" for a specific time slot (hourValue) from a list of bookings (bookingsForCell).
  // 1. It filters the bookings to include only those that are active during the given hourValue.
  //    - A booking is considered active if its start_time is less than or equal to hourValue and its end_time is greater than hourValue.
  // 2. The filtered bookings are then sorted based on two criteria:
  //    a. Priority: Bookings with higher priority (defined in FLIGHT_TYPES) are sorted first.
  //    b. Start time: If two bookings have the same priority, the one with the earlier start_time is prioritized.
  // 3. Finally, the first booking in the sorted list (the highest-priority booking) is selected as the primary booking.
  const getPriorityBooking = (
    bookingsForCell: BookingType[],
    hourValue: number
  ): BookingType | null => {
    return bookingsForCell
      .filter(
        (booking) =>
          DateTime.fromISO(booking.start_time).hour <= hourValue &&
          DateTime.fromISO(booking.end_time).hour > hourValue
      )
      .sort((a, b) => {
        const priorityDiff =
          FLIGHT_TYPES.find((type) => type.type === a.type)?.priority -
          FLIGHT_TYPES.find((type) => type.type === b.type)?.priority;

        if (priorityDiff !== 0) return priorityDiff;

        return (
          DateTime.fromISO(a.start_time).toMillis() -
          DateTime.fromISO(b.start_time).toMillis()
        );
      })[0];
  };

  return (
    <div className="p-4 text-black">
      {/* Date Picker */}
      <div className="flex justify-center items-center mb-4 text-swhite">
        <DatePicker value={selectedDate} onChange={handleDateChange} />
      </div>

      {/* Booking Table */}
      <div className="w-full overflow-auto">
        <table className="w-full border-collapse bg-gray-50 table-fixed">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100">HOURS</th>
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
                  const bookingsForCell = bookingData.filter((booking) => {
                    if (!isbookingInSelectedDate(booking)) return false;

                    const bookingStart = DateTime.fromISO(booking.start_time);
                    const bookingEnd = DateTime.fromISO(booking.end_time);
                    return (
                      booking.plane === plane &&
                      bookingStart.hour <= hourValue &&
                      bookingEnd.hour > hourValue
                    );
                  });

                  const priorityBooking = getPriorityBooking(
                    bookingsForCell,
                    hourValue
                  );

                  if (priorityBooking) {
                    return (
                      <BookingCell
                        key={`${plane}-${hour}`}
                        booking={priorityBooking}
                        hour={hour}
                        plane={plane}
                        onClick={() => handlebookingClick(priorityBooking)}
                      />
                    );
                  }

                  const isOccupied = bookingData.some((booking) => {
                    if (!isbookingInSelectedDate(booking)) return false;

                    const bookingStart = DateTime.fromISO(booking.start_time);
                    const bookingEnd = DateTime.fromISO(booking.end_time);
                    return (
                      booking.plane === plane &&
                      bookingStart.hour < hourValue &&
                      bookingEnd.hour > hourValue
                    );
                  });

                  return isOccupied ? null : (
                    <td
                      key={`${plane}-${hour}`}
                      onClick={() => handleCellClick(plane, hour)}
                      className="cursor-pointer border border-gray-300 p-2"
                      data-cell-key={`${plane}-${hour}`}
                      style={{ height: "50px" }}
                    >
                      <div></div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Render Booking Modal */}
      {modalMode && (
        <BookingModal
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

const bookingS: BookingType[] = [
  {
    id: 1,
    user_id: "user1",
    start_time: "2025-05-25T02:00:00.000Z",
    end_time: "2025-05-25T04:00:00.000Z",
    title: "Test Booking 1",
    type: "local",
    plane: "OH-CON",
    description: "This is a test booking 1",
  },
  {
    id: 2,
    user_id: "user2",
    start_time: "2025-05-25T05:00:00.000Z",
    end_time: "2025-05-25T07:00:00.000Z",
    title: "Test Booking 2",
    type: "training",
    plane: "OH-PDX",
    description: "This is a test booking 2",
  },
  {
    id: 3,
    user_id: "user3",
    start_time: "2025-05-25T08:00:00.000Z",
    end_time: "2025-05-25T09:00:00.000Z",
    title: "Test Booking 3",
    type: "maintenance",
    plane: "OH-816",
    description: "This is a test booking 3",
  },
  {
    id: 4,
    user_id: "user4",
    start_time: "2025-05-25T10:00:00.000Z",
    end_time: "2025-05-25T12:00:00.000Z",
    title: "Test Booking 4",
    type: "local",
    plane: "OH-829",
    description: "This is a test booking 4",
  },
  {
    id: 5,
    user_id: "user5",
    start_time: "2025-05-25T13:00:00.000Z",
    end_time: "2025-05-25T14:00:00.000Z",
    title: "Test Booking 5",
    type: "training",
    plane: "OH-475",
    description: "This is a test booking 5",
  },
  {
    id: 6,
    user_id: "user6",
    start_time: "2025-05-25T15:00:00.000Z",
    end_time: "2025-05-25T16:00:00.000Z",
    title: "Test Booking 6",
    type: "local",
    plane: "OH-386",
    description: "This is a test booking 6",
  },
  {
    id: 7,
    user_id: "user7",
    start_time: "2025-05-25T17:00:00.000Z",
    end_time: "2025-05-25T18:00:00.000Z",
    title: "Test Booking 7",
    type: "maintenance",
    plane: "OH-CON",
    description: "This is a test booking 7",
  },
  {
    id: 8,
    user_id: "user8",
    start_time: "2025-05-25T19:00:00.000Z",
    end_time: "2025-05-25T20:00:00.000Z",
    title: "Test Booking 8",
    type: "training",
    plane: "OH-PDX",
    description: "This is a test booking 8",
  },
  {
    id: 9,
    user_id: "user9",
    start_time: "2025-05-25T21:00:00.000Z",
    end_time: "2025-05-25T22:00:00.000Z",
    title: "Test Booking 9",
    type: "local",
    plane: "OH-816",
    description: "This is a test booking 9",
  },
  {
    id: 10,
    user_id: "user10",
    start_time: "2025-05-25T23:00:00.000Z",
    end_time: "2025-05-26T00:00:00.000Z",
    title: "Test Booking 10",
    type: "maintenance",
    plane: "OH-829",
    description: "This is a test booking 10",
  },
  // Overlapping bookings
  {
    id: 11,
    user_id: "user11",
    start_time: "2025-05-25T03:00:00.000Z",
    end_time: "2025-05-25T05:00:00.000Z",
    title: "Overlapping Booking 1",
    type: "local",
    plane: "OH-CON",
    description: "This is an overlapping booking 1",
  },
  {
    id: 12,
    user_id: "user12",
    start_time: "2025-05-25T06:00:00.000Z",
    end_time: "2025-05-25T08:00:00.000Z",
    title: "Overlapping Booking 2",
    type: "training",
    plane: "OH-PDX",
    description: "This is an overlapping booking 2",
  },
  {
    id: 13,
    user_id: "user13",
    start_time: "2025-05-25T08:30:00.000Z",
    end_time: "2025-05-25T10:00:00.000Z",
    title: "Overlapping Booking 3",
    type: "maintenance",
    plane: "OH-816",
    description: "This is an overlapping booking 3",
  },
  {
    id: 14,
    user_id: "user14",
    start_time: "2025-05-25T11:00:00.000Z",
    end_time: "2025-05-25T13:00:00.000Z",
    title: "Overlapping Booking 4",
    type: "local",
    plane: "OH-829",
    description: "This is an overlapping booking 4",
  },
];
