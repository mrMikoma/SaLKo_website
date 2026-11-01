#!/usr/bin/env bash
# Sends a test alert through Alertmanager and waits until its email has gone
# out, or failed. Run on the monitoring server by deploy-monitoring.yaml when
# it is started by hand with "Send a test alert email". The test alert ends
# after 5 minutes, which sends a second email, "RESOLVED".
#
#   NAME_PREFIX   container name prefix (default salko)
set -euo pipefail

NAME_PREFIX="${NAME_PREFIX:-salko}"
alertmanager="$NAME_PREFIX-alertmanager"

# Finished attempts to send email so far, and the failed ones, from
# Alertmanager's own metrics. Counted per attempt:
# alertmanager_notifications_failed_total only counts a failure once all its
# retries are spent. The latency count grows when an attempt has finished, its
# requests total already when it starts.
count() {
  docker exec "$alertmanager" wget -qO- http://localhost:9093/metrics |
    awk -v name="$1" '$1 ~ "^"name"\\{" && $1 ~ /integration="email"/ { n += $2 } END { printf "%d\n", n }'
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

# Alertmanager waits group_wait (1 min) before the first email
for _ in $(seq 1 36); do
  sleep 5
  finished=$(( $(count alertmanager_notification_latency_seconds_count) - done_before ))
  failed=$(( $(count alertmanager_notification_requests_failed_total) - failed_before ))
  if [ "$failed" -gt 0 ]; then
    echo "❌ Alertmanager could not send the email:" >&2
    docker logs --since 5m "$alertmanager" 2>&1 | grep -i 'notify\|email\|smtp' | tail -5 >&2 || true
    echo "Check that the Google Admin console's SMTP relay accepts this host's public IP address (monitoring/README.md, \"Alert emails\")." >&2
    exit 1
  fi
  if [ "$finished" -gt "$failed" ]; then
    echo "✅ Alertmanager handed the test email to Google's SMTP relay. Look for \"[SaLKo WARNING] Test alert from the monitoring deploy\" in admin@savonlinnanlentokerho.fi (and spam)."
    exit 0
  fi
done
echo "❌ No email attempt within 3 minutes" >&2
docker logs --tail 20 "$alertmanager" >&2 || true
exit 1
