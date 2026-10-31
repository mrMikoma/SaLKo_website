# roles/backup

A nightly off-site copy of production, kept in the club's shared drive in Google Workspace. Why and what: [`nextjs/docs/BACKUP_PLAN.md`](../../../../nextjs/docs/BACKUP_PLAN.md).

## What it does

Every night at 02:15 Europe/Helsinki, `salko-backup.timer` runs `/usr/local/sbin/salko-backup` (`files/salko-backup.sh`). The script:

1. dumps the databases `salko` and `umami`, and the roles, from `salko-postgres-prod`;
2. adds the files that exist only on the server: Umami's database password, the env files the deploy workflows write, and Traefik's `acme.json`;
3. packs everything with a manifest into one tar, and encrypts it with [age](https://age-encryption.org) to the public keys in `BACKUP_AGE_RECIPIENTS`;
4. uploads it with rclone, and also every earlier copy whose upload failed and every new pre-migration dump (encrypted the same way);
5. keeps the newest two copies in `/var/backups/salko`.

The shared drive then has:

```
palvelin/<year>/salko-prod-<UTC time>.tar.age          one per night
palvelin/<year>/salko-prod-<UTC time>.tar.age.sha256
ennen-migraatiota/salko-postgres-prod-<UTC time>.dump.age   from postgres/migrate.sh
```

**Nothing is ever deleted or overwritten there:** the server's service account is a Contributor, which can add files but can't delete them. A Manager deletes old copies by hand, about once a year (`BACKUP_PLAN.md`, "How long copies are kept").

**There are no automatic checks.** A failed night leaves `salko-backup.service` failed, and its copy waits in `/var/backups/salko` until the next night uploads it too.

## Switching it on

Until all three settings in step 4 exist, the role installs the tools and the script but keeps the timer off. Setting only some of them fails the Ansible run.

Only the host with the production database gets the timer and the key. The workflow names it with `BACKUP_HOST`, which is `SERVER_IP_SALKO0`. On any other host Ansible manages, the role keeps the timer off.

1. **Two age keys,** made on your own machine:
   ```
   age-keygen -o salko-backup-maintainer.key
   age-keygen -o salko-backup-club.key
   ```
   Each prints its public key (`age1…`). Never put the private key files in the repo or the shared drive.
2. **The shared drive.** Allow members from outside the organisation in its settings, because the service account's address is outside the club's domain. Its ID is the last part of its address: `https://drive.google.com/drive/folders/<ID>`.
3. **A service account for the server,** in one of the club's Google Cloud projects:
   - enable the Google Drive API in that project;
   - make a JSON key. The organisation policy that blocks key creation may need the same project-level override as the flight log's service account (`FLIGHT_LOG_SETUP.md`);
   - add the service account's address to the shared drive as **Contributor**. It needs no Cloud roles.
4. **GitHub,** under Settings → Secrets and variables → Actions:
   - variable `BACKUP_DRIVE_ID`: the shared drive's ID;
   - variable `BACKUP_AGE_RECIPIENTS`: both public keys, one per line. Lines starting with `#` are comments;
   - secret `BACKUP_DRIVE_SA_JSON`: the JSON key file's contents, as they are.
5. **Ansible Provision** from `main`. Any merge to `main` that touches `infra/ansible/` also starts it. The timer is on after that, and the first copy is made the same night.

## Checking it

On the server (reading the journal needs `sudo`):

```
systemctl list-timers salko-backup.timer
systemctl status salko-backup.service
sudo journalctl -u salko-backup -n 30
sudo systemctl start salko-backup.service   # one copy now
```

## Restoring a copy by hand

Download a `.tar.age` (and its `.sha256`) from the shared drive. Then, on any machine with age and Docker:

```
sha256sum -c salko-prod-<time>.tar.age.sha256
age -d -i salko-backup-maintainer.key salko-prod-<time>.tar.age | tar -x
cd salko-prod-<time>
sed -n '/^files:/,$p' MANIFEST.txt | tail -n +2 | sed 's/^  //' | sha256sum -c

docker run -d --name salko-restore -e POSTGRES_USER=salko_admin -e POSTGRES_PASSWORD=restore postgres:17.11
docker exec salko-restore sh -c 'until pg_isready -q -h 127.0.0.1; do sleep 1; done'
# The roles first. "role salko_admin already exists" is expected.
docker exec -i salko-restore psql -q -U salko_admin -d postgres < globals.sql
docker exec salko-restore createdb -U salko_admin salko
docker exec -i salko-restore pg_restore -U salko_admin -d salko --exit-on-error < salko.dump
docker exec salko-restore psql -U salko_admin -d salko -c 'SELECT count(*) FROM users'
docker rm -f salko-restore
```

`umami.dump` restores the same way, into a database named `umami`. `server-files.tar` holds its files with paths relative to `/`, and `tar -tvf server-files.tar` lists them.
