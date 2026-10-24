import { describe, expect, test } from "bun:test";
import { inflateRawSync } from "zlib";
import {
  aircraftReport,
  byMonth,
  byPilot,
  byPurpose,
  introFlightDays,
  mergeYearTotals,
  parseHours,
  parseYearTable,
  StatsFlight,
  totals,
} from "@/utilities/flightStats";

let row = 3;
let airframe = 6000 * 60;
let landingCount = 12000;
const flight = (changes: Partial<StatsFlight> = {}): StatsFlight => {
  const minutes = changes.airborneMinutes ?? 40;
  const landings = changes.landings ?? 1;
  airframe += minutes;
  landingCount += landings;
  return {
    registration: "OH-CON",
    sheetRow: row++,
    flightDate: "2025-06-14",
    picName: "M.Meikäläinen",
    secondName: null,
    purposeCode: "HAR",
    airborneMinutes: minutes,
    landings,
    personsOnBoard: 1,
    airframeMinutes: airframe,
    totalLandings: landingCount,
    ...changes,
  };
};

describe("totals", () => {
  test("by month and by purpose", () => {
    const flights = [
      flight({ flightDate: "2025-01-10", airborneMinutes: 30 }),
      flight({ flightDate: "2025-01-20", purposeCode: "KOU", airborneMinutes: 60, landings: 5 }),
      flight({ flightDate: "2025-12-31" }),
    ];
    expect(totals(flights)).toEqual({ flights: 3, minutes: 130, landings: 7 });
    const months = byMonth(flights);
    expect(months[0]).toEqual({ flights: 2, minutes: 90, landings: 6 });
    expect(months[11].flights).toBe(1);
    expect(byPurpose(flights).map((p) => [p.code, p.totals.minutes])).toEqual([
      ["HAR", 70],
      ["KOU", 60],
    ]);
  });

  test("pilots: a member's sheet names together, as PIC and as student", () => {
    const aliases = new Map([["mmeikäläinen", "u1"], ["mattimeikäläinen", "u1"]]);
    const names = new Map([["u1", "Matti Meikäläinen"]]);
    const pilots = byPilot(
      [
        flight({ picName: "M.Meikäläinen" }),
        flight({ picName: "Matti Meikäläinen", airborneMinutes: 20 }),
        flight({ picName: "K.Opettaja", secondName: "M. Meikäläinen", purposeCode: "KOU" }),
      ],
      aliases,
      names
    );
    expect(pilots[0]).toMatchObject({
      name: "Matti Meikäläinen",
      member: true,
      asPic: { flights: 2, minutes: 60 },
      asSecond: { flights: 1, minutes: 40 },
    });
    expect(pilots[1]).toMatchObject({ name: "K.Opettaja", member: false, asPic: { flights: 1 } });
  });
});

