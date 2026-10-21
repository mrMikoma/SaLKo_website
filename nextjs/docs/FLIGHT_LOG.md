# Flight log

How the flight log works as of October 2026. `FLIGHT_LOG_PLAN.md` describes the whole plan, and which parts are still to come. The feature only runs where `FEATURE_FLIGHT_LOG` is on (`utilities/features.ts`): in dev, in local development and in tests, not yet in production.

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

**Sheet name.** The form writes the member's `pilot_aliases` name. A member without one gets the club's usual form, `T.Kuutti` from "Tero Kuutti" (`sheetNameFor`), or else the full name, saved as their alias so the flights match at once. Only a name that isn't in the sheet or in `pilot_aliases` yet is taken this way: an existing "T.Kuutti" may be another pilot, and taking it would give the member that pilot's flights and bills. When both names are in use, the form asks the member to have the biller match their name on `/admin/lennot`.

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

## Pages

- **`/admin/lennot`** (`VIEW_ALL_FLIGHTS`; changes need `MANAGE_FLIGHT_LOG`):
  - the sync status and the issues;
  - matching sheet names to members;
  - one month of flights per aircraft, or every flight still to check, with totals, links into the sheet and the Tila actions above.
- **`/jasenalue/lentopaivakirja`:** the member's own flights, as PIC or as the second pilot or student, by month, with this year's total. Linked from the user menu ("Lentopäiväkirja") when the feature is on.
- **`/jasenalue/lentopaivakirja/uusi`:** the entry form above.

## Development and tests

`utilities/flightSheetSource.ts` picks the source:
- `FLIGHT_SHEET_SOURCE=google` reads the real sheet with `GOOGLE_SERVICE_ACCOUNT_KEY` and `FLIGHT_LOG_SPREADSHEET_ID`. The service account needs editor access to the spreadsheet.
- `FLIGHT_SHEET_SOURCE=fixture` reads `e2e/fixtures/flight-sheet.json`, a synthetic tab with no real flights or names. It's held in memory, so the IDs the sync writes and the flights the form enters last until the server restarts. The fixture keeps values only, so a number in the airborne-time column stands for a formula row.

Without the variable, Google is used when it's configured, and the fixture otherwise under `next dev`. Playwright always uses the fixture, so tests never touch the club's sheet.

- `bun run test:unit` runs the parser and form-input tests in `tests/unit/`.
- `e2e/flight-log.spec.ts` covers the admin page, the sync, name matching and the member's list.
- `e2e/flight-entry.spec.ts` enters two flights as the e2e admin, checks them in the own list and undoes them.
- `e2e/flight-review.spec.ts` marks two flights checked, including the refusal when a row changed, and puts them back.

Migration `007_flight_log_web_entries.sql` adds `flight_log_web_entries`, and `008_flight_status_changes.sql` adds `flight_status_changes` and `sheet_flights.input_hash`.

## Before switching it on for the real sheet

1. Add the ID, Lähde, Tila and Laskutusjakso headers at the right edge of each aircraft's tab, and give the service account editor access.
2. Fill Tila down as **Laskutettu** for every flight that has already been billed the old way. Otherwise they all show up under Tarkistamatta, and later as unbilled.
3. On a copy of the spreadsheet, try one save, one undo and one status change: `USER_ENTERED` follows the spreadsheet's locale.
