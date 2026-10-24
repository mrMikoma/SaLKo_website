#!/usr/bin/env bash
# Applies postgres/migrations/*.sql to a running Postgres container, in file name order.
# Run on the host by .github/workflows/db-migrate.yaml.
#
# Usage: migrate.sh <container> <migrations-dir> [--dry-run]
#
# Environment:
#   APP_DB_USER  app role, passed to every migration as the psql variable :app_user
#   BACKUP_DIR   where the pre-migration dump goes (default: /home/salko/backups/migrations)
#
# Applied files are recorded in schema_migrations with their sha256. Each file
# runs in one transaction together with its schema_migrations row, so a failed
# migration leaves nothing behind. A changed checksum on an applied file stops
# the run before anything is applied.
set -euo pipefail

container=${1:?usage: migrate.sh <container> <migrations-dir> [--dry-run]}
dir=${2:?usage: migrate.sh <container> <migrations-dir> [--dry-run]}
dry_run=false
[ "${3:-}" = "--dry-run" ] && dry_run=true
app_user=${APP_DB_USER:?APP_DB_USER must be set}
backup_dir=${BACKUP_DIR:-/home/salko/backups/migrations}
keep_backups=10

db() {
  docker exec -i "$container" sh -c 'psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"' psql "$@"
}

shopt -s nullglob
files=("$dir"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No migrations in $dir"
  exit 0
fi

for f in "${files[@]}"; do
  if ! [[ $(basename "$f") =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]; then
    echo "❌ $(basename "$f"): migration names must look like 001_description.sql"
    exit 1
  fi
done

declare -A applied=()
if [ "$(db -Atc "SELECT to_regclass('public.schema_migrations') IS NOT NULL")" = "t" ]; then
  while read -r name sum; do
    [ -n "$name" ] && applied[$name]=$sum
  done < <(db -Atc "SELECT filename || ' ' || checksum FROM schema_migrations")
elif [ "$dry_run" = false ]; then
  db -q <<SQL
CREATE TABLE schema_migrations (
  filename   TEXT PRIMARY KEY,
  checksum   TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON schema_migrations FROM "$app_user";
SQL
  echo "Created schema_migrations"
fi

pending=()
changed=()
for f in "${files[@]}"; do
  name=$(basename "$f")
  sum=$(sha256sum "$f" | cut -d' ' -f1)
  if [ -z "${applied[$name]:-}" ]; then
    pending+=("$f")
  elif [ "${applied[$name]}" != "$sum" ]; then
    changed+=("$name")
  fi
done

echo "Database: $container"
echo "Applied:  $(( ${#files[@]} - ${#pending[@]} )) of ${#files[@]}"
for f in "${pending[@]}"; do echo "Pending:  $(basename "$f")"; done

if [ ${#changed[@]} -gt 0 ]; then
  for name in "${changed[@]}"; do
    echo "❌ $name was changed after it was applied. Add a new migration instead of editing it."
  done
  exit 1
fi

if [ ${#pending[@]} -eq 0 ]; then
  echo "✅ Nothing to apply"
  exit 0
fi

if [ "$dry_run" = true ]; then
  echo "Dry run, nothing applied"
  exit 0
fi

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup="$backup_dir/$container-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker exec "$container" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
chmod 600 "$backup"
echo "Backup:   $backup ($(du -h "$backup" | cut -f1))"
# shellcheck disable=SC2012 # names are always <container>-<timestamp>.dump
ls -1t "$backup_dir/$container"-*.dump | tail -n +$((keep_backups + 1)) | xargs -r rm -f

for f in "${pending[@]}"; do
  name=$(basename "$f")
  sum=$(sha256sum "$f" | cut -d' ' -f1)
  echo "── $name"
  {
    cat "$f"
    printf "\nINSERT INTO schema_migrations (filename, checksum) VALUES ('%s', '%s');\n" "$name" "$sum"
  } | db -1 -v app_user="$app_user" -f -
done

echo "✅ Applied ${#pending[@]} migration(s)"
