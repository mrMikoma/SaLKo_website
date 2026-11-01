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
- A dev server already listening on :3000 is reused. In a worktree, when another checkout's server owns :3000, run `PORT=3001 NEXTAUTH_URL=http://localhost:3001 bun run test:e2e` so the tests hit this tree's code. Without `NEXTAUTH_URL`, NextAuth builds `proxy.ts`'s redirects from the `.env` value, `http://localhost:3000`, and the redirect tests fail with `ERR_CONNECTION_REFUSED`.

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
- **`billing_periods`**, **`billing_lines`** and **`billing_payers`** — billing periods and what a closed one billed to whom; **`aircraft_rates`**, **`equipment_fee_seasons`** and **`flight_log_settings`** hold the prices, the equipment-fee members per season and the free-hour setting. The rules are in `nextjs/utilities/billing.ts`. **`aircraft_year_totals`** holds hours per aircraft for the years before the flight log, for the statistics.
- **`invoices`** and **`invoice_lines`** — bills the site issues and emails: a closed period's flights per payer, or other charges (membership, hangar…). Numbered per year when sent, with a Finnish reference number; see `nextjs/docs/INVOICES.md`.
- **`email_outbox`** — every email the site sends, stored before it goes out, with its status (`utilities/mail.ts`, `nextjs/docs/MAIL_SETUP.md`).
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
1. **Google OAuth** — restricted to the club's Workspace: `signIn` requires the ID token's `hd` claim to be `savonlinnanlentokerho.fi` and `email_verified` to be true (`utilities/googleWorkspace.ts`). The `hd` request parameter is only a hint for the account chooser. First login auto-creates a `user`-role record.
2. **Credentials** — email + bcrypt password, validated by `LoginFormSchema` (Zod).

