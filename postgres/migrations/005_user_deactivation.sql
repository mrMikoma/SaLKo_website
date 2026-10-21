-- Migration: Deactivate users instead of deleting them, and lowercase emails
-- Date: 2026-10-20
-- Description: "Poista käytöstä" sets deactivated_at, which blocks login but
--              keeps the user's bookings and bulletins. Logins and duplicate
--              checks now compare emails in lower case, so stored emails are
--              lowercased too (except where that would clash with another row).
-- init/01-schema.sql already has users.deactivated_at.

ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

UPDATE users u
SET email = lower(u.email)
WHERE u.email <> lower(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM users other WHERE other.id <> u.id AND lower(other.email) = lower(u.email)
  );
