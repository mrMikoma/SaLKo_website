---
name: db-migration
description: Create a new numbered PostgreSQL migration file in postgres/init/
disable-model-invocation: true
---

Create a new SQL migration file in `postgres/init/`.

Steps:
1. List existing files in `postgres/init/` to find the next number (current highest + 1, zero-padded to 2 digits)
2. Prompt for a short kebab-case name describing the migration
3. Create `postgres/init/<NN>-<name>.sql` with a header comment and `BEGIN;` / `COMMIT;` wrapper
4. Remind user to add a corresponding `GRANT` in `05-grant-app-permissions.sql` if adding tables

Never run the migration automatically — just create the file.
