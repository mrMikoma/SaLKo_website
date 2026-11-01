import { describe, expect, mock, test } from "bun:test";
import type { PoolClient } from "pg";
import { parseFlightSheet, SheetValues } from "@/utilities/flightSheetParser";

// flightSync is server-only; the guard has nothing to protect in a test
mock.module("server-only", () => ({}));
const { assignIds } = await import("@/utilities/flightSync");

const ID_A = "0000000a-0000-4000-8000-000000000000";
const ID_B = "0000000b-0000-4000-8000-000000000000";
const SERIAL_2026_04_01 = 46113;
const time = (hours: number, minutes: number) => (hours * 60 + minutes) / 1440;

const HEADERS = [
  "Päivämäärä",
  "Päällikkö",
  "Oppilas / SIC",
  "Lentoonlähtöpaikka",
  "Laskupaikka",
  "Lentoonlähtöaika",
  "Laskuaika",
  "Laskujen määrä",
  "Lennon tarkoitus",
  "ID",
];

const row = (id: string, takeoffHour: number) => [
  SERIAL_2026_04_01,
  "M. Meikäläinen",
  "",
  "EFSA",
  "EFSA",
  time(takeoffHour, 0),
  time(takeoffHour, 40),
  1,
  "HAR",
  id,
];

const sheet = (...rows: (string | number)[][]): SheetValues => [HEADERS, [], ...rows];

interface StoredFlight {
  id: string;
  registration: string;
  missing: boolean;
}

// Answers the two queries assignIds makes, from a list of stored flights
function fakeClient(stored: StoredFlight[]) {
  return {
    query: async (sql: string, params: unknown[]) => {
      if (sql.includes("registration <> $2")) {
        const [ids, registration] = params as [string[], string];
        return {
          rows: stored.filter(
            (flight) => ids.includes(flight.id) && flight.registration !== registration && !flight.missing
          ),
        };
      }
      const [registration] = params as [string];
      return {
        rows: stored
          .filter((flight) => flight.registration === registration)
          .map((flight) => ({ id: flight.id, input_hash: null, sheet_row: 0 })),
      };
    },
  } as unknown as PoolClient;
}

describe("assignIds", () => {
  test("a row copied from another aircraft's tab gets a new ID and is reported", async () => {
    const parsed = parseFlightSheet(sheet(row(ID_A, 10), row(ID_B, 12)));
    const { newIds, issues } = await assignIds(
      fakeClient([
        { id: ID_A, registration: "OH-CON", missing: false },
        { id: ID_B, registration: "OH-TST", missing: false },
      ]),
      "OH-TST",
      parsed
    );
    const [copy, own] = parsed.flights;
    expect(copy.id).not.toBe(ID_A);
    expect(own.id).toBe(ID_B);
    expect(newIds).toEqual([{ row: 3, column: 9, value: copy.id }]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ row: 3, flightId: copy.id, kind: "copied_row" });
    expect(issues[0].message).toContain("sama ID kuin koneen OH-CON lennolla");
  });

  test("a row moved from another aircraft's tab keeps its ID", async () => {
    const parsed = parseFlightSheet(sheet(row(ID_A, 10)));
    const { newIds, issues } = await assignIds(
      fakeClient([{ id: ID_A, registration: "OH-CON", missing: true }]),
      "OH-TST",
      parsed
    );
    expect(parsed.flights[0].id).toBe(ID_A);
    expect(newIds).toEqual([]);
    expect(issues).toEqual([]);
  });

  test("a row copied within the tab still names the row it was copied from", async () => {
    const parsed = parseFlightSheet(sheet(row(ID_A, 10), row(ID_A, 12)));
    const { issues } = await assignIds(
      fakeClient([{ id: ID_A, registration: "OH-TST", missing: false }]),
      "OH-TST",
      parsed
    );
    expect(parsed.flights[0].id).toBe(ID_A);
    expect(issues.map((issue) => issue.message)).toEqual([
      "Rivillä oli sama ID kuin rivillä 3, joten se sai uuden.",
    ]);
  });
});
