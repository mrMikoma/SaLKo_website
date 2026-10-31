#!/usr/bin/env bash
# Nightly off-site backup of production: the databases and the files that exist
# only on this server. Installed by Ansible (infra/ansible/roles/backup) and run
# by salko-backup.timer. Why and what: nextjs/docs/BACKUP_PLAN.md.
#
# One run:
#   1. dumps the databases and the roles from the Postgres container;
#   2. packs them with the server-only files and a manifest into one tar;
#   3. encrypts the tar with age, to the public keys in RECIPIENTS_FILE;
#   4. uploads it with rclone, and every earlier copy whose upload failed, and
#      every new pre-migration dump (encrypted the same way);
#   5. keeps the newest KEEP_LOCAL copies in WORK_DIR.
#
# Nothing on the remote is deleted or replaced: a file that exists there is
# left as it is. The server's Drive account can't delete there anyway.
#
# Settings come from /etc/salko-backup/backup.conf, or SALKO_BACKUP_CONF.
set -Eeuo pipefail
umask 077

conf=${SALKO_BACKUP_CONF:-/etc/salko-backup/backup.conf}
# shellcheck source=/dev/null
. "$conf"

: "${POSTGRES_CONTAINER:?missing from $conf}" "${DATABASES:?missing from $conf}"
: "${RECIPIENTS_FILE:?missing from $conf}" "${RCLONE_CONFIG:?missing from $conf}"
: "${REMOTE:?missing from $conf}" "${WORK_DIR:?missing from $conf}"
KEEP_LOCAL=${KEEP_LOCAL:-2}
SERVER_HOME=${SERVER_HOME:-/home/salko}
MIGRATION_DUMPS_DIR=${MIGRATION_DUMPS_DIR:-$SERVER_HOME/backups/migrations}
export RCLONE_CONFIG
export RCLONE_CACHE_DIR="$WORK_DIR/.rclone-cache"

