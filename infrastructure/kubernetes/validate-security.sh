#!/bin/bash

# Kubernetes Security Validation Script for SMM Architect
# This script validates all security configurations are properly applied

set -euo pipefail

NAMESPACE="smm-architect"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔒 SMM Architect Kubernetes Security Validation"
echo "=============================================="

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ PASS${NC}: $message"
            ;;
        "FAIL")
            echo -e "${RED}❌ FAIL${NC}: $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  WARN${NC}: $message"
            ;;
        "INFO")
            echo -e "ℹ️  INFO: $message"
            ;;
    esac
}

# Check if namespace exists and has proper labels
check_namespace_security() {
    echo "🏷️  Checking namespace security configuration..."
    
    if kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
        print_status "PASS" "Namespace $NAMESPACE exists"
        
        # Check Pod Security Standards labels
        local pss_enforce=$(kubectl get namespace $NAMESPACE -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}' 2>/dev/null || echo "")
        local pss_audit=$(kubectl get namespace $NAMESPACE -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/audit}' 2>/dev/null || echo "")
        
        if [[ "$pss_enforce" == "restricted" ]]; then
            print_status "PASS" "Pod Security Standards enforcement is set to 'restricted'"
        else
            print_status "FAIL" "Pod Security Standards enforcement is not set to 'restricted' (current: $pss_enforce)"
        fi
        
        if [[ "$pss_audit" == "restricted" ]]; then
            print_status "PASS" "Pod Security Standards audit is set to 'restricted'"
        else
            print_status "FAIL" "Pod Security Standards audit is not set to 'restricted' (current: $pss_audit)"
        fi
    else
        print_status "FAIL" "Namespace $NAMESPACE does not exist"
        return 1
    fi
}

# Check network policies
check_network_policies() {
    echo "🌐 Checking network policies..."
    
    local policies=(
        "default-deny-all"
        "frontend-network-policy"
        "core-service-network-policy"
        "model-router-network-policy"
        "toolhub-network-policy"
        "publisher-network-policy"
        "agents-network-policy"
        "postgresql-network-policy"
        "redis-network-policy"
    )
    
    for policy in "${policies[@]}"; do
        if kubectl get networkpolicy "$policy" -n "$NAMESPACE" > /dev/null 2>&1; then
            print_status "PASS" "Network policy '$policy' exists"
        else
            print_status "FAIL" "Network policy '$policy' is missing"
        fi
    done
    
    # Check if default deny-all is properly configured
    local deny_all_ingress=$(kubectl get networkpolicy default-deny-all -n "$NAMESPACE" -o jsonpath='{.spec.policyTypes[0]}' 2>/dev/null || echo "")
    local deny_all_egress=$(kubectl get networkpolicy default-deny-all -n "$NAMESPACE" -o jsonpath='{.spec.policyTypes[1]}' 2>/dev/null || echo "")
    
    if [[ "$deny_all_ingress" == "Ingress" && "$deny_all_egress" == "Egress" ]]; then
        print_status "PASS" "Default deny-all policy correctly blocks both ingress and egress"
    else
        print_status "FAIL" "Default deny-all policy is not properly configured"
    fi
}

# Check pod security contexts
check_pod_security_contexts() {
    echo "🔐 Checking pod security contexts..."
    
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o name 2>/dev/null | cut -d'/' -f2)
    
    for deployment in $deployments; do
        echo "  Checking deployment: $deployment"
        
        # Check runAsNonRoot
        local run_as_non_root=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.securityContext.runAsNonRoot}' 2>/dev/null || echo "false")
        if [[ "$run_as_non_root" == "true" ]]; then
            print_status "PASS" "$deployment: runAsNonRoot is true"
        else
            print_status "FAIL" "$deployment: runAsNonRoot is not true"
        fi
        
        # Check readOnlyRootFilesystem for all containers
        local containers=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[*].name}' 2>/dev/null)
        for container in $containers; do
            local readonly_fs=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].securityContext.readOnlyRootFilesystem}\" 2>/dev/null || echo "false")
            if [[ "$readonly_fs" == "true" ]]; then
                print_status "PASS" "$deployment/$container: readOnlyRootFilesystem is true"
            else
                print_status "FAIL" "$deployment/$container: readOnlyRootFilesystem is not true"
            fi
            
            # Check allowPrivilegeEscalation
            local priv_esc=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].securityContext.allowPrivilegeEscalation}\" 2>/dev/null || echo "true")
            if [[ "$priv_esc" == "false" ]]; then
                print_status "PASS" "$deployment/$container: allowPrivilegeEscalation is false"
            else
                print_status "FAIL" "$deployment/$container: allowPrivilegeEscalation is not false"
            fi
            
            # Check dropped capabilities
            local caps=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].securityContext.capabilities.drop[*]}\" 2>/dev/null || echo "")
            if [[ "$caps" == *"ALL"* ]]; then
                print_status "PASS" "$deployment/$container: All capabilities are dropped"
            else
                print_status "FAIL" "$deployment/$container: Not all capabilities are dropped (current: $caps)"
            fi
        done
    done
}

