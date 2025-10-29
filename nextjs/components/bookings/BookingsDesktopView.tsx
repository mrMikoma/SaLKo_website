import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { useMemo, memo } from "react";
import {
  getVisibleBookingsForHour,
  getShortenedName,
  generateHourLabels,
} from "@/utils/bookingHelpers";
import { DraggableBooking } from "./DraggableBooking";
import { DroppableCell } from "./DroppableCell";

interface BookingsDesktopViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string) => void;
  onBookingClick: (booking: BookingType) => void;
  onBookingDrop?: (booking: BookingType, newPlane: string, newStartTime: string) => void;
  flightTypes: readonly FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
  isLoggedIn?: boolean;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];
const START_HOUR = 6;
const END_HOUR = 23;

/**
 * Empty cell component for creating new bookings
 */
const EmptyCell = memo(({
  plane,
  hour,
  date,
  onCellClick,
  onDrop,
  isLoggedIn,
}: {
  plane: string;
  hour: string;
  date: string;
  onCellClick: (plane: string, hour: string) => void;
  onDrop?: (booking: BookingType, newPlane: string, newStartTime: string) => void;
  isLoggedIn: boolean;
}) => {
  const hourValue = parseInt(hour.split(":")[0]);

  if (onDrop) {
    return (
      <DroppableCell
        plane={plane}
        hour={hourValue}
        date={date}
        onDrop={onDrop}
        onCellClick={() => onCellClick(plane, hour)}
        className="cursor-pointer border border-gray-300 p-2 hover:bg-gray-100 transition-colors"
        isLoggedIn={isLoggedIn}
      >
        <div style={{ height: "50px", width: "120px" }}></div>
      </DroppableCell>
    );
  }

  return (
    <td
      key={`${plane}-${hour}`}
      onClick={() => onCellClick(plane, hour)}
      className="cursor-pointer border border-gray-300 p-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      style={{ height: "50px", width: "120px" }}
      tabIndex={0}
      role="button"
      aria-label={`Luo varaus koneelle ${plane} kello ${hour}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCellClick(plane, hour);
        }
      }}
    >
      <div></div>
    </td>
  );
});

EmptyCell.displayName = "EmptyCell";

/**
 * Booking cell component with multiple bookings
 */
const BookingCell = memo(({
  plane,
  hour,
  date,
  bookings,
  onBookingClick,
  onDrop,
  getFlightTypeColor,
  isLoggedIn,
}: {
  plane: string;
  hour: string;
  date: string;
  bookings: BookingType[];
  onBookingClick: (booking: BookingType) => void;
  onDrop?: (booking: BookingType, newPlane: string, newStartTime: string) => void;
  getFlightTypeColor: (type: string) => string;
  isLoggedIn: boolean;
}) => {
  const maxBookings = Math.min(bookings.length, 3);
  const bookingWidth = 100 / maxBookings;
  const hourValue = parseInt(hour.split(":")[0]);

  const cellContent = (
    <>
      {bookings.slice(0, maxBookings).map((booking, index) => {
        const bookingButton = (
          <button
            key={`${plane}-${hour}-${booking.id}`}
            onClick={() => onBookingClick(booking)}
            className="absolute cursor-grab active:cursor-grabbing text-white px-1 overflow-hidden flex flex-col justify-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10"
            style={{
              left: `${index * bookingWidth}%`,
              width: `${bookingWidth}%`,
              top: "0px",
              bottom: "0px",
              backgroundColor: getFlightTypeColor(booking.type),
              borderRight:
                index < maxBookings - 1
                  ? "1px solid rgba(255,255,255,0.5)"
                  : "none",
              fontSize: maxBookings > 2 ? "10px" : "12px",
            }}
            title={`${booking.title} - ${booking.full_name} (${booking.type})`}
            aria-label={`Varaus: ${booking.title}, ${booking.full_name}, tyyppi ${booking.type}`}
          >
            <p className="font-bold text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight">
              {maxBookings > 2
                ? booking.title.substring(0, 6) + "..."
                : booking.title}
            </p>
            {maxBookings <= 2 && (
              <p className="font-medium text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight">
                {getShortenedName(booking.full_name)}
              </p>
            )}
          </button>
        );

        // Wrap in DraggableBooking if user is logged in
        if (isLoggedIn && onDrop) {
          return (
            <DraggableBooking
              key={`${plane}-${hour}-${booking.id}`}
              booking={booking}
              onBookingClick={() => onBookingClick(booking)}
              style={{
                position: "absolute",
                left: `${index * bookingWidth}%`,
                width: `${bookingWidth}%`,
                top: "0px",
                bottom: "0px",
              }}
            >
              <div
                className="h-full text-white px-1 overflow-hidden flex flex-col justify-center"
                style={{
                  backgroundColor: getFlightTypeColor(booking.type),
                  borderRight:
                    index < maxBookings - 1
                      ? "1px solid rgba(255,255,255,0.5)"
                      : "none",
                  fontSize: maxBookings > 2 ? "10px" : "12px",
                }}
              >
                <p className="font-bold text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight">
                  {maxBookings > 2
                    ? booking.title.substring(0, 6) + "..."
                    : booking.title}
                </p>
                {maxBookings <= 2 && (
                  <p className="font-medium text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight">
                    {getShortenedName(booking.full_name)}
                  </p>
                )}
              </div>
            </DraggableBooking>
          );
        }

        return bookingButton;
      })}
      {bookings.length > 3 && (
        <div
          className="absolute top-0 right-0 bg-gray-600 text-white text-xs px-1 rounded-bl pointer-events-none z-10"
          style={{ fontSize: "10px", lineHeight: "12px" }}
          title={`+${bookings.length - 3} lisää varausta`}
          aria-label={`${bookings.length - 3} lisää varausta`}
        >
          +{bookings.length - 3}
        </div>
      )}
    </>
  );

  // Use DroppableCell if drag and drop is enabled
  if (onDrop && isLoggedIn) {
    return (
      <DroppableCell
        plane={plane}
        hour={hourValue}
        date={date}
        onDrop={onDrop}
        className="border border-gray-300 relative p-0"
        isLoggedIn={isLoggedIn}
      >
        <div style={{ height: "50px", width: "120px" }}>
          {cellContent}
        </div>
      </DroppableCell>
    );
  }

  return (
    <td
      key={`${plane}-${hour}`}
      className="border border-gray-300 relative p-0"
      style={{ height: "50px", width: "120px" }}
    >
      {cellContent}
    </td>
  );
});

BookingCell.displayName = "BookingCell";

/**
 * Desktop table view for bookings
 * Optimized with memoization to prevent unnecessary re-renders
 */
export const BookingsDesktopView = memo(({
  bookings,
  selectedDate,
  onCellClick,
  onBookingClick,
  onBookingDrop,
  flightTypes,
  getFlightTypeColor,
  isLoggedIn = false,
}: BookingsDesktopViewProps) => {
  const hours = useMemo(
    () => generateHourLabels(START_HOUR, END_HOUR),
    []
  );

  const dateString = selectedDate.toISODate() || "";

  return (
    <div className="w-full overflow-auto">
      <table className="w-full border-collapse bg-gray-50 table-fixed">
        <thead>
          <tr>
            <th
              className="border border-gray-300 p-2 bg-gray-100 overflow-hidden"
              style={{ width: "80px" }}
            >
              ALKAVA TUNTI
            </th>
            {PLANES.map((plane) => (
              <th
                key={plane}
                className="border border-gray-300 p-2 bg-gray-100"
                style={{ height: "50px", width: "120px" }}
              >
                {plane}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th
                className="border border-gray-300 p-2 bg-gray-100"
                style={{ height: "50px", width: "80px" }}
              >
                {hour}
              </th>
              {PLANES.map((plane) => {
                const hourValue = parseInt(hour.split(":")[0]);
                const visibleBookings = getVisibleBookingsForHour(
                  plane,
                  hourValue,
                  bookings,
                  selectedDate,
                  flightTypes
                );

                if (visibleBookings.length === 0) {
                  return (
                    <EmptyCell
                      key={`${plane}-${hour}`}
                      plane={plane}
                      hour={hour}
                      date={dateString}
                      onCellClick={onCellClick}
                      onDrop={onBookingDrop}
                      isLoggedIn={isLoggedIn}
                    />
                  );
                }

                return (
                  <BookingCell
                    key={`${plane}-${hour}`}
                    plane={plane}
                    hour={hour}
                    date={dateString}
                    bookings={visibleBookings}
                    onBookingClick={onBookingClick}
                    onDrop={onBookingDrop}
                    getFlightTypeColor={getFlightTypeColor}
                    isLoggedIn={isLoggedIn}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

BookingsDesktopView.displayName = "BookingsDesktopView";
