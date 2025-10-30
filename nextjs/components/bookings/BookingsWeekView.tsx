"use client";

import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { useMemo } from "react";

interface BookingsWeekViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string, date: string) => void;
  onBookingClick: (booking: BookingType) => void;
  flightTypes: FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];
const START_HOUR = 6;
const END_HOUR = 23;

export const BookingsWeekView = ({
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

  // Helper function to get all dates a booking spans
  const getBookingDates = (booking: BookingType): string[] => {
    const start = DateTime.fromISO(booking.start_time).startOf("day");
    const end = DateTime.fromISO(booking.end_time).startOf("day");
    const dates: string[] = [];

    let current = start;
    while (current <= end) {
      const dateStr = current.toISODate();
      if (dateStr) dates.push(dateStr);
      current = current.plus({ days: 1 });
    }

    return dates;
  };

  // Group bookings by date (including multiday bookings)
  const bookingsByDate = useMemo(() => {
    const result: Record<string, BookingType[]> = {};

    bookings.forEach((booking) => {
      const dates = getBookingDates(booking);
      dates.forEach((date) => {
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
        {PLANES.map((plane) => (
          <div key={plane} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 font-bold text-lg text-center border-b border-gray-200">
              {plane}
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

                        const hasBooking = hourBookings.length > 0;
                        const booking = hourBookings[0];

                        // Check if this is a multiday booking
                        const isMultiday = booking && DateTime.fromISO(booking.start_time).toISODate() !== DateTime.fromISO(booking.end_time).toISODate();
                        const bookingStartDate = booking ? DateTime.fromISO(booking.start_time).toISODate() : null;
                        const bookingEndDate = booking ? DateTime.fromISO(booking.end_time).toISODate() : null;
                        const isStartDay = bookingStartDate === dateString;
                        const isEndDay = bookingEndDate === dateString;

                        return (
                          <div
                            key={hour}
                            className={`
                              relative h-[56px] rounded cursor-pointer flex items-center
                              transition-all hover:ring-2 hover:ring-sbluel
                              ${hasBooking ? "" : "border border-dashed border-gray-300 hover:border-sblue"}
                            `}
                            onClick={() => {
                              if (hasBooking && booking) {
                                onBookingClick(booking);
                              } else {
                                onCellClick(plane, `${hour}:00`, dateString);
                              }
                            }}
                            title={
                              hasBooking && booking
                                ? `${booking.title} - ${booking.full_name}\n${DateTime.fromISO(booking.start_time).toFormat("dd.MM HH:mm")} - ${DateTime.fromISO(booking.end_time).toFormat("dd.MM HH:mm")}${isMultiday ? " (Monipäiväinen)" : ""}`
                                : `Luo varaus klo ${hour}:00`
                            }
                          >
                            {hasBooking && booking ? (
                              <div
                                className="w-full p-2 rounded text-white text-xs overflow-hidden"
                                style={{
                                  backgroundColor: getFlightTypeColor(booking.type),
                                }}
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
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 p-1">
                                {hour}:00
                              </div>
                            )}
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
};
