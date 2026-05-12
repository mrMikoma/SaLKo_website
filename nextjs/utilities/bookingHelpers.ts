/**
 * Booking Helper Functions
 * Utility functions for booking data manipulation and formatting
 */

import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";

/**
 * Returns true if a booking is a "full day" booking.
 * Full-day bookings are stored with local midnight as start and the next day's
 * local midnight as end (i.e., both start and end are exactly at 00:00 local time
 * and the booking spans whole days).
 */
export const isFullDayBooking = (booking: BookingType): boolean => {
  if (!booking.start_time || !booking.end_time) return false;
  const start = DateTime.fromISO(booking.start_time).toLocal();
  const end = DateTime.fromISO(booking.end_time).toLocal();
  return (
    start.hour === 0 && start.minute === 0 && start.second === 0 &&
    end.hour === 0 && end.minute === 0 && end.second === 0
  );
};

/**
 * Returns the display name for a booking, using guest contact name for guest bookings
 * instead of the system placeholder "Järjestelmän Vieras".
 */
export const getBookingDisplayName = (booking: BookingType): string => {
  if (booking.is_guest) {
    return booking.guest_contact_name || "Vieras";
  }
  return booking.full_name;
};

/**
 * Shortens a full name to "FirstName L."
 */
export const getShortenedName = (name: string): string => {
  const parts = name.split(" ");
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1]?.charAt(0) || ""}.`;
  }
  return name;
};

/**
 * Gets the color for a flight type
 */
export const getFlightTypeColor = (
  type: string,
  flightTypes: readonly FlightTypeConfig[]
): string => {
  const flightType = flightTypes.find((flight) => flight.type === type);
  return flightType ? flightType.color : "#4A90E2";
};

/**
 * Gets the priority for a flight type
 */
export const getFlightTypePriority = (
  type: string,
  flightTypes: readonly FlightTypeConfig[]
): number => {
  const flightType = flightTypes.find((flight) => flight.type === type);
  return flightType ? flightType.priority : 0;
};

/**
 * Checks if a booking has a valid time range
 */
export const isValidTimeRange = (
  startTime: DateTime,
  endTime: DateTime
): boolean => {
  return endTime > startTime;
};

/**
 * Checks if a booking is on a specific date (including multiday bookings)
 */
export const isBookingOnDate = (
  booking: BookingType,
  date: DateTime
): boolean => {
  const startTime = DateTime.fromISO(booking.start_time).toLocal().startOf("day");
  const endTime = DateTime.fromISO(booking.end_time).toLocal().startOf("day");
  const checkDate = date.startOf("day");

  // Check if the date falls within the booking's date range
  return checkDate >= startTime && checkDate <= endTime;
};

/**
 * Checks if a booking covers a specific hour on a given date.
 * For multi-day bookings: start day covers from start hour to end of day,
 * middle days cover all hours, end day covers from start of day to end hour.
 */
export const doesBookingCoverHour = (
  booking: BookingType,
  hourValue: number,
  selectedDate?: DateTime
): boolean => {
  const startTime = DateTime.fromISO(booking.start_time).toLocal();
  const endTime = DateTime.fromISO(booking.end_time).toLocal();

  // Full-day bookings cover all hours. End is stored as midnight of the day AFTER
  // the last booked day (exclusive), so the "end day" itself is not covered.
  if (isFullDayBooking(booking)) {
    if (selectedDate) {
      const checkDay = selectedDate.startOf("day").toISODate();
      const endDay = endTime.startOf("day").toISODate();
      return checkDay !== endDay;
    }
    return true;
  }

  if (selectedDate) {
    const checkDay = selectedDate.startOf("day").toISODate();
    const startDay = startTime.startOf("day").toISODate();
    const endDay = endTime.startOf("day").toISODate();

    const isStartDay = checkDay === startDay;
    const isEndDay = checkDay === endDay;

    if (isStartDay && isEndDay) {
      return startTime.hour <= hourValue && endTime.hour > hourValue;
    } else if (isStartDay) {
      return startTime.hour <= hourValue;
    } else if (isEndDay) {
      return endTime.hour > hourValue;
    } else {
      return true;
    }
  }

  return startTime.hour <= hourValue && endTime.hour > hourValue;
};

/**
 * Filters bookings for a specific plane
 */
export const filterBookingsByPlane = (
  bookings: BookingType[],
  plane: string
): BookingType[] => {
  return bookings.filter((booking) => booking.plane === plane);
};

/**
 * Filters bookings that are active during a specific hour on a specific date
 */
export const filterActiveBookings = (
  bookings: BookingType[],
  plane: string,
  hourValue: number,
  selectedDate: DateTime
): BookingType[] => {
  const planeBookings = filterBookingsByPlane(bookings, plane);

  return planeBookings.filter((booking) => {
    const startTime = DateTime.fromISO(booking.start_time).toLocal();
    const endTime = DateTime.fromISO(booking.end_time).toLocal();

    // Skip invalid time ranges
    if (!isValidTimeRange(startTime, endTime)) {
      return false;
    }

    // Check if booking is on the selected date
    if (!isBookingOnDate(booking, selectedDate)) {
      return false;
    }

    // Check if the booking covers this hour
    return doesBookingCoverHour(booking, hourValue, selectedDate);
  });
};

/**
 * Sorts bookings by priority (highest first)
 */
export const sortBookingsByPriority = (
  bookings: BookingType[],
  flightTypes: readonly FlightTypeConfig[]
): BookingType[] => {
  return [...bookings].sort((a, b) => {
    const priorityA = getFlightTypePriority(a.type, flightTypes);
    const priorityB = getFlightTypePriority(b.type, flightTypes);
    return priorityB - priorityA;
  });
};

/**
 * Gets visible bookings for a specific hour, sorted by priority
 */
export const getVisibleBookingsForHour = (
  plane: string,
  hourValue: number,
  allBookings: BookingType[],
  selectedDate: DateTime,
  flightTypes: readonly FlightTypeConfig[]
): BookingType[] => {
  const activeBookings = filterActiveBookings(
    allBookings,
    plane,
    hourValue,
    selectedDate
  );

  if (activeBookings.length === 0) {
    return [];
  }

  return sortBookingsByPriority(activeBookings, flightTypes);
};

/**
 * Formats a DateTime to time string (HH:mm)
 */
export const formatTime = (isoTime: string): string => {
  return DateTime.fromISO(isoTime).toFormat("HH:mm");
};

/**
 * Returns clipped display times for a booking on a specific day.
 * For multi-day bookings the start is shown as 00:00 on continuation days
 * and the end is shown as 00:00 on days where the booking continues past midnight.
 */
export const getDisplayTimesForDay = (
  booking: BookingType,
  selectedDate: DateTime
): { displayStart: string; displayEnd: string } => {
  const start = DateTime.fromISO(booking.start_time).toLocal();
  const end = DateTime.fromISO(booking.end_time).toLocal();
  const dayIso = selectedDate.startOf("day").toISODate();

  const isStartDay = start.startOf("day").toISODate() === dayIso;
  const isEndDay = end.startOf("day").toISODate() === dayIso;

  return {
    displayStart: isStartDay ? start.toFormat("HH:mm") : "00:00",
    displayEnd: isEndDay ? end.toFormat("HH:mm") : "00:00",
  };
};

/**
 * Generates hour labels for the booking table
 */
export const generateHourLabels = (
  startHour: number,
  endHour: number,
  interval: number = 1
): string[] => {
  return Array.from(
    { length: (endHour - startHour + 1) / interval },
    (_, i) => `${startHour + i * interval}:00`
  );
};
