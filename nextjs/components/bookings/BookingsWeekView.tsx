"use client";

import { useMemo, memo } from "react";
import { DateTime } from "@/utilities/clubTime";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { getPlaneDisplayName, BOOKABLE_PLANES } from "@/utilities/planeHelpers";
import {
  getBookingDisplayName,
  getBookingDays,
  isFullDayBooking,
} from "@/utilities/bookingHelpers";

interface BookingsWeekViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string, date: string) => void;
  onBookingClick: (booking: BookingType) => void;
  flightTypes: FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

// A booking started from a day's free space begins at this hour; the times
// can be changed in the booking modal
const DEFAULT_START_HOUR = "9:00";

/**
 * The time a booking shows on one day: "Koko päivä", or its hours with "…"
 * where it continues from the day before or into the next day
 */
const getTimeLabel = (booking: BookingType, day: string): string => {
  const bookingDays = getBookingDays(booking);
  const isFirstDay = bookingDays[0] === day;
  const isLastDay = bookingDays[bookingDays.length - 1] === day;

  // Full-day bookings, and the middle days of longer ones
  if (isFullDayBooking(booking) || (!isFirstDay && !isLastDay)) {
    return "Koko päivä";
  }

  const start = isFirstDay
    ? DateTime.fromISO(booking.start_time).toFormat("HH:mm")
    : "…";
  const end = isLastDay
    ? DateTime.fromISO(booking.end_time).toFormat("HH:mm")
    : "…";
  return `${start}–${end}`;
};

/**
 * The week at a glance: a row per aircraft, a column per day, and each day
 * lists its bookings in time order. Click a booking to open it, or + to book
 * that day.
 */
export const BookingsWeekView = memo(
  ({
    bookings,
    selectedDate,
    onCellClick,
    onBookingClick,
    getFlightTypeColor,
  }: BookingsWeekViewProps) => {
    const weekStart = selectedDate.startOf("week");
    const weekDays = useMemo(
      () => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })),
      [weekStart]
    );

    // "plane|YYYY-MM-DD" → that day's bookings, earliest first
    const bookingsByPlaneAndDay = useMemo(() => {
      const result: Record<string, BookingType[]> = {};
      const sorted = [...bookings].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
      for (const booking of sorted) {
        for (const day of getBookingDays(booking)) {
          const key = `${booking.plane}|${day}`;
          (result[key] ??= []).push(booking);
        }
      }
      return result;
    }, [bookings]);

    const today = DateTime.now().toISODate();

    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full min-w-[900px] table-fixed border-collapse">
          <thead>
            <tr>
              <th
                scope="col"
                className="w-36 bg-gray-100 border border-gray-200 p-2 text-left text-sm text-sblack"
              >
                Kone
              </th>
              {weekDays.map((day) => {
                const dateString = day.toISODate();
                const isToday = dateString === today;
                return (
                  <th
                    key={dateString}
                    scope="col"
                    className={`border border-gray-200 p-2 text-center ${
                      isToday ? "bg-sblue text-white" : "bg-gray-100 text-sblack"
                    }`}
                  >
                    <div className="font-bold capitalize">
                      {day.setLocale("fi").toFormat("ccc")}
                    </div>
                    <div
                      className={`text-sm font-normal ${
                        isToday ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {day.toFormat("d.M.")}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {BOOKABLE_PLANES.map((plane) => (
              <tr key={plane}>
                <th
                  scope="row"
                  className="bg-gray-50 border border-gray-200 p-2 text-left text-sm font-bold text-sblack align-top"
                >
                  {getPlaneDisplayName(plane)}
                </th>
                {weekDays.map((day) => {
                  const dateString = day.toISODate();
                  if (!dateString) return null;
                  const dayBookings =
                    bookingsByPlaneAndDay[`${plane}|${dateString}`] ?? [];

                  return (
                    <td
                      key={dateString}
                      className={`border border-gray-200 p-1 align-top ${
                        dateString === today ? "bg-sbluel/5" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-1 min-h-[88px]">
                        {dayBookings.map((booking) => (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => onBookingClick(booking)}
                            className="w-full rounded px-2 py-1 text-left text-xs text-sblack transition-shadow hover:ring-2 hover:ring-sbluel focus:outline-none focus:ring-2 focus:ring-sblue"
                            style={{
                              backgroundColor: getFlightTypeColor(booking.type),
                            }}
                            title={`${booking.title} - ${getBookingDisplayName(booking)}`}
                            aria-label={`Varaus: ${booking.title}, ${getBookingDisplayName(booking)}, tyyppi ${booking.type}`}
                          >
                            <span className="block font-semibold tabular-nums">
                              {getTimeLabel(booking, dateString)}
                            </span>
                            <span className="block truncate">{booking.title}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            onCellClick(plane, DEFAULT_START_HOUR, dateString)
                          }
                          className="flex-1 min-h-8 rounded border border-dashed border-gray-300 text-sm text-gray-400 transition-colors hover:border-sblue hover:text-sblue focus:outline-none focus:ring-2 focus:ring-sblue"
                          aria-label={`Luo varaus koneelle ${plane} ${day
                            .setLocale("fi")
                            .toFormat("ccc d.M.")}`}
                        >
                          +
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

BookingsWeekView.displayName = "BookingsWeekView";
