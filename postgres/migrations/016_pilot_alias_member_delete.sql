-- Deleting a member removes their pilot-name matches, so the names are
-- undecided again and billing waits for the biller to match them. With
-- ON DELETE SET NULL the names became "no member" instead, billed under the
-- name at the non-member price without anyone deciding so.
ALTER TABLE pilot_aliases DROP CONSTRAINT IF EXISTS pilot_aliases_user_id_fkey;
ALTER TABLE pilot_aliases
  ADD CONSTRAINT pilot_aliases_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