# Check resource quotas and limits
check_resource_limits() {
    echo "📊 Checking resource quotas and limits..."
    
    # Check ResourceQuota
    if kubectl get resourcequota smm-architect-quota -n "$NAMESPACE" > /dev/null 2>&1; then
        print_status "PASS" "ResourceQuota exists"
        
        local cpu_requests=$(kubectl get resourcequota smm-architect-quota -n "$NAMESPACE" -o jsonpath='{.spec.hard.requests\.cpu}' 2>/dev/null)
        local memory_requests=$(kubectl get resourcequota smm-architect-quota -n "$NAMESPACE" -o jsonpath='{.spec.hard.requests\.memory}' 2>/dev/null)
        
        print_status "INFO" "CPU requests quota: $cpu_requests"
        print_status "INFO" "Memory requests quota: $memory_requests"
    else
        print_status "FAIL" "ResourceQuota is missing"
    fi
    
    # Check LimitRange
    if kubectl get limitrange smm-architect-limits -n "$NAMESPACE" > /dev/null 2>&1; then
        print_status "PASS" "LimitRange exists"
    else
        print_status "FAIL" "LimitRange is missing"
    fi
    
    # Check pod resource requests and limits
    local pods=$(kubectl get pods -n "$NAMESPACE" -o name 2>/dev/null | cut -d'/' -f2)
    for pod in $pods; do
        if [[ $pod == *"-"* ]]; then # Skip jobs/completed pods
            local containers=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.spec.containers[*].name}' 2>/dev/null)
            for container in $containers; do
                local cpu_request=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath=\"{.spec.containers[?(@.name=='$container')].resources.requests.cpu}\" 2>/dev/null)
                local memory_request=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath=\"{.spec.containers[?(@.name=='$container')].resources.requests.memory}\" 2>/dev/null)
                local cpu_limit=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath=\"{.spec.containers[?(@.name=='$container')].resources.limits.cpu}\" 2>/dev/null)
                local memory_limit=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath=\"{.spec.containers[?(@.name=='$container')].resources.limits.memory}\" 2>/dev/null)
                
                if [[ -n "$cpu_request" && -n "$memory_request" && -n "$cpu_limit" && -n "$memory_limit" ]]; then
                    print_status "PASS" "$pod/$container: Has proper resource requests and limits"
                else
                    print_status "FAIL" "$pod/$container: Missing resource requests or limits"
                fi
            done
        fi
    done
}

# Check service accounts and RBAC
check_rbac() {
    echo "🛡️  Checking RBAC configuration..."
    
    # Check service account
    if kubectl get serviceaccount smm-architect-service-account -n "$NAMESPACE" > /dev/null 2>&1; then
        print_status "PASS" "Service account exists"
        
        # Check automountServiceAccountToken
        local automount=$(kubectl get serviceaccount smm-architect-service-account -n "$NAMESPACE" -o jsonpath='{.automountServiceAccountToken}' 2>/dev/null || echo "true")
        if [[ "$automount" == "false" ]]; then
            print_status "PASS" "Service account has automountServiceAccountToken disabled"
        else
            print_status "WARN" "Service account has automountServiceAccountToken enabled"
        fi
    else
        print_status "FAIL" "Service account is missing"
    fi
    
    # Check role
    if kubectl get role smm-architect-role -n "$NAMESPACE" > /dev/null 2>&1; then
        print_status "PASS" "Role exists"
    else
        print_status "FAIL" "Role is missing"
    fi
    
    # Check rolebinding
    if kubectl get rolebinding smm-architect-binding -n "$NAMESPACE" > /dev/null 2>&1; then
        print_status "PASS" "RoleBinding exists"
    else
        print_status "FAIL" "RoleBinding is missing"
    fi
}

