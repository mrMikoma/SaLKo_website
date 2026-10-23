-- Migration: End sessions when the password changes or the account is locked
-- Date: 2026-10-23
-- Description: users.sessions_revoked_at is set when a password is changed or
--              reset, and when an admin deactivates the account. Sessions
--              that logged in before it end, so a reset or a lock after a
--              compromise also logs out whoever had the account, and
--              restoring the account doesn't bring the old sessions back.
-- init/01-schema.sql already has the column.

-- Sessions that logged in before this end (nextjs/auth.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_revoked_at TIMESTAMPTZ;
