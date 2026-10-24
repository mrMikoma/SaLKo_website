import { describe, expect, test } from "bun:test";
import {
  BillingContext,
  BillingFlight,
  BillingPurpose,
  billPeriod,
  freeMinutesIn,
  PeriodInput,
  rateOn,
} from "@/utilities/billing";

const purposes = new Map(
  (
    [
      { code: "HAR", name: "Harrastuslento", payer: "pic", isTraining: false },
      { code: "MAT", name: "Matkalento", payer: "pic", isTraining: false },
      { code: "KOU", name: "Koululento", payer: "student", isTraining: true },
      { code: "SII", name: "Siirtolento", payer: "none", isTraining: false },
    ] as BillingPurpose[]
  ).map((p) => [p.code, p])
);

const ctx = (changes: Partial<BillingContext> = {}): BillingContext => ({
  purposes,
  rates: [
    { registration: "OH-CON", validFrom: "2000-01-01", centsWithFee: 310, centsWithoutFee: 500, minimumLocalMinutes: 30 },
    { registration: "OH-CON", validFrom: "2026-07-01", centsWithFee: 330, centsWithoutFee: 520, minimumLocalMinutes: 30 },
  ],
  // M.Meikäläinen and K.Opettaja are members; V.Vieras is a known non-member
  aliases: new Map([
    ["mmeikäläinen", "u1"],
    ["kopettaja", "u2"],
    ["oppilas", "u3"],
    ["vvieras", null],
  ]),
  userNames: new Map([
    ["u1", "Matti Meikäläinen"],
    ["u2", "Kalle Opettaja"],
    ["u3", "Olli Oppilas"],
  ]),
  feeSeasons: new Set(["u1:2026"]),
  freeHour: { enabled: true, aircraft: ["OH-CON"], paidMinutes: 600, freeMinutes: 60 },
  ...changes,
});

let row = 10;
const flight = (changes: Partial<BillingFlight> = {}): BillingFlight => ({
  id: `f${row}`,
  registration: "OH-CON",
  sheetRow: row++,
  flightDate: "2026-06-14",
  picName: "M.Meikäläinen",
  secondName: null,
  departure: "EFSA",
  arrival: "EFJO",
  takeoff: "10:00",
  landing: "10:40",
  airborneMinutes: 40,
  landings: 1,
  purposeCode: "MAT",
  status: "Tarkistettu",
  inputHash: "h",
  ...changes,
});

const bill = (flights: BillingFlight[], input: Partial<PeriodInput> = {}, context = ctx()) =>
  billPeriod({ flights, earlierEligible: new Map(), changed: [], ...input }, context);

describe("who pays and how much", () => {
  test("the PIC, at the lower price with the season's equipment fee", () => {
    const result = bill([flight()]);
    expect(result.payers).toHaveLength(1);
    expect(result.payers[0]).toMatchObject({ key: "user:u1", name: "Matti Meikäläinen", minutes: 40, totalCents: 40 * 310 });
    expect(result.blockers).toEqual([]);
  });

  test("without the fee, the higher price; the price on the flight's date", () => {
    const result = bill([
      flight({ picName: "V.Vieras", flightDate: "2026-06-30" }),
      flight({ picName: "V.Vieras", flightDate: "2026-07-01" }),
    ]);
    expect(result.payers[0]).toMatchObject({ key: "name:vvieras", name: "V.Vieras" });
    expect(result.payers[0].lines.map((l) => l.centsPerMinute)).toEqual([500, 520]);
    expect(rateOn(ctx().rates, "OH-CON", "1999-12-31")).toBeNull();
  });

  test("training: the student pays the lower price, the PIC on a solo", () => {
    const result = bill([
      flight({ picName: "K.Opettaja", secondName: "Oppilas", purposeCode: "KOU" }),
      flight({ picName: "Oppilas", purposeCode: "KOU", takeoff: "12:00" }),
    ]);
    expect(result.payers).toHaveLength(1);
    expect(result.payers[0]).toMatchObject({ key: "user:u3", flights: 2, totalCents: 80 * 310 });
  });

  test("purposes nobody pays for are listed apart", () => {
    const result = bill([flight({ purposeCode: "SII" })]);
    expect(result.payers).toEqual([]);
    expect(result.unbilled).toHaveLength(1);
    expect(result.unbilled[0]).toMatchObject({ kind: "unbilled", minutes: 40 });
  });
});

describe("what stops a period from closing", () => {
  test("unchecked flights, unknown names and purposes, missing times", () => {
    const result = bill([
      flight({ status: null, sheetRow: 1 }),
      flight({ status: "Korjattava", sheetRow: 2 }),
      flight({ picName: "Uusi Nimi", sheetRow: 3 }),
      flight({ purposeCode: "XYZ", sheetRow: 4 }),
      flight({ airborneMinutes: null, sheetRow: 5 }),
    ]);
    expect(result.blockers).toEqual([
      { kind: "unchecked", message: "Tarkistamatta", rows: [1, 2] },
      { kind: "unmatched", message: 'Nimeä "Uusi Nimi" ei ole yhdistetty jäseneen', rows: [3] },
      { kind: "unknown_purpose", message: "Tuntematon lennon tarkoitus XYZ", rows: [4] },
      { kind: "missing_minutes", message: "Ilmassa oloaika puuttuu", rows: [5] },
    ]);
  });
});

