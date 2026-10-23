# Flight log

How the flight log works as of October 2026. `FLIGHT_LOG_PLAN.md` describes the whole plan, and which parts are still to come; `FLIGHT_LOG_SETUP.md` connects an environment to a Google Sheet, starting from the empty template `lentopaivakirja-pohja.xlsx`. The feature only runs where `FEATURE_FLIGHT_LOG` is on (`utilities/features.ts`): in dev, in local development and in tests, not yet in production.

## The model

- **Master:** the aircraft's paper journey log (matkapäiväkirja).
- **Digital copy:** the club's Google Sheet, one tab per aircraft (`OH-CON Matkapäiväkirja`). Pilots and the biller enter flights there, and members can also enter them on the website, which writes the rows into the sheet.
- **Website:** reads the sheet into `sheet_flights` and shows it. `sheet_flights` is a read-only copy. A flight is never edited in the database, only in the sheet. That keeps it one-way, with no two-way sync.

The website owns what isn't in the sheet:
- the purpose codes and who pays for each (`flight_purposes`);
- which tab belongs to which aircraft (`aircraft_sheets`);
- which sheet name is which member (`pilot_aliases`);
- which member entered which row on the website (`flight_log_web_entries`);
- who changed a flight's Tila on the website, and when (`flight_status_changes`);
- later, the billing periods.

## The sheet

Columns are found by header text (`SHEET_COLUMNS` in `utilities/flightSheetParser.ts`), so moving a column doesn't break anything. Header case and extra spaces don't matter.

| Kind | Columns | Notes |
|---|---|---|
| Typed in | Päivämäärä, Päällikkö, Oppilas / SIC, Henkilömäärä, Lentoonlähtöpaikka, Laskupaikka, Lentoonlähtöaika, Laskuaika, Laskujen määrä, Lennon tarkoitus, Tankkaus, Öljy, Tuntimittari, Huomiot, Sivunumero, Total matkapäiväkirja, Virhe kirjassa, Huolto | |
| Formulas | Ilmassa oloaika (H−G), Kokonais ilmassaoloaika, Laskujen kokonaismäärä (running totals), Kuukausi, Vuosi | Pre-filled about 1,000 rows down. The next flight goes into the first row with an empty date, never appended below. |
| For the website | **ID**, **Lähde** (`web` / empty), **Tila**, **Laskutusjakso** | Add these four headers at the right edge before the first sync. |

Row 1 has the headers and row 2 the opening totals; flights start on row 3 (`aircraft_sheets.first_data_row`).

**Tila** (billing status):
- *(empty)* = Kirjattu: entered, not yet checked;
- Korjattava: differs from the paper book;
- Tarkistettu: matches the paper book;
- Laskutettu or Ei laskuteta: set when a billing period closes;
- Maksettu.

The first three are set on `/admin/lennot` (below) or in the sheet. A row with one of the last three belongs to billing and is no longer changed from the website.

## Sync

`utilities/flightSync.ts` → `syncFlightSheets()`:
1. Takes a Postgres advisory lock, so only one sync runs at a time.
2. Reads every active tab in one request per tab (unformatted values, serial dates).
3. Parses the rows with `parseFlightSheet()`. Rows without a date are formula-only and are skipped.
   - Times are Finnish wall-clock times. Durations are rounded to whole minutes; the sheet has float drift such as 12:32:59.
   - A landing earlier than the takeoff is after midnight.