# Check health probes
check_health_probes() {
    echo "🏥 Checking health probes..."
    
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o name 2>/dev/null | cut -d'/' -f2)
    
    for deployment in $deployments; do
        local containers=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[*].name}' 2>/dev/null)
        
        for container in $containers; do
            # Check liveness probe
            local liveness=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].livenessProbe}\" 2>/dev/null)
            if [[ -n "$liveness" && "$liveness" != "null" ]]; then
                print_status "PASS" "$deployment/$container: Has liveness probe"
            else
                print_status "FAIL" "$deployment/$container: Missing liveness probe"
            fi
            
            # Check readiness probe
            local readiness=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].readinessProbe}\" 2>/dev/null)
            if [[ -n "$readiness" && "$readiness" != "null" ]]; then
                print_status "PASS" "$deployment/$container: Has readiness probe"
            else
                print_status "FAIL" "$deployment/$container: Missing readiness probe"
            fi
            
            # Check startup probe (optional but recommended)
            local startup=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath=\"{.spec.template.spec.containers[?(@.name=='$container')].startupProbe}\" 2>/dev/null)
            if [[ -n "$startup" && "$startup" != "null" ]]; then
                print_status "PASS" "$deployment/$container: Has startup probe"
            else
                print_status "WARN" "$deployment/$container: Missing startup probe (recommended)"
            fi
        done
    done
}

# Check pod disruption budgets
check_pdb() {
    echo "🛡️  Checking Pod Disruption Budgets..."
    
    local expected_pdbs=("frontend-pdb" "core-service-pdb" "model-router-pdb" "toolhub-pdb" "publisher-pdb" "agents-pdb")
    
    for pdb in "${expected_pdbs[@]}"; do
        if kubectl get pdb "$pdb" -n "$NAMESPACE" > /dev/null 2>&1; then
            print_status "PASS" "PodDisruptionBudget '$pdb' exists"
        else
            print_status "WARN" "PodDisruptionBudget '$pdb' is missing (recommended for HA)"
        fi
    done
}

# Check image security
check_image_security() {
    echo "🏗️  Checking image security..."
    
    local deployments=$(kubectl get deployments -n "$NAMESPACE" -o name 2>/dev/null | cut -d'/' -f2)
    
    for deployment in $deployments; do
        local images=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[*].image}' 2>/dev/null)
        
        for image in $images; do
            # Check if image uses latest tag
            if [[ "$image" == *":latest" ]]; then
                print_status "FAIL" "$deployment: Using 'latest' tag in image '$image'"
            elif [[ "$image" != *":"* ]]; then
                print_status "FAIL" "$deployment: Image '$image' has no tag (defaults to latest)"
            else
                print_status "PASS" "$deployment: Image '$image' uses specific tag"
            fi
            
            # Check imagePullPolicy
            local pull_policy=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].imagePullPolicy}' 2>/dev/null)
            if [[ "$pull_policy" == "IfNotPresent" ]] || [[ "$pull_policy" == "Always" ]]; then
                print_status "PASS" "$deployment: imagePullPolicy is '$pull_policy'"
            else
                print_status "WARN" "$deployment: imagePullPolicy should be 'IfNotPresent' or 'Always'"
            fi
        done
    done
}

# Main execution
main() {
    echo "Starting security validation for namespace: $NAMESPACE"
    echo ""
    
    local failed_checks=0
    
    check_namespace_security || ((failed_checks++))
    echo ""
    
    check_network_policies || ((failed_checks++))
    echo ""
    
    check_pod_security_contexts || ((failed_checks++))
    echo ""
    
    check_resource_limits || ((failed_checks++))
    echo ""
    
    check_rbac || ((failed_checks++))
    echo ""
    
    check_health_probes || ((failed_checks++))
    echo ""
    
    check_pdb || ((failed_checks++))
    echo ""
    
    check_image_security || ((failed_checks++))
    echo ""
    
    # Summary
    echo "=============================================="
    if [ $failed_checks -eq 0 ]; then
        print_status "PASS" "All security validations completed successfully!"
        echo "🎉 Your SMM Architect deployment meets security best practices."
    else
        print_status "FAIL" "$failed_checks security validation(s) failed"
        echo "⚠️  Please review and fix the failed checks before deploying to production."
        exit 1
    fi
}

# Run validations
main "$@"