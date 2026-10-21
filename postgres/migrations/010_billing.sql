-- Migration: Billing
-- Date: 2026-10-21
-- Description: Billing periods from the flight log: per-minute prices per
--              aircraft, who paid the equipment fee each season, the free-hour
--              setting, and what each closed period billed to whom.
-- init/01-schema.sql already has these.

-- Billing (nextjs/docs/FLIGHT_LOG.md, "Billing")

-- Per-minute prices per aircraft, from a date on. A local flight shorter than
-- minimum_local_minutes is billed that long (0 = no minimum).
CREATE TABLE IF NOT EXISTS aircraft_rates (
  registration TEXT NOT NULL,
  valid_from DATE NOT NULL,
  cents_with_fee INT NOT NULL CHECK (cents_with_fee >= 0),
  cents_without_fee INT NOT NULL CHECK (cents_without_fee >= 0),
  minimum_local_minutes INT NOT NULL DEFAULT 0 CHECK (minimum_local_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (registration, valid_from)
);

INSERT INTO aircraft_rates (registration, valid_from, cents_with_fee, cents_without_fee, minimum_local_minutes)
VALUES ('OH-CON', '2000-01-01', 310, 500, 30)
ON CONFLICT DO NOTHING;

-- Members who paid a season's equipment fee (kalustomaksu): they fly at the
-- lower price and earn the free hour
CREATE TABLE IF NOT EXISTS equipment_fee_seasons (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  season INT NOT NULL CHECK (season BETWEEN 2000 AND 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, season)
);

-- Flight log settings the biller changes on the site
CREATE TABLE IF NOT EXISTS flight_log_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL
);

INSERT INTO flight_log_settings (key, value)
VALUES ('free_hour', '{"enabled": true, "aircraft": ["OH-CON"], "paidMinutes": 600, "freeMinutes": 60}')
ON CONFLICT (key) DO NOTHING;

-- Billing periods; the name is also written into the sheet's Laskutusjakso
CREATE TABLE IF NOT EXISTS billing_periods (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  closed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  CHECK (ends_on >= starts_on),
  CONSTRAINT billing_periods_no_overlap EXCLUDE USING gist (daterange(starts_on, ends_on, '[]') WITH &&)
);

-- What a closed period billed, per payer
CREATE TABLE IF NOT EXISTS billing_payers (
  period_id INT NOT NULL REFERENCES billing_periods (id) ON DELETE CASCADE,
  payer_key TEXT NOT NULL, -- "user:<id>", or "name:<name key>" for a non-member
  payer_name TEXT NOT NULL,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  total_cents INT NOT NULL,
  paid_at TIMESTAMPTZ,
  paid_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (period_id, payer_key)
);

-- The lines of a closed period as billed. "unbilled" records a flight nobody
-- pays for, so the period still accounts for it.
CREATE TABLE IF NOT EXISTS billing_lines (
  id SERIAL PRIMARY KEY,
  period_id INT NOT NULL REFERENCES billing_periods (id) ON DELETE CASCADE,
  payer_key TEXT, -- NULL on unbilled lines
  kind TEXT NOT NULL CHECK (kind IN ('flight', 'minimum', 'credit', 'adjustment', 'unbilled')),
  flight_id UUID, -- sheet_flights.id; no foreign key, the row can leave the sheet
  registration TEXT,
  flight_date DATE,
  purpose_code TEXT,
  minutes INT NOT NULL DEFAULT 0,
  landings INT NOT NULL DEFAULT 0,
  cents_per_minute INT,
  amount_cents INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  -- The flight as billed (sheet_flights.input_hash), to spot later changes
  input_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_lines_period ON billing_lines (period_id, payer_key);
CREATE INDEX IF NOT EXISTS idx_billing_lines_flight ON billing_lines (flight_id);

-- Same grants as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_rates TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_fee_seasons TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON flight_log_settings TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_periods TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_payers TO :app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_lines TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE billing_periods_id_seq TO :app_user;
GRANT USAGE, SELECT ON SEQUENCE billing_lines_id_seq TO :app_user;
