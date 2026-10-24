// Server code only (node:crypto); kept apart from flightSync.ts so that unit
// tests can import it
import { createHash } from "crypto";
import type { ParsedFlight } from "@/utilities/flightSheetParser";

/**
 * Hash of what was typed into a flight's row. Unlike content_hash it leaves
 * out the formulas and the website's own columns, so it changes only when the
 * flight itself does: not when a row above it moves the running totals, or
 * when Tila is set.
 */
export function inputHash(flight: ParsedFlight): string {
  const typed = [
    flight.flightDate, flight.picName, flight.secondName, flight.personsOnBoard,
    flight.departure, flight.arrival, flight.takeoffAt, flight.landingAt,
    flight.landings, flight.purposeCode, flight.fuelLitres, flight.oilQuarts,
    flight.hourMeter, flight.remarks,
  ];
  return createHash("sha256").update(JSON.stringify(typed)).digest("hex").slice(0, 16);
}
