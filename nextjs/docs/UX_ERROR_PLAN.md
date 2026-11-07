# User experience in error situations: findings and plan

Checked on 2026-11-07 against `dev` at `e334428` (47 commits ahead of `main`). I tested it with a production build (`.next/standalone/server.js`, feature flags on, the fixture sheet) on two ports: one with the local database and one pointed at a closed port, which acts as a database outage. Then I drove it with `playwright-cli` as a guest, a member (`e2e-user`) and an admin (`e2e-admin`), on desktop (1366×900) and on a phone (390×844). "Verified" below means I saw the result. Everything else comes from reading the code.

Every P0 and P1 finding is also on `main`, so production has it now.

## What already works

- Public pages survive a database outage. They all return 200: the front page, the calendar, the bulletins ("Tiedotteiden haku epäonnistui.") and the price list (empty, see F10).
- Odd URLs on the admin and member pages return a 404 or a sensible default, never a 500. I tried 40 of them: `?vuosi=abc`, `/admin/laskut/abc`, `?kausi=99999`, and so on.
- The booking modal and the flight entry form handle a lost connection well. The entry form keeps what was typed, and saving again is safe because the legs keep their IDs. `PriceListEditor`, `PilotMatching`, `FlightTable` and `PaperPageEntry` also catch. **This is the pattern to copy** (F2).
- The calendar has its own loading skeleton and an error box with a retry button (`BookingsError`).
- Failed logins during an outage don't count towards the login limit.

## P0: the whole site breaks

**F1. There are no error boundaries.** `app/` has no `error.tsx` and no `global-error.tsx`. Any uncaught error replaces the whole page with Next's built-in screen: white, in English ("This page couldn't load", "Reload", "Back"), with no navbar. *Verified* on `/jasenalue/profiili` and `/admin/laskutus/viestit`. `components/internalError.tsx` was meant for this, but nothing uses it. It also can't work: it has an `onClick` and no `"use client"`.

**F2. A failed server action call crashes the page and loses the form.** Eighteen client components call server actions in `startTransition` or `useActionState` with no `catch`. A dropped connection (a phone at the airfield), the few seconds a deploy restarts the container, or a tab left open from before a deploy (F3) throws into the missing boundary (F1). What was typed is lost. *Verified*: the member's profile save, and the admin's "Lähetä testiviesti itselleni".
- Affected:
  - Admin: `bulletinTable`, `CreateUserForm`, `EditUserForm`, `UserTableRow`.
  - Members and login: `profileEditForm`, `changePasswordForm`, `login`, `resetPasswordForm`.
  - Billing and invoices: `BillingSettingsForms`, `NewPeriodForm`, `PeriodActions`, `InvoiceActions`, `InvoiceSettingsForm`, `NewInvoiceForm`, `MailActions`.
  - Flight log, prices and stats: `SampleFlights`, `SyncStatus`, `AircraftRates`, and `saveYearTotals` in `YearTotalsForm`.
- A long bulletin or a new invoice draft is the worst case.

**F3. Each deploy breaks the tabs that are open.** Server action IDs change with every build, and `next.config.js` sets no `deploymentId`. After a deploy, the next action call from a tab opened before it fails with `UnrecognizedActionError`, which is F2 in forms. The calendar loads its bookings through a server action, so it shows this as its error text, *verified*: `Server Action "705f1c86…" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action`. "Yritä uudelleen" can't help, because only reloading the page does.

**F4. NextAuth points at pages that don't exist.** `auth.ts` has `pages: { signIn: "/auth/login", error: "/auth/error" }`, and both are 404s (*verified*). Google login sends people to `/auth/error?error=AccessDenied` when they're refused: a non-club Google account, a deactivated or guest-only account, or a database error. They get the 404 page, and on a phone that page is empty (F5). `/api/auth/signin` redirects to `/auth/login`, which is also a 404.

**F5. The 404 page is empty on phones and its text is wrong.** All of its text and the "Palaa etusivulle" button sit in `hidden sm:block`, so a phone shows only the Olavinlinna photo, with no text and no link (*verified*, screenshot). The text, "Tätä sivua ei vielä ole olemassa – Sivut ovat vielä työn alla", is also wrong for a mistyped address, an old link or a deleted invoice. Inside `/admin`, a missing period or invoice shows this full-screen public 404 under the admin header.

