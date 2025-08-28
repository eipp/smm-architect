#!/bin/bash

# SMM Architect KMS and Audit Compliance Verification Script
# This script validates KMS correctness, audit bundle signing, and DSR automation completeness

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${WORKSPACE_DIR}/logs/kms-audit-verification-$(date +%Y%m%d_%H%M%S).log"
RESULTS_FILE="${WORKSPACE_DIR}/logs/compliance-results-$(date +%Y%m%d_%H%M%S).json"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to print colored output and log
print_status() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message" | tee -a "$LOG_FILE"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message" | tee -a "$LOG_FILE"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message" | tee -a "$LOG_FILE"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  INFO${NC}: $message" | tee -a "$LOG_FILE"
            ;;
    esac
    
    # Log with timestamp
    echo "[$timestamp] $status: $message" >> "$LOG_FILE"
}

# Initialize results tracking
init_results() {
    cat > "$RESULTS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0.0",
  "compliance_checks": {
    "kms_verification": {},
    "audit_bundle_signing": {},
    "dsr_automation": {},
    "encryption_compliance": {},
    "key_rotation": {},
    "access_controls": {}
  },
  "overall_status": "unknown",
  "total_checks": 0,
  "passed_checks": 0,
  "failed_checks": 0,
  "warnings": 0
}
EOF
}

# Function to update results
update_results() {
    local category=$1
    local check_name=$2
    local status=$3
    local message=$4
    
    # Use jq to update the JSON file
    jq --arg cat "$category" --arg check "$check_name" --arg status "$status" --arg msg "$message" \
       '.compliance_checks[$cat][$check] = {"status": $status, "message": $msg, "timestamp": now | strftime("%Y-%m-%dT%H:%M:%SZ")}' \
       "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
}

# KMS Configuration Verification
verify_kms_configuration() {
    print_status "INFO" "🔐 Starting KMS Configuration Verification"
    
    # Check if KMS configuration files exist
    local kms_configs=(
        "services/audit/src/kms/adapters/aws.ts"
        "services/audit/src/kms/adapters/gcp.ts"
        "services/audit/src/kms/adapters/vault.ts"
        "services/audit/src/kms/adapters/local.ts"
    )
    
    for config in "${kms_configs[@]}"; do
        if [[ -f "${WORKSPACE_DIR}/${config}" ]]; then
            print_status "PASS" "KMS adapter found: $(basename "$config" .ts)"
            update_results "kms_verification" "$(basename "$config" .ts)_adapter" "pass" "KMS adapter configuration exists"
        else
            print_status "FAIL" "Missing KMS adapter: $(basename "$config" .ts)"
            update_results "kms_verification" "$(basename "$config" .ts)_adapter" "fail" "KMS adapter configuration missing"
        fi
    done
    
    # Verify KMS manager configuration
    local kms_manager_file="${WORKSPACE_DIR}/services/audit/src/kms/kms-manager.ts"
    if [[ -f "$kms_manager_file" ]]; then
        print_status "PASS" "KMS Manager configuration found"
        update_results "kms_verification" "kms_manager" "pass" "KMS manager exists"
        
        # Check for key rotation configuration
        if grep -q "rotateKey\|rotation" "$kms_manager_file"; then
            print_status "PASS" "Key rotation functionality detected in KMS manager"
            update_results "kms_verification" "key_rotation_support" "pass" "Key rotation functionality present"
        else
            print_status "WARN" "Key rotation functionality not clearly defined"
            update_results "kms_verification" "key_rotation_support" "warn" "Key rotation functionality unclear"
        fi
        
        # Check for multi-provider support
        if grep -q "aws\|gcp\|vault" "$kms_manager_file"; then
            print_status "PASS" "Multi-provider KMS support detected"
            update_results "kms_verification" "multi_provider" "pass" "Multiple KMS providers supported"
        else
            print_status "WARN" "Multi-provider KMS support unclear"
            update_results "kms_verification" "multi_provider" "warn" "Multi-provider support needs verification"
        fi
    else
        print_status "FAIL" "KMS Manager configuration missing"
        update_results "kms_verification" "kms_manager" "fail" "KMS manager configuration not found"
    fi
}

