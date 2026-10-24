import "server-only";

import { DateTime } from "luxon";
import connectionPool from "@/utilities/db";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import {
  BilledLine,
  BillingContext,
  BillingFlight,
  BillLine,
  billPeriod,
  ChangedFlight,
  earnsFreeHour,
  FreeHourSettings,
  LineKind,
  PayerBill,
  payerOf,
  PayerType,
  PeriodBill,
  year,
} from "@/utilities/billing";

/**
 * Reads for billing (utilities/billing.ts does the arithmetic). An open
 * period is worked out from the synced flights each time; a closed one is
 * read back from what was billed. The pages check permissions first.
 */

export interface BillingPeriod {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  closedAt: string | null;
  closedByName: string | null;
}

export const DEFAULT_FREE_HOUR: FreeHourSettings = {
  enabled: true,
  aircraft: ["OH-CON"],
  paidMinutes: 600,
  freeMinutes: 60,
};

// pg returns DATE as a JS Date at local midnight; keep the calendar day
const day = (value: Date | string) =>
  typeof value === "string" ? value.slice(0, 10) : DateTime.fromJSDate(value).toISODate()!;
const clock = (value: Date | null) =>
  value ? DateTime.fromJSDate(value, { zone: SHEET_ZONE }).toFormat("HH:mm") : null;

export async function getBillingContext(): Promise<BillingContext> {
  const [purposes, rates, aliases, users, seasons, settings] = await Promise.all([
    connectionPool.query("SELECT code, name_fi, payer, is_training FROM flight_purposes"),
    connectionPool.query(
      `SELECT registration, valid_from, cents_with_fee, cents_without_fee, minimum_local_minutes
       FROM aircraft_rates ORDER BY registration, valid_from`
    ),
    connectionPool.query("SELECT name_key, user_id FROM pilot_aliases"),
    connectionPool.query("SELECT id, coalesce(full_name, name, email) AS name FROM users"),
    connectionPool.query("SELECT user_id, season FROM equipment_fee_seasons"),
    connectionPool.query("SELECT value FROM flight_log_settings WHERE key = 'free_hour'"),
  ]);
  return {
    purposes: new Map(
      purposes.rows.map((row) => [
        row.code,
        { code: row.code, name: row.name_fi, payer: row.payer as PayerType, isTraining: row.is_training },
      ])
    ),
    rates: rates.rows.map((row) => ({
      registration: row.registration,
      validFrom: day(row.valid_from),
      centsWithFee: row.cents_with_fee,
      centsWithoutFee: row.cents_without_fee,
      minimumLocalMinutes: row.minimum_local_minutes,
    })),
    aliases: new Map(aliases.rows.map((row) => [row.name_key, row.user_id])),
    userNames: new Map(users.rows.map((row) => [row.id, row.name])),
    feeSeasons: new Set(seasons.rows.map((row) => `${row.user_id}:${row.season}`)),
    freeHour: { ...DEFAULT_FREE_HOUR, ...(settings.rows[0]?.value ?? {}) },
  };
}

const PERIOD_SELECT = `
  SELECT p.id, p.name, p.starts_on, p.ends_on, p.closed_at, u.full_name AS closed_by_name
  FROM billing_periods p LEFT JOIN users u ON u.id = p.closed_by`;

function toPeriod(row: Record<string, unknown>): BillingPeriod {
  return {
    id: row.id as number,
    name: row.name as string,
    startsOn: day(row.starts_on as Date),
    endsOn: day(row.ends_on as Date),
    closedAt: row.closed_at ? (row.closed_at as Date).toISOString() : null,
    closedByName: (row.closed_by_name as string) ?? null,
  };
}

export async function getBillingPeriods(): Promise<BillingPeriod[]> {
  const response = await connectionPool.query(`${PERIOD_SELECT} ORDER BY p.starts_on DESC`);
  return response.rows.map(toPeriod);
}

export async function getBillingPeriod(id: number): Promise<BillingPeriod | null> {
  const response = await connectionPool.query(`${PERIOD_SELECT} WHERE p.id = $1`, [id]);
  return response.rows[0] ? toPeriod(response.rows[0]) : null;
}

