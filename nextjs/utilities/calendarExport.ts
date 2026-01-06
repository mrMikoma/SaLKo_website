import { BookingType } from "./bookings";
import { DateTime } from "luxon";

/**
 * Generates an iCal/ICS format string from a booking
 * Reference: RFC 5545 (iCalendar specification)
 */
export function generateICalEvent(booking: BookingType): string {
  const now = DateTime.now().toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const startTime = DateTime.fromISO(booking.start_time).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const endTime = DateTime.fromISO(booking.end_time).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");

  // Escape special characters for iCal format
  const escapeICalText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const summary = escapeICalText(booking.title);
  const description = booking.description
    ? escapeICalText(booking.description)
    : "";
  const location = escapeICalText(booking.plane);

  // Create unique ID for the event
  const uid = `booking-${booking.id}@savonlinnanlentokerho.fi`;

  // Build iCal content
  const icalContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Savonlinnan Lentokerho//Varauskalenteri//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Savonlinnan Lentokerho - Varaus",
    "X-WR-TIMEZONE:Europe/Helsinki",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:CONFIRMED`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return icalContent;
}

/**
 * Generates an iCal file for multiple bookings
 */
export function generateICalFile(bookings: BookingType[]): string {
  const now = DateTime.now().toFormat("yyyyMMdd'T'HHmmss'Z'");

  // Escape special characters for iCal format
  const escapeICalText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const events = bookings.map((booking) => {
    const startTime = DateTime.fromISO(booking.start_time).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
    const endTime = DateTime.fromISO(booking.end_time).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
    const summary = escapeICalText(booking.title);
    const description = booking.description ? escapeICalText(booking.description) : "";
    const location = escapeICalText(booking.plane);
    const uid = `booking-${booking.id}@savonlinnanlentokerho.fi`;

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const icalContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Savonlinnan Lentokerho//Varauskalenteri//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Savonlinnan Lentokerho - Varaukset",
    "X-WR-TIMEZONE:Europe/Helsinki",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return icalContent;
}

/**
 * Downloads an iCal file for a single booking
 */
export function downloadICalEvent(booking: BookingType): void {
  const icalContent = generateICalEvent(booking);
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `varaus-${booking.plane}-${booking.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads an iCal file for multiple bookings
 */
export function downloadICalFile(bookings: BookingType[], filename?: string): void {
  const icalContent = generateICalFile(bookings);
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `varaukset-${DateTime.now().toFormat("yyyy-MM-dd")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
