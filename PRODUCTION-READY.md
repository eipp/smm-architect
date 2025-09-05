# Production Readiness Guide

This guide summarizes the steps required to deploy **SMM Architect** to a production environment.

## Prerequisites
- Node.js 18+
- Docker Engine 24+ and Docker Compose
- npm or pnpm package manager
- Encore CLI (`npm install -g @encore/cli`)
- OPA CLI for policy testing

## Environment Variables
Configure the following variables before deployment:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis instance URL |
| `VAULT_URL` | HashiCorp Vault server address |
| `VAULT_TOKEN` | Vault authentication token |
| `SENTRY_DSN` | Sentry project DSN |
| `OPENAI_API_KEY` | API key for OpenAI tools |
| `API_URL` | Public URL for the core API |
| `TOOLHUB_URL` | URL of the ToolHub service |
| `GRAFANA_PASSWORD` | Admin password for Grafana |
| `GRAFANA_SECRET_KEY` | Grafana security key |

## Deployment Steps
1. Install dependencies: `npm install`
2. Run validation checks:
   ```bash
   make test
   make test-security
   ```
3. Provision infrastructure (e.g., `pulumi up`) and set secrets in Vault.
4. Build and start services:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
5. Import n8n workflows and deploy Agentuity agents.
6. Verify service health at `http://localhost:4000/health` and `http://localhost:3001`.

## Monitoring
- Prometheus metrics at `http://localhost:9090`
- Grafana dashboards at `http://localhost:3001`
- Service metrics endpoints:
  - Core service: `http://localhost:4000/metrics`
  - ToolHub: `http://localhost:3001/metrics`
  - Simulator: `http://localhost:8081/metrics`
- Sentry for error tracking via `SENTRY_DSN`

## Rollback Procedure
1. Identify the last known good container image tag.
2. Redeploy the previous image:
   ```bash
   docker compose -f docker-compose.prod.yml up -d smm-architect=<tag> toolhub=<tag> frontend=<tag>
   ```
3. If rollback is due to contract issues, revert to the previous workspace contract version and redeploy.
4. Generate an audit bundle for post-mortem analysis.

