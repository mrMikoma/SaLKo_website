-- Migration: Bulletins by email
-- Date: 2026-11-08
-- Description: An admin can send a published bulletin to the members by email.
--              users.bulletin_emails is the member's own choice (on by
--              default, switched off on the profile page); bullets.emailed_at
--              is when it was first sent; email_outbox.bulletin_id ties each
--              message to its bulletin, so sending again only reaches those
--              who did not get it.
-- init/01-schema.sql already has the columns.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bulletin_emails BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bullets ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ;
ALTER TABLE email_outbox ADD COLUMN IF NOT EXISTS bulletin_id INT REFERENCES bullets (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_email_outbox_bulletin ON email_outbox (bulletin_id);
