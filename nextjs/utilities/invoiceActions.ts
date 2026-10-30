"use server";

import { z } from "zod";
import { DateTime } from "luxon";
import { revalidatePath } from "next/cache";
import pool from "@/utilities/db";
import { auth } from "@/auth";
import { hasPermission } from "@/utilities/roles";
import { isBillingEnabled } from "@/utilities/features";
import { syncFlightSheets } from "@/utilities/flightSync";
import { SHEET_ZONE } from "@/utilities/flightSheetParser";
import { formatFullDate } from "@/utilities/flightFormat";
import { getPeriodView } from "@/utilities/billingData";
import { writePayerPaid } from "@/utilities/billingPayments";
import { deliverEmails, queueEmail } from "@/utilities/mail";
import { MAIL_PURPOSES, mailMode } from "@/utilities/mailConfig";
import { renderInvoiceEmail } from "@/utilities/invoiceEmail";
import { getInvoice, getInvoiceSettings, InvoiceSettings, postalAddress } from "@/utilities/invoiceData";
import {
  flightInvoiceLines,
  InvoiceLineInput,
  invoiceNumber,
  ISSUER,
  lineAmount,
  parseEuros,
  parseQuantity,
  referenceNumber,
} from "@/utilities/invoices";

type ActionResult<T = null> =
  | { status: "success"; result: T }
  | { status: "error"; error: string };

type Db = { query: NonNullable<typeof pool>["query"] };

async function requireBillingAdmin() {
  if (!isBillingEnabled()) {
    return { error: "Laskutus ei ole vielä käytössä" };
  }
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user.roles, "MANAGE_BILLING")) {
    return { error: "Ei oikeuksia laskutukseen" };
  }
  return { user: session.user };
}

const revalidateInvoices = () => {
  revalidatePath("/admin/laskut", "layout");
  revalidatePath("/admin/laskutus", "layout");
  revalidatePath("/jasenalue/laskut", "layout");
  revalidatePath("/jasenalue/lentopaivakirja");
};

const pgCode = (error: unknown) => (error as { code?: string })?.code;

const siteUrl = () => (process.env.NEXTAUTH_URL || "https://savonlinnanlentokerho.fi").replace(/\/+$/, "");

/*
 * Lines and recipients typed in on the website
 */

const lineFormSchema = z.object({
  description: z.string().trim().min(1, "Anna rivin selite").max(200, "Rivin selite on liian pitkä"),
  quantity: z.string(),
  unit: z.string().trim().min(1, "Anna rivin yksikkö").max(10, "Yksikkö on liian pitkä"),
  unitPrice: z.string(),
  lineDate: z.union([z.iso.date(), z.literal("")]).optional(),
});

export type LineForm = z.input<typeof lineFormSchema>;

function parseLine(input: unknown): InvoiceLineInput | { error: string } {
  const parsed = lineFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const quantity = parseQuantity(parsed.data.quantity);
  if (quantity === null) return { error: `Määrä ei kelpaa: "${parsed.data.quantity}"` };
  const unitCents = parseEuros(parsed.data.unitPrice);
  if (unitCents === null) return { error: `Hinta ei kelpaa: "${parsed.data.unitPrice}"` };
  return {
    source: "other",
    lineDate: parsed.data.lineDate || null,
    description: parsed.data.description,
    quantity,
    unit: parsed.data.unit,
    unitCents,
    amountCents: lineAmount(quantity, unitCents),
  };
}

const recipientSchema = z.object({
  name: z.string().trim().min(1, "Anna vastaanottajan nimi").max(120, "Nimi on liian pitkä"),
  email: z.union([z.literal(""), z.email("Sähköpostiosoite ei kelpaa")]),
  address: z.string().trim().max(300, "Osoite on liian pitkä"),
});

const textSchema = z.object({
  title: z.string().trim().min(1, "Anna laskulle otsikko").max(120, "Otsikko on liian pitkä"),
  message: z.string().trim().max(2000, "Viesti on liian pitkä"),
});