describe("Traficom's annual report", () => {
  test("grouped like the club's sheet, with DTO training including TAR", () => {
    const flights = [
      flight({ purposeCode: "KOU", airborneMinutes: 50, landings: 6 }),
      flight({ purposeCode: "KOUHAR", airborneMinutes: 30 }),
      flight({ purposeCode: "TAR", airborneMinutes: 45 }),
      flight({ purposeCode: "ESI", airborneMinutes: 20 }),
      flight({ purposeCode: "XYZ", airborneMinutes: 10 }),
      flight({ registration: "OH-PDX" }),
    ];
    const report = aircraftReport("OH-CON", flights);
    const row = (label: string) => report.rows.find((r) => r.label === label)!.totals;
    expect(row("Koululennot yhteensä")).toEqual({ flights: 2, minutes: 80, landings: 7 });
    expect(row("DTO-koulutus yhteensä")).toEqual({ flights: 3, minutes: 125, landings: 8 });
    expect(row("Muu yksityislentotoiminta yhteensä").minutes).toBe(20);
    expect(row("Muut koodit").minutes).toBe(10);
    expect(row("Yhteensä")).toEqual({ flights: 5, minutes: 155, landings: 10 });
    // The running totals run on from row to row
    expect(report.counters).toEqual({
      airframeMinutes: flights[4].airframeMinutes!,
      totalLandings: flights[4].totalLandings!,
      breaks: [],
    });
  });

  test("a late entry: December's last page typed in after January's flights", () => {
    const december = [
      flight({ flightDate: "2025-12-10", airborneMinutes: 60 }),
      flight({ flightDate: "2025-12-20", airborneMinutes: 30 }),
    ];
    const january = [flight({ flightDate: "2026-01-05", airborneMinutes: 45 })];
    const late = flight({ flightDate: "2025-12-28", airborneMinutes: 15 });
    // The late row's running total includes January's 45 minutes above it
    const report = aircraftReport("OH-CON", [...december, late], { minutes: 45, landings: 1 });
    expect(report.counters).toEqual({
      airframeMinutes: late.airframeMinutes! - 45,
      totalLandings: late.totalLandings! - 1,
      breaks: [],
    });
    // = the total after December's flights, all 105 minutes of them
    expect(report.counters!.airframeMinutes).toBe(december[0].airframeMinutes! - 60 + 105);
    // The next year's last row already holds every flight above it
    expect(aircraftReport("OH-CON", january).counters!.airframeMinutes).toBe(january[0].airframeMinutes!);
  });

  test("rows whose running total doesn't follow from the row above", () => {
    const first = flight();
    // A copied row: its total is the one above's
    const copied = flight({ airframeMinutes: first.airframeMinutes });
    const next = flight();
    // A minute of float drift is fine
    const drift = flight({ airframeMinutes: next.airframeMinutes! + 40 + 1 });
    const report = aircraftReport("OH-CON", [first, copied, next, drift]);
    expect(report.counters!.breaks).toEqual([copied.sheetRow, next.sheetRow]);
  });

  test("no counters when the sheet lacks the running totals", () => {
    expect(aircraftReport("OH-CON", [flight({ airframeMinutes: null })]).counters).toBeNull();
  });
});

describe("intro-flight days", () => {
  test("one per date, with passengers and pilots", () => {
    const days = introFlightDays([
      flight({ purposeCode: "ESI", personsOnBoard: 3, flightDate: "2025-05-09" }),
      flight({ purposeCode: "ESI", personsOnBoard: 2, flightDate: "2025-05-09", picName: "M.M" }),
      flight({ purposeCode: "ESI", flightDate: "2025-06-01" }),
      flight({ purposeCode: "HAR", flightDate: "2025-07-01" }),
    ]);
    expect(days).toEqual([
      { date: "2025-05-09", flights: 2, passengers: 3, pilots: ["M.Meikäläinen", "M.M"] },
      { date: "2025-06-01", flights: 1, passengers: 0, pilots: ["M.Meikäläinen"] },
    ]);
  });
});

describe("years before the flight log", () => {
  test("hours as the sheet shows them", () => {
    expect(parseHours("102:30")).toBe(6150);
    expect(parseHours("102:30:00")).toBe(6150);
    expect(parseHours("99,5")).toBe(5970);
    expect(parseHours("kymmenen")).toBeNull();
  });

  test("a pasted table, by registration and year", () => {
    const { totals: parsed, errors } = parseYearTable(
      "Vuosi\tOH-CON\tOH-SEE\n2003\t98:00\t164:00\n2002\t102:00\t\nvuosi x\t1:00\t"
    );
    expect(parsed).toEqual([
      { registration: "OH-CON", year: 2003, minutes: 5880 },
      { registration: "OH-SEE", year: 2003, minutes: 9840 },
      { registration: "OH-CON", year: 2002, minutes: 6120 },
    ]);
    expect(errors).toEqual(['Rivi 4: vuosi "vuosi x" ei kelpaa']);
    expect(parseYearTable("2002\t1:00").errors).toHaveLength(1);
  });

  test("the flight log wins over entered totals for the same year", () => {
    const merged = mergeYearTotals(
      [{ registration: "OH-CON", year: 2024, minutes: 6000, landings: 300, flights: 150, source: "flights" }],
      [
        { registration: "OH-CON", year: 2024, minutes: 1, landings: null, flights: null, source: "entered" },
        { registration: "OH-CON", year: 2002, minutes: 6120, landings: null, flights: null, source: "entered" },
      ]
    );
    // What was typed in for 2024 is kept alongside, so a mistyped year shows
    expect(merged[0].entered).toBe(1);
    expect(merged.map((t) => [t.year, t.source])).toEqual([
      [2024, "flights"],
      [2002, "entered"],
    ]);
  });
});