4. Writes a new UUID into the ID column of every row that has none, or that has an ID copied from another row. This is the only thing the sync writes to the sheet; the entry form below writes flights.
5. In one transaction per tab:
   - upserts the rows into `sheet_flights` (unchanged rows aren't rewritten);
   - marks rows that disappeared with `missing_since`;
   - replaces that tab's `sheet_flight_issues`.
6. Records the run in `sheet_sync_runs` (the last 200 are kept).

It runs in three ways:
- when `/admin/lennot` or `/jasenalue/lentopaivakirja` opens and the copy is more than 10 minutes old (`ensureFreshSync`);
- from the **Synkronoi nyt** button;
- after a pilot name is matched to a member;
- after a member enters or undoes a flight.

The last three wait up to 30 s for a sync that is already running, instead of skipping.

A failing sheet doesn't break the pages: they show the last copy and the error.

**Issues** (`findFlightIssues`) are shown on `/admin/lennot`; they don't stop the sync:
- missing fields;
- an unknown purpose code;
- a pilot name not matched to a member: every PIC, and the student of a dual training flight;
- times that don't make sense;
- two rows with the same takeoff;
- an hour meter that goes backwards;
- an unknown Tila.

A training flight without a student is not an issue: on a solo flight the student is the PIC.

## Entering flights on the website

`/jasenalue/lentopaivakirja/uusi` (`LOG_OWN_FLIGHT`) is one screen for a day's flights on one aircraft. The paper book stays the master: the form is for pilots who want their flights in the sheet before the biller copies the book.

- **Who:** the member is the PIC, or the student with the instructor as the other pilot. The other pilot is typed as written in the sheet, with the names already in it as suggestions.
- **Date:** Tänään and Eilen chips or any earlier date, never one in the future (Finnish time).
- **Legs:** "+ Seuraava lento samana päivänä" adds a leg that starts where the last one landed, with the same purpose. Times take `1405`, `14.05`, `14,05` or `14:05`, and "Nyt" fills in the current Finnish time. A landing earlier than the takeoff is after midnight. Hour meter, fuel, oil and remarks are optional.
- **Footer:** total time, and an estimate for billed purposes from the per-minute price in `data/prices.json`. Billing itself comes later.

**Sheet name.** The form writes the member's `pilot_aliases` name. A member without one gets the club's usual form, `M.Meikäläinen` from "Matti Meikäläinen" (`sheetNameFor`), or else the full name, saved as their alias so the flights match at once. Only a name that isn't in the sheet or in `pilot_aliases` yet is taken this way: an existing "M.Meikäläinen" may be another pilot, and taking it would give the member that pilot's flights and bills. When both names are in use, the form asks the member to have the biller match their name on `/admin/lennot`.

**Writing** (`utilities/flightSheetWriter.ts`):
1. A Postgres advisory lock per aircraft, so two members never get the same rows.
2. Reads the tab, and the airborne-time column as formulas. The flights go into the formula rows after the last flight (`findWritableRows`): rows where the formula is there and every typed-in column is empty. It stops at the first row someone has typed into, so it never writes past a half-filled row.
3. Writes only the typed-in columns, plus `ID` and `Lähde` = `web`, with `USER_ENTERED`: ISO dates and `HH:MM` times, which Sheets reads as a date and a time. Names, remarks and other text get a leading apostrophe, so Sheets keeps them as typed and a remark can never become a formula. The formulas stay.
4. Reads the rows back and checks the IDs, then records the rows in `flight_log_web_entries` and syncs.
5. When the formula rows run out, it refuses and asks the member to tell the biller, who drags the formulas further down.

If the save fails, the form keeps what was typed so it can be sent again.

**Undo.** "Kumoa viimeisin" on the confirmation clears a flight the member entered, while it is still the last flight in the tab, came from the website and has no Tila. Clearing empties the typed-in cells and keeps the formulas. Anything older is fixed by the biller in the sheet, so the running totals never get a gap.

Try it on a copy of the spreadsheet before it writes to the real one (see the checklist at the end).

## Checking flights against the paper book

On `/admin/lennot` (`MANAGE_FLIGHT_LOG`), the biller ticks the rows that match the paper book and sets their Tila: **Merkitse tarkistetuksi**, **Korjattava**, or **Palauta kirjatuksi** (empty again). The **Tarkistamatta** view lists every flight of the aircraft that isn't Tarkistettu yet or already in billing, oldest first, across months; **Kuukausittain** is one month, as before.

`setFlightStatuses()` in `utilities/flightSheetWriter.ts`:
1. Takes the aircraft's lock and reads the tab.
2. Finds each flight by its ID, so a row that moved still gets the right status.
3. Refuses the whole change when a flight changed in the sheet after the page was opened. The page sends each row's `input_hash`, a hash of the typed-in fields only (`utilities/flightInputHash.ts`), so a fix in a row above, which moves the running totals, doesn't count. A Tarkistettu mark therefore always means "matches what I saw".
4. Refuses rows that are Laskutettu, Ei laskuteta or Maksettu.
5. Writes only the Tila cells, as plain text, and records each change in `flight_status_changes` with the admin and the time. The table shows the latest one under the status.
6. Syncs, also after a refusal, so the reloaded page shows what changed.

## Typing in a page of the paper book

`/admin/lennot/tuonti` (`MANAGE_FLIGHT_LOG`, the **Kirjaa paperisivu** button on `/admin/lennot`) is a grid for one page of the journey log, typed or pasted from a spreadsheet as tab-separated rows (`utilities/paperPage.ts`):
- **Grid:** dates as `14.6.2025`, `14.6.25` or `14.6.`; an empty date or a `"` mark repeats the line above. Times take the same shorthand as the member form. Enter and the arrow keys move between lines.
- **Totals:** the footer adds up the page. Typing the page's printed sum and landings shows whether they match.
- **Tarkista sivu** syncs, then pairs each line with a flight already in the sheet: same day, takeoff within 15 minutes, or the same PIC with overlapping times. Each line is one of:
  - **Uusi**: not in the sheet, appended like a member's entry;
  - **Sama**: a pilot entered it already, and it is confirmed;
  - **Eroaa**: a pilot entered it with other details, listed as "lasku 11:03 → 11:05". By default the sheet row is corrected to the paper, which is the master. It can also be added as a separate flight, or skipped.
  - Lines already in billing are skipped. Flights in the sheet on the page's days that no line matched are listed under the grid: they are on the next page, or extra.
- **Tallenna sivu taulukkoon** writes everything in one batch under the aircraft lock (`writePaperPage`). Every flight of the page gets Tila Tarkistettu and the page number. A correction rewrites only what the paper says (date, pilots, persons, route, times, landings, purpose, and the remark if the paper has one), so fuel, oil and the hour meter stay. Like a status change, it refuses the page if a matched row changed after the check.
- **Review log:** each flight gets a line in `flight_status_changes` with a note such as "Paperisivu 47, korjattu: lasku 11:03 → 11:05". The service account writes the sheet, so the sheet's own history can't say who did it. On `/admin/lennot` the note shows on hover over who checked the flight.

## Billing

`/admin/laskutus` (`MANAGE_BILLING`: admins, and the treasurer role, "Laskuttaja") bills checked flights by period. A treasurer also checks flights, types in paper pages and matches names on `/admin/lennot`, and sees the statistics, but nothing else of the admin site; give the role on `/admin/users`, together with Käyttäjä. `utilities/billing.ts` holds the rules, as pure functions with unit tests; `utilities/billingData.ts` gathers the flights and settings for it.

**Who pays** follows the purpose code (`flight_purposes.payer`, editable on the settings page):
- HAR, MAT, TAR and LAS: the PIC.
- KOU, KOUMAT and KOUHAR: the student, meaning the second pilot, or the PIC on a solo flight.
- The rest: nobody. They are listed apart as "Ei laskuteta".

A payer is a member through `pilot_aliases`. Several sheet names of one member make one bill. A name matched as a non-member is billed under that name. A name not matched at all stops the period from closing.

**Price** is the airborne minutes × the aircraft's per-minute price on the flight's date (`aircraft_rates`):
- the lower price applies to members who paid that calendar year's equipment fee (`equipment_fee_seasons`), and to training flights, since students are exempt from the fee until their check flight;
- everyone else pays the higher price.

OH-CON starts at 3,10 / 5,00 €/min, as in `data/prices.json`. That file is the public price list and is edited separately.

**Minimum:** a lone local flight (same departure and arrival) shorter than the aircraft's minimum is billed the minimum (30 min for OH-CON), as a "Minimilaskutus" line. Consecutive flights by the same payer on the same day, and trips to another field, have no minimum, as in the price list.

**Free hour:** for equipment-fee payers, per calendar year, on the aircraft set on the settings page (OH-CON). After every 600 paid minutes the next 60 are free, shown as a "Hyvitys" line. The count runs in billing order:
1. the year's flights billed before the website did billing, or not yet billed;
2. then the minutes in closed periods;
3. then this period's flights in date order.

**Periods:** a period is a date range with a name, e.g. `2026-10`; periods don't overlap.
- **Open period:** it is worked out from the synced flights each time it is shown. It includes the flights dated in it that the website hasn't billed and whose Tila isn't already Laskutettu, Ei laskuteta or Maksettu (those were billed by hand). The first open period also takes late entries, flights dated inside a period that has already closed.
- **Blockers:** unchecked flights (not Tarkistettu), names not matched to a member, unknown purposes, missing airborne time, and aircraft without a price. Each links to where it is fixed.
- **Sulje jakso:** syncs, then stores the lines (`billing_lines`) and per-payer totals (`billing_payers`). It writes Tila Laskutettu or Ei laskuteta and the period's name in Laskutusjakso for every flight of the period, checking each row's `input_hash`, and commits the database only after the sheet write has succeeded. A closed period can't be reopened or removed.
- **Merkitse maksetuksi:** per payer, writes Maksettu for their flights. "Peru" puts back Laskutettu.
- **Changes after closing:** a flight that changes in the sheet after its period closed is flagged there ("Muuttunut laskutuksen jälkeen"). The first open period then gets a "Korjaus" line with the difference: a new payer is credited and billed separately, and a removed flight is credited. Corrections leave out the minimum and the free hour.

**Output:**
- CSV of every line, or one row per payer (`?taso=maksajat`), in Finnish Excel format, for the accounting software;
- printable summaries, one page per payer (`/admin/laskutus/[id]/tuloste`);
- members see their closed periods, with lines and whether they are paid, on `/jasenalue/lentopaivakirja` (`VIEW_OWN_BILLING`).

**Settings** (`/admin/laskutus/asetukset`): prices per aircraft from a date, the equipment-fee members per season, the free hour, and who pays for each purpose.

## Statistics

`/admin/tilastot` (`VIEW_STATISTICS`: admins and treasurers) shows a year of the flight log, for one aircraft or all, counting every row of the sheet whatever its Tila. The arithmetic is in `utilities/flightStats.ts` (pure, unit-tested) and the reads in `utilities/statsData.ts`.
- **Totals** for the year with the change from the previous one, and **month by month** with the previous year beside it.
- **Per pilot**, as PIC and as student or second pilot. Sheet names matched to a member count together under the member's name.
- **Per purpose code.**
- **Lentotoimintailmoitus**, Traficom's annual report per aircraft, grouped as the club's sheet does it:
  - koululennot (KOU, KOUMAT, KOUHAR);
  - DTO-koulutus (those and TAR);
  - muu yksityislentotoiminta (HAR, MAT, SII, ESI, KOE);
  - palo-, etsintä-, hinaus- ja laskuvarjolennot;
  - unknown codes, listed separately;
  - the total.

  Beside it, the year from the sheet's running totals, and where they stood at the year's end. When the two don't agree, it says so.
- **Esittelylentopäivät:** the days in the year with ESI flights, against the limit of 6 in OPS M1-33, with flights, passengers and pilots per day.
- **Vuosittain:** hours per aircraft per year. Years the flight log has are counted from its flights. Earlier ones are pasted in as a table (header row of registrations, then a year and hours per row, as in the sheet's yearly statistics), are kept in `aircraft_year_totals`, and can be removed one by one. The real numbers are not in the repository.

**Lataa Excel** downloads the same as a workbook, one tab per section, with times as durations (`utilities/statsWorkbook.ts`, written by `utilities/xlsx.ts`).

The admin front page has a flight-log panel when the feature is on: the sync, flights still to check, the sheet's notes, the open billing period or unpaid bills, and the intro-flight days used.

## Pages

- **`/admin/lennot`** (`VIEW_ALL_FLIGHTS`; changes need `MANAGE_FLIGHT_LOG`):
  - the sync status and the issues;
  - matching sheet names to members;
  - one month of flights per aircraft, or every flight still to check, with totals, links into the sheet and the Tila actions above.
- **`/admin/lennot/tuonti`:** a page of the paper book into the sheet (above).
- **`/admin/laskutus`**, **`/admin/laskutus/[id]`** (with `/csv` and `/tuloste`) and **`/admin/laskutus/asetukset`:** billing (above).
- **`/admin/tilastot`** (with `/xlsx`): statistics (above).
- **`/jasenalue/lentopaivakirja`:** the member's own flights, as PIC or as the second pilot or student, by month, with this year's total, and their bills from closed periods. Linked from the user menu ("Lentopäiväkirja") when the feature is on.
- **`/jasenalue/lentopaivakirja/uusi`:** the entry form above.

## Development and tests

`utilities/flightSheetSource.ts` picks the source:
- `FLIGHT_SHEET_SOURCE=google` reads a Google Sheet with `GOOGLE_SERVICE_ACCOUNT_KEY` (the key file, as JSON or base64) and `FLIGHT_LOG_SPREADSHEET_ID`. The service account needs editor access to the spreadsheet; `FLIGHT_LOG_SETUP.md` has the steps. When Google refuses, the sync card on `/admin/lennot` says what to fix (`utilities/googleSheetsSetup.ts`).
- `FLIGHT_SHEET_SOURCE=fixture` reads `e2e/fixtures/flight-sheet.json`, a synthetic tab with no real flights or names. It's held in memory, so the IDs the sync writes and the flights the form enters last until the server restarts. The fixture keeps values only, so a number in the airborne-time column stands for a formula row.

Without the variable, Google is used when it's configured, and the fixture otherwise under `next dev`. Playwright always uses the fixture, so tests never touch the club's sheet.

- `bun run test:unit` runs the parser and form-input tests in `tests/unit/`.
- `e2e/flight-log.spec.ts` covers the admin page, the sync, name matching and the member's list.
- `e2e/flight-entry.spec.ts` enters two flights as the e2e admin, checks them in the own list and undoes them.
- `e2e/flight-review.spec.ts` marks two flights checked, including the refusal when a row changed, and puts them back.
- `e2e/flight-stats.spec.ts` opens the statistics as the treasurer, downloads the workbook, types in and removes an earlier year, and checks the admin front page's panel.
- `e2e/flight-billing.spec.ts` bills a one-day period from start to end: a paper page, name matching, the equipment fee, the minimum, closing, payment, the CSV and the member's view.
- `e2e/flight-paper-page.spec.ts` pastes a paper page that confirms one flight, corrects one and adds one, then puts the corrected one back. The added flight stays in the dev server's copy of the fixture until it restarts, so the fixture has spare formula rows for many runs.

Migration `007_flight_log_web_entries.sql` adds `flight_log_web_entries`, `008_flight_status_changes.sql` adds `flight_status_changes` and `sheet_flights.input_hash`, and `009_flight_review_notes.sql` adds `flight_status_changes.note`, and `010_billing.sql` the billing tables, and `011_aircraft_year_totals.sql` the earlier years' hours.

The entry spec logs its flights on OH-TST, a test aircraft with a tab of its own in the fixture: undo works only on a tab's last row, and the other specs add rows to OH-CON's tab at the same time.

## Before switching it on for the real sheet

1. Add the ID, Lähde, Tila and Laskutusjakso headers at the right edge of each aircraft's tab, and give the service account editor access.
2. Fill Tila down as **Laskutettu** for every flight that has already been billed the old way. Otherwise they all show up under Tarkistamatta, and later as unbilled.
3. On a copy of the spreadsheet, try one save, one undo and one status change: `USER_ENTERED` follows the spreadsheet's locale.
4. On `/admin/laskutus/asetukset`, check the prices and the minimum, tick the members who paid this season's equipment fee, and check the free hour.
5. Start the first billing period after the last flight billed by hand. Flights before it, and those with Tila Laskutettu, are not billed again.
