# Plan: flight log, billing, statistics and the dev-branch rework

**Date:** 2026-10-20
**Status:** decided; the booking work and the flight log sync (PR 3) are in review. `FLIGHT_LOG.md` describes what is built.

The plan draws on web research into club logbook products (Laskukierros, Vereinsflieger, myWebLog, OpenFlyers, Flight Circle, FlightLogger and others), the EASA and Traficom rules, architecture and UX patterns, and an audit of the booking, admin and bulletin code on `dev`. It covers:

- the flight log, billing and statistics, rebuilt around the club's real Google Sheet;
- fixes to the booking calendar, admin users and bulletins;
- the unfinished content pages.

## Decisions

| Topic | Decision |
|---|---|
| Master record | The aircraft's paper journey log (matkapäiväkirja). The website is for tracking and billing. |
| Digital ledger | **Sheet first.** The club's Google Sheet stays the place where flight rows live. Postgres holds a read-only copy synced from it. No two-way sync. |
| Spreadsheet layout | One spreadsheet, one tab per aircraft. Only `OH-CON Matkapäiväkirja` exists today. |
| Who enters flights | Pilots, in the sheet or through the website form. The biller checks every row against the paper book and can enter rows in bulk. |
| Time basis | Takeoff and landing clock times → airborne minutes. The hour-meter reading is optional. |
| Billing | Airborne minutes × the aircraft's per-minute rate. 3.10 €/min with the season's equipment fee, 5.00 €/min without. Output is a per-pilot summary per period plus a CSV for the accounting software. No invoices or payment ledger in the site. |
| Who pays | KOU, KOUMAT, KOUHAR: the student — the Oppilas/SIC column, or the PIC on a solo flight, which has no second pilot (34 such rows in the real data). HAR, MAT, TAR, LAS: the PIC. SII, KOE, ESI, PALO, PALOHAR, SAR, SARHAR, HIN: nobody. Stored per purpose code and editable. |
| Free hour | See "Free-hour credit" below. |
| Scope now | Logging, history, billing per period, statistics and reports. Later: maintenance-due tracking, fuel log, intro-flight register. |
| Bookings | Overlaps are allowed with a warning. Anonymous visitors may only create guest bookings. OH-PDX is not bookable. Month stays the default view. |
| Users | "Delete" deactivates the account: login is disabled and history is kept. A separate "Anonymise" action handles erasure requests. Hard delete only for accounts with no history. Admins and the member can both edit the member's details; passwords change only through a reset link. |
| Admin settings | Remove the mock `/admin/settings`. The flight-log settings live under `/admin/lennot/asetukset`. |
| Bulletins | Draft and publish steps. |

## 1. Flight log architecture (sheet first)

**Invariant:** flight rows are written only to the Google Sheet. Postgres holds a copy rebuilt from the sheet, plus what the website owns: purpose codes, rates, pilot-name mapping and billing periods. When the website changes a flight, it writes to the sheet through the API and then re-syncs. It never edits its copy.

### The sheet today
Columns, from `OH-CON Matkapäiväkirja`:

| Col | Field | Kind |
|---|---|---|
| A | Päivämäärä | input |
| B | Päällikkö (PIC) | input |
| C | Oppilas / SIC | input |
| D | Henkilömäärä | input |
| E | Lentoonlähtöpaikka | input |
| F | Laskupaikka | input |
| G | Lentoonlähtöaika | input |
| H | Laskuaika | input |
| I | Ilmassa oloaika | **formula** `H−G` |
| J | Kokonais ilmassaoloaika | **formula**, running total |
| K | Laskujen määrä | input |
| L | Laskujen kokonaismäärä | **formula**, running total |
| M | Lennon tarkoitus | input |
| N | Tankkaus | input |
| O | Öljy | input |
| P | Tuntimittari | input |
| Q | Huomiot | input |
| R | Sivunumero / Matkapvkirja # | input |
| S | Total matkapäiväkirja | input |
| T | Virhe kirjassa | input |
| U | Huolto | input |
| V | Ilmassaoloaika huoltojen välillä | input |
| W | Kuukausi | **formula** |
| X | Vuosi | **formula** |

