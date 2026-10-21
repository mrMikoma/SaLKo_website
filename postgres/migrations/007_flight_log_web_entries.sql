-- Migration: Flights entered on the website
-- Date: 2026-10-21
-- Description: Members can now enter flights on the site, which writes them
--              into the flight log sheet. This records who wrote which row.
-- init/01-schema.sql already has the table.

-- Flights members entered on the website: who wrote which sheet row, so they
-- can undo their own latest entry
CREATE TABLE IF NOT EXISTS flight_log_web_entries (
  id UUID PRIMARY KEY, -- the row's ID in the sheet
  user_id TEXT NOT NULL REFERENCES users (id),
  registration TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flight_log_web_entries_user
  ON flight_log_web_entries (user_id, created_at DESC);

-- Same grant as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_log_web_entries TO :app_user;
