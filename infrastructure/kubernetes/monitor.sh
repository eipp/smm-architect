#!/bin/bash

set -euo pipefail

# SMM Architect Deployment Health Monitoring Script
# This script continuously monitors the health of deployed services and sends alerts

NAMESPACE=${1:-smm-architect}
MONITORING_INTERVAL=${2:-60}  # seconds
LOG_FILE="/tmp/smm-architect-health-monitor.log"
ALERT_WEBHOOK=${ALERT_WEBHOOK_URL:-""}
SLACK_WEBHOOK=${SLACK_WEBHOOK_URL:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service definitions
declare -A SERVICES=(
    ["smm-architect-service"]="4000"
    ["smm-toolhub-service"]="3001"
    ["smm-model-router-service"]="3002"
    ["smm-publisher-service"]="3003"
    ["smm-agents-service"]="3004"
)

declare -A STATEFULSETS=(
    ["smm-postgres"]="5432"
    ["smm-redis"]="6379"
)

# Health status tracking
declare -A LAST_STATUS
declare -A FAILURE_COUNT

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

check_prerequisites() {
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl is not installed or not in PATH"
        exit 1
    fi

    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log "ERROR" "Namespace $NAMESPACE does not exist"
        exit 1
    fi

    log "INFO" "Prerequisites check passed"
}

check_service_health() {
    local service=$1
    local port=$2
    local status="healthy"
    local details=""

    # Check if deployment exists and is ready
    if ! kubectl get deployment "$service" -n "$NAMESPACE" &> /dev/null; then
        status="missing"
        details="Deployment does not exist"
        return 1
    fi

    # Check deployment status
    local ready_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_replicas=$(kubectl get deployment "$service" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [[ "$ready_replicas" != "$desired_replicas" ]]; then
        status="degraded"
        details="Ready replicas: $ready_replicas/$desired_replicas"
    fi

    # Check pod status
    local failing_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$service" --field-selector=status.phase!=Running -o name 2>/dev/null | wc -l)
    if [[ "$failing_pods" -gt 0 ]]; then
        status="unhealthy"
        details="$failing_pods pod(s) not running"
    fi

    # Check service endpoint
    if ! kubectl get service "$service" -n "$NAMESPACE" &> /dev/null; then
        status="unhealthy"
        details="Service does not exist"
    fi

    # Attempt health check via port forward (if healthy so far)
    if [[ "$status" == "healthy" ]]; then
        local pf_pid
        timeout 10 kubectl port-forward "service/$service" "$port:$port" -n "$NAMESPACE" &> /dev/null &
        pf_pid=$!
        sleep 3

        if curl -f -s "http://localhost:$port/health" &> /dev/null; then
            status="healthy"
            details="Health endpoint responding"
        else
            status="degraded"
            details="Health endpoint not responding"
        fi

        kill "$pf_pid" 2>/dev/null || true
        wait "$pf_pid" 2>/dev/null || true
    fi

    echo "$status|$details"
}

check_statefulset_health() {
    local statefulset=$1
    local port=$2
    local status="healthy"
    local details=""

    # Check if statefulset exists and is ready
    if ! kubectl get statefulset "$statefulset" -n "$NAMESPACE" &> /dev/null; then
        status="missing"
        details="StatefulSet does not exist"
        return 1
    fi

    # Check statefulset status
    local ready_replicas=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_replicas=$(kubectl get statefulset "$statefulset" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

    if [[ "$ready_replicas" != "$desired_replicas" ]]; then
        status="degraded"
        details="Ready replicas: $ready_replicas/$desired_replicas"
    fi

    # Check pod status
    local failing_pods=$(kubectl get pods -n "$NAMESPACE" -l app="$statefulset" --field-selector=status.phase!=Running -o name 2>/dev/null | wc -l)
    if [[ "$failing_pods" -gt 0 ]]; then
        status="unhealthy"
        details="$failing_pods pod(s) not running"
    fi

    echo "$status|$details"
}

send_alert() {
    local service=$1
    local status=$2
    local details=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')

    local message="🚨 SMM Architect Alert: $service is $status"
    if [[ -n "$details" ]]; then
        message="$message - $details"
    fi
    message="$message (Namespace: $NAMESPACE, Time: $timestamp)"

    log "ALERT" "$message"

    # Send to webhook if configured
    if [[ -n "$ALERT_WEBHOOK" ]]; then
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"text\":\"$message\",\"service\":\"$service\",\"status\":\"$status\",\"namespace\":\"$NAMESPACE\",\"timestamp\":\"$timestamp\"}" \
             "$ALERT_WEBHOOK" &> /dev/null || true
    fi

    # Send to Slack if configured
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local emoji="🚨"
        case "$status" in
            "healthy") emoji="✅" ;;
            "degraded") emoji="⚠️" ;;
            "unhealthy") emoji="❌" ;;
            "missing") emoji="❓" ;;
        esac

        curl -X POST -H "Content-Type: application/json" \
             -d "{\"text\":\"$emoji $message\"}" \
             "$SLACK_WEBHOOK" &> /dev/null || true
    fi
}

