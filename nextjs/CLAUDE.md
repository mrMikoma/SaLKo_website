@AGENTS.md

# nextjs/ — Next.js App Conventions

Read together with the root `CLAUDE.md`, which covers commands, architecture, the database, schema changes and testing. For design tokens, Tailwind utilities and component styling, use the `ui-guide` agent (`.claude/agents/ui-guide.md`).

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 with `strict: false`, NextAuth v5 (beta), Tailwind CSS 4, Ant Design 6 and Headless UI, TanStack Query 5, Zod 4, Luxon, `pg`. The package manager is bun (`bun install`, `bun dev`, `bun run <script>`).

## Layout

```
app/          # routes; segments are Finnish (kalusto, jasenalue, kerho, …), api/ only for auth, METAR, Umami, booking .ics
components/   # one folder per feature (bookings/, flightLogs/, admin/, profile/, …), shared ones at the top
utilities/    # server actions ("use server" files) and helpers; db.ts, roles.ts, definitions.ts
hooks/        # client hooks, e.g. useBookings (TanStack Query)
providers/    # Session, Query, Navbar and Umami providers used in app/layout.tsx
schemas/      # Zod schemas (bookings, flight logs); login/user schemas are in utilities/
types/        # shared types, next-auth.d.ts augments the session user
data/         # static JSON content (planes, prices, contacts, history, airfields)
e2e/          # Playwright tests, see the root CLAUDE.md
proxy.ts      # route protection (Next 16's replacement for middleware.ts)
```

## Conventions

- **Imports** use the `@/` alias for everything under `nextjs/`.
- **File names** are mixed: older files are camelCase (`navbar.tsx`, `bookingModal.tsx`) and newer folders use PascalCase (`flightLogs/FlightLogForm.tsx`, `admin/users/`). Follow the folder you are in.
- **Server Components by default.** Add `"use client"` only for hooks, event handlers, browser APIs or client-only libraries (Ant Design interactive components, TanStack Query).
- **Server actions** live in `utilities/*.ts` files that start with `"use server"`. Each one:
  1. gets the session with `auth()` from `@/auth`, and checks `hasPermission(session.user.roles, "PERMISSION_NAME")` from `@/utilities/roles` before touching the database (`PERMISSIONS` lists every permission);
  2. validates input with Zod;
  3. queries with `pool` from `@/utilities/db`, always parameterized (`$1`, `$2`, …);
  4. calls `revalidatePath()` for pages that show the changed data;
  5. returns `{ status: "success" | "error", error?, result? }`. Error messages are user-facing and in Finnish; log details with `console.error`.
- **Access control:** `proxy.ts` redirects anonymous users away from `/jasenalue/*`, and keeps `/admin/*` to admins, except the flight log and billing sections, which treasurers can also open (`canOpenAdminPath()` in `utilities/roles.ts`). That is only a UI guard. The server action check above is what protects data.
- **Forms** call server actions through `useActionState` (`components/auth/login.tsx`, `components/profile/*Form.tsx`).
- **Client data** that needs caching or refetching goes through TanStack Query hooks in `hooks/` (see `useBookings.ts`).
- **Dates:** use Luxon. Postgres runs in UTC, so set `Europe/Helsinki` explicitly when you format times for people.
- **Images:** use `next/image` with the image's real aspect ratio in `width`/`height`, and give `fill` images a `sizes` prop. Next forwards the browser warnings for both to the dev server log.
- **Language:** UI text is Finnish. Code, identifiers outside routes, and comments are English.
- **Static content** (planes, prices, contacts, history) is edited in `data/*.json`, not stored in the database.

## Gotchas

- `tsconfig.json` has `strict: false`, so the compiler won't catch missing null checks. `@typescript-eslint/no-explicit-any` is only a warning; use real types in new code.
- `pool` from `utilities/db.ts` is `null` when `DATABASE_CONNECTION_STRING` is unset or `CI` is set.
- `next-env.d.ts` and the managed block in `AGENTS.md` are written by `next dev`. `next-env.d.ts` is gitignored; `AGENTS.md` is committed as generated.
- After you edit a file, the hooks report ESLint errors in it, and at the end of the turn they report TypeScript errors (see "Claude Code Setup" in the root `CLAUDE.md`).

## More Docs

`docs/` has background on specific features: `BOOKINGS.md` (current booking calendar: club time, permissions, saving, export), `FLIGHT_LOG.md` (the flight log sync), `FLIGHT_LOG_SETUP.md` (connecting an environment to a Google Sheet, with the empty template `lentopaivakirja-pohja.xlsx`) and `FLIGHT_LOG_PLAN.md` (the plan for flight log, billing and stats), `INVOICES.md` (issuing and emailing bills, reference numbers, the member's view), `GO_LIVE.md` (the production release checklist, in stages), `SEO_PLAN.md` (search visibility: findings and phased plan; the `seo` skill has the per-page checklist and audit scripts), `MAIL_SETUP.md` (sending email from the club's Google Workspace account: DNS, the OAuth client, `MAIL_MODE`), `BACKUP_PLAN.md` (off-site backups and handover) and `BACKUP_GITHUB.md` (the weekly copy of GitHub and the Terraform state; the nightly server copy is in `infra/ansible/roles/backup/README.md`), `AUTH_SETUP.md`, `GITHUB_SECRETS_SETUP.md` and `METAR_SETUP.md`, plus the historical `BOOKING_MODERNIZATION.md`, `BOOKING_PHASE2_IMPROVEMENTS.md` and `BOOKING_PHASE3_TODO.md`. They were written at different times, so check them against the code.
