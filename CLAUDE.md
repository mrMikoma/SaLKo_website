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
```

There are no automated tests.

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
- `main` branch = production; `dev` branch = development environment

The Next.js build uses `output: "standalone"` and runs behind Traefik with TLS via Cloudflare.
