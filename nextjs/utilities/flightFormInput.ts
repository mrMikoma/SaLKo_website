/**
 * Input helpers for the flight form, shared by the browser and the server
 */

/** "1405", "14.05", "14,05", "14:05" or "9.5" → "14:05" / "09:05"; null when it isn't a time */
export function normalizeClock(input: string): string | null {
  const value = input.trim();
  const match = value.match(/^(\d{1,2})[.:,](\d{1,2})$/) ?? value.match(/^(\d{1,2})(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Minutes from takeoff to landing; a landing before the takeoff is after midnight */
export function minutesBetween(takeoff: string, landing: string): number | null {
  const start = normalizeClock(takeoff);
  const end = normalizeClock(landing);
  if (!start || !end) return null;
  const toMinutes = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
  const minutes = toMinutes(end) - toMinutes(start);
  return minutes <= 0 ? minutes + 24 * 60 : minutes;
}

/**
 * How a member's name is written in the flight log, in the sheet's usual
 * style: "Tero Kuutti" → "T.Kuutti". One-word names stay as they are.
 */
export function sheetNameFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0].toUpperCase()}.${parts[parts.length - 1]}`;
}