log() { printf '%s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }
trap 'log "ERROR: failed at line $LINENO" >&2' ERR

# --ignore-existing, because --immutable doesn't stop copyto from replacing a
# file (rclone 1.75.2). Each file's first version is kept forever in Drive's
# version history, even if someone uploads a new version over it later.
upload() { # <local file> <remote path>
  rclone copyto --ignore-existing --drive-keep-revision-forever --retries 5 \
    --low-level-retries 10 --stats 0 --drive-stop-on-upload-limit "$1" "$2"
}

size() { du -h "$1" | cut -f1; }

command -v age > /dev/null || fail "age is not installed"
command -v rclone > /dev/null || fail "rclone is not installed"
grep -q '^age1' "$RECIPIENTS_FILE" || fail "no age public key in $RECIPIENTS_FILE"
[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER" 2> /dev/null)" = true ] ||
  fail "container $POSTGRES_CONTAINER is not running"

mkdir -p "$WORK_DIR" "$WORK_DIR/migrations-uploaded"
exec 9> "$WORK_DIR/.lock"
flock -n 9 || fail "another backup is running"

stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="salko-prod-$stamp"
tmp=$(mktemp -d "$WORK_DIR/.run.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
dir="$tmp/$name"
mkdir "$dir"

# 1. The databases and the roles. Reading each archive's table of contents back
# checks that the dump is complete.
for db in $DATABASES; do
  docker exec "$POSTGRES_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$1" -Fc' sh "$db" > "$dir/$db.dump"
  docker exec -i "$POSTGRES_CONTAINER" pg_restore --list < "$dir/$db.dump" > /dev/null ||
    fail "the dump of $db does not read back"
  log "dumped $db ($(size "$dir/$db.dump"))"
done
# Role names and password hashes, so the restored roles match the env files.
docker exec "$POSTGRES_CONTAINER" sh -c 'pg_dumpall -U "$POSTGRES_USER" --globals-only' > "$dir/globals.sql"

# 2. The files that exist only here: Umami's database password, the env files
# the deploy workflows write, and Traefik's certificates.
files=()
while IFS= read -r -d '' f; do
  files+=("${f#/}")
done < <(find "$SERVER_HOME" -maxdepth 2 -type f \
  \( -name '.env*' -o -name '.umami-db-password*' -o -path "$SERVER_HOME/traefik/acme.json" \) -print0 | sort -z)
if [ "${#files[@]}" -gt 0 ]; then
  tar -C / -cf "$dir/server-files.tar" "${files[@]}"
fi
log "packed ${#files[@]} server files"

first_db=${DATABASES%% *}
cat > "$dir/RESTORE.txt" << EOF
SaLKo production backup, $stamp

*.dump            pg_dump custom archives: pg_restore -d <database> <file>
globals.sql       roles and their password hashes: psql -f globals.sql
server-files.tar  files from the server, paths relative to /: tar -tvf server-files.tar
MANIFEST.txt      versions, applied migrations, sha256 of every file here

How to restore: "Restoring a copy by hand" in infra/ansible/roles/backup/README.md
in the repository (github.com/mrMikoma/SaLKo_website).
EOF
{
  echo "created: $stamp"
  echo "host: $(hostname)"
  # shellcheck source=/dev/null
  echo "os: $(. /etc/os-release && echo "$PRETTY_NAME")"
  echo "docker: $(docker version --format '{{.Server.Version}}')"
  echo
  echo "containers:"
  docker ps --format '  {{.Names}}  {{.Image}}  {{.Status}}'
  echo
  echo "migrations applied to $first_db:"
  docker exec "$POSTGRES_CONTAINER" sh -c \
    'psql -U "$POSTGRES_USER" -d "$1" -Atc "SELECT filename FROM schema_migrations ORDER BY filename"' sh "$first_db" |
    sed 's/^/  /' || echo "  (no schema_migrations table)"
  echo
  echo "files:"
  (cd "$dir" && sha256sum -- *) | sed 's/^/  /'
} > "$tmp/MANIFEST.txt"
mv "$tmp/MANIFEST.txt" "$dir/"

# 3. One encrypted file, and its checksum.
tar -C "$tmp" -cf - "$name" | age -R "$RECIPIENTS_FILE" -o "$tmp/$name.tar.age"
(cd "$tmp" && sha256sum "$name.tar.age" > "$name.tar.age.sha256")
mv "$tmp/$name.tar.age" "$tmp/$name.tar.age.sha256" "$WORK_DIR/"
log "encrypted $name.tar.age ($(size "$WORK_DIR/$name.tar.age"))"

# 4. Upload this copy, and any earlier one whose upload failed.
shopt -s nullglob
for copy in "$WORK_DIR"/salko-prod-*.tar.age; do
  [ -e "$copy.uploaded" ] && continue
  base=$(basename "$copy")
  year=${base:11:4}
  upload "$copy" "${REMOTE}palvelin/$year/$base"
  upload "$copy.sha256" "${REMOTE}palvelin/$year/$base.sha256"
  : > "$copy.uploaded"
  log "uploaded $base"
done

for dump in "$MIGRATION_DUMPS_DIR/$POSTGRES_CONTAINER"-[0-9]*.dump; do
  base=$(basename "$dump")
  [ -e "$WORK_DIR/migrations-uploaded/$base" ] && continue
  age -R "$RECIPIENTS_FILE" -o "$tmp/$base.age" "$dump"
  upload "$tmp/$base.age" "${REMOTE}ennen-migraatiota/$base.age"
  : > "$WORK_DIR/migrations-uploaded/$base"
  log "uploaded pre-migration dump $base"
done

# 5. Keep the newest copies here for a quick restore. Each copy is complete, so
# older ones are not needed once a newer one exists.
# shellcheck disable=SC2012 # names are always salko-prod-<UTC time>.tar.age
mapfile -t old < <(ls -1t "$WORK_DIR"/salko-prod-*.tar.age | tail -n +"$((KEEP_LOCAL + 1))")
for copy in "${old[@]}"; do
  rm -f "$copy" "$copy.sha256" "$copy.uploaded"
done

log "backup $name done"
