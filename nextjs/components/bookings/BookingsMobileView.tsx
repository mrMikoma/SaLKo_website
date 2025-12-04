import { memo } from "react";
import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { formatTime } from "@/utilities/bookingHelpers";

interface BookingsMobileViewProps {
  bookings: BookingType[];
  onBookingClick: (booking: BookingType) => void;
  onCreateBooking?: (plane: string) => void;
  flightTypes: readonly FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
  isLoggedIn?: boolean;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475", "OH-PDX"];

/**
 * Mobile-optimized view for bookings
 * Displays bookings as a list grouped by plane
 */
export const BookingsMobileView = memo(
  ({
    bookings,
    onBookingClick,
    onCreateBooking,
    flightTypes,
    getFlightTypeColor,
    isLoggedIn = false,
  }: BookingsMobileViewProps) => {
    const groupedBookings = PLANES.map((plane) => ({
      plane,
      bookings: bookings
        .filter((booking) => booking.plane === plane)
        .sort(
          (a, b) =>
            DateTime.fromISO(a.start_time).toMillis() -
            DateTime.fromISO(b.start_time).toMillis()
        ),
    }));

    const getFlightTypeLabel = (type: string) => {
      return flightTypes.find((ft) => ft.type === type)?.label || type;
    };

    return (
      <div className="space-y-4 px-2">
        {groupedBookings.map(({ plane, bookings: planeBookings }) => (
          <div
            key={plane}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="bg-gray-700 text-white px-4 py-3 font-bold text-lg">
              {plane}
            </div>

            <div className="divide-y divide-gray-200">
              {/* Create booking button - always enabled for guests and logged-in users */}
              {onCreateBooking && (
                <div>
                  <button
                    onClick={() => onCreateBooking(plane)}
                    className="w-full p-4 bg-sblue hover:bg-sblued text-swhite font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sbluel"
                    aria-label="Luo uusi varaus"
                  >
                    + Luo uusi varaus
                  </button>
                  {!isLoggedIn && (
                    <div className="p-3 bg-blue-50 border-b border-blue-100 text-center text-sm text-gray-700">
                      <p className="font-medium">
                        Voit varata myös ilman kirjautumista.
                      </p>
                      <p className="text-gray-600 mt-1">
                        <a
                          href="/auth/login"
                          className="text-sblue hover:underline"
                        >
                          Kirjaudu sisään
                        </a>{" "}
                        jos sinulla on käyttäjätunnus.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {planeBookings.length === 0 ? (
                <div className="p-4 text-gray-500 text-center italic">
                  Ei varauksia
                </div>
              ) : (
                planeBookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => onBookingClick(booking)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-100"
                    style={{
                      borderLeftWidth: "4px",
                      borderLeftColor: getFlightTypeColor(booking.type),
                    }}
                    aria-label={`Varaus: ${booking.title}, ${
                      booking.full_name
                    }, ${formatTime(booking.start_time)} - ${formatTime(
                      booking.end_time
                    )}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-base">
                        {booking.title}
                      </h4>
                      <span
                        className="text-xs px-2 py-1 rounded-full text-white font-medium"
                        style={{
                          backgroundColor: getFlightTypeColor(booking.type),
                        }}
                      >
                        {getFlightTypeLabel(booking.type)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-gray-700 font-medium">
                        {booking.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Aika:</span>{" "}
                        {formatTime(booking.start_time)} -{" "}
                        {formatTime(booking.end_time)}
                      </p>
                      {booking.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {booking.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

BookingsMobileView.displayName = "BookingsMobileView";
