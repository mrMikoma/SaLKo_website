# SaLKo Monitoring Stack

Metrics, logs, dashboards and alert emails for the SaLKo website, built on
Grafana, Prometheus, Loki, Alertmanager and Grafana Alloy. The stack has two
parts, so the part that stores the data can run on salko0 next to the apps, as
now, or on another host in the private network.

```
 app host (salko0)                                monitoring server (salko0 or another host)
 ┌──────────────────────────────────────┐         ┌───────────────────────────────────────┐
 │ containers ──logs──┐                 │         │  gateway (nginx, password)            │
 │ /var/log ──────────┤                 │  push   │   ├─ /loki/api/v1/push ──▶ Loki       │
 │ node-exporter ─────┼─▶ Grafana Alloy ├────────▶│   └─ /api/v1/write ──────▶ Prometheus │
 │ cAdvisor ──────────┤    (agent)      │         │  Grafana ◀── Loki, Prometheus         │
 │ postgres-exporters ┤                 │         │  Prometheus ─▶ Alertmanager ─▶ email  │
 │ Traefik :8080 ─────┘                 │         └───────────────────────────────────────┘
 │ pgAdmin, Umami                       │
 └──────────────────────────────────────┘
```

| Part | Compose file | Env file on the host | Services |
|---|---|---|---|
| Server | `docker-compose.monitoring.yaml` (project `salko-monitoring`) | `.env.monitoring-server` | Prometheus (with the alert rules), Loki, Grafana, Alertmanager, blackbox-exporter, `monitoring-gateway` |
| Agent | `docker-compose.monitoring-agent.yaml` (project `salko-monitoring-agent`) | `.env.monitoring` | Alloy, node-exporter, cAdvisor, postgres-exporter-dev/-prod, pgAdmin, Umami |

The agent collects everything on its host and **pushes** it to the server:
container logs and `/var/log/*log` go to Loki, and the scraped metrics go to
Prometheus by remote write. The server never connects to the app host. The
only way in is the gateway, which accepts only those two push APIs, and only
with the agents' password. Prometheus and Loki keep 30 days.

pgAdmin and Umami are part of the agent because they need the app host's
database networks (`salko_dev_internal`, `salko_prod_internal`).

## Deploying

Everything goes through `.github/workflows/deploy-monitoring.yaml`. It runs
automatically on pushes to `main` that touch the stack, or by hand from
`main`. It:

1. copies the server's files to the server host and the agent's files to salko0;
2. runs `monitoring/scripts/deploy-server.sh` on the server host. The script
   makes the agents' password once, keeps it in
   `~/monitoring/gateway/push-password` (0600), writes the gateway's htpasswd
   from it and starts the server;
3. runs `monitoring/scripts/deploy-agent.sh` on salko0 with that password and
   the server's address. It writes `.env.monitoring` and starts the agent;
4. checks, on the server, that the agent's own `up` metric and its logs have
   arrived.

Both scripts recreate their containers on every deploy, so that changed
config files take effect. They also remove containers of the same name left
over from another compose project (the single monitoring stack used before
this split ran as project `salko`).

The app deploys (`deploy-app-dev.yaml`, `deploy-app-prod.yaml`) write their
database DSNs and Umami's settings into `.env.monitoring` and run `up -d` on
the agent.

Secrets: `GRAFANA_ADMIN_PASSWORD` (Grafana and pgAdmin), `POSTGRES_PASSWORD`
(the exporters log in as `salko_admin`) and `UMAMI_APP_SECRET`. The agents'
password is not a GitHub secret: it is made on the server. Alert emails need
none either (see "Alert emails").

Started by hand, the workflow can also **send a test alert email** (the
"Send a test alert email" box): see "Alert emails".

## Moving the server to another host

The server runs on `vars.MONITORING_SERVER_IP`, or on `vars.SERVER_IP_SALKO0`
when that variable is unset. To move it:

1. **Create the host** in the Hetzner private network, e.g. with Terraform
   (`instances = 2` gives `salko1` at 10.1.2.3), or use any other host the
   runners and salko0 can reach privately.
2. **Set the repository variable** `MONITORING_SERVER_IP` to the host's
   **private** address. The server publishes its gateway (`:3101`) and
   Grafana (`:3000`) on that address. Docker's published ports bypass UFW, and
   Hetzner's firewall doesn't filter the private network, so a public address
   here would open them to the internet.
3. **Run "Ansible VPS Provisioning"** from `main`. Its inventory now includes
   `MONITORING_SERVER_IP`. Ansible installs Docker, creates the
   `salko_monitoring` network and creates the data directories with the
   owners the containers need. `deploy-server.sh` refuses to start without
   them.
4. Optionally, **copy the history**: stop the server on salko0 and copy
   `~/monitoring/{prometheus,loki,grafana}-data` to the new host, keeping the
   owners (65534, 10001, 472). Without this, the new server starts empty, and
   the old data stays on salko0 until it is deleted.
