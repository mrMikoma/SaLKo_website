-- Migration: Email outbox
-- Date: 2026-10-23
-- Description: The website sends email (first, bills) through the club's
--              Google Workspace. Each message is stored before it goes out.
-- init/01-schema.sql already has the table.

-- Email the website sends (nextjs/utilities/mail.ts). Each message is stored
-- before it goes out, so a failure shows and can be retried, and a message is
-- never sent twice.
CREATE TABLE IF NOT EXISTS email_outbox (
  id SERIAL PRIMARY KEY,
  sender TEXT NOT NULL, -- the mailbox it goes from: a key of SENDERS in utilities/mail.ts
  kind TEXT NOT NULL, -- what it is: 'test', 'invoice', ...
  to_address TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  -- held: MAIL_MODE was off, so the message was only stored here
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'held')),
  attempts INT NOT NULL DEFAULT 0,
  attempted_at TIMESTAMPTZ,
  last_error TEXT,
  -- The address it went to: the recipient's, or in the dev environment the
  -- address all mail is redirected to
  delivered_to TEXT,
  provider_id TEXT, -- Gmail's message id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_outbox (created_at DESC);

-- Same grants as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON email_outbox TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE email_outbox_id_seq TO :app_user;