const FLIGHT_SELECT = `
  SELECT f.id, f.registration, f.sheet_row, f.flight_date, f.pic_name, f.second_name,
         f.departure, f.arrival, f.takeoff_at, f.landing_at, f.airborne_minutes, f.landings,
         f.purpose_code, f.status, f.input_hash
  FROM sheet_flights f`;

function toFlight(row: Record<string, unknown>): BillingFlight {
  return {
    id: row.id as string,
    registration: row.registration as string,
    sheetRow: row.sheet_row as number,
    flightDate: day(row.flight_date as Date),
    picName: row.pic_name as string,
    secondName: (row.second_name as string) ?? null,
    departure: (row.departure as string) ?? null,
    arrival: (row.arrival as string) ?? null,
    takeoff: clock(row.takeoff_at as Date | null),
    landing: clock(row.landing_at as Date | null),
    airborneMinutes: (row.airborne_minutes as number) ?? null,
    landings: (row.landings as number) ?? null,
    purposeCode: (row.purpose_code as string) ?? null,
    status: (row.status as string) ?? null,
    inputHash: (row.input_hash as string) ?? null,
  };
}

// In a closed period already
const BILLED = `EXISTS (
  SELECT 1 FROM billing_lines l WHERE l.flight_id = f.id AND l.kind IN ('flight', 'unbilled'))`;
// Billed before the website did billing (Tila filled in by hand)
const BILLED_BY_HAND = `lower(trim(coalesce(f.status, ''))) IN ('laskutettu', 'ei laskuteta', 'maksettu')`;

/**
 * The flights an open period bills: those dated in it, and, for the first
 * open period, late ones dated in a period that has already closed
 */
async function openPeriodFlights(period: BillingPeriod, first: boolean) {
  const response = await connectionPool.query(
    `${FLIGHT_SELECT}
     WHERE f.missing_since IS NULL AND NOT ${BILLED} AND NOT ${BILLED_BY_HAND}
       AND (f.flight_date BETWEEN $1 AND $2
            OR ($3 AND EXISTS (
              SELECT 1 FROM billing_periods c
              WHERE c.closed_at IS NOT NULL AND f.flight_date BETWEEN c.starts_on AND c.ends_on)))`,
    [period.startsOn, period.endsOn, first]
  );
  return response.rows.map(toFlight);
}

/** Flights billed in a closed period that have changed in the sheet since */
async function changedSinceBilling(): Promise<ChangedFlight[]> {
  const response = await connectionPool.query(
    `WITH latest AS (
       SELECT DISTINCT ON (flight_id) flight_id, input_hash
       FROM billing_lines
       WHERE flight_id IS NOT NULL AND kind IN ('flight', 'adjustment', 'unbilled')
       ORDER BY flight_id, id DESC
     )
     SELECT latest.flight_id AS billed_id, f.*
     FROM latest
     LEFT JOIN (${FLIGHT_SELECT} WHERE f.missing_since IS NULL) f ON f.id = latest.flight_id
     WHERE (f.id IS NULL AND latest.input_hash IS NOT NULL)
        OR (f.id IS NOT NULL AND f.input_hash IS DISTINCT FROM latest.input_hash)`
  );
  if (response.rows.length === 0) return [];
  const ids = response.rows.map((row) => row.billed_id);
  const lines = await connectionPool.query(
    `SELECT payer_key, kind, flight_id, minutes, amount_cents FROM billing_lines
     WHERE flight_id = ANY($1::uuid[]) AND kind IN ('flight', 'adjustment')`,
    [ids]
  );
  return response.rows.map((row) => ({
    flightId: row.billed_id,
    current: row.id ? toFlight(row) : null,
    billed: lines.rows
      .filter((line) => line.flight_id === row.billed_id)
      .map(
        (line): BilledLine => ({
          payerKey: line.payer_key,
          kind: line.kind,
          flightId: line.flight_id,
          minutes: line.minutes,
          amountCents: line.amount_cents,
        })
      ),
  }));
}

/**
 * Free-hour minutes each member had flown in the year before this period, in
 * billing order: what closed periods billed, and the flights before the
 * period's start that the website hasn't billed (billed by hand, or not yet)
 */
