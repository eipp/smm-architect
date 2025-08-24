#!/bin/bash

# SMM Architect Alerting System Deployment Script
# This script deploys Prometheus alert rules and Alertmanager configuration
# Usage: ./deploy-alerting.sh [environment] [--validate-only]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
ENVIRONMENT="${1:-staging}"
VALIDATE_ONLY="${2:-}"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "helm" "promtool" "amtool")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=("KUBECONFIG" "PROMETHEUS_NAMESPACE" "ALERTMANAGER_NAMESPACE")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Environment variable $var is not set"
            exit 1
        fi
    done
    
    log_success "Prerequisites check passed"
}

# Validate Prometheus alert rules
validate_prometheus_rules() {
    log_info "Validating Prometheus alert rules..."
    
    local rules_file="$MONITORING_DIR/prometheus/rules/smm-alerts.yml"
    
    if [[ ! -f "$rules_file" ]]; then
        log_error "Alert rules file not found: $rules_file"
        exit 1
    fi
    
    # Validate with promtool
    if promtool check rules "$rules_file"; then
        log_success "Prometheus rules validation passed"
    else
        log_error "Prometheus rules validation failed"
        exit 1
    fi
    
    # Check for required alert rules
    local required_alerts=(
        "SMM_ConnectorDown"
        "SMM_ConnectorHighErrorRate"
        "SMM_BudgetThresholdExceeded"
        "SMM_BudgetCriticalOverspend"
        "SMM_AgentHighFailureRate"
        "SMM_SimulationHighFailureRate"
        "SMM_CanaryDeploymentFailure"
        "SMM_CanaryModelDrift"
    )
    
    for alert in "${required_alerts[@]}"; do
        if ! grep -q "alert: $alert" "$rules_file"; then
            log_error "Required alert rule missing: $alert"
            exit 1
        fi
    done
    
    log_success "All required alert rules found"
}

# Validate Alertmanager configuration
validate_alertmanager_config() {
    log_info "Validating Alertmanager configuration..."
    
    local config_file="$MONITORING_DIR/alertmanager/alertmanager.yml"
    
    if [[ ! -f "$config_file" ]]; then
        log_error "Alertmanager config file not found: $config_file"
        exit 1
    fi
    
    # Create temporary config with environment variables substituted
    local temp_config="/tmp/alertmanager-config-$$.yml"
    envsubst < "$config_file" > "$temp_config"
    
    # Validate with amtool
    if amtool check-config "$temp_config"; then
        log_success "Alertmanager configuration validation passed"
    else
        log_error "Alertmanager configuration validation failed"
        rm -f "$temp_config"
        exit 1
    fi
    
    rm -f "$temp_config"
    
    # Check for required receivers
    local required_receivers=(
        "critical-alerts"
        "platform-team"
        "finance-team"
        "security-team"
        "ml-team"
    )
    
    for receiver in "${required_receivers[@]}"; do
        if ! grep -q "name: '$receiver'" "$config_file"; then
            log_error "Required receiver missing: $receiver"
            exit 1
        fi
    done
    
    log_success "All required receivers found"
}

# Deploy Prometheus rules
deploy_prometheus_rules() {
    log_info "Deploying Prometheus alert rules to $ENVIRONMENT..."
    
    local rules_file="$MONITORING_DIR/prometheus/rules/smm-alerts.yml"
    local configmap_name="smm-prometheus-rules"
    
    # Create or update ConfigMap
    kubectl create configmap "$configmap_name" \
        --from-file="$rules_file" \
        --namespace="$PROMETHEUS_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Restart Prometheus to reload rules
    kubectl rollout restart deployment/prometheus-server \
        --namespace="$PROMETHEUS_NAMESPACE" || true
    
    # Wait for rollout to complete
    kubectl rollout status deployment/prometheus-server \
        --namespace="$PROMETHEUS_NAMESPACE" \
        --timeout=300s || true
    
    log_success "Prometheus rules deployed successfully"
}

# Deploy Alertmanager configuration
deploy_alertmanager_config() {
    log_info "Deploying Alertmanager configuration to $ENVIRONMENT..."
    
    local config_file="$MONITORING_DIR/alertmanager/alertmanager.yml"
    local secret_name="smm-alertmanager-config"
    
    # Substitute environment variables
    local temp_config="/tmp/alertmanager-config-deploy-$$.yml"
    envsubst < "$config_file" > "$temp_config"
    
    # Create or update Secret
    kubectl create secret generic "$secret_name" \
        --from-file=alertmanager.yml="$temp_config" \
        --namespace="$ALERTMANAGER_NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    rm -f "$temp_config"
    
    # Restart Alertmanager to reload configuration
    kubectl rollout restart deployment/alertmanager \
        --namespace="$ALERTMANAGER_NAMESPACE" || true
    
    # Wait for rollout to complete
    kubectl rollout status deployment/alertmanager \
        --namespace="$ALERTMANAGER_NAMESPACE" \
        --timeout=300s || true
    
    log_success "Alertmanager configuration deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying alerting system deployment..."
    
    # Check Prometheus rules are loaded
    local prometheus_url="${PROMETHEUS_URL:-http://localhost:9090}"
    local max_retries=30
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -s "$prometheus_url/api/v1/rules" | grep -q "smm_"; then
            log_success "Prometheus rules are loaded"
            break
        fi
        
        log_info "Waiting for Prometheus rules to load... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    if [[ $retry_count -ge $max_retries ]]; then
        log_warning "Could not verify Prometheus rules loading"
    fi
    
    # Check Alertmanager configuration is loaded
    local alertmanager_url="${ALERTMANAGER_URL:-http://localhost:9093}"
    retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -s "$alertmanager_url/api/v1/status" | grep -q '"status":"success"'; then
            log_success "Alertmanager is running with new configuration"
            break
        fi
        
        log_info "Waiting for Alertmanager to reload... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    if [[ $retry_count -ge $max_retries ]]; then
        log_warning "Could not verify Alertmanager configuration loading"
    fi
}

