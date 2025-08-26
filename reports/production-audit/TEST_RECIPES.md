# SMM Architect Production Readiness Test Recipes

This document provides explicit commands to verify each acceptance criteria locally or in CI.

## Critical Security Tests (P0)

### 1. Evil Tenant Security Test

**Objective:** Verify cross-tenant data isolation is enforced by RLS policies.

**Prerequisites:**
- PostgreSQL 14+ running
- Database migrations applied
- Test tenants created

**Commands:**
```bash
# Setup test environment
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smm_test"

# Apply migrations
cd services/smm-architect
psql $DATABASE_URL -f migrations/001_initial_schema.sql
psql $DATABASE_URL -f migrations/002_enable_rls.sql

# Verify RLS is enabled
psql $DATABASE_URL -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('workspaces', 'workspace_runs', 'audit_bundles', 'connectors', 'consent_records', 'brand_twins', 'decision_cards', 'simulation_results', 'asset_fingerprints')
ORDER BY tablename;
"

# Run evil tenant tests
npm test -- tests/security/tenant-isolation.test.ts --verbose

# Expected: All tests pass, no cross-tenant data access
```

**Acceptance Criteria:**
- ✅ RLS enabled on all 9 tenant-scoped tables
- ✅ Cross-tenant queries return 0 rows  
- ✅ Evil tenant tests pass with 100% success rate
- ✅ Performance impact < 100ms for 1000 records

### 2. DSR Cascade Verification Test

**Objective:** Verify complete data deletion across all subsystems.

**Prerequisites:**
- All subsystem clients configured
- Test data created across systems
- KMS keys available for signing

**Commands:**
```bash
# Setup DSR test environment
cd services/dsr
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smm_test"
export PINECONE_API_KEY="test-key"
export AWS_ACCESS_KEY_ID="test-access"
export AWS_SECRET_ACCESS_KEY="test-secret"
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="test-token"

# Create test data
npm run create-test-data -- --user-id test-user-123 --tenant-id test-tenant

# Run DSR cascade test
npm test -- tests/dsr-cascade.test.ts --verbose

# Verify deletion completeness
npm test -- tests/dsr-verification.test.ts --verbose

# Expected: 100% data deletion across all subsystems
```

**Acceptance Criteria:**
- ✅ PostgreSQL: All user records deleted from tenant-scoped tables
- ✅ Pinecone: Vector embeddings removed by user/tenant metadata
- ✅ S3: Objects deleted with versioning handled properly
- ✅ Redis: Cache entries cleared for user/tenant
- ✅ Logs: User PII redacted or marked for deletion
- ✅ Cryptographic proof generated and verified

### 3. Webhook Authentication Test

**Objective:** Verify webhook HMAC signature validation and replay protection.

**Prerequisites:**
- Vault running with webhook secrets
- Test webhook endpoints deployed
- Mock agent services running

**Commands:**
```bash
# Setup webhook test environment
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="test-token"
export AGENTUITY_WEBHOOK_URL="http://localhost:3001/webhook"

# Store webhook secrets in Vault
vault kv put secret/agentuity/test-tenant/webhook_key key="test-webhook-secret-123"

# Run webhook authentication tests
cd tests/security
npm test -- webhook-auth-verification.test.ts --verbose

# Test with valid signature
curl -X POST $AGENTUITY_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-Agentuity-Signature: sha256=$(echo -n '{"test":"payload"}' | openssl dgst -sha256 -hmac 'test-webhook-secret-123' | cut -d' ' -f2)" \
  -d '{"test":"payload"}' \
  --expect 200

# Test with invalid signature (should fail)
curl -X POST $AGENTUITY_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: test-tenant" \
  -H "X-Agentuity-Signature: sha256=invalid" \
  -d '{"test":"payload"}' \
  --expect 401

# Test replay attack protection
# (second request with same signature should fail)
```

**Acceptance Criteria:**
- ✅ Valid HMAC signatures accepted
- ✅ Invalid signatures rejected with 401
- ✅ Missing signatures rejected with 401
- ✅ Replay attacks blocked (timestamp + nonce validation)
- ✅ Webhook secrets retrieved from Vault, not environment

### 4. KMS Integration Test

**Objective:** Verify real cryptographic signatures without mock implementations.

**Prerequisites:**
- Vault Transit engine enabled
- AWS KMS keys available (or GCP KMS)
- Test audit bundles ready

