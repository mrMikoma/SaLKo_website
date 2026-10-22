-- Migration: Oil in quarts
-- Date: 2026-10-21
-- Description: The flight log's Öljy column holds quarts (1/4 US gallon), as
--              oil is added; fuel stays in litres. The column is renamed to
--              say so. init/01-schema.sql already has oil_quarts.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sheet_flights' AND column_name = 'oil_litres'
  ) THEN
    ALTER TABLE sheet_flights RENAME COLUMN oil_litres TO oil_quarts;
  END IF;
END $$;