async function freeHourPositions(
  period: BillingPeriod,
  flights: BillingFlight[],
  ctx: BillingContext
): Promise<Map<string, number>> {
  const positions = new Map<string, number>();
  const keys = new Set<string>();
  for (const flight of flights) {
    const payer = payerOf(flight, ctx);
    if (payer.kind === "payer" && earnsFreeHour(ctx, flight, payer.userId)) {
      keys.add(`${payer.userId}:${year(flight.flightDate)}`);
    }
  }
  if (keys.size === 0) return positions;
  const add = (key: string, minutes: number) => {
    if (keys.has(key)) positions.set(key, (positions.get(key) ?? 0) + minutes);
  };
  const years = [...new Set([...keys].map((key) => Number(key.split(":")[1])))];

  const billed = await connectionPool.query(
    `SELECT payer_key, flight_date, registration, minutes FROM billing_lines
     WHERE kind IN ('flight', 'adjustment') AND payer_key LIKE 'user:%'
       AND flight_date IS NOT NULL AND extract(year FROM flight_date)::int = ANY($1::int[])`,
    [years]
  );
  for (const line of billed.rows) {
    const userId = (line.payer_key as string).slice(5);
    const date = day(line.flight_date);
    if (ctx.freeHour.aircraft.includes(line.registration) && ctx.feeSeasons.has(`${userId}:${year(date)}`)) {
      add(`${userId}:${year(date)}`, line.minutes);
    }
  }

  const inPeriod = new Set(flights.map((flight) => flight.id));
  const before = await connectionPool.query(
    `${FLIGHT_SELECT}
     WHERE f.missing_since IS NULL AND NOT ${BILLED} AND f.flight_date < $1
       AND extract(year FROM f.flight_date)::int = ANY($2::int[])`,
    [period.startsOn, years]
  );
  for (const flight of before.rows.map(toFlight)) {
    if (inPeriod.has(flight.id) || flight.airborneMinutes === null) continue;
    const payer = payerOf(flight, ctx);
    if (payer.kind === "payer" && earnsFreeHour(ctx, flight, payer.userId)) {
      add(`${payer.userId}:${year(flight.flightDate)}`, flight.airborneMinutes);
    }
  }
  return positions;
}

export interface OpenPeriodBill {
  bill: PeriodBill;
  flights: BillingFlight[];
}

/** Works out an open period from the synced flights */
export async function computeOpenPeriod(period: BillingPeriod): Promise<OpenPeriodBill> {
  const ctx = await getBillingContext();
  const firstOpen = await connectionPool.query(
    "SELECT id FROM billing_periods WHERE closed_at IS NULL ORDER BY starts_on LIMIT 1"
  );
  const first = firstOpen.rows[0]?.id === period.id;
  const flights = await openPeriodFlights(period, first);
  const [earlierEligible, changed] = await Promise.all([
    freeHourPositions(period, flights, ctx),
    // Corrections go into the first open period
    first ? changedSinceBilling() : Promise.resolve([]),
  ]);
  return { bill: billPeriod({ flights, earlierEligible, changed }, ctx), flights };
}

export interface PayerStatus {
  email: string | null;
  paidAt: string | null;
  paidByName: string | null;
}

export interface PeriodView {
  period: BillingPeriod;
  bill: PeriodBill;
  payers: Record<string, PayerStatus>;
  // Closed periods: flights billed in it that have changed in the sheet since
  changedSince: { flightId: string; sheetRow: number | null; description: string }[];
}

const LINE_COLUMNS = `
  l.payer_key, l.kind, l.flight_id, l.registration, l.flight_date, l.purpose_code,
  l.minutes, l.landings, l.cents_per_minute, l.amount_cents, l.description, l.input_hash`;
const LINE_SELECT = `SELECT ${LINE_COLUMNS} FROM billing_lines l`;

function toLine(row: Record<string, unknown>): BillLine {
  return {
    kind: row.kind as LineKind,
    flightId: (row.flight_id as string) ?? null,
    registration: (row.registration as string) ?? null,
    flightDate: row.flight_date ? day(row.flight_date as Date) : null,
    purposeCode: (row.purpose_code as string) ?? null,
    minutes: row.minutes as number,
    landings: row.landings as number,
    centsPerMinute: (row.cents_per_minute as number) ?? null,
    amountCents: row.amount_cents as number,
    description: row.description as string,
    inputHash: (row.input_hash as string) ?? null,
  };
}