**Commands:**
```bash
# Setup KMS test environment
export VAULT_ADDR="https://vault.example.com"
export VAULT_TOKEN="production-token"
export AWS_REGION="us-west-2"
export KMS_KEY_ID="alias/smm-architect-audit"

# Test Vault KMS adapter
cd services/audit
npm test -- tests/kms-integration.test.ts --verbose

# Test audit bundle signing
npm test -- tests/audit-signing.test.ts --verbose

# Verify no mock signatures in codebase
grep -r "generateMockSignature\|mockSignature\|Mock.*sign" src/
# Expected: No results found

# Test signature verification
npm run verify-audit-bundle -- --bundle-id test-bundle-001
```

**Acceptance Criteria:**
- ✅ Real cryptographic signatures generated (no mocks)
- ✅ Signatures verifiable with public keys
- ✅ Audit bundles properly signed and tamper-evident
- ✅ Key rotation handled correctly
- ✅ All mock implementations removed from production code

## High Priority Tests (P1)

### 5. Dependency Vulnerability Test

**Objective:** Verify all security vulnerabilities are resolved.

**Commands:**
```bash
# Run security audit
pnpm audit --audit-level high

# Check specific vulnerable packages
npm ls esbuild cross-spawn tmp

# Expected versions:
# esbuild >= 0.25.0
# cross-spawn >= 7.0.5  
# tmp >= 0.2.4

# Run vulnerability scan with Grype
grype . -o json --file vuln-scan-results.json

# Check for high/critical vulnerabilities
jq '.matches[] | select(.vulnerability.severity == "High" or .vulnerability.severity == "Critical")' vuln-scan-results.json
# Expected: No high/critical vulnerabilities
```

**Acceptance Criteria:**
- ✅ pnpm audit shows no high/critical vulnerabilities
- ✅ All vulnerable packages updated to safe versions
- ✅ Grype scan shows no high/critical issues
- ✅ Dependency update doesn't break existing functionality

### 6. Tenant Context Validation Test

**Objective:** Verify automatic tenant context setting in database middleware.

**Commands:**
```bash
# Test tenant context middleware
cd services/smm-architect
npm test -- tests/middleware/tenant-context.test.ts --verbose

# Test database operations without manual context setting
npm test -- tests/integration/auto-tenant-context.test.ts --verbose

# Verify all database calls go through middleware
grep -r "set_config.*current_tenant_id" src/
# Expected: Only found in middleware, not in business logic
```

**Acceptance Criteria:**
- ✅ Database middleware automatically sets tenant context
- ✅ Business logic doesn't manually set tenant context
- ✅ Error thrown when tenant context missing
- ✅ All database operations respect tenant isolation

## Infrastructure Tests

### 7. Pulumi Deployment Test

**Objective:** Verify infrastructure provisioning works end-to-end.

**Commands:**
```bash
# Fix dependency issues first
cd services/workspace-provisioning
pnpm install
# Expected: No 404 errors

# Test Pulumi stack
cd infra/main
pulumi login --local
pulumi stack init test-stack
pulumi config set aws:region us-west-2

# Dry run deployment
pulumi up --dry-run
# Expected: Valid deployment plan generated

# Test workspace provisioning
cd ../../services/workspace-provisioning
npm test -- tests/provisioning.test.ts --verbose
```

**Acceptance Criteria:**
- ✅ pnpm install succeeds without errors
- ✅ Pulumi dry-run generates valid deployment plan
- ✅ Workspace provisioning tests pass
- ✅ Infrastructure templates validate correctly

### 8. Container Security Test

**Objective:** Verify container images are built securely and signed.

**Commands:**
```bash
# Build container images
make docker-build

# Generate SBOM for images
syft packages smm-architect:latest -o json --file smm-architect-sbom.json

# Scan for vulnerabilities
grype smm-architect:latest -o json --file smm-architect-vulns.json

# Check for high/critical vulnerabilities
jq '.matches[] | select(.vulnerability.severity == "High" or .vulnerability.severity == "Critical")' smm-architect-vulns.json
# Expected: No high/critical vulnerabilities

# Test image signing (requires Cosign)
cosign sign --yes smm-architect:latest

# Verify signature
cosign verify smm-architect:latest
```

**Acceptance Criteria:**
- ✅ Container images build without errors
- ✅ SBOM generated for all images
- ✅ No high/critical vulnerabilities in container scan
- ✅ Images properly signed with Cosign
- ✅ Signatures verifiable

## API & Schema Tests

### 9. OpenAPI Validation Test

**Objective:** Verify API documentation matches implementation.

**Commands:**
```bash
# Validate OpenAPI specs
cd services/toolhub
npm run validate-openapi

# Test API endpoints against specs
npm test -- tests/api-contract.test.ts --verbose

# Check for endpoint mismatches
npm run compare-routes-to-spec
```

**Acceptance Criteria:**
- ✅ OpenAPI specs are valid YAML/JSON
- ✅ All implemented endpoints documented in specs
- ✅ Response schemas match actual API responses
- ✅ Authentication schemes properly documented

