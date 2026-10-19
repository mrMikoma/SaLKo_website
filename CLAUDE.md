# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Website for **Savonlinnan Lentokerho ry** (SaLKo) — a Finnish general aviation flying club. The site is in Finnish; UI strings, variable names, and route segments use Finnish words (e.g. `kalusto` = fleet, `jasenalue` = member area, `kerho` = club, `yhteystiedot` = contacts, `varauskalenteri` = booking calendar).

## Commands

All commands run from `nextjs/`:

```bash
# Development — start postgres first
cd postgres && docker compose up -d
cd nextjs && bun install && bun dev        # app at http://localhost:3000

# Build
bun run build

# Lint
bun run lint

# Run METAR cronjob locally
bun run cronjob:update-metar              # or: tsx ../cronjobs/update-metar/index.ts

# E2E tests (Playwright) — starts `bun dev`, or reuses a server already on :3000
bun run test:e2e
bun run test:e2e e2e/smoke.spec.ts -g kalusto   # one file / filter by title
bun run test:e2e:ui                             # interactive UI mode
bun run test:e2e --project=setup                # only (re)create the e2e accounts and saved sessions
```

## Testing and Browser Checks

Playwright e2e tests live in `nextjs/e2e/` (config: `nextjs/playwright.config.ts`). There are no unit tests.

- `smoke.spec.ts` checks that every public page renders an `h1`, that protected routes redirect anonymous visitors to `/`, and that the login dialog opens.
- Every test fails on an uncaught page error or a `console.error` (auto fixture in `e2e/fixtures.ts`), so import `test`/`expect` from `./fixtures`, not from `@playwright/test`.
- `auth.setup.ts` creates two credentials accounts in the local database, `e2e-user@salko.invalid` (member) and `e2e-admin@salko.invalid` (admin), both with password `E2e-local-pass1!`. It logs in as each and saves the sessions to `nextjs/playwright/.auth/{user,admin}.json` for `member.spec.ts` and `admin.spec.ts`. It only writes to a database on localhost or a Docker bridge address (172.16.0.0/12). For any other database, set `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` and `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` in `nextjs/.env` to existing accounts, or those specs are skipped.
- A dev server already listening on :3000 is reused. In a worktree, when another checkout's server owns :3000, run `PORT=3001 bun run test:e2e` so the tests hit this tree's code.

After changing UI, check it in a real browser with Playwright CLI, run from `nextjs/`. Use `bunx --no-install`, which runs the pinned dev dependency and refuses to download the deprecated unscoped `playwright-cli` package:

```bash
bunx --no-install playwright-cli open http://localhost:3000/kalusto  # headless; --headed to watch
bunx --no-install playwright-cli snapshot          # accessibility tree with element refs (e12…)
bunx --no-install playwright-cli click e12         # act on a ref from the snapshot
bunx --no-install playwright-cli console           # browser console messages
bunx --no-install playwright-cli screenshot --filename=/tmp/page.png   # then Read the PNG
bunx --no-install playwright-cli state-load playwright/.auth/admin.json # continue logged in (user.json for a member)
bunx --no-install playwright-cli close
```

`bunx --no-install playwright-cli --help` lists every command and prints the path of its agent skill file. Snapshots and console logs are written to `nextjs/.playwright-cli/`, which is gitignored.

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

Three core tables (defined in `postgres/init/01-schema.sql`):
- **`users`** — roles: `admin | user | guest`. `auth_provider` is `credentials | google | system`.
- **`bookings`** — aircraft reservations; `repeat_group_id` (UUID) groups recurring bookings. `plane` is one of the club's registration codes (OH-CON, OH-816, OH-829, OH-475, OH-386).
- **`guest_bookings`** — contact info for unauthenticated bookings, linked 1:1 to a `bookings` row.
- **`bullets`** — club announcements.
- **`metar_data`** — METAR weather records for EFSA, upserted every 2 min by the cronjob, retained 7 days.

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

The JWT callback fetches `id`, `role`, and `full_name` from the DB for both providers. The session callback re-fetches the same fields on every request to keep role data fresh; it returns `null` (invalidating the session) if the user is deleted or on DB error.

Session strategy is JWT with 30-day expiry. `trustHost: true` is required because the app runs behind Traefik.

### Authorization (RBAC)

`utilities/roles.ts` exports `ROLES`, `PERMISSIONS`, `hasPermission()`, `canManageBooking()`, and `canDeleteBooking()`. All server actions call `auth()` and `hasPermission()` before touching the DB. Never rely on client-side role checks for access control.

### Data Flow Pattern

- **Server actions** (`"use server"`) in `utilities/` handle all DB mutations and are called directly from client components.
- **API routes** (`app/api/`) exist only for: METAR reads, Umami analytics proxy (forwards to internal `salko-umami:3000`), and NextAuth.
- **Static content** (contacts, plane specs, prices, history) is kept in JSON files under `nextjs/data/` and imported at build time — not stored in the DB.
- TanStack Query (`providers/QueryProvider.tsx`) is used on the client for data fetching that benefits from caching/refetching (e.g. bookings calendar).

### Umami Analytics

Proxied through the Next.js app (`/api/umami/script` and `/api/umami/send`) to avoid ad-blockers. The `UmamiProvider` component injects the script tag only when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set.

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_CONNECTION_STRING` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | NextAuth JWT secret |
| `NEXTAUTH_URL` | App public URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `SESSION_SECRET` | Legacy jose JWT secret (used by `utilities/sessions.ts`) |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | Umami site ID (optional) |
| `UMAMI_INTERNAL_URL` | Internal Umami URL (default: `http://salko-umami:3000`) |

## Deployment

CI/CD runs on GitHub Actions with self-hosted Hetzner Cloud runners. Workflows are manually triggered (`workflow_dispatch`) or via `repository_dispatch`:
- `build-and-publish-prod.yaml` → builds Docker image, tags and pushes to GHCR
- `deploy-app-prod.yaml` → SSH into server, `docker compose pull && up`
- `db-migrate.yaml` → applies `postgres/migrations/` to the dev or prod database (see Schema Changes)
- `main` branch = production; `dev` branch = development environment

The Next.js build uses `output: "standalone"` and runs behind Traefik with TLS via Cloudflare.
