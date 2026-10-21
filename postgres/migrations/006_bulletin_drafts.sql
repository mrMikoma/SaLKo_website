-- Migration: Draft and publish steps for bulletins
-- Date: 2026-10-21
-- Description: bullets.status ('draft' or 'published') and published_at, the
--              date the public sees. Every existing bulletin was already
--              public, so they become published with their original date;
--              new bulletins start as drafts.
-- init/01-schema.sql already has both columns.

ALTER TABLE bullets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE bullets ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE bullets SET published_at = to_timestamp(date)
WHERE status = 'published' AND published_at IS NULL;

ALTER TABLE bullets ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  ALTER TABLE bullets ADD CONSTRAINT bullets_status_check
    CHECK (status IN ('draft', 'published'));
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