### 10. JSON Schema Validation Test

**Objective:** Verify all JSON schemas work with test data.

**Commands:**
```bash
# Test schema validation
cd tests/schema
npm test -- enhanced-schema-validation.test.ts --verbose

# Validate example contracts
for contract in ../../examples/*.json; do
  echo "Validating $contract..."
  npm run validate-contract "$contract"
done

# Test cross-schema validation
npm test -- cross-schema-validation.test.ts --verbose
```

**Acceptance Criteria:**
- ✅ All JSON schemas compile without errors
- ✅ Example contracts validate against schemas
- ✅ Schema performance is acceptable (< 100ms)
- ✅ Cross-schema references work correctly

## Performance & Load Tests

### 11. Load Testing

**Objective:** Verify system performance under load.

**Commands:**
```bash
# Run performance tests
cd tests/performance
npm test -- benchmark-framework.test.ts --verbose

# Run load tests with Artillery
artillery run load-test-config.yml

# Test with evil tenant scenarios under load
npm test -- evil-tenant-load.test.ts --verbose
```

**Acceptance Criteria:**
- ✅ System handles expected load (1000 concurrent users)
- ✅ Response times stay within SLA (< 2s p95)
- ✅ RLS performance impact minimal (< 50ms)
- ✅ No security bypasses under load

## Monitoring & Observability Tests

### 12. Alerting Test

**Objective:** Verify critical security alerts are properly configured.

**Commands:**
```bash
# Test alert rules
cd monitoring/prometheus
promtool check rules rules/*.yml

# Test Alertmanager configuration
cd ../alertmanager
amtool check-config alertmanager.yml

# Simulate security incidents
cd ../../tests/monitoring
npm test -- security-alerts.test.ts --verbose
```

**Acceptance Criteria:**
- ✅ All Prometheus rules are valid
- ✅ Alertmanager routes notifications correctly
- ✅ Security incidents trigger appropriate alerts
- ✅ Alert notifications reach designated channels

## Supply Chain Security Tests

### 13. SBOM Compliance Test

**Objective:** Verify Software Bill of Materials is complete and accurate.

**Commands:**
```bash
# Generate comprehensive SBOM
make sbom

# Validate SBOM completeness
cd sbom/combined
npm run validate-sbom smm-architect-complete-sbom.json

# Check SBOM against actual dependencies
npm run compare-sbom-to-lockfile
```

**Acceptance Criteria:**
- ✅ SBOM includes all runtime dependencies
- ✅ SBOM matches package-lock.yaml/pnpm-lock.yaml
- ✅ SBOM is in valid SPDX/CycloneDX format
- ✅ Vulnerability scan matches SBOM contents

## Final Production Readiness Check

### 14. End-to-End Integration Test

**Objective:** Verify complete system works together.

**Commands:**
```bash
# Start all services
make dev-setup
make start-all

# Run end-to-end test suite
cd tests/e2e
npm test -- production-workflow.test.ts --verbose

# Test complete user journey
npm test -- user-journey.test.ts --verbose

# Validate all security measures are active
npm test -- security-integration.test.ts --verbose
```

**Acceptance Criteria:**
- ✅ All services start without errors
- ✅ End-to-end workflows complete successfully
- ✅ Security measures don't block legitimate operations
- ✅ All APIs respond correctly
- ✅ Multi-tenant isolation works in integrated environment

---

## Running All Tests

To run all production readiness tests in sequence:

```bash
#!/bin/bash
# production-readiness-test.sh

set -e

echo "🚀 Starting SMM Architect Production Readiness Test Suite"

# Critical Security Tests (P0)
echo "🔴 Testing P0 Critical Security..."
./test-evil-tenant.sh
./test-dsr-cascade.sh  
./test-webhook-auth.sh
./test-kms-integration.sh

# High Priority Tests (P1)
echo "🟠 Testing P1 High Priority..."
./test-dependency-vulnerabilities.sh
./test-tenant-context.sh

# Infrastructure Tests
echo "🏗️ Testing Infrastructure..."
./test-pulumi-deployment.sh
./test-container-security.sh

# API & Schema Tests
echo "📋 Testing APIs & Schemas..."
./test-openapi-validation.sh
./test-json-schemas.sh

# Performance Tests
echo "⚡ Testing Performance..."
./test-load-performance.sh

# Final Integration
echo "🎯 Testing End-to-End Integration..."
./test-e2e-integration.sh

echo "✅ All production readiness tests completed successfully!"
echo "🚢 System is ready for production deployment."
```

**Expected Runtime:** 45-60 minutes for complete test suite.

**Failure Policy:** Any test failure should block production deployment until resolved.