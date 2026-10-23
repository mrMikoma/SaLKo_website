import "server-only";

import connectionPool from "@/utilities/db";
import {
  getSender,
  isSenderConfigured,
  mailMode,
  MailMode,
  redirectAddress,
  SENDER_KEYS,
  SenderKey,
} from "@/utilities/mailConfig";

/** Reads for the admin's mail pages; the pages check permissions first */

export interface OutboxMessage {
  id: number;
  sender: string;
  kind: string;
  toAddress: string;
  toName: string | null;
  subject: string;
  bodyText: string;
  status: "queued" | "sending" | "sent" | "failed" | "held";
  attempts: number;
  lastError: string | null;
  deliveredTo: string | null;
  createdAt: string;
  createdByName: string | null;
  sentAt: string | null;
}

export interface MailOverview {
  mode: MailMode;
  redirectTo: string | null;
  senders: { key: SenderKey; address: string; configured: boolean }[];
}

export function getMailOverview(): MailOverview {
  return {
    mode: mailMode(),
    redirectTo: redirectAddress(),
    senders: SENDER_KEYS.map((key) => ({
      key,
      address: getSender(key).address,
      configured: isSenderConfigured(key),
    })),
  };
}

const iso = (value: Date | null) => (value ? value.toISOString() : null);

/** The latest messages, newest first */
export async function getOutbox(limit = 100): Promise<OutboxMessage[]> {
  const response = await connectionPool.query(
    `SELECT o.*, u.full_name AS created_by_name
     FROM email_outbox o LEFT JOIN users u ON u.id = o.created_by
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $1`,
    [limit]
  );
  return response.rows.map((row) => ({
    id: row.id,
    sender: row.sender,
    kind: row.kind,
    toAddress: row.to_address,
    toName: row.to_name,
    subject: row.subject,
    bodyText: row.body_text,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    deliveredTo: row.delivered_to,
    createdAt: iso(row.created_at)!,
    createdByName: row.created_by_name ?? null,
    sentAt: iso(row.sent_at),
  }));
}
