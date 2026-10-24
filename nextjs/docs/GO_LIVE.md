# Production go-live

How everything waiting in `dev` reaches savonlinnanlentokerho.fi, in three stages that can be days apart. Production is the `main` branch; nothing reaches it except through the workflows below. Steps marked **Approve** wait for a reviewer of the `production` environment in GitHub.

| Stage | What goes live | Switch |
|---|---|---|
| **A. Release** | Next.js and Bun security updates, the booking permission fix and new calendar, admin user tools, bulletin drafts, server maintenance and SSH hardening, the SPF and DMARC records | merge `dev` → `main` (#47), migrate, deploy |
| **B. Flight log** | the club's real sheet, members logging flights, the treasurer checking them, statistics | production variable `FEATURE_FLIGHT_LOG=true`, redeploy |
| **C. Billing and email** | prices, billing periods, invoices on the site and by email | production variables `FEATURE_BILLING=true` and `MAIL_MODE=send`, redeploy |

Stage A doesn't depend on B or C and carries security fixes, so it shouldn't wait for them. The flight log, billing, invoices and email stay hidden or off until their stage. Billing has its own switch, `FEATURE_BILLING`, so stage B shows nothing of it: no billing pages, prices, periods or invoices, and no "Laskut" in the members' menu. Stage C waits until the treasurer has confirmed the prices and how billing should work.

**Historiaa and Hallit wait for the club members' review.** They were written from the old website and club records, and they are shown on kehitys for members to read. In production they stay greyed out in the menu, with no page, until the review is done. Then:
1. Fix what the members pointed out, through `dev` as usual.
2. Set the production variable `FEATURE_PAGES_IN_REVIEW` = `true`.
3. Redeploy.

## Stage A: release

### Days before

- [ ] Everything meant for this release is merged into `dev` and tested on kehitys:
  - bookings as a guest and as a member, including a recurring one;
  - a bulletin from draft to published;
  - deactivating a user and changing roles;
  - the Historiaa and Hallit pages.
- [ ] CI is green on #47.
- [ ] **SSH:** the release turns off password logins to the server (`PasswordAuthentication no`) and TCP and agent forwarding (`infra/ansible/roles/ssh_hardening`).
  - **Only these keys work afterwards.** Ansible rewrites `salko`'s `authorized_keys` on every run, from the `VPS_PUBLIC_KEY` secret and the keys on GitHub account mrMikoma (https://github.com/mrMikoma.keys). A key added to the server by hand disappears in the same run that turns off passwords.
  - So add your key to that GitHub account, or to `infra/ansible/roles/base` through a PR, first.
  - Check it with `ssh -o PasswordAuthentication=no salko@savonlinnanlentokerho.fi true` now, and again after the release.
  - VS Code Remote-SSH stops working, because it needs TCP forwarding.
- [ ] **Reboots:** the release turns on automatic security updates, with a reboot window on Sundays at 04:30 when an update needs one.
  - The server has not rebooted for months, so expect a reboot on the first Sunday after.
  - Every container restarts by itself (`restart: unless-stopped`).
- [ ] **Ansible dry run:** Actions → **Ansible Provision** → branch `dev`, tick "Dry run".
  - Nothing changes. From any branch but `main`, the workflow refuses to run without the tick.
  - The diff shows a key removed from `salko`'s `authorized_keys`. That's expected: a dry run skips the shell step that adds the GitHub keys back.
  - Read the diff, especially the package list of the first task, `apt upgrade: dist`. If it upgrades `docker-ce` or `containerd.io`, Docker restarts during the release (step 1). Docker's packages come from Docker's own repository, which unattended upgrades never touch, so they are probably months behind.
- [ ] **Accounts whose emails differ only in capitals.** Production stored emails as typed, and two such accounts would compete at login. Count them, read-only; the query prints no member data:
  ```
  ssh salko@savonlinnanlentokerho.fi 'docker exec salko-postgres-prod sh -c '"'"'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT count(*) FROM (SELECT 1 FROM users GROUP BY lower(email) HAVING count(*) > 1) d"'"'"''
  ```
  If it isn't 0:
  - The release logs in with the exact spelling first, so nobody gets someone else's account.
  - After the release, still give each extra account its own address, or deactivate it, on `/admin/users`. Searching for the address shows both.
- [ ] Pick a quiet evening. All the sites on the server can be down for a few minutes, several times:
  - when Ansible upgrades Docker (step 1);
  - during the deploy (steps 3–4);
  - while Traefik restarts (step 6).

### Release, about 30 minutes

1. **Merge #47** (`dev` → `main`):
   ```
   gh pr merge -R mrMikoma/SaLKo_website 47 --merge --admin
   ```
   The merge starts these by itself:
   - **Ansible Provision** (no approval): maintenance and SSH hardening.
     - It starts with a full package upgrade. If that upgrades Docker, dockerd restarts, and with it every container: production, kehitys, monitoring and Traefik, for a minute or two.
     - Wait until it is green before anything else, then check the SSH key again.
   - **Terraform Plan and Apply**: the DNS records and the Cloudflare provider pin. Read the plan before you **Approve**.
     - It should only *create* two records: `cloudflare_dns_record.spf` and `.dmarc`. **Reject** anything else, above all any change or replacement of `hcloud_server`, which would wipe the database.
     - This is the first plan since January, with new Terraform and provider versions.
     - The apply job makes a fresh plan and applies it without showing it again. If the plan you approved looked wrong, cancel instead.
   - **Deploy Monitoring Stack**. **Approve** it only after Ansible Provision has finished, so it doesn't run during the Docker restart.

   The website's code doesn't change yet, but the Docker restart briefly takes it down with everything else.
2. **Build the prod image:** Actions → **Build and Publish Production** → branch `main`. Note the version it prints (`v0.0.N`).
3. **Migrate the database**, right before the deploy:
   1. Actions → **Database Migrations** → branch `main`, environment `prod`, *Only list pending migrations* ticked. **Approve**: the dry run needs approval too. It should list 001–015.
   2. Run it again without the tick. **Approve**.

   It first saves a dump to `/home/salko/backups/migrations/salko-postgres-prod-<time>.dump`.

   From now until step 4, the old site can't read users' roles (migration 001 replaces `users.role` with `users.roles`):
   - nobody can log in, sessions read as logged out, and the admin pages redirect;
   - guest bookings and editing or deleting bookings fail;
   - public pages and the calendar view keep working.

   Members' sessions come back after the deploy. Run step 4 right after this.
4. **Deploy:** Actions → **Deploy production from main branch** (`deploy-app-prod`) → branch `main`, the version from step 2. **Approve**.
5. **Cronjobs:** Actions → **Deploy Background Cronjobs** → branch `main`. This applies the METAR job fix (the dev and prod schedulers no longer run each other's jobs). **Approve**.
6. **Traefik:** Actions → **Deploy Traefik** from `main`. This moves it from 3.6.1 to 3.7.14.
   - It pulls the new image first, then restarts. Every site is down for the restart, about half a minute.
   - The workflow asks no approval, so run it only from `main`.

### Check

- [ ] Historiaa and Hallit are greyed out in the Kerho menu, and `/kerho/historiaa` gives the "page doesn't exist yet" page, until the members' review.
- [ ] savonlinnanlentokerho.fi opens, and the front page shows the latest bulletins. Existing bulletins are published with their original dates.
- [ ] Logging in works with Google and with a password. Admins reach `/admin`, and roles are as before.
- [ ] Booking calendar:
  - an existing future booking shows at the same hour as before;
  - create a test booking, then delete it;
  - as a guest, you can see a booking's title and booker, but not their contact details.
- [ ] Every public page answers 200. `--doh-url` looks the name up in public DNS, so the check goes through Cloudflare as visitors do. On the club's private network the name points at the server's private address instead.
  ```
  for p in / /kerho /kerho/hinnasto /kerho/kentta /kalusto /kalusto/varauskalenteri /koulutus /esittelylennot /yhteystiedot /tiedotteet; do printf "%-28s " "$p"; curl -s --doh-url https://1.1.1.1/dns-query -o /dev/null -w "%{http_code} %{time_total}s\n" "https://savonlinnanlentokerho.fi$p"; done
  ```
- [ ] https://savonlinnanlentokerho.fi/robots.txt allows crawling. The prod build sets `ALLOW_INDEXING=true`.
- [ ] DNS: on https://mxtoolbox.com, "SPF Record Lookup" and "DMARC Lookup" for `savonlinnanlentokerho.fi` find the records.
- [ ] Grafana shows every container up. The next morning, METAR data is still updating on `/kerho/kentta`.
- [ ] **Docker's log size caps** take effect only after the next Docker restart, and then only for containers created after it, at each one's next deploy.
- [ ] **The first Sunday at 04:30**, the server reboots for the first time in months, to apply the kernel from the upgrade. That boot is the first test of the network setup, the firewall and Docker's networks at startup. Check Grafana and the site that morning.

### If it goes wrong

- **The app fails but the database is fine:** fix forward. Push a fix through `dev` → `main` and deploy the new version. The previous image can't run on the migrated database, because it reads `users.role`.
- **A migration fails:** the failed file leaves nothing behind, but the files before it stay applied. After 001, the old site is in the gap from step 3, so a failure later in the list leaves it broken until either:
  - a fixed migration runs, through `dev` → `main`; or
  - the dump is restored (below).
- **The data must go back:** restore the dump from step 3 together with the previous image (the last `v0.0.N` before this release).
  - This is a manual change on the server, so decide it explicitly; it's not a routine step.
  - A plain `pg_restore --clean` doesn't work, because the new tables reference `users`. Re-create the database instead:
    ```
    ssh salko@savonlinnanlentokerho.fi
    docker stop salko-nextjs-prod
    docker exec salko-postgres-prod sh -c 'dropdb -U "$POSTGRES_USER" --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB"'
    docker exec -i salko-postgres-prod sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /home/salko/backups/migrations/salko-postgres-prod-<time>.dump
    ```
  - Then deploy the previous version with **Deploy production from main branch**.

## Stage B: flight log

### Prepare

- [ ] **Service account:** create the production one, `salko-lentopaivakirja`, with its own JSON key (`FLIGHT_LOG_SETUP.md`, steps 2–3). Never reuse the dev key.
- [ ] **The real sheet:**
  - add the website's four columns (ID, Lähde, Tila, Laskutusjakso) at the right edge of the `OH-CON Matkapäiväkirja` tab, whose name must stay exactly that;
  - share the sheet with the service account as an editor;
  - check that File → Settings says Finland and Helsinki;
  - before the first sync, name a version (File → Version history → Name current version): the first sync writes an ID into every flight row, about 500 of them.
- [ ] **Protect the website's columns:** add a dropdown (Data → Data validation) to Tila with Korjattava, Tarkistettu, Laskutettu, Ei laskuteta and Maksettu, as the template has, and protect the columns ID, Lähde, Tila and Laskutusjakso (Data → Protect sheets and ranges) so only the treasurer, the admins and the service account can edit them. Otherwise anyone who can edit the sheet can type Laskutettu and keep a flight out of billing.
- [ ] **Tell everyone who edits the sheet:**
  - type the date first; a row without a readable date isn't read as a flight;
  - never sort or move the flight columns without ID, Lähde, Tila and Laskutusjakso. The sync then refuses the tab until the version from before is restored;
  - when copying a whole row, clear its ID, Lähde, Tila and Laskutusjakso, or check the "kopio" issue the sync then shows;
  - correct flights in place rather than inserting or deleting rows in the middle: a row inserted just as a member saves stops that save with an error naming the row.
- [ ] **Hand-billed flights:** fill Tila as **Laskutettu**, or Maksettu, for every flight already billed the old way. Otherwise they show as unchecked and later as unbilled.
  - Fill only rows that have a date. Then check that Tila and Laskutusjakso are empty on every row below the last flight: a flight typed into such a row would take that Tila, never show as unchecked and never be billed.
- [ ] **Try a copy first,** on your own machine, so the real flights never reach kehitys:
  1. File → Make a copy of the real spreadsheet, and share the copy with the dev service account.
  2. Run the site locally against the copy: `FLIGHT_LOG_SETUP.md`, "Local development against the dev sheet", with the copy's ID.
  3. Try a two-leg save; a save, cut the network (DevTools → Offline), then save again, which must not add the flights twice; an undo; a status change; and a remark starting with `=`, which must stay text.
  4. Delete the copy, put `nextjs/.env` back to the dev sheet, and empty the local database's copy of the flights (recreate the local database, or `DELETE FROM sheet_flights`).
- [ ] **Secrets:** add `GOOGLE_SHEETS_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` (the key file as is) to the `production` **environment's** secrets, never as repository secrets, which every workflow could read.
- [ ] **Sharing the real sheet:**
  - share the spreadsheet file itself with the service account, not a folder or a shared drive;
  - keep General access "Restricted": the website links rows to the sheet, and with "Anyone with the link" one link would show every member's flights;
  - give the service account no roles in its Google Cloud project, and restrict who can create keys for it.

### Switch on

1. Settings → Environments → `production` → Variables: `FEATURE_FLIGHT_LOG` = `true`. Leave `FEATURE_BILLING` unset.
2. Actions → **Deploy production from main branch** with the current version. No new build is needed. **Approve**.
3. **Treasurer:** give their account the Laskuttaja role on `/admin/users`, together with Käyttäjä. The role can only be given once the flight log is on.

### Check

- [ ] On `/admin/lennot`, the sync succeeds, and its "N lentoa" matches `=COUNT(A3:A)` in the sheet, the number of rows with a date. This year's hours are on `/admin/tilastot`: compare them with the Tilastot tab's row for this year. Go through the issues the sync lists, especially rows whose date can't be read.
- [ ] Pilot names: on `/admin/lennot` under "Lentäjien nimet", match each name with **Yhdistä** to a member, or to **Ei jäsen** for guest pilots and former members. The list is done when it is empty, and at least every name that pays must be decided before billing.
- [ ] The Tarkistamatta list holds only flights not yet billed.
- [ ] A member sees Lentopäiväkirja in the menu, logs a flight, and the flight appears in the sheet. If it was a test, undo it right away with "Kumoa viimeisin" on the confirmation: undo works only there, and only while it is the tab's last flight. Later the biller clears it in the sheet.
- [ ] `/admin/tilastot` agrees with the sheet:
  - set the Tilastot tab's B3 and B4 to 1.1. and 31.12. of the year you compare;
  - compare the totals and the purposes with the Lentotoimintailmoitus tab, and the months with the pivot tab;
  - compare per pilot by time only: the sheet counts landings per pilot, the site flights;
  - compare Esittelylentopäivät with the club's intro-flight register.
- [ ] **Earlier years:** paste the yearly hours from the Tilastot tab (A49:D74) into "Vuosittain" on `/admin/tilastot`. Leave out the "Yhteensä" column, and the years the flight log has (2023 on), which the site counts itself.
- [ ] Access: a member gets the front page for `/admin/lennot`; the treasurer lands on `/admin/lennot` from the menu ("Lentojen tarkistus") and is refused `/admin/users`; `/admin/laskutus` and `/jasenalue/laskut` don't exist yet.

To switch it off again, clear the variable and redeploy. The data stays.

## Stage C: billing and email

### Prepare

- [ ] **Mail account:** the club's mail account exists and is authorised (`MAIL_SETUP.md`, steps 2–4).
- [ ] **DKIM:**
  1. Generate the key in the Google Admin console.
  2. Add it to `infra/terraform/main.tf` through `dev` → `main`.
  3. Once the record is live, press "Start authentication".
- [ ] **Secrets:** add `MAIL_FROM`, `MAIL_REFRESH_TOKEN`, `MAIL_GMAIL_CLIENT_ID` and `MAIL_GMAIL_CLIENT_SECRET` to the `production` environment's secrets. Optionally add `MAIL_REDIRECT_TO`, for a dry run.
- [ ] **Club details on invoices:** Yhteystiedot (`data/contacts.json`) has the right IBAN, BIC and business ID.
- [ ] **On `/admin/laskutus/asetukset`,** right after switching on and before the first period (the page appears with `FEATURE_BILLING`):
  - the prices: OH-CON 3,10 / 5,00 €/min, with a 30 min minimum;
  - this season's equipment-fee payers;
  - the free hour;
  - who pays for each purpose;
  - the invoice payment term and closing note.
- [ ] **Backups:** invoices are bookkeeping records that must be kept for six years. Before the first real invoice, decide on Postgres backups off the server (the R2 to-do). Hetzner's server backups alone keep only a week.
- [ ] **Bookkeeping:** tell the bookkeeper:
  - invoices now come from the site, numbered `2026NNNN`, with their own reference numbers;
  - `/admin/laskut/csv` lists them for the accounting software;
  - stop numbering invoices in the old software.

### Switch on

1. Set the variable `FEATURE_BILLING` to `true`, and `MAIL_MODE` to `send`, or to `redirect` for a dry run where all mail goes to `MAIL_REDIRECT_TO`. Billing can also go on first with `MAIL_MODE` unset: invoices are then issued for printing, and their mail is held.
2. Redeploy with the current version. **Approve**.
3. On `/admin/laskutus/viestit`, press "Lähetä testiviesti itselleni" and check the message:
   - it comes from "Savonlinnan Lentokerho, laskutus";
   - replying goes to `laskutus@`;
   - Gmail's "Show original" says SPF, DKIM and DMARC: PASS.
4. Send one small invoice from `/admin/laskut/uusi` to the treasurer's own account. Pay it with the virtual barcode in a bank app, and check that the payment arrives with the reference number.

A dry run's invoices get real numbers but never reach members, so use `redirect` only with test invoices.

### First billing period

- [ ] Create the first period starting right after the last flight billed by hand. Flights before it, and those with Tila Laskutettu, aren't billed again.
- [ ] Check it on `/admin/laskutus/[id]`, close it, then press "Luo laskuluonnokset".
- [ ] Look through the drafts, add the missing postal addresses, then send them from `/admin/laskut`.
- [ ] Tell members that bills now come by email from the club's mail account, and that replies go to the treasurer.

To stop sending, clear `MAIL_MODE` and redeploy. Messages are then stored but not sent. Clearing `FEATURE_BILLING` hides billing again; nothing is deleted.

## Every later release

The same as stage A, steps 1–4: merge `dev` → `main`, build, migrate if `postgres/migrations` has new files (dry run first), and deploy.

When a release changes the Postgres service in `docker-compose.prod.yaml`, the deploy recreates the database container: the site is down for the half a minute Postgres takes to start, and the data stays. The release with the stage B review fixes does this once, as the database no longer gets the app's secrets in its environment.
