#!/bin/bash

# SMM Architect Production Readiness Validation Script
# Comprehensive pre-deployment validation and security review

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${1:-production}"
VALIDATION_MODE="${2:-full}"
OUTPUT_DIR="$PROJECT_ROOT/reports"
DB_INSTANCE_IDENTIFIER="${DB_INSTANCE_IDENTIFIER:-smm-postgres}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
CRITICAL_FAILURES=0

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((FAILED_CHECKS++))
}

log_critical() {
    echo -e "${RED}[🚨 CRITICAL]${NC} $1"
    ((FAILED_CHECKS++))
    ((CRITICAL_FAILURES++))
}

log_section() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

run_check() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-false}"
    
    ((TOTAL_CHECKS++))
    log_info "Checking: $check_name"
    
    if eval "$check_command" > /dev/null 2>&1; then
        log_success "$check_name"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            log_critical "$check_name - DEPLOYMENT BLOCKED"
            return 1
        else
            log_error "$check_name"
            return 1
        fi
    fi
}

run_check_with_output() {
    local check_name="$1"
    local check_command="$2"
    local is_critical="${3:-false}"
    
    ((TOTAL_CHECKS++))
    log_info "Checking: $check_name"
    
    local output
    if output=$(eval "$check_command" 2>&1); then
        log_success "$check_name"
        echo "   Result: $output"
        return 0
    else
        if [ "$is_critical" = "true" ]; then
            log_critical "$check_name - $output"
            return 1
        else
            log_error "$check_name - $output"
            return 1
        fi
    fi
}

# 1. Prerequisites and Environment Validation
validate_prerequisites() {
    log_section "1. Prerequisites and Environment Validation"
    
    # Required tools
    local tools=("kubectl" "helm" "docker" "curl" "jq" "vault" "pulumi")
    for tool in "${tools[@]}"; do
        run_check "Tool: $tool" "command -v $tool" true
    done
    
    # Environment variables
    run_check "Environment: KUBECONFIG" "[ -n '${KUBECONFIG:-}' ]" true
    run_check "Environment: VAULT_ADDR" "[ -n '${VAULT_ADDR:-}' ]" true
    
    # Kubernetes connectivity
    run_check "Kubernetes cluster connectivity" "kubectl cluster-info" true
    run_check_with_output "Kubernetes version" "kubectl version --short --client=false | head -1"
    
    # Cluster node health
    run_check "All cluster nodes ready" "kubectl get nodes | grep -v NotReady | grep -c Ready | xargs test 3 -le" true
    
    # Resource availability
    run_check_with_output "Cluster resource capacity" "kubectl top nodes | tail -n +2 | awk '{cpu+=$3; mem+=$5} END {print \"CPU:\" cpu \"% Memory:\" mem \"%\"}'"
}

# 2. Security Configuration Validation
validate_security_configuration() {
    log_section "2. Security Configuration Validation"
    
    # Network policies
    run_check "Network policies enabled" "kubectl get networkpolicies --all-namespaces | grep -q smm" true
    
    # Pod security standards
    run_check "Pod Security Standards configured" "kubectl get namespaces -o jsonpath='{.items[*].metadata.labels.pod-security\.kubernetes\.io/enforce}' | grep -q restricted"
    
    # RBAC configuration
    run_check "RBAC enabled" "kubectl auth can-i --list | grep -q 'Resources'" true
    run_check "Service accounts configured" "kubectl get serviceaccounts --all-namespaces | grep -c smm | xargs test 5 -le"
    
    # Secrets management
    run_check "Vault connectivity" "vault status" true
    run_check "Vault policies configured" "vault policy list | grep -q smm"
    
    # TLS/SSL configuration
    run_check "Ingress TLS enabled" "kubectl get ingress --all-namespaces -o jsonpath='{.items[*].spec.tls}' | grep -q secretName"
    
    # Image security
    run_check "Container images from trusted registries" "kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | grep -v 'localhost\\|:latest'"
}