const LINE_ORDER: Record<LineKind, number> = { flight: 0, minimum: 1, credit: 2, adjustment: 3, unbilled: 4 };

/** A closed period as it was billed */
async function closedPeriodBill(period: BillingPeriod) {
  const [payers, lines] = await Promise.all([
    connectionPool.query(
      `SELECT b.payer_key, b.payer_name, b.user_id, b.total_cents, b.paid_at,
              p.full_name AS paid_by_name, u.email
       FROM billing_payers b
       LEFT JOIN users p ON p.id = b.paid_by
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.period_id = $1
       ORDER BY b.payer_name`,
      [period.id]
    ),
    connectionPool.query(`${LINE_SELECT} WHERE l.period_id = $1 ORDER BY l.flight_date, l.id`, [
      period.id,
    ]),
  ]);
  const all = lines.rows.map((row) => ({ payerKey: row.payer_key as string | null, line: toLine(row) }));
  const bills: PayerBill[] = payers.rows.map((row) => {
    const own = all
      .filter((l) => l.payerKey === row.payer_key)
      .map((l) => l.line)
      .sort((a, b) => (a.flightDate ?? "").localeCompare(b.flightDate ?? "") || LINE_ORDER[a.kind] - LINE_ORDER[b.kind]);
    const flights = own.filter((line) => line.kind === "flight");
    return {
      key: row.payer_key,
      name: row.payer_name,
      userId: row.user_id,
      lines: own,
      flights: flights.length,
      minutes: flights.reduce((sum, line) => sum + line.minutes, 0),
      landings: flights.reduce((sum, line) => sum + line.landings, 0),
      totalCents: row.total_cents,
    };
  });
  const status: Record<string, PayerStatus> = Object.fromEntries(
    payers.rows.map((row) => [
      row.payer_key,
      {
        email: row.email ?? null,
        paidAt: row.paid_at ? (row.paid_at as Date).toISOString() : null,
        paidByName: row.paid_by_name ?? null,
      },
    ])
  );
  const bill: PeriodBill = {
    payers: bills,
    unbilled: all.filter((l) => l.line.kind === "unbilled").map((l) => l.line),
    blockers: [],
    totalCents: bills.reduce((sum, b) => sum + b.totalCents, 0),
  };
  return { bill, status };
}

export async function getPeriodView(id: number): Promise<PeriodView | null> {
  const period = await getBillingPeriod(id);
  if (!period) return null;

  if (!period.closedAt) {
    const { bill } = await computeOpenPeriod(period);
    const userIds = bill.payers.map((p) => p.userId).filter(Boolean);
    const emails = await connectionPool.query("SELECT id, email FROM users WHERE id = ANY($1)", [userIds]);
    const emailOf = new Map(emails.rows.map((row) => [row.id, row.email]));
    return {
      period,
      bill,
      payers: Object.fromEntries(
        bill.payers.map((p) => [
          p.key,
          { email: p.userId ? (emailOf.get(p.userId) ?? null) : null, paidAt: null, paidByName: null },
        ])
      ),
      changedSince: [],
    };
  }

  const { bill, status } = await closedPeriodBill(period);
  const changed = await connectionPool.query(
    `SELECT DISTINCT ON (l.flight_id) l.flight_id, l.description, l.flight_date, f.sheet_row
     FROM billing_lines l
     LEFT JOIN sheet_flights f ON f.id = l.flight_id AND f.missing_since IS NULL
     WHERE l.period_id = $1 AND l.kind IN ('flight', 'unbilled')
       AND f.input_hash IS DISTINCT FROM l.input_hash
     ORDER BY l.flight_id`,
    [period.id]
  );
  return {
    period,
    bill,
    payers: status,
    changedSince: changed.rows.map((row) => ({
      flightId: row.flight_id,
      sheetRow: row.sheet_row ?? null,
      description: `${day(row.flight_date)} ${row.description}`,
    })),
  };
}

export interface PeriodSummary {
  period: BillingPeriod;
  payers: number;
  paid: number;
  totalCents: number;
  blockers: number;
}