describe("the 30-minute minimum for local flights", () => {
  const local = (changes: Partial<BillingFlight>) =>
    flight({ departure: "EFSA", arrival: "EFSA", purposeCode: "HAR", airborneMinutes: 20, ...changes });

  test("a lone local flight is billed the minimum", () => {
    const [payer] = bill([local({})]).payers;
    expect(payer.lines.map((l) => [l.kind, l.minutes, l.amountCents])).toEqual([
      ["flight", 20, 20 * 310],
      ["minimum", 10, 10 * 310],
    ]);
    expect(payer.minutes).toBe(20);
  });

  test("a series of short flights by the same pilot, and trips elsewhere, have none", () => {
    const series = bill([local({ sheetRow: 50 }), local({ sheetRow: 51, takeoff: "10:30" })]);
    expect(series.payers[0].lines.filter((l) => l.kind === "minimum")).toEqual([]);
    const trip = bill([flight({ airborneMinutes: 20 })]);
    expect(trip.payers[0].lines.filter((l) => l.kind === "minimum")).toEqual([]);
  });

  test("another pilot's flight in between is not a series", () => {
    const result = bill([
      local({ sheetRow: 60 }),
      local({ sheetRow: 61, picName: "V.Vieras", takeoff: "10:30" }),
      local({ sheetRow: 62, takeoff: "11:00" }),
    ]);
    const minimums = result.payers.flatMap((p) => p.lines.filter((l) => l.kind === "minimum"));
    expect(minimums).toHaveLength(3);
  });
});

describe("the free hour", () => {
  const settings = ctx().freeHour;

  test("after every 600 paid minutes, the next 60 are free", () => {
    expect(freeMinutesIn(0, 600, settings)).toBe(0);
    expect(freeMinutesIn(600, 60, settings)).toBe(60);
    expect(freeMinutesIn(590, 30, settings)).toBe(20);
    expect(freeMinutesIn(0, 1320, settings)).toBe(120);
  });

  test("continues from the minutes flown earlier in the year, flight by flight", () => {
    const result = bill([flight({ airborneMinutes: 30 }), flight({ airborneMinutes: 60, takeoff: "12:00" })], {
      earlierEligible: new Map([["u1:2026", 590]]),
    });
    const credits = result.payers[0].lines.filter((l) => l.kind === "credit");
    expect(credits.map((l) => [l.minutes, l.amountCents])).toEqual([
      [-20, -20 * 310],
      [-40, -40 * 310],
    ]);
    expect(result.payers[0].totalCents).toBe(90 * 310 - 60 * 310);
  });

  test("only for equipment-fee payers, on the aircraft it is for, while it is on", () => {
    const earlier = new Map([["u1:2026", 600], ["u3:2026", 600]]);
    const training = bill([flight({ picName: "Oppilas", purposeCode: "KOU" })], { earlierEligible: earlier });
    expect(training.payers[0].lines.some((l) => l.kind === "credit")).toBe(false);
    const off = bill([flight()], { earlierEligible: earlier }, ctx({ freeHour: { ...settings, enabled: false } }));
    expect(off.payers[0].lines.some((l) => l.kind === "credit")).toBe(false);
  });
});

describe("flights changed after their period closed", () => {
  const billed = [{ payerKey: "user:u1", kind: "flight" as const, flightId: "x", minutes: 40, amountCents: 40 * 310 }];

  test("a longer flight is corrected by the difference", () => {
    const result = bill([], { changed: [{ flightId: "x", current: flight({ id: "x", airborneMinutes: 45 }), billed }] });
    expect(result.payers[0].lines).toEqual([
      expect.objectContaining({ kind: "adjustment", minutes: 5, amountCents: 5 * 310 }),
    ]);
  });

  test("a new payer: credited to the old one, billed to the new one", () => {
    const result = bill([], {
      changed: [{ flightId: "x", current: flight({ id: "x", picName: "V.Vieras" }), billed }],
    });
    expect(result.payers.map((p) => [p.key, p.totalCents])).toEqual([
      ["user:u1", -40 * 310],
      ["name:vvieras", 40 * 500],
    ]);
  });

  test("a removed flight is credited; an unchanged amount gives no line", () => {
    const removed = bill([], { changed: [{ flightId: "x", current: null, billed }] });
    expect(removed.payers[0].totalCents).toBe(-40 * 310);
    const remark = bill([], { changed: [{ flightId: "x", current: flight({ id: "x" }), billed }] });
    expect(remark.payers).toEqual([]);
  });
});
