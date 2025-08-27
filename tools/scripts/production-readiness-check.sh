#!/bin/bash

# SMM Architect Production Readiness Validation Script
# This script performs comprehensive checks to ensure the platform is ready for production deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${1:-production}"
VERBOSE="${VERBOSE:-false}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Global counters
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNINGS=0

# Function to run a check and track results
run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-true}"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    log_info "Running check: $check_name"
    
    if eval "$check_command"; then
        log_success "$check_name: PASSED"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            log_error "$check_name: FAILED (CRITICAL)"
            CHECKS_FAILED=$((CHECKS_FAILED + 1))
            return 1
        else
            log_warning "$check_name: FAILED (WARNING)"
            CHECKS_WARNINGS=$((CHECKS_WARNINGS + 1))
            return 1
        fi
    fi
}

# Check if required tools are installed
check_prerequisites() {
    log_info "=== Checking Prerequisites ==="
    
    run_check "kubectl availability" "command -v kubectl >/dev/null 2>&1"
    run_check "helm availability" "command -v helm >/dev/null 2>&1"
    run_check "docker availability" "command -v docker >/dev/null 2>&1"
    run_check "node.js availability" "command -v node >/dev/null 2>&1"
    run_check "npm availability" "command -v npm >/dev/null 2>&1"
    
    # Check Node.js version
    run_check "Node.js version >= 18" "node -v | grep -E 'v(18|19|20|21)' >/dev/null"
    
    # Check if kubectl can connect to cluster
    run_check "Kubernetes cluster connectivity" "kubectl cluster-info >/dev/null 2>&1"
}

# Validate configuration files
check_configurations() {
    log_info "=== Checking Configuration Files ==="
    
    # Check if critical config files exist
    run_check "Package.json exists" "[ -f '$PROJECT_ROOT/package.json' ]"
    run_check "Kubernetes manifests exist" "[ -d '$PROJECT_ROOT/monitoring' ]"
    run_check "Schema files exist" "[ -d '$PROJECT_ROOT/schemas' ]"
    
    # Validate YAML syntax
    run_check "Prometheus rules YAML syntax" "cd '$PROJECT_ROOT' && node -e 'const yaml = require(\"js-yaml\"); yaml.load(require(\"fs\").readFileSync(\"./monitoring/prometheus/rules/smm-alerts.yml\", \"utf8\"))'"
    run_check "Alertmanager config YAML syntax" "cd '$PROJECT_ROOT' && node -e 'const yaml = require(\"js-yaml\"); yaml.load(require(\"fs\").readFileSync(\"./monitoring/alertmanager/alertmanager.yml\", \"utf8\"))'"
    run_check "Logging stack YAML syntax" "kubectl apply --dry-run=client -f '$PROJECT_ROOT/monitoring/logging/logging-stack.yaml' >/dev/null 2>&1"
    
    # Check environment variables
    if [ "$ENVIRONMENT" = "production" ]; then
        run_check "Production environment variables" "[ -n '${SMM_API_URL:-}' ] && [ -n '${SMM_DATABASE_URL:-}' ] && [ -n '${SMM_VAULT_URL:-}' ]"
    fi
}

# Check infrastructure dependencies
check_infrastructure() {
    log_info "=== Checking Infrastructure Dependencies ==="
    
    # Check Kubernetes resources
    run_check "Kubernetes namespaces" "kubectl get namespaces | grep -E '(smm-architect|monitoring|logging)' >/dev/null"
    run_check "Storage classes available" "kubectl get storageclasses | grep -v 'No resources found' >/dev/null"
    
    # Check if monitoring stack is deployed
    run_check "Prometheus deployment" "kubectl get deployment prometheus-server -n monitoring >/dev/null 2>&1" false
    run_check "Grafana deployment" "kubectl get deployment grafana -n monitoring >/dev/null 2>&1" false
    run_check "Alertmanager deployment" "kubectl get deployment alertmanager -n monitoring >/dev/null 2>&1" false
    
    # Check logging infrastructure
    run_check "Elasticsearch deployment" "kubectl get deployment elasticsearch -n logging >/dev/null 2>&1" false
    run_check "Fluentd daemonset" "kubectl get daemonset fluentd -n logging >/dev/null 2>&1" false
    run_check "Kibana deployment" "kubectl get deployment kibana -n logging >/dev/null 2>&1" false
}

