-- Migration: Flight log synced from the club's Google Sheet
-- Date: 2026-10-20
-- Description: Replaces billable_items (migrations 002 and 003, never used in
--              production) with a read-only copy of the flight log sheet, the
--              purpose codes, the aircraft-to-tab mapping and pilot names.
-- init/01-schema.sql already has all of this.

DROP TABLE IF EXISTS billable_items;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TYPE IF EXISTS billable_type;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS billing_period;

-- Purpose codes of the sheet's "Lennon tarkoitus" column
CREATE TABLE IF NOT EXISTS flight_purposes (
  code TEXT PRIMARY KEY,
  name_fi TEXT NOT NULL,
  -- Who pays for the flight: the PIC, the student (Oppilas / SIC) or nobody
  payer TEXT NOT NULL CHECK (payer IN ('pic', 'student', 'none')),
  is_training BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO flight_purposes (code, name_fi, payer, is_training, sort_order) VALUES
  ('HAR', 'Harrastuslento', 'pic', FALSE, 10),
  ('MAT', 'Matkalento', 'pic', FALSE, 20),
  ('KOU', 'Koululento', 'student', TRUE, 30),
  ('KOUMAT', 'Koulumatkalento', 'student', TRUE, 31),
  ('KOUHAR', 'Kouluharrastuslento', 'student', TRUE, 32),
  ('TAR', 'Tarkastuslento', 'pic', FALSE, 40),
  ('ESI', 'Esittelylento', 'none', FALSE, 50),
  ('SII', 'Siirtolento', 'none', FALSE, 60),
  ('KOE', 'Koelento', 'none', FALSE, 70),
  ('PALO', 'Palolento', 'none', FALSE, 80),
  ('PALOHAR', 'Palolentoharjoitus', 'none', FALSE, 81),
  ('SAR', 'Etsintälento', 'none', FALSE, 90),
  ('SARHAR', 'Etsintälentoharjoitus', 'none', FALSE, 91),
  ('HIN', 'Hinauslento', 'none', FALSE, 100),
  ('LAS', 'Laskuvarjolento', 'pic', FALSE, 110)
ON CONFLICT (code) DO NOTHING;

-- Which tab of the flight log spreadsheet belongs to which aircraft
CREATE TABLE IF NOT EXISTS aircraft_sheets (
  registration TEXT PRIMARY KEY,
  sheet_name TEXT NOT NULL UNIQUE,
  -- Google's numeric tab id, for links into the sheet; the sync fills it in
  sheet_gid BIGINT,
  -- First flight row: row 1 has the headers and row 2 the opening totals
  first_data_row INT NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO aircraft_sheets (registration, sheet_name)
VALUES ('OH-CON', 'OH-CON Matkapäiväkirja')
ON CONFLICT (registration) DO NOTHING;

-- Pilot names as written in the sheet ("M.Meikäläinen") matched to member accounts.
-- name_key is the name in lower case without spaces and dots, so "M. Meikäläinen"
-- and "m.meikäläinen" are the same pilot (nameKey() in utilities/flightSheetParser.ts).
CREATE TABLE IF NOT EXISTS pilot_aliases (
  name_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pilot_aliases_user ON pilot_aliases (user_id);

-- The synced copy, one row per flight row of the sheet
CREATE TABLE IF NOT EXISTS sheet_flights (
  id UUID PRIMARY KEY, -- the sheet's ID column
  registration TEXT NOT NULL,
  sheet_row INT NOT NULL,
  flight_date DATE NOT NULL,
  pic_name TEXT NOT NULL,
  pic_key TEXT NOT NULL,
  second_name TEXT,
  second_key TEXT,
  persons_on_board SMALLINT,
  departure TEXT,
  arrival TEXT,
  takeoff_at TIMESTAMPTZ,
  landing_at TIMESTAMPTZ,
  airborne_minutes INT,
  airframe_minutes INT,
  landings INT,
  total_landings INT,
  purpose_code TEXT,
  fuel_litres NUMERIC(8, 2),
  oil_litres NUMERIC(6, 2),
  hour_meter NUMERIC(9, 1),
  remarks TEXT,
  log_page TEXT,
  book_total TEXT,
  book_error TEXT,
  maintenance TEXT,
  source TEXT,
  status TEXT,
  billing_period TEXT,
  raw JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Set when the row is no longer in the sheet
  missing_since TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sheet_flights_aircraft_date
  ON sheet_flights (registration, flight_date) WHERE missing_since IS NULL;
CREATE INDEX IF NOT EXISTS idx_sheet_flights_pic_key ON sheet_flights (pic_key);
CREATE INDEX IF NOT EXISTS idx_sheet_flights_second_key ON sheet_flights (second_key);

-- Problems the sync found in the sheet, recomputed on every sync
CREATE TABLE IF NOT EXISTS sheet_flight_issues (
  id SERIAL PRIMARY KEY,
  registration TEXT NOT NULL,
  sheet_row INT NOT NULL,
  flight_id UUID,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_flight_issues_aircraft
  ON sheet_flight_issues (registration, sheet_row);

CREATE TABLE IF NOT EXISTS sheet_sync_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  triggered_by TEXT NOT NULL,
  rows_read INT,
  rows_changed INT,
  ids_assigned INT,
  issues INT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sheet_sync_runs_started ON sheet_sync_runs (started_at DESC);

-- Same grants as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_purposes TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_sheets TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON pilot_aliases TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_flights TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_flight_issues TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON sheet_sync_runs TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE sheet_flight_issues_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE sheet_sync_runs_id_seq TO :app_user;
