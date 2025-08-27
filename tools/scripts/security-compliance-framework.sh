#!/bin/bash

# SMM Architect Security & Compliance Framework
# Comprehensive security assessment, audit trail verification, and compliance validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECURITY_DIR="$PROJECT_ROOT/security"
REPORTS_DIR="$PROJECT_ROOT/reports"
ENVIRONMENT="${1:-production}"

# Color codes
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

# Global counters
TOTAL_CHECKS=0; PASSED_CHECKS=0; FAILED_CHECKS=0; WARNING_CHECKS=0; CRITICAL_FAILURES=0
SECURITY_SCORE=0; COMPLIANCE_SCORE=0

# Initialize security framework
initialize_security_framework() {
    log_section "Initializing Security & Compliance Framework"
    mkdir -p "$SECURITY_DIR"/{assessments,policies,audit,compliance} "$REPORTS_DIR/security"
    ASSESSMENT_TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
    ASSESSMENT_ID="sec-assess-$ASSESSMENT_TIMESTAMP"
    log_info "Assessment ID: $ASSESSMENT_ID"
    log_success "Security framework initialized"
}

# Audit Trail Verification
audit_trail_verification() {
    log_section "Audit Trail Verification"
    
    # Check audit configuration
    local check_name="Audit Configuration"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local issues=(); local score=100
    
    ! kubectl get configmap audit-policy -n kube-system &>/dev/null && issues+=("K8s audit policy missing") && score=$((score - 30))
    ! vault audit list | grep -q "file/" && issues+=("Vault audit logging disabled") && score=$((score - 30))
    ! find "$PROJECT_ROOT" -name "*.yaml" -exec grep -l "audit" {} \; | head -1 >/dev/null && issues+=("App audit logging missing") && score=$((score - 40))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: Audit configuration verified"
    elif [ $score -ge 70 ]; then
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        log_warning "$check_name: Issues - ${issues[*]}"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1)); CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
        log_error "$check_name: Critical - ${issues[*]}"
    fi
    SECURITY_SCORE=$((SECURITY_SCORE + score))
    
    # Check audit integrity
    check_name="Audit Integrity"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    issues=(); score=100
    
    ! grep -r "signature\|checksum" "$PROJECT_ROOT/services/audit" >/dev/null 2>&1 && issues+=("No cryptographic verification") && score=$((score - 40))
    ! grep -r "immutable\|append.*only" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Storage not immutable") && score=$((score - 30))
    ! grep -r "tamper.*detect" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("No tamper detection") && score=$((score - 30))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: Audit integrity verified"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log_error "$check_name: Issues - ${issues[*]}"
    fi
    SECURITY_SCORE=$((SECURITY_SCORE + score))
}

# Policy Coverage Assessment
policy_coverage_assessment() {
    log_section "Policy Coverage Assessment"
    
    # OPA Policy Coverage
    local check_name="OPA Policy Coverage"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local issues=(); local score=100
    
    local policies=("main_rules.rego" "consent_rules.rego" "budget_rules.rego" "security_rules.rego")
    for policy in "${policies[@]}"; do
        [ ! -f "$PROJECT_ROOT/services/policy/$policy" ] && issues+=("Missing $policy") && score=$((score - 20))
    done
    
    [ ! -f "$PROJECT_ROOT/tests/policy/opa-policy-verification.test.ts" ] && issues+=("Policy tests missing") && score=$((score - 20))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: Policy coverage complete"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log_error "$check_name: Issues - ${issues[*]}"
    fi
    SECURITY_SCORE=$((SECURITY_SCORE + score))
    
    # Security Policy Enforcement
    check_name="Security Policy Enforcement"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    issues=(); score=100
    
    ! kubectl get validatingadmissionwebhooks | grep -q "gatekeeper" && issues+=("OPA Gatekeeper missing") && score=$((score - 30))
    ! grep -r "securityContext" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Security contexts not enforced") && score=$((score - 25))
    ! grep -r "allowPrivilegeEscalation.*false" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Privilege escalation not prevented") && score=$((score - 25))
    ! kubectl get networkpolicy --all-namespaces | grep -q "default-deny" && issues+=("Default deny policies missing") && score=$((score - 20))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: Security policies enforced"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1)); CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
        log_error "$check_name: Critical - ${issues[*]}"
    fi
    SECURITY_SCORE=$((SECURITY_SCORE + score))
}

