import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { useMemo, memo } from "react";
import {
  getVisibleBookingsForHour,
  getShortenedName,
  generateHourLabels,
} from "@/utilities/bookingHelpers";
import { getPlaneDisplayName } from "@/utilities/planeHelpers";

interface BookingsDesktopViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string) => void;
  onBookingClick: (booking: BookingType) => void;
  flightTypes: readonly FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475"];
const START_HOUR = 6;
const END_HOUR = 23;

/**
 * Empty cell component for creating new bookings
 */
const EmptyCell = memo(
  ({
    plane,
    hour,
    onCellClick,
  }: {
    plane: string;
    hour: string;
    onCellClick: (plane: string, hour: string) => void;
  }) => (
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
  )
);

EmptyCell.displayName = "EmptyCell";

/**
 * Booking cell component with multiple bookings
 */
const BookingCell = memo(
  ({
    plane,
    hour,
    bookings,
    onBookingClick,
    getFlightTypeColor,
    selectedDate,
  }: {
    plane: string;
    hour: string;
    bookings: BookingType[];
    onBookingClick: (booking: BookingType) => void;
    getFlightTypeColor: (type: string) => string;
    selectedDate: DateTime;
  }) => {
    const maxBookings = Math.min(bookings.length, 3);
    const bookingWidth = 100 / maxBookings;

    return (
      <td
        key={`${plane}-${hour}`}
        className="border border-gray-300 relative p-0"
        style={{ height: "50px", width: "120px" }}
      >
        {bookings.slice(0, maxBookings).map((booking, index) => {
          const isMultiday =
            DateTime.fromISO(booking.start_time).toISODate() !==
            DateTime.fromISO(booking.end_time).toISODate();
          const bookingStartDate = DateTime.fromISO(
            booking.start_time
          ).toISODate();
          const bookingEndDate = DateTime.fromISO(booking.end_time).toISODate();
          const currentDate = selectedDate.toISODate();
          const isStartDay = bookingStartDate === currentDate;
          const isEndDay = bookingEndDate === currentDate;

          return (
            <button
              key={`${plane}-${hour}-${booking.id}`}
              onClick={() => onBookingClick(booking)}
              className="absolute cursor-pointer text-white px-1 overflow-hidden flex flex-col justify-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10"
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
              title={`${booking.title} - ${booking.full_name} (${
                booking.type
              })${
                isMultiday
                  ? `\n${DateTime.fromISO(booking.start_time).toFormat(
                      "dd.MM HH:mm"
                    )} - ${DateTime.fromISO(booking.end_time).toFormat(
                      "dd.MM HH:mm"
                    )} (Monipäiväinen)`
                  : ""
              }`}
              aria-label={`Varaus: ${booking.title}, ${booking.full_name}, tyyppi ${booking.type}`}
            >
              <p className="font-bold text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight flex items-center justify-center gap-0.5">
                {isMultiday && (
                  <span className="text-[8px] opacity-75">
                    {isStartDay ? "▶" : isEndDay ? "◀" : "◆"}
                  </span>
                )}
                <span>
                  {maxBookings > 2
                    ? booking.title.substring(0, 6) + "..."
                    : booking.title}
                </span>
              </p>
              {maxBookings <= 2 && (
                <p className="font-medium text-center text-ellipsis whitespace-nowrap overflow-hidden leading-tight">
                  {getShortenedName(booking.full_name)}
                </p>
              )}
            </button>
          );
        })}
        {bookings.length > 3 && (
          <div
            className="absolute top-0 right-0 bg-gray-600 text-white text-xs px-1 rounded-bl pointer-events-none"
            style={{ fontSize: "10px", lineHeight: "12px" }}
            title={`+${bookings.length - 3} lisää varausta`}
            aria-label={`${bookings.length - 3} lisää varausta`}
          >
            +{bookings.length - 3}
          </div>
        )}
      </td>
    );
  }
);

BookingCell.displayName = "BookingCell";

/**
 * Desktop table view for bookings
 * Optimized with memoization to prevent unnecessary re-renders
 */
export const BookingsDesktopView = memo(
  ({
    bookings,
    selectedDate,
    onCellClick,
    onBookingClick,
    flightTypes,
    getFlightTypeColor,
  }: BookingsDesktopViewProps) => {
    const hours = useMemo(() => generateHourLabels(START_HOUR, END_HOUR), []);

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
                  {getPlaneDisplayName(plane)}
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
                        onCellClick={onCellClick}
                      />
                    );
                  }

                  return (
                    <BookingCell
                      key={`${plane}-${hour}`}
                      plane={plane}
                      hour={hour}
                      bookings={visibleBookings}
                      onBookingClick={onBookingClick}
                      getFlightTypeColor={getFlightTypeColor}
                      selectedDate={selectedDate}
                    />
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

BookingsDesktopView.displayName = "BookingsDesktopView";