async function insertLines(db: Db, invoiceId: number, lines: InvoiceLineInput[], firstPosition = 1) {
  if (lines.length === 0) return;
  await db.query(
    `INSERT INTO invoice_lines (invoice_id, position, source, line_date, description, quantity, unit, unit_cents, amount_cents)
     SELECT $1, l.position, l.source, l.line_date, l.description, l.quantity, l.unit, l.unit_cents, l.amount_cents
     FROM jsonb_to_recordset($2::jsonb) AS l(position int, source text, line_date date, description text,
       quantity numeric, unit text, unit_cents int, amount_cents int)`,
    [
      invoiceId,
      JSON.stringify(
        lines.map((line, i) => ({
          position: firstPosition + i,
          source: line.source,
          line_date: line.lineDate,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_cents: line.unitCents,
          amount_cents: line.amountCents,
        }))
      ),
    ]
  );
}

const updateTotal = (db: Db, id: number) =>
  db.query(
    `UPDATE invoices SET total_cents = (SELECT coalesce(sum(amount_cents), 0) FROM invoice_lines WHERE invoice_id = $1)
     WHERE id = $1`,
    [id]
  );

interface NewInvoice {
  userId: string | null;
  name: string;
  email: string | null;
  address: string;
  periodId?: number;
  payerKey?: string;
  title: string;
  message: string;
  lines: InvoiceLineInput[];
}