- The formulas are pre-filled down to about row 1000.
- Row 2 holds the opening balance of the running totals.
- The Laskutus tab bills `I × 1440 × 3.1` and skips SII, KOE, ESI, PALO, PALOHAR, SAR, SARHAR and HIN.

### New columns, at the right edge
| Column | Content | Written by |
|---|---|---|
| `ID` | UUID | the website for its own rows; the sync fills empty cells |
| `Lähde` | `web` / `käsin` | the website |
| `Tila` | billing status (dropdown) | see below |
| `Laskutusjakso` | period label, e.g. `2026-10` | the website, when a period closes |

The service account gets editor access to the spreadsheet.

### Billing statuses (`Tila`)
| Tila | Meaning | Set by |
|---|---|---|
| *(empty)* = Kirjattu | Entered on the web or by hand, not yet compared with paper | — |
| Korjattava | Differs from the paper book; the reason goes in Huomiot | the biller (site or sheet) |
| Tarkistettu | Matches the paper book | the biller (site or sheet) |
| Laskutettu | In a closed period and included in the pilot's summary | the website, on period close |
| Ei laskuteta | Non-billable purpose, period closed | the website, on period close |
| Maksettu | The pilot has paid that period's summary | the biller, per pilot per period |

Rules:
- A pilot can edit or delete their own web rows only while they are Kirjattu or Korjattava.
- A period can close only when every row in it is Tarkistettu. The other rows are listed as blockers.
- Edits made in the sheet to a Laskutettu or Maksettu row are flagged ("muuttunut laskutuksen jälkeen"). They are corrected with a line in the next period, never by reopening the closed one.
- The database records who changed a status and when.

### Writing to the sheet
Used by the member form, bulk entry and status changes.
1. Validate with Zod, then take a per-aircraft lock (`pg_advisory_xact_lock`).
2. Read column A and take the first empty row inside the formula region. Never append, because the row would land below the formulas.
3. `values.batchUpdate` only the input columns, plus `ID` and `Lähde`, with `USER_ENTERED`. Check date/time parsing against a copy of the real sheet first; it depends on the spreadsheet locale.
4. Read the row back, check the ID, then sync that tab.
5. If the formula rows have run out, refuse with a clear message.
6. If Google is unreachable, the save fails visibly and the form keeps a local draft. The paper book is the master, so there is no outbox for now.

### Syncing the sheet into Postgres
- **Read:** one `values.batchGet` per run with `UNFORMATTED_VALUE` and `SERIAL_NUMBER`. Times are rounded to whole minutes, because the sheet has float drift such as `12:32:59`.
- **Store:** upsert by `ID`, keeping tab, row number, raw row, content hash and parsed fields. Rows that disappear get `missing_since`.
- **Flag for the biller:**
  - airborne time ≠ landing − takeoff;
  - breaks in the J or L running totals (this is where "Virhe kirjassa" rows show up);
  - unknown purpose code;
  - pilot name with no mapping;
  - landing before takeoff (offer +1 day);
  - likely duplicates (same aircraft and date, takeoff within 5 minutes);
  - hour-meter gaps.

  A training row with no student is not an issue: it's a solo flight.
- **When it runs:**
  - an Ofelia job every 15 minutes, using the same pattern as `cronjobs/update-metar`;
  - after every web write;
  - from a "Synkronoi nyt" button.

  The admin page shows the last run and its errors.
- **Testing:** the sheet sits behind a small `FlightSheet` interface with two implementations: Google, and a fixture built from the anonymised ODS. Local dev, e2e and CI never touch the real sheet. The parser, the time shorthand and the pricing get `bun test` unit tests.

