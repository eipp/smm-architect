#!/bin/bash

# SMM Architect Multi-Tenant Deployment Script
# Usage: ./deploy-multi-tenant.sh [environment] [action] [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENVIRONMENT="${1:-staging}"
ACTION="${2:-deploy}"
TENANT_ID="${3:-}"

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

# Environment validation
validate_environment() {
    case $ENVIRONMENT in
        staging|production|development)
            log_info "Deploying to environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Use: staging, production, or development"
            exit 1
            ;;
    esac
}

# Prerequisites check
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local required_tools=("kubectl" "helm" "pulumi" "vault" "docker")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again"
        exit 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please ensure kubectl is configured correctly"
        exit 1
    fi
    
    # Check Vault connectivity
    if ! vault status &> /dev/null; then
        log_warning "Cannot connect to Vault - some features may not work"
    fi
    
    log_success "Prerequisites check passed"
}

# Load environment configuration
load_environment_config() {
    local config_file="$PROJECT_ROOT/infrastructure/environments/$ENVIRONMENT.env"
    
    if [ -f "$config_file" ]; then
        log_info "Loading environment configuration from $config_file"
        source "$config_file"
    else
        log_warning "Environment configuration file not found: $config_file"
        log_warning "Using default values"
    fi
    
    # Set default values if not provided
    export CLUSTER_NAME="${CLUSTER_NAME:-smm-$ENVIRONMENT}"
    export NAMESPACE_PREFIX="${NAMESPACE_PREFIX:-smm-tenant}"
    export VAULT_ADDR="${VAULT_ADDR:-http://vault.vault.svc.cluster.local:8200}"
    export PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
    export GRAFANA_URL="${GRAFANA_URL:-http://grafana.monitoring.svc.cluster.local:3000}"
    export DEFAULT_STORAGE_CLASS="${DEFAULT_STORAGE_CLASS:-fast-ssd}"
    export BACKUP_ENABLED="${BACKUP_ENABLED:-true}"
    export MONITORING_ENABLED="${MONITORING_ENABLED:-true}"
}

# Setup base infrastructure
setup_base_infrastructure() {
    log_info "Setting up base multi-tenant infrastructure..."
    
    # Create monitoring namespace if it doesn't exist
    if ! kubectl get namespace monitoring &> /dev/null; then
        log_info "Creating monitoring namespace..."
        kubectl create namespace monitoring
        kubectl label namespace monitoring name=monitoring
    fi
    
    # Create vault namespace if it doesn't exist
    if ! kubectl get namespace vault &> /dev/null; then
        log_info "Creating vault namespace..."
        kubectl create namespace vault
        kubectl label namespace vault name=vault
    fi
    
    # Deploy CRDs for monitoring
    log_info "Deploying monitoring CRDs..."
    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/crds/"
    
    # Deploy RBAC for tenant management
    log_info "Deploying tenant management RBAC..."
    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/rbac/"
    
    # Deploy storage classes
    log_info "Deploying storage classes..."
    kubectl apply -f "$PROJECT_ROOT/infrastructure/k8s/storage/"
    
    log_success "Base infrastructure setup completed"
}

# Deploy Vault for secrets management
deploy_vault() {
    log_info "Deploying Vault for multi-tenant secrets management..."
    
    # Add HashiCorp Helm repository
    helm repo add hashicorp https://helm.releases.hashicorp.com
    helm repo update
    
    # Deploy Vault
    helm upgrade --install vault hashicorp/vault \
        --namespace vault \
        --set "server.ha.enabled=true" \
        --set "server.ha.replicas=3" \
        --set "server.resources.requests.memory=256Mi" \
        --set "server.resources.requests.cpu=250m" \
        --set "server.resources.limits.memory=512Mi" \
        --set "server.resources.limits.cpu=500m" \
        --set "ui.enabled=true" \
        --set "injector.enabled=true" \
        --wait
    
    # Wait for Vault to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=vault -n vault --timeout=300s
    
    log_success "Vault deployment completed"
}