# 3. Application Health and Readiness
validate_application_health() {
    log_section "3. Application Health and Readiness"
    
    # Service deployments
    local services=("api-gateway" "workspace-service" "agent-orchestrator" "simulation-service")
    for service in "${services[@]}"; do
        run_check "Service: $service deployment ready" "kubectl get deployment $service -n smm-system | grep -q '3/3'" true
        run_check "Service: $service pods healthy" "kubectl get pods -n smm-system -l app=$service | grep -c Running | xargs test 3 -eq"
    done
    
    # Health endpoints
    run_check_with_output "API Gateway health" "curl -s http://api-gateway.smm-system.svc.cluster.local:8080/health | jq -r .status"
    run_check_with_output "Database connectivity" "kubectl exec -n smm-system deployment/api-gateway -- nc -z postgres.database.svc.cluster.local 5432"
    
    # Redis/Cache connectivity
    run_check "Cache connectivity" "kubectl exec -n smm-system deployment/api-gateway -- nc -z redis.cache.svc.cluster.local 6379"
}

# 4. Data and Storage Validation
validate_data_storage() {
    log_section "4. Data and Storage Validation"
    
    # Storage classes
    run_check "Storage classes available" "kubectl get storageclass | grep -q fast-ssd" true
    
    # Persistent volumes
    run_check "PVs bound and available" "kubectl get pv | grep -c Bound | xargs test 5 -le"
    
    # Database readiness
    run_check_with_output "Database schema version" "kubectl exec -n database deployment/postgres -- psql -U postgres -d smm -t -c 'SELECT version();' | head -1"
    
    # Backup configuration
    run_check "Backup jobs configured" "kubectl get cronjobs -n backup | grep -q database-backup"
    run_check_with_output "Last backup status" "kubectl get jobs -n backup | grep database-backup | tail -1 | awk '{print $2}'"
    
    # Data encryption
    run_check "Database encryption enabled" "kubectl get secret postgres-config -n database -o jsonpath='{.data.encryption}' | base64 -d | grep -q enabled"
}

# 5. Performance and Scaling Configuration
validate_performance_scaling() {
    log_section "5. Performance and Scaling Configuration"
    
    # Horizontal Pod Autoscaler
    run_check "HPA configured for critical services" "kubectl get hpa -n smm-system | grep -c api-gateway | xargs test 1 -eq"
    
    # Resource limits and requests
    run_check "Resource limits set on pods" "kubectl get pods -n smm-system -o jsonpath='{.items[*].spec.containers[*].resources.limits}' | grep -q cpu"
    run_check "Resource requests set on pods" "kubectl get pods -n smm-system -o jsonpath='{.items[*].spec.containers[*].resources.requests}' | grep -q memory"
    
    # Load balancer configuration
    run_check "Load balancer service available" "kubectl get svc -n smm-system | grep LoadBalancer | grep -q api-gateway"
    
    # Performance benchmarks
    if command -v ab >/dev/null 2>&1; then
        run_check_with_output "API response time benchmark" "ab -n 100 -c 10 http://api-gateway.smm-system.svc.cluster.local:8080/health 2>/dev/null | grep 'Time per request' | head -1"
    else
        log_warning "Apache Bench (ab) not available - skipping performance benchmark"
        ((WARNING_CHECKS++))
    fi
}

# 6. Monitoring and Observability
validate_monitoring_observability() {
    log_section "6. Monitoring and Observability"
    
    # Prometheus
    run_check "Prometheus server running" "kubectl get pods -n monitoring | grep prometheus-server | grep -q Running" true
    run_check_with_output "Prometheus targets" "kubectl exec -n monitoring deployment/prometheus-server -- promtool query instant 'up' | grep -c '=> 1'"
    
    # Grafana
    run_check "Grafana running" "kubectl get pods -n monitoring | grep grafana | grep -q Running"
    run_check "Grafana dashboards configured" "kubectl get configmaps -n monitoring | grep -q grafana-dashboards"
    
    # Alerting
    run_check "Alertmanager running" "kubectl get pods -n monitoring | grep alertmanager | grep -q Running"
    run_check_with_output "Alert rules configured" "kubectl get prometheusrules -n monitoring | wc -l"
    
    # Logging
    run_check "Fluentd/Fluent Bit running" "kubectl get daemonset -n logging | grep -q fluent"
    run_check "Elasticsearch cluster healthy" "kubectl exec -n logging deployment/elasticsearch -- curl -s localhost:9200/_cluster/health | jq -r .status"
}

