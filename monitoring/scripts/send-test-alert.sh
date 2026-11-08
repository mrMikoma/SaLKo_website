#!/usr/bin/env bash
# Sends a test alert through Alertmanager to the alert relay and checks that
# Alertmanager delivered it. Run on the monitoring server by
# deploy-monitoring.yaml when it is started by hand with "Send a test alert".
# The test alert ends after 5 minutes, which sends a second email, "Ratkesi".
#
#   NAME_PREFIX   container name prefix (default salko)
set -euo pipefail

NAME_PREFIX="${NAME_PREFIX:-salko}"
alertmanager="$NAME_PREFIX-alertmanager"

# Finished attempts to call the relay so far, and the failed ones, from
# Alertmanager's own metrics. Counted per attempt:
# alertmanager_notifications_failed_total only counts a failure once all its
# retries are spent. The latency count grows when an attempt has finished.
# The Watchdog heartbeat (every 4 minutes) uses the same integration, so the
# numbers are compared only after the test alert's 1-minute group wait.
count() {
  docker exec "$alertmanager" wget -qO- http://localhost:9093/metrics |
    awk -v name="$1" '$1 ~ "^"name"\\{" && $1 ~ /integration="webhook"/ { n += $2 } END { printf "%d\n", n }'
}
done_before=$(count alertmanager_notification_latency_seconds_count)
failed_before=$(count alertmanager_notification_requests_failed_total)

# Without --start, amtool starts it at its end time
docker exec "$alertmanager" amtool alert add \
  --alertmanager.url=http://localhost:9093 \
  --start="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --end="$(date -u -d '+5 minutes' +%Y-%m-%dT%H:%M:%SZ)" \
  alertname=TestAlert severity=warning \
  --annotation='summary="Test alert from the monitoring deploy"' \
  --annotation='description="Started by hand from GitHub Actions (Deploy Monitoring Stack). If you can read this, alert emails work. It ends by itself in 5 minutes."'
echo "Test alert added; Alertmanager sends it after its 1-minute group wait"

# group_wait is 1 minute; a failed call is retried and counted each time
sleep 100
finished=$(( $(count alertmanager_notification_latency_seconds_count) - done_before ))
failed=$(( $(count alertmanager_notification_requests_failed_total) - failed_before ))
if [ "$failed" -gt 0 ]; then
  echo "❌ Alertmanager could not deliver the alert to the alert relay:" >&2
  docker logs --since 5m "$alertmanager" 2>&1 | grep -i 'notify\|webhook' | tail -5 >&2 || true
  echo "Check ALERT_RELAY_TOKEN (GitHub secret), that the relay's ALERT_RELAY_CLIENTS has its SHA-256, and https://alerts.vanttula.fi/v1/health (monitoring/README.md, \"Alerts\")." >&2
  exit 1
fi
if [ "$finished" -lt 1 ]; then
  echo "❌ No delivery attempt within 100 seconds" >&2
  docker logs --tail 20 "$alertmanager" >&2 || true
  exit 1
fi
echo "✅ The alert relay accepted the test alert. Look for \"[salko] Test alert from the monitoring deploy\" in admin@savonlinnanlentokerho.fi (and spam); the relay answered 200, so the mail was handed to Cloudflare."
