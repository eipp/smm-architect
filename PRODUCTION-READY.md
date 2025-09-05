# Production Readiness Guide

This document describes the steps required to promote **SMM Architect** into a production environment.  It covers deployment workflow, environment configuration and checklists for validating a release.

## 1. End-to-End Deployment Steps

1. **Prepare infrastructure**
   - Provision PostgreSQL 14+, Redis and object storage (S3 or compatible).
   - Configure DNS and TLS certificates for each public service.
2. **Clone repository and install dependencies**
   ```bash
   git clone https://github.com/yourorg/smm-architect.git
   cd smm-architect
   pnpm install
   ```
3. **Build application containers**
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```
4. **Run database migrations**
   ```bash
   cd services/smm-architect
   encore db migrate --env prod
   cd ../..
   ```
5. **Launch services**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```
6. **Seed initial data (optional)**
   ```bash
   node scripts/seed.js
   ```
7. **Smoke test core endpoints**
   ```bash
   curl -f http://localhost:4000/health
   curl -f http://localhost:8080/health
   ```

## 2. Environment Configuration Guidance

Define configuration using a `.env` file or your secret management system.

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@db:5432/smm` |
| `REDIS_URL` | Redis instance | `redis://redis:6379/0` |
| `JWT_SECRET` | Token signing key | `super-secret-value` |
| `SENTRY_DSN` | Error reporting | `https://key@o1.ingest.sentry.io/123` |

Additional service-specific variables can be found in `.env.example`.  Store all secrets in Vault or your chosen secret manager and inject them at runtime.

## 3. Deployment Validation Checklists

### Pre-deploy
- [ ] `pnpm lint` and `pnpm test` pass
- [ ] `make test-security` passes
- [ ] Database migrations applied
- [ ] Images built and tagged
- [ ] Environment variables configured for target cluster

### Post-deploy
- [ ] Health check endpoints return **200**
- [ ] Metrics endpoints expose data (`/metrics`)
- [ ] Application logs free of errors
- [ ] Prometheus and Grafana dashboards show expected metrics
- [ ] `npm run test:e2e` passes against the deployed environment

### Rollback Preparedness
- [ ] Previous container images retained
- [ ] Database backups verified and restorable
- [ ] Incident response playbook available to on-call engineers

Following this guide ensures that each release of SMM Architect meets the platform's production-readiness standards.
