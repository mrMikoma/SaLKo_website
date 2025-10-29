import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypes } from "./bookingSection";
import { useMemo } from "react";

interface BookingsDesktopViewProps {
  bookings: BookingType[];
  selectedDate: DateTime;
  onCellClick: (plane: string, hour: string) => void;
  onBookingClick: (booking: BookingType) => void;
  flightTypes: FlightTypes[];
  getFlightTypeColor: (type: string) => string;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];
const HOUR_INTERVAL = 1;
const START_HOUR = 6;
const END_HOUR = 23;

/**
 * Desktop table view for bookings
 * Optimized with memoization to prevent unnecessary re-renders
 */
export const BookingsDesktopView = ({
  bookings,
  selectedDate,
  onCellClick,
  onBookingClick,
  flightTypes,
  getFlightTypeColor,
}: BookingsDesktopViewProps) => {
  const hours = useMemo(
    () =>
      Array.from(
        { length: (END_HOUR - START_HOUR + 1) / HOUR_INTERVAL },
        (_, i) => `${START_HOUR + i * HOUR_INTERVAL}:00`
      ),
    []
  );

  const getShortenedName = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1]?.charAt(0) || ""}.`;
    }
    return name;
  };

  const getVisibleBookingsForHour = (
    plane: string,
    hourValue: number,
    allBookings: BookingType[]
  ): BookingType[] => {
    // Filter bookings for this specific plane only
    const planeBookings = allBookings.filter(
      (booking) => booking.plane === plane
    );

    // Find bookings that cover this specific hour
    const activeBookings = planeBookings.filter((booking) => {
      // Convert UTC times to local time
      const startTime = DateTime.fromISO(booking.start_time).toLocal();
      const endTime = DateTime.fromISO(booking.end_time).toLocal();

      // Skip bookings with invalid time ranges
      if (endTime <= startTime) {
        return false;
      }

      // Check if booking is on the selected date
      if (!startTime.hasSame(selectedDate, "day")) {
        return false;
      }

      // Check if the booking covers this hour
      return startTime.hour <= hourValue && endTime.hour > hourValue;
    });

    if (activeBookings.length === 0) {
      return [];
    }

    // Sort all active bookings by priority (highest first)
    const sortedByPriority = activeBookings.sort((a, b) => {
      const priorityA =
        flightTypes.find((t) => t.type === a.type)?.priority ?? 0;
      const priorityB =
        flightTypes.find((t) => t.type === b.type)?.priority ?? 0;
      return priorityB - priorityA; // Higher priority first
    });

    return sortedByPriority;
  };

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
                  bookings
                );

                if (visibleBookings.length === 0) {
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
                }

                // Render multiple bookings side by side
                const maxBookings = Math.min(visibleBookings.length, 3);
                const bookingWidth = 100 / maxBookings;

                return (
                  <td
                    key={`${plane}-${hour}`}
                    className="border border-gray-300 relative p-0"
                    style={{ height: "50px", width: "120px" }}
                  >
                    {visibleBookings.slice(0, maxBookings).map((booking, index) => (
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
                    ))}
                    {visibleBookings.length > 3 && (
                      <div
                        className="absolute top-0 right-0 bg-gray-600 text-white text-xs px-1 rounded-bl pointer-events-none"
                        style={{ fontSize: "10px", lineHeight: "12px" }}
                        title={`+${visibleBookings.length - 3} lisää varausta`}
                        aria-label={`${visibleBookings.length - 3} lisää varausta`}
                      >
                        +{visibleBookings.length - 3}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
