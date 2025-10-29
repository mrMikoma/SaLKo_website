/**
 * Booking Helper Functions
 * Utility functions for booking data manipulation and formatting
 */

import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";

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
 * Checks if a booking is on a specific date
 */
export const isBookingOnDate = (
  booking: BookingType,
  date: DateTime
): boolean => {
  const startTime = DateTime.fromISO(booking.start_time).toLocal();
  return startTime.hasSame(date, "day");
};

/**
 * Checks if a booking covers a specific hour
 */
export const doesBookingCoverHour = (
  booking: BookingType,
  hourValue: number
): boolean => {
  const startTime = DateTime.fromISO(booking.start_time).toLocal();
  const endTime = DateTime.fromISO(booking.end_time).toLocal();

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
    return doesBookingCoverHour(booking, hourValue);
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
