-- Migration: Number the account's sessions, so revoking them has no gap
-- Date: 2026-10-30
-- Description: users.session_version goes up by one whenever the sessions
--              are revoked (password change or reset, deactivation,
--              anonymisation). A session keeps the number it logged in with
--              and ends once the account's number differs. sessions_revoked_at
--              is compared in whole seconds, so a login in the same second as
--              a revocation survived it.
-- init/01-schema.sql already has the column.

-- A session with another number than this ends (nextjs/auth.ts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
