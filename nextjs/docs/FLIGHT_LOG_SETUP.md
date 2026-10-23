# Setting up the flight log sheet

How to connect an environment to a Google Sheet for the flight log (`FLIGHT_LOG.md` explains how the sync works). Start with the dev environment (kehitys): it gets its own spreadsheet, made from the empty template in this repo. Production gets the club's real sheet later, with the same steps and the go-live checklist at the end of `FLIGHT_LOG.md`.

The website reaches the sheet as a Google **service account**: a robot user with its own email address. It sees only the spreadsheets shared with that address. Use one service account and one spreadsheet per environment, so a dev key can never touch the real flight log.

| | Dev (kehitys) | Production |
|---|---|---|
| Spreadsheet | made from `docs/lentopaivakirja-pohja.xlsx` | the club's real flight log |
| Service account | `salko-lentopaivakirja-dev` | `salko-lentopaivakirja` |
| GitHub environment secrets | `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` in the `development` environment | the same names in the production environment, added when production goes live |

## 1. Create the dev spreadsheet from the template

`docs/lentopaivakirja-pohja.xlsx` is an empty flight log in the club's layout:
- **Main tab** "OH-CON Matkapäiväkirja", in the real sheet's column order (A–X):
  - the club's formulas pre-filled for 1,000 rows (airborne time, running totals, month, year), in grey;
  - the website's four columns (ID, Lähde, Tila, Laskutusjakso) at the right edge, in blue, with a Tila dropdown.
- **"Ohje" tab**: instructions in Finnish.

`bun run flight-sheet:template` (from `nextjs/`) writes it again from `utilities/flightSheetTemplate.ts`, which takes the headers from the parser, so the two can't drift apart.

1. In Google Drive, in the club's account, choose **New → File upload** and pick the file.
2. Open it with **Google Sheets**, then **File → Save as Google Sheets**. The Sheets API only works on a Google Sheets file, not on an uploaded `.xlsx`. Delete the uploaded `.xlsx` afterwards.
3. Name it, for example, "SaLKo lentopäiväkirja (kehitys)".
4. **File → Settings:** set **Locale** to Finland and **Time zone** to (GMT+02:00) Helsinki. The website types dates and times into the sheet as a person would, and Sheets reads them by these settings.
5. Check:
   - the header row stays in place when you scroll;
   - the grey formula columns are there;
   - the Tila cells have a dropdown.
6. Copy the spreadsheet ID from the address: `https://docs.google.com/spreadsheets/d/`**`<ID>`**`/edit`.

## 2. Create the service account

