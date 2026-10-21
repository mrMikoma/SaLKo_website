-- Create users table
CREATE TABLE
  users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid (),
    roles TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[], -- Array of roles: 'admin', 'user', 'guest', etc.
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT, -- Optional for OAuth users
    address TEXT, -- Optional for OAuth users
    city TEXT, -- Optional for OAuth users
    postal_code TEXT, -- Optional for OAuth users
    email TEXT NOT NULL UNIQUE,
    password TEXT, -- Optional for OAuth users
    auth_provider TEXT DEFAULT 'credentials', -- 'credentials', 'google', or 'system'
    google_id TEXT UNIQUE,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    -- Set when an admin removes the user: no login, history (bookings) is kept
    deactivated_at TIMESTAMPTZ
  );

-- Create bullets table
CREATE TABLE
  bullets (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    date BIGINT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    -- Drafts are only visible in the admin; published_at is the date the
    -- public sees, set the first time the bulletin is published
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMPTZ,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Create bookings table
CREATE TABLE
  bookings (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id TEXT NOT NULL,
    plane TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    repeat_group_id TEXT, -- UUID to group repeating bookings together
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Performance indexes for bookings table
-- Primary composite index for plane + time-based queries
CREATE INDEX idx_bookings_plane_start_time ON bookings (plane, start_time);

-- Index for end_time to support range overlap queries
CREATE INDEX idx_bookings_plane_end_time ON bookings (plane, end_time);

-- Composite covering index for date range queries (most common pattern)
-- Supports: WHERE plane = ANY($1) AND start_time <= $2 AND end_time >= $3
CREATE INDEX idx_bookings_plane_start_end ON bookings (plane, start_time, end_time);

-- Index for user_id lookups (supports update/delete operations)
CREATE INDEX idx_bookings_user_id ON bookings (user_id);

-- Index for repeat_group_id to efficiently find and delete repeating bookings
CREATE INDEX idx_bookings_repeat_group_id ON bookings (repeat_group_id)
WHERE
  repeat_group_id IS NOT NULL;

-- Create guest_bookings table (for unauthenticated bookings)
CREATE TABLE
  guest_bookings (
    booking_id INT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
  );

-- Create indexes for guest bookings
CREATE INDEX idx_guest_bookings_email ON guest_bookings (contact_email);

-- NextAuth required tables
CREATE TABLE
  verification_tokens (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
  );

CREATE TABLE
  accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    UNIQUE (provider, provider_account_id)
  );

CREATE TABLE
  sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid (),
    session_token TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
  );

-- Create indexes for NextAuth tables
CREATE INDEX idx_accounts_user_id ON accounts (user_id);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- METAR Weather Data Table
-- Stores weather data from Aviation Weather Center API
CREATE TABLE
  IF NOT EXISTS metar_data (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(4) NOT NULL DEFAULT 'EFSA',
    raw_metar TEXT NOT NULL,
    temperature VARCHAR(10),
    wind_speed VARCHAR(20),
    wind_direction VARCHAR(10),
    visibility VARCHAR(20),
    clouds VARCHAR(50),
    qnh VARCHAR(20),
    observation_time TIMESTAMP,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_observation UNIQUE (station_code, observation_time)
  );

-- Indexes for METAR queries
CREATE INDEX IF NOT EXISTS idx_metar_station_fetched ON metar_data (station_code, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_metar_observation_time ON metar_data (observation_time DESC);

-- View for latest METAR
CREATE
OR REPLACE VIEW latest_metar AS
SELECT
  *
FROM
  metar_data
WHERE
  station_code = 'EFSA'
ORDER BY
  fetched_at DESC
LIMIT
  1;

-- METAR table comments
COMMENT ON TABLE metar_data IS 'Stores METAR weather data for airports';

COMMENT ON COLUMN metar_data.station_code IS 'ICAO airport code (e.g., EFSA)';

COMMENT ON COLUMN metar_data.raw_metar IS 'Raw METAR string from Aviation Weather Center API';

COMMENT ON COLUMN metar_data.observation_time IS 'Time of actual weather observation';

COMMENT ON COLUMN metar_data.fetched_at IS 'Time when data was fetched from API';

-- =============================================
-- Flight log (synced from the club's Google Sheet)
-- =============================================
-- The aircraft's paper journey log is the master record and the Google Sheet
-- is its digital copy, one tab per aircraft. The website writes flights into
-- the sheet and keeps sheet_flights in sync with it; flights are never edited
-- here directly. See nextjs/docs/FLIGHT_LOG.md.

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

-- Pilot names as written in the sheet ("T.Kuutti") matched to member accounts.
-- name_key is the name in lower case without spaces and dots, so "T. Kuutti"
-- and "t.kuutti" are the same pilot (nameKey() in utilities/flightSheetParser.ts).
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
  missing_since TIMESTAMPTZ,
  -- Hash of the typed-in fields only (not the running totals), so a status
  -- change can tell whether the flight changed after the biller saw it
  input_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_sheet_flights_aircraft_date
  ON sheet_flights (registration, flight_date) WHERE missing_since IS NULL;
CREATE INDEX IF NOT EXISTS idx_sheet_flights_pic_key ON sheet_flights (pic_key);
CREATE INDEX IF NOT EXISTS idx_sheet_flights_second_key ON sheet_flights (second_key);

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

-- Who changed a flight's Tila on the website, and when. The sheet keeps only
-- the current status.
CREATE TABLE IF NOT EXISTS flight_status_changes (
  id SERIAL PRIMARY KEY,
  flight_id UUID NOT NULL, -- sheet_flights.id; no foreign key, the row can leave the sheet
  registration TEXT NOT NULL,
  old_status TEXT, -- NULL = Kirjattu
  new_status TEXT,
  changed_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- What else happened, e.g. "Paperisivu 47, korjattu: lasku 11:03 → 11:05"
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_flight_status_changes_flight
  ON flight_status_changes (flight_id, changed_at DESC);

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

-- Hours per aircraft per year from before the flight log sheet, typed in on
-- /admin/tilastot. Years the sheet has are counted from its flights instead.
CREATE TABLE IF NOT EXISTS aircraft_year_totals (
  registration TEXT NOT NULL,
  year INT NOT NULL CHECK (year BETWEEN 1950 AND 2100),
  minutes INT NOT NULL CHECK (minutes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  PRIMARY KEY (registration, year)
);