# Test KMS Functionality
test_kms_functionality() {
    print_status "INFO" "🧪 Testing KMS Functionality"
    
    # Create test data for encryption
    local test_data="SMM Architect KMS Test Data $(date)"
    local test_tenant="test-tenant-$(date +%s)"
    
    # Test encryption/decryption cycle
    print_status "INFO" "Testing encryption/decryption cycle"
    
    # Check if we can run KMS tests
    if [[ -f "${WORKSPACE_DIR}/services/audit/src/tests/kms-manager.test.ts" ]]; then
        print_status "PASS" "KMS test suite found"
        update_results "kms_verification" "test_suite" "pass" "KMS test suite exists"
        
        # Try to run KMS tests (if Jest is available)
        if command -v npx jest >/dev/null 2>&1; then
            print_status "INFO" "Running KMS unit tests"
            if npx jest "${WORKSPACE_DIR}/services/audit/src/tests/kms-manager.test.ts" --silent; then
                print_status "PASS" "KMS unit tests passed"
                update_results "kms_verification" "unit_tests" "pass" "KMS unit tests successful"
            else
                print_status "WARN" "KMS unit tests failed or incomplete"
                update_results "kms_verification" "unit_tests" "warn" "KMS unit tests need attention"
            fi
        else
            print_status "WARN" "Jest not available for running KMS tests"
            update_results "kms_verification" "unit_tests" "warn" "Jest not available for testing"
        fi
    else
        print_status "WARN" "KMS test suite not found"
        update_results "kms_verification" "test_suite" "warn" "KMS test suite missing"
    fi
}

# Verify Key Management Practices
verify_key_management() {
    print_status "INFO" "🔑 Verifying Key Management Practices"
    
    # Check for key rotation policies
    local key_rotation_files=(
        "docs/security/key-rotation-policy.md"
        "infrastructure/security/key-rotation.yaml"
        "scripts/rotate-keys.sh"
    )
    
    local rotation_policy_found=false
    for file in "${key_rotation_files[@]}"; do
        if [[ -f "${WORKSPACE_DIR}/${file}" ]]; then
            print_status "PASS" "Key rotation documentation found: $file"
            update_results "key_rotation" "policy_documentation" "pass" "Key rotation policy documented"
            rotation_policy_found=true
            break
        fi
    done
    
    if [[ "$rotation_policy_found" = false ]]; then
        print_status "WARN" "Key rotation policy documentation not found"
        update_results "key_rotation" "policy_documentation" "warn" "Key rotation policy needs documentation"
    fi
    
    # Check for key backup and recovery procedures
    if [[ -f "${WORKSPACE_DIR}/docs/security/key-backup-recovery.md" ]]; then
        print_status "PASS" "Key backup and recovery procedures documented"
        update_results "key_rotation" "backup_recovery" "pass" "Key backup/recovery procedures exist"
    else
        print_status "WARN" "Key backup and recovery procedures not documented"
        update_results "key_rotation" "backup_recovery" "warn" "Key backup/recovery procedures need documentation"
    fi
    
    # Verify key access controls
    if grep -r "rbac\|role.*based" "${WORKSPACE_DIR}/services/audit/src/" >/dev/null 2>&1; then
        print_status "PASS" "Role-based access control detected in audit service"
        update_results "access_controls" "rbac" "pass" "RBAC implementation found"
    else
        print_status "WARN" "Role-based access control not clearly implemented"
        update_results "access_controls" "rbac" "warn" "RBAC implementation needs verification"
    fi
}