In [Google Cloud Console](https://console.cloud.google.com/), use the project that has the website's Google login (`GOOGLE_CLIENT_ID`), or a new one.

1. **APIs & Services → Library → Google Sheets API → Enable.**
2. **IAM & Admin → Service Accounts → Create service account.**
   - Name: `salko-lentopaivakirja-dev`.
   - Skip the optional steps: the account needs no project roles. Its only access is the spreadsheet you share with it.
3. Open the new account, then **Keys → Add key → Create new key → JSON**. A key file downloads.
   - The file is a password. Don't commit it, email it or leave it in Downloads. Delete it once it is stored in GitHub (step 4).
   - If Google refuses to create the key, the organization blocks key creation (`iam.disableServiceAccountKeyCreation`), and an organization admin has to allow it for this project.
4. Copy the account's email address (`…@….iam.gserviceaccount.com`). It is also `client_email` in the key file.

## 3. Share the spreadsheet with the service account

In the spreadsheet: **Share**, paste the service account's email, choose **Editor**, untick "Notify people", **Share**.

The website needs to edit, not only view: it writes the IDs, the flights members log, and Tila.

## 4. Give the dev environment the sheet

The dev deploy (`.github/workflows/deploy-app-dev.yaml`) writes two secrets into the app's environment. Its job runs in the GitHub environment **`development`**, so add them there: **Settings → Environments → development → Add environment secret**. A repository secret of the same name works too; a secret in any other environment is invisible to this job.

| Secret | Value |
|---|---|
| `GOOGLE_SHEETS_ID` | the ID from step 1, of the Google Sheets copy (not the uploaded `.xlsx`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | the key file as downloaded: open it in a text editor and paste all of it |

The deploy base64-encodes the key on the server before writing it to the env file, so its quotes and line breaks survive; the app decodes it (`utilities/googleSheetsSetup.ts`). In the app the two are `FLIGHT_LOG_SPREADSHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_KEY`.

The flight log has to be in the deployed code: on dev that means the flight-log pull requests merged into `dev`.

Then deploy dev: push a change under `nextjs/` to `dev`, or run **Deploy APP to DEV** by hand. Without the secrets, the flight log pages say the sheet isn't set up.

The dev database is created from scratch on every deploy. The sheet keeps the flights, their IDs and Tila, but pilot-name matches and the review log start over.

## 5. Check that it works

On the dev site, log in as an admin and open `/admin/lennot`:
1. The sync card shows **Avaa taulukko · palvelutili salko-lentopaivakirja-dev@…**. Press **Synkronoi nyt**: an empty sheet gives "0 lentoa".
2. Log a flight at `/jasenalue/lentopaivakirja/uusi`, then look at the row in the sheet:
   - the date and the times are right-aligned, so Sheets read them as a date and times, not text, and the times are the Finnish times you typed (shown as 14.09);
   - with a tankkaus or tuntimittari like `1,5` filled in (under "Tuntimittari, tankkaus, öljy, huomiot"), the cell is the number 1,5, not a date;
   - the grey Ilmassa oloaika shows the time;
   - ID is filled and Lähde says `web`.

   If the times are left-aligned text and Ilmassa oloaika shows #VALUE!, the row was written by a site older than PR #77, which sent times as text that a Finnish sheet keeps as text. Clear the row and log the flight again.
3. Undo it with **Kumoa viimeisin** on the confirmation. The row's typed-in cells empty and its formulas stay: it is one of the pre-filled rows again, ready for the next flight. Since it was the last flight, no gap is left. (Undo is refused once a later flight is below it.)

4. To try billing and statistics, fill the sheet with made-up flights: **Esimerkkilennot (kehitys)** on `/admin/lennot` writes about a year of flights for the chosen aircraft, with placeholder pilots (M.Meikäläinen, K.Opettaja…) and Lähde `esimerkki`. It only writes into a tab with no flights from that year, so undo your test flight first. The button is there only where `FLIGHT_LOG_SAMPLE_DATA=true` (the dev deploy sets it).

If the sync fails, the card says what to fix:

| Message on the card | Fix |
|---|---|
| Google-taulukkoa ei ole määritetty | The secrets are missing or empty: step 4, then deploy again. |
| GOOGLE_SERVICE_ACCOUNT_KEY ei ole palvelutilin avain | `GOOGLE_SERVICE_ACCOUNT_JSON` isn't the whole key file, or it changed when pasted: paste it again (step 4). |
| Google Sheets API ei ole käytössä | Step 2.1, in the project the service account belongs to. |
| Palvelutilillä … ei ole pääsyä taulukkoon | Share the spreadsheet with that address as Editor: step 3. |
| Taulukkoa ei löydy | Wrong spreadsheet ID, or the file is still an `.xlsx`: step 1. |
| Taulukosta puuttuu välilehti … | The tab was renamed: it must match `aircraft_sheets.sheet_name` ("OH-CON Matkapäiväkirja"). |
| Palvelutilin avain ei kelpaa | The key was deleted or revoked: create a new one (below). |

## Local development against the dev sheet

`bun dev` uses the synthetic fixture unless Google is configured. To try the dev sheet locally, set these in `nextjs/.env`:

```bash
FLIGHT_SHEET_SOURCE="google"
FLIGHT_LOG_SPREADSHEET_ID="<the dev spreadsheet's ID>"
GOOGLE_SERVICE_ACCOUNT_KEY="<base64 of the dev key>"
```

Only ever point local development at the dev spreadsheet. Playwright sets `FLIGHT_SHEET_SOURCE=fixture` itself, so tests never touch a real sheet.

## Rotating or revoking the key

1. Under the service account: **Keys → Add key**.
2. Update `GOOGLE_SERVICE_ACCOUNT_JSON` and deploy.
3. Delete the old key.

To cut the website off from a spreadsheet at once, remove the service account from the spreadsheet's sharing.

## Another aircraft

1. Write a tab for it, for example `bun run flight-sheet:template "OH-PDX Matkapäiväkirja" /tmp/oh-pdx.xlsx`.
2. Bring it into the spreadsheet with **File → Import → Insert new sheet(s)**.
3. Add the aircraft with a migration: `INSERT INTO aircraft_sheets (registration, sheet_name) VALUES ('OH-PDX', 'OH-PDX Matkapäiväkirja')`, in both `postgres/init/` and `postgres/migrations/`.

## Production, later

1. Make a separate service account (`salko-lentopaivakirja`) and share the club's real sheet with it.
2. Add `GOOGLE_SHEETS_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` to the production environment's secrets, and the same two lines to `deploy-app-prod.yaml`.
3. Turn on `FEATURE_FLIGHT_LOG`.
4. Go through the checklist at the end of `FLIGHT_LOG.md` first.
