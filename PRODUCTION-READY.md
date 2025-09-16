# SMM Architect Production Readiness

This guide outlines the steps required to deploy SMM Architect to a production environment and verify the platform is ready to serve live traffic.

## Prerequisites

- Node.js 18+
- Docker 20+ and Docker Compose
- Kubernetes 1.24+ with `kubectl` and Helm 3.8+
- HashiCorp Vault for secrets management
- PostgreSQL 14+ (managed or self-hosted)
- Open Policy Agent (OPA) CLI for policy testing
- Global CLIs: `@encore/cli`

## Environment Configuration

Create a `.env` file or export the following variables before deployment:

```bash
# Core
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database & Cache
DATABASE_URL=postgresql://user:pass@db-host:5432/smm_architect
REDIS_URL=redis://redis-host:6379

# Secrets
VAULT_URL=https://vault.example.com
VAULT_TOKEN=<vault-token>
JWT_SECRET=<32+ chars>
ENCRYPTION_KEY=<32+ chars>

# External Services
OPENAI_API_KEY=<openai-key>
ANTHROPIC_API_KEY=<anthropic-key>
PINECONE_API_KEY=<pinecone-key>
N8N_URL=https://n8n.example.com
AGENTUITY_URL=https://agentuity.example.com

# Monitoring
SENTRY_DSN=<sentry-dsn>
PROMETHEUS_ENABLED=true
```

## Deployment Steps

1. **Install dependencies**
   ```bash
   npm install -g @encore/cli
   ```

2. **Start services** using the production compose file:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
   Services exposed:
   - SMM Architect API: `http://localhost:4000`
   - ToolHub Service: `http://localhost:3001`
   - Frontend: `http://localhost:3000`
   - Prometheus: `http://localhost:9090`
   - Grafana: `http://localhost:3001`

3. **Run database migrations** (handled by Encore in the core service):
   ```bash
   cd services/smm-architect
   encore db setup
   encore db migrate
   ```

## Final Validation

Run the full test and security suite:
```bash
make test && make test-security
```

Execute the production readiness check script to verify infrastructure, configuration, and monitoring:
```bash
./tools/scripts/production-readiness-check.sh
```

(Optional) Run disaster recovery tests:
```bash
./tools/scripts/disaster-recovery.sh --test-only
```

## Monitoring & Alerting

- Metrics endpoints:
  - SMM Architect: `http://localhost:4000/metrics`
  - ToolHub: `http://localhost:3001/metrics`
- Dashboards and alerting configuration: see [`monitoring/README.md`](monitoring/README.md).

## Rollback & Recovery

- Disaster recovery automation: [`tools/scripts/disaster-recovery.sh`](tools/scripts/disaster-recovery.sh)
- Operational runbooks and rollback procedures: [`docs/operational-runbooks.md`](docs/operational-runbooks.md)

## Additional Resources

- Deployment details: [`docs/deployment.md`](docs/deployment.md)
- Comprehensive QA & validation: [`docs/production-readiness-guide.md`](docs/production-readiness-guide.md)
