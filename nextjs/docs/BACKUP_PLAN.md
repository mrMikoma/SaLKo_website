# Plan: off-site backups and handover

**Status:** decided (2026-10-31). Phase 1, the backup role, is built and switched off until phase 0 is done; how to switch it on is in `infra/ansible/roles/backup/README.md`.

The goal is that three things can happen without losing the club's data or its website:

1. **The server dies.** Hetzner loses or breaks `salko0`.
2. **Hetzner's own backups fail too**, or the Hetzner account itself is lost (an unpaid bill, a locked or deleted account).
3. **The maintainer can't continue**, suddenly and for good, and someone who has never seen the setup has to take over.

The answer to 1 and 2 is a nightly encrypted copy of everything that can't be rebuilt from the repo, kept in a shared drive that the club owns in its own Google Workspace. The answer to 3 is that the copies belong to the club, and that a handbook lets a successor restore and run everything. The keys, the secrets and the account access reach the successor through the maintainer's own plan.

## Where we are

**What exists:**
- **Hetzner server backups** (`backups = true` in `infra/terraform/modules/hetzner/main.tf`): seven daily disk images.
  - They are in the same Hetzner account as the server, and they can't be downloaded out of Hetzner.
  - They are taken while Postgres runs. Postgres recovers from one as it would after a power cut, which usually works but isn't a clean dump.
- **Pre-migration dumps** from `postgres/migrate.sh`: the last 10, in `/home/salko/backups/migrations` on the server's own disk.
- **Code** on GitHub, and **Terraform state** in the Cloudflare R2 bucket `salko-website`.

**Gaps:**
- **No copy of the data leaves Hetzner.** One account problem loses the server and all its backups at once.
- **Nothing is ever restored or checked,** so nobody knows whether a restore would work.
- **No alerts.** Prometheus has no rules (`monitoring/prometheus/prometheus.yml`), and nothing notifies anyone when a job fails or the server is down.
- **Everything points at one person:**
  - the repository, `CODEOWNERS`, the Terraform GitHub provider (`github_main_username`), Ansible's `authorized_keys` (github.com/mrMikoma.keys), the image names (`ghcr.io/mrmikoma/…`) and the runner token `HETZNER_GHA_RUNNER_PAT`;
  - the admin tools (Grafana, pgAdmin, Umami) answer only from the Hetzner network and the maintainer's own networks (`internal-only` in `traefik/traefik.yaml`), through the pfSense at 10.1.0.2, which isn't in the repo. SSH forwarding is off, so there is no other way in;
  - the Hetzner network, its subnets and the pfSense were made by hand, outside Terraform.
- **One lost account takes a lot with it:**
  - with the Hetzner account go the server and all its backups (S3);
  - with Cloudflare go the Terraform state in R2 and the DNS (S5);
  - a lapsed domain takes the club's email with it, because Google Workspace mail uses the same domain.

  The copies in the club's Drive and the handbook are what remains then. Phase 5 moves the accounts to the club.
- **The secrets guide is out of date.** `GITHUB_SECRETS_SETUP.md` lists names such as `NEXTAUTH_SECRET_PROD` that no workflow reads.

## Goals

- **Data lost at most:** one day. There is also a dump right before every migration.
- **Time to recover:**
  - the server lost but the accounts fine: one evening;
  - an account lost: one weekend, for someone following the guide without the maintainer.
