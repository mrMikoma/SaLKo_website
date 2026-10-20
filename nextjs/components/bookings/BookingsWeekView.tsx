"use client";

import { DateTime } from "@/utilities/clubTime";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { useMemo, memo } from "react";
import { getPlaneDisplayName, BOOKABLE_PLANES } from "@/utilities/planeHelpers";
import { getBookingDisplayName, getBookingDays } from "@/utilities/bookingHelpers";

interface BookingsWeekViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string, date: string) => void;
  onBookingClick: (booking: BookingType) => void;
  flightTypes: FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

const START_HOUR = 6;
const END_HOUR = 23;

export const BookingsWeekView = memo(({
  bookings,
  selectedDate,
  onCellClick,
  onBookingClick,
  getFlightTypeColor,
}: BookingsWeekViewProps) => {
  // Calculate week start (Monday) and generate 7 days
  const weekStart = selectedDate.startOf("week");
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    []
  );

  // Group bookings by date (including multiday bookings) - OPTIMIZED with memoization
  const bookingsByDate = useMemo(() => {
    const result: Record<string, BookingType[]> = {};

    bookings.forEach((booking) => {
      getBookingDays(booking).forEach((date) => {
        if (!result[date]) {
          result[date] = [];
        }
        result[date].push(booking);
      });
    });

    return result;
  }, [bookings]);

  // Get bookings for a specific day and plane
  const getBookingsForDay = (plane: string, date: string): BookingType[] => {
    const dayBookings = bookingsByDate[date] || [];
    return dayBookings.filter((b) => b.plane === plane);
  };

  const today = DateTime.now().toISODate();

  return (
    <div className="overflow-auto bg-white rounded-lg shadow">
      {/* Week header */}
      <div className="grid grid-cols-7 gap-2 p-4 bg-gray-50 border-b border-gray-200">
        {weekDays.map((day) => {
          const dateString = day.toISODate();
          const isToday = dateString === today;

          return (
            <div
              key={dateString}
              className={`text-center p-2 rounded ${
                isToday ? "bg-blue-500 text-white" : "bg-white"
              }`}
            >
              <div className="font-bold text-lg">
                {day.setLocale("fi").toFormat("ccc")}
              </div>
              <div className={`text-sm ${isToday ? "text-white" : "text-gray-600"}`}>
                {day.toFormat("dd.MM")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid for each plane */}
      <div className="p-4 space-y-6">
        {BOOKABLE_PLANES.map((plane) => (
          <div key={plane} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 font-bold text-lg text-center border-b border-gray-200">
              {getPlaneDisplayName(plane)}
            </div>

            <div className="grid grid-cols-7 divide-x divide-gray-200">
              {weekDays.map((day) => {
                const dateString = day.toISODate();
                if (!dateString) return null;

                const dayBookings = getBookingsForDay(plane, dateString);
                const isToday = dateString === today;

                return (
                  <div
                    key={dateString}
                    className={`min-h-[200px] p-2 ${
                      isToday ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    {/* Time slots grid */}
                    <div className="space-y-1">
                      {hours.map((hour) => {
                        // Find bookings that overlap with this hour
                        const hourBookings = dayBookings.filter((booking) => {
                          const start = DateTime.fromISO(booking.start_time);
                          const end = DateTime.fromISO(booking.end_time);
                          const hourStart = DateTime.fromISO(dateString).set({ hour });
                          const hourEnd = hourStart.plus({ hours: 1 });
                          return start < hourEnd && end > hourStart;
                        });

                        if (hourBookings.length === 0) {
                          return (
                            <div
                              key={hour}
                              className="relative h-[56px] rounded cursor-pointer flex items-center border border-dashed border-gray-300 transition-all hover:border-sblue hover:ring-2 hover:ring-sbluel"
                              onClick={() =>
                                onCellClick(plane, `${hour}:00`, dateString)
                              }
                              title={`Luo varaus klo ${hour}:00`}
                            >
                              <div className="text-xs text-gray-400 p-1">
                                {hour}:00
                              </div>
                            </div>
                          );
                        }

                        // Overlapping bookings share the slot side by side
                        return (
                          <div key={hour} className="relative h-[56px] flex gap-0.5">
                            {hourBookings.map((booking) => {
                              const bookingDays = getBookingDays(booking);
                              const isMultiday = bookingDays.length > 1;
                              const isStartDay = bookingDays[0] === dateString;
                              const isEndDay =
                                bookingDays[bookingDays.length - 1] === dateString;

                              return (
                                <button
                                  key={booking.id}
                                  type="button"
                                  onClick={() => onBookingClick(booking)}
                                  className="flex-1 min-w-0 p-2 rounded text-white text-xs text-left overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-sbluel"
                                  style={{
                                    backgroundColor: getFlightTypeColor(booking.type),
                                  }}
                                  title={`${booking.title} - ${getBookingDisplayName(booking)}\n${DateTime.fromISO(booking.start_time).toFormat("dd.MM HH:mm")} - ${DateTime.fromISO(booking.end_time).toFormat("dd.MM HH:mm")}${isMultiday ? " (Monipäiväinen)" : ""}`}
                                  aria-label={`Varaus: ${booking.title}, ${getBookingDisplayName(booking)}, tyyppi ${booking.type}`}
                                >
                                  <div className="font-semibold truncate flex items-center gap-1">
                                    {isMultiday && (
                                      <span className="text-[10px] opacity-75">
                                        {isStartDay ? "▶" : isEndDay ? "◀" : "◆"}
                                      </span>
                                    )}
                                    {booking.title}
                                  </div>
                                  <div className="text-xs opacity-90 truncate">
                                    {isStartDay || !isMultiday ? DateTime.fromISO(booking.start_time).toFormat("HH:mm") : "..."} - {isEndDay || !isMultiday ? DateTime.fromISO(booking.end_time).toFormat("HH:mm") : "..."}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

BookingsWeekView.displayName = "BookingsWeekView";
