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
    created_at TIMESTAMPTZ DEFAULT NOW ()
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
-- Flight Logging & Billing System
-- =============================================
-- Note: Aircraft data (planes and prices) is stored in JSON files
-- at nextjs/data/planes.json and nextjs/data/prices.json
-- This ensures a single source of truth for aircraft information

-- Types of billable items
CREATE TYPE billable_type AS ENUM (
  'flight',
  'membership',
  'hangar',
  'instruction',
  'other'
);

-- Payment status workflow
CREATE TYPE payment_status AS ENUM (
  'recorded',    -- Initial entry (auto for flights)
  'checked',     -- Verified against paper logbook
  'invoiced',    -- Invoice sent
  'paid'         -- Payment received
);

-- Billing period types
CREATE TYPE billing_period AS ENUM (
  'one_time',
  'monthly',
  'quarterly',
  'yearly'
);

-- Main billable items table
CREATE TABLE billable_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identification
  billable_type billable_type NOT NULL,
  member_id TEXT NOT NULL REFERENCES users(id),

  -- External reference (for flights: links to Google Sheet log_id)
  external_ref VARCHAR(100),

  -- Description
  description VARCHAR(255) NOT NULL,

  -- Billing details
  billing_period billing_period NOT NULL DEFAULT 'one_time',
  period_start DATE,
  period_end DATE,

  -- Financials
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_label VARCHAR(50),  -- 'minutes', 'hours', 'months', 'year'
  total_price DECIMAL(10,2) NOT NULL,

  -- Payment workflow
  payment_status payment_status NOT NULL DEFAULT 'recorded',
  checked_at TIMESTAMP,
  checked_by TEXT REFERENCES users(id),
  invoiced_at TIMESTAMP,
  invoiced_by TEXT REFERENCES users(id),
  invoice_ref VARCHAR(100),
  paid_at TIMESTAMP,
  paid_marked_by TEXT REFERENCES users(id),

  -- Aircraft registration (for flights) - references planes.json
  aircraft_registration VARCHAR(10),

  -- Metadata
  item_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_billable_items_type ON billable_items(billable_type);
CREATE INDEX idx_billable_items_status ON billable_items(payment_status);
CREATE INDEX idx_billable_items_member ON billable_items(member_id);
CREATE INDEX idx_billable_items_external_ref ON billable_items(external_ref);
CREATE INDEX idx_billable_items_date ON billable_items(item_date);
CREATE INDEX idx_billable_items_aircraft ON billable_items(aircraft_registration)
  WHERE aircraft_registration IS NOT NULL;

-- Unique constraint on external_ref when present
CREATE UNIQUE INDEX idx_billable_items_unique_external_ref
  ON billable_items(external_ref)
  WHERE external_ref IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_billable_items_updated_at
  BEFORE UPDATE ON billable_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE billable_items IS 'All billable items: flights, memberships, hangar fees, etc.';
COMMENT ON COLUMN billable_items.external_ref IS 'Links to Google Sheet log_id for flights';
COMMENT ON COLUMN billable_items.aircraft_registration IS 'Aircraft registration (e.g., OH-CON) - references planes.json';