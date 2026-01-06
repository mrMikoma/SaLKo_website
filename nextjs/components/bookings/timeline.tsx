"use client";

import { useEffect, useState } from "react";
import { arrangeBookingsColumns, BookingType } from "@/utilities/bookings";

type Booking = BookingType;

interface FlightType {
  value: string;
  label: string;
  color: string;
}

interface TimelineProps {
  fullHours: Date[];
  bookings: Booking[];
  previewBooking: Booking | null;
  flightTypes: FlightType[];
  onDeleteBooking: (booking: Booking) => void;
}

/* Example bookings data
Bookings: 
(5) [{…}, {…}, {…}, {…}, {…}]
0
: 
{id: 1, plane: 'OH-CON', start_time: Tue Apr 22 2025 19:00:00 GMT+0300 (Eastern European Summer Time), end_time: Tue Apr 22 2025 21:00:00 GMT+0300 (Eastern European Summer Time), full_name: 'Järjestelmän Valvoja', …}
1
: 
{id: 3, plane: 'OH-CON', start_time: Tue Apr 22 2025 09:00:00 GMT+0300 (Eastern European Summer Time), end_time: Tue Apr 22 2025 15:00:00 GMT+0300 (Eastern European Summer Time), full_name: 'Järjestelmän Valvoja', …}
2
: 
{id: 5, plane: 'OH-CON', start_time: Tue Apr 22 2025 18:00:00 GMT+0300 (Eastern European Summer Time), end_time: Tue Apr 22 2025 15:00:00 GMT+0300 (Eastern European Summer Time), full_name: 'Järjestelmän Valvoja', …}
3
: 
{id: 7, plane: 'OH-CON', start_time: Tue Apr 22 2025 18:00:00 GMT+0300 (Eastern European Summer Time), end_time: Tue Apr 22 2025 20:00:00 GMT+0300 (Eastern European Summer Time), full_name: 'Järjestelmän Valvoja', …}
4
: 
{id: 8, plane: 'OH-CON', start_time: Tue Apr 22 2025 18:00:00 GMT+0300 (Eastern European Summer Time), end_time: Tue Apr 22 2025 21:00:00 GMT+0300 (Eastern European Summer Time), full_name: 'Järjestelmän Valvoja', …}
length
: 
5
*/

const hourHeight = 40;
const timelinePadding = 72;
const bookingPadding = 4;

const Timeline = ({
  fullHours,
  bookings,
  previewBooking,
  flightTypes,
  onDeleteBooking,
}: TimelineProps) => {
  console.log("Bookings:", bookings);

  const [bookingsByColumns, setBookingsByColumns] = useState<Booking[][]>([]);

  useEffect(() => {
    async function loadArrangedColumns() {
      const columns = await arrangeBookingsColumns(bookings);
      setBookingsByColumns(columns);
    }

    loadArrangedColumns();
  }, [bookings]);

  const startTime = fullHours[0].getTime();
  const endTime = fullHours[fullHours.length - 1].getTime();

  // Print the bookings by columns
  bookingsByColumns.forEach((column, colIndex) => {
    console.log(`Column ${colIndex}:`);
    column.forEach((booking) => {
      const start = new Date(booking.start_time).getTime();
      const end = new Date(booking.end_time).getTime();
      console.log(
        `  Booking ID: ${booking.id}, Start: ${new Date(
          start
        )}, End: ${new Date(end)}`
      );
    });
  });

  return (
    <div>
      {/* Render Vertical Timeline */}
      <div className="flex flex-col w-[72px] h-full">
        {fullHours.map((hour) => {
          const hourLabel = new Date(hour).toLocaleTimeString("fi-FI", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div
              key={hour.toISOString()}
              className="w-[72px] row-span-1 border-b border-black text-sblack bg-sbluel text-sm grid grid-cols-[max-content] items-center justify-start pl-2"
            >
              {hourLabel}
            </div>
          );
        })}
      </div>
      {/* Render 0th Column */}
    </div>
  );
};

export default Timeline;