# Run tests
run_tests() {
    log_info "Running alerting system tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run Jest tests for alerting system
    if npm test -- tests/monitoring/alerting-system.test.ts; then
        log_success "Alerting system tests passed"
    else
        log_error "Alerting system tests failed"
        exit 1
    fi
}

# Create monitoring dashboard
create_monitoring_dashboard() {
    log_info "Creating alerting system monitoring dashboard..."
    
    local dashboard_file="$MONITORING_DIR/dashboards/alerting-system-dashboard.json"
    
    # Create dashboard if it doesn't exist
    if [[ ! -f "$dashboard_file" ]]; then
        cat > "$dashboard_file" << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "SMM Alerting System Monitoring",
    "tags": ["smm", "alerting", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Alerts",
        "type": "stat",
        "targets": [
          {
            "expr": "ALERTS{alertstate=\"firing\"}",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "thresholds"
            },
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 5}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Alert Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(prometheus_notifications_total[5m])",
            "refId": "A",
            "legendFormat": "Notification Rate"
          }
        ]
      },
      {
        "id": 3,
        "title": "Alertmanager Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"alertmanager\"}",
            "refId": "A"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
EOF
        log_success "Alerting system dashboard created"
    fi
}

# Backup current configuration
backup_config() {
    log_info "Creating backup of current configuration..."
    
    local backup_dir="$PROJECT_ROOT/backup/alerting-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Prometheus rules
    kubectl get configmap smm-prometheus-rules \
        --namespace="$PROMETHEUS_NAMESPACE" \
        -o yaml > "$backup_dir/prometheus-rules.yaml" 2>/dev/null || true
    
    # Backup Alertmanager config
    kubectl get secret smm-alertmanager-config \
        --namespace="$ALERTMANAGER_NAMESPACE" \
        -o yaml > "$backup_dir/alertmanager-config.yaml" 2>/dev/null || true
    
    log_success "Configuration backed up to $backup_dir"
}

# Main execution
main() {
    log_info "Starting SMM Architect alerting system deployment for $ENVIRONMENT"
    
    # Set environment-specific values
    case "$ENVIRONMENT" in
        "production")
            export PROMETHEUS_NAMESPACE="monitoring"
            export ALERTMANAGER_NAMESPACE="monitoring"
            export PROMETHEUS_URL="https://prometheus.smm-architect.com"
            export ALERTMANAGER_URL="https://alertmanager.smm-architect.com"
            ;;
        "staging")
            export PROMETHEUS_NAMESPACE="monitoring-staging"
            export ALERTMANAGER_NAMESPACE="monitoring-staging"
            export PROMETHEUS_URL="https://prometheus-staging.smm-architect.com"
            export ALERTMANAGER_URL="https://alertmanager-staging.smm-architect.com"
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Check prerequisites
    check_prerequisites
    
    # Validate configurations
    validate_prometheus_rules
    validate_alertmanager_config
    
    # Run tests
    run_tests
    
    if [[ "$VALIDATE_ONLY" == "--validate-only" ]]; then
        log_success "Validation completed successfully. Skipping deployment."
        exit 0
    fi
    
    # Backup existing configuration
    backup_config
    
    # Deploy configurations
    deploy_prometheus_rules
    deploy_alertmanager_config
    
    # Create monitoring dashboard
    create_monitoring_dashboard
    
    # Verify deployment
    verify_deployment
    
    log_success "SMM Architect alerting system deployment completed successfully!"
    
    # Display summary
    echo
    echo "=== Deployment Summary ==="
    echo "Environment: $ENVIRONMENT"
    echo "Prometheus Namespace: $PROMETHEUS_NAMESPACE"
    echo "Alertmanager Namespace: $ALERTMANAGER_NAMESPACE"
    echo "Prometheus URL: $PROMETHEUS_URL"
    echo "Alertmanager URL: $ALERTMANAGER_URL"
    echo
    echo "Next steps:"
    echo "1. Verify alerts are working: $ALERTMANAGER_URL"
    echo "2. Check Prometheus rules: $PROMETHEUS_URL/rules"
    echo "3. Monitor alert activity in Grafana dashboards"
    echo "4. Test notification channels (Slack, email, PagerDuty)"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Execute main function
main "$@"