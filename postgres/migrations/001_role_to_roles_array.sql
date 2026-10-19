-- Migration: Convert users.role (TEXT) to users.roles (TEXT[]) for multi-role support
-- Apply before deploying the application code that reads users.roles.
-- init/01-schema.sql already creates users.roles.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Copy the single role into the array while the old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE users SET roles = ARRAY[role]::TEXT[] WHERE roles IS NULL AND role IS NOT NULL;
  END IF;
END
$$;

-- Users without any role (shouldn't happen, but just in case)
UPDATE users SET roles = ARRAY['user']::TEXT[] WHERE roles IS NULL;

ALTER TABLE users ALTER COLUMN roles SET NOT NULL;
ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['user']::TEXT[];

ALTER TABLE users DROP COLUMN IF EXISTS role;