- **The club owns the copies:** they are in a shared drive of the club's Workspace, not in anyone's own Drive.
- **The server can add copies but can't delete or read old ones.** A broken-into server can't wipe the history or read last month's data.
- **Checked by hand, not automatically** (the maintainer's decision, 2026-10-31): a restore after the first night, and one trial of `RECOVERY.md` on a throwaway server.

## What is backed up

| # | What | From | How often | Why |
|---|---|---|---|---|
| 1 | Database `salko` (`pg_dump -Fc`) | `salko-postgres-prod` | nightly | Members, bookings, bulletins, the flight log copy, billing, invoices, the mail outbox |
| 2 | Database `umami` | `salko-postgres-prod` | nightly | Visitor statistics. Nice to have |
| 3 | Roles (`pg_dumpall --globals-only`) | `salko-postgres-prod` | nightly | Role names and password hashes, so the restored database matches the env files |
| 4 | Server-only files: `.umami-db-password`, the `.env*` files the deploys write under `/home/salko`, `traefik/acme.json`, and a manifest (running image versions, OS and Docker versions) | `/home/salko` | nightly | The only copy of Umami's database password. With the env files, the stack can be started by hand without GitHub |
| 5 | Pre-migration dumps | `/home/salko/backups/migrations` | as they appear | The state right before each schema change |
| 6 | The repository as a `git bundle` (every branch and tag) | GitHub | weekly | The code, if the GitHub account is lost |
| 7 | Terraform state | R2 `salko-website` | weekly | It holds the generated Postgres passwords and what Terraform created |
| 8 | GitHub Actions variables (`toJSON(vars)`) | GitHub | weekly | Feature flags, the server IP |

**Not backed up, on purpose:**
- the dev database, which every dev deploy rebuilds from `postgres/init`;
- Prometheus and Loki data;
- Grafana data: its dashboards come from `monitoring/grafana/provisioning`;
- pgAdmin data;
- Docker images, which are rebuilt from the repo (GHCR keeps the old tags);
- METAR data, which is fetched again.

**The flight log sheet** stays in Google, with Google's version history. Its rows are also in the database dump (`sheet_flights`), and the paper journey log is the master.

**GitHub secret values are not exported.** The maintainer keeps a copy of each outside GitHub, so recovery copies them from there instead of making new ones. The app's secrets are inside the env files of item 4 too.

## Design

### Where: a shared drive in the club's Workspace

- **A shared drive,** for example "SaLKo palvelimen varmuuskopiot". Its files belong to the club, not to whoever uploaded them.
- **Members:**
  - **Managers:** the maintainer, plus whoever the maintainer's own plan names. Only Managers can delete permanently.
  - **`salko-backup-server@…`,** a service account for the server: **Contributor**. It can add files, but it can't move or delete them.
  - **`salko-backup-ci@…`,** a service account for GitHub Actions: Contributor too. It adds the weekly copies of GitHub and the Terraform state.
- **Folders:**
  - `palvelin/<year>/`: the nightly files;
  - `ennen-migraatiota/`: the pre-migration dumps;
  - `github/` and `terraform/`;
  - `LUE MINUT` at the top: the recovery guide, refreshed weekly, so it is there even when GitHub isn't.
- **Why a shared drive:**
  - Service accounts created after 15.4.2025 have no Drive storage of their own, so they can only upload to a shared drive.
  - Business Starter and the Nonprofits edition both have shared drives.
  - A service account's address is outside the club's domain, so this drive must allow members from outside the organisation. The maintainer sets the drive up by hand (phase 0).

### Encryption: age, to two keys

- **Everything with member data or secrets is encrypted on the server** with [age](https://age-encryption.org) before it leaves, to two public keys:
  - **the maintainer key,** for everyday restores;
  - **the club key** (seuran avain), the successor's key, kept apart from the maintainer. Where it is kept and who holds it is the maintainer's own plan.
- **The server holds only the public keys,** from the repository variable `BACKUP_AGE_RECIPIENTS`. A broken-into server can't read old copies.
- **Neither private key is stored in the shared drive.** Otherwise one Google account would open everything.
- **Why age and dated files rather than restic:**
  - a successor restores with two commands: `age -d -i avain.txt <file> | tar -x`, then `pg_restore`;
  - the board can see in Drive that there is a file for every night;
  - the data is small and storage plentiful, so restic's deduplication isn't worth one more tool to learn.

### On the server: an Ansible role `backup`

- **A new role,** `infra/ansible/roles/backup`, with a systemd timer in the same style as the `maintenance` role's.
  - It runs nightly at 02:15 Europe/Helsinki, before the apt upgrade (03:30), the Sunday Docker prune (03:00) and the Sunday reboot window (04:30).
  - It has `Persistent=true`, so a run missed while the server was off runs after boot.
- **The script,** `/usr/local/sbin/salko-backup`:
  1. Dumps `salko`, `umami` and the roles through `docker exec salko-postgres-prod`, as `postgres/migrate.sh` does.
  2. Packs items 1–4 into one `salko-prod-<UTC time>.tar`, encrypts it with age and writes its sha256.
  3. Uploads it with `rclone copyto --immutable`, never `sync`. Each night is a new file and nothing is overwritten. New pre-migration dumps go up the same way.
  4. Uploads, too, any earlier copy whose upload failed.
  5. Keeps the last two nights in `/var/backups/salko`, for a quick restore that doesn't need Drive.
  6. Exits non-zero on any failure, so systemd marks the run failed.
- **Tools:**
  - age from Ubuntu's packages;
  - rclone from its own releases, pinned with a checksum, because Ubuntu's rclone is several years old.
- **Its secrets:**
  - the server service account's JSON key, as a new repository secret `BACKUP_DRIVE_SA_JSON`, which Ansible writes to `/etc/salko-backup/` (root, 600) and never prints;
  - the shared drive's ID, as the variable `BACKUP_DRIVE_ID`;
  - the two public keys, as the variable `BACKUP_AGE_RECIPIENTS`.

  Until all three exist, the role installs everything but keeps the timer off.

### In GitHub Actions: a weekly copy of GitHub

The repo has no scheduled workflows yet. One new one:

- **`backup-github.yaml`,** weekly and on demand. It copies items 6–8 and the recovery guide to the drive. The Terraform state is encrypted to the same two keys.

**Not automated, by decision** (2026-10-31): no daily freshness check, no monthly restore test and no alerts.
- A failed night only shows as a failed systemd unit on the server (`systemctl --failed`, `journalctl -u salko-backup`), or as a missing date in the drive.
- So whoever restores should look at the newest file's date first.
- If a check is wanted later, the smallest one is a daily workflow that fails when the newest file is older than 26 hours.

### How long copies are kept

- **Nothing is deleted automatically.** The server can't delete, and there is plenty of storage.
- **A Manager cleans up by hand, about once a year** (decided 2026-10-31), by this rule:
  - every night for two months;
  - the first of each month for two years;
  - 1 January for ten years.
- **Accounting:** once stage C sends invoices, they are part of the club's accounting records. Finnish law requires vouchers to be kept for 6 years and the books for 10. The yearly copies cover that. Ask the treasurer whether the site's invoices are the only copy.
- **Privacy:** an erased member stays in older copies until those age out. The club's privacy statement (tietosuojaseloste) should say how long backups are kept.

## Recovery, by scenario

These become `RECOVERY.md` in phase 3, with exact commands. The restore steps reuse the ones in `GO_LIVE.md` ("The data must go back").

| Scenario | What to do |
|---|---|
| **S1. The server breaks; the Hetzner account is fine** | Rebuild the server from its latest Hetzner backup in the Hetzner console. It's the quickest, and loses up to a day. If it fails, go on to S2. |
| **S2. No usable Hetzner backup** | 1. A new server through Terraform: lift delete protection, then `terraform apply -replace` on `module.salko.hcloud_server.salko[0]`. Terraform points DNS at the new IP and updates `SERVER_IP_SALKO0`.<br>2. Ansible.<br>3. Start Postgres on an empty data directory. Drop and re-create `salko` and `umami`, then `pg_restore` from the newest Drive copy.<br>4. Deploy the app, monitoring, Traefik and the cronjobs from `main`. |
| **S3. The Hetzner account is lost, or the club's server moves to a project of its own** | 1. A new Hetzner project, in the club's name. By hand, re-create what Terraform doesn't make: the private network and its subnets, the runner's SSH key, and the `HETZNER_*` secrets.<br>2. `terraform state rm module.salko`, then apply, then S2 from step 2.<br>3. **On another provider:** any Ubuntu server, Ansible pointed at its IP, and `docker compose` by hand with the env files from the copy. |
| **S4. The GitHub account is lost** | 1. A new repository, in a club organisation, from the bundle.<br>2. The secrets come from the maintainer's copies, or from the env files in the copy.<br>3. Change the image names, `github_main_username` and the runner token. |
| **S5. The Cloudflare account is lost** | 1. A new account and API token. Add the zone, and change the name servers at the `.fi` registrar.<br>2. A new R2 bucket, with the Terraform state from Drive. |
| **S6. The maintainer is gone** | The successor gets the keys, the secrets and the accounts through the maintainer's own plan, then follows the handbook. |

## Handover

- **An accounts register** in the handbook, with what each account holds, who owns it and who pays:
  - GitHub: the repository, the Actions secrets, the GHCR images, the GitHub App Terraform uses, the runner token;
  - the Hetzner Cloud project: the server, the network, the backups, billing;
  - Cloudflare: the zone, DNS, the R2 state bucket, API tokens;
  - the `.fi` domain: the registrar, with the club (0481856-3) as the holder;
  - Google Workspace: the super admins, the shared drive, the mail account, the flight log sheet;
  - the Google Cloud project: the OAuth client, and the sheet and backup service accounts;
  - the Umami, Grafana and pgAdmin logins.
- **A secrets register** that replaces `GITHUB_SECRETS_SETUP.md`. For every secret the workflows read, it says what it is for, where it comes from, and where the maintainer's copy is. The values themselves are never in the repo.
- **A maintainer handbook,** `nextjs/docs/MAINTAINER_HANDBOOK.md`:
  - a one-page map of the system;
  - everyday tasks, linking to the existing docs (`GO_LIVE.md`, `FLIGHT_LOG_SETUP.md`, `MAIL_SETUP.md`, `BOOKINGS.md`, the `deploy` and `db-migration` skills);
  - the yearly cleanup of old copies, and the other checks done by hand;
  - recovery (`RECOVERY.md`);
  - what a new maintainer needs access to.

  The repo's `CLAUDE.md` and `.claude/skills` also let a successor work on it with Claude Code.
- **The envelope:** one printed page in Finnish, not in the repo. Who keeps it is part of the maintainer's own key plan. It says:
  - what exists and where the copies are;
  - the club key;
  - where the handbook is;
  - who to contact;
  - what to do first.
- **One trial of the handbook:** once `RECOVERY.md` is written, the maintainer rebuilds the site on a throwaway server from the Drive copy, following only the guide, on a test hostname. Then the guide is fixed wherever it fell short.

## Phases

0. **Accounts and keys, by the maintainer, by hand:**
   - create the shared drive and the two service accounts, choosing the Workspace settings while doing it;
   - make the two age keys; where the club key is kept is the maintainer's own plan;
   - set `BACKUP_DRIVE_ID`, `BACKUP_AGE_RECIPIENTS` and `BACKUP_DRIVE_SA_JSON` (`infra/ansible/roles/backup/README.md`), then run Ansible Provision from `main`. The CI service account's key is for phase 2.
1. **PR: the `backup` role and script** (built, 2026-10-31).
   - A dry run from `dev`, then the real run from `main`.
   - After the first night: download the file, decrypt it by hand with each key, and restore it locally. That proves both keys before anything relies on them.
2. **PR: the weekly GitHub copy.**
3. **PR: the docs:** `RECOVERY.md`, `MAINTAINER_HANDBOOK.md` with both registers, and `GITHUB_SECRETS_SETUP.md` retired. The envelope's template stays outside the repo.
4. **The maintainer, outside the repo:** the key and access plan, the envelope, and the one trial of `RECOVERY.md`.
5. **Later, each with its own plan:**
   - the repository moved to a club GitHub organisation (image names, Terraform, `CODEOWNERS`, Ansible's key source, the runner token);
   - the admin tools reachable without the maintainer's networks, for example through Cloudflare Access with the club's Google login;
   - the club's server in a Hetzner project of its own, billed to the club. S3 doubles as the way to move it.

**Release:** phases 1 and 2 only do anything once they reach `main`. A change to the Ansible role starts **Ansible Provision** by itself on the merge, with no approval. `GO_LIVE.md` stage A2 covers that step.

## Decisions (2026-10-31)

- **The shared drive and the Workspace settings:** the maintainer decides them while creating the drive and the service accounts by hand.
- **The club key, its holders, the envelope and the successor's access:** the maintainer's own plan. There is no deputy.
- **GitHub secrets** are kept by the maintainer outside GitHub too, so they are neither exported nor made anew.
- **Old copies** are deleted by hand, about once a year; there is plenty of storage.
- **No automatic checks, restore tests or alerts.**
- **Language:** the handbook and `RECOVERY.md` in English like the other docs; the envelope in Finnish.