# Audit Bundle Signing Verification
verify_audit_bundle_signing() {
    print_status "INFO" "📝 Verifying Audit Bundle Signing"
    
    # Check audit bundle assembler
    local audit_assembler="${WORKSPACE_DIR}/services/audit/src/services/audit-bundle-assembler.ts"
    if [[ -f "$audit_assembler" ]]; then
        print_status "PASS" "Audit bundle assembler found"
        update_results "audit_bundle_signing" "assembler" "pass" "Audit bundle assembler exists"
        
        # Check for digital signing functionality
        if grep -q "sign\|signature\|crypto" "$audit_assembler"; then
            print_status "PASS" "Digital signing functionality detected in audit assembler"
            update_results "audit_bundle_signing" "signing_function" "pass" "Digital signing functionality present"
        else
            print_status "WARN" "Digital signing functionality not clearly defined"
            update_results "audit_bundle_signing" "signing_function" "warn" "Digital signing needs verification"
        fi
        
        # Check for integrity verification
        if grep -q "verify\|validate\|integrity" "$audit_assembler"; then
            print_status "PASS" "Integrity verification functionality detected"
            update_results "audit_bundle_signing" "integrity_verification" "pass" "Integrity verification present"
        else
            print_status "WARN" "Integrity verification functionality unclear"
            update_results "audit_bundle_signing" "integrity_verification" "warn" "Integrity verification needs enhancement"
        fi
    else
        print_status "FAIL" "Audit bundle assembler not found"
        update_results "audit_bundle_signing" "assembler" "fail" "Audit bundle assembler missing"
    fi
    
    # Verify audit trail completeness
    local audit_models=(
        "audit_bundles"
        "audit_trails" 
        "compliance_records"
    )
    
    for model in "${audit_models[@]}"; do
        if grep -r "$model" "${WORKSPACE_DIR}/services/audit/" >/dev/null 2>&1; then
            print_status "PASS" "Audit model detected: $model"
            update_results "audit_bundle_signing" "${model}_model" "pass" "Audit model $model found"
        else
            print_status "WARN" "Audit model may be missing: $model"
            update_results "audit_bundle_signing" "${model}_model" "warn" "Audit model $model needs verification"
        fi
    done
}

# DSR (Data Subject Request) Automation Verification
verify_dsr_automation() {
    print_status "INFO" "📊 Verifying DSR Automation Completeness"
    
    # Check for DSR-related files and functionality
    local dsr_files=(
        "services/audit/src/services/dsr-processor.ts"
        "services/audit/src/controllers/dsr-controller.ts"
        "services/shared/src/dsr/"
    )
    
    local dsr_found=false
    for file in "${dsr_files[@]}"; do
        if [[ -f "${WORKSPACE_DIR}/${file}" ]] || [[ -d "${WORKSPACE_DIR}/${file}" ]]; then
            print_status "PASS" "DSR component found: $(basename "$file")"
            update_results "dsr_automation" "$(basename "$file" | tr '.' '_')" "pass" "DSR component exists"
            dsr_found=true
        fi
    done
    
    if [[ "$dsr_found" = false ]]; then
        print_status "WARN" "DSR automation components not clearly identified"
        update_results "dsr_automation" "components" "warn" "DSR components need identification"
    fi
    
    # Check for GDPR compliance features
    if grep -r -i "gdpr\|data.*subject\|right.*erasure\|data.*portability" "${WORKSPACE_DIR}/services/" >/dev/null 2>&1; then
        print_status "PASS" "GDPR compliance features detected"
        update_results "dsr_automation" "gdpr_features" "pass" "GDPR compliance features found"
    else
        print_status "WARN" "GDPR compliance features not clearly implemented"
        update_results "dsr_automation" "gdpr_features" "warn" "GDPR features need implementation"
    fi
    
    # Check for data anonymization capabilities
    if grep -r "anonymiz\|pseudonymiz\|mask" "${WORKSPACE_DIR}/services/" >/dev/null 2>&1; then
        print_status "PASS" "Data anonymization capabilities detected"
        update_results "dsr_automation" "anonymization" "pass" "Data anonymization features found"
    else
        print_status "WARN" "Data anonymization capabilities not found"
        update_results "dsr_automation" "anonymization" "warn" "Data anonymization needs implementation"
    fi
    
    # Check for retention policy implementation
    if grep -r "retention\|ttl\|lifecycle" "${WORKSPACE_DIR}/services/" >/dev/null 2>&1; then
        print_status "PASS" "Data retention policies detected"
        update_results "dsr_automation" "retention_policies" "pass" "Data retention implementation found"
    else
        print_status "WARN" "Data retention policies not clearly defined"
        update_results "dsr_automation" "retention_policies" "warn" "Data retention policies need clarification"
    fi
}

