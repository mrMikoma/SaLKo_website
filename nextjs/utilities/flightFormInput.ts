/**
 * Input helpers for the flight form, shared by the browser and the server
 */

/** "1405", "14.05", "14,05", "14:05" or "905" → "14:05" / "09:05"; null when it isn't a time */
export function normalizeClock(input: string): string | null {
  const value = input.trim();
  // Minutes always have two digits: "10.3" is more likely 10:30 than 10:03
  const match = value.match(/^(\d{1,2})[.:,](\d{2})$/) ?? value.match(/^(\d{1,2})(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const clockMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));

/** Minutes from takeoff to landing; a landing before the takeoff is after midnight */
export function minutesBetween(takeoff: string, landing: string): number | null {
  const start = normalizeClock(takeoff);
  const end = normalizeClock(landing);
  if (!start || !end) return null;
  const minutes = clockMinutes(end) - clockMinutes(start);
  return minutes <= 0 ? minutes + 24 * 60 : minutes;
}

// A leg longer than this is a typo in one of its times, such as a landing
// typed before the takeoff
export const MAX_LEG_MINUTES = 8 * 60;

/**
 * What is wrong with a leg's times, in Finnish, or null when they are fine.
 * A landing earlier than the takeoff is after midnight, as long as the leg
 * stays within MAX_LEG_MINUTES.
 */
export function legTimeError(takeoff: string, landing: string): string | null {
  const start = normalizeClock(takeoff);
  const end = normalizeClock(landing);
  if (!start || !end) return "Anna lentoonlähtö- ja laskuaika, esim. 14.05";
  if (start === end) return "Lentoonlähtö- ja laskuaika ovat samat";
  if (minutesBetween(start, end)! > MAX_LEG_MINUTES) {
    return end < start
      ? "Laskuaika on ennen lentoonlähtöaikaa"
      : `Lento olisi yli ${MAX_LEG_MINUTES / 60} tuntia: tarkista ajat`;
  }
  return null;
}

/** Whether a leg lands after midnight: its landing is earlier than its takeoff */
export function crossesMidnight(takeoff: string, landing: string): boolean {
  const start = normalizeClock(takeoff);
  const end = normalizeClock(landing);
  return Boolean(start && end && end < start);
}

/**
 * The first two legs of a day whose times overlap, as 0-based indexes, or
 * null. Legs with unreadable times are left out.
 */
export function overlappingLegs(legs: { takeoff: string; landing: string }[]): [number, number] | null {
  const spans = legs.map((leg) => {
    const start = normalizeClock(leg.takeoff);
    const minutes = minutesBetween(leg.takeoff, leg.landing);
    return start && minutes !== null ? { start: clockMinutes(start), end: clockMinutes(start) + minutes } : null;
  });
  for (let a = 0; a < spans.length; a++) {
    for (let b = a + 1; b < spans.length; b++) {
      const first = spans[a];
      const second = spans[b];
      if (first && second && first.start < second.end && second.start < first.end) return [a, b];
    }
  }
  return null;
}

/**
 * A random UUID for a flight's ID, made when the form row is. It goes with
 * every attempt to save, so saving again after a lost connection doesn't add
 * the flight twice. crypto.randomUUID only exists on https pages.
 */
export function newFlightId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * How a member's name is written in the flight log, in the sheet's usual
 * style: "Matti Meikäläinen" → "M.Meikäläinen". One-word names stay as they are.
 */
export function sheetNameFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0].toUpperCase()}.${parts[parts.length - 1]}`;
}
