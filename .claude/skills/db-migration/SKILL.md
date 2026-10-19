---
name: db-migration
description: Make a PostgreSQL schema change — update postgres/init/ and add the matching numbered, idempotent migration in postgres/migrations/
disable-model-invocation: true
---

Follow "Schema Changes" in the root `CLAUDE.md`. Every change goes into both places in the same PR.

Steps:
1. Change the definition in `postgres/init/01-schema.sql`. For a new table, add its grants to `05-grant-app-permissions.sql`.
2. List `postgres/migrations/` and take the next free number: `NNN_snake_case.sql`. Ask for a short name if the change doesn't suggest one.
3. Write the same change for existing databases:
   - idempotent (`IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`, a `DO` block for `CREATE TYPE`), so it is a no-op on a database built from `init/`
   - no `BEGIN`/`COMMIT` (`migrate.sh` wraps each file in a transaction)
   - `GRANT ... TO :app_user;` for new tables, matching `05-grant-app-permissions.sql`
   - no `SELECT` of member data (the Actions logs are public)
4. Dry-run against the local database: `APP_DB_USER=salko_app bash postgres/migrate.sh salko-postgres postgres/migrations --dry-run`

Never edit or rename a migration that has already run anywhere; fix mistakes with a new one. Don't apply migrations to dev or prod by hand: `.github/workflows/db-migrate.yaml` does that.
