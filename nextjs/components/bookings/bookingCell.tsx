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
  const span = calculateEventSpan(booking, hour, hourValue);
  if (span === 0) return null;

  const heightPercentage = calculatebookingHeight(booking);
  const top = calculatebookingOffset(booking, hour);

  const getFlightTypeColor = (type: string): string => {
    const flightType = FLIGHT_TYPES.find((flight) => flight.type === type);
    return flightType ? flightType.color : "#4A90E2";
  };

  return (
    <td
      onDoubleClick={onClick}
      className="cursor-pointer border border-gray-300 relative"
      rowSpan={span}
      data-cell-key={`${plane}-${hour}`}
      style={{ width: "100px", height: "50px", padding: 0 }}
    >
      <div
        className="absolute left-0 right-0 text-white px-2 py-1 overflow-hidden"
        style={{
          top: `${top}%`,
          height: `${heightPercentage}%`,
          backgroundColor: getFlightTypeColor(booking.type),
        }}
      >
        <p className="text-sm font-medium text-ellipsis whitespace-nowrap overflow-hidden">
          {booking.title}
        </p>
      </div>
    </td>
  );
};

const calculateEventSpan = (
  booking: BookingType,
  hour: string,
  hourValue: number
) => {
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

export default BookingCell;
