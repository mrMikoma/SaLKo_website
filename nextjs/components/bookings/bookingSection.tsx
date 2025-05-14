"use client";

import { useState, useMemo } from "react";
import { DateTime } from "luxon";
import BookingCell from "@/components/bookings/bookingCell";
import DatePicker from "@/components/bookings/datePicker";
import BookingModal from "@/components/bookings/bookingModal";

interface Booking {
  id: number;
  user: string;
  startDate: string;
  endDate: string;
  booking: string;
  color: string;
}

const DEFAULT_COLOR = "#1677ff";
const DEFAULT_BOOKING: Booking = {
  id: -1,
  user: "",
  startDate: "",
  endDate: "",
  booking: "",
  color: DEFAULT_COLOR,
};

const PLANES = ["OH-CON", "OH-PDX", "OH-816", "OH-829", "OH-475", "OH-386"];
const bookingS: Booking[] = [
  {
    id: 1,
    user: "OH-CON",
    startDate: "2025-05-14T01:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    booking: "Extended Team Meeting",
    color: "#1677ff",
  },
  {
    id: 2,
    user: "OH-CON",
    startDate: "2025-05-14T04:00:00.000Z",
    endDate: "2025-05-14T05:00:00.000Z",
    booking: "Client Follow-up",
    color: "#52c41a",
  },
  {
    id: 3,
    user: "OH-CON",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T06:00:00.000Z",
    booking: "Client Follow-up",
    color: "#faad14",
  },
  {
    id: 4,
    user: "OH-386",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    booking: "Extended Team Meeting",
    color: "#1677ff",
  },
];
/*
  {
    id: 2,
    user: "OH-CON",
    startDate: "2025-05-14T01:00:00.000Z",
    endDate: "2025-05-14T05:00:00.000Z",
    booking: "Client Follow-up",
    color: "#52c41a",
  },
  {
    id: 3,
    user: "OH-CON",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T06:00:00.000Z",
    booking: "Client Follow-up",
    color: "#faad14",
  },
  {
    id: 4,
    user: "OH-386",
    startDate: "2025-05-14T00:00:00.000Z",
    endDate: "2025-05-14T04:00:00.000Z",
    booking: "Extended Team Meeting",
    color: "#1677ff",
  },
*/

interface BookingSectionProps {
  isLoggedIn: boolean;
}

const BookingSection = ({ isLoggedIn }: BookingSectionProps) => {
  const now = DateTime.now();
  const [selectedDate, setSelectedDate] = useState<DateTime>(now);
  const [hourInterval] = useState(1);
  const [modalMode, setModalMode] = useState<"create" | "update" | null>(null);
  const [bookingData, setbookingData] = useState<Booking[]>(bookingS);
  const [selectedbooking, setSelectedbooking] =
    useState<Booking>(DEFAULT_BOOKING);

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

  const handleCellClick = (user: string, hour: string) => {
    setSelectedbooking({
      ...DEFAULT_BOOKING,
      id: bookingData.length + 1,
      user,
      startDate:
        selectedDate.set({ hour: parseInt(hour.split(":")[0]) }).toISO() ?? "",
      endDate:
        selectedDate
          .set({ hour: parseInt(hour.split(":")[0]) })
          .plus({ hours: hourInterval })
          .toISO() ?? "",
    });
    setModalMode("create");
  };

  const handlebookingClick = (booking: Booking) => {
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

  const isbookingValid = (booking: Booking) => {
    return (
      booking.color &&
      booking.endDate &&
      booking.id >= 0 &&
      booking.startDate &&
      booking.booking &&
      booking.user
    );
  };

  const isbookingInSelectedDate = (booking: Booking) => {
    const bookingDate = DateTime.fromISO(booking.startDate);
    return bookingDate.hasSame(selectedDate, "day");
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
              {PLANES.map((user) => (
                <th
                  key={user}
                  className="border border-gray-300 p-2 bg-gray-100"
                  style={{ height: "50px" }}
                >
                  {user}
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
                {PLANES.map((user) => {
                  const hourValue = parseInt(hour.split(":")[0]);
                  const bookingsForCell = bookingData.filter((booking) => {
                    if (!isbookingInSelectedDate(booking)) return false;

                    const bookingStart = DateTime.fromISO(booking.startDate);
                    const bookingEnd = DateTime.fromISO(booking.endDate);
                    return (
                      booking.user === user &&
                      bookingStart.hour <= hourValue &&
                      bookingEnd.hour > hourValue
                    );
                  });

                  const primarybooking = bookingsForCell.find(
                    (booking) =>
                      DateTime.fromISO(booking.startDate).hour === hourValue
                  );

                  return primarybooking ? (
                    <BookingCell
                      key={`${user}-${hour}`}
                      booking={primarybooking}
                      hour={hour}
                      user={user}
                      onClick={() => handlebookingClick(primarybooking)}
                    />
                  ) : (
                    <td
                      key={`${user}-${hour}`}
                      onClick={() => handleCellClick(user, hour)}
                      className="cursor-pointer border border-gray-300 p-2"
                      data-cell-key={`${user}-${hour}`}
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
