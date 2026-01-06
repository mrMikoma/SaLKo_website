# SaLKo Monitoring Stack

Complete observability solution for the SaLKo website infrastructure using open-source Grafana stack.

## Architecture

The monitoring stack provides comprehensive observability with:

- **Grafana** - Visualization and dashboards (Port 4000)
- **Prometheus** - Metrics collection and storage (Port 9090)
- **Loki** - Log aggregation (Port 3100)
- **Promtail** - Log shipper for Docker containers
- **Node Exporter** - Host system metrics (Port 9100)
- **cAdvisor** - Container metrics (Port 8080)
- **Postgres Exporter** - Database metrics for dev (Port 9187) and prod (Port 9188)
- **pgAdmin4** - PostgreSQL database management UI (Port 5000)

## What's Monitored

### System Metrics

- CPU usage, memory, disk space, network I/O
- System load averages
- Filesystem usage

### Container Metrics

- CPU and memory per container
- Network traffic per container
- Container health status

### Database Metrics

- Active connections
- Transaction rates (commits/rollbacks)
- Query performance
- Database size
- Cache hit ratios
- Tuple operations (inserts/updates/deletes)

### Application Logs

- All Docker container logs collected automatically
- Searchable and filterable in Grafana
- Correlated with metrics

## Quick Start

### Prerequisites

1. Add the following secrets to your GitHub repository's **development** environment:
   - `GRAFANA_ADMIN_PASSWORD` - Password for Grafana admin user
   - `POSTGRES_PASSWORD` - PostgreSQL password (used for both dev and prod database monitoring)
   - `PGADMIN_DEFAULT_EMAIL` - Email for pgAdmin4 login (e.g., admin@example.com)
   - `PGADMIN_DEFAULT_PASSWORD` - Password for pgAdmin4 login

### Deployment

The monitoring stack is deployed automatically via GitHub Actions when changes are pushed to the `main` branch affecting monitoring files.

Manual deployment:

```bash
# Go to GitHub Actions
# Run "Deploy Monitoring Stack" workflow
# Or push changes to monitoring/** files
```

### Initial Access

1. From your local machine in the 10.1.0.0/16 network:

   - Grafana: http://10.1.0.x:4000
   - Prometheus: http://10.1.0.x:9090
   - Loki: http://10.1.0.x:3100
   - pgAdmin4: http://10.1.0.x:5000

2. Login to Grafana and pgAdmin4:
   - Email: `admin@savonlinnanlentokerho.fi`
   - Password: (from GitHub secret `GRAFANA_ADMIN_PASSWORD`)

## Pre-configured Dashboards

### 1. System Overview

- Real-time system metrics
- CPU, Memory, Disk, Network graphs
- System load indicators

### 2. Container Metrics

- Per-container resource usage
- Network I/O by container
- Container statistics table

### 3. PostgreSQL Metrics

- Database connections
- Transaction rates
- Query performance
- Cache hit ratios
- Database size tracking

### 4. Application Logs

- Live log streaming
- Filter by service
- Search across all containers
- Log rate visualization

## Database Management with pgAdmin4

pgAdmin4 is included in the monitoring stack with **automatic database server configuration**.

### Accessing pgAdmin4

1. Open http://10.1.0.x:5000 in your browser (from private network)
2. Login with `admin@savonlinnanlentokerho.fi` and your `GRAFANA_ADMIN_PASSWORD`
3. **Both dev and prod database servers are automatically configured** - they will appear in your server list ready to use

### Auto-Configured Servers

The deployment workflow automatically creates a `servers.json` file that configures:

- **SaLKo Dev** - Development database (salko-postgres-dev:5432)
- **SaLKo Prod** - Production database (salko-postgres-prod:5432)

Both use `salko_admin` username. You'll need to enter the password on first connection.

**Note**: If servers don't appear, redeploy the monitoring stack via GitHub Actions to regenerate the configuration.

### Common Tasks

**Running Queries:**

- Navigate to a server → expand database → Right-click → "Query Tool"

**Viewing Data:**

- Navigate to Tables → Right-click a table → "View/Edit Data" → "All Rows"

**Database Backup:**

- Right-click database → "Backup..." → Choose format and location

## Configuration

### Environment Variables

Configuration is managed via `.env.monitoring` on the server:

```bash
NAME_PREFIX=salko
ENVIRONMENT=prod
GRAFANA_ADMIN_PASSWORD=<your-password>
DEV_POSTGRES_EXPORTER_DSN=postgresql://postgres:<password>@salko-postgres-dev:5432/salko?sslmode=disable
PROD_POSTGRES_EXPORTER_DSN=postgresql://postgres:<password>@salko-postgres-prod:5432/salko?sslmode=disable
```

### Adding Log Collection to New Services

To enable log collection for a new Docker service, add these labels:

```yaml
labels:
  - logging=promtail
  - environment=prod # or dev
```

### Data Retention

- **Prometheus**: 30 days
- **Loki**: 30 days (720 hours)
- All data is persisted in `/home/salko/monitoring/` on the server

## Network Access

All monitoring services are accessible only from the `10.0.0.0/16` network:

