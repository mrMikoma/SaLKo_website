import { DateTime, Settings } from "luxon";

/**
 * Club time. Booking times are wall-clock times in Savonlinna: a booking at
 * 10:00 is 10:00 Finnish time whatever zone the browser runs in, and the
 * server container runs in UTC.
 *
 * Import DateTime from here rather than from "luxon" in booking code. That way
 * Luxon's default zone is set before any DateTime is created, so DateTime.now(),
 * fromISO() without a zone, toLocal() and startOf("day"/"week") all use
 * Europe/Helsinki, across DST changes too.
 */
export const CLUB_ZONE = "Europe/Helsinki";

Settings.defaultZone = CLUB_ZONE;

export { DateTime };
