#!/usr/bin/env bash
# Checks the monitoring stack's and Traefik's configs with the images the
# compose files pin, the way the server runs them, so an image update is
# tested against these configs before it merges. Nothing here deploys
# them: they only change on the server from main.
#
# checks.yaml runs it when a pull request changes them. It also runs locally
# (Docker, jq, curl), from anywhere in the repository:
#
#   .github/scripts/check-configs.sh monitoring
#   .github/scripts/check-configs.sh traefik
#
# BASE_REF (optional, e.g. HEAD^1 in CI): the commit to compare with. When
# Umami's image changed since then, the old version creates the database
# first and the new one migrates it, as on the server.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

SERVER=docker-compose.monitoring.yaml
AGENT=docker-compose.monitoring-agent.yaml
PREFIX="check-$$-"
NET="check-$$"
WORK=$(mktemp -d)

cleanup() {
  docker ps -aq --filter "name=^${PREFIX}" | xargs -r docker rm -f >/dev/null
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# ::error:: is a GitHub annotation; locally it is just a marker
fail() { echo "::error::$*"; exit 1; }
step() { printf '\n== %s\n' "$*"; }

# image <compose file> <service>: the image the file pins for the service
image() {
  local img
  img=$(docker compose -f "$1" config --no-env-resolution --no-path-resolution --format json 2>/dev/null |
    jq -r --arg s "$2" '.services[$s].image // empty')
  [ -n "$img" ] || fail "$1 has no image for $2"
  echo "$img"
}

# start <name> <docker run arguments...>: a container on the check network
start() {
  local name=$1
  shift
  docker run -d --name "${PREFIX}$name" --network "$NET" "$@" >/dev/null
}

ip() { docker inspect -f "{{(index .NetworkSettings.Networks \"$NET\").IPAddress}}" "${PREFIX}$1"; }

# wait_http <url> <seconds>
wait_http() {
  for _ in $(seq "$2"); do
    curl -sf -o /dev/null "$1" && return 0
    sleep 1
  done
  return 1
}

# logs_and_fail <name> <message>
logs_and_fail() {
  docker logs --tail 40 "${PREFIX}$1" 2>&1 || true
  fail "$2"
}

# The metric names with this prefix that the alerts and dashboards use
used_metrics() {
  grep -rohE "\\b$1[a-z_]+" monitoring/prometheus/alerts.yml monitoring/grafana/provisioning/dashboards | sort -u
}

# check_metrics <metrics url> <prefix>: an exporter still has every metric
# the alerts and dashboards query (a renamed one would leave them empty)
check_metrics() {
  local out="$WORK/metrics.txt" m missing=0 count=0
  curl -sf "$1" >"$out" || fail "Can't read $1"
  for m in $(used_metrics "$2"); do
    count=$((count + 1))
    grep -q "^$m" "$out" || {
      echo "::error::The alerts or dashboards use $m, which $1 no longer has"
      missing=1
    }
  done
  [ "$missing" = 0 ] || exit 1
  echo "It has all $count ${2}* metrics the alerts and dashboards use."
}

check_monitoring() {
  docker network create "$NET" >/dev/null

  step "Prometheus: config and alert rules"
  docker run --rm --entrypoint promtool \
    -v "$PWD/monitoring/prometheus:/etc/prometheus:ro" \
    "$(image $SERVER prometheus)" check config /etc/prometheus/prometheus.yml

  step "Alertmanager: config, start, metrics"
  local am
  am=$(image $SERVER alertmanager)
  echo check-token >"$WORK/token"
  chmod 644 "$WORK/token"
  local am_mounts=(-v "$PWD/monitoring/alertmanager:/etc/alertmanager:ro"
    -v "$WORK/token:/run/secrets/alert-relay-token:ro")
  docker run --rm --entrypoint amtool "${am_mounts[@]}" "$am" check-config /etc/alertmanager/alertmanager.yml
  start alertmanager "${am_mounts[@]}" "$am" \
    --config.file=/etc/alertmanager/alertmanager.yml --cluster.listen-address=
  wait_http "http://$(ip alertmanager):9093/-/ready" 30 || logs_and_fail alertmanager "Alertmanager didn't start"
  check_metrics "http://$(ip alertmanager):9093/metrics" alertmanager_

  step "Loki: config"
  docker run --rm -v "$PWD/monitoring/loki/loki-config.yaml:/etc/loki/loki-config.yaml:ro" \
    "$(image $SERVER loki)" -config.file=/etc/loki/loki-config.yaml -verify-config

  step "Gateway (nginx): config"
  docker run --rm -v "$PWD/monitoring/gateway/nginx.conf:/etc/nginx/nginx.conf:ro" \
    "$(image $SERVER monitoring-gateway)" nginx -t

  step "Blackbox exporter: config"
  docker run --rm -v "$PWD/monitoring/blackbox/blackbox.yml:/etc/blackbox/blackbox.yml:ro" \
    "$(image $SERVER blackbox-exporter)" --config.file=/etc/blackbox/blackbox.yml --config.check

  step "Grafana: data sources and dashboards"
  start grafana -e GF_SECURITY_ADMIN_PASSWORD=check \
    -e GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/etc/grafana/provisioning/dashboards/salko-overview.json \
    -v "$PWD/monitoring/grafana/provisioning:/etc/grafana/provisioning:ro" \
    "$(image $SERVER grafana)"
  local grafana dashboards sources got
  grafana="http://admin:check@$(ip grafana):3000"
  wait_http "$grafana/api/health" 120 || logs_and_fail grafana "Grafana didn't start"
  dashboards=$(find monitoring/grafana/provisioning/dashboards -name '*.json' | wc -l)
  for _ in $(seq 30); do
    got=$(curl -sf "$grafana/api/search?type=dash-db" | jq length)
    [ "$got" -ge "$dashboards" ] && break
    sleep 1
  done
  [ "$got" = "$dashboards" ] || logs_and_fail grafana "Grafana has $got of the $dashboards dashboards"
  sources=$(grep -cE '^  - name:' monitoring/grafana/provisioning/datasources/datasources.yml)
  got=$(curl -sf "$grafana/api/datasources" | jq length)
  [ "$got" = "$sources" ] || logs_and_fail grafana "Grafana has $got of the $sources data sources"
  # The repository has no alerting/ or plugins/ folder; Grafana says so as an error
  if docker logs "${PREFIX}grafana" 2>&1 | grep 'logger=provisioning' | grep 'level=error' |
    grep -vE 'path=/etc/grafana/provisioning/(alerting|plugins) '; then
    fail "Grafana logged provisioning errors"
  fi
  echo "Grafana has all $sources data sources and all $dashboards dashboards."

  step "Alloy (agent): config and components"
  # The push goes nowhere: the config and the components are what is checked
  start alloy -e AGENT_HOST=check -e MONITORING_PUSH_URL=http://127.0.0.1:9 \
    -e MONITORING_PUSH_USER=agent -e MONITORING_PUSH_PASSWORD=check \
    -v "$PWD/monitoring/alloy/config.alloy:/etc/alloy/config.alloy:ro" \
    -v /var/run/docker.sock:/var/run/docker.sock:ro -v /var/log:/var/log:ro \
    "$(image $AGENT alloy)" run /etc/alloy/config.alloy --storage.path=/tmp/alloy \
    --server.http.listen-addr=0.0.0.0:12345 --disable-reporting
  local alloy unhealthy
  alloy="http://$(ip alloy):12345"
  wait_http "$alloy/-/ready" 60 || logs_and_fail alloy "Alloy didn't start"
  unhealthy=$(curl -sf "$alloy/api/v0/web/components" |
    jq -r '.[] | select(.health.state != "healthy") | "\(.localID): \(.health.message // "")"')
  [ -z "$unhealthy" ] || logs_and_fail alloy "Alloy components that aren't healthy: $unhealthy"
  echo "Every Alloy component is healthy."

  step "node-exporter: metrics"
  start node-exporter "$(image $AGENT node-exporter)"
  wait_http "http://$(ip node-exporter):9100/metrics" 30 || logs_and_fail node-exporter "node-exporter didn't start"
  check_metrics "http://$(ip node-exporter):9100/metrics" node_

  step "postgres-exporter: metrics"
  start postgres -e POSTGRES_PASSWORD=check "$(image docker-compose.prod.yaml postgres)"
  # The init runs on a socket-only server; TCP answers once it is done
  for _ in $(seq 60); do
    docker exec "${PREFIX}postgres" pg_isready -q -h 127.0.0.1 -U postgres && break
    sleep 1
  done
  docker exec "${PREFIX}postgres" pg_isready -q -h 127.0.0.1 -U postgres || logs_and_fail postgres "Postgres didn't start"
  start postgres-exporter \
    -e DATA_SOURCE_NAME="postgresql://postgres:check@${PREFIX}postgres:5432/postgres?sslmode=disable" \
    "$(image $AGENT postgres-exporter-prod)"
  local exporter
  exporter="http://$(ip postgres-exporter):9187/metrics"
  wait_http "$exporter" 30 || logs_and_fail postgres-exporter "postgres-exporter didn't start"
  curl -sf "$exporter" | grep -q '^pg_up 1' || logs_and_fail postgres-exporter "postgres-exporter can't reach Postgres"
  check_metrics "$exporter" pg_

  step "Umami: database migrations and login"
  docker exec "${PREFIX}postgres" psql -q -U postgres -c 'CREATE DATABASE umami'
  local new old=""
  new=$(image $AGENT umami)
  if [ -n "${BASE_REF:-}" ] && git show "$BASE_REF:$AGENT" >"$WORK/base-agent.yaml" 2>/dev/null; then
    old=$(image "$WORK/base-agent.yaml" umami)
  fi
  if [ -n "$old" ] && [ "$old" != "$new" ]; then
    echo "$old creates the database, then $new migrates it."
    run_umami "$old"
    docker rm -f "${PREFIX}umami" >/dev/null
  fi
  run_umami "$new"
  docker logs "${PREFIX}umami" 2>&1 | grep -iE 'migration' || true
  # A new database has Umami's default login
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'content-type: application/json' \
    -d '{"username":"admin","password":"umami"}' "http://$(ip umami):3000/api/auth/login")
  [ "$code" = 200 ] || logs_and_fail umami "Umami's login answered $code"
  echo "$new runs on the migrated database and logs in."
}

