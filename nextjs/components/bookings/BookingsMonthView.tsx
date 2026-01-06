"use client";

import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";

interface BookingsMonthViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onDayClick: (date: string) => void;
  flightTypes: FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

export const BookingsMonthView = ({
  bookings,
  selectedDate,
  onDayClick,
  getFlightTypeColor,
}: BookingsMonthViewProps) => {
  // Get first day of month and calculate calendar grid
  const monthStart = selectedDate.startOf("month");
  const monthEnd = selectedDate.endOf("month");
  const calendarStart = monthStart.startOf("week");
  const calendarEnd = monthEnd.endOf("week");

  // Generate all days in the calendar grid
  const calendarDays: DateTime[] = [];
  let currentDay = calendarStart;
  while (currentDay <= calendarEnd) {
    calendarDays.push(currentDay);
    currentDay = currentDay.plus({ days: 1 });
  }

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
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const dates = getBookingDates(booking);
    dates.forEach((date) => {
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(booking);
    });
    return acc;
  }, {} as Record<string, BookingType[]>);

  // Get today's date for highlighting
  const today = DateTime.now().startOf("day");

  return (
    <div className="bg-swhite rounded-lg shadow overflow-hidden">
      {/* Month header */}
      <div className="bg-gradient-to-r from-sblue to-sblued p-4 text-center">
        <h2 className="text-2xl font-bold text-swhite capitalize">
          {selectedDate.setLocale("fi").toFormat("LLLL yyyy")}
        </h2>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Weekday headers */}
        {["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"].map((day) => (
          <div
            key={day}
            className="bg-sgrey border border-gray-200 p-2 text-center font-semibold text-sm text-sblack"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day) => {
          const dateString = day.toISODate();
          if (!dateString) return null;

          const dayBookings = bookingsByDate[dateString] || [];
          const isCurrentMonth = day.month === selectedDate.month;
          const isToday = day.hasSame(today, "day");
          const isSelected = day.hasSame(selectedDate, "day");

          return (
            <div
              key={dateString}
              className={`
                border border-gray-200 min-h-[100px] p-2 cursor-pointer
                transition-colors hover:bg-sbluel/10
                ${!isCurrentMonth ? "bg-sgrey opacity-50" : "bg-swhite"}
                ${isToday ? "ring-2 ring-sblue" : ""}
                ${isSelected ? "bg-sbluel/20" : ""}
              `}
              onClick={() => onDayClick(dateString)}
            >
              {/* Day number */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`
                    text-sm font-semibold
                    ${isToday ? "bg-sblue text-swhite rounded-full w-6 h-6 flex items-center justify-center" : ""}
                    ${!isCurrentMonth ? "text-gray-400" : "text-sblack"}
                  `}
                >
                  {day.day}
                </span>
                {dayBookings.length > 0 && (
                  <span className="text-xs bg-sred text-swhite rounded-full px-2 py-0.5">
                    {dayBookings.length}
                  </span>
                )}
              </div>

              {/* Booking indicators */}
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking, idx) => {
                  const isMultiday = DateTime.fromISO(booking.start_time).toISODate() !== DateTime.fromISO(booking.end_time).toISODate();
                  const bookingStartDate = DateTime.fromISO(booking.start_time).toISODate();
                  const bookingEndDate = DateTime.fromISO(booking.end_time).toISODate();
                  const isStartDay = bookingStartDate === dateString;
                  const isEndDay = bookingEndDate === dateString;

                  return (
                    <div
                      key={booking.id || idx}
                      className="text-xs p-1 rounded truncate text-white flex items-center gap-1"
                      style={{
                        backgroundColor: getFlightTypeColor(booking.type),
                      }}
                      title={`${booking.plane}: ${booking.title}\n${DateTime.fromISO(booking.start_time).toFormat("dd.MM HH:mm")} - ${DateTime.fromISO(booking.end_time).toFormat("dd.MM HH:mm")}${isMultiday ? " (Monipäiväinen)" : ""}`}
                    >
                      {isMultiday && (
                        <span className="text-[10px] opacity-75">
                          {isStartDay ? "▶" : isEndDay ? "◀" : "◆"}
                        </span>
                      )}
                      <span className="truncate">{booking.plane} - {booking.title}</span>
                    </div>
                  );
                })}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayBookings.length - 3} lisää
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 bg-sgrey border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-sblack">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-sblue border-2 border-sblue"></div>
            <span>Tänään</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-sbluel/20 border border-sbluel"></div>
            <span>Valittu päivä</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">▶ Alkaa / ◀ Päättyy / ◆ Jatkuu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
