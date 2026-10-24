import "server-only";

import { DateTime } from "luxon";
import connectionPool from "@/utilities/db";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import type { OutboxMessage } from "@/utilities/mailData";

/**
 * Reads for invoices (laskut). The pages and actions check permissions
 * first; a member's own reads also check that the invoice is theirs.
 */

export type InvoiceStatus = "draft" | "open" | "paid" | "cancelled";

export interface InvoiceLine {
  id: number;
  position: number;
  source: "flight" | "other";
  lineDate: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitCents: number | null;
  amountCents: number;
}

export interface InvoiceDelivery {
  id: number;
  status: OutboxMessage["status"];
  toAddress: string;
  deliveredTo: string | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface Invoice {
  id: number;
  number: number | null;
  reference: string | null;
  status: InvoiceStatus;
  userId: string | null;
  recipientName: string;
  recipientEmail: string | null;
  recipientAddress: string;
  title: string;
  message: string;
  periodId: number | null;
  periodName: string | null;
  payerKey: string | null;
  issueDate: string | null;
  dueDate: string | null;
  totalCents: number;
  createdAt: string;
  createdByName: string | null;
  sentAt: string | null;
  sentByName: string | null;
  paidAt: string | null;
  paidByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  overdue: boolean;
  lines: InvoiceLine[];
  deliveries: InvoiceDelivery[]; // newest first
}

export interface InvoiceSummary {
  id: number;
  number: number | null;
  status: InvoiceStatus;
  recipientName: string;
  recipientEmail: string | null;
  title: string;
  totalCents: number;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  periodId: number | null;
  overdue: boolean;
  delivery: { status: OutboxMessage["status"]; lastError: string | null } | null;
}

export interface InvoiceSettings {
  paymentTermDays: number;
  footer: string; // e.g. about late payment, at the end of every invoice
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = { paymentTermDays: 14, footer: "" };

// pg returns DATE as a JS Date at local midnight; keep the calendar day
const day = (value: Date | null) => (value ? DateTime.fromJSDate(value).toISODate()! : null);
const iso = (value: Date | null) => (value ? value.toISOString() : null);

export const today = () => DateTime.now().setZone(SHEET_ZONE).toISODate()!;

const isOverdue = (status: InvoiceStatus, dueDate: string | null) =>
  status === "open" && dueDate !== null && dueDate < today();

function toSummary(row: Record<string, unknown>): InvoiceSummary {
  const status = row.status as InvoiceStatus;
  const dueDate = day(row.due_date as Date | null);
  return {
    id: row.id as number,
    number: (row.number as number) ?? null,
    status,
    recipientName: row.recipient_name as string,
    recipientEmail: (row.recipient_email as string) ?? null,
    title: row.title as string,
    totalCents: row.total_cents as number,
    issueDate: day(row.issue_date as Date | null),
    dueDate,
    paidAt: iso(row.paid_at as Date | null),
    periodId: (row.period_id as number) ?? null,
    overdue: isOverdue(status, dueDate),
    delivery: row.delivery_status
      ? { status: row.delivery_status as OutboxMessage["status"], lastError: (row.delivery_error as string) ?? null }
      : null,
  };
}

const LATEST_DELIVERY = `
  LEFT JOIN LATERAL (
    SELECT o.status AS delivery_status, o.last_error AS delivery_error
    FROM email_outbox o WHERE o.invoice_id = i.id ORDER BY o.id DESC LIMIT 1
  ) d ON TRUE`;

export type InvoiceView = "luonnokset" | "avoimet" | "maksetut" | "mitatoidyt" | "kaikki";

export const VIEW_STATUS: Record<InvoiceView, InvoiceStatus | null> = {
  luonnokset: "draft",
  avoimet: "open",
  maksetut: "paid",
  mitatoidyt: "cancelled",
  kaikki: null,
};

/** Invoices in one view, drafts first, then the newest */
export async function getInvoices(view: InvoiceView, periodId: number | null = null) {
  const [rows, counts] = await Promise.all([
    connectionPool.query(
      `SELECT i.*, d.* FROM invoices i ${LATEST_DELIVERY}
       WHERE ($1::text IS NULL OR i.status = $1) AND ($2::int IS NULL OR i.period_id = $2)
       ORDER BY i.status = 'draft' DESC, i.number DESC NULLS FIRST, i.id DESC`,
      [VIEW_STATUS[view], periodId]
    ),
    connectionPool.query(
      `SELECT status, count(*)::int AS count FROM invoices
       WHERE ($1::int IS NULL OR period_id = $1) GROUP BY status`,
      [periodId]
    ),
  ]);
  const count = Object.fromEntries(counts.rows.map((row) => [row.status, row.count]));
  return {
    invoices: rows.rows.map(toSummary),
    counts: {
      draft: count.draft ?? 0,
      open: count.open ?? 0,
      paid: count.paid ?? 0,
      cancelled: count.cancelled ?? 0,
    } as Record<InvoiceStatus, number>,
  };
}

const toLine = (row: Record<string, unknown>): InvoiceLine => ({
  id: row.id as number,
  position: row.position as number,
  source: row.source as InvoiceLine["source"],
  lineDate: day(row.line_date as Date | null),
  description: row.description as string,
  quantity: Number(row.quantity),
  unit: row.unit as string,
  unitCents: (row.unit_cents as number) ?? null,
  amountCents: row.amount_cents as number,
});

/** One invoice with its lines and every attempt to send it */
export async function getInvoice(id: number): Promise<Invoice | null> {
  const response = await connectionPool.query(
    `SELECT i.*, p.name AS period_name, c.full_name AS created_by_name,
            s.full_name AS sent_by_name, m.full_name AS paid_by_name
     FROM invoices i
     LEFT JOIN billing_periods p ON p.id = i.period_id
     LEFT JOIN users c ON c.id = i.created_by
     LEFT JOIN users s ON s.id = i.sent_by
     LEFT JOIN users m ON m.id = i.paid_by
     WHERE i.id = $1`,
    [id]
  );
  const row = response.rows[0];
  if (!row) return null;
  const [lines, deliveries] = await Promise.all([
    connectionPool.query("SELECT * FROM invoice_lines WHERE invoice_id = $1 ORDER BY position, id", [id]),
    connectionPool.query(
      `SELECT id, status, to_address, delivered_to, last_error, created_at, sent_at
       FROM email_outbox WHERE invoice_id = $1 ORDER BY id DESC`,
      [id]
    ),
  ]);
  const summary = toSummary(row);
  return {
    ...summary,
    reference: row.reference ?? null,
    userId: row.user_id ?? null,
    recipientAddress: row.recipient_address,
    message: row.message,
    periodName: row.period_name ?? null,
    payerKey: row.payer_key ?? null,
    createdAt: iso(row.created_at)!,
    createdByName: row.created_by_name ?? null,
    sentAt: iso(row.sent_at),
    sentByName: row.sent_by_name ?? null,
    paidByName: row.paid_by_name ?? null,
    cancelledAt: iso(row.cancelled_at),
    cancelReason: row.cancel_reason ?? null,
    lines: lines.rows.map(toLine),
    deliveries: deliveries.rows.map((d) => ({
      id: d.id,
      status: d.status,
      toAddress: d.to_address,
      deliveredTo: d.delivered_to,
      lastError: d.last_error,
      createdAt: iso(d.created_at)!,
      sentAt: iso(d.sent_at),
    })),
  };
}

/** A member's invoices, newest first; drafts aren't theirs to see yet */
export async function getMyInvoices(userId: string): Promise<InvoiceSummary[]> {
  const response = await connectionPool.query(
    `SELECT i.* FROM invoices i
     WHERE i.user_id = $1 AND i.status <> 'draft'
     ORDER BY i.issue_date DESC, i.number DESC`,
    [userId]
  );
  return response.rows.map(toSummary);
}

/** A member's own invoice, without the admin's details; null if it isn't theirs */
export async function getMyInvoice(userId: string, id: number): Promise<Invoice | null> {
  const invoice = await getInvoice(id);
  if (!invoice || invoice.userId !== userId || invoice.status === "draft") return null;
  return { ...invoice, deliveries: [], createdByName: null, sentByName: null, paidByName: null };
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const response = await connectionPool.query(
    "SELECT value FROM flight_log_settings WHERE key = 'invoice'"
  );
  return { ...DEFAULT_INVOICE_SETTINGS, ...(response.rows[0]?.value ?? {}) };
}

/** A period's live invoices by payer */
export async function getPeriodInvoices(
  periodId: number
): Promise<Record<string, { id: number; number: number | null; status: InvoiceStatus }>> {
  const response = await connectionPool.query(
    `SELECT id, number, status, payer_key FROM invoices
     WHERE period_id = $1 AND status <> 'cancelled'`,
    [periodId]
  );
  return Object.fromEntries(
    response.rows.map((row) => [row.payer_key, { id: row.id, number: row.number, status: row.status }])
  );
}

export interface InvoiceRecipient {
  id: string;
  name: string;
  email: string;
  address: string;
}

/** A member's postal address as on an invoice, one part per line */
export const postalAddress = (row: { address?: string | null; postal_code?: string | null; city?: string | null }) =>
  [row.address?.trim(), [row.postal_code?.trim(), row.city?.trim()].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");

/** Members who can be invoiced: active accounts, by name */
export async function getInvoiceRecipients(): Promise<InvoiceRecipient[]> {
  const response = await connectionPool.query(
    `SELECT id, coalesce(nullif(full_name, ''), name, email) AS name, email, address, postal_code, city
     FROM users
     WHERE deactivated_at IS NULL AND roles && ARRAY['user', 'admin']::text[]
     ORDER BY 2`
  );
  return response.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    address: postalAddress(row),
  }));
}

export interface IssuedInvoice extends InvoiceSummary {
  reference: string;
  periodName: string | null;
}

/** Issued invoices of a year (or every year), oldest first, for the bookkeeping */
export async function getIssuedInvoices(year: number | null): Promise<IssuedInvoice[]> {
  const response = await connectionPool.query(
    `SELECT i.*, p.name AS period_name FROM invoices i
     LEFT JOIN billing_periods p ON p.id = i.period_id
     WHERE i.status <> 'draft' AND ($1::int IS NULL OR extract(year FROM i.issue_date)::int = $1)
     ORDER BY i.number`,
    [year]
  );
  return response.rows.map((row) => ({
    ...toSummary(row),
    reference: row.reference,
    periodName: row.period_name ?? null,
  }));
}