/** Every period with its totals, newest first */
export async function getBillingOverview(): Promise<PeriodSummary[]> {
  const periods = await getBillingPeriods();
  const closedTotals = await connectionPool.query(
    `SELECT period_id, count(*)::int AS payers, count(paid_at)::int AS paid,
            coalesce(sum(total_cents), 0)::int AS total
     FROM billing_payers GROUP BY period_id`
  );
  const totals = new Map(closedTotals.rows.map((row) => [row.period_id, row]));
  return Promise.all(
    periods.map(async (period) => {
      if (period.closedAt) {
        const row = totals.get(period.id);
        return { period, payers: row?.payers ?? 0, paid: row?.paid ?? 0, totalCents: row?.total ?? 0, blockers: 0 };
      }
      const { bill } = await computeOpenPeriod(period);
      return {
        period,
        payers: bill.payers.length,
        paid: 0,
        totalCents: bill.totalCents,
        blockers: bill.blockers.reduce((sum, b) => sum + b.rows.length, 0),
      };
    })
  );
}

export interface MyBill {
  periodName: string;
  closedAt: string;
  totalCents: number;
  paidAt: string | null;
  lines: BillLine[];
  // The invoice sent for it, once there is one
  invoice: { id: number; number: number } | null;
}

/** A member's bills from closed periods, newest first */
export async function getMyBills(userId: string): Promise<MyBill[]> {
  const key = `user:${userId}`;
  const [payers, lines] = await Promise.all([
    connectionPool.query(
      `SELECT p.id, p.name, p.closed_at, b.total_cents, b.paid_at, i.id AS invoice_id, i.number AS invoice_number
       FROM billing_payers b JOIN billing_periods p ON p.id = b.period_id
       LEFT JOIN invoices i ON i.period_id = b.period_id AND i.payer_key = b.payer_key
         AND i.status IN ('open', 'paid')
       WHERE b.payer_key = $1 AND p.closed_at IS NOT NULL
       ORDER BY p.starts_on DESC`,
      [key]
    ),
    connectionPool.query(
      `SELECT l.period_id, ${LINE_COLUMNS}
       FROM billing_lines l WHERE l.payer_key = $1 ORDER BY l.flight_date, l.id`,
      [key]
    ),
  ]);
  return payers.rows.map((row) => ({
    periodName: row.name,
    closedAt: (row.closed_at as Date).toISOString(),
    totalCents: row.total_cents,
    paidAt: row.paid_at ? (row.paid_at as Date).toISOString() : null,
    lines: lines.rows.filter((line) => line.period_id === row.id).map(toLine),
    invoice: row.invoice_id ? { id: row.invoice_id, number: row.invoice_number } : null,
  }));
}

export interface BillingSettings {
  aircraft: string[];
  rates: {
    registration: string;
    validFrom: string;
    centsWithFee: number;
    centsWithoutFee: number;
    minimumLocalMinutes: number;
  }[];
  purposes: { code: string; name: string; payer: PayerType; isTraining: boolean }[];
  freeHour: FreeHourSettings;
  // Members, and whether each paid the equipment fee for the season shown
  members: { id: string; name: string; email: string; paid: boolean }[];
}

export async function getBillingSettings(season: number): Promise<BillingSettings> {
  const [ctx, aircraft, purposes, members] = await Promise.all([
    getBillingContext(),
    connectionPool.query("SELECT registration FROM aircraft_sheets WHERE active ORDER BY registration"),
    connectionPool.query(
      "SELECT code, name_fi, payer, is_training FROM flight_purposes WHERE active ORDER BY sort_order"
    ),
    connectionPool.query(
      `SELECT u.id, coalesce(u.full_name, u.name, u.email) AS name, u.email,
              EXISTS (SELECT 1 FROM equipment_fee_seasons s WHERE s.user_id = u.id AND s.season = $1) AS paid
       FROM users u
       WHERE u.roles && ARRAY['user', 'admin']::text[]
       ORDER BY 2`,
      [season]
    ),
  ]);
  return {
    aircraft: aircraft.rows.map((row) => row.registration),
    rates: ctx.rates,
    purposes: purposes.rows.map((row) => ({
      code: row.code,
      name: row.name_fi,
      payer: row.payer,
      isTraining: row.is_training,
    })),
    freeHour: ctx.freeHour,
    members: members.rows,
  };
}
