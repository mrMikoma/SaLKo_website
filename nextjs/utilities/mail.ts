import "server-only";

import { google } from "googleapis";
import connectionPool from "@/utilities/db";
import { buildMime, Mailbox } from "@/utilities/mime";
import {
  describeMailError,
  getSender,
  gmailClient,
  mailMode,
  MailConfigError,
  MessageContent,
  redirectAddress,
  redirected,
  Sender,
  SenderKey,
} from "@/utilities/mailConfig";

/**
 * Sending email through the club's Google Workspace (docs/MAIL_SETUP.md).
 * A message is first stored in email_outbox, usually in the same transaction
 * as whatever it is about, and then delivered. Delivery claims the row first,
 * so a double click or two treasurers at once can't send it twice. Callers
 * check permissions; this module doesn't.
 */

type Queryable = { query: NonNullable<typeof connectionPool>["query"] };
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export interface OutgoingEmail {
  sender: SenderKey;
  kind: string; // "test", "invoice", ...
  to: Mailbox;
  subject: string;
  text: string;
  html?: string | null;
  createdBy?: string | null;
}

/** Stores a message to send; deliverEmails sends it */
export async function queueEmail(db: Queryable, email: OutgoingEmail): Promise<number> {
  const response = await db.query(
    `INSERT INTO email_outbox (sender, kind, to_address, to_name, subject, body_text, body_html, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      email.sender,
      email.kind,
      email.to.address,
      email.to.name ?? null,
      email.subject,
      email.text,
      email.html ?? null,
      email.createdBy ?? null,
    ]
  );
  return response.rows[0].id;
}

// One OAuth client per sender and token; it keeps its access token between sends
const clients = new Map<string, OAuth2Client>();

function oauthFor(sender: Sender): OAuth2Client {
  const { clientId, clientSecret } = gmailClient();
  if (!clientId || !clientSecret || !sender.refreshToken) {
    throw new MailConfigError(
      `Sähköpostin lähetystä osoitteesta ${sender.address} ei ole määritetty (docs/MAIL_SETUP.md).`
    );
  }
  const key = `${sender.key}:${clientId}:${sender.refreshToken}`;
  let client = clients.get(key);
  if (!client) {
    client = new google.auth.OAuth2(clientId, clientSecret);
    client.setCredentials({ refresh_token: sender.refreshToken });
    clients.set(key, client);
  }
  return client;
}

/** Sends raw MIME as the sender's mailbox; returns Gmail's message id */
async function sendWithGmail(sender: Sender, mime: string): Promise<string | null> {
  const gmail = google.gmail({ version: "v1", auth: oauthFor(sender) });
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
     RETURNING sender, to_address, to_name, subject, body_text, body_html`,
    [id]
  );
  const row = claimed.rows[0];
  if (!row) return { id, status: "skipped" };

  const mode = mailMode();
  if (mode === "off") {
    await connectionPool.query("UPDATE email_outbox SET status = 'held' WHERE id = $1", [id]);
    return { id, status: "held" };
  }

  let senderAddress = "";
  try {
    const sender = getSender(row.sender);
    senderAddress = sender.address;
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
      sender,
      buildMime({ from: { address: sender.address, name: sender.name }, ...message })
    );
    await connectionPool.query(
      `UPDATE email_outbox SET status = 'sent', sent_at = NOW(), delivered_to = $2, provider_id = $3
       WHERE id = $1`,
      [id, message.to.address, providerId]
    );
    return { id, status: "sent" };
  } catch (error) {
    const text = describeMailError(error, senderAddress);
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