# Deploy monitoring stack
deploy_monitoring() {
    if [ "$MONITORING_ENABLED" != "true" ]; then
        log_info "Monitoring disabled, skipping..."
        return 0
    fi
    
    log_info "Deploying monitoring stack for multi-tenant observability..."
    
    # Add Prometheus community Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Deploy Prometheus Operator
    helm upgrade --install prometheus-operator prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --set prometheus.prometheusSpec.retention=30d \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.adminPassword="admin123" \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.size=10Gi \
        --wait
    
    # Deploy custom ServiceMonitors for tenant monitoring
    kubectl apply -f "$PROJECT_ROOT/monitoring/servicemonitors/"
    
    # Deploy Grafana dashboards for tenant management
    kubectl apply -f "$PROJECT_ROOT/monitoring/grafana/dashboards/"
    
    log_success "Monitoring stack deployment completed"
}

# Deploy tenant provisioner
deploy_tenant_provisioner() {
    log_info "Deploying tenant provisioner..."
    
    # Build and push tenant provisioner image
    log_info "Building tenant provisioner image..."
    docker build -t "smm-tenant-provisioner:$ENVIRONMENT" \
        -f "$PROJECT_ROOT/infrastructure/docker/Dockerfile.tenant-provisioner" \
        "$PROJECT_ROOT"
    
    # Tag and push to registry (in production, this would be a real registry)
    if [ "$ENVIRONMENT" = "production" ]; then
        docker tag "smm-tenant-provisioner:$ENVIRONMENT" "$DOCKER_REGISTRY/smm-tenant-provisioner:$ENVIRONMENT"
        docker push "$DOCKER_REGISTRY/smm-tenant-provisioner:$ENVIRONMENT"
    fi
    
    # Deploy tenant provisioner
    envsubst < "$PROJECT_ROOT/infrastructure/k8s/tenant-provisioner.yaml" | kubectl apply -f -
    
    # Wait for deployment to be ready
    kubectl wait --for=condition=available deployment/tenant-provisioner -n smm-system --timeout=300s
    
    log_success "Tenant provisioner deployment completed"
}

# Create sample tenant
create_sample_tenant() {
    if [ -z "$TENANT_ID" ]; then
        TENANT_ID="sample-$(date +%s)"
    fi
    
    log_info "Creating sample tenant: $TENANT_ID"
    
    # Create tenant configuration
    cat > "/tmp/tenant-$TENANT_ID.json" << EOF
{
  "tenantId": "$TENANT_ID",
  "tenantName": "Sample Tenant",
  "billingId": "bill-$TENANT_ID",
  "tier": "starter",
  "complianceLevel": "standard",
  "region": "us-east-1",
  "features": {
    "agents": {
      "research": true,
      "creative": true,
      "legal": false,
      "analytics": false,
      "coordinator": true,
      "brand": false
    },
    "connectors": ["linkedin", "twitter"],
    "simulation": {
      "enabled": true,
      "maxIterations": 1000,
      "concurrentSimulations": 2
    },
    "monitoring": {
      "metrics": true,
      "logging": true,
      "alerts": false
    },
    "backup": {
      "enabled": false,
      "frequency": "weekly",
      "retention": 7
    }
  },
  "limits": {
    "workspaces": 5,
    "usersPerWorkspace": 10,
    "monthlyBudget": 500,
    "apiRequestsPerMinute": 100,
    "storageQuotaGB": 50,
    "simulationTimeoutMinutes": 30
  },
  "contact": {
    "adminEmail": "admin@sample.com",
    "billingEmail": "billing@sample.com",
    "technicalContact": "tech@sample.com",
    "supportLevel": "basic"
  }
}
EOF
    
    # Submit tenant creation request
    kubectl exec -it deployment/tenant-provisioner -n smm-system -- \
        curl -X POST http://localhost:8080/api/tenants \
        -H "Content-Type: application/json" \
        -d @/tmp/tenant-$TENANT_ID.json
    
    # Verify tenant was created
    sleep 10
    if kubectl get namespace "smm-tenant-$TENANT_ID" &> /dev/null; then
        log_success "Sample tenant created successfully: $TENANT_ID"
    else
        log_error "Failed to create sample tenant: $TENANT_ID"
        exit 1
    fi
    
    # Cleanup temp file
    rm -f "/tmp/tenant-$TENANT_ID.json"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local failed_checks=0
    
    # Check Vault health
    if vault status &> /dev/null; then
        log_success "✓ Vault is healthy"
    else
        log_error "✗ Vault health check failed"
        ((failed_checks++))
    fi
    
    # Check Prometheus health
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus | grep -q Running; then
        log_success "✓ Prometheus is healthy"
    else
        log_error "✗ Prometheus health check failed"
        ((failed_checks++))
    fi
    
    # Check Grafana health
    if kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana | grep -q Running; then
        log_success "✓ Grafana is healthy"
    else
        log_error "✗ Grafana health check failed"
        ((failed_checks++))
    fi
    
    # Check tenant provisioner health
    if kubectl get pods -n smm-system -l app=tenant-provisioner | grep -q Running; then
        log_success "✓ Tenant provisioner is healthy"
    else
        log_error "✗ Tenant provisioner health check failed"
        ((failed_checks++))
    fi
    
    if [ $failed_checks -eq 0 ]; then
        log_success "All health checks passed"
    else
        log_error "$failed_checks health check(s) failed"
        exit 1
    fi
}