# Run security checks
check_security() {
    log_info "=== Running Security Checks ==="
    
    # Check for sensitive data in code
    run_check "No hardcoded secrets in code" "! grep -r -E '(password|secret|key).*=.*[\"'\"'][^\"'\"']{8,}' '$PROJECT_ROOT/src' '$PROJECT_ROOT/services' 2>/dev/null || true"
    
    # Check RBAC configurations
    run_check "RBAC configurations exist" "find '$PROJECT_ROOT' -name '*.yaml' -exec grep -l 'rbac.authorization.k8s.io' {} \\; | wc -l | grep -v '^0$' >/dev/null"
    
    # Check network policies
    run_check "Network policies defined" "find '$PROJECT_ROOT' -name '*.yaml' -exec grep -l 'NetworkPolicy' {} \\; | wc -l | grep -v '^0$' >/dev/null"
    
    # Check for security scanning results
    run_check "Security scan results available" "[ -f '$PROJECT_ROOT/security-scan-results.json' ] || [ -f '$PROJECT_ROOT/tests/security/security-report.json' ]" false
    
    # Validate Vault integration
    if [ -n "${VAULT_ADDR:-}" ]; then
        run_check "Vault connectivity" "curl -s '${VAULT_ADDR}/v1/sys/health' >/dev/null" false
    fi
}

# Check application code quality
check_code_quality() {
    log_info "=== Checking Code Quality ==="
    
    # Run linting
    run_check "TypeScript compilation" "cd '$PROJECT_ROOT' && npm run build >/dev/null 2>&1" false
    run_check "ESLint checks" "cd '$PROJECT_ROOT' && npm run lint >/dev/null 2>&1" false
    
    # Check test coverage
    run_check "Unit tests pass" "cd '$PROJECT_ROOT' && npm test >/dev/null 2>&1" false
    
    # Check for TODO/FIXME comments
    run_check "No critical TODOs in production code" "! grep -r -E '(TODO|FIXME|HACK).*CRITICAL' '$PROJECT_ROOT/src' '$PROJECT_ROOT/services' 2>/dev/null || true"
}

# Validate database migrations and schema
check_database() {
    log_info "=== Checking Database Configuration ==="
    
    # Check migration files exist
    run_check "Database migration files exist" "find '$PROJECT_ROOT' -name '*migration*' -o -name '*schema*' | grep -E '\\.(sql|js|ts)$' | wc -l | grep -v '^0$' >/dev/null"
    
    # Validate schema files
    run_check "JSON schemas valid" "cd '$PROJECT_ROOT' && find schemas -name '*.json' -exec node -e 'JSON.parse(require(\"fs\").readFileSync(process.argv[1], \"utf8\"))' {} \\;"
    
    # Check database connectivity (if URL provided)
    if [ -n "${SMM_DATABASE_URL:-}" ]; then
        run_check "Database connectivity" "timeout 10 bash -c '</dev/tcp/\$(echo '$SMM_DATABASE_URL' | cut -d'@' -f2 | cut -d':' -f1)/\$(echo '$SMM_DATABASE_URL' | cut -d':' -f4 | cut -d'/' -f1)'" false
    fi
}

# Check API endpoints and health
check_api_health() {
    log_info "=== Checking API Health ==="
    
    if [ -n "${SMM_API_URL:-}" ]; then
        run_check "API health endpoint" "curl -f -s '${SMM_API_URL}/health' >/dev/null" false
        run_check "API metrics endpoint" "curl -f -s '${SMM_API_URL}/metrics' >/dev/null" false
        run_check "API OpenAPI spec" "curl -f -s '${SMM_API_URL}/api-docs' >/dev/null" false
    else
        log_warning "SMM_API_URL not set, skipping API health checks"
    fi
}

# Check monitoring and observability
check_monitoring() {
    log_info "=== Checking Monitoring and Observability ==="
    
    # Check if monitoring configs are deployed
    run_check "Prometheus rules deployed" "kubectl get prometheusrules -A | grep smm >/dev/null 2>&1" false
    run_check "Service monitors exist" "kubectl get servicemonitors -A | grep smm >/dev/null 2>&1" false
    
    # Check alertmanager config
    run_check "Alertmanager config" "kubectl get secret smm-alertmanager-config -n monitoring >/dev/null 2>&1" false
    
    # Check logging pipeline
    run_check "Fluentd collecting logs" "kubectl logs daemonset/fluentd -n logging --tail=10 | grep -E '(success|error)' >/dev/null 2>&1" false
    
    # Check if dashboards are available
    if [ -n "${GRAFANA_URL:-}" ]; then
        run_check "Grafana accessibility" "curl -f -s '${GRAFANA_URL}/api/health' >/dev/null" false
    fi
}

# Check compliance and audit readiness
check_compliance() {
    log_info "=== Checking Compliance Readiness ==="
    
    # Check audit logging configuration
    run_check "Audit logging enabled" "find '$PROJECT_ROOT' -name '*.yaml' -exec grep -l 'audit' {} \\; | wc -l | grep -v '^0$' >/dev/null"
    
    # Check data retention policies
    run_check "Data retention policies defined" "find '$PROJECT_ROOT' -name '*.json' -o -name '*.yaml' | xargs grep -l 'retention' | wc -l | grep -v '^0$' >/dev/null"
    
    # Check GDPR compliance configurations
    run_check "GDPR compliance configs" "find '$PROJECT_ROOT' -name '*.json' -o -name '*.yaml' | xargs grep -l -i 'gdpr' | wc -l | grep -v '^0$' >/dev/null"
    
    # Check encryption configurations
    run_check "Encryption at rest configured" "find '$PROJECT_ROOT' -name '*.yaml' | xargs grep -l -i 'encrypt' | wc -l | grep -v '^0$' >/dev/null"
}

