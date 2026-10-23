import "server-only";

import { google } from "googleapis";
import connectionPool from "@/utilities/db";
import { buildMime, Mailbox } from "@/utilities/mime";
import {
  describeMailError,
  MAIL_PURPOSES,
  mailAccount,
  mailMode,
  MailConfigError,
  MailPurpose,
  MessageContent,
  redirectAddress,
  redirected,
} from "@/utilities/mailConfig";

/**
 * Sending email from the club's one Google Workspace mail account
 * (docs/MAIL_SETUP.md). A message is first stored in email_outbox, usually
 * in the same transaction as whatever it is about, and then delivered.
 * Delivery claims the row first, so a double click or two treasurers at once
 * can't send it twice. Callers check permissions; this module doesn't.
 */

type Queryable = { query: NonNullable<typeof connectionPool>["query"] };
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export interface OutgoingEmail {
  purpose: MailPurpose; // sets the sender's name and where replies go
  kind: string; // "test", "invoice", ...
  to: Mailbox;
  subject: string;
  text: string;
  html?: string | null;
  createdBy?: string | null;
  invoiceId?: number | null; // the invoice it sends
}

/** Stores a message to send; deliverEmails sends it */
export async function queueEmail(db: Queryable, email: OutgoingEmail): Promise<number> {
  const purpose = MAIL_PURPOSES[email.purpose];
  const response = await db.query(
    `INSERT INTO email_outbox (from_name, reply_to, kind, to_address, to_name, subject, body_text, body_html, created_by, invoice_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      purpose.name,
      purpose.replyTo,
      email.kind,
      email.to.address,
      email.to.name ?? null,
      email.subject,
      email.text,
      email.html ?? null,
      email.createdBy ?? null,
      email.invoiceId ?? null,
    ]
  );
  return response.rows[0].id;
}

// The OAuth client for the account's token; it keeps its access token between sends
let cached: { key: string; client: OAuth2Client } | null = null;

function accountClient(): { address: string; client: OAuth2Client } {
  const account = mailAccount();
  if (!account.address || !account.refreshToken || !account.clientId || !account.clientSecret) {
    throw new MailConfigError("Kerhon sähköpostitiliä ei ole määritetty (docs/MAIL_SETUP.md).");
  }
  const key = `${account.clientId}:${account.refreshToken}`;
  if (cached?.key !== key) {
    const client = new google.auth.OAuth2(account.clientId, account.clientSecret);
    client.setCredentials({ refresh_token: account.refreshToken });
    cached = { key, client };
  }
  return { address: account.address, client: cached.client };
}

/** Sends raw MIME as the account; returns Gmail's message id */
async function sendWithGmail(client: OAuth2Client, mime: string): Promise<string | null> {
  const gmail = google.gmail({ version: "v1", auth: client });
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: Buffer.from(mime).toString("base64url") },
  });
  return response.data.id ?? null;
}

export type DeliveryStatus = "sent" | "held" | "failed" | "skipped";

export interface Delivery {
  id: number;
  status: DeliveryStatus;
  error?: string;
}

/**
 * Sends one stored message, unless it is already sent or being sent (a send
 * that has hung for ten minutes may be tried again). With MAIL_MODE off the
 * message is only marked held.
 */
async function deliverOne(id: number): Promise<Delivery> {
  const claimed = await connectionPool.query(
    `UPDATE email_outbox
     SET status = 'sending', attempts = attempts + 1, attempted_at = NOW(), last_error = NULL
     WHERE id = $1
       AND (status IN ('queued', 'failed')
            OR (status = 'sending' AND attempted_at < NOW() - INTERVAL '10 minutes'))
     RETURNING from_name, reply_to, to_address, to_name, subject, body_text, body_html`,
    [id]
  );
  const row = claimed.rows[0];
  if (!row) return { id, status: "skipped" };

  const mode = mailMode();
  if (mode === "off") {
    await connectionPool.query("UPDATE email_outbox SET status = 'held' WHERE id = $1", [id]);
    return { id, status: "held" };
  }

  try {
    const account = accountClient();
    let message: MessageContent = {
      to: { address: row.to_address, name: row.to_name },
      subject: row.subject,
      text: row.body_text,
      html: row.body_html,
    };
    if (mode === "redirect") {
      message = redirected(message, redirectAddress()!);
    }
    const providerId = await sendWithGmail(
      account.client,
      buildMime({
        from: { address: account.address, name: row.from_name },
        replyTo: row.reply_to ? { address: row.reply_to } : undefined,
        ...message,
      })
    );
    await connectionPool.query(
      `UPDATE email_outbox SET status = 'sent', sent_at = NOW(), delivered_to = $2, provider_id = $3
       WHERE id = $1`,
      [id, message.to.address, providerId]
    );
    return { id, status: "sent" };
  } catch (error) {
    const text = describeMailError(error, mailAccount().address);
    // Only the message: a Google error object also carries the request
    console.error(`Email ${id} was not sent:`, (error as Error)?.message ?? error);
    await connectionPool.query(
      "UPDATE email_outbox SET status = 'failed', last_error = $2 WHERE id = $1",
      [id, text]
    );
    return { id, status: "failed", error: text };
  }
}

/** Sends stored messages one at a time, in the order given */
export async function deliverEmails(ids: number[]): Promise<Delivery[]> {
  const results: Delivery[] = [];
  for (const id of ids) {
    results.push(await deliverOne(id));
  }
  return results;
}
