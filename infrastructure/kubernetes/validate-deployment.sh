#!/bin/bash

set -euo pipefail

# SMM Architect Comprehensive Deployment Validation
# This script performs complete deployment validation including infrastructure, services, and end-to-end tests

NAMESPACE=${1:-smm-architect}
ENVIRONMENT=${2:-production}
SKIP_E2E=${3:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp/smm-architect-validation"
REPORT_FILE="$LOG_DIR/validation-report-$(date +%Y%m%d-%H%M%S).json"
START_TIME=$(date +%s)

# Create log directory
mkdir -p "$LOG_DIR"

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_DIR/validation.log"
}

print_header() {
    echo -e "${PURPLE}"
    echo "=================================="
    echo "SMM Architect Deployment Validation"
    echo "=================================="
    echo -e "${NC}"
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo ""
}

check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    local required_tools=("kubectl" "curl" "jq" "node" "npm")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log "ERROR" "Missing required tools: ${missing_tools[*]}"
        return 1
    fi

    # Check kubectl connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        return 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "ERROR" "Namespace $NAMESPACE does not exist"
        return 1
    fi

    log "INFO" "Prerequisites check passed"
    return 0
}

validate_infrastructure() {
    log "INFO" "Validating infrastructure..."
    
    local validation_results=()
    
    # Check StatefulSets
    local statefulsets=("smm-postgres" "smm-redis")
    for ss in "${statefulsets[@]}"; do
        if kubectl get statefulset "$ss" -n "$NAMESPACE" &> /dev/null; then
            local ready=$(kubectl get statefulset "$ss" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get statefulset "$ss" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [[ "$ready" == "$desired" ]]; then
                validation_results+=("✅ $ss: Ready ($ready/$desired)")
            else
                validation_results+=("❌ $ss: Not ready ($ready/$desired)")
            fi
        else
            validation_results+=("❌ $ss: Missing")
        fi
    done

    # Check Services
    local services=("smm-architect-service" "smm-toolhub-service" "smm-model-router-service" "smm-publisher-service" "smm-agents-service")
    for svc in "${services[@]}"; do
        if kubectl get service "$svc" -n "$NAMESPACE" &> /dev/null; then
            local endpoints=$(kubectl get endpoints "$svc" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
            if [[ "$endpoints" -gt 0 ]]; then
                validation_results+=("✅ $svc: Service ready ($endpoints endpoints)")
            else
                validation_results+=("❌ $svc: No endpoints")
            fi
        else
            validation_results+=("❌ $svc: Missing")
        fi
    done

    # Print results
    echo -e "${BLUE}Infrastructure Validation Results:${NC}"
    for result in "${validation_results[@]}"; do
        echo "  $result"
    done
    echo ""

    # Count failures
    local failures=$(printf '%s\n' "${validation_results[@]}" | grep -c "❌" || true)
    if [[ "$failures" -gt 0 ]]; then
        log "ERROR" "Infrastructure validation failed with $failures errors"
        return 1
    fi

    log "INFO" "Infrastructure validation passed"
    return 0
}

validate_deployments() {
    log "INFO" "Validating deployments..."
    
    local deployments=("smm-architect-service" "smm-toolhub-service" "smm-model-router-service" "smm-publisher-service" "smm-agents-service")
    local validation_results=()

    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" &> /dev/null; then
            # Check rollout status
            if kubectl rollout status deployment/"$deployment" -n "$NAMESPACE" --timeout=300s; then
                local ready=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
                local desired=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
                validation_results+=("✅ $deployment: Ready ($ready/$desired)")
            else
                validation_results+=("❌ $deployment: Rollout failed")
            fi
        else
            validation_results+=("❌ $deployment: Missing")
        fi
    done

    # Print results
    echo -e "${BLUE}Deployment Validation Results:${NC}"
    for result in "${validation_results[@]}"; do
        echo "  $result"
    done
    echo ""

    # Count failures
    local failures=$(printf '%s\n' "${validation_results[@]}" | grep -c "❌" || true)
    if [[ "$failures" -gt 0 ]]; then
        log "ERROR" "Deployment validation failed with $failures errors"
        return 1
    fi

    log "INFO" "Deployment validation passed"
    return 0
}

validate_health_endpoints() {
    log "INFO" "Validating health endpoints..."
    
    local services=(
        "smm-architect-service:4000"
        "smm-toolhub-service:3001" 
        "smm-model-router-service:3002"
        "smm-publisher-service:3003"
        "smm-agents-service:3004"
    )
    
    local validation_results=()

    for service_port in "${services[@]}"; do
        local service=${service_port%:*}
        local port=${service_port#*:}
        
        log "INFO" "Testing health endpoint for $service on port $port"
        
        # Start port forward
        kubectl port-forward "service/$service" "$port:$port" -n "$NAMESPACE" &
        local pf_pid=$!
        
        # Wait for port forward
        sleep 5
        
        # Test health endpoint
        local health_status="unknown"
        if curl -f -s "http://localhost:$port/health" > /dev/null; then
            health_status="healthy"
            validation_results+=("✅ $service: Health endpoint responding")
        else
            health_status="unhealthy"
            validation_results+=("❌ $service: Health endpoint not responding")
        fi
        
        # Test readiness endpoint
        if curl -f -s "http://localhost:$port/ready" > /dev/null; then
            validation_results+=("✅ $service: Readiness endpoint responding")
        else
            validation_results+=("⚠️  $service: Readiness endpoint not responding")
        fi
        
        # Cleanup port forward
        kill "$pf_pid" 2>/dev/null || true
        wait "$pf_pid" 2>/dev/null || true
        sleep 2
    done

    # Print results
    echo -e "${BLUE}Health Endpoint Validation Results:${NC}"
    for result in "${validation_results[@]}"; do
        echo "  $result"
    done
    echo ""

    # Count critical failures (health endpoints)
    local critical_failures=$(printf '%s\n' "${validation_results[@]}" | grep -c "❌.*Health endpoint" || true)
    if [[ "$critical_failures" -gt 0 ]]; then
        log "ERROR" "Health endpoint validation failed with $critical_failures critical errors"
        return 1
    fi

    log "INFO" "Health endpoint validation passed"
    return 0
}

run_integration_tests() {
    if [[ "$SKIP_E2E" == "true" ]]; then
        log "INFO" "Skipping E2E integration tests"
        return 0
    fi

    log "INFO" "Running E2E integration tests..."
    
    # Change to tests directory
    cd "$SCRIPT_DIR/../../tests/e2e"
    
    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log "INFO" "Installing test dependencies..."
        npm install
    fi

    # Set test environment variables
    export TEST_MODE="k8s"
    export K8S_NAMESPACE="$NAMESPACE"
    export CORE_SERVICE_URL="http://localhost:4000"
    export TOOLHUB_SERVICE_URL="http://localhost:3001"
    export MODEL_ROUTER_SERVICE_URL="http://localhost:3002"
    export PUBLISHER_SERVICE_URL="http://localhost:3003"
    export AGENTS_SERVICE_URL="http://localhost:3004"

    # Run tests
    local test_exit_code=0
    if npm test; then
        log "INFO" "E2E integration tests passed"
        validation_results+=("✅ E2E Integration Tests: Passed")
    else
        test_exit_code=$?
        log "ERROR" "E2E integration tests failed with exit code $test_exit_code"
        validation_results+=("❌ E2E Integration Tests: Failed")
    fi

    # Return to original directory
    cd "$SCRIPT_DIR"

    return $test_exit_code
}

generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local status="SUCCESS"
    
    # Determine overall status
    if [[ ${#validation_errors[@]} -gt 0 ]]; then
        status="FAILED"
    fi

    # Generate JSON report
    cat > "$REPORT_FILE" << EOF
{
  "validation": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
    "namespace": "$NAMESPACE",
    "environment": "$ENVIRONMENT",
    "status": "$status",
    "duration_seconds": $duration,
    "skip_e2e": $SKIP_E2E
  },
  "infrastructure": {
    "status": "$(validate_infrastructure &> /dev/null && echo "PASSED" || echo "FAILED")"
  },
  "deployments": {
    "status": "$(validate_deployments &> /dev/null && echo "PASSED" || echo "FAILED")"
  },
  "health_endpoints": {
    "status": "$(validate_health_endpoints &> /dev/null && echo "PASSED" || echo "FAILED")"
  },
  "integration_tests": {
    "status": "$(run_integration_tests &> /dev/null && echo "PASSED" || echo "SKIPPED")"
  },
  "errors": $(printf '%s\n' "${validation_errors[@]}" | jq -R . | jq -s . 2>/dev/null || echo "[]"),
  "logs": {
    "directory": "$LOG_DIR",
    "main_log": "$LOG_DIR/validation.log"
  }
}
EOF

    log "INFO" "Validation report generated: $REPORT_FILE"
}

print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo ""
    echo -e "${PURPLE}=================================="
    echo "Validation Summary"
    echo -e "==================================${NC}"
    echo "Duration: ${duration}s"
    echo "Namespace: $NAMESPACE"
    echo "Environment: $ENVIRONMENT"
    
    if [[ ${#validation_errors[@]} -eq 0 ]]; then
        echo -e "Status: ${GREEN}✅ PASSED${NC}"
        echo ""
        echo -e "${GREEN}🎉 SMM Architect deployment validation completed successfully!${NC}"
        echo -e "${GREEN}All services are healthy and ready for production use.${NC}"
    else
        echo -e "Status: ${RED}❌ FAILED${NC}"
        echo ""
        echo -e "${RED}Validation Errors:${NC}"
        for error in "${validation_errors[@]}"; do
            echo -e "  ${RED}• $error${NC}"
        done
        echo ""
        echo -e "${RED}❌ SMM Architect deployment validation failed.${NC}"
        echo -e "${RED}Please review the errors above and fix issues before proceeding.${NC}"
    fi
    
    echo ""
    echo "Report: $REPORT_FILE"
    echo "Logs: $LOG_DIR/validation.log"
}

main() {
    declare -a validation_errors=()
    
    print_header
    
    # Run validation steps
    if ! check_prerequisites; then
        validation_errors+=("Prerequisites check failed")
    fi

    if ! validate_infrastructure; then
        validation_errors+=("Infrastructure validation failed")
    fi

    if ! validate_deployments; then
        validation_errors+=("Deployment validation failed")
    fi

    if ! validate_health_endpoints; then
        validation_errors+=("Health endpoint validation failed")
    fi

    if ! run_integration_tests; then
        if [[ "$SKIP_E2E" != "true" ]]; then
            validation_errors+=("Integration tests failed")
        fi
    fi

    # Generate report and summary
    generate_report
    print_summary

    # Exit with appropriate code
    if [[ ${#validation_errors[@]} -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Show usage if --help is passed
if [[ "${1:-}" == "--help" ]]; then
    echo "Usage: $0 [NAMESPACE] [ENVIRONMENT] [SKIP_E2E]"
    echo ""
    echo "Arguments:"
    echo "  NAMESPACE     Kubernetes namespace (default: smm-architect)"
    echo "  ENVIRONMENT   Deployment environment (default: production)"
    echo "  SKIP_E2E      Skip E2E tests (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Validate production in smm-architect namespace"
    echo "  $0 smm-architect-staging staging     # Validate staging environment"
    echo "  $0 smm-architect production true     # Skip E2E tests"
    exit 0
fi

main "$@"