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

  // Group bookings by date
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const date = DateTime.fromISO(booking.start_time).toISODate();
    if (!date) return acc;

    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, BookingType[]>);

  // Get today's date for highlighting
  const today = DateTime.now().startOf("day");

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Month header */}
      <div className="bg-gray-100 p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800">
          {selectedDate.setLocale("fi").toFormat("LLLL yyyy")}
        </h2>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Weekday headers */}
        {["Ma", "Ti", "Ke", "To", "Pe", "La", "Su"].map((day) => (
          <div
            key={day}
            className="bg-gray-50 border border-gray-200 p-2 text-center font-semibold text-sm text-gray-700"
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
                transition-colors hover:bg-blue-50
                ${!isCurrentMonth ? "bg-gray-50 opacity-50" : "bg-white"}
                ${isToday ? "ring-2 ring-blue-500" : ""}
                ${isSelected ? "bg-blue-100" : ""}
              `}
              onClick={() => onDayClick(dateString)}
            >
              {/* Day number */}
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`
                    text-sm font-semibold
                    ${isToday ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center" : ""}
                    ${!isCurrentMonth ? "text-gray-400" : "text-gray-700"}
                  `}
                >
                  {day.day}
                </span>
                {dayBookings.length > 0 && (
                  <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                    {dayBookings.length}
                  </span>
                )}
              </div>

              {/* Booking indicators */}
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map((booking, idx) => (
                  <div
                    key={booking.id || idx}
                    className="text-xs p-1 rounded truncate text-white"
                    style={{
                      backgroundColor: getFlightTypeColor(booking.type),
                    }}
                    title={`${booking.plane}: ${booking.title}`}
                  >
                    {booking.plane} - {booking.title}
                  </div>
                ))}
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
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-500"></div>
            <span>Tänään</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-100 border border-gray-300"></div>
            <span>Valittu päivä</span>
          </div>
        </div>
      </div>
    </div>
  );
};