5. **Allow the new host to send alert emails:** add its public IPv4 address to
   the SMTP relay setting in the Google Admin console ("Alert emails", below).
6. **Run "Deploy Monitoring Stack"** from `main` with "Send a test alert email"
   ticked. The server starts on the new host, and the agent on salko0 switches
   to `http://<MONITORING_SERVER_IP>:3101` and stops the old server's
   containers there (`SERVER_ELSEWHERE`). The test email shows that the new
   host's alerts get through.
7. **Grafana** is then at `http://<MONITORING_SERVER_IP>:3000` over the VPN.
   `grafana.savonlinnanlentokerho.fi` goes through Traefik on salko0 and only
   reaches a Grafana on the same host. To keep the name, add a Traefik file
   route to `http://<MONITORING_SERVER_IP>:3000` with the `internal-only`
   middleware.

To move it back, unset `MONITORING_SERVER_IP` and deploy again.

More app hosts: run the agent on each with its own `AGENT_HOST`. Every metric
and log line carries a `host` label.

## Access

From the private network or the VPN (Traefik's `internal-only` middleware):

| Service | URL |
|---|---|
| Grafana | https://grafana.savonlinnanlentokerho.fi (login `admin@savonlinnanlentokerho.fi`, `GRAFANA_ADMIN_PASSWORD`) |
| Prometheus | https://prometheus.savonlinnanlentokerho.fi |
| pgAdmin | https://pgadmin.savonlinnanlentokerho.fi (same login) |
| Umami | https://umami.savonlinnanlentokerho.fi |
| node-exporter, cAdvisor | https://nodeexporter.savonlinnanlentokerho.fi, https://cadvisor.savonlinnanlentokerho.fi |

The Prometheus and Loki names work only while the server runs on salko0.

## Dashboards

Provisioned from `monitoring/grafana/provisioning/dashboards/`; edit the JSON
and deploy:

- **SaLKo Overview** (`salko-overview.json`, Grafana's home page): the answer to "is
  the site up, is anything wrong" at a glance.
  - Top row: critical alerts, the public site, `/api/health` (app and database),
    the prod database, kehitys and the agent, each UP/DOWN with its colour.
  - Second row: warnings, front page load time, server errors and app errors in
    the last hour, disk use and days left on the certificate.
  - Then the firing alerts and the production app's latest errors and warnings
    side by side, traffic by status and response times, logs by container and
    level, the host's CPU, memory and disk, and a table of every container with
    its uptime and restarts.
- **System Overview**: CPU, memory, disk, network, load
- **Container Metrics**: per-container CPU, memory, network
- **PostgreSQL Metrics**: connections, transactions, size, cache hit ratio
- **Application Logs**: logs and log rate per service

## Uptime probes and alerts

- **Probes:** Prometheus asks the blackbox exporter
  (`monitoring/blackbox/blackbox.yml`) every 30 s to load
  https://savonlinnanlentokerho.fi/ and its `/api/health`, and the same pages
  on kehitys, through Cloudflare as a visitor would. `/api/health`
  (`nextjs/app/api/health/route.ts`) answers 200 `{"status":"ok"}` only when
  the app and its database answer. The probes run on the server, so they keep
  working wherever it runs.
- **Alert rules** (`monitoring/prometheus/alerts.yml`), evaluated by Prometheus:
  - website: down, health check failing, kehitys down, slow, 5xx share, certificate expiry (Cloudflare's and Traefik's);
  - services: a key container not running or restarting, a database down;
  - host: disk at 85 % / 95 %, memory, CPU;
  - monitoring: the agent silent, a scrape target down, alert emails failing
    (this one shows only in Grafana).

  Each rule has `severity: critical` or `warning`. They show on the overview
  and under Alerting → Alert rules in Grafana, and are emailed (below).

Check the rules before deploying:

```bash
docker run --rm --entrypoint promtool -v "$PWD/monitoring/prometheus:/etc/prometheus:ro" \
  prom/prometheus:v3.15.1 check config /etc/prometheus/prometheus.yml
```

## Alert emails

Prometheus hands firing alerts to Alertmanager
(`monitoring/alertmanager/alertmanager.yml`), which emails them to
**admin@savonlinnanlentokerho.fi**, from the same address.

- **When:** the first email comes a minute after an alert starts firing, so
  that alerts starting together arrive as one email. One email covers one alert
  and severity: the same alert on several targets is one email, but a site
  outage doesn't share an email with a disk warning. While it lasts, a reminder
  comes every 4 hours for `critical` and every 12 hours for `warning`. A
  "RESOLVED" email follows when it's over.
- **Not sent while their cause fires:** the health check, slowness and errors
  while the site is down; every alert about the app host while its agent is
  silent; the disk at 85 % while it is at 95 %.
- **The email** (`monitoring/alertmanager/templates/salko.tmpl`): the subject
  is `[SaLKo CRITICAL] <summary>`, `[SaLKo WARNING] …` or `[SaLKo RESOLVED] …`.
  The body has each alert's summary, description and start time (Finnish time)
  and a link to the overview in Grafana.
- **Muting during maintenance:** in Grafana, go to Alerting → Silences, choose
  the **Alertmanager** source, and add a silence for the alert names and a
  duration.

### Setup in the Google Admin console (once)

Alertmanager sends through Google Workspace's SMTP relay,
`smtp-relay.gmail.com:587`. The relay accepts mail by the sending server's IP
address, so there is no password to store. An app password for
`smtp.gmail.com` would open the whole mailbox, which was ruled out for the
website's mail too (`nextjs/docs/MAIL_SETUP.md`). Hetzner blocks outgoing
ports 25 and 465, but not 587.

1. In the Google Admin console, go to Apps → Google Workspace → Gmail →
   Routing → **SMTP relay service** → Configure. Name it "SaLKo monitoring".
2. **Allowed senders:** Only addresses in my domains.
3. **Authentication:** tick "Only accept mail from the specified IP addresses"
   and add the monitoring server's **public** IPv4 address: salko0's, or the
   monitoring host's when it has moved. Leave "Require SMTP Authentication"
   unticked.
4. **Encryption:** tick "Require TLS encryption". Save. Google says a change
   can take up to 24 hours, usually it is minutes.
5. Run **Deploy Monitoring Stack** from `main` with **Send a test alert email**
   ticked. The run waits until Alertmanager has handed the email to Google, or
   fails with Google's answer. Two emails arrive: `[SaLKo WARNING] Test alert
   from the monitoring deploy`, and five minutes later its `RESOLVED`.

### What it doesn't catch

- **The monitoring server itself going down.** Alertmanager runs on it, so
  nothing is sent. While the server runs on salko0, that includes salko0
  going down entirely. With the server on another host, an outage of salko0 is
  emailed (`WebsiteDown`, `MonitoringAgentSilent`). Catching the server's own
  death would need a heartbeat to an outside service, which isn't set up.
- **Email that can't be sent.** That shows in Grafana as `AlertEmailsFailing`.

## Logs

Alloy reads the logs of every container with the label `logging=promtail`.
The label keeps its old name, so the app compose files need no change. Alloy
also reads the host's `/var/log/*log`. Labels: `host`, `container`,
`compose_project`, `compose_service`, `environment`, `stream` and `job`
(`docker` or `varlogs`).

- **Levels:** Loki adds `detected_level` to every line: from the `level`
  field of the Next.js app's JSON records (`nextjs/docs/LOGGING.md`), and from
  words like `ERROR` or `WARN` in plain text. Example:
  `{compose_service="nextjs", environment="prod"} | detected_level=~"error|fatal" | json`.
- **Redaction:** before a line leaves the host, Alloy masks passwords
  (`password=…`, `"password":"…"`), `user:password@` in URLs, bearer and basic
  credentials, and email addresses (`monitoring/alloy/config.alloy`). The app
  redacts its own records as well. This catches the rest, such as
  postgres-exporter printing its DSN on a parse error, or Postgres `DETAIL:`
  lines with row values.

To collect a new service's logs, give it the label:

```yaml
labels:
  - logging=promtail
  - environment=prod # or dev
```

## Troubleshooting

On the hosts, from the deploy user's home:

```bash
# Server
docker compose --env-file .env.monitoring-server -f docker-compose.monitoring.yaml ps
docker logs salko-monitoring-gateway      # 401s: wrong agent password
# Agent
docker compose --env-file .env.monitoring -f docker-compose.monitoring-agent.yaml ps
docker logs salko-alloy                   # push or scrape errors
```

- **No data at all:** check Alloy's log for `server returned HTTP status 401`
  (the password: redeploy) or connection errors (the address in
  `MONITORING_PUSH_URL`, or the gateway not published on it). Alloy keeps a
  write-ahead log, so data from a short outage is sent afterwards.
- **One target missing:** Alloy's UI at `http://salko-alloy:12345` (on the
  `salko_monitoring` network) lists each scrape and its last error. In Grafana,
  `up{host="salko0"}` shows the same.
- **Database metrics missing:** `pg_up{database="prod"}` is 0 when the
  exporter can't log in. Check `PROD_POSTGRES_EXPORTER_DSN` / `DEV_POSTGRES_EXPORTER_DSN`
  in `.env.monitoring`.
- **Server won't start on a new host:** run the Ansible provision for it
  first (data directory owners).
- **No alert emails:** `docker logs salko-alertmanager` on the server shows
  `Notify attempt failed` with Google's answer. A refused relay means the
  Admin console doesn't list the server's public IP ("Alert emails"). Run the
  workflow with "Send a test alert email" to try again. Grafana shows
  `AlertEmailsFailing` meanwhile.
