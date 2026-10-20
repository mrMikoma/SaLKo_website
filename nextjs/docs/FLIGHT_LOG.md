# Flight log

How the flight log works as of October 2026. `FLIGHT_LOG_PLAN.md` describes the whole plan, and which parts are still to come. The feature only runs where `FEATURE_FLIGHT_LOG` is on (`utilities/features.ts`): in dev, in local development and in tests, not yet in production.

## The model

- **Master:** the aircraft's paper journey log (matkapäiväkirja).
- **Digital copy:** the club's Google Sheet, one tab per aircraft (`OH-CON Matkapäiväkirja`). Pilots and the biller enter flights there; the website will write rows into it too (coming later).
- **Website:** reads the sheet into `sheet_flights` and shows it. `sheet_flights` is a read-only copy. A flight is never edited in the database, only in the sheet. That keeps it one-way, with no two-way sync.

The website owns what isn't in the sheet:
- the purpose codes and who pays for each (`flight_purposes`);
- which tab belongs to which aircraft (`aircraft_sheets`);
- which sheet name is which member (`pilot_aliases`);
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

## Sync

`utilities/flightSync.ts` → `syncFlightSheets()`:
1. Takes a Postgres advisory lock, so only one sync runs at a time.
2. Reads every active tab in one request per tab (unformatted values, serial dates).
3. Parses the rows with `parseFlightSheet()`. Rows without a date are formula-only and are skipped.
   - Times are Finnish wall-clock times. Durations are rounded to whole minutes; the sheet has float drift such as 12:32:59.
   - A landing earlier than the takeoff is after midnight.
4. Writes a new UUID into the ID column of every row that has none, or that has an ID copied from another row. This is the only thing the sync ever writes to the sheet.
5. In one transaction per tab:
   - upserts the rows into `sheet_flights` (unchanged rows aren't rewritten);
   - marks rows that disappeared with `missing_since`;
   - replaces that tab's `sheet_flight_issues`.
6. Records the run in `sheet_sync_runs` (the last 200 are kept).

It runs in three ways:
- when `/admin/lennot` or `/jasenalue/lentopaivakirja` opens and the copy is more than 10 minutes old (`ensureFreshSync`);
- from the **Synkronoi nyt** button;
- after a pilot name is matched to a member.

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

## Pages

- **`/admin/lennot`** (`VIEW_ALL_FLIGHTS`; changes need `MANAGE_FLIGHT_LOG`):
  - the sync status and the issues;
  - matching sheet names to members;
  - one month of flights per aircraft, with totals and links into the sheet.
- **`/jasenalue/lentopaivakirja`:** the member's own flights, as PIC or as the second pilot or student, by month, with this year's total.

## Development and tests

`utilities/flightSheetSource.ts` picks the source:
- `FLIGHT_SHEET_SOURCE=google` reads the real sheet with `GOOGLE_SERVICE_ACCOUNT_KEY` and `FLIGHT_LOG_SPREADSHEET_ID`. The service account needs editor access to the spreadsheet.
- `FLIGHT_SHEET_SOURCE=fixture` reads `e2e/fixtures/flight-sheet.json`, a synthetic tab with no real flights or names. It's held in memory, so the IDs the sync writes last until the server restarts.

Without the variable, Google is used when it's configured, and the fixture otherwise under `next dev`. Playwright always uses the fixture, so tests never touch the club's sheet.

- `bun run test:unit` runs the parser tests in `tests/unit/`.
- `e2e/flight-log.spec.ts` covers the admin page, the sync, name matching and the member's list.
