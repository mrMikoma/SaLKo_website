import { DateTime } from "luxon";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";

/** Display helpers for flight log pages; times in Finnish time */

/** 75 → "1:15" */
export const formatMinutes = (minutes: number | null): string =>
  minutes === null
    ? "–"
    : `${Math.floor(minutes / 60)}:${String(Math.abs(minutes % 60)).padStart(2, "0")}`;

/** "2026-03-14" → "la 14.3." */
export const formatFlightDate = (date: string): string =>
  DateTime.fromISO(date, { zone: SHEET_ZONE }).setLocale("fi").toFormat("ccc d.M.");

/** "2026-03-14" → "14.3.2026" */
export const formatFullDate = (date: string): string =>
  DateTime.fromISO(date, { zone: SHEET_ZONE }).toFormat("d.M.yyyy");

/** ISO time → "14.05" */
export const formatClock = (iso: string | null): string =>
  iso ? DateTime.fromISO(iso, { zone: SHEET_ZONE }).toFormat("HH.mm") : "–";

/** ISO time → "14.3.2026 klo 14.05" */
export const formatDateTime = (iso: string): string =>
  DateTime.fromISO(iso, { zone: SHEET_ZONE }).toFormat("d.M.yyyy 'klo' HH.mm");

/** "2026-03" → "maaliskuu 2026" */
export const formatMonth = (month: string): string =>
  DateTime.fromFormat(month, "yyyy-MM", { zone: SHEET_ZONE })
    .setLocale("fi")
    .toFormat("LLLL yyyy");

/** An empty Tila cell means the flight is only entered so far */
export const statusLabel = (status: string | null): string => status ?? "Kirjattu";
