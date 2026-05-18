-- Migration: Add flight-specific fields to billable_items
-- Date: 2026-05-18
-- Description: Store Hobbs readings, flight type, airports, landings, and soft-delete
--              directly in the DB instead of only in Google Sheets.

ALTER TABLE billable_items
  ADD COLUMN hobbs_start    DECIMAL(8,1),
  ADD COLUMN hobbs_end      DECIMAL(8,1),
  ADD COLUMN flight_type    VARCHAR(20)
    CHECK (flight_type IS NULL OR flight_type IN (
      'training','solo','checkout','cross_country','local','maintenance','other'
    )),
  ADD COLUMN departure_icao VARCHAR(10),
  ADD COLUMN arrival_icao   VARCHAR(10),
  ADD COLUMN landings       SMALLINT,
  ADD COLUMN deleted_at     TIMESTAMP;

COMMENT ON COLUMN billable_items.hobbs_start    IS 'Hobbs meter reading at takeoff (flight entries only)';
COMMENT ON COLUMN billable_items.hobbs_end      IS 'Hobbs meter reading after landing (flight entries only)';
COMMENT ON COLUMN billable_items.flight_type    IS 'Flight category: training|solo|checkout|cross_country|local|maintenance|other';
COMMENT ON COLUMN billable_items.departure_icao IS 'Departure airfield ICAO/local code (e.g. EFSA)';
COMMENT ON COLUMN billable_items.arrival_icao   IS 'Arrival airfield ICAO/local code';
COMMENT ON COLUMN billable_items.landings       IS 'Number of landings during the flight';
COMMENT ON COLUMN billable_items.deleted_at     IS 'Soft-delete timestamp; NULL means active';

CREATE INDEX idx_billable_items_not_deleted ON billable_items(member_id, billable_type)
  WHERE deleted_at IS NULL;
