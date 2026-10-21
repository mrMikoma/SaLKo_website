# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Website for **Savonlinnan Lentokerho ry** (SaLKo) — a Finnish general aviation flying club. The site is in Finnish; UI strings, variable names, and route segments use Finnish words (e.g. `kalusto` = fleet, `jasenalue` = member area, `kerho` = club, `yhteystiedot` = contacts, `varauskalenteri` = booking calendar).

## Commands

All commands run from `nextjs/`:

```bash
# Development — start postgres first (cp postgres/.env.example postgres/.env on first run)
cd postgres && docker compose up -d
cd nextjs && bun install && bun dev        # app at http://localhost:3000

# Build
bun run build

# Lint
bun run lint

# Run METAR cronjob locally
bun run cronjob:update-metar              # or: tsx ../cronjobs/update-metar/index.ts

# Unit tests (tests/unit/, bun's test runner)
bun run test:unit

# E2E tests (Playwright) — starts `bun dev`, or reuses a server already on :3000
bun run test:e2e
bun run test:e2e e2e/smoke.spec.ts -g kalusto   # one file / filter by title
bun run test:e2e:ui                             # interactive UI mode
bun run test:e2e --project=setup                # only (re)create the e2e accounts and saved sessions
```

## Testing and Browser Checks

Playwright e2e tests live in `nextjs/e2e/` (config: `nextjs/playwright.config.ts`). Unit tests for pure helpers live in `nextjs/tests/unit/` and run with `bun run test:unit` (bun's test runner). `.github/workflows/test.yaml` runs lint, the type check, the unit tests and the e2e suite on every PR to `dev` or `main` that touches `nextjs/` or `postgres/`. In CI the suite runs against a production build served by `.next/standalone/server.js`, as in the Docker image, and a Postgres built from `postgres/init/`.

- `smoke.spec.ts` checks that every public page renders an `h1`, that protected routes redirect anonymous visitors to `/`, and that the login dialog opens.
- Every test fails on an uncaught page error or a `console.error` (auto fixture in `e2e/fixtures.ts`), so import `test`/`expect` from `./fixtures`, not from `@playwright/test`.
- `auth.setup.ts` creates three credentials accounts in the local database, `e2e-user@salko.invalid` (member), `e2e-admin@salko.invalid` (admin) and `e2e-treasurer@salko.invalid` (member and treasurer), all with password `E2e-local-pass1!`. It logs in as each and saves the sessions to `nextjs/playwright/.auth/{user,admin,treasurer}.json` for `member.spec.ts`, `admin.spec.ts`, `treasurer.spec.ts` and the flight-log specs. It only writes to a database on localhost or a Docker bridge address (172.16.0.0/12). For any other database, set `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` and `E2E_TREASURER_EMAIL`/`E2E_TREASURER_PASSWORD` in `nextjs/.env` to existing accounts, or those specs are skipped.
- A dev server already listening on :3000 is reused. In a worktree, when another checkout's server owns :3000, run `PORT=3001 bun run test:e2e` so the tests hit this tree's code.

After changing UI, check it in a real browser with Playwright CLI (the `playwright-cli` skill), run from `nextjs/` where its config lives. In Claude Code sessions the SessionStart hook puts `nextjs/node_modules/.bin` on PATH, so `playwright-cli` is the pinned dev dependency. In a plain terminal use `bunx --no-install playwright-cli`; without `--no-install`, bunx downloads the deprecated unscoped `playwright-cli` package when run outside `nextjs/`.

```bash
playwright-cli open http://localhost:3000/kalusto  # headless; --headed to watch
playwright-cli snapshot          # accessibility tree with element refs (e12…)
playwright-cli click e12         # act on a ref from the snapshot
playwright-cli console           # browser console messages
playwright-cli screenshot --filename=/tmp/page.png   # then Read the PNG
playwright-cli state-load playwright/.auth/admin.json # continue logged in (user.json for a member)
playwright-cli close
```

Snapshots and console logs are written to `nextjs/.playwright-cli/`, which is gitignored.

## Claude Code Setup

Shared config lives in `.claude/` (`settings.json`, `hooks/`, `skills/`, `agents/`); `.claude/worktrees/` and `settings.local.json` stay local. Hooks:

- **SessionStart** (`hooks/session-start.sh`): adds `nextjs/node_modules/.bin` to PATH and reports whether `salko-postgres` and this checkout's dev server are running.
- **PreToolUse**: blocks `git commit` / `git push` (run them yourself) and edits to `.env`.
- **PostToolUse** (`hooks/lint-edited-file.sh`): runs `eslint --quiet` on each edited file under `nextjs/` and feeds errors back.
- **Stop** (`hooks/typecheck.sh`): runs `tsc --noEmit` once per turn when a `.ts`/`.tsx` file changed since the last check, and feeds errors back.

`.mcp.json` adds the `next-devtools` MCP server (`next-devtools-mcp`, pinned, telemetry off), which Claude Code asks you to approve once. It finds running Next dev servers (`nextjs_index`) and calls their built-in `/_next/mcp` tools (`nextjs_call`): `get_errors`, `get_logs`, `get_routes`, `get_page_metadata`, `get_server_action_by_id` and more. `get_errors` only reports once a browser is connected to the dev server, so open the page with `playwright-cli` first. Use `playwright-cli` rather than its `browser_eval` tool for driving the browser.

## Architecture

### Monorepo Layout

```
nextjs/        # Next.js 16 full-stack app (App Router, React 19, TypeScript)
postgres/      # PostgreSQL 17 — init scripts in postgres/init/ run in order (00–06)
cronjobs/      # Standalone tsx scripts run by Ofelia (Docker cron)
infra/         # Terraform + Ansible for Hetzner Cloud
monitoring/    # Grafana / Prometheus / Loki stack
traefik/       # Reverse proxy config
```

### Database

Tables (defined in `postgres/init/01-schema.sql`):
- **`users`** — `roles` is a text array of `admin | treasurer | user | guest`; `treasurer` (laskuttaja) comes on top of `user`. `auth_provider` is `credentials | google | system`. Accounts whose only role is `guest` cannot log in.
- **`bookings`** — aircraft reservations; `repeat_group_id` (UUID) groups recurring bookings. `plane` is a registration from `nextjs/data/planes.json` (OH-CON, OH-386, OH-PDX, OH-816, OH-829, OH-475).
- **`guest_bookings`** — contact info for unauthenticated bookings, linked 1:1 to a `bookings` row.
- **`bullets`** — club announcements.
- **`sheet_flights`** — read-only copy of the flight log Google Sheet (one tab per aircraft), kept in sync by `utilities/flightSync.ts`; `sheet_flight_issues` and `sheet_sync_runs` go with it. **`flight_purposes`** (purpose codes and who pays), **`aircraft_sheets`** (aircraft → tab) and **`pilot_aliases`** (sheet names → members) are owned by the site, and so are `flight_log_web_entries` and `flight_status_changes` (who entered or checked what). See `nextjs/docs/FLIGHT_LOG.md`.
- **`billing_periods`**, **`billing_lines`** and **`billing_payers`** — billing periods and what a closed one billed to whom; **`aircraft_rates`**, **`equipment_fee_seasons`** and **`flight_log_settings`** hold the prices, the equipment-fee members per season and the free-hour setting. The rules are in `nextjs/utilities/billing.ts`.
- **`metar_data`** — METAR weather records for EFSA, upserted every 2 min by the cronjob, retained 7 days.
- `accounts`, `sessions`, `verification_tokens` — NextAuth adapter tables (sessions themselves are JWTs).

`postgres/init/02–04` seed an admin, a test user, a guest user, bulletins and bookings.

The database connection is a `pg.Pool` singleton exported from `utilities/db.ts`. It is `null` when `DATABASE_CONNECTION_STRING` is unset or `CI=true` — always null-check before querying.

### Schema Changes

**Every database change goes into both `postgres/init/` and `postgres/migrations/`, in the same PR.**

- `postgres/init/` is the full current schema. It only runs when a database is created from scratch: the dev database on every dev deploy, or a new server. Edit the definitions in `01-schema.sql`, and add grants for new tables to `05-grant-app-permissions.sql`.
- `postgres/migrations/NNN_description.sql` is the same change for databases that already exist, which in practice means prod. `.github/workflows/db-migrate.yaml` applies pending files in name order with `postgres/migrate.sh`. It runs on dev automatically when migrations reach the `dev` branch, and on prod only manually, from `main`, after approval. Run the prod migration right before deploying the code that needs it.

Rules for migration files:
- Name them `NNN_snake_case.sql` with the next free number. Never edit or rename a migration once it has run anywhere; `migrate.sh` compares checksums and stops. Fix mistakes with a new migration.
- Make them idempotent (`IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`, a `DO` block for `CREATE TYPE`). A database created from `init/` already has every change, so each migration must be a no-op there. Compare the result against `init/` before opening the PR.
- Leave out `BEGIN`/`COMMIT`: each file runs in one transaction with its `schema_migrations` row, so `CREATE INDEX CONCURRENTLY` is not possible.
- Grant new tables to the app role with `GRANT ... TO :app_user;`, matching `05-grant-app-permissions.sql`. Default privileges leave out `DELETE`.
- Don't `SELECT` member data, because the Actions logs are public.

### Authentication (NextAuth v5)

Configured in `auth.ts`. Two providers:
1. **Google OAuth** — restricted to `@savonlinnanlentokerho.fi` domain via `hd` parameter. First login auto-creates a `user`-role record.
2. **Credentials** — email + bcrypt password, validated by `LoginFormSchema` (Zod).

The JWT callback fetches `id`, `roles`, and `full_name` from the DB for both providers. The session callback re-fetches the same fields on every request to keep role data fresh; it returns `null` (invalidating the session) if the user is deleted or on DB error.

Session strategy is JWT with 30-day expiry. `trustHost: true` is required because the app runs behind Traefik.

### Authorization (RBAC)

`utilities/roles.ts` exports `ROLES`, `PERMISSIONS`, `hasPermission()`, `canManageBooking()`, and `canDeleteBooking()`. All server actions call `auth()` and `hasPermission()` before touching the DB. Never rely on client-side role checks for access control.

Roles: `admin` has the whole admin site. `treasurer` (laskuttaja) has the flight log and billing (`VIEW_ALL_FLIGHTS`, `MANAGE_FLIGHT_LOG`, `MANAGE_BILLING`) and nothing else of `/admin`: `canOpenAdminPath()` decides what `proxy.ts` lets through and what the admin nav shows, and `adminHome()` is where a treasurer lands (`/admin/laskutus`). `validateRoles()` checks the roles an admin gives, and refuses a treasurer without `user` or `admin`. Give a new role its permissions here, and add it to `ASSIGNABLE_ROLES` for the user forms.

### Data Flow Pattern

- **Server actions** (`"use server"`) in `utilities/` handle all DB mutations and are called directly from client components.
- **API routes** (`app/api/`) exist only for: METAR reads, Umami analytics proxy (forwards to internal `salko-umami:3000`), and NextAuth.
- **Static content** (contacts, plane specs, prices, history) is kept in JSON files under `nextjs/data/` and imported at build time — not stored in the DB.
- TanStack Query (`providers/QueryProvider.tsx`) is used on the client for data fetching that benefits from caching/refetching (e.g. bookings calendar).

### Umami Analytics

Proxied through the Next.js app (`/api/umami/script` and `/api/umami/send`) to avoid ad-blockers. The `UmamiProvider` component injects the script tag only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set.

## Environment Variables

Copy `nextjs/.env.example` to `nextjs/.env` (Claude's hooks block editing `.env` itself):

| Variable | Purpose |
|---|---|
| `DATABASE_CONNECTION_STRING` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |
| `NEXTAUTH_URL` | App public URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `SESSION_SECRET` | Legacy jose JWT secret (used by `utilities/sessions.ts`) |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami site ID (optional) |
| `UMAMI_INTERNAL_URL` | Internal Umami URL (default: `http://salko-umami:3000`) |
| `ALLOW_INDEXING` | `true` only in production; otherwise `robots.ts` disallows crawling |
| `GOOGLE_SERVICE_ACCOUNT_KEY` / `FLIGHT_LOG_SPREADSHEET_ID` | The flight log Google Sheet: the service account's key file (JSON or base64) and the spreadsheet's ID. Setup in `nextjs/docs/FLIGHT_LOG_SETUP.md` (optional) |
| `FLIGHT_SHEET_SOURCE` / `FLIGHT_SHEET_FIXTURE` | `google` or `fixture` (the synthetic `e2e/fixtures/flight-sheet.json`, used by Playwright and by default under `bun dev` without Google) |
| `FEATURE_FLIGHT_LOG` | `true` turns on the unfinished flight log (`utilities/features.ts`). Set in dev by `deploy-app-dev.yaml`, unset in prod; defaults to on under `bun dev` |
| `E2E_USER_*` / `E2E_ADMIN_*` | `_EMAIL` and `_PASSWORD` of existing accounts for e2e tests against a non-local database (optional) |

## Deployment

CI/CD runs on GitHub Actions. Build jobs run on GitHub-hosted runners; jobs that touch the server create a temporary self-hosted runner in Hetzner Cloud (`create-runner` / `delete-runner`). `main` is production and `dev` is the development environment. Changes reach either one only through a PR and these workflows, never by hand on the server.

- `build-and-publish-dev.yaml` runs on pushes to `dev` that touch `nextjs/`, pushes the image to GHCR and triggers `deploy-app-dev.yaml`.
- `build-and-publish-prod.yaml` (manual, from `main`) builds the prod image; `deploy-app-prod.yaml` (manual or `repository_dispatch`) runs `docker compose pull && up` on the server.
- `db-migrate.yaml` applies `postgres/migrations/` to the dev or prod database (see Schema Changes).
- `test.yaml` runs lint, types and the e2e suite on PRs (see Testing and Browser Checks).
- `deploy-cronjobs-docker.yaml`, `deploy-monitoring.yaml` and `deploy-traefik.yaml` deploy the other stacks; `ansible-provision.yaml` and `terraform-plan-and-apply.yaml` manage the host.

The Next.js build uses `output: "standalone"` and runs behind Traefik with TLS via Cloudflare.