- No Traefik routing required
- Direct access via IP:PORT
- Access controlled by UFW firewall (configured via Ansible)
- Ports are bound to 0.0.0.0 but restricted by firewall rules

## Docker Networks

The monitoring stack uses shared Docker networks to communicate with application containers:

- **salko_dev_internal** - Created by Ansible, shared between dev postgres and dev postgres-exporter
- **salko_prod_internal** - Created by Ansible, shared between prod postgres and prod postgres-exporter
- **global_outgoing** - Shared network for Traefik and external connectivity
- **monitoring** - Internal network for monitoring stack components

These networks are created automatically during Ansible provisioning ([infra/ansible/roles/docker_install/tasks/main.yml](../../infra/ansible/roles/docker_install/tasks/main.yml)).

## Troubleshooting

### Check Service Status

```bash
docker compose --env-file .env.monitoring -f docker-compose.monitoring.yaml ps
```

### Permission Issues

If Grafana/Loki/Prometheus fail with "attempt to write a readonly database" errors:

1. **Run Ansible provisioning** to set correct directory permissions:

   ```bash
   cd infra/ansible
   ansible-playbook -i inventory.ini playbook.yml
   ```

2. **Or manually fix permissions on the server**:

   ```bash
   sudo chown -R 472:0 /home/salko/monitoring/grafana-data
   sudo chmod -R 775 /home/salko/monitoring/grafana-data
   sudo chown -R 10001:0 /home/salko/monitoring/loki-data
   sudo chmod -R 775 /home/salko/monitoring/loki-data
   sudo chown -R 65534:0 /home/salko/monitoring/prometheus-data
   sudo chmod -R 775 /home/salko/monitoring/prometheus-data
   ```

3. **Restart the monitoring stack**:
   ```bash
   docker compose --env-file .env.monitoring -f docker-compose.monitoring.yaml restart
   ```

### View Service Logs

```bash
docker logs salko-grafana
docker logs salko-prometheus
docker logs salko-loki
docker logs salko-promtail
```

### Restart Monitoring Stack

```bash
docker compose --env-file .env.monitoring -f docker-compose.monitoring.yaml restart
```

### Common Issues

**Grafana won't start:**

- Check data directory permissions: `chmod -R 755 /home/salko/monitoring/grafana-data`
- Check password is set in `.env.monitoring`

**No metrics showing:**

- Verify Prometheus targets: http://10.1.0.x:9090/targets
- Ensure containers have `logging=promtail` label

**Logs not appearing:**

- Check Promtail is running: `docker logs salko-promtail`
- Verify containers have the `logging=promtail` label
- Check Loki datasource in Grafana

**Database metrics missing:**

- Verify postgres exporter can connect to databases
- Check connection strings in `.env.monitoring`
- Ensure databases are running

## Maintenance

### Updating Dashboards

1. Edit dashboard JSON files in `monitoring/grafana/provisioning/dashboards/`
2. Commit and push to `main` branch
3. Workflow will redeploy automatically

### Updating Configuration

1. Edit config files in `monitoring/prometheus/`, `monitoring/loki/`, etc.
2. Commit and push to `main` branch
3. Workflow will redeploy automatically

### Manual Data Cleanup

```bash
# Clear old Prometheus data (if needed)
docker compose --env-file .env.monitoring -f docker-compose.monitoring.yaml down
rm -rf /home/salko/monitoring/prometheus-data/*
docker compose --env-file .env.monitoring -f docker-compose.monitoring.yaml up -d
```

## Architecture Details

### Service Communication

```
┌─────────────┐      ┌──────────────┐
│  Prometheus │─────▶│ Node Exporter│
│             │      └──────────────┘
│             │      ┌──────────────┐
│             │─────▶│   cAdvisor   │
│             │      └──────────────┘
│             │      ┌──────────────┐
│             │─────▶│Postgres Exp. │
└──────┬──────┘      └──────────────┘
       │
       │             ┌──────────────┐
       └────────────▶│   Grafana    │◀──────┐
                     └──────────────┘       │
                                            │
┌─────────────┐      ┌──────────────┐      │
│  Promtail   │─────▶│     Loki     │──────┘
└─────────────┘      └──────────────┘
       ▲
       │
   [Docker
  Containers]
```

### Data Flow

1. **Metrics**: Exporters expose metrics → Prometheus scrapes → Grafana visualizes
2. **Logs**: Containers output logs → Promtail collects → Loki stores → Grafana queries

## Performance Impact

The monitoring stack is designed to be lightweight:

- Prometheus: ~200MB RAM, minimal CPU
- Loki: ~100MB RAM, minimal CPU
- Grafana: ~100MB RAM, minimal CPU
- pgAdmin4: ~200-400MB RAM, <5% CPU (mostly idle)
- Exporters: <50MB RAM each, minimal CPU
- Promtail: ~50MB RAM, minimal CPU

Total overhead: ~800MB-1GB RAM, <10% CPU under normal load

## Security

- Admin credentials stored in GitHub Secrets
- Services only accessible from private network (10.0.0.0/16)
- Database passwords not logged or exposed
- Docker socket access restricted to necessary services

## Support

For issues or questions:

- Check logs: `docker logs <container-name>`
- Review workflow runs in GitHub Actions
- Verify network connectivity from 10.0.0.0/16
