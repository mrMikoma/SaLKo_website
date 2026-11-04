-- Migration: Aircraft prices per hour, and OH-386 in the flight log
-- Date: 2026-11-02
-- Description: Aircraft are priced per hour and billed by the minute
--              (minutes × price / 60, to the cent). OH-386's 100 / 200 €/h
--              isn't whole cents a minute, so cents per minute couldn't hold
--              it. Existing prices and billed lines are multiplied by 60:
--              OH-CON's 3,10 / 5,00 €/min become 186 / 300 €/h and bill the
--              same. OH-386 gets its tab and the price list's 100 / 200 €/h,
--              with the same 30-minute minimum as OH-CON.
--              aircraft_sheets.sort_order keeps OH-CON first in the lists,
--              where "OH-386" would otherwise sort before it.
-- init/01-schema.sql already has the new columns and both aircraft, so the
-- renames only run where the old columns are.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'aircraft_rates' AND column_name = 'cents_with_fee'
  ) THEN
    ALTER TABLE aircraft_rates RENAME COLUMN cents_with_fee TO cents_per_hour_with_fee;
    ALTER TABLE aircraft_rates RENAME COLUMN cents_without_fee TO cents_per_hour_without_fee;
    ALTER TABLE aircraft_rates
      RENAME CONSTRAINT aircraft_rates_cents_with_fee_check TO aircraft_rates_cents_per_hour_with_fee_check;
    ALTER TABLE aircraft_rates
      RENAME CONSTRAINT aircraft_rates_cents_without_fee_check TO aircraft_rates_cents_per_hour_without_fee_check;
    UPDATE aircraft_rates
    SET cents_per_hour_with_fee = cents_per_hour_with_fee * 60,
        cents_per_hour_without_fee = cents_per_hour_without_fee * 60;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'billing_lines' AND column_name = 'cents_per_minute'
  ) THEN
    ALTER TABLE billing_lines RENAME COLUMN cents_per_minute TO cents_per_hour;
    UPDATE billing_lines SET cents_per_hour = cents_per_hour * 60 WHERE cents_per_hour IS NOT NULL;
  END IF;
END $$;

ALTER TABLE aircraft_sheets ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100;
UPDATE aircraft_sheets SET sort_order = 10 WHERE registration = 'OH-CON' AND sort_order = 100;

INSERT INTO aircraft_sheets (registration, sheet_name, sort_order)
VALUES ('OH-386', 'OH-386 Matkapäiväkirja', 20)
ON CONFLICT (registration) DO NOTHING;

INSERT INTO aircraft_rates (registration, valid_from, cents_per_hour_with_fee, cents_per_hour_without_fee, minimum_local_minutes)
VALUES ('OH-386', '2000-01-01', 10000, 20000, 30)
ON CONFLICT DO NOTHING;