## P1: flows that dead-end or mislead

**F6. During an outage, login says the password is wrong.** `authorize()` catches the database error and returns `null`, so the form shows "Virheellinen sähköpostiosoite tai salasana." (*verified*). Members then try other passwords and contact the admin.

**F7. Protected pages send logged-out visitors to the front page.** `proxy.ts` redirects to `/` with no message, and logging in from there lands on `/` again. A bookmark such as `/jasenalue/lentopaivakirja/uusi`, or a session that ended (30 days, or a password change), loses where the member was going (*verified*: 307 to `/`).

**F8. The navbar login always lands on the front page.** `<Login />` in `navbar.tsx` and `navbarMobile.tsx` has no `redirectTo`, so logging in from `/kerho/hinnasto` or `/kalusto/OH-CON` leaves that page. Only the calendar's `GuestBanner` passes the current page.

**F9. During an outage, members look logged out.** The session callback fails closed, which is right, but nothing says why. The navbar shows "Et ole kirjautunut", and `/jasenalue/*` redirects to `/` (*verified*). Members think they were logged out and try to log in again (F6).

**F10. Without the database, the public price list shows empty tables.** `getPriceList()` returns an empty list when it fails, so `/kerho/hinnasto` shows the section headings over empty tables (*verified*). `/kerho/jasenyys`, `/kerho/hallit`, `/koulutus` and the invoice presets read the same list. A guest can't tell that anything went wrong.

**F11. Slow pages give no feedback.** There is no `loading.tsx` anywhere. `/admin/lennot`, `/admin/laskutus`, `/admin/laskutus/[id]`, `/admin/tilastot` and `/jasenalue/lentopaivakirja` call `ensureFreshSync()`, which syncs the whole Google Sheet before the page renders whenever the copy is over 10 minutes old. With the real sheet, a click can seem to do nothing for seconds.

**F12. An ended session is reported as missing rights.** Server actions answer a missing session with "Ei oikeuksia", "Ei oikeuksia laskutukseen", "Kirjaudu sisään" or "Kirjaudu sisään kirjataksesi lentoja". A member whose session ended is told they have no rights, and nothing offers a way to log in again without losing the form.

**F13. Guests aren't told how to change or cancel a booking.** Guests can only create bookings (an earlier decision). The "Varaus tallennettu" screen shows the booking and a Google Calendar link, but doesn't say how to change or cancel it, and nobody gets an email about it.

**F14. A forgotten password is a dead end.** "Unohtuiko salasana?" links to `/yhteystiedot`. Reset links can only be made by an admin (`/admin/users`), even though the site can now send email.

**F15. After a password reset, the member must find the login.** The success text says "kirjaudu… sivun yläreunan Jäsenalue-valikosta". On a phone that is behind the hamburger menu. The login form could simply be shown there.

## P2: robustness and polish

- **F16. Queries have no time limit.** The pool sets `connectionTimeoutMillis` but no `statement_timeout`, so a query stuck behind a lock hangs the request with no end.
- **F17. A failed logout leaves the menu stuck.** If `signOut()` fails, the button stays pending and the navbar hides the user, who is still logged in.
- **F18. Server actions answer in different shapes.** Most return `{ status }`, the bulletins and reset links return `{ success }`, and `getAllUsers` throws. Each component handles its own shape.
- **F19. `mailActions.ts` has no try/catch.** A database error there throws instead of returning a Finnish message.
- **F20. Raw technical errors reach the screen.** `BookingsError` shows `error.message` as it is, so English fetch or Next errors appear (F3).
- **F21. Long forms lose their text on a reload.** The bulletin editor, the multi-leg flight entry and the paper-page grid keep nothing over a reload. "Draft over a reload" was already a leftover from PR 4 of the flight log.

## Plan: six PRs into `dev`

Each one is small and goes through CI. 1 and 2 matter most, because together they remove the whole-site crash.

