-- Migration: Notes on flight review changes
-- Date: 2026-10-21
-- Description: Bulk entry from the paper book confirms or corrects flights
--              that pilots entered. The service account writes the sheet, so
--              the sheet's own history can't say who changed what; this note
--              keeps the page number and the corrected fields.
-- init/01-schema.sql already has the column.

ALTER TABLE flight_status_changes ADD COLUMN IF NOT EXISTS note TEXT;