The JWT callback fetches `id`, `roles`, and `full_name` from the DB for both providers, and stamps the login time (`authAt`). The session callback re-fetches the same fields on every request to keep role data fresh. It returns `null` (invalidating the session) when:
- the user is deleted or deactivated;
- the session logged in before `users.sessions_revoked_at`, or `users.session_version` has changed since it logged in. A password change or reset, a deactivation and an anonymisation set the first and raise the second; the number leaves no gap where the whole-second time could (a password change and a deactivation also delete the account's open reset links);
- the account is guest-only;
- the database fails.

next-auth then still hands out a bare session without `id`, so checks look at `session.user.id`, as `proxy.ts` does.

Failed password logins are rate-limited in `authorize()` (`utilities/loginLimits.ts`, `utilities/rateLimit.ts`): 10 per email address in 15 minutes, and 20 per IP address in a minute. Wrong current passwords in `changePassword` have the same per-account budget. Unknown addresses are compared against a dummy hash, so timing doesn't reveal accounts. Accounts whose emails differ only in case are tried exact spelling first. Anonymous guest bookings are limited to 10 an hour per IP, and to at most 14 days starting from today.

Session strategy is JWT with 30-day expiry. `trustHost: true` is required because the app runs behind Traefik.

### Authorization (RBAC)

`utilities/roles.ts` exports `ROLES`, `PERMISSIONS`, `hasPermission()`, `canManageBooking()`, and `canDeleteBooking()`. All server actions call `auth()` and `hasPermission()` before touching the DB. Never rely on client-side role checks for access control.

Roles: `admin` has the whole admin site. `treasurer` (laskuttaja) has the flight log, billing and statistics (`VIEW_ALL_FLIGHTS`, `MANAGE_FLIGHT_LOG`, `MANAGE_BILLING`, `VIEW_STATISTICS`) and nothing else of `/admin`: `canOpenAdminPath()` decides what `proxy.ts` lets through and what the admin nav shows, and `adminHome()` is where a treasurer lands (`/admin/laskutus`). `validateRoles()` checks the roles an admin gives, and refuses a treasurer without `user` or `admin`. Give a new role its permissions here, and add it to `ASSIGNABLE_ROLES` for the user forms.

### Data Flow Pattern

- **Server actions** (`"use server"`) in `utilities/` handle all DB mutations and are called directly from client components.
- **API routes** (`app/api/`) exist only for: METAR reads, Umami analytics proxy (forwards to internal `salko-umami:3000`), NextAuth, and the booking `.ics` export (`api/varaukset/[id]/kalenteri`, see `nextjs/docs/BOOKINGS.md`).
- **Static content** (contacts, plane specs, prices, history) is kept in JSON files under `nextjs/data/` and imported at build time — not stored in the DB.
- TanStack Query (`providers/QueryProvider.tsx`) is used on the client for data fetching that benefits from caching/refetching (e.g. bookings calendar).

### Umami Analytics

Proxied through the Next.js app (`/api/umami/script` and `/api/umami/api/send`) to avoid ad-blockers. The tracker posts events to `<data-host-url>/api/send`, and `data-host-url` is `/api/umami`, hence the doubled `api`. The send proxy passes on the visitor's IP headers, which Umami needs to count visitors. The `UmamiProvider` component injects the script tag only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set.

## Environment Variables

Copy `nextjs/.env.example` to `nextjs/.env` (Claude's hooks block editing `.env` itself):

| Variable | Purpose |
|---|---|
| `DATABASE_CONNECTION_STRING` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |
| `NEXTAUTH_URL` | App public URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami site ID (optional) |
| `UMAMI_INTERNAL_URL` | Internal Umami URL (default: `http://salko-umami:3000`) |
| `ALLOW_INDEXING` | `true` only in production; otherwise `robots.ts` disallows crawling |
| `GOOGLE_SERVICE_ACCOUNT_KEY` / `FLIGHT_LOG_SPREADSHEET_ID` | The flight log Google Sheet: the service account's key file (JSON or base64) and the spreadsheet's ID. Setup in `nextjs/docs/FLIGHT_LOG_SETUP.md` (optional) |
| `FLIGHT_SHEET_SOURCE` / `FLIGHT_SHEET_FIXTURE` | `google` or `fixture` (the synthetic `e2e/fixtures/flight-sheet.json`, used by Playwright and by default under `bun dev` without Google) |
| `FEATURE_FLIGHT_LOG` | `true` turns on the unfinished flight log (`utilities/features.ts`). Set in dev by `deploy-app-dev.yaml`, unset in prod; defaults to on under `bun dev` |
| `FEATURE_BILLING` | `true` turns on billing periods, invoices and the members' bills, on top of the flight log. Same defaults as `FEATURE_FLIGHT_LOG`; in prod it goes on in its own stage |
| `FEATURE_PAGES_IN_REVIEW` | `true` shows `/kerho/historiaa` and `/kerho/hallit`, which wait for the club members' review: on in dev, off in prod until then (the production variable of the same name), and greyed out in the menu when off |
| `FLIGHT_LOG_SAMPLE_DATA` | `true` shows the "Esimerkkilennot" button on `/admin/lennot`, which writes a year of made-up flights into an aircraft's tab (`utilities/sampleFlights.ts`). Set in dev, never in prod; defaults to on under `bun dev` |
| `MAIL_MODE` / `MAIL_REDIRECT_TO` | Email: unset is off (messages only stored in `email_outbox`), `redirect` sends everything to `MAIL_REDIRECT_TO` (dev), `send` mails the recipients (prod). `nextjs/docs/MAIL_SETUP.md` |
| `MAIL_FROM` / `MAIL_REFRESH_TOKEN` / `MAIL_GMAIL_CLIENT_ID` / `MAIL_GMAIL_CLIENT_SECRET` | The club's one mail account, which sends all mail, its token (`bun run mail:authorize`) and the OAuth client. Replies go to `laskutus@` or `info@` by purpose (`data/contacts.json`) |
| `LOG_LEVEL` / `LOG_FORMAT` | Server logging (`utilities/logger.ts`, `nextjs/docs/LOGGING.md`): the lowest level written (`trace`…`fatal`, `silent`; default `info` in production, `debug` under `bun dev`) and `json` (default in production) or `pretty` |
| `E2E_USER_*` / `E2E_ADMIN_*` | `_EMAIL` and `_PASSWORD` of existing accounts for e2e tests against a non-local database (optional) |

## Deployment

CI/CD runs on GitHub Actions. Build jobs run on GitHub-hosted runners; jobs that touch the server create a temporary self-hosted runner in Hetzner Cloud (`create-runner` / `delete-runner`). `main` is production and `dev` is the development environment. Changes reach either one only through a PR and these workflows, never by hand on the server.

- `build-and-publish-dev.yaml` runs on pushes to `dev` that touch `nextjs/`, pushes the image to GHCR and starts `deploy-app-dev.yaml` from the same branch (`workflow_dispatch`), so changes to the dev deploy take effect on `dev` without waiting for `main`.
- `build-and-publish-prod.yaml` (manual, refuses any branch but `main`) builds the prod image; `deploy-app-prod.yaml` (manual, from `main`) runs `docker compose pull && up` on the server. The production environment's variables `FEATURE_FLIGHT_LOG`, `FEATURE_BILLING` and `MAIL_MODE` switch the flight log, billing and email on at deploy; the release steps are in `nextjs/docs/GO_LIVE.md`.
- `db-migrate.yaml` applies `postgres/migrations/` to the dev or prod database (see Schema Changes).
- `test.yaml` runs lint, types and the e2e suite on PRs (see Testing and Browser Checks).
- `deploy-cronjobs-docker.yaml`, `deploy-monitoring.yaml` and `deploy-traefik.yaml` deploy the other stacks; `ansible-provision.yaml` and `terraform-plan-and-apply.yaml` manage the host.
- Dispatch inputs are checked against known values in a first job, before a runner is created, and reach scripts only through `env:`. The deploys check out the commit the run is on: prod and Traefik from `main` only, kehitys from `dev` only, a cronjob deploy from the branch it deploys, and Ansible for real from `main` and as a dry run from `main` or `dev`.

The Next.js build uses `output: "standalone"` and runs behind Traefik with TLS via Cloudflare.