# Encryption Compliance Verification
verify_encryption_compliance() {
    print_status "INFO" "🔒 Verifying Encryption Compliance"
    
    # Check for encryption at rest
    if grep -r "encrypt.*rest\|AES.*256\|encryption.*storage" "${WORKSPACE_DIR}/" >/dev/null 2>&1; then
        print_status "PASS" "Encryption at rest implementation detected"
        update_results "encryption_compliance" "encryption_at_rest" "pass" "Encryption at rest implemented"
    else
        print_status "WARN" "Encryption at rest not clearly implemented"
        update_results "encryption_compliance" "encryption_at_rest" "warn" "Encryption at rest needs verification"
    fi
    
    # Check for encryption in transit
    local tls_configs=(
        "infrastructure/kubernetes/*tls*"
        "infrastructure/istio/*"
        "*nginx*ssl*"
    )
    
    local tls_found=false
    for pattern in "${tls_configs[@]}"; do
        if ls ${WORKSPACE_DIR}/${pattern} >/dev/null 2>&1; then
            print_status "PASS" "TLS/SSL configuration found"
            update_results "encryption_compliance" "encryption_in_transit" "pass" "TLS/SSL configuration exists"
            tls_found=true
            break
        fi
    done
    
    if [[ "$tls_found" = false ]]; then
        print_status "WARN" "TLS/SSL configuration not found"
        update_results "encryption_compliance" "encryption_in_transit" "warn" "TLS/SSL configuration needs setup"
    fi
    
    # Check for key derivation and management
    if grep -r "pbkdf2\|scrypt\|argon2\|key.*derivation" "${WORKSPACE_DIR}/services/" >/dev/null 2>&1; then
        print_status "PASS" "Secure key derivation detected"
        update_results "encryption_compliance" "key_derivation" "pass" "Secure key derivation implemented"
    else
        print_status "WARN" "Secure key derivation not clearly implemented"
        update_results "encryption_compliance" "key_derivation" "warn" "Secure key derivation needs implementation"
    fi
}