# Cleanup function
cleanup_deployment() {
    log_warning "Cleaning up multi-tenant deployment..."
    
    # List all tenant namespaces
    local tenant_namespaces=$(kubectl get namespaces -l smm.architect/managed-by=smm-provisioner -o name)
    
    if [ -n "$tenant_namespaces" ]; then
        log_info "Found tenant namespaces to cleanup:"
        echo "$tenant_namespaces"
        
        read -p "Are you sure you want to delete all tenant namespaces? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$tenant_namespaces" | xargs kubectl delete
            log_success "Tenant namespaces cleaned up"
        else
            log_info "Tenant namespace cleanup cancelled"
        fi
    fi
    
    # Remove base infrastructure
    kubectl delete -f "$PROJECT_ROOT/infrastructure/k8s/rbac/" --ignore-not-found=true
    kubectl delete -f "$PROJECT_ROOT/infrastructure/k8s/storage/" --ignore-not-found=true
    
    # Uninstall Helm charts
    helm uninstall vault -n vault --ignore-not-found
    helm uninstall prometheus-operator -n monitoring --ignore-not-found
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "SMM Architect Multi-Tenant Deployment Script"
    log_info "Environment: $ENVIRONMENT"
    log_info "Action: $ACTION"
    
    validate_environment
    check_prerequisites
    load_environment_config
    
    case $ACTION in
        deploy)
            setup_base_infrastructure
            deploy_vault
            deploy_monitoring
            deploy_tenant_provisioner
            run_health_checks
            log_success "Multi-tenant deployment completed successfully!"
            ;;
        create-tenant)
            if [ -z "$TENANT_ID" ]; then
                log_error "Tenant ID required for create-tenant action"
                log_error "Usage: $0 $ENVIRONMENT create-tenant <tenant-id>"
                exit 1
            fi
            create_sample_tenant
            ;;
        health-check)
            run_health_checks
            ;;
        cleanup)
            cleanup_deployment
            ;;
        *)
            log_error "Invalid action: $ACTION"
            log_error "Valid actions: deploy, create-tenant, health-check, cleanup"
            exit 1
            ;;
    esac
}

# Help function
show_help() {
    cat << EOF
SMM Architect Multi-Tenant Deployment Script

Usage: $0 [environment] [action] [options]

Environments:
  staging      Deploy to staging environment
  production   Deploy to production environment
  development  Deploy to development environment

Actions:
  deploy        Deploy complete multi-tenant infrastructure
  create-tenant Create a sample tenant (requires tenant-id)
  health-check  Run health checks on deployed components
  cleanup       Remove all multi-tenant infrastructure

Examples:
  $0 staging deploy
  $0 production create-tenant sample-tenant-001
  $0 staging health-check
  $0 development cleanup

Environment Variables:
  CLUSTER_NAME         Name of the Kubernetes cluster
  VAULT_ADDR           Vault server address
  PROMETHEUS_URL       Prometheus server URL
  GRAFANA_URL          Grafana server URL
  DOCKER_REGISTRY      Docker registry for images
  MONITORING_ENABLED   Enable monitoring stack (true/false)
  BACKUP_ENABLED       Enable backup features (true/false)
EOF
}

# Check if help is requested
if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    show_help
    exit 0
fi

# Execute main function
main "$@"