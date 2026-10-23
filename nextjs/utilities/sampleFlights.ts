import { DateTime } from "luxon";
import type { SheetFlightInput } from "@/utilities/flightSheetParser";

/**
 * Made-up flights for a development sheet, so that the flight log, billing
 * and statistics have something to show (FLIGHT_LOG_SAMPLE_DATA, see
 * utilities/features.ts). The pilots are placeholders, never anyone from the
 * club's log. The same aircraft and dates give the same flights.
 */

const PILOTS = ["M.Meikäläinen", "K.Keikäläinen", "T.Testaaja", "L.Lentäjä"];
const INSTRUCTOR = "K.Opettaja";
const STUDENTS = ["O.Oppilas", "A.Aloittelija"];
const HOME = "EFSA";
const DESTINATIONS = ["EFVR", "EFMI", "EFJO", "EFKU", "EFJY"];
// Flying days per month, January first: little in winter, most in summer
const DAYS_PER_MONTH = [2, 3, 4, 6, 9, 12, 12, 10, 7, 5, 2, 2];
// The club may fly intro flights on at most six days a year (OPS M1-33)
const INTRO_DAYS_PER_YEAR = 6;
export const SAMPLE_SOURCE = "esimerkki";

// A small seeded generator (mulberry32), so a sample can be made again
function random(seed: string) {
  let state = 0;
  for (const char of seed) state = (Math.imul(state, 31) + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

interface SampleOptions {
  registration: string;
  from: DateTime; // first day, club time
  until: DateTime; // last day, inclusive
  newId: () => string;
}

/** About a year's flights for one aircraft, in date and time order */
export function sampleFlights({ registration, from, until, newId }: SampleOptions): SheetFlightInput[] {
  const rand = random(`${registration}|${from.toISODate()}|${until.toISODate()}`);
  const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const between = (low: number, high: number) => low + Math.floor(rand() * (high - low + 1));

  const flights: SheetFlightInput[] = [];
  const introDays = new Map<number, number>();

  for (let month = from.startOf("month"); month <= until; month = month.plus({ months: 1 })) {
    const days = new Set<number>();
    for (let i = 0; i < DAYS_PER_MONTH[month.month - 1]; i++) days.add(between(1, month.daysInMonth!));

    for (const dayOfMonth of [...days].sort((a, b) => a - b)) {
      const day = month.set({ day: dayOfMonth });
      if (day < from || day > until) continue;

      // What kind of a day it is; intro flights only in summer, six days a year
      const summer = day.month >= 5 && day.month <= 8;
      const introsSoFar = introDays.get(day.year) ?? 0;
      const roll = rand();
      const kind =
        summer && introsSoFar < INTRO_DAYS_PER_YEAR && roll < 0.12
          ? "intro"
          : roll < 0.45
            ? "local"
            : roll < 0.7
              ? "training"
              : roll < 0.85
                ? "trip"
                : "solo";
      if (kind === "intro") introDays.set(day.year, introsSoFar + 1);

      let time = between(9 * 60, 15 * 60);
      const leg = (
        changes: Partial<SheetFlightInput> & { minutes: number }
      ): void => {
        const { minutes, ...rest } = changes;
        const takeoff = Math.min(time, 22 * 60);
        const landing = Math.min(takeoff + minutes, 23 * 60 + 59);
        flights.push({
          id: newId(),
          flightDate: day.toISODate()!,
          picName: PILOTS[0],
          secondName: null,
          personsOnBoard: 1,
          departure: HOME,
          arrival: HOME,
          takeoff: clock(takeoff),
          landing: clock(landing),
          landings: 1,
          purposeCode: "HAR",
          fuelLitres: rand() < 0.25 ? between(30, 70) : null,
          oilLitres: null,
          hourMeter: null,
          remarks: null,
          source: SAMPLE_SOURCE,
          ...rest,
        });
        time = landing + between(15, 40);
      };

      if (kind === "local") {
        leg({
          minutes: between(30, 70),
          picName: pick(PILOTS),
          personsOnBoard: between(1, 2),
          landings: between(1, 3),
        });
      } else if (kind === "training") {
        const student = pick(STUDENTS);
        for (let i = between(1, 2); i > 0; i--) {
          leg({
            minutes: between(40, 60),
            picName: INSTRUCTOR,
            secondName: student,
            personsOnBoard: 2,
            landings: between(4, 8),
            purposeCode: "KOU",
          });
        }
      } else if (kind === "solo") {
        // A student's solo: the student is PIC and pays as a student
        leg({
          minutes: between(30, 50),
          picName: pick(STUDENTS),
          landings: between(3, 6),
          purposeCode: "KOUHAR",
        });
      } else if (kind === "trip") {
        const pilot = pick(PILOTS);
        const destination = pick(DESTINATIONS);
        const persons = between(1, 3);
        leg({
          minutes: between(35, 70),
          picName: pilot,
          personsOnBoard: persons,
          arrival: destination,
          purposeCode: "MAT",
          fuelLitres: between(40, 60),
        });
        time += between(30, 120);
        leg({
          minutes: between(35, 70),
          picName: pilot,
          personsOnBoard: persons,
          departure: destination,
          purposeCode: "MAT",
        });
      } else {
        const pilot = pick(PILOTS);
        for (let i = between(3, 5); i > 0; i--) {
          leg({
            minutes: between(15, 25),
            picName: pilot,
            personsOnBoard: between(2, 3),
            purposeCode: "ESI",
            fuelLitres: null,
          });
        }
      }
    }
  }
  return flights;
}
