# SaLKo Website

Website for **Savonlinnan Lentokerho ry** (Savonlinna Flying Club) - a general aviation flying club based in Savonlinna, Finland.

## Tech Stack

- **Framework:** Next.js 16 with React 19 and TypeScript
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL 17
- **Authentication:** NextAuth v5 (Google OAuth + credentials)
- **Infrastructure:** Hetzner Cloud with Terraform and Ansible, Docker Compose, Traefik

## Project Structure

```
nextjs/            # Main Next.js full-stack application
postgres/          # Database initialization scripts
infra/             # Terraform & Ansible for infrastructure
monitoring/        # Grafana, Prometheus, Loki etc. monitoring stack
cronjobs/          # Scheduled tasks (METAR weather updates)
traefik/           # Reverse proxy configuration
.github/workflows/ # CI/CD pipelines
```

## Features

- Aircraft inventory and booking calendar
- Member area with profile management
- Flight training and demo flight information
- Airport information with live aviation weather (METAR) display
- General club information
- Admin dashboard for user and content management
- Responsive design with dark mode support

## Development

```bash
# Start the database
cd postgres
docker compose up -d

# Install dependencies and run dev server
cd nextjs
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_CONNECTION_STRING` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret key
- `NEXTAUTH_URL` - App URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - OAuth credentials

## Monitoring

The project includes a full observability stack in the `monitoring/` directory:

- **Grafana** - Dashboards and visualization
- **Prometheus** - Metrics collection and alerting
- **Loki** - Log aggregation
- **Promtail** - Log shipping from Docker containers
- **Node Exporter** - Host system metrics
- **cAdvisor** - Container metrics
- **Postgres Exporter** - Database metrics
- **pgAdmin4** - Database management UI

Pre-configured dashboards include system overview, container metrics, PostgreSQL performance, and application logs. All services are accessible only from the private network. See [monitoring/README.md](monitoring/README.md) for detailed setup and configuration.

## Deployment

Deployments are automated via GitHub Actions:

- Production deployment in `main` branch
- Push to `dev` triggers development deployment
- Infrastructure managed with Terraform
- Server configuration with Ansible

## License

Private - All rights reserved.
