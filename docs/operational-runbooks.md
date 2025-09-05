# SMM Architect - Operational Runbooks

## Table of Contents

1. [Emergency Contacts & Escalation](#emergency-contacts--escalation)
2. [System Health Monitoring](#system-health-monitoring)
3. [Database Issues](#database-issues)
4. [Authentication & Security Incidents](#authentication--security-incidents)
5. [Multi-Tenant Data Isolation Issues](#multi-tenant-data-isolation-issues)
6. [GDPR/Compliance Incidents](#gdprcompliance-incidents)
7. [Service Degradation & Performance](#service-degradation--performance)
8. [Disaster Recovery Procedures](#disaster-recovery-procedures)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Backup & Recovery](#backup--recovery)

---

## Emergency Contacts & Escalation

### 🚨 Critical Incident Response Team

> **Warning:** Contact information below uses placeholders. Replace with real details in production.

| Role | Contact | Phone | Primary Responsibilities |
|------|---------|-------|-------------------------|
| **Incident Commander** | ops@example.com | +1-555-0001 | Overall incident coordination |
| **Security Lead** | security@example.com | +1-555-0002 | Security incidents, data breaches |
| **DevOps Engineer** | devops@example.com | +1-555-0003 | Infrastructure, deployments |
| **Database Admin** | dba@example.com | +1-555-0004 | Database issues, performance |
| **Product Owner** | product@example.com | +1-555-0005 | Business impact assessment |

### 📋 Escalation Matrix

| Severity | Response Time | Escalation Path | Communication |
|----------|---------------|-----------------|---------------|
| **P0 - Critical** | 15 minutes | Incident Commander → CTO → CEO | All stakeholders |
| **P1 - High** | 1 hour | Team Lead → Incident Commander | Internal teams |
| **P2 - Medium** | 4 hours | On-call Engineer → Team Lead | Engineering team |
| **P3 - Low** | 24 hours | Standard support process | Ticket system |

---

## System Health Monitoring

### 🩺 Health Check Commands

```bash
# Overall system health
curl -f http://localhost:4000/health || echo "❌ SMM Architect Service DOWN"
curl -f http://localhost:3000 || echo "❌ Frontend Service DOWN"

# Database connectivity
psql $DATABASE_URL -c "SELECT 1;" || echo "❌ Database connection FAILED"

# RLS validation
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_runs', 'audit_bundles')
AND rowsecurity = false;
" | grep -q "0 rows" || echo "❌ RLS policy validation FAILED"

# Vault connectivity (if available)
vault status 2>/dev/null || echo "⚠️ Vault not accessible"
```

### 📊 Key Metrics to Monitor

- **Database connections**: Should be < 80% of max connections
- **Response times**: p95 < 500ms for API endpoints
- **Error rates**: < 1% for critical endpoints
- **Memory usage**: < 80% on all services
- **Disk space**: > 20% free space on all volumes

---

## Database Issues

### 🗄️ PostgreSQL Connection Issues

**Symptoms:**
- "connection refused" errors
- "too many connections" errors
- Slow query performance

**Diagnosis:**
```bash
# Check database status
pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER

# Check active connections
psql $DATABASE_URL -c "
SELECT count(*) as active_connections,
       (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections;
"

# Check long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

**Resolution:**
```bash
# Kill long-running queries (if safe)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;"

# Restart database connection pool
systemctl restart pgbouncer  # if using pgbouncer

# Scale up database connections (if needed)
kubectl scale deployment postgres-proxy --replicas=3
```

### 🔒 RLS Policy Issues

**Symptoms:**
- Cross-tenant data visible
- "RLS policy violation" errors
- Tenant isolation test failures

**Diagnosis:**
```bash
# Verify RLS is enabled
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_runs', 'audit_bundles', 'connectors', 'consent_records', 'brand_twins', 'decision_cards', 'simulation_results', 'asset_fingerprints');
"

# Check RLS policies
psql $DATABASE_URL -c "
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
"

# Test tenant isolation
psql $DATABASE_URL -c "
SELECT set_config('app.current_tenant_id', 'test_tenant_1', true);
SELECT COUNT(*) FROM workspaces;  -- Should only show tenant_1 data
"
```

**Resolution:**
```bash
# Re-apply RLS migration
cd services/smm-architect
psql $DATABASE_URL -f migrations/002_enable_rls.sql

# Run evil tenant security tests
npm test -- tests/security/tenant-isolation.test.ts

# Verify tenant context is set in application code
grep -r "setTenantContext" services/smm-architect/src/
```

---

## Authentication & Security Incidents

### 🔐 Authentication Failures

**Symptoms:**
- High number of 401/403 errors
- Users unable to login
- Token validation failures

**Diagnosis:**
```bash
# Check authentication service health
curl -f http://localhost:4000/api/auth/health || echo "Auth service DOWN"

# Check JWT token validity
echo "Bearer $TOKEN" | cut -d' ' -f2 | base64 -d  # Decode JWT payload

# Check rate limiting
curl -i http://localhost:4000/api/auth/login  # Look for rate limit headers

# Review authentication logs
tail -f /var/log/smm-architect/auth.log | grep "authentication failed"
```

**Resolution:**
```bash
# Reset rate limiting for user
redis-cli DEL "auth:login:user@example.com"

# Restart authentication service
kubectl rollout restart deployment/smm-architect-service

# Force token refresh for all users
redis-cli FLUSHDB  # Clear all cached tokens (forces re-auth)

# Update JWT secret if compromised
kubectl create secret generic jwt-secret --from-literal=secret="new-secret" --dry-run=client -o yaml | kubectl apply -f -
```

### 🛡️ Security Incident Response

**Data Breach Response (P0 Critical):**

1. **Immediate Actions (0-15 minutes):**
   ```bash
   # Isolate affected systems
   kubectl scale deployment/smm-architect-service --replicas=0
   
   # Block suspicious IP addresses
   iptables -A INPUT -s SUSPICIOUS_IP -j DROP
   
   # Revoke all active sessions
   redis-cli FLUSHALL
   ```

2. **Investigation (15-60 minutes):**
   ```bash
   # Capture system state
   kubectl get pods -o wide > incident-pods-$(date +%s).log
   kubectl logs deployment/smm-architect-service > incident-logs-$(date +%s).log
   
   # Run security audit
   npm run test:security:comprehensive
   
   # Check database access logs
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
   ```

3. **Communication (Within 1 hour):**
   - Notify incident commander
   - Prepare stakeholder communication
   - Document incident timeline

---

## Multi-Tenant Data Isolation Issues

### 🏢 Tenant Data Leakage

**Symptoms:**
- Users seeing data from other tenants
- Evil tenant security tests failing
- Cross-tenant API calls succeeding

**Immediate Response (P0 Critical):**
```bash
# EMERGENCY: Stop all services immediately
kubectl scale deployment --all --replicas=0

# Verify the scope of the breach
psql $DATABASE_URL << 'EOF'
-- Check for any cross-tenant data access in logs
SELECT 
    schemaname, 
    tablename, 
    n_tup_ins, 
    n_tup_upd, 
    n_tup_del 
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
EOF

# Run comprehensive tenant isolation tests
npm test -- tests/security/tenant-isolation.test.ts --verbose
```

**Investigation:**
```bash
# Verify RLS policies are active
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity, 
       (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
"

# Check recent database changes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, attname, atttypid::regtype
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND a.attname = 'tenant_id'
ORDER BY c.relname;
"

# Audit recent code deployments
git log --oneline --since="24 hours ago" | grep -i "rls\|tenant\|auth"
```

**Resolution:**
```bash
# Re-apply RLS policies
psql $DATABASE_URL -f services/smm-architect/migrations/002_enable_rls.sql

# Verify tenant context in application code
grep -r "setTenantContext" services/ | head -20

# Test with evil tenant scenarios
./scripts/disaster-recovery.sh --test-only

# Gradual service restoration with monitoring
kubectl scale deployment/smm-architect-service --replicas=1
# Monitor for 15 minutes before scaling up
kubectl scale deployment/smm-architect-service --replicas=3
```

---

## GDPR/Compliance Incidents

### 📋 Data Subject Rights Request Failures

**Symptoms:**
- DSR API returning errors
- Export/deletion requests timing out
- Compliance audit failures

**Diagnosis:**
```bash
# Check DSR service health
curl -f http://localhost:4000/api/dsr/health || echo "DSR service DOWN"

# Check DSR request queue
redis-cli LLEN dsr:requests:pending

# Review DSR logs
tail -f /var/log/smm-architect/dsr.log | grep -E "(ERROR|FAILED)"

# Test DSR functionality
curl -X POST http://localhost:4000/api/dsr/export \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "tenantId": "test_tenant",
    "userEmail": "test@example.com",
    "requestedBy": "test_admin"
  }'
```

**Resolution:**
```bash
# Restart DSR service
kubectl rollout restart deployment/dsr-service

# Clear stuck DSR requests
redis-cli DEL dsr:requests:pending

# Run DSR integration tests
npm test -- tests/dsr/dsr-service.test.ts

# Process pending requests manually if needed
node scripts/process-pending-dsr-requests.js
```

### ⚖️ Regulatory Compliance Issues

**Data Retention Policy Violations:**
```bash
# Check for data exceeding retention periods
psql $DATABASE_URL << 'EOF'
SELECT 
    tenant_id,
    COUNT(*) as expired_records,
    MIN(created_at) as oldest_record
FROM workspaces 
WHERE created_at < NOW() - INTERVAL '7 years'  -- Adjust based on policy
GROUP BY tenant_id;
EOF

# Automated cleanup (if safe)
psql $DATABASE_URL << 'EOF'
-- Set tenant context for each expired tenant
SELECT set_config('app.current_tenant_id', tenant_id, true);
DELETE FROM workspaces WHERE created_at < NOW() - INTERVAL '7 years';
EOF
```

---

## Service Degradation & Performance

### 🐌 Slow Response Times

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/workspaces

# Database performance
psql $DATABASE_URL -c "
SELECT query, calls, mean_time, rows, 100.0 * shared_blks_hit /
       nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Memory usage
free -h
ps aux --sort=-%mem | head -10

# Disk I/O
iostat -x 1 5
```

**Resolution:**
```bash
# Scale services horizontally
kubectl scale deployment/smm-architect-service --replicas=5

# Optimize database queries
psql $DATABASE_URL -c "REINDEX INDEX CONCURRENTLY idx_workspace_tenant;"

# Clear application caches
redis-cli FLUSHDB

# Restart services with higher memory limits
kubectl patch deployment smm-architect-service -p '{"spec":{"template":{"spec":{"containers":[{"name":"smm-architect","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### 💾 High Memory Usage

**Diagnosis:**
```bash
# Check memory usage by service
kubectl top pods --sort-by=memory

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full node app.js

# Database memory usage
psql $DATABASE_URL -c "
SELECT 
    setting AS max_connections,
    (SELECT count(*) FROM pg_stat_activity) AS current_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') AS active_connections
FROM pg_settings WHERE name = 'max_connections';
"
```

**Resolution:**
```bash
# Restart services to clear memory leaks
kubectl rollout restart deployment/smm-architect-service

# Optimize database connections
kubectl patch configmap postgres-config --patch '{"data":{"max_connections":"200"}}'

# Enable memory monitoring
kubectl apply -f monitoring/memory-alerts.yaml
```

---

## Disaster Recovery Procedures

### 🚨 Complete System Failure

**Recovery Steps:**
```bash
# Step 1: Assessment (5 minutes)
./scripts/disaster-recovery.sh --health-only

# Step 2: Infrastructure Recovery (10-15 minutes)
# Restore from infrastructure backups
terraform apply -var="restore_from_backup=true"
# or
pulumi up --config restore_from_backup=true

# Step 3: Database Recovery (10-20 minutes)
# Restore latest database backup
./scripts/disaster-recovery.sh --backup-only

# Step 4: Service Deployment (5-10 minutes)
kubectl apply -f k8s/
kubectl rollout status deployment/smm-architect-service

# Step 5: Validation (5 minutes)
./scripts/disaster-recovery.sh --test-only
```

### 📊 RTO/RPO Targets

| Service | RTO (Recovery Time) | RPO (Data Loss) | Backup Frequency |
|---------|-------------------|------------------|------------------|
| **SMM Architect Service** | 30 minutes | 5 minutes | Every 15 minutes |
| **Database** | 15 minutes | 1 minute | Continuous WAL |
| **Frontend** | 5 minutes | N/A | On deployment |
| **Vault/Secrets** | 10 minutes | 0 minutes | Real-time replication |

---

## Monitoring & Alerting

### 📡 Critical Alerts Configuration

```yaml
# Prometheus alert rules (monitoring/alerts.yaml)
groups:
- name: smm-architect-critical
  rules:
  - alert: ServiceDown
    expr: up{job="smm-architect"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "SMM Architect service is down"
      description: "Service has been down for more than 1 minute"

  - alert: DatabaseConnectionFailure
    expr: pg_up == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "Database connection failed"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: high
    annotations:
      summary: "High error rate detected"

  - alert: RLSPolicyViolation
    expr: increase(rls_policy_violations_total[5m]) > 0
    for: 0s
    labels:
      severity: critical
    annotations:
      summary: "CRITICAL: RLS policy violation detected"
```

### 📊 Dashboard Monitoring

**Key Dashboards:**
- **System Overview**: Health, performance, error rates
- **Security Dashboard**: Authentication, RLS violations, security events
- **GDPR Compliance**: DSR requests, data retention, audit trails
- **Database Performance**: Query performance, connections, replication lag

---

## Backup & Recovery

### 💾 Backup Procedures

```bash
# Automated daily backup
0 2 * * * /usr/local/bin/backup-smm-architect.sh

# Manual backup
pg_dump $DATABASE_URL | gzip > "backup-$(date +%Y%m%d-%H%M%S).sql.gz"

# Verify backup integrity
gunzip -c backup-file.sql.gz | head -n 20
```

### 🔄 Recovery Procedures

```bash
# Point-in-time recovery
pg_basebackup -h $DB_HOST -D /var/lib/postgresql/recovery -U postgres -W
echo "restore_command = 'cp /path/to/wal/%f %p'" >> recovery.conf

# Application data recovery
./scripts/disaster-recovery.sh --backup-only

# Full system recovery
./scripts/disaster-recovery.sh
```

---

## Contact Information

For immediate assistance during incidents:

- **Slack**: #smm-architect-incidents
- **PagerDuty**: SMM Architect Service
- **Email**: incidents@example.com
- **Escalation**: +1-555-URGENT

**Remember**: 
- Document all actions taken during incidents
- Update runbooks based on lessons learned
- Conduct post-incident reviews within 48 hours
- Test these procedures regularly (monthly)

---

*Last Updated: $(date)*
*Version: 1.0*
*Next Review: $(date -d "+3 months")*