check_overall_health() {
    local healthy_count=0
    local total_count=0
    local critical_failures=0

    echo -e "${BLUE}=== SMM Architect Health Check Report ===${NC}"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S UTC')"
    echo "Namespace: $NAMESPACE"
    echo ""

    # Check services
    echo -e "${BLUE}Services:${NC}"
    for service in "${!SERVICES[@]}"; do
        local port=${SERVICES[$service]}
        local result
        result=$(check_service_health "$service" "$port")
        local status=${result%|*}
        local details=${result#*|}

        total_count=$((total_count + 1))

        case "$status" in
            "healthy")
                echo -e "  ${GREEN}✅ $service${NC} - $details"
                healthy_count=$((healthy_count + 1))
                ;;
            "degraded")
                echo -e "  ${YELLOW}⚠️  $service${NC} - $details"
                ;;
            "unhealthy"|"missing")
                echo -e "  ${RED}❌ $service${NC} - $details"
                critical_failures=$((critical_failures + 1))
                ;;
        esac

        # Check if status changed
        if [[ "${LAST_STATUS[$service]:-}" != "$status" ]]; then
            if [[ -n "${LAST_STATUS[$service]:-}" ]]; then
                send_alert "$service" "$status" "$details"
            fi
            LAST_STATUS[$service]="$status"
        fi

        # Track failure count
        if [[ "$status" == "unhealthy" || "$status" == "missing" ]]; then
            FAILURE_COUNT[$service]=$((${FAILURE_COUNT[$service]:-0} + 1))
        else
            FAILURE_COUNT[$service]=0
        fi
    done

    echo ""

    # Check statefulsets
    echo -e "${BLUE}StatefulSets:${NC}"
    for statefulset in "${!STATEFULSETS[@]}"; do
        local port=${STATEFULSETS[$statefulset]}
        local result
        result=$(check_statefulset_health "$statefulset" "$port")
        local status=${result%|*}
        local details=${result#*|}

        total_count=$((total_count + 1))

        case "$status" in
            "healthy")
                echo -e "  ${GREEN}✅ $statefulset${NC} - $details"
                healthy_count=$((healthy_count + 1))
                ;;
            "degraded")
                echo -e "  ${YELLOW}⚠️  $statefulset${NC} - $details"
                ;;
            "unhealthy"|"missing")
                echo -e "  ${RED}❌ $statefulset${NC} - $details"
                critical_failures=$((critical_failures + 1))
                ;;
        esac

        # Check if status changed
        if [[ "${LAST_STATUS[$statefulset]:-}" != "$status" ]]; then
            if [[ -n "${LAST_STATUS[$statefulset]:-}" ]]; then
                send_alert "$statefulset" "$status" "$details"
            fi
            LAST_STATUS[$statefulset]="$status"
        fi

        # Track failure count
        if [[ "$status" == "unhealthy" || "$status" == "missing" ]]; then
            FAILURE_COUNT[$statefulset]=$((${FAILURE_COUNT[$statefulset]:-0} + 1))
        else
            FAILURE_COUNT[$statefulset]=0
        fi
    done

    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo "  Healthy: $healthy_count/$total_count"
    echo "  Critical Failures: $critical_failures"

    if [[ $critical_failures -eq 0 ]]; then
        echo -e "  Overall Status: ${GREEN}Healthy${NC}"
    elif [[ $critical_failures -lt 3 ]]; then
        echo -e "  Overall Status: ${YELLOW}Degraded${NC}"
    else
        echo -e "  Overall Status: ${RED}Unhealthy${NC}"
    fi

    echo ""
    echo "=== End Health Check Report ==="
    echo ""
}

show_resource_usage() {
    echo -e "${BLUE}=== Resource Usage ===${NC}"
    kubectl top pods -n "$NAMESPACE" 2>/dev/null || echo "Metrics server not available"
    echo ""
}

show_recent_events() {
    echo -e "${BLUE}=== Recent Events ===${NC}"
    kubectl get events -n "$NAMESPACE" --sort-by='.lastTimestamp' | tail -10
    echo ""
}

main() {
    log "INFO" "Starting SMM Architect health monitoring"
    log "INFO" "Namespace: $NAMESPACE"
    log "INFO" "Monitoring interval: ${MONITORING_INTERVAL}s"
    log "INFO" "Log file: $LOG_FILE"

    check_prerequisites

    # Handle signals for graceful shutdown
    trap 'log "INFO" "Received shutdown signal, exiting..."; exit 0' SIGTERM SIGINT

    # Monitoring loop
    while true; do
        check_overall_health
        
        # Show additional info every 5th check
        if [[ $(($(date +%s) / MONITORING_INTERVAL % 5)) -eq 0 ]]; then
            show_resource_usage
            show_recent_events
        fi

        sleep "$MONITORING_INTERVAL"
    done
}

# Show usage if --help is passed
if [[ "${1:-}" == "--help" ]]; then
    echo "Usage: $0 [NAMESPACE] [MONITORING_INTERVAL]"
    echo ""
    echo "Arguments:"
    echo "  NAMESPACE            Kubernetes namespace (default: smm-architect)"
    echo "  MONITORING_INTERVAL  Monitoring interval in seconds (default: 60)"
    echo ""
    echo "Environment Variables:"
    echo "  ALERT_WEBHOOK_URL    Webhook URL for alerts"
    echo "  SLACK_WEBHOOK_URL    Slack webhook URL for alerts"
    echo ""
    echo "Example:"
    echo "  $0 smm-architect 30"
    echo "  SLACK_WEBHOOK_URL=https://hooks.slack.com/... $0"
    exit 0
fi

main "$@"