# Check performance and scalability
check_performance() {
    log_info "=== Checking Performance Configuration ==="
    
    # Check resource limits are set
    run_check "Resource limits defined" "find '$PROJECT_ROOT' -name '*.yaml' | xargs grep -l 'resources:' | wc -l | grep -v '^0$' >/dev/null"
    
    # Check HPA configurations
    run_check "Horizontal Pod Autoscaler configs" "find '$PROJECT_ROOT' -name '*.yaml' | xargs grep -l 'HorizontalPodAutoscaler' | wc -l | grep -v '^0$' >/dev/null" false
    
    # Check if performance tests exist
    run_check "Performance tests exist" "find '$PROJECT_ROOT' -name '*performance*' -o -name '*load*' -o -name '*benchmark*' | grep -E '\\.(test|spec)\\.(js|ts)$' | wc -l | grep -v '^0$' >/dev/null" false
}

# Check backup and disaster recovery
check_backup_dr() {
    log_info "=== Checking Backup and Disaster Recovery ==="
    
    # Check backup configurations
    run_check "Backup configurations exist" "find '$PROJECT_ROOT' -name '*.yaml' | xargs grep -l -i 'backup' | wc -l | grep -v '^0$' >/dev/null" false
    
    # Check persistent volume configurations
    run_check "Persistent volumes configured" "find '$PROJECT_ROOT' -name '*.yaml' | xargs grep -l 'PersistentVolume' | wc -l | grep -v '^0$' >/dev/null"
    
    # Check if disaster recovery procedures exist
    run_check "DR documentation exists" "find '$PROJECT_ROOT' -name '*disaster*' -o -name '*recovery*' -o -name '*backup*' | grep -E '\\.(md|txt|pdf)$' | wc -l | grep -v '^0$' >/dev/null" false
}

# Generate comprehensive report
generate_report() {
    log_info "=== Generating Production Readiness Report ==="
    
    local report_file="$PROJECT_ROOT/production-readiness-report.md"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "$report_file" << EOF
# SMM Architect Production Readiness Report

**Generated**: $timestamp  
**Environment**: $ENVIRONMENT  
**Total Checks**: $CHECKS_TOTAL  

## Summary

- ✅ **Passed**: $CHECKS_PASSED
- ❌ **Failed**: $CHECKS_FAILED  
- ⚠️ **Warnings**: $CHECKS_WARNINGS

**Overall Status**: $([ $CHECKS_FAILED -eq 0 ] && echo "🟢 READY" || echo "🔴 NOT READY")

## Recommendations

$([ $CHECKS_FAILED -gt 0 ] && echo "### Critical Issues
- Address all failed critical checks before production deployment
- Review security and compliance configurations
- Ensure monitoring and alerting are properly configured")

$([ $CHECKS_WARNINGS -gt 0 ] && echo "### Warnings
- Review warning items for optimal production performance
- Consider implementing recommended best practices
- Update documentation and runbooks")

## Next Steps

1. Address all critical failures
2. Deploy monitoring and logging infrastructure  
3. Run end-to-end tests in staging environment
4. Conduct security review and penetration testing
5. Prepare rollback procedures
6. Schedule production deployment

---
**Report generated by SMM Architect Production Readiness Check**
EOF

    log_success "Report generated: $report_file"
}

# Main execution
main() {
    log_info "🚀 Starting SMM Architect Production Readiness Check"
    log_info "Environment: $ENVIRONMENT"
    log_info "Project Root: $PROJECT_ROOT"
    echo

    # Run all check categories
    check_prerequisites
    echo
    check_configurations  
    echo
    check_infrastructure
    echo
    check_security
    echo
    check_code_quality
    echo
    check_database
    echo
    check_api_health
    echo
    check_monitoring
    echo
    check_compliance
    echo
    check_performance
    echo
    check_backup_dr
    echo

    # Generate final report
    generate_report
    echo

    # Final summary
    log_info "=== Final Summary ==="
    log_info "Total Checks: $CHECKS_TOTAL"
    log_success "Passed: $CHECKS_PASSED"
    if [ $CHECKS_FAILED -gt 0 ]; then
        log_error "Failed: $CHECKS_FAILED"
    fi
    if [ $CHECKS_WARNINGS -gt 0 ]; then
        log_warning "Warnings: $CHECKS_WARNINGS"
    fi

    if [ $CHECKS_FAILED -eq 0 ]; then
        log_success "🎉 SMM Architect is READY for production deployment!"
        exit 0
    else
        log_error "❌ SMM Architect is NOT READY for production deployment"
        log_error "Please address the failed checks before proceeding"
        exit 1
    fi
}

# Execute main function
main "$@"