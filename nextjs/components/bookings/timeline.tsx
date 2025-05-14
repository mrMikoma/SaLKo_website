"use client";

import type React from "react";
import { useEffect, useState } from "react";
import TrashIcon from "../icons/trash";
import XCrossIcon from "../icons/xCross";
import { arrangeBookingsColumns } from "@/utilities/bookings";

interface Booking {
  id: string;
  user_id: string;
  title: string;
  start_time: number;
  end_time: number;
  type: string;
  plane: string;
  description: string;
}

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

/*
Full hours set: (18) [Mon Apr 21 2025 06:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 07:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 08:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 09:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 10:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 11:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 12:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 13:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 14:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 15:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 16:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 17:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 18:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 19:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 20:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 21:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 22:00:00 GMT+0300 (Eastern European Summer Time), Mon Apr 21 2025 23:00:00 GMT+0300 (Eastern European Summer Time)]
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
  const totalDuration = endTime - startTime;
  const timelineHeight = fullHours.length * hourHeight;

  console.log("Start time:", new Date(startTime));
  console.log("End time:", new Date(endTime));
  console.log("Total duration (ms):", totalDuration);
  console.log("Columns:", bookingsByColumns);

  const fallbackColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const calculateTopOffset = (time: number) =>
    ((time - startTime) / totalDuration) * timelineHeight;

  const calculateHeight = (start: number, end: number) =>
    ((end - start) / totalDuration) * timelineHeight;

  return (
    <div className="overflow-auto w-full h-full bg-white">
      <div className="flex min-w-[600px] releative">
        {/* Time Labels */}
        <div className="flex flex-col w-[72px] flex-shrink-0">
          {fullHours.map((hour, i) => (
            <div
              key={i}
              className="w-full h-[40px] border-b border-gray-300 text-xs text-gray-600 flex items-start justify-end pr-2 pt-1 bg-gray-50"
            >
              {hour.toLocaleTimeString("fi-FI", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          ))}
        </div>

        {/* Booking Grid */}
        <div className="relative flex-1">
          {/* This container layers everything correctly */}
          <div
            style={{ height: `${timelineHeight}px` }}
            className="relative w-full"
          >
            {/* Hour Lines - Lower z-index */}
            {fullHours.map((_, i) => (
              <div
                key={i}
                className="absolute z-0 left-0 w-full border-t border-gray-100 pointer-events-none"
                style={{ top: `${i * hourHeight}px` }}
              />
            ))}

            {/* Bookings - Higher z-index */}
            {bookingsByColumns.flatMap((column, colIndex, allColumns) =>
              column.map((booking) => {
                const top = calculateTopOffset(booking.start_time);
                const height = calculateHeight(
                  booking.start_time,
                  booking.end_time
                );
                const left = (colIndex / allColumns.length) * 100;
                const width = 100 / allColumns.length;
                const flightType = flightTypes.find(
                  (ft) => ft.value === booking.type
                );
                const color =
                  flightType?.color ||
                  fallbackColors[colIndex % fallbackColors.length];

                return (
                  <div
                    key={booking.id}
                    className="absolute z-20 p-1 text-xs rounded-md shadow-md text-white cursor-pointer overflow-hidden hover:opacity-90"
                    style={{
                      top,
                      height,
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: color,
                    }}
                    title={booking.title}
                  >
                    <div className="font-semibold truncate">
                      {booking.title}
                    </div>
                    <div className="truncate">
                      {new Date(booking.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(booking.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;

/*
    <div className="flex flex-row w-full h-full">

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


      <div className="flex-1 relative bg-swhite">
        <div
          className="grid w-full h-[400px] grid-cols-[repeat(auto-fill,minmax(72px,1fr))] grid-rows-[repeat(auto-fill,minmax(40px,1fr))]"
        >
          {bookingsByColumns.map((column, colIndex) => (
            <div
              key={colIndex}
              className="relative border-l border-black"
              style={{ height: "100%" }}
            >
              {column.map((booking) => {
                const start = new Date(booking.start_time).getTime();
                const end = new Date(booking.end_time).getTime();

                const topPercent = ((start - startTime) / totalDuration) * 100;
                const heightPercent = ((end - start) / totalDuration) * 100;

                const flightType = flightTypes.find(
                  (ft) => ft.value === booking.type
                );

                return (
                  <div
                    key={booking.id}
                    className="absolute left-1 right-1 px-1 py-0.5 cursor-pointer rounded-md shadow-sm text-sblack hover:opacity-90"
                    style={{
                      top: `${topPercent}%`,
                      height: `${heightPercent}%`,
                      backgroundColor: flightType?.color || "#ccc",
                    }}
                  >
                    <div className="font-semibold text-xs truncate">
                      {booking.title} {booking.start_time.toString()}
                      {" - "}
                      {booking.end_time.toString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
*/
