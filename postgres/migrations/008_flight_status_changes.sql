-- Migration: Flight status changes
-- Date: 2026-10-21
-- Description: The biller marks flights checked on /admin/lennot, which writes
--              the Tila column of the sheet. This records who changed which
--              status and when, and adds a hash of each row's typed-in fields
--              so that a mark is refused when the row changed after the biller
--              saw it.
-- init/01-schema.sql already has these.

-- Filled in by the next sync
ALTER TABLE sheet_flights ADD COLUMN IF NOT EXISTS input_hash TEXT;

-- Who changed a flight's Tila on the website, and when. The sheet keeps only
-- the current status.
CREATE TABLE IF NOT EXISTS flight_status_changes (
  id SERIAL PRIMARY KEY,
  flight_id UUID NOT NULL, -- sheet_flights.id; no foreign key, the row can leave the sheet
  registration TEXT NOT NULL,
  old_status TEXT, -- NULL = Kirjattu
  new_status TEXT,
  changed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flight_status_changes_flight
  ON flight_status_changes (flight_id, changed_at DESC);

-- Same grants as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_status_changes TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE flight_status_changes_id_seq TO :app_user;