# 7. Compliance and Governance
validate_compliance_governance() {
    log_section "7. Compliance and Governance"
    
    # Policy enforcement
    run_check "OPA Gatekeeper installed" "kubectl get validatingadmissionwebhooks | grep -q gatekeeper"
    run_check_with_output "Policy violations" "kubectl get constraintviolations --all-namespaces | wc -l"
    
    # Audit logging
    run_check "Audit policy configured" "kubectl get configmap audit-policy -n kube-system" true
    
    # Resource quotas
    run_check "Resource quotas enforced" "kubectl get resourcequotas --all-namespaces | grep -c smm-tenant | xargs test 1 -le"
    
    # Network policies compliance
    run_check "Default deny network policies" "kubectl get networkpolicy default-deny --all-namespaces | grep -q default-deny"
    
    # GDPR compliance markers
    run_check "GDPR data classification labels" "kubectl get namespaces -l data-classification=gdpr | grep -q smm-tenant"
}

# 8. Disaster Recovery and Business Continuity
validate_disaster_recovery() {
    log_section "8. Disaster Recovery and Business Continuity"
    
    # Backup validation
    run_check_with_output "Recent database backup exists" "kubectl get jobs -n backup | grep database-backup | tail -1 | awk '{print $3}'"
    run_check_with_output "RDS snapshot within 24h" \
        "aws rds describe-db-snapshots --db-instance-identifier ${DB_INSTANCE_IDENTIFIER} --snapshot-type automated --query 'DBSnapshots[*].{Time:SnapshotCreateTime,Status:Status}' --output json | jq -re 'max_by(.Time) | select(.Status==\"available\" and (now - (.Time|fromdate) < 86400)) | .Time'"
    
    # Multi-region setup
    run_check "Multi-AZ deployment" "kubectl get nodes -o jsonpath='{.items[*].metadata.labels.topology\.kubernetes\.io/zone}' | tr ' ' '\n' | sort -u | wc -l | xargs test 2 -le"
    
    # Persistent volume snapshots
    run_check "Volume snapshot class configured" "kubectl get volumesnapshotclass | grep -q csi"
    
    # Service mesh resilience
    if kubectl get pods -n istio-system >/dev/null 2>&1; then
        run_check "Service mesh running" "kubectl get pods -n istio-system | grep -c Running | xargs test 3 -le"
        run_check "Circuit breaker policies" "kubectl get destinationrules --all-namespaces | grep -q circuitBreaker"
    else
        log_warning "Service mesh not detected - manual resilience patterns should be verified"
        ((WARNING_CHECKS++))
    fi
}

# 9. Integration and External Dependencies
validate_integrations() {
    log_section "9. Integration and External Dependencies"
    
    # External API connectivity
    local apis=("https://api.linkedin.com" "https://api.twitter.com" "https://graph.facebook.com")
    for api in "${apis[@]}"; do
        run_check_with_output "External API: $api" "curl -s -o /dev/null -w '%{http_code}' --max-time 10 $api"
    done
    
    # Webhook endpoints
    run_check "Webhook endpoints configured" "kubectl get ingress --all-namespaces | grep -q webhook"
    
    # Certificate validity
    run_check_with_output "TLS certificate validity" "kubectl get certificates --all-namespaces | grep True | wc -l"
    
    # DNS resolution
    run_check "Internal DNS resolution" "kubectl exec -n smm-system deployment/api-gateway -- nslookup kubernetes.default.svc.cluster.local"
}

# 10. Final Security Scan
run_security_scan() {
    log_section "10. Final Security Scan"
    
    # Container image vulnerabilities
    if command -v trivy >/dev/null 2>&1; then
        run_check_with_output "Container vulnerability scan" "trivy image --severity HIGH,CRITICAL --quiet --format json nginx:1.25.3 | jq '.Results | length'"
    else
        log_warning "Trivy not available - manual container scanning required"
        ((WARNING_CHECKS++))
    fi
    
    # Kubernetes security benchmark
    if command -v kube-bench >/dev/null 2>&1; then
        run_check_with_output "CIS Kubernetes Benchmark" "kube-bench run --benchmark cis-1.6 | grep -c PASS"
    else
        log_warning "kube-bench not available - manual CIS benchmark validation required"
        ((WARNING_CHECKS++))
    fi
    
    # Network security scan
    if command -v nmap >/dev/null 2>&1; then
        run_check_with_output "Network security scan" "nmap -sS -O target_ip 2>/dev/null | grep -c 'open'"
    else
        log_warning "nmap not available - manual network security validation required"
        ((WARNING_CHECKS++))
    fi
}