/** Stores drafts in one transaction; returns their ids */
async function insertDrafts(drafts: NewInvoice[], createdBy: string): Promise<number[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids: number[] = [];
    for (const draft of drafts) {
      const response = await client.query(
        `INSERT INTO invoices (user_id, recipient_name, recipient_email, recipient_address, period_id, payer_key,
           title, message, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          draft.userId,
          draft.name,
          draft.email,
          draft.address,
          draft.periodId ?? null,
          draft.payerKey ?? null,
          draft.title,
          draft.message,
          createdBy,
        ]
      );
      const id = response.rows[0].id;
      await insertLines(client, id, draft.lines);
      await updateTotal(client, id);
      ids.push(id);
    }
    await client.query("COMMIT");
    return ids;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const createSchema = textSchema.extend({
  userIds: z.array(z.string().min(1)).max(500),
  other: recipientSchema.nullable(),
  lines: z.array(z.unknown()).min(1, "Lisää laskulle vähintään yksi rivi").max(50, "Enintään 50 riviä"),
});

/**
 * Drafts of the same charge to each chosen member, and to someone else
 * typed in, e.g. a hangar tenant who isn't in the member list
 */
export async function createInvoices(
  input: z.input<typeof createSchema>
): Promise<ActionResult<{ ids: number[] }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { userIds, other, title, message } = parsed.data;

  const lines: InvoiceLineInput[] = [];
  for (const raw of parsed.data.lines) {
    const line = parseLine(raw);
    if ("error" in line) return { status: "error", error: line.error };
    lines.push(line);
  }
  if (lines.reduce((sum, line) => sum + line.amountCents, 0) <= 0) {
    return { status: "error", error: "Laskun summan pitää olla yli 0 €" };
  }

  const ids = [...new Set(userIds)];
  const users = await pool.query(
    `SELECT id, coalesce(nullif(full_name, ''), name) AS name, email, address, postal_code, city
     FROM users WHERE id = ANY($1) AND deactivated_at IS NULL`,
    [ids]
  );
  if (users.rows.length !== ids.length) {
    return { status: "error", error: "Osaa valituista jäsenistä ei löytynyt. Lataa sivu uudelleen." };
  }
  const drafts: NewInvoice[] = users.rows.map((user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    address: postalAddress(user),
    title,
    message,
    lines,
  }));
  if (other) {
    drafts.push({
      userId: null,
      name: other.name,
      email: other.email ? other.email.toLowerCase() : null,
      address: other.address,
      title,
      message,
      lines,
    });
  }
  if (drafts.length === 0) return { status: "error", error: "Valitse vähintään yksi vastaanottaja" };

  try {
    const created = await insertDrafts(drafts, access.user.id);
    revalidateInvoices();
    return { status: "success", result: { ids: created } };
  } catch (error) {
    console.error("Error creating invoices:", error);
    return { status: "error", error: "Laskujen luonti epäonnistui" };
  }
}

/**
 * Drafts for a closed period: one per payer with something to pay, who
 * hasn't paid already and has no invoice for it yet
 */
export async function createPeriodInvoices(
  periodId: number
): Promise<ActionResult<{ created: number; paid: number }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const view = Number.isInteger(periodId) ? await getPeriodView(periodId) : null;
  if (!view) return { status: "error", error: "Jaksoa ei löytynyt" };
  const { period, bill, payers } = view;
  if (!period.closedAt) return { status: "error", error: "Laskut tehdään suljetusta jaksosta" };

  const existing = await pool.query(
    "SELECT payer_key FROM invoices WHERE period_id = $1 AND status <> 'cancelled'",
    [periodId]
  );
  const invoiced = new Set(existing.rows.map((row) => row.payer_key));
  const due = bill.payers.filter((payer) => payer.totalCents > 0 && !invoiced.has(payer.key));
  const toBill = due.filter((payer) => !payers[payer.key]?.paidAt);

  const users = await pool.query(
    `SELECT id, coalesce(nullif(full_name, ''), name) AS name, email, address, postal_code, city
     FROM users WHERE id = ANY($1)`,
    [toBill.map((payer) => payer.userId).filter(Boolean)]
  );
  const userOf = new Map(users.rows.map((row) => [row.id, row]));
  const title = `Lentolasku ${period.name}`;
  const message = `Lennot ${formatFullDate(period.startsOn)}–${formatFullDate(period.endsOn)}.`;
  const drafts: NewInvoice[] = toBill.map((payer) => {
    const user = payer.userId ? userOf.get(payer.userId) : null;
    return {
      userId: user?.id ?? null,
      name: user?.name ?? payer.name,
      email: user?.email ?? null,
      address: user ? postalAddress(user) : "",
      periodId,
      payerKey: payer.key,
      title,
      message,
      lines: flightInvoiceLines(payer.lines),
    };
  });

  try {
    await insertDrafts(drafts, access.user.id);
  } catch (error) {
    if (pgCode(error) === "23505") {
      return { status: "error", error: "Jakson laskut luotiin juuri toisaalla. Lataa sivu uudelleen." };
    }
    console.error("Error creating period invoices:", error);
    return { status: "error", error: "Laskujen luonti epäonnistui" };
  }
  revalidateInvoices();
  return { status: "success", result: { created: drafts.length, paid: due.length - toBill.length } };
}

const draftSchema = textSchema.extend({ recipient: recipientSchema });

export async function updateDraft(
  id: number,
  input: z.input<typeof draftSchema>
): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Virheellinen pyyntö" };
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const { recipient, title, message } = parsed.data;
  const updated = await pool.query(
    `UPDATE invoices SET recipient_name = $2, recipient_email = $3, recipient_address = $4, title = $5, message = $6
     WHERE id = $1 AND status = 'draft'`,
    [id, recipient.name, recipient.email ? recipient.email.toLowerCase() : null, recipient.address, title, message]
  );
  if (updated.rowCount === 0) return { status: "error", error: "Vain luonnosta voi muokata" };
  revalidateInvoices();
  return { status: "success", result: null };
}

export async function addDraftLine(id: number, input: LineForm): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Virheellinen pyyntö" };
  const line = parseLine(input);
  if ("error" in line) return { status: "error", error: line.error };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const draft = await client.query(
      "SELECT 1 FROM invoices WHERE id = $1 AND status = 'draft' FOR UPDATE",
      [id]
    );
    if (draft.rowCount === 0) {
      await client.query("ROLLBACK");
      return { status: "error", error: "Vain luonnokseen voi lisätä rivejä" };
    }
    const last = await client.query(
      "SELECT coalesce(max(position), 0) AS position FROM invoice_lines WHERE invoice_id = $1",
      [id]
    );
    await insertLines(client, id, [line], last.rows[0].position + 1);
    await updateTotal(client, id);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Error adding an invoice line:", error);
    return { status: "error", error: "Rivin lisäys epäonnistui" };
  } finally {
    client.release();
  }
  revalidateInvoices();
  return { status: "success", result: null };
}

/** Removes a typed-in line from a draft; a period's flight lines stay */
export async function removeDraftLine(id: number, lineId: number): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id) || !Number.isInteger(lineId)) return { status: "error", error: "Virheellinen pyyntö" };
  const removed = await pool.query(
    `DELETE FROM invoice_lines l USING invoices i
     WHERE l.id = $2 AND l.invoice_id = $1 AND i.id = l.invoice_id AND i.status = 'draft' AND l.source = 'other'`,
    [id, lineId]
  );
  if (removed.rowCount === 0) return { status: "error", error: "Riviä ei voi poistaa" };
  await updateTotal(pool, id);
  revalidateInvoices();
  return { status: "success", result: null };
}

export async function deleteDraft(id: number): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Virheellinen pyyntö" };
  const deleted = await pool.query("DELETE FROM invoices WHERE id = $1 AND status = 'draft'", [id]);
  if (deleted.rowCount === 0) return { status: "error", error: "Vain luonnoksen voi poistaa" };
  revalidateInvoices();
  return { status: "success", result: null };
}

/*
 * Sending
 */

interface EmailSource {
  id: number;
  userId: string | null;
  number: number;
  reference: string;
  title: string;
  message: string;
  recipientName: string;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  lines: InvoiceLineInput[];
}

function invoiceEmail(invoice: EmailSource, settings: InvoiceSettings) {
  return renderInvoiceEmail(invoice, {
    issuer: ISSUER,
    contactEmail: MAIL_PURPOSES.billing.replyTo,
    footer: settings.footer,
    // Only members can log in to see it
    url: invoice.userId ? `${siteUrl()}/jasenalue/laskut/${invoice.id}` : null,
  });
}

// What happened to a batch, in Finnish
function summary(counts: { sent: number; held: number; failed: number; noEmail: number }, errors: string[]) {
  const parts = [
    counts.sent > 0 && `${counts.sent} lähetetty sähköpostilla.`,
    counts.held > 0 &&
      `${counts.held} tallennettu, ei lähetetty: sähköposti ei ole käytössä${mailMode() === "off" ? " (MAIL_MODE)" : ""}.`,
    counts.noEmail > 0 && `${counts.noEmail} ilman sähköpostiosoitetta: tulosta ne laskun sivulta.`,
    counts.failed > 0 && `${counts.failed} lähetys epäonnistui; yritä uudelleen laskun sivulta.`,
    ...errors,
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Sends drafts: each gets the next number of the year, its reference number,
 * today's date and a due date, and is emailed to its recipient. One without
 * an email address is issued for printing. Each invoice is its own
 * transaction, so one failure doesn't stop the rest.
 */
export async function sendInvoices(
  ids: number[]
): Promise<ActionResult<{ issued: number; text: string }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 300 || !ids.every(Number.isInteger)) {
    return { status: "error", error: "Valitse lähetettävät laskut" };
  }

  const settings = await getInvoiceSettings();
  const now = DateTime.now().setZone(SHEET_ZONE);
  const issueDate = now.toISODate()!;
  const dueDate = now.plus({ days: settings.paymentTermDays }).toISODate()!;
  const queued: number[] = [];
  const errors: string[] = [];
  let issued = 0;
  let noEmail = 0;

  for (const id of ids) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const row = (
        await client.query("SELECT * FROM invoices WHERE id = $1 AND status = 'draft' FOR UPDATE", [id])
      ).rows[0];
      if (!row) {
        await client.query("ROLLBACK");
        continue;
      }
      const lines = await client.query(
        `SELECT source, line_date, description, quantity, unit, unit_cents, amount_cents
         FROM invoice_lines WHERE invoice_id = $1 ORDER BY position, id`,
        [id]
      );
      const total = lines.rows.reduce((sum, line) => sum + line.amount_cents, 0);
      if (total <= 0) {
        await client.query("ROLLBACK");
        errors.push(`${row.recipient_name}: summa ei ole yli 0 €, ei lähetetty.`);
        continue;
      }

      // Numbers run per year without gaps; one sender at a time takes the next
      await client.query("SELECT pg_advisory_xact_lock(hashtext('invoice_number'))");
      const first = invoiceNumber(now.year, 0);
      const next = (
        await client.query(
          "SELECT coalesce(max(number), $1) + 1 AS next FROM invoices WHERE number BETWEEN $1 AND $2",
          [first, first + 9999]
        )
      ).rows[0].next as number;
      if (next > first + 9999) throw new Error("Vuoden laskunumerot loppuivat");
      const reference = referenceNumber(next);
      await client.query(
        `UPDATE invoices SET status = 'open', number = $2, reference = $3, issue_date = $4, due_date = $5,
           total_cents = $6, sent_at = NOW(), sent_by = $7
         WHERE id = $1`,
        [id, next, reference, issueDate, dueDate, total, access.user.id]
      );

      if (row.recipient_email) {
        const email = invoiceEmail(
          {
            id,
            userId: row.user_id,
            number: next,
            reference,
            title: row.title,
            message: row.message,
            recipientName: row.recipient_name,
            issueDate,
            dueDate,
            totalCents: total,
            lines: lines.rows.map((line) => ({
              source: line.source,
              lineDate: line.line_date ? DateTime.fromJSDate(line.line_date).toISODate() : null,
              description: line.description,
              quantity: Number(line.quantity),
              unit: line.unit,
              unitCents: line.unit_cents,
              amountCents: line.amount_cents,
            })),
          },
          settings
        );
        queued.push(
          await queueEmail(client, {
            purpose: "billing",
            kind: "invoice",
            to: { address: row.recipient_email, name: row.recipient_name },
            ...email,
            createdBy: access.user.id,
            invoiceId: id,
          })
        );
      } else {
        noEmail += 1;
      }
      await client.query("COMMIT");
      issued += 1;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error(`Error sending invoice ${id}:`, error);
      errors.push(error instanceof Error && error.message.startsWith("Vuoden") ? error.message : "Laskun lähetys epäonnistui.");
    } finally {
      client.release();
    }
  }

  const deliveries = await deliverEmails(queued);
  revalidateInvoices();
  const count = (status: string) => deliveries.filter((d) => d.status === status).length;
  return {
    status: "success",
    result: {
      issued,
      text:
        summary({ sent: count("sent"), held: count("held"), failed: count("failed"), noEmail }, errors) ||
        "Ei lähetettävää: laskut on jo lähetetty.",
    },
  };
}

const resendSchema = z.union([z.literal(""), z.email("Sähköpostiosoite ei kelpaa")]);

/** Sends an issued invoice again, as it was, to its recipient or another address */
export async function resendInvoice(
  id: number,
  address = ""
): Promise<ActionResult<{ text: string }>> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = resendSchema.safeParse(address.trim());
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };

  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice || invoice.status !== "open") {
    return { status: "error", error: "Vain avoimen laskun voi lähettää uudelleen" };
  }
  const to = (parsed.data || invoice.recipientEmail || "").toLowerCase();
  if (!to) return { status: "error", error: "Anna sähköpostiosoite" };

  const email = invoiceEmail(
    {
      id: invoice.id,
      userId: invoice.userId,
      number: invoice.number!,
      reference: invoice.reference!,
      title: invoice.title,
      message: invoice.message,
      recipientName: invoice.recipientName,
      issueDate: invoice.issueDate!,
      dueDate: invoice.dueDate!,
      totalCents: invoice.totalCents,
      lines: invoice.lines,
    },
    await getInvoiceSettings()
  );
  const outboxId = await queueEmail(pool, {
    purpose: "billing",
    kind: "invoice",
    to: { address: to, name: invoice.recipientName },
    ...email,
    createdBy: access.user.id,
    invoiceId: invoice.id,
  });
  const [delivery] = await deliverEmails([outboxId]);
  revalidateInvoices();
  if (delivery.status === "failed") return { status: "error", error: delivery.error ?? "Lähetys epäonnistui" };
  return {
    status: "success",
    result: {
      text: summary(
        { sent: delivery.status === "sent" ? 1 : 0, held: delivery.status === "held" ? 1 : 0, failed: 0, noEmail: 0 },
        []
      ),
    },
  };
}

/*
 * Payments and cancelling
 */

/**
 * Marks an invoice paid, or back to open. A period's invoice marks the
 * payer's flights Maksettu in the sheet too.
 */
export async function setInvoicePaid(id: number, paid: boolean): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  // A string "false" would be truthy here but false in SQL
  if (typeof paid !== "boolean") return { status: "error", error: "Virheellinen pyyntö" };
  const invoice = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!invoice || invoice.status !== (paid ? "open" : "paid")) {
    return { status: "error", error: paid ? "Vain avoimen laskun voi merkitä maksetuksi" : "Lasku ei ole maksettu" };
  }

  if (invoice.periodId !== null && invoice.payerKey !== null) {
    const failed = await writePayerPaid(invoice.periodId, invoice.payerKey, paid, access.user.id);
    if (failed) return { status: "error", error: failed.error };
    await syncFlightSheets(access.user.fullName || "laskuttaja", { wait: true });
  } else {
    await pool.query(
      `UPDATE invoices
       SET status = CASE WHEN $2 THEN 'paid' ELSE 'open' END,
           paid_at = CASE WHEN $2 THEN NOW() END, paid_by = CASE WHEN $2 THEN $3 END
       WHERE id = $1 AND status = $4`,
      [id, paid, access.user.id, paid ? "open" : "paid"]
    );
  }
  revalidateInvoices();
  return { status: "success", result: null };
}

const cancelSchema = z.string().trim().min(1, "Kerro, miksi lasku mitätöidään").max(300, "Syy on liian pitkä");

/**
 * Cancels an issued, unpaid invoice. Its number stays used. A period's
 * payer can then get a new invoice.
 */
export async function cancelInvoice(id: number, reason: string): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  if (!Number.isInteger(id)) return { status: "error", error: "Virheellinen pyyntö" };
  const parsed = cancelSchema.safeParse(reason);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  const updated = await pool.query(
    `UPDATE invoices SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $2, cancel_reason = $3
     WHERE id = $1 AND status = 'open'`,
    [id, access.user.id, parsed.data]
  );
  if (updated.rowCount === 0) return { status: "error", error: "Vain avoimen laskun voi mitätöidä" };
  revalidateInvoices();
  return { status: "success", result: null };
}

/*
 * Settings
 */

const settingsSchema = z.object({
  paymentTermDays: z.number().int().min(1, "Maksuaika vähintään 1 päivä").max(90, "Maksuaika enintään 90 päivää"),
  footer: z.string().trim().max(500, "Lopputeksti on liian pitkä"),
});

export async function saveInvoiceSettings(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  const access = await requireBillingAdmin();
  if ("error" in access) return { status: "error", error: access.error };
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: parsed.error.issues[0].message };
  await pool.query(
    `INSERT INTO flight_log_settings (key, value, updated_at, updated_by)
     VALUES ('invoice', $1, NOW(), $2)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [JSON.stringify(parsed.data), access.user.id]
  );
  revalidateInvoices();
  return { status: "success", result: null };
}
