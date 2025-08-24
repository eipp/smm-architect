#!/bin/bash

# SMM Architect Enhanced Monitoring Stack Deployment Script
# This script deploys the complete enhanced monitoring infrastructure including
# Model Router dashboards, canary deployment monitoring, and centralized logging

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
ENVIRONMENT="${1:-production}"
ACTION="${2:-deploy}"

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
    log_info "Checking prerequisites for enhanced monitoring deployment..."
    
    # Check required tools
    local tools=("kubectl" "helm" "jq" "curl")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if monitoring namespace exists
    if ! kubectl get namespace monitoring &> /dev/null; then
        log_info "Creating monitoring namespace..."
        kubectl create namespace monitoring
    fi
    
    # Check if logging namespace exists
    if ! kubectl get namespace logging &> /dev/null; then
        log_info "Creating logging namespace..."
        kubectl create namespace logging
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy Prometheus monitoring stack
deploy_prometheus_stack() {
    log_info "Deploying enhanced Prometheus monitoring stack..."
    
    # Add Prometheus community Helm repository
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Deploy kube-prometheus-stack with enhanced configuration
    cat << EOF | helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --values -
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: 50GiB
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: fast-ssd
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    additionalScrapeConfigs:
      - job_name: 'model-router'
        static_configs:
          - targets: ['model-router.smm-system.svc.cluster.local:3003']
        metrics_path: '/metrics'
        scrape_interval: 30s
      - job_name: 'canary-deployments'
        static_configs:
          - targets: ['model-router.smm-system.svc.cluster.local:3003']
        metrics_path: '/api/canary-deployments/metrics'
        scrape_interval: 15s
      - job_name: 'mcp-workflows'
        static_configs:
          - targets: ['n8n.n8n.svc.cluster.local:5678']
        metrics_path: '/metrics'
        scrape_interval: 30s
    ruleFiles:
      - "/etc/prometheus/rules/*.yml"
    additionalRuleConfigMaps:
      - name: enhanced-model-router-rules
        key: enhanced-model-router-alerts.yml

grafana:
  adminPassword: "${GRAFANA_ADMIN_PASSWORD:-admin123}"
  persistence:
    enabled: true
    size: 20Gi
    storageClassName: fast-ssd
  sidecar:
    dashboards:
      enabled: true
      searchNamespace: ALL
      folderAnnotation: grafana_folder
      provider:
        foldersFromFilesStructure: true
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'smm-dashboards'
        orgId: 1
        folder: 'SMM Architect'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/smm

alertmanager:
  config:
    global:
      smtp_smarthost: "${SMTP_HOST:-localhost:587}"
      smtp_from: "alerts@smm-architect.com"
    route:
      group_by: ['alertname', 'service', 'severity']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      receiver: 'smm-default'
      routes:
      - match:
          severity: critical
        receiver: 'smm-critical'
      - match:
          service: model-router
        receiver: 'smm-ml-team'
      - match:
          service: canary
        receiver: 'smm-ml-team'
    receivers:
    - name: 'smm-default'
      slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: '#smm-alerts'
        title: 'SMM Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    - name: 'smm-critical'
      slack_configs:
      - api_url: "${SLACK_WEBHOOK_URL}"
        channel: '#smm-critical'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
      pagerduty_configs:
      - service_key: "${PAGERDUTY_SERVICE_KEY}"
        description: '{{ .GroupLabels.alertname }}: {{ .GroupLabels.service }}'
    - name: 'smm-ml-team'
      slack_configs:
      - api_url: "${SLACK_ML_WEBHOOK_URL}"
        channel: '#ml-alerts'
        title: 'ML Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
EOF
    
    log_success "Prometheus stack deployment completed"
}

# Deploy enhanced ServiceMonitors
deploy_service_monitors() {
    log_info "Deploying enhanced ServiceMonitors..."
    
    kubectl apply -f "$MONITORING_DIR/servicemonitors/enhanced-monitoring.yaml"
    
    log_success "ServiceMonitors deployed successfully"
}

