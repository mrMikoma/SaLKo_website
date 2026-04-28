import { memo, useState } from "react";
import { DateTime } from "luxon";
import { BookingType } from "@/utilities/bookings";
import { FlightTypeConfig } from "@/types/bookings";
import { formatTime } from "@/utilities/bookingHelpers";
import { getPlaneDisplayName } from "@/utilities/planeHelpers";

interface BookingsMobileViewProps {
  bookings: BookingType[];
  onBookingClick: (booking: BookingType) => void;
  onCreateBooking?: (plane: string) => void;
  flightTypes: readonly FlightTypeConfig[];
  getFlightTypeColor: (type: string) => string;
}

const PLANES = ["OH-CON", "OH-386", "OH-816", "OH-829", "OH-475"];

export const BookingsMobileView = memo(
  ({
    bookings,
    onBookingClick,
    onCreateBooking,
    flightTypes,
    getFlightTypeColor,
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

    const getFlightTypeLabel = (type: string) =>
      flightTypes.find((ft) => ft.type === type)?.label || type;

    // Track manual expand/collapse overrides; default: collapsed when no bookings
    const [manualToggles, setManualToggles] = useState<Map<string, boolean>>(
      new Map()
    );

    const getIsCollapsed = (plane: string, hasBookings: boolean) => {
      if (manualToggles.has(plane)) return manualToggles.get(plane)!;
      return !hasBookings;
    };

    const togglePlane = (plane: string, hasBookings: boolean) => {
      setManualToggles((prev) => {
        const next = new Map(prev);
        const currentCollapsed = prev.has(plane)
          ? prev.get(plane)!
          : !hasBookings;
        next.set(plane, !currentCollapsed);
        return next;
      });
    };

    return (
      <div className="space-y-3 px-2">
        {groupedBookings.map(({ plane, bookings: planeBookings }) => {
          const hasBookings = planeBookings.length > 0;
          const collapsed = getIsCollapsed(plane, hasBookings);

          return (
            <div
              key={plane}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              {/* Header: tap to toggle, + button to create */}
              <div
                className="bg-gray-700 text-white px-4 py-3 flex justify-between items-center cursor-pointer select-none"
                onClick={() => togglePlane(plane, hasBookings)}
                role="button"
                aria-expanded={!collapsed}
                aria-label={`${getPlaneDisplayName(plane)}, ${
                  hasBookings
                    ? planeBookings.length + " varausta"
                    : "ei varauksia"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {getPlaneDisplayName(plane)}
                  </span>
                  {hasBookings && (
                    <span className="text-sm font-normal text-white/70">
                      ({planeBookings.length})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {onCreateBooking && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateBooking(plane);
                      }}
                      className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-xl font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
                      aria-label={`Luo uusi varaus: ${getPlaneDisplayName(plane)}`}
                    >
                      +
                    </button>
                  )}
                  <span className="text-xs text-white/60">
                    {collapsed ? "▼" : "▲"}
                  </span>
                </div>
              </div>

              {/* Booking list */}
              {!collapsed && (
                <div className="divide-y divide-gray-200">
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
                        {/* Time — most prominent */}
                        <p className="text-sm text-gray-600 mb-1.5">
                          <span className="font-medium">Aika:</span>{" "}
                          <span className="font-bold text-gray-900 text-base">
                            {formatTime(booking.start_time)} –{" "}
                            {formatTime(booking.end_time)}
                          </span>
                        </p>

                        {/* Title and flight type badge */}
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {booking.title}
                          </h4>
                          <span
                            className="text-xs px-2 py-1 rounded-full text-white font-medium ml-2 flex-shrink-0"
                            style={{
                              backgroundColor: getFlightTypeColor(booking.type),
                            }}
                          >
                            {getFlightTypeLabel(booking.type)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700">
                          {booking.full_name}
                        </p>

                        {booking.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {booking.description}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

BookingsMobileView.displayName = "BookingsMobileView";