### PR 1 `fix/error-pages` (F1, F5)
- `utilities/errorText.ts`: `failureKind()` (offline, outdated, other) and the Finnish texts. The error pages use it, and so will `callAction()` in PR 2.
- `app/error.tsx` (client): in Finnish and in the site's style, with the root layout kept, so the navbar stays.
  - It names the failure: "Yhteys katkesi", "Sivusto on päivittynyt" or "Jotain meni pieleen".
  - It offers "Yritä uudelleen" (Next 16's `retry()` prop) or, for a page from before a deploy, "Lataa sivu uudelleen". There is also an "Etusivulle" link.
  - For server errors it shows `error.digest` as a code to quote to the admin.
  - The panel scrolls itself into view and takes focus, because a failed save at the bottom of a long form leaves the page scrolled down.
- `app/global-error.tsx`: the same, with its own `<html>`/`<body>` and the site's CSS, for when the root layout itself fails.
- `app/admin/error.tsx`: inside the admin layout, so the admin menu stays usable. The member pages have no layout of their own, so `app/error.tsx` covers them.
- `app/not-found.tsx`: visible on every screen size. "Sivua ei löytynyt", with links to the front page, the booking calendar and the contacts.
- `app/admin/not-found.tsx`: a compact admin version, "Ei löytynyt", with a link back to `/admin`.
- `components/errors/` holds the shared panel and the error page content.
- Delete `components/internalError.tsx`.
- Tests:
  - `tests/unit/errorText.test.ts`.
  - `e2e/error-pages.spec.ts`: the 404 on a phone-sized screen, a missing invoice inside the admin layout, and a profile save that loses its connection showing the Finnish error page in view. PR 2 changes the last one: the form then shows the message itself.

### PR 2 `fix/action-failures` (F2, F3, F18, F19, F20)
- `utilities/callAction.ts` (browser): `callAction(() => action(…))` turns a call that throws into `{ status: "error", error, failure }`:
  - `failure` is `failureKind()` from PR 1, and `error` is its Finnish text;
  - Next's redirects pass through (`unstable_rethrow`);
  - a page from before a deploy also raises the site-wide `OutdatedNotice` (in the root layout): "Sivusto on päivittynyt… Kopioi pitkät tekstit talteen ennen lataamista", with "Lataa sivu uudelleen".
- Used in the 18 components of F2.
  - The four `useActionState` forms go through `hooks/useFormAction.ts`. The profile form also submits through `onSubmit`, so what was typed stays after a failed save. The password forms keep React's reset of their fields.
  - The booking hook also uses `callAction()`. A failed load is a `BookingsLoadError`; for an outdated page `BookingsError` offers a reload instead of a retry, and the query stops retrying.
  - `FlightEntryForm`, `PriceListEditor`, `PilotMatching`, `FlightTable` and `PaperPageEntry` already had their own `.catch()` and are left as they were.
- **One result shape (F18):** `utilities/actionResult.ts` has the one `ActionResult<T>` type. The bulletin and user actions answered `{ success }` and now answer `{ status }`; the reset link comes as `result.url`. The other action files' identical local types import it. The form states (`LoginState` and the others) stay as they are: they carry field errors.
- **Deploy ID (F3):** the Dockerfile takes `DEPLOYMENT_VERSION` as a build arg, both image builds pass the image version, and `next.config.js` makes it Next's `deploymentId` (`v0.0.30` → `v0-0-30`: Next refuses dots, and takes `NEXT_DEPLOYMENT_ID` as it is). After a deploy, the next link click reloads the page. It touches workflows, so the merge needs the `workflow` scope.
- `mailActions.ts`: try/catch with the module logger.
- The one action still allowed to throw to the error pages is "Kirjaudu Google Workspacella": it leaves the site, so there is no form to keep. `e2e/error-pages.spec.ts` uses it to test both error pages.
  - From the calendar's guest banner, inside the page, it shows `app/error.tsx` under the navbar.
  - From the navbar, which is in the root layout, it shows `global-error.tsx`, which names the failure the same way.
- Tests:
  - `tests/unit/callAction.test.ts`.
  - `e2e/action-failures.spec.ts`: the calendar from before a deploy; the profile and a bulletin losing their connection, with the typed text kept.

### PR 3 `fix/login-flows` (F4, F6, F7, F8, F12, F15, F17)
- `app/auth/kirjaudu/page.tsx`: the login form as a page, with `?paluu=` (checked with `safeRedirect`) and "Kirjaudu sisään jatkaaksesi" when it came from a protected page. `app/auth/virhe/page.tsx` explains NextAuth's `?error=` in Finnish, with the login form under it:
  - `AccessDenied`: "Google-kirjautuminen toimii vain kerhon @savonlinnanlentokerho.fi-tunnuksilla. Jos tunnuksesi on poistettu käytöstä, ota yhteyttä ylläpitoon."
  - `Configuration` / other: "Kirjautuminen ei juuri nyt onnistu."
  - The routes sit next to the existing `/auth/uusi-salasana`, and `pages` in `auth.ts` points to them.
- `authorize()`: a database error throws a `ServiceUnavailable` error (`code: "unavailable"`, like `TooManyLoginAttempts`). The form then says "Kirjautuminen ei juuri nyt onnistu palvelinhäiriön vuoksi. Yritä hetken kuluttua uudelleen."
- `proxy.ts`: a logged-out visitor to `/jasenalue/*` or `/admin/*` goes to `/auth/kirjaudu?paluu=<path>`. A member who opens `/admin` still goes to the front page. Update `smoke.spec.ts`: it now expects the login page.
- The navbar logins pass the current path and query as `redirectTo`.
- `utilities/session.ts`: `requireSession()` returns one message when there is no session, "Istuntosi on päättynyt. Kirjaudu sisään uudelleen.", and keeps "Ei oikeuksia" for real permission refusals. `callAction()` recognises it and shows a login link that opens in a new tab, so the form isn't lost.
- The reset success screen shows `<Login />` straight away.
- `Logout`: on failure, `pending` goes back and the user is shown again.

### PR 4 `fix/outage-notices` (F9, F10, F16)
- On a database error, the session callback returns a session with `error: "unavailable"` and no user. It still fails closed. The root layout shows a slim banner from it: "Palvelussa on häiriö: kirjautuminen ja varaukset eivät juuri nyt toimi. Yritä hetken kuluttua uudelleen." `proxy.ts` sends protected pages to the login page, which shows the same notice.
- `getPriceList()` returns `unavailable: true` on failure. The price pages then show "Hinnat eivät juuri nyt lataudu. Kysy hintoja: info@…" instead of empty tables. The invoice presets show the same notice.
- Pool `statement_timeout` (30 s) in `utilities/db.ts`. The sync and the billing close set their own longer limit first, where they need one. Check the longest real sync time before choosing the number.

### PR 5 `feature/loading-states` (F11)
- `loading.tsx` with a light skeleton in `app/admin/` and `app/jasenalue/`. One file per segment is enough: the layouts and navs stay, and only the content shows a skeleton.
- `ensureFreshSync()`: when a copy exists, the page renders it at once and the stale sync runs after the response (`after()` from `next/server`). Only an empty copy still waits. `SyncStatus` already says when the copy was read, and it can add "päivitetään…" while a run is going.

### PR 6 `fix/guest-and-drafts` (F13, F21)
- Guest "Varaus tallennettu": "Varausta ei voi muuttaa verkossa. Muutokset ja peruutukset: <contact from data/contacts.json>."
- A `sessionStorage` draft for the bulletin editor, the flight entry form and the paper-page grid. It is cleared on save and restored with a note, "Palautettiin tallentamaton luonnos", plus a "Tyhjennä" link.

### Decisions (the user, 2026-11-07)
1. **No email work for now.** No self-service password reset (F14) and no guest confirmation email (F13). The guest screen only gets the contact text, and "Unohtuiko salasana?" keeps pointing to the contacts.
2. **Unify the server action results (F18) where relevant.** It's part of PR 2: one `ActionResult` type in `utilities/actionResult.ts`, and the `{ success }` actions (bulletins, users, profile, reset links) converted to `{ status }`.

### Testing
- `e2e/errors.spec.ts` (new):
  - offline save of the profile with `context.setOffline(true)`: a Finnish message, and the input is still there;
  - a mocked `x-nextjs-action-not-found` answer in the calendar and in a form: the "Sivusto on päivittynyt" message;
  - `/auth/virhe?error=AccessDenied`: the Finnish text;
  - a logged-out visitor to `/jasenalue/profiili`: the login page, then back to the profile after login;
  - the 404 on a phone-sized screen.
- Unit test for the `callAction()` error mapping and the `?error=` texts.
- The outage cases (F6, F9, F10) can't run in e2e. They are covered by unit tests of the mappings, and checked once by hand against a server with `DATABASE_CONNECTION_STRING` pointing at a closed port, as I did here.
