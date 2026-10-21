-- Migration: Yearly totals from before the flight log
-- Date: 2026-10-21
-- Description: Statistics show hours per aircraft per year. The flight log
--              sheet covers recent years; earlier ones are typed in.
-- init/01-schema.sql already has the table.

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

-- Same grant as init/05-grant-app-permissions.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON aircraft_year_totals TO :app_user;