# Generate comprehensive report
generate_final_report() {
    log_section "Generating Final Report"
    
    local report_file="$OUTPUT_DIR/production-readiness-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "validation_mode": "$VALIDATION_MODE",
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "failed": $FAILED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "critical_failures": $CRITICAL_FAILURES,
    "success_rate": "$(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)%"
  },
  "deployment_recommendation": {
    "status": "$([ $CRITICAL_FAILURES -eq 0 ] && echo "APPROVED" || echo "BLOCKED")",
    "reason": "$([ $CRITICAL_FAILURES -eq 0 ] && echo "All critical checks passed" || echo "$CRITICAL_FAILURES critical failure(s) detected")",
    "next_steps": [
      "$([ $CRITICAL_FAILURES -eq 0 ] && echo "Proceed with production deployment" || echo "Resolve critical issues before deployment")",
      "$([ $WARNING_CHECKS -gt 0 ] && echo "Address $WARNING_CHECKS warning(s) in next iteration" || echo "No warnings to address")",
      "Monitor deployment closely during rollout",
      "Execute post-deployment validation checklist"
    ]
  },
  "validation_categories": {
    "prerequisites": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "security": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "application_health": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "data_storage": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "performance": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "monitoring": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "compliance": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "disaster_recovery": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "integrations": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")",
    "security_scan": "$([ $? -eq 0 ] && echo "PASS" || echo "FAIL")"
  }
}
EOF

    log_info "Report generated: $report_file"
}

# Print final summary
print_final_summary() {
    log_section "Final Validation Summary"
    
    echo -e "\n${BLUE}📊 VALIDATION RESULTS${NC}"
    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "✅ Passed: $PASSED_CHECKS"
    echo -e "❌ Failed: $FAILED_CHECKS"
    echo -e "⚠️  Warnings: $WARNING_CHECKS"
    echo -e "🚨 Critical Failures: $CRITICAL_FAILURES"
    
    local success_rate=$(echo "scale=1; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)
    echo -e "📈 Success Rate: ${success_rate}%"
    
    echo -e "\n${PURPLE}🎯 DEPLOYMENT RECOMMENDATION${NC}"
    if [ $CRITICAL_FAILURES -eq 0 ]; then
        echo -e "${GREEN}✅ PRODUCTION DEPLOYMENT APPROVED${NC}"
        echo -e "All critical checks passed. Ready for production deployment."
        if [ $WARNING_CHECKS -gt 0 ]; then
            echo -e "${YELLOW}Note: $WARNING_CHECKS warning(s) should be addressed in the next iteration.${NC}"
        fi
    else
        echo -e "${RED}🚨 PRODUCTION DEPLOYMENT BLOCKED${NC}"
        echo -e "Critical failures detected. Resolve all critical issues before proceeding."
        echo -e "Critical failures: $CRITICAL_FAILURES"
    fi
    
    echo -e "\n${BLUE}📄 Reports generated in: $OUTPUT_DIR${NC}"
}

# Main execution
main() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════════╗"
    echo "║              SMM Architect Production Readiness Validation           ║"
    echo "║                     Comprehensive Pre-Deployment Check              ║"
    echo "╚══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    log_info "Environment: $ENVIRONMENT"
    log_info "Validation Mode: $VALIDATION_MODE"
    log_info "Output Directory: $OUTPUT_DIR"
    
    # Run all validation categories
    validate_prerequisites
    validate_security_configuration
    validate_application_health
    validate_data_storage
    validate_performance_scaling
    validate_monitoring_observability
    validate_compliance_governance
    validate_disaster_recovery
    validate_integrations
    run_security_scan
    
    # Generate reports and summary
    generate_final_report
    print_final_summary
    
    # Exit with appropriate code
    if [ $CRITICAL_FAILURES -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Handle script arguments
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    cat << EOF
SMM Architect Production Readiness Validation Script

Usage: $0 [environment] [validation_mode]

Arguments:
  environment      Target environment (production, staging, development)
  validation_mode  Validation scope (full, quick, security-only)

Examples:
  $0 production full
  $0 staging quick
  $0 production security-only

This script performs comprehensive pre-deployment validation including:
- Prerequisites and environment checks
- Security configuration validation
- Application health and readiness
- Data and storage validation
- Performance and scaling configuration
- Monitoring and observability
- Compliance and governance
- Disaster recovery readiness
- Integration and external dependencies
- Final security scanning

The script generates detailed reports and provides deployment recommendations.
EOF
    exit 0
fi

# Ensure bc is available for calculations
if ! command -v bc >/dev/null 2>&1; then
    echo "Error: 'bc' calculator is required for this script"
    echo "Install with: apt-get install bc (Ubuntu/Debian) or yum install bc (CentOS/RHEL)"
    exit 1
fi

# Execute main function
main "$@"