describe("pilots", () => {
  test("a member, a name marked as no member, and a name not decided on", () => {
    const pilots = byPilot(
      [flight({ picName: "M.Meikäläinen" }), flight({ picName: "V.Vieras" }), flight({ picName: "U.Uusi" })],
      new Map<string, string | null>([
        ["mmeikäläinen", "user-1"],
        ["vvieras", null],
      ]),
      new Map([["user-1", "Matti Meikäläinen"]])
    );
    expect(pilots.map((p) => [p.name, p.status])).toEqual([
      ["Matti Meikäläinen", "member"],
      ["V.Vieras", "non-member"],
      ["U.Uusi", "unmatched"],
    ]);
  });
});

describe("the Excel export", () => {
  test("one tab per section, times as durations", async () => {
    const { statsWorkbook } = await import("@/utilities/statsWorkbook");
    const { writeXlsx } = await import("@/utilities/xlsx");
    const flights = [flight({ purposeCode: "ESI", flightDate: "2025-05-09", airborneMinutes: 90 })];
    const sheets = statsWorkbook(
      {
        year: 2025,
        years: [2025],
        aircraft: ["OH-CON"],
        registration: "OH-CON",
        totals: totals(flights),
        previousTotals: totals([]),
        previousUntil: null,
        unchecked: 0,
        months: byMonth(flights),
        previousMonths: byMonth([]),
        purposes: byPurpose(flights).map((p) => ({ ...p, name: "Esittelylento" })),
        pilots: byPilot(flights, new Map(), new Map()),
        reports: [aircraftReport("OH-CON", flights)],
        introDays: introFlightDays(flights),
      },
      [{ registration: "OH-CON", year: 2002, minutes: 6120, landings: null, flights: null, source: "entered" }]
    );
    expect(sheets.map((s) => s.name)).toEqual([
      "Yhteenveto", "Kuukausittain", "Lentäjät", "Tarkoitukset", "Lentotoimintailmoitus", "Esittelylennot", "Vuosittain",
    ]);
    // May's 90 minutes as a fraction of a day
    expect(sheets[1].rows[5][2]).toEqual({ value: 90 / 1440, style: "duration" });
    // 9.5.2025 as a spreadsheet date
    expect(sheets[5].rows[2][0]).toEqual({ value: 45786, style: "date" });
    expect(writeXlsx(sheets).subarray(0, 2).toString()).toBe("PK");
  });

  test("control characters in a name don't break the file", async () => {
    const { statsWorkbook } = await import("@/utilities/statsWorkbook");
    const { writeXlsx } = await import("@/utilities/xlsx");
    const flights = [flight({ picName: "M.Meikä\u000Bläinen\u0001", flightDate: "2025-05-09" })];
    const file = writeXlsx(
      statsWorkbook(
        {
          year: 2025, years: [2025], aircraft: ["OH-CON"], registration: "OH-CON",
          totals: totals(flights), previousTotals: totals([]), previousUntil: null, unchecked: 0,
          months: byMonth(flights), previousMonths: byMonth([]), purposes: [],
          pilots: byPilot(flights, new Map(), new Map()),
          reports: [aircraftReport("OH-CON", flights)], introDays: [],
        },
        []
      )
    );
    // Every part of the zip, inflated: no character XML 1.0 can't hold
    const parts: string[] = [];
    for (let at = 0; file.readUInt32LE(at) === 0x04034b50; ) {
      const method = file.readUInt16LE(at + 8);
      const size = file.readUInt32LE(at + 18);
      const nameLength = file.readUInt16LE(at + 26);
      const extraLength = file.readUInt16LE(at + 28);
      const start = at + 30 + nameLength + extraLength;
      const data = file.subarray(start, start + size);
      parts.push((method === 8 ? inflateRawSync(data) : data).toString("utf8"));
      at = start + size;
    }
    expect(parts.length).toBeGreaterThan(5);
    const pilotsSheet = parts.find((part) => part.includes("Meikä"))!;
    expect(pilotsSheet).toContain("M.Meikäläinen");
    for (const part of parts) {
      expect(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(part)).toBe(false);
    }
  });
});
