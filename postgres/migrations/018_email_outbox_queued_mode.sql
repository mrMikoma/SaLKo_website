-- Migration: Remember the mail mode a message was stored in
-- Date: 2026-10-31
-- Description: email_outbox.queued_mode is MAIL_MODE when the message was
--              stored. A message is only sent in that same mode, so one that
--              failed while mail went to the dev address, or was stored while
--              mail was off, never goes to the real recipient later. Older
--              rows have no mode and are not sent again.
-- init/01-schema.sql already has the column.

ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS queued_mode TEXT
  CHECK (queued_mode IN ('off', 'redirect', 'send'));
