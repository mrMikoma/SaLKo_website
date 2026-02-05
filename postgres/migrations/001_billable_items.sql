-- Migration: Create billable_items table with supporting enums
-- Date: 2026-01-21
-- Description: Flight hour logging and billing system tables
-- Note: Aircraft data is sourced from nextjs/data/planes.json and prices.json

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