### Database (one migration plus `postgres/init/`)
- `aircraft_sheets`: registration → spreadsheet ID + tab name.
- `flight_purposes`: code, name, payer (`pic` / `student` / `none`), is_training, Traficom category, active. Seeded with the 15 codes in the sheet.
- `aircraft_rates`: registration, valid_from, cents per minute with and without the equipment fee.
- `pilot_aliases`: a name as written in the sheet (`M.Meikäläinen`) → user, nullable for non-members. Members also get a "log name" that the form writes.
- `equipment_fee_seasons`: member + season.
- `sheet_flights`, `sheet_flight_issues`, `sheet_sync_runs`.
- `billing_periods`: start, end, closed_at, closed_by. `billing_lines`: period, flight, payer, minutes, rate, amount, snapshot hash.

`billable_items` and migrations 002/003 exist only on `dev`, so a new migration can drop them without touching prod.

### Removed from `dev`
- The Hobbs-based model and schema, and the `flight_type` enum.
- `utilities/googleSheets.ts`: it writes an invented column layout, uses "max + 1" log IDs, and writes to the sheet before the database.
- The `billable_items` code, the 4-step wizard and the edit modal.

Kept: the page shell, the permission names, and one shared airfield picker.

### Free-hour credit
`prices.json` says active pilots get one free hour after every 10 paid hours in the same season.

- **Who:** per pilot, per calendar year, on OH-CON, for members with the equipment fee that season.
- **How:** counted in flight order across periods. After each 600 paid minutes, the next 60 billable minutes are free.
- **Display:** a separate "Hyvitys" line in the summary.
- **Switch:** it can be turned off in the flight-log settings.

## 2. Member pages
- **`/jasenalue`:** a hub linked from the user menu, with links to Profiili, Lentopäiväkirja and Omat yhteenvedot.
- **`/jasenalue/lentopaivakirja`:** your own flights (matched through the name mapping), grouped by month with totals and their status.
- **`/jasenalue/lentopaivakirja/uusi`:** one screen, not a wizard.
  - **Prefill:** the aircraft from today's booking, Tänään/Eilen date chips, PIC = you, a student/SIC picker, persons on board.
  - **Route:** EFSA → EFSA by default. Recently used fields come from the sheet (EFPN, EFVR, EFJO, EFRN, JÄÄ, EFMI, …). Most of these are missing from `airfields.json`, and the current ICAO regex rejects `JÄÄ`.
  - **Times:** Lähtö and Lasku are text fields with a "Nyt" button. They accept `1405`, `14.05` and `14:05`. A landing before takeoff offers +1 day.
  - **Purpose:** chips filled from `flight_purposes`.
  - **Collapsed section:** hour meter, fuel, oil, remarks.
  - **Sticky footer:** duration and estimated cost, 0 € for non-billable purposes.
  - **After saving:** a toast with undo, "+ Seuraava lento" (departure = previous arrival; same aircraft and purpose), and "Toista" for intro-flight days.
  - **Mobile basics:** 16 px inputs, 44 px touch targets, `inputmode="decimal"` text fields instead of `type=number`, and "today" computed in `Europe/Helsinki` with Luxon.

## 3. Biller and admin pages
- **`/admin/lennot`:** synced rows with filters (aircraft, period, unchecked, has issues).
  - Bulk "Merkitse tarkistetuksi" sets `Tila` in the sheet.
  - The issues list, an "Avaa taulukossa" link per row, and the sync status.
- **`/admin/lennot/tuonti`:** bulk entry from the paper book.
  - Choose the aircraft and paper page, then use a keyboard-first grid that accepts pasted rows.
  - Rows already in the sheet for that date range are shown, so pilot-entered flights get confirmed instead of typed twice.
  - Enter the page's printed totals and the grid shows where they diverge.
  - The rows are written in one batch.
- **`/admin/lennot/asetukset`:** sync status, aircraft ↔ tab, rates, purpose codes and payers, equipment-fee seasons, the free-hour switch, and pilot-name mapping.
- **`/admin/laskutus`:** billing periods.
  - Per pilot: minutes, landings and amount, with non-billable flights listed separately.
  - "Sulje jakso" snapshots the lines.
  - A printable per-pilot summary, like the sheet's TEMPLATE tab, and a CSV.