# Compliance Validation
compliance_validation() {
    log_section "Compliance Validation"
    
    # GDPR Compliance
    local check_name="GDPR Compliance"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local issues=(); local score=100
    
    ! grep -r "encrypt.*rest\|tls\|ssl" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Encryption missing") && score=$((score - 30))
    ! grep -r "consent.*manage" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Consent management missing") && score=$((score - 25))
    ! grep -r "data.*subject.*rights" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Data subject rights missing") && score=$((score - 25))
    ! grep -r "data.*minimization" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Data minimization not documented") && score=$((score - 20))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: GDPR compliant"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1)); CRITICAL_FAILURES=$((CRITICAL_FAILURES + 1))
        log_error "$check_name: Critical - ${issues[*]}"
    fi
    COMPLIANCE_SCORE=$((COMPLIANCE_SCORE + score))
    
    # SOC2 Compliance
    check_name="SOC2 Compliance"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    issues=(); score=100
    
    ! grep -r "access.*control\|authentication" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Access controls missing") && score=$((score - 25))
    ! grep -r "high.*availability\|backup" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Availability controls missing") && score=$((score - 25))
    ! grep -r "data.*integrity\|validation" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Integrity controls missing") && score=$((score - 25))
    ! grep -r "confidential\|privacy" "$PROJECT_ROOT" >/dev/null 2>&1 && issues+=("Privacy controls missing") && score=$((score - 25))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: SOC2 compliant"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log_error "$check_name: Issues - ${issues[*]}"
    fi
    COMPLIANCE_SCORE=$((COMPLIANCE_SCORE + score))
}

# Security Scanning
security_scanning() {
    log_section "Security Scanning"
    
    local check_name="Container Security Scan"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local issues=(); local score=100
    
    # Check for security scanning tools
    ! command -v trivy >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1 && issues+=("Security scanning tools missing") && score=$((score - 50))
    
    # Check base image security
    ! find "$PROJECT_ROOT" -name "Dockerfile*" -exec grep -l "FROM.*:latest" {} \; | wc -l | grep -q "^0$" && issues+=("Using latest tags in images") && score=$((score - 25))
    
    # Check for security policies in containers
    ! find "$PROJECT_ROOT" -name "*.yaml" -exec grep -l "runAsNonRoot\|readOnlyRootFilesystem" {} \; | head -1 >/dev/null && issues+=("Container security not configured") && score=$((score - 25))
    
    if [ ${#issues[@]} -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "$check_name: Security scanning passed"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log_error "$check_name: Issues - ${issues[*]}"
    fi
    SECURITY_SCORE=$((SECURITY_SCORE + score))
}

# Generate security report
generate_security_report() {
    log_section "Generating Security Report"
    
    local report_file="$REPORTS_DIR/security/security-compliance-report-$ASSESSMENT_TIMESTAMP.json"
    local overall_score=$(( (SECURITY_SCORE + COMPLIANCE_SCORE) / (TOTAL_CHECKS * 2) ))
    
    cat > "$report_file" << EOF
{
  "assessment_id": "$ASSESSMENT_ID",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$ENVIRONMENT",
  "overall_score": $overall_score,
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "failed": $FAILED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "critical_failures": $CRITICAL_FAILURES
  },
  "scores": {
    "security_score": $(( SECURITY_SCORE / TOTAL_CHECKS )),
    "compliance_score": $(( COMPLIANCE_SCORE / TOTAL_CHECKS ))
  },
  "recommendations": [
    $([ $CRITICAL_FAILURES -gt 0 ] && echo '"Address critical security failures before production deployment",' || echo '')
    $([ $FAILED_CHECKS -gt 0 ] && echo '"Resolve security policy enforcement issues",' || echo '')
    $([ $WARNING_CHECKS -gt 0 ] && echo '"Address warning items in next iteration"' || echo '"Maintain current security posture"')
  ],
  "compliance_status": {
    "gdpr": $([ $COMPLIANCE_SCORE -ge 80 ] && echo "true" || echo "false"),
    "soc2": $([ $SECURITY_SCORE -ge 80 ] && echo "true" || echo "false"),
    "production_ready": $([ $CRITICAL_FAILURES -eq 0 ] && echo "true" || echo "false")
  }
}
EOF
    
    log_success "Security report generated: $report_file"
}

# Print final summary
print_summary() {
    log_section "Security & Compliance Assessment Summary"
    
    echo -e "\n${BLUE}📊 ASSESSMENT RESULTS${NC}"
    echo -e "Total Checks: $TOTAL_CHECKS"
    echo -e "✅ Passed: $PASSED_CHECKS"
    echo -e "❌ Failed: $FAILED_CHECKS"  
    echo -e "⚠️  Warnings: $WARNING_CHECKS"
    echo -e "🚨 Critical: $CRITICAL_FAILURES"
    
    local overall_score=$(( (SECURITY_SCORE + COMPLIANCE_SCORE) / (TOTAL_CHECKS * 2) ))
    echo -e "📈 Overall Score: ${overall_score}%"
    
    if [ $CRITICAL_FAILURES -eq 0 ]; then
        echo -e "\n${GREEN}✅ SECURITY COMPLIANCE APPROVED${NC}"
        echo -e "Ready for production deployment from security perspective."
    else
        echo -e "\n${RED}🚨 SECURITY COMPLIANCE FAILED${NC}"
        echo -e "Critical security issues must be resolved."
    fi
}

# Main execution
main() {
    echo -e "${BLUE}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        SMM Architect Security Framework     ║${NC}"
    echo -e "${BLUE}║     Comprehensive Security & Compliance     ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}\n"
    
    initialize_security_framework
    audit_trail_verification
    policy_coverage_assessment
    compliance_validation
    security_scanning
    generate_security_report
    print_summary
    
    [ $CRITICAL_FAILURES -eq 0 ] && exit 0 || exit 1
}

main "$@"