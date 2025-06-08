"use client";
import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPES } from "./bookingSection";

const BookingCell = ({
  booking,
  hour,
  plane,
  onClick,
}: {
  booking: BookingType;
  hour: string;
  plane: string;
  onClick: () => void;
}) => {
  const hourValue = parseInt(hour.split(":")[0]);
  const span = calculateEventSpan(booking, hourValue);
  if (span === 0) return null;

  const heightPercentage = calculatebookingHeight(booking);
  const top = calculatebookingOffset(booking, hour);

  return (
    <td
      onClick={onClick}
      className="cursor-pointer border border-gray-300 relative font-black"
      rowSpan={span}
      data-cell-key={`${plane}-${hour}`}
      style={{ width: "100px", height: "50px", padding: 0 }}
    >
      <div
        className="absolute left-0 right-0 text-white px-2 overflow-hidden"
        style={{
          top: `${top}%`,
          height: `${heightPercentage}%`,
          backgroundColor: getFlightTypeColor(booking.type),
        }}
      >
        <p className="font-bold text-sblued text-ellipsis whitespace-nowrap overflow-hidden">
          {booking.title}
        </p>
        <p className="font-bold text-sblued text-ellipsis whitespace-nowrap overflow-hidden">
          Varaaja:{" "}
          <span className="font-medium">
            {getShortenedName(booking.full_name)}
          </span>
        </p>
      </div>
    </td>
  );
};

export default BookingCell;

const calculateEventSpan = (booking: BookingType, hourValue: number) => {
  const bookingStart = DateTime.fromISO(booking.start_time);
  const bookingEnd = DateTime.fromISO(booking.end_time);
  const cellStart = DateTime.fromISO(booking.start_time).set({
    hour: hourValue,
  });
  const cellEnd = cellStart.plus({ hours: 1 });

  if (bookingStart.hasSame(cellStart, "hour")) {
    const duration = bookingEnd.diff(bookingStart, "hours").hours;
    return Math.ceil(duration);
  }

  if (bookingStart < cellEnd && bookingEnd > cellStart) {
    return 0;
  }

  return 0;
};

/*
const calculateEventSpan = (booking: BookingType, hourValue: number) => {
  const bookingStart = DateTime.fromISO(booking.start_time);
  const bookingEnd = DateTime.fromISO(booking.end_time);
  const cellStart = DateTime.fromISO(booking.start_time).set({
    hour: hourValue,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const cellEnd = cellStart.plus({ hours: 1 });

  if (bookingStart < cellEnd && bookingEnd > cellStart) {
    const duration = bookingEnd.diff(cellStart, "hours").hours;
    return Math.ceil(duration);
  }

  return 0;
};
*/

const calculatebookingHeight = (booking: BookingType) => {
  const bookingStart = DateTime.fromISO(booking.start_time);
  const bookingEnd = DateTime.fromISO(booking.end_time);
  const durationbooking = bookingEnd.diff(bookingStart, "hours").hours;
  const rowSpan = Math.ceil(durationbooking);
  const height = rowSpan > 0 ? (rowSpan / durationbooking) * 100 : 100;
  return height;
};

const calculatebookingOffset = (booking: BookingType, hour: string) => {
  const bookingStart = DateTime.fromISO(booking.start_time);
  const cellStart = DateTime.fromISO(booking.start_time).set({
    hour: parseInt(hour.split(":")[0]),
  });
  let top = 0;
  let diff = cellStart.diff(bookingStart, "hours").hours;
  if (diff < 0) {
    top = diff * -100;
  }
  return top;
};

const getFlightTypeColor = (type: string): string => {
  const flightType = FLIGHT_TYPES.find((flight) => flight.type === type);
  return flightType ? flightType.color : "#4A90E2";
};

const getShortenedName = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1]?.charAt(0) || ""}.`;
  }
  return name;
};