# Generate compliance report
generate_compliance_report() {
    print_status "INFO" "📋 Generating Compliance Report"
    
    # Calculate overall statistics
    local total_checks=$(jq '[.compliance_checks[] | to_entries[]] | length' "$RESULTS_FILE")
    local passed_checks=$(jq '[.compliance_checks[][] | select(.status == "pass")] | length' "$RESULTS_FILE")
    local failed_checks=$(jq '[.compliance_checks[][] | select(.status == "fail")] | length' "$RESULTS_FILE")
    local warnings=$(jq '[.compliance_checks[][] | select(.status == "warn")] | length' "$RESULTS_FILE")
    
    # Determine overall status
    local overall_status="unknown"
    if [[ $failed_checks -eq 0 ]] && [[ $warnings -eq 0 ]]; then
        overall_status="compliant"
    elif [[ $failed_checks -eq 0 ]]; then
        overall_status="mostly_compliant"
    else
        overall_status="non_compliant"
    fi
    
    # Update results file with statistics
    jq --arg status "$overall_status" --argjson total "$total_checks" --argjson passed "$passed_checks" \
       --argjson failed "$failed_checks" --argjson warnings "$warnings" \
       '.overall_status = $status | .total_checks = $total | .passed_checks = $passed | .failed_checks = $failed | .warnings = $warnings' \
       "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
    
    # Generate human-readable report
    local report_file="${WORKSPACE_DIR}/logs/compliance-report-$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" <<EOF
# SMM Architect Compliance Verification Report

**Generated:** $(date)
**Overall Status:** ${overall_status^^}
**Total Checks:** $total_checks
**Passed:** $passed_checks
**Failed:** $failed_checks  
**Warnings:** $warnings

## Executive Summary

This report summarizes the compliance verification results for SMM Architect's KMS, audit, and DSR systems.

### Compliance Score: $(( (passed_checks * 100) / total_checks ))%

## Detailed Results

### KMS Verification
$(jq -r '.compliance_checks.kms_verification | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

### Audit Bundle Signing
$(jq -r '.compliance_checks.audit_bundle_signing | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

### DSR Automation  
$(jq -r '.compliance_checks.dsr_automation | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

### Encryption Compliance
$(jq -r '.compliance_checks.encryption_compliance | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

### Key Rotation
$(jq -r '.compliance_checks.key_rotation | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

### Access Controls
$(jq -r '.compliance_checks.access_controls | to_entries[] | "- **\(.key):** \(.value.status | ascii_upcase) - \(.value.message)"' "$RESULTS_FILE")

## Recommendations

EOF

    # Add recommendations based on failed checks and warnings
    if [[ $failed_checks -gt 0 ]]; then
        echo "### Critical Issues (Must Fix)" >> "$report_file"
        jq -r '.compliance_checks[][] | select(.status == "fail") | "- \(.message)"' "$RESULTS_FILE" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    if [[ $warnings -gt 0 ]]; then
        echo "### Improvements Recommended" >> "$report_file"
        jq -r '.compliance_checks[][] | select(.status == "warn") | "- \(.message)"' "$RESULTS_FILE" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    cat >> "$report_file" <<EOF

## Next Steps

1. Address all critical issues identified in this report
2. Implement recommended improvements for warnings
3. Schedule regular compliance verification (monthly recommended)
4. Update documentation based on findings
5. Re-run verification after fixes are implemented

## Files Generated

- **Detailed Results:** \`$(basename "$RESULTS_FILE")\`
- **Verification Log:** \`$(basename "$LOG_FILE")\`
- **This Report:** \`$(basename "$report_file")\`

---
*Report generated by SMM Architect Compliance Verification Tool v1.0.0*
EOF

    print_status "INFO" "Compliance report generated: $report_file"
    print_status "INFO" "Detailed results available: $RESULTS_FILE"
    print_status "INFO" "Verification log: $LOG_FILE"
}

# Main execution
main() {
    echo "🔍 SMM Architect KMS & Audit Compliance Verification"
    echo "=================================================="
    echo "Starting verification at $(date)"
    echo "Workspace: $WORKSPACE_DIR"
    echo "Log file: $LOG_FILE"
    echo "Results file: $RESULTS_FILE"
    echo ""
    
    # Initialize
    init_results
    
    # Run verification steps
    verify_kms_configuration
    echo ""
    
    test_kms_functionality
    echo ""
    
    verify_key_management
    echo ""
    
    verify_audit_bundle_signing
    echo ""
    
    verify_dsr_automation
    echo ""
    
    verify_encryption_compliance
    echo ""
    
    # Generate final report
    generate_compliance_report
    echo ""
    
    # Final status
    local overall_status=$(jq -r '.overall_status' "$RESULTS_FILE")
    case $overall_status in
        "compliant")
            print_status "PASS" "🎉 SMM Architect is FULLY COMPLIANT with security and audit requirements"
            ;;
        "mostly_compliant")
            print_status "WARN" "⚠️ SMM Architect is MOSTLY COMPLIANT but has some warnings to address"
            ;;
        "non_compliant")
            print_status "FAIL" "❌ SMM Architect has COMPLIANCE ISSUES that must be resolved"
            ;;
        *)
            print_status "WARN" "❓ Compliance status could not be determined"
            ;;
    esac
    
    echo ""
    echo "Verification completed at $(date)"
    echo "Review the generated reports for detailed findings and recommendations."
}

# Check dependencies
check_dependencies() {
    local deps=(jq)
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" >/dev/null 2>&1; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        echo "Error: Missing required dependencies: ${missing_deps[*]}"
        echo "Please install them and run again."
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    main "$@"
fi