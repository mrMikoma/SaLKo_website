import { describe, expect, test } from "bun:test";
import { DateTime } from "luxon";
import { SAMPLE_SOURCE, sampleFlights } from "@/utilities/sampleFlights";

const make = () => {
  let n = 0;
  return sampleFlights({
    registration: "OH-CON",
    from: DateTime.fromISO("2025-10-01", { zone: "Europe/Helsinki" }),
    until: DateTime.fromISO("2026-10-20", { zone: "Europe/Helsinki" }),
    newId: () => `id-${n++}`,
  });
};

describe("sample flights", () => {
  test("the same aircraft and dates give the same flights", () => {
    expect(make()).toEqual(make());
  });

  test("a year's worth, in date and time order, inside the range", () => {
    const flights = make();
    expect(flights.length).toBeGreaterThan(60);
    expect(flights.length).toBeLessThan(250);
    const keys = flights.map((f) => `${f.flightDate} ${f.takeoff}`);
    expect(keys).toEqual([...keys].sort());
    expect(flights[0].flightDate >= "2025-10-01").toBe(true);
    expect(flights.at(-1)!.flightDate <= "2026-10-20").toBe(true);
  });

  test("every flight lands after it took off and is marked as a sample", () => {
    for (const flight of make()) {
      expect(flight.landing > flight.takeoff).toBe(true);
      expect(flight.landings).toBeGreaterThan(0);
      expect(flight.source).toBe(SAMPLE_SOURCE);
    }
  });

  test("placeholder pilots only, and intro flights on at most six days a year", () => {
    const flights = make();
    const placeholders = new Set([
      "M.Meikäläinen", "K.Keikäläinen", "T.Testaaja", "L.Lentäjä", "K.Opettaja", "O.Oppilas", "A.Aloittelija",
    ]);
    for (const flight of flights) {
      expect(placeholders.has(flight.picName)).toBe(true);
      if (flight.secondName) expect(placeholders.has(flight.secondName)).toBe(true);
    }
    for (const year of ["2025", "2026"]) {
      const days = new Set(
        flights.filter((f) => f.purposeCode === "ESI" && f.flightDate.startsWith(year)).map((f) => f.flightDate)
      );
      expect(days.size).toBeLessThanOrEqual(6);
    }
  });
});
