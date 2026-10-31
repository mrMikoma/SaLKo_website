#!/usr/bin/env bash
# Deploys the monitoring agent (docker-compose.monitoring-agent.yaml) on an app
# host. Run by deploy-monitoring.yaml in the deploy user's home, next to the
# compose file and monitoring/. Reads from the environment:
#
#   MONITORING_PUSH_URL        the server's gateway: http://monitoring-gateway:8080
#                              when the server runs on this host, otherwise
#                              http://<server's private address>:3101
#   MONITORING_PUSH_PASSWORD   the gateway's password (from the server)
#   MONITORING_PUSH_USER       its login name (default agent)
#   AGENT_HOST                 this host's name in the metrics and logs (default salko0)
#   SERVER_ELSEWHERE           true when the server runs on another host: a server
#                              left on this host from before is stopped (its data stays)
#   GRAFANA_ADMIN_PASSWORD     pgAdmin's login password
#   POSTGRES_PASSWORD          prod database superuser's password, for its exporter
#   UMAMI_APP_SECRET           Umami's APP_SECRET
#   NAME_PREFIX                container name prefix (default salko)
#   MONITORING_DATA_DIR        where the data lives (default ~/monitoring)
set -euo pipefail
cd "$HOME"

: "${MONITORING_PUSH_URL:?MONITORING_PUSH_URL is not set}"
: "${MONITORING_PUSH_PASSWORD:?MONITORING_PUSH_PASSWORD is not set}"
: "${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD is not set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is not set}"
NAME_PREFIX="${NAME_PREFIX:-salko}"
AGENT_HOST="${AGENT_HOST:-salko0}"
MONITORING_PUSH_USER="${MONITORING_PUSH_USER:-agent}"
MONITORING_DATA_DIR="${MONITORING_DATA_DIR:-$HOME/monitoring}"
compose=(docker compose --env-file .env.monitoring -f docker-compose.monitoring-agent.yaml)

docker network inspect salko_monitoring >/dev/null 2>&1 || docker network create --driver bridge salko_monitoring >/dev/null
mkdir -p "$MONITORING_DATA_DIR/alloy-data"

# .env.monitoring. The prod exporter logs in as the database's superuser
# (POSTGRES_USER, salko_admin), with the password URL-encoded for the DSN.
prod_password_url=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$POSTGRES_PASSWORD")
# Umami's own database password, once the prod deploy has set it on the role
# (deploy-app-prod.yaml); until then the old one
umami_password="$POSTGRES_PASSWORD"
if [ -f .umami-db-password-set ]; then umami_password=$(cat .umami-db-password); fi
# The dev exporter's DSN comes from the dev deploy: keep it
dev_dsn=$(grep '^DEV_POSTGRES_EXPORTER_DSN=' .env.monitoring 2>/dev/null || true)
(
  umask 077
  {
    printf 'NAME_PREFIX=%s\n' "$NAME_PREFIX"
    printf 'MONITORING_DATA_DIR=%s\n' "$MONITORING_DATA_DIR"
    printf 'AGENT_HOST=%s\n' "$AGENT_HOST"
    printf 'MONITORING_PUSH_URL=%s\n' "$MONITORING_PUSH_URL"
    printf 'MONITORING_PUSH_USER=%s\n' "$MONITORING_PUSH_USER"
    printf 'MONITORING_PUSH_PASSWORD=%s\n' "$MONITORING_PUSH_PASSWORD"
    printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$GRAFANA_ADMIN_PASSWORD"
    printf 'PROD_POSTGRES_EXPORTER_DSN=postgresql://salko_admin:%s@salko-postgres-prod:5432/salko?sslmode=disable\n' "$prod_password_url"
    printf 'DATABASE_URL=postgresql://umami_app:%s@salko-postgres-prod:5432/umami\n' "$umami_password"
    printf 'APP_SECRET=%s\n' "${UMAMI_APP_SECRET:-}"
    if [ -n "$dev_dsn" ]; then printf '%s\n' "$dev_dsn"; fi
  } > .env.monitoring.new
)
mv .env.monitoring.new .env.monitoring
chmod 600 .env.monitoring

# pgAdmin's server list. No .pgpass: it held the production superuser's
# password under the dev server's entry, and servers.json never pointed at it.
# pgAdmin asks for the password when connecting. The directory belongs to
# pgAdmin's user (5050), so this may not be allowed: a warning, not a stop.
if ! {
  rm -rf "$MONITORING_DATA_DIR/pgadmin-data/servers.json" &&
    echo '{"Servers":{"1":{"Name":"SaLKo Dev","Group":"Servers","Host":"salko-postgres-dev","Port":5432,"MaintenanceDB":"salko","Username":"salko_admin","SSLMode":"disable","Comment":"Development database"}}}' > "$MONITORING_DATA_DIR/pgadmin-data/servers.json" &&
    rm -f "$MONITORING_DATA_DIR/pgadmin-data/.pgpass"
} 2>/dev/null; then
  echo "⚠️ Could not update pgAdmin's servers.json in $MONITORING_DATA_DIR/pgadmin-data"
fi

# Containers of the same names from another compose project, e.g. the single
# monitoring stack of before (project "salko"), would block the new ones.
# Promtail is replaced by Alloy.
for service in alloy node-exporter cadvisor postgres-exporter-dev postgres-exporter-prod pgadmin umami promtail; do
  name="$NAME_PREFIX-$service"
  project=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$name" 2>/dev/null || true)
  if [ -n "$project" ] && { [ "$project" != "salko-monitoring-agent" ] || [ "$service" = promtail ]; }; then
    echo "Removing $name of the compose project \"$project\""
    docker rm -f "$name" >/dev/null
  fi
done

# The server has moved to another host: stop the one left here. Its data stays
# in $MONITORING_DATA_DIR for copying over or deleting by hand.
if [ "${SERVER_ELSEWHERE:-false}" = true ]; then
  for service in prometheus loki grafana alertmanager blackbox-exporter monitoring-gateway; do
    if docker inspect "$NAME_PREFIX-$service" >/dev/null 2>&1; then
      echo "Stopping $NAME_PREFIX-$service: the monitoring server runs on another host"
      docker rm -f "$NAME_PREFIX-$service" >/dev/null
    fi
  done
  rm -f docker-compose.monitoring.yaml .env.monitoring-server
fi

"${compose[@]}" pull --quiet
# Recreated every time: a changed config file alone would not restart them
"${compose[@]}" up -d --force-recreate --remove-orphans

for _ in $(seq 1 15); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$NAME_PREFIX-alloy" 2>/dev/null)" = true ]; then
    echo "✅ Monitoring agent is running on $AGENT_HOST, pushing to $MONITORING_PUSH_URL"
    "${compose[@]}" ps
    exit 0
  fi
  sleep 2
done
echo "❌ Alloy is not running" >&2
"${compose[@]}" ps >&2
docker logs --tail 50 "$NAME_PREFIX-alloy" >&2 || true
exit 1
