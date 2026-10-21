import { DateTime, CLUB_ZONE } from "@/utilities/clubTime";

/**
 * Calendar export for bookings: an iCalendar file (RFC 5545) for Apple
 * Calendar, Outlook and others, served by app/api/varaukset/[id]/kalenteri,
 * and a Google Calendar "add event" link.
 */

export interface CalendarEvent {
  id: number;
  plane: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
}

const LOCATION = "Savonlinnan lentoasema (EFSA)";

const summaryOf = (event: CalendarEvent) => `${event.plane}: ${event.title}`;

const toUtcStamp = (iso: string) =>
  DateTime.fromISO(iso).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Lines longer than 75 octets are folded: CRLF plus a space starts the next
// part (RFC 5545 3.1). Split on characters so ä/ö aren't cut in half.
const encoder = new TextEncoder();
function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events: CalendarEvent[]): string {
  const stamp = DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Savonlinnan Lentokerho//Varauskalenteri//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:SaLKo varaukset",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:booking-${event.id}@savonlinnanlentokerho.fi`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toUtcStamp(event.start_time)}`,
      `DTEND:${toUtcStamp(event.end_time)}`,
      `SUMMARY:${escapeText(summaryOf(event))}`,
      ...(event.description
        ? [`DESCRIPTION:${escapeText(event.description)}`]
        : []),
      `LOCATION:${escapeText(LOCATION)}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Google Calendar link. Times go as club time with ctz, so a daily series
 * (repeatCount) stays at the same hour across DST changes.
 */
export function googleCalendarUrl(
  event: CalendarEvent,
  repeatCount?: number
): string {
  const toClubStamp = (iso: string) =>
    DateTime.fromISO(iso, { zone: CLUB_ZONE }).toFormat("yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summaryOf(event),
    dates: `${toClubStamp(event.start_time)}/${toClubStamp(event.end_time)}`,
    ctz: CLUB_ZONE,
    location: LOCATION,
  });
  if (event.description) {
    params.set("details", event.description);
  }
  if (repeatCount && repeatCount > 1) {
    params.set("recur", `RRULE:FREQ=DAILY;COUNT=${repeatCount}`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * The .ics download for a booking, or with series for it and the rest of its
 * repeat group. Logged-in members only.
 */
export const icsUrl = (bookingId: number, series = false) =>
  `/api/varaukset/${bookingId}/kalenteri${series ? "?sarja=1" : ""}`;
