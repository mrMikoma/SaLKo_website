#!/usr/bin/env bash
# Deploys the monitoring server (docker-compose.monitoring.yaml) on this host.
# Run by deploy-monitoring.yaml in the deploy user's home, next to the compose
# file and monitoring/. Reads from the environment:
#
#   GRAFANA_ADMIN_PASSWORD   Grafana's admin password (required)
#   MONITORING_BIND_ADDR     the private address to publish the gateway (:3101)
#                            and Grafana (:3000) on; 127.0.0.1 when the agents
#                            are on this host
#   MONITORING_PUSH_USER     the agents' login name at the gateway (default agent)
#   NAME_PREFIX              container name prefix (default salko)
#   MONITORING_DATA_DIR      where the data lives (default ~/monitoring)
#
# The agents' password is made here once and kept in
# $MONITORING_DATA_DIR/gateway/push-password (0600); the workflow reads it from
# there for the agents. The gateway gets only its hash.
set -euo pipefail
cd "$HOME"

: "${GRAFANA_ADMIN_PASSWORD:?GRAFANA_ADMIN_PASSWORD is not set}"
NAME_PREFIX="${NAME_PREFIX:-salko}"
MONITORING_BIND_ADDR="${MONITORING_BIND_ADDR:-127.0.0.1}"
MONITORING_PUSH_USER="${MONITORING_PUSH_USER:-agent}"
MONITORING_DATA_DIR="${MONITORING_DATA_DIR:-$HOME/monitoring}"
compose=(docker compose --env-file .env.monitoring-server -f docker-compose.monitoring.yaml)

docker network inspect salko_monitoring >/dev/null 2>&1 || docker network create --driver bridge salko_monitoring >/dev/null

# The agents' password and the gateway's htpasswd
mkdir -p "$MONITORING_DATA_DIR/gateway"
password_file="$MONITORING_DATA_DIR/gateway/push-password"
if [ ! -s "$password_file" ]; then
  (umask 077 && openssl rand -hex 32 > "$password_file")
  echo "Made a new password for the agents"
fi
chmod 600 "$password_file"
hash=$(openssl passwd -apr1 -stdin < "$password_file")
# nginx's worker reads it, under its own uid: only the hash, readable
printf '%s:%s\n' "$MONITORING_PUSH_USER" "$hash" > "$MONITORING_DATA_DIR/gateway/htpasswd"
chmod 644 "$MONITORING_DATA_DIR/gateway/htpasswd"

(
  umask 077
  {
    printf 'NAME_PREFIX=%s\n' "$NAME_PREFIX"
    printf 'GRAFANA_ADMIN_PASSWORD=%s\n' "$GRAFANA_ADMIN_PASSWORD"
    printf 'MONITORING_BIND_ADDR=%s\n' "$MONITORING_BIND_ADDR"
    printf 'MONITORING_DATA_DIR=%s\n' "$MONITORING_DATA_DIR"
    if [ -n "${GRAFANA_ROOT_URL:-}" ]; then printf 'GRAFANA_ROOT_URL=%s\n' "$GRAFANA_ROOT_URL"; fi
  } > .env.monitoring-server
)

"${compose[@]}" pull --quiet

# Each data directory must be writable by its container's user, which only
# root can arrange: Ansible's base role does it for every host in its
# inventory. Tried for real, as that user, with the gateway's image.
for dir in prometheus-data:65534:65534 loki-data:10001:10001 grafana-data:472:0; do
  name="${dir%%:*}"
  user="${dir#*:}"
  path="$MONITORING_DATA_DIR/$name"
  if [ ! -d "$path" ] || ! docker run --rm --user "$user" --entrypoint sh -v "$path:/data" nginx:1.30.6-alpine \
      -c 'touch /data/.write-test && rm -f /data/.write-test' >/dev/null 2>&1; then
    echo "❌ $path is missing or not writable by uid ${user%%:*}. Run the Ansible provision for this host first." >&2
    exit 1
  fi
done

# Containers of the same names from another compose project, e.g. the single
# monitoring stack of before (project "salko"), would block the new ones
for service in prometheus loki grafana alertmanager blackbox-exporter monitoring-gateway; do
  name="$NAME_PREFIX-$service"
  project=$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$name" 2>/dev/null || true)
  if [ -n "$project" ] && [ "$project" != "salko-monitoring" ]; then
    echo "Removing $name of the compose project \"$project\""
    docker rm -f "$name" >/dev/null
  fi
done

# Recreated every time: a changed config file alone would not restart them
"${compose[@]}" up -d --force-recreate --remove-orphans

# The gateway answers on the published address, and Prometheus, Loki and
# Alertmanager are up behind it (asked from the gateway's container: Loki's
# has no shell)
gateway="$NAME_PREFIX-monitoring-gateway"
for _ in $(seq 1 30); do
  if curl -fsS "http://$MONITORING_BIND_ADDR:3101/health" >/dev/null 2>&1 \
    && docker exec "$gateway" wget -qO- http://prometheus:9090/-/ready >/dev/null 2>&1 \
    && docker exec "$gateway" wget -qO- http://loki:3100/ready >/dev/null 2>&1 \
    && docker exec "$gateway" wget -qO- http://alertmanager:9093/-/ready >/dev/null 2>&1; then
    echo "✅ Monitoring server is up (gateway on $MONITORING_BIND_ADDR:3101)"
    "${compose[@]}" ps
    exit 0
  fi
  sleep 4
done
echo "❌ The monitoring server did not become ready" >&2
"${compose[@]}" ps >&2
"${compose[@]}" logs --tail 30 >&2
exit 1