# Deploy enhanced alert rules
deploy_alert_rules() {
    log_info "Deploying enhanced alert rules..."
    
    # Create ConfigMap for enhanced alert rules
    kubectl create configmap enhanced-model-router-rules \
        --from-file="$MONITORING_DIR/prometheus/rules/enhanced-model-router-alerts.yml" \
        --namespace=monitoring \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Label the ConfigMap for Prometheus to discover it
    kubectl label configmap enhanced-model-router-rules \
        --namespace=monitoring \
        prometheus=kube-prometheus \
        role=alert-rules \
        --overwrite
    
    log_success "Enhanced alert rules deployed successfully"
}

# Deploy Grafana dashboards
deploy_grafana_dashboards() {
    log_info "Deploying enhanced Grafana dashboards..."
    
    # Create ConfigMaps for dashboards
    kubectl create configmap smm-model-router-dashboard \
        --from-file="$MONITORING_DIR/dashboards/model-router-dashboard.json" \
        --namespace=monitoring \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Label the ConfigMap for Grafana to discover it
    kubectl label configmap smm-model-router-dashboard \
        --namespace=monitoring \
        grafana_dashboard=1 \
        grafana_folder="SMM Architect" \
        --overwrite
    
    log_success "Enhanced Grafana dashboards deployed successfully"
}

# Deploy centralized logging stack
deploy_logging_stack() {
    log_info "Deploying enhanced centralized logging stack..."
    
    # Deploy Elasticsearch
    cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
        ports:
        - containerPort: 9200
        - containerPort: 9300
        env:
        - name: discovery.type
          value: zen
        - name: cluster.name
          value: smm-logging
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms2g -Xmx2g"
        - name: xpack.security.enabled
          value: "false"
        - name: xpack.monitoring.collection.enabled
          value: "true"
        volumeMounts:
        - name: elasticsearch-data
          mountPath: /usr/share/elasticsearch/data
        resources:
          requests:
            memory: 4Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
  volumeClaimTemplates:
  - metadata:
      name: elasticsearch-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: logging
spec:
  selector:
    app: elasticsearch
  ports:
  - name: http
    port: 9200
    targetPort: 9200
  - name: transport
    port: 9300
    targetPort: 9300
  clusterIP: None
EOF

    # Deploy enhanced Fluentd configuration
    kubectl apply -f "$MONITORING_DIR/logging/enhanced-logging-config.yaml"
    
    # Deploy Fluentd DaemonSet with enhanced configuration
    cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-enhanced
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluentd-enhanced
  template:
    metadata:
      labels:
        app: fluentd-enhanced
    spec:
      serviceAccount: fluentd
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_CONF
          value: fluent.conf
        - name: ELASTICSEARCH_HOST
          value: elasticsearch.logging.svc.cluster.local
        - name: ELASTICSEARCH_PORT
          value: "9200"
        - name: CLUSTER_NAME
          value: smm-architect
        - name: ENVIRONMENT
          value: "${ENVIRONMENT}"
        volumeMounts:
        - name: fluentd-config
          mountPath: /fluentd/etc
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        resources:
          requests:
            memory: 512Mi
            cpu: 200m
          limits:
            memory: 1Gi
            cpu: 500m
      volumes:
      - name: fluentd-config
        configMap:
          name: fluentd-enhanced-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
EOF

    # Deploy Kibana with enhanced dashboards
    cat << EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
      - name: kibana
        image: docker.elastic.co/kibana/kibana:8.8.0
        ports:
        - containerPort: 5601
        env:
        - name: ELASTICSEARCH_HOSTS
          value: "http://elasticsearch.logging.svc.cluster.local:9200"
        - name: SERVER_NAME
          value: "smm-kibana"
        - name: SERVER_BASEPATH
          value: "/kibana"
        - name: XPACK_SECURITY_ENABLED
          value: "false"
        - name: XPACK_MONITORING_ENABLED
          value: "true"
        volumeMounts:
        - name: kibana-config
          mountPath: /usr/share/kibana/config/dashboards
        resources:
          requests:
            memory: 1Gi
            cpu: 500m
          limits:
            memory: 2Gi
            cpu: 1000m
      volumes:
      - name: kibana-config
        configMap:
          name: kibana-enhanced-dashboards
---
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: logging
spec:
  selector:
    app: kibana
  ports:
  - port: 5601
    targetPort: 5601
  type: ClusterIP
EOF
    
    log_success "Enhanced centralized logging stack deployed successfully"
}

