"use client";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { DateTime } from "@/utilities/clubTime";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { useMemo, memo } from "react";
import { getBookingDays } from "@/utilities/bookingHelpers";

interface BookingsMonthViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onDayClick: (date: string) => void;
  // Given on phones: the month and its arrows head the calendar
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  flightTypes: FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

export const BookingsMonthView = memo(
  ({
    bookings,
    selectedDate,
    onDayClick,
    onPreviousMonth,
    onNextMonth,
    getFlightTypeColor,
  }: BookingsMonthViewProps) => {
    // Get first day of month and calculate calendar grid
    const calendarDays = useMemo(() => {
      const monthStart = selectedDate.startOf("month");
      const monthEnd = selectedDate.endOf("month");
      const calendarStart = monthStart.startOf("week");
      const calendarEnd = monthEnd.endOf("week");

      const days: DateTime[] = [];
      let currentDay = calendarStart;
      while (currentDay <= calendarEnd) {
        days.push(currentDay);
        currentDay = currentDay.plus({ days: 1 });
      }
      return days;
    }, [selectedDate]);

    // Group bookings by date (including multiday bookings)
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

    // Get today's date for highlighting
    const today = DateTime.now().startOf("day");

    return (
      <div className="bg-swhite rounded-lg shadow overflow-hidden">
        {onPreviousMonth && onNextMonth && (
          <div className="flex items-center justify-between gap-2 bg-sblue px-1 py-1 text-swhite">
            <button
              type="button"
              onClick={onPreviousMonth}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-swhite/15 active:bg-swhite/25 focus:outline-none focus:ring-2 focus:ring-swhite/60"
              aria-label="Edellinen kuukausi"
            >
              <LeftOutlined className="text-lg" />
            </button>
            <span className="font-bold capitalize">{selectedDate.setLocale("fi").toFormat("LLLL yyyy")}</span>
            <button
              type="button"
              onClick={onNextMonth}
              className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-swhite/15 active:bg-swhite/25 focus:outline-none focus:ring-2 focus:ring-swhite/60"
              aria-label="Seuraava kuukausi"
            >
              <RightOutlined className="text-lg" />
            </button>
          </div>
        )}

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
                border border-gray-200 min-h-[52px] sm:min-h-[100px] p-1 sm:p-2 cursor-pointer
                transition-colors hover:bg-sbluel/10
                ${
                  !isCurrentMonth
                    ? "bg-sgrey opacity-50"
                    : isSelected
                    ? "bg-sbluel/20"
                    : "bg-swhite"
                }
                ${isToday ? "ring-2 ring-sblue ring-inset" : ""}
              `}
                onClick={() => onDayClick(dateString)}
              >
                {/* Day number */}
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`
                    text-sm font-semibold
                    ${
                      isToday
                        ? "bg-sblue text-swhite rounded-full w-6 h-6 flex items-center justify-center"
                        : ""
                    }
                    ${!isCurrentMonth ? "text-gray-400" : "text-sblack"}
                  `}
                  >
                    {day.day}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-xs bg-sred-dark text-swhite rounded-full px-1.5 sm:px-2 py-0.5">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                {/* Booking indicators — hidden on mobile, day number + count is enough */}
                <div className="hidden sm:block space-y-1">
                  {dayBookings.slice(0, 3).map((booking, idx) => {
                    const bookingDays = getBookingDays(booking);
                    const isMultiday = bookingDays.length > 1;
                    const isStartDay = bookingDays[0] === dateString;
                    const isEndDay =
                      bookingDays[bookingDays.length - 1] === dateString;

                    return (
                      <div
                        key={booking.id || idx}
                        className="text-xs p-1 rounded truncate text-sblack flex items-center gap-1"
                        style={{
                          backgroundColor: getFlightTypeColor(booking.type),
                        }}
                        title={`${booking.plane}: ${
                          booking.title
                        }\n${DateTime.fromISO(booking.start_time).toFormat(
                          "dd.MM HH:mm"
                        )} - ${DateTime.fromISO(booking.end_time).toFormat(
                          "dd.MM HH:mm"
                        )}${isMultiday ? " (Monipäiväinen)" : ""}`}
                      >
                        {isMultiday && (
                          <span className="text-[10px] opacity-75">
                            {isStartDay ? "▶" : isEndDay ? "◀" : "◆"}
                          </span>
                        )}
                        <span className="truncate">
                          {booking.plane} - {booking.title}
                        </span>
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
  }
);

BookingsMonthView.displayName = "BookingsMonthView";