# run_umami <image>
run_umami() {
  start umami -e DATABASE_TYPE=postgresql \
    -e DATABASE_URL="postgresql://postgres:check@${PREFIX}postgres:5432/umami" \
    -e APP_SECRET=check -e DISABLE_TELEMETRY=1 "$1"
  wait_http "http://$(ip umami):3000/api/heartbeat" 180 || logs_and_fail umami "$1 didn't start"
}

check_traefik() {
  docker network create "$NET" >/dev/null

  step "Traefik: static config and the file provider"
  # As traefik/docker-compose.traefik.yaml runs it; no routers, so no certificates
  start traefik -v "$PWD/traefik/traefik.yaml:/traefik.yaml:ro" \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    "$(image traefik/docker-compose.traefik.yaml traefik)" --configFile=/traefik.yaml
  sleep 10
  [ "$(docker inspect -f '{{.State.Running}}' "${PREFIX}traefik")" = true ] ||
    logs_and_fail traefik "Traefik stopped"
  # Without colours, Traefik's levels read ERR/WRN; warnings are not errors
  if docker logs "${PREFIX}traefik" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E ' (ERR|FTL) '; then
    fail "Traefik logged errors"
  fi
  echo "Traefik runs the config without errors."
}

case "${1:-}" in
  monitoring) check_monitoring ;;
  traefik) check_traefik ;;
  *)
    echo "Usage: $0 monitoring|traefik" >&2
    exit 2
    ;;
esac
printf '\nAll checks passed.\n'
