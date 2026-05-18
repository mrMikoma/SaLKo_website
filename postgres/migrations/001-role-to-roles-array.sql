-- Migration: Convert 'role' TEXT column to 'roles' TEXT[] array
-- Run this on existing databases to migrate from single role to multi-role support
--
-- IMPORTANT: This migration is REQUIRED for the multi-role feature to work.
-- Run this migration BEFORE deploying the updated application code.

-- Step 1: Drop the constraint on the role column (if exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add the new roles column as TEXT array
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Step 3: Copy existing role values to the new roles array
UPDATE users SET roles = ARRAY[role]::TEXT[] WHERE roles IS NULL AND role IS NOT NULL;

-- Step 4: Set default for users without any role (shouldn't happen, but just in case)
UPDATE users SET roles = ARRAY['user']::TEXT[] WHERE roles IS NULL;

-- Step 5: Make roles NOT NULL and set default
ALTER TABLE users ALTER COLUMN roles SET NOT NULL;
ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['user']::TEXT[];

-- Step 6: Drop the old role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Verify the migration
SELECT id, name, email, roles FROM users LIMIT 10;

Eu sit enim ut nisi aliquip laboris esse culpa do dolor. Exercitation pariatur duis nostrud nulla deserunt reprehenderit nisi nostrud consequat. Occaecat velit amet exercitation ad in esse adipisicing minim ex quis exercitation mollit. Incididunt sint occaecat commodo pariatur. Laborum aute Lorem id velit nostrud esse non sit aute dolore reprehenderit veniam. Ex adipisicing officia tempor non Lorem.

Amet nulla id excepteur nulla incididunt. Id dolor sint aute quis laboris ad sit commodo sit. Quis aliquip est sint occaecat. Magna aliqua fugiat est ea sunt. Aliqua ut laborum sunt laborum consectetur laboris elit quis. Commodo sunt culpa consectetur ad voluptate voluptate mollit.

Qui commodo aliquip nisi quis ullamco reprehenderit laboris dolore labore ipsum. Tempor nisi quis officia voluptate deserunt culpa quis Lorem. Sunt deserunt anim enim laborum. Occaecat anim irure commodo ex sint officia enim duis sint tempor consectetur nostrud pariatur. Et proident occaecat consectetur aliqua fugiat quis irure occaecat enim incididunt sunt tempor occaecat magna.

Excepteur laboris do sunt sunt cupidatat adipisicing voluptate ex occaecat anim nostrud. Enim fugiat laborum nisi eiusmod aliqua et ea laborum ullamco aute et excepteur. Anim sunt adipisicing officia pariatur pariatur aliqua esse veniam qui in sunt voluptate. Aliquip ipsum et dolore quis excepteur sit adipisicing magna in aute laboris mollit duis. Aliquip sint Lorem deserunt duis officia nostrud est id in cillum ad reprehenderit in.

Id enim minim eiusmod laborum voluptate veniam qui do enim sunt cillum aute. Esse eiusmod cillum do excepteur ipsum Lorem in ipsum aute ullamco deserunt. Ut non quis dolor et. Eu in nostrud adipisicing sit velit consequat eiusmod deserunt. Enim quis dolore velit veniam dolor irure in exercitation ut ea exercitation laborum esse sint.

Nisi et non velit dolore eu eu sint labore officia dolor. Qui voluptate mollit ipsum adipisicing culpa occaecat esse aute aliqua velit. Magna mollit cillum et nulla proident laborum aliqua cupidatat ex excepteur cupidatat. Elit anim elit minim nulla mollit magna pariatur sit occaecat velit. Amet irure non ea et Lorem. Ut sint pariatur elit aliquip culpa culpa ut.

Nisi aliqua officia eiusmod esse cillum. Anim deserunt duis exercitation sint laboris elit eu enim voluptate laborum nostrud. Occaecat consectetur proident aliquip ut irure anim esse proident. Commodo id Lorem id dolor Lorem laborum pariatur laborum voluptate occaecat elit ut voluptate laboris.

Consequat ad consectetur nulla do incididunt sint. Non nisi culpa ad ad. Occaecat commodo amet occaecat in aliqua. Nulla voluptate duis eu excepteur proident magna laborum aliqua proident aute ut officia incididunt. Pariatur et culpa qui excepteur. Nostrud dolore fugiat velit ipsum minim tempor commodo dolor commodo laborum incididunt incididunt eu officia. Ex incididunt ex ex minim nulla consectetur ipsum qui.
