import { FaApple, FaGoogle } from "react-icons/fa";
import {
  CalendarEvent,
  googleCalendarUrl,
  icsUrl,
} from "@/utilities/calendarExport";

interface BookingCalendarLinksProps {
  booking: CalendarEvent;
  // The .ics route needs a session; guests only get the Google link
  isLoggedIn: boolean;
  // Days in a repeating series that starts with this booking
  seriesCount?: number;
}

const linkClassName =
  "flex-1 inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-lg border border-sblue text-sblue font-medium hover:bg-sbluel/10 transition-colors focus:outline-none focus:ring-2 focus:ring-sblue";

/**
 * Adds a booking (or a whole repeating series) to the user's own calendar
 */
const BookingCalendarLinks = ({
  booking,
  isLoggedIn,
  seriesCount,
}: BookingCalendarLinksProps) => {
  const isSeries = !!seriesCount && seriesCount > 1;

  return (
    <div>
      <p className="block text-sm font-semibold text-gray-700 mb-2">
        Lisää kalenteriin{isSeries && ` (${seriesCount} päivää)`}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={googleCalendarUrl(booking, isSeries ? seriesCount : undefined)}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          <FaGoogle aria-hidden="true" />
          Google-kalenteri
        </a>
        {isLoggedIn && (
          <a href={icsUrl(booking.id, isSeries)} className={linkClassName}>
            <FaApple aria-hidden="true" />
            Apple / Outlook (.ics)
          </a>
        )}
      </div>
    </div>
  );
};

export default BookingCalendarLinks;