- **`/admin/tilastot`:**
  - per pilot, per purpose, and a monthly pivot for board minutes;
  - per aircraft per year since 2002, seeded from the Tilastot tab for 2002–2022;
  - a helper for Traficom's annual lentotoimintailmoitus per aircraft: flights, hours and landings by category plus airframe totals, due 31.1;
  - a counter of intro-flight (ESI) days, limited to 6 per calendar year by OPS M1-33 §2.3;
  - CSV/XLSX export. Take SheetJS from cdn.sheetjs.com, not the npm `xlsx` 0.18.5, which has known CVEs.
  - Charts with Recharts or `@ant-design/charts`. Plain SQL views are enough at this data size.
- **`/admin` dashboard:** replace the counts with action items (rows to check, sync errors, the open period, issues).
  - Add Lennot, Laskutus and Tilastot to `adminNav`.
  - Make the nav fit a phone; today it is 652 px wide on a 390 px screen.

## 4. Booking calendar
### PR 1 (security)
- Server actions derive identity and roles from the session and check permissions.
- Booking data sent to the browser is limited by role:
  - anonymous visitors get "Varattu" blocks with the aircraft and type;
  - members also see names;
  - only `VIEW_BOOKING_CONTACT_INFO` sees contact details.
- Unused server actions are removed.
- Guest bookings work again.

### PR 2 (bugs and improvements)
- **Errors:** save errors must stay in the modal; today it closes silently and a guest loses their input.
- **Recurring bookings:**
  - Do the time math with Luxon in `Europe/Helsinki` inside a transaction, so a series doesn't shift by an hour at DST changes.
  - Keep the repeat end date out of `end_time`.
  - Cap the series length.
- **Time zones:** fetch ranges in Helsinki days, not UTC days. Fix the month view showing a one-day full-day booking on the next day too.
- **Overlaps:** check them on the server and warn in the modal ("Varaa silti"). The week and day views show every overlapping booking.
- **Aircraft list:** `planes.json` gets `bookable`; OH-PDX is `false`, and every list reads from there.
- **"Lisää kalenteriin":**
  - an `/api/varaukset/[id]/ics` route that serves `text/calendar`, so iPhones open "Add to Calendar";
  - a Google Calendar link;
  - the button shown right after creating a booking;
  - the whole series exported for recurring bookings.
- **Look:**
  - `bg-black/30` overlay instead of the solid black one;
  - readable text on the type colours;
  - one month header, and a working selected-day highlight;
  - a shorter week view;
  - modal styled like the site, with times in Helsinki.
- **Cleanup:** the dead files (`bookingCell`, `timeline`, `addBookingForm`, `utilities/guest.ts`), the 100 ms `setTimeout`, the Zod schemas used on the server too, and refreshed `BOOKING_PHASE*` docs.
- **Later:** "Kirjaa lento" from a past booking, and a hint about unlogged bookings.

## 5. Admin users and bulletins
- **Users:**
  - Deactivate (`users.deactivated_at`; login and session refuse deactivated accounts), Anonymise, and hard delete only without history.
  - Admin editing of member details and the log name.
  - Lowercase emails on write and lookup.
  - Last login shown in Helsinki time.
  - No actions offered on your own row that the server would refuse.
  - Labels tied to inputs, and a phone-friendly users list.
  - Remove `/admin/settings`.
- **Bulletins:**
  - `status` (draft/published) and `published_at` on `bullets`, in `init/` and as a migration.
  - New bulletins start as drafts. Preview them in the public style; "Julkaise" and "Palauta luonnokseksi" switch the status. The public site shows published bulletins only.
  - One shared Zod schema with a required title and length limits.
  - Render `<Bulletings />` once on the home page.
  - Full titles on phones, and an archive.

## 6. Content pages
- **Historiaa:** written from the "Historiaa" pages of `data/SaLKo nettisivut sisältö 12-2024.pdf` and the `CMS2_content` articles in `data/lentokerho.sql`, as a timeline in `data/history.json`. Take only the article text from the dump; it also contains user tables and must stay gitignored.
- **Hallit:** a short text page without photos. The PDF has the hall facts (280 m² from 1978, 350 m² insulated from 1992, 17 m door) and `prices.json` has hangar spaces. Add photos later.
- **Kuvagalleria:** later, once there are photos. The dump has only the old gallery's metadata. Build on `components/imageGallery.tsx`.