# Deploy monitoring for Model Router Service specifically
deploy_model_router_monitoring() {
    log_info "Deploying specific Model Router Service monitoring..."
    
    # Create service for Model Router metrics
    cat << EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: model-router-metrics
  namespace: smm-system
  labels:
    app: model-router
    component: metrics
spec:
  selector:
    app: model-router
  ports:
  - name: http-metrics
    port: 3003
    targetPort: 3003
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: 3003
    protocol: TCP
EOF

    # Create PodMonitor for Model Router
    cat << EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: model-router-pods
  namespace: monitoring
  labels:
    app: model-router
    component: monitoring
spec:
  selector:
    matchLabels:
      app: model-router
  podMetricsEndpoints:
  - port: http
    path: /metrics
    interval: 30s
    honorLabels: true
  namespaceSelector:
    matchNames:
    - smm-system
EOF
    
    log_success "Model Router Service monitoring deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying enhanced monitoring deployment..."
    
    local max_retries=60
    local retry_count=0
    
    # Check Prometheus
    while [[ $retry_count -lt $max_retries ]]; do
        if kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus | grep -q Running; then
            log_success "Prometheus is running"
            break
        fi
        log_info "Waiting for Prometheus to be ready... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    # Check Grafana
    retry_count=0
    while [[ $retry_count -lt $max_retries ]]; do
        if kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana | grep -q Running; then
            log_success "Grafana is running"
            break
        fi
        log_info "Waiting for Grafana to be ready... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    # Check Elasticsearch
    retry_count=0
    while [[ $retry_count -lt $max_retries ]]; do
        if kubectl get pods -n logging -l app=elasticsearch | grep -q Running; then
            log_success "Elasticsearch is running"
            break
        fi
        log_info "Waiting for Elasticsearch to be ready... ($((retry_count + 1))/$max_retries)"
        sleep 10
        ((retry_count++))
    done
    
    # Check if dashboards are loaded
    log_info "Checking dashboard availability..."
    if kubectl get configmap -n monitoring | grep -q smm-model-router-dashboard; then
        log_success "Model Router dashboard is configured"
    else
        log_warning "Model Router dashboard configuration not found"
    fi
    
    # Check if ServiceMonitors are created
    if kubectl get servicemonitor -n monitoring | grep -q model-router-monitor; then
        log_success "ServiceMonitors are configured"
    else
        log_warning "ServiceMonitors configuration not found"
    fi
    
    log_success "Enhanced monitoring deployment verification completed"
}

# Main execution function
main() {
    log_info "Starting SMM Architect Enhanced Monitoring Stack deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Action: $ACTION"
    
    case $ACTION in
        "deploy")
            check_prerequisites
            deploy_prometheus_stack
            deploy_service_monitors
            deploy_alert_rules
            deploy_grafana_dashboards
            deploy_logging_stack
            deploy_model_router_monitoring
            verify_deployment
            ;;
        "verify")
            verify_deployment
            ;;
        "destroy")
            log_info "Destroying enhanced monitoring stack..."
            helm uninstall kube-prometheus-stack -n monitoring || true
            kubectl delete namespace monitoring || true
            kubectl delete namespace logging || true
            log_success "Enhanced monitoring stack destroyed"
            ;;
        *)
            log_error "Unknown action: $ACTION"
            echo "Usage: $0 [environment] [deploy|verify|destroy]"
            exit 1
            ;;
    esac
    
    log_success "SMM Architect Enhanced Monitoring Stack deployment completed successfully!"
    
    # Display access information
    echo
    echo "=== Access Information ==="
    echo "Prometheus: kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090"
    echo "Grafana: kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
    echo "Alertmanager: kubectl port-forward -n monitoring svc/kube-prometheus-stack-alertmanager 9093:9093"
    echo "Kibana: kubectl port-forward -n logging svc/kibana 5601:5601"
    echo
    echo "Grafana admin password: ${GRAFANA_ADMIN_PASSWORD:-admin123}"
    echo "Model Router Dashboard: http://localhost:3000/d/smm-model-router"
    echo "Enhanced Logging: http://localhost:5601"
}

# Handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Execute main function
main "$@"