import { nameKey } from "@/utilities/flightSheetParser";

/**
 * What a billing period bills to whom. Pure: the server gathers the flights,
 * prices and settings (utilities/billingData.ts) and this works out the
 * lines. The rules are in docs/FLIGHT_LOG.md, "Billing":
 *
 * - who pays follows the purpose code: the PIC, the student (the second
 *   pilot, or the PIC on a solo flight), or nobody;
 * - airborne minutes × the aircraft's per-minute price on the flight's date,
 *   the lower price for equipment-fee payers and for training flights;
 * - a lone local flight shorter than the minimum is billed the minimum;
 * - the free hour: per member and calendar year, after every `paidMinutes`
 *   the next `freeMinutes` are free, counted in billing order;
 * - a flight that changed after its period closed is corrected with a line
 *   in the next period.
 */

export type PayerType = "pic" | "student" | "none";
export type LineKind = "flight" | "minimum" | "credit" | "adjustment" | "unbilled";

export interface BillingPurpose {
  code: string;
  name: string;
  payer: PayerType;
  isTraining: boolean;
}

export interface BillingRate {
  registration: string;
  validFrom: string; // YYYY-MM-DD
  centsWithFee: number;
  centsWithoutFee: number;
  minimumLocalMinutes: number;
}

export interface FreeHourSettings {
  enabled: boolean;
  aircraft: string[];
  paidMinutes: number;
  freeMinutes: number;
}

export interface BillingFlight {
  id: string;
  registration: string;
  sheetRow: number;
  flightDate: string;
  picName: string;
  secondName: string | null;
  departure: string | null;
  arrival: string | null;
  takeoff: string | null; // HH:MM, Finnish time
  landing: string | null;
  airborneMinutes: number | null;
  landings: number | null;
  purposeCode: string | null;
  status: string | null;
  inputHash: string | null;
}

// A line of a closed period
export interface BilledLine {
  payerKey: string | null;
  kind: LineKind;
  flightId: string | null;
  minutes: number;
  amountCents: number;
}

export interface BillingContext {
  purposes: Map<string, BillingPurpose>;
  rates: BillingRate[];
  // A sheet name's key → the member it is (null: a known non-member)
  aliases: Map<string, string | null>;
  userNames: Map<string, string>;
  // `${userId}:${year}` for each season a member paid the equipment fee
  feeSeasons: Set<string>;
  freeHour: FreeHourSettings;
}

export interface BillLine {
  kind: LineKind;
  flightId: string | null;
  registration: string | null;
  flightDate: string | null;
  purposeCode: string | null;
  minutes: number;
  landings: number;
  centsPerMinute: number | null;
  amountCents: number;
  description: string;
  inputHash: string | null;
}

export interface PayerBill {
  key: string; // "user:<id>" or "name:<name key>"
  name: string;
  userId: string | null;
  lines: BillLine[];
  flights: number;
  minutes: number;
  landings: number;
  totalCents: number;
}

export interface Blocker {
  kind: "unchecked" | "unmatched" | "unknown_purpose" | "missing_minutes" | "no_rate";
  message: string;
  rows: number[];
}

export interface PeriodBill {
  payers: PayerBill[];
  unbilled: BillLine[];
  blockers: Blocker[];
  totalCents: number;
}

export interface ChangedFlight {
  flightId: string;
  current: BillingFlight | null; // null: the row is no longer in the sheet
  billed: BilledLine[]; // its flight and adjustment lines in closed periods
}

export interface PeriodInput {
  flights: BillingFlight[];
  // Free-hour minutes each member had already flown before this period,
  // by `${userId}:${year}`
  earlierEligible: Map<string, number>;
  changed: ChangedFlight[];
}

export const euros = (cents: number): string =>
  (cents / 100).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });

export const year = (date: string) => Number(date.slice(0, 4));

type Payer =
  | { kind: "none" }
  | { kind: "unknown_purpose"; code: string | null }
  | { kind: "unmatched"; name: string }
  | { kind: "payer"; key: string; name: string; userId: string | null; purpose: BillingPurpose };

/** Who pays for a flight, by its purpose code */
export function payerOf(flight: BillingFlight, ctx: BillingContext): Payer {
  const purpose = flight.purposeCode ? ctx.purposes.get(flight.purposeCode) : undefined;
  if (!purpose) return { kind: "unknown_purpose", code: flight.purposeCode };
  if (purpose.payer === "none") return { kind: "none" };
  // A training flight without a second pilot is a solo: the student is the PIC
  const name =
    purpose.payer === "student" && flight.secondName ? flight.secondName : flight.picName;
  const key = nameKey(name);
  if (!ctx.aliases.has(key)) return { kind: "unmatched", name };
  const userId = ctx.aliases.get(key)!;
  return userId
    ? { kind: "payer", key: `user:${userId}`, name: ctx.userNames.get(userId) ?? name, userId, purpose }
    : { kind: "payer", key: `name:${key}`, name, userId: null, purpose };
}

/** The price in force on a date */
export function rateOn(rates: BillingRate[], registration: string, date: string) {
  return (
    rates
      .filter((rate) => rate.registration === registration && rate.validFrom <= date)
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null
  );
}

const hasFee = (ctx: BillingContext, userId: string | null, date: string) =>
  userId !== null && ctx.feeSeasons.has(`${userId}:${year(date)}`);

/** Whether a member's minutes on this flight count towards the free hour */
export function earnsFreeHour(ctx: BillingContext, flight: BillingFlight, userId: string | null) {
  return (
    ctx.freeHour.enabled &&
    ctx.freeHour.aircraft.includes(flight.registration) &&
    hasFee(ctx, userId, flight.flightDate)
  );
}

/**
 * How many of the minutes [start, start + minutes) are free: in each cycle of
 * paidMinutes + freeMinutes, the last freeMinutes are
 */
export function freeMinutesIn(start: number, minutes: number, settings: FreeHourSettings) {
  const cycle = settings.paidMinutes + settings.freeMinutes;
  if (settings.freeMinutes <= 0 || cycle <= 0) return 0;
  let free = 0;
  for (let position = start; position < start + minutes; position++) {
    if (position % cycle >= settings.paidMinutes) free++;
  }
  return free;
}

const label = (flight: BillingFlight) =>
  [flight.departure && flight.arrival ? `${flight.departure}–${flight.arrival}` : null, flight.takeoff && flight.landing ? `${flight.takeoff}–${flight.landing}` : null]
    .filter(Boolean)
    .join(" ");

// Chronological order within a period, then the sheet's order
const byFlightOrder = (a: BillingFlight, b: BillingFlight) =>
  a.flightDate.localeCompare(b.flightDate) ||
  (a.takeoff ?? "").localeCompare(b.takeoff ?? "") ||
  a.registration.localeCompare(b.registration) ||
  a.sheetRow - b.sheetRow;

const isChecked = (status: string | null) => status?.trim().toLowerCase() === "tarkistettu";

/** The amount a flight bills now, for corrections: no minimum, no free hour */
function flightAmount(flight: BillingFlight, ctx: BillingContext) {
  const payer = payerOf(flight, ctx);
  if (payer.kind !== "payer") return { payer, cents: 0, minutes: 0 };
  const rate = rateOn(ctx.rates, flight.registration, flight.flightDate);
  if (!rate || flight.airborneMinutes === null) return { payer, cents: 0, minutes: 0 };
  const perMinute =
    payer.purpose.isTraining || hasFee(ctx, payer.userId, flight.flightDate)
      ? rate.centsWithFee
      : rate.centsWithoutFee;
  return { payer, perMinute, minutes: flight.airborneMinutes, cents: flight.airborneMinutes * perMinute };
}

/**
 * Why a flight changed after its period closed can't be corrected yet. A
 * correction prices the flight as it is now, so it needs what a new flight
 * needs: a known purpose, a matched name, an airborne time that isn't negative
 * and a price. Without them it would credit the whole billed amount, or more,
 * without anyone looking at it. A purpose nobody pays for is not a problem:
 * that flight is credited in full, as is a removed one.
 */
function correctionBlocker(flight: BillingFlight, ctx: BillingContext): Omit<Blocker, "rows"> | null {
  const payer = payerOf(flight, ctx);
  if (payer.kind === "unknown_purpose") {
    return { kind: "unknown_purpose", message: `Tuntematon lennon tarkoitus ${payer.code ?? "(tyhjä)"}` };
  }
  if (payer.kind === "unmatched") {
    return { kind: "unmatched", message: `Nimeä "${payer.name}" ei ole yhdistetty jäseneen` };
  }
  if (payer.kind !== "payer") return null;
  if (flight.airborneMinutes === null) return { kind: "missing_minutes", message: "Ilmassa oloaika puuttuu" };
  if (flight.airborneMinutes < 0) return { kind: "missing_minutes", message: "Ilmassa oloaika on negatiivinen" };
  if (!rateOn(ctx.rates, flight.registration, flight.flightDate)) {
    return { kind: "no_rate", message: `Koneelle ${flight.registration} ei ole hintaa` };
  }
  return null;
}

export function billPeriod(input: PeriodInput, ctx: BillingContext): PeriodBill {
  const payers = new Map<string, PayerBill>();
  const unbilled: BillLine[] = [];
  const blockers = new Map<string, Blocker>();

  const block = (kind: Blocker["kind"], message: string, row: number) => {
    const key = `${kind}:${message}`;
    const blocker = blockers.get(key) ?? { kind, message, rows: [] };
    blocker.rows.push(row);
    blockers.set(key, blocker);
  };
  const payerBill = (key: string, name: string, userId: string | null) => {
    if (!payers.has(key)) {
      payers.set(key, { key, name, userId, lines: [], flights: 0, minutes: 0, landings: 0, totalCents: 0 });
    }
    return payers.get(key)!;
  };
  const flightLine = (flight: BillingFlight, kind: LineKind, extra: Partial<BillLine>): BillLine => ({
    kind,
    flightId: flight.id,
    registration: flight.registration,
    flightDate: flight.flightDate,
    purposeCode: flight.purposeCode,
    minutes: 0,
    landings: 0,
    centsPerMinute: null,
    amountCents: 0,
    description: label(flight),
    inputHash: flight.inputHash,
    ...extra,
  });

  const flights = [...input.flights].sort(byFlightOrder);
  const payerKeys = new Map(
    flights.map((flight) => {
      const payer = payerOf(flight, ctx);
      return [flight.id, payer.kind === "payer" ? payer.key : null];
    })
  );
  // Neighbours in the sheet, for the minimum: consecutive flights of the same
  // payer on the same day are a series, which has no minimum
  const inSheetOrder = [...flights].sort(
    (a, b) => a.registration.localeCompare(b.registration) || a.sheetRow - b.sheetRow
  );
  const inSeries = new Set<string>();
  inSheetOrder.forEach((flight, i) => {
    const next = inSheetOrder[i + 1];
    if (
      next &&
      next.registration === flight.registration &&
      next.flightDate === flight.flightDate &&
      payerKeys.get(next.id) !== null &&
      payerKeys.get(next.id) === payerKeys.get(flight.id)
    ) {
      inSeries.add(flight.id).add(next.id);
    }
  });

  const position = new Map(input.earlierEligible);

  for (const flight of flights) {
    if (!isChecked(flight.status)) {
      block("unchecked", "Tarkistamatta", flight.sheetRow);
    }
    const payer = payerOf(flight, ctx);
    if (payer.kind === "unknown_purpose") {
      block("unknown_purpose", `Tuntematon lennon tarkoitus ${payer.code ?? "(tyhjä)"}`, flight.sheetRow);
      continue;
    }
    if (payer.kind === "none") {
      unbilled.push(
        flightLine(flight, "unbilled", {
          minutes: flight.airborneMinutes ?? 0,
          landings: flight.landings ?? 0,
          description: `${label(flight)} · ${flight.picName}`,
        })
      );
      continue;
    }
    if (payer.kind === "unmatched") {
      block("unmatched", `Nimeä "${payer.name}" ei ole yhdistetty jäseneen`, flight.sheetRow);
      continue;
    }
    if (flight.airborneMinutes === null) {
      block("missing_minutes", "Ilmassa oloaika puuttuu", flight.sheetRow);
      continue;
    }
    // Possible when the sheet's value is typed in and the times are empty
    if (flight.airborneMinutes < 0) {
      block("missing_minutes", "Ilmassa oloaika on negatiivinen", flight.sheetRow);
      continue;
    }
    const rate = rateOn(ctx.rates, flight.registration, flight.flightDate);
    if (!rate) {
      block("no_rate", `Koneelle ${flight.registration} ei ole hintaa`, flight.sheetRow);
      continue;
    }

    const withFee = payer.purpose.isTraining || hasFee(ctx, payer.userId, flight.flightDate);
    const perMinute = withFee ? rate.centsWithFee : rate.centsWithoutFee;
    const bill = payerBill(payer.key, payer.name, payer.userId);
    const minutes = flight.airborneMinutes;
    bill.lines.push(
      flightLine(flight, "flight", {
        minutes,
        landings: flight.landings ?? 0,
        centsPerMinute: perMinute,
        amountCents: minutes * perMinute,
      })
    );
    bill.flights++;
    bill.minutes += minutes;
    bill.landings += flight.landings ?? 0;

    const local = flight.departure !== null && flight.departure === flight.arrival;
    if (local && !inSeries.has(flight.id) && minutes < rate.minimumLocalMinutes) {
      const extra = rate.minimumLocalMinutes - minutes;
      bill.lines.push(
        flightLine(flight, "minimum", {
          minutes: extra,
          centsPerMinute: perMinute,
          amountCents: extra * perMinute,
          description: `Minimilaskutus ${rate.minimumLocalMinutes} min (lento ${minutes} min)`,
        })
      );
    }

    if (earnsFreeHour(ctx, flight, payer.userId)) {
      const key = `${payer.userId}:${year(flight.flightDate)}`;
      const start = position.get(key) ?? 0;
      const free = freeMinutesIn(start, minutes, ctx.freeHour);
      position.set(key, start + minutes);
      if (free > 0) {
        bill.lines.push(
          flightLine(flight, "credit", {
            minutes: -free,
            centsPerMinute: perMinute,
            amountCents: -free * perMinute,
            description: `Hyvitys: vapaatunti, ${free} min`,
          })
        );
      }
    }
  }

  // Corrections to flights billed in closed periods
  for (const changed of input.changed) {
    const problem = changed.current ? correctionBlocker(changed.current, ctx) : null;
    if (problem) {
      block(problem.kind, problem.message, changed.current!.sheetRow);
      continue;
    }
    const now = changed.current ? flightAmount(changed.current, ctx) : null;
    const billedByPayer = new Map<string, { cents: number; minutes: number }>();
    for (const line of changed.billed) {
      if (!line.payerKey || (line.kind !== "flight" && line.kind !== "adjustment")) continue;
      const sum = billedByPayer.get(line.payerKey) ?? { cents: 0, minutes: 0 };
      billedByPayer.set(line.payerKey, { cents: sum.cents + line.amountCents, minutes: sum.minutes + line.minutes });
    }
    const nowKey = now?.payer.kind === "payer" ? now.payer.key : null;
    const keys = new Set([...billedByPayer.keys(), ...(nowKey ? [nowKey] : [])]);
    for (const key of keys) {
      const before = billedByPayer.get(key) ?? { cents: 0, minutes: 0 };
      const after = key === nowKey ? { cents: now!.cents, minutes: now!.minutes } : { cents: 0, minutes: 0 };
      const diff = after.cents - before.cents;
      if (diff === 0) continue;
      const name =
        key === nowKey && now!.payer.kind === "payer"
          ? now!.payer.name
          : key.startsWith("user:")
            ? (ctx.userNames.get(key.slice(5)) ?? key)
            : key.slice(5);
      const bill = payerBill(key, name, key.startsWith("user:") ? key.slice(5) : null);
      const flight = changed.current;
      bill.lines.push({
        kind: "adjustment",
        flightId: changed.flightId,
        registration: flight?.registration ?? null,
        flightDate: flight?.flightDate ?? null,
        purposeCode: flight?.purposeCode ?? null,
        minutes: after.minutes - before.minutes,
        landings: 0,
        centsPerMinute: null,
        amountCents: diff,
        description: flight
          ? `Korjaus: ${label(flight)}, laskutettu ${before.minutes} min, nyt ${after.minutes} min`
          : `Korjaus: lento poistettu taulukosta (laskutettu ${before.minutes} min)`,
        inputHash: flight?.inputHash ?? null,
      });
    }
  }

  const bills = [...payers.values()];
  for (const bill of bills) {
    bill.totalCents = bill.lines.reduce((sum, line) => sum + line.amountCents, 0);
  }
  bills.sort((a, b) => a.name.localeCompare(b.name, "fi"));
  return {
    payers: bills,
    unbilled,
    blockers: [...blockers.values()],
    totalCents: bills.reduce((sum, bill) => sum + bill.totalCents, 0),
  };
}