## 7. Order (one PR each, through `dev`)
1. Booking security fix (+ `server-only` for `googleSheets.ts`) → promote to `main`.
2. Booking bugs and improvements.
3. Sheet adapter, parser, sync, the copy in Postgres, purposes/rates/aliases, and a read-only `/admin/lennot`. Removes the old flight-log code.
4. Member entry form, history and the `/jasenalue` hub.
   - Done: the form, writing into the formula rows, undo of the latest own entry, the user-menu link. See `FLIGHT_LOG.md`.
   - Still open: prefilling the aircraft from today's booking (only OH-CON has a tab, so it can wait), "Toista" for intro-flight days, a draft kept over a reload, and the `/jasenalue` hub, which waits until there are summaries to link to.
5. Biller tools: status changes and bulk entry.
   - Done: Tila from `/admin/lennot` with the "Tarkistamatta" view, the changed-row check and `flight_status_changes`.
   - Done: bulk entry from the paper book (`/admin/lennot/tuonti`): paste, ditto marks, page totals, matching with pilots' entries, corrections to the paper, and a note per flight in the review log.
   - Moved to the billing PR, which is the first to use them: the rates, equipment-fee seasons and free-hour switch of `/admin/lennot/asetukset`.
6. Billing periods and summaries.
   - Done: periods with blockers, closing (lines plus the sheet's Laskutettu, Ei laskuteta and Laskutusjakso), payments (Maksettu), corrections after closing, CSV, printable summaries, the members' view, and settings (prices with the 30-min minimum from the price list, equipment-fee members, free hour, payer per purpose). See "Billing" in `FLIGHT_LOG.md`.
   - Done: the "laskuttaja" (treasurer) role: billing and the flight log, not the rest of the admin site; admins keep billing.
7. Statistics, reports and the admin dashboard.
   - Done: `/admin/tilastot` (year and aircraft; months against the previous year, pilots, purposes, the Traficom report with a counter check, intro-flight days against 6, hours per year with earlier years pasted in), an Excel export, and the flight-log panel on `/admin`. Charts are plain bars; no chart library.
   - Not done: the intro-flight register with passengers' contact details (backlog), and per-member yearly summaries on `/jasenalue`.
8. Admin users and bulletins (independent, any time after 1).
9. Historiaa and Hallit (independent).

### Backlog
- **METAR widget (`components/weatherWidget.tsx`):**
  - a wind arrow with gusts, and the crosswind for the EFSA runway;
  - VFR/MVFR/IFR from ceiling and visibility;
  - CAVOK and weather codes (RA, SN, BR, …) in Finnish;
  - the temperature/dew-point spread as a fog and icing hint;
  - the observation's age, with a warning when it is stale;
  - a trend from the 7 days kept in `metar_data`.
- Maintenance-due tracking (annual/100 h with ±1 month / ±10 h, plus the 50/200 h items in the maintenance programme), a fuel and oil log, and a defect list.
- Intro-flight register (OPS M1-33 §2.2): date, registration, PIC, count, safety person, Traficom notification, designated pilots, the 6-day counter and 2-year retention. Keep passenger contact details only briefly; the aviation rules don't require them.
- Fuel excise refund helper: flight time per Vero category, from the purpose codes.
- Pilot logbook export in AMC1 FCL.050 column order.

## Reference
- **Laskukierros.fi** is the de facto Finnish club system (about 27 clubs, €9 per user per year). It covers logging and billing but has no Google Sheet. It stays a fallback only.
- **Journey log:** AMC1 NCO.GEN.150 lists its content and allows non-paper form.
- **Aircraft records:** ML.A.305 requires total time, cycles and landings, and corrections that keep the original entry visible.
- **Retention:** bookkeeping law requires 6 years for vouchers and 10 years for the books.
