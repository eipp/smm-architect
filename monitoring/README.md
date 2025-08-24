# Enhanced Monitoring Configuration

This directory contains the enhanced monitoring infrastructure for the SMM Architect platform, providing comprehensive observability for the Model Router Service, canary deployments, MCP workflows, and all system components.

## Overview

The enhanced monitoring configuration provides:

- **Comprehensive Metrics Collection**: Model Router Service, canary deployments, MCP workflows, and system metrics
- **Advanced Dashboards**: Real-time visualization of AI model performance, deployment status, and system health
- **Intelligent Alerting**: Proactive alerts for performance degradation, failures, and SLO violations
- **Centralized Logging**: Structured logging with correlation, filtering, and advanced analytics
- **Performance Monitoring**: SLO tracking, latency monitoring, and cost optimization insights

## Components

### 1. Prometheus Monitoring Stack

**Location**: `monitoring/prometheus/`

**Features**:
- Model Router Service metrics collection
- Canary deployment performance tracking
- MCP workflow execution monitoring
- Custom alert rules with SLO-based thresholds
- Multi-dimensional metric labeling for precise filtering

**Key Metrics**:
```
# Model Router Core Metrics
model_router_requests_total{model_id, agent_type, status}
model_router_request_duration_seconds{model_id, agent_type}
model_router_model_health_score{model_id}
model_router_routing_rule_matches_total{rule_id}

# Canary Deployment Metrics
model_router_canary_traffic_split_production{deployment_id}
model_router_canary_traffic_split_canary{deployment_id}
model_router_canary_performance_delta{deployment_id}
model_router_canary_quality_delta{deployment_id}

# Model Evaluation Metrics
model_router_evaluation_score{model_id, type}
model_router_drift_detection_score{model_id}
model_router_ab_test_significance{test_id}

# Budget and Cost Metrics
model_router_workspace_budget_utilization{workspace_id}
model_router_cost_total{model_id, workspace_id}
model_router_tokens_total{model_id}
```

### 2. Grafana Dashboards

**Location**: `monitoring/dashboards/`

**Dashboards**:

1. **Model Router Dashboard** (`model-router-dashboard.json`)
   - Service health overview
   - Request rate and latency metrics
   - Model health scores
   - Routing rule performance
   - Canary deployment status
   - Agent model usage patterns
   - Token usage and cost tracking
   - Model evaluation results
   - Workspace budget utilization

2. **Enhanced Connector Health Dashboard** (existing + enhancements)
   - Platform connection status
   - API rate limit tracking
   - Authentication status monitoring
   - Request success rates

3. **Agent Performance Dashboard** (existing + enhancements)
   - Execution times by agent type
   - Quality metrics and scoring
   - Resource utilization

### 3. ServiceMonitors and Metric Collection

**Location**: `monitoring/servicemonitors/`

**Components**:
- `enhanced-monitoring.yaml`: ServiceMonitor configurations for all enhanced components
- Model Router Service metrics endpoint (`/metrics`)
- Canary deployment metrics endpoint (`/api/canary-deployments/metrics`)
- Model evaluation metrics endpoint (`/api/evaluations/metrics`)
- MCP workflow metrics collection
- Workspace budget monitoring

### 4. Enhanced Alerting Rules

**Location**: `monitoring/prometheus/rules/enhanced-model-router-alerts.yml`

**Alert Categories**:

#### Model Router Service Alerts
- **SMM_ModelRouterDown**: Service unavailability
- **SMM_ModelRouterHighLatency**: P95 latency > 5s
- **SMM_ModelRouterHighErrorRate**: Error rate > 5%
- **SMM_ModelRouterSLOViolation**: Availability < 99.5%

#### Model Health Alerts
- **SMM_ModelHealthDegraded**: Health score < 60%
- **SMM_ModelHealthCritical**: Health score < 30%
- **SMM_ModelUnresponsive**: Model endpoint down

#### Canary Deployment Alerts
- **SMM_CanaryDeploymentFailed**: Automatic rollback triggered
- **SMM_CanaryPerformanceDegradation**: > 20% performance drop
- **SMM_CanaryQualityDrop**: > 10% quality reduction
- **SMM_CanaryTrafficImbalance**: Traffic split deviation

#### Model Evaluation Alerts
- **SMM_ModelEvaluationFailed**: Multiple evaluation failures
- **SMM_ModelDriftDetected**: Significant model drift
- **SMM_ABTestSignificantDifference**: Statistically significant results

#### Budget and Cost Alerts
- **SMM_WorkspaceBudgetCritical**: > 95% budget utilization
- **SMM_ModelCostAnomaly**: 3x higher than average costs
- **SMM_TokenUsageSpike**: 5x higher than average usage

#### MCP Integration Alerts
- **SMM_MCPWorkflowFailed**: MCP workflow execution failures
- **SMM_MCPProtocolVersionMismatch**: Protocol compatibility issues
- **SMM_MCPHealthMonitoringDown**: Health monitoring workflow down

### 5. Centralized Logging

**Location**: `monitoring/logging/`

**Features**:
- **Structured Logging**: JSON format with standardized fields
- **Log Correlation**: Trace ID propagation across services
- **Sensitive Data Masking**: Automatic PII and credential masking
- **Geographic Enrichment**: GeoIP location data for requests
- **Error Categorization**: Automatic error classification
- **Performance Indexing**: Optimized Elasticsearch mappings

**Log Sources**:
- Model Router Service logs
- Canary deployment logs
- MCP workflow execution logs
- Audit service logs
- Workspace API logs

**Log Fields**:
```json
{
  "@timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "service_name": "model-router",
  "trace_id": "trace-12345",
  "workspace_id": "workspace-123",
  "tenant_id": "tenant-456",
  "model_id": "gpt-4",
  "agent_type": "research",
  "latency_ms": 1250,
  "cost_usd": 0.025,
  "token_count": 150,
  "error_category": "timeout",
  "deployment_id": "canary-789",
  "workflow_id": "mcp-eval-101",
  "mcp_protocol_version": "mcp-2.0"
}
```

## Deployment

### Prerequisites

1. **Kubernetes Cluster**: v1.24+ with sufficient resources
2. **Storage**: Fast SSD storage class for metrics and logs
3. **Networking**: Service mesh or ingress controller for external access
4. **Secrets**: Slack webhooks, PagerDuty keys, SMTP configuration

### Environment Variables

```bash
# Required
export GRAFANA_ADMIN_PASSWORD="secure-password"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
export SLACK_ML_WEBHOOK_URL="https://hooks.slack.com/services/ML/TEAM/WEBHOOK"
export PAGERDUTY_SERVICE_KEY="your-pagerduty-integration-key"

# Optional
export SMTP_HOST="smtp.company.com:587"
export ELASTICSEARCH_RETENTION_DAYS="30"
export PROMETHEUS_RETENTION_DAYS="30"
```

### Quick Deployment

```bash
# Deploy complete enhanced monitoring stack
./scripts/deploy-enhanced-monitoring.sh production deploy

# Verify deployment
./scripts/deploy-enhanced-monitoring.sh production verify

# Access services
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
kubectl port-forward -n logging svc/kibana 5601:5601
```

### Manual Deployment Steps

1. **Deploy Prometheus Stack**:
   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
     --namespace monitoring --values monitoring/prometheus/values.yaml
   ```

2. **Deploy ServiceMonitors**:
   ```bash
   kubectl apply -f monitoring/servicemonitors/enhanced-monitoring.yaml
   ```

3. **Deploy Alert Rules**:
   ```bash
   kubectl create configmap enhanced-model-router-rules \
     --from-file=monitoring/prometheus/rules/enhanced-model-router-alerts.yml \
     --namespace=monitoring
   kubectl label configmap enhanced-model-router-rules prometheus=kube-prometheus role=alert-rules
   ```

4. **Deploy Dashboards**:
   ```bash
   kubectl create configmap smm-model-router-dashboard \
     --from-file=monitoring/dashboards/model-router-dashboard.json \
     --namespace=monitoring
   kubectl label configmap smm-model-router-dashboard grafana_dashboard=1
   ```

5. **Deploy Logging Stack**:
   ```bash
   kubectl apply -f monitoring/logging/enhanced-logging-config.yaml
   ```

## Dashboard Access

### Grafana Dashboards

- **URL**: `http://localhost:3000` (after port-forward)
- **Username**: `admin`
- **Password**: `${GRAFANA_ADMIN_PASSWORD}`

**Key Dashboards**:
1. **SMM Model Router**: Real-time model performance and routing analytics
2. **SMM Connector Health**: Platform integration status and health
3. **SMM Agent Performance**: AI agent execution metrics and quality scores

### Kibana Logs

- **URL**: `http://localhost:5601` (after port-forward)
- **Index Pattern**: `smm-logs-*`

**Pre-configured Dashboards**:
1. **Model Router Log Analysis**: Request tracing and error analysis
2. **Canary Deployment Logs**: Deployment lifecycle and decision tracking
3. **MCP Workflow Logs**: Protocol execution and agent communication

## Alerting Configuration

### Alert Routing

```yaml
# Critical alerts → PagerDuty + Slack #smm-critical
severity: critical

# ML team alerts → Slack #ml-alerts
service: model-router|canary|evaluation

# Budget alerts → Slack #finance + email
team: finance

# Default → Slack #smm-alerts
```

### Notification Channels

1. **Slack Integration**:
   - `#smm-alerts`: General platform alerts
   - `#smm-critical`: Critical system failures
   - `#ml-alerts`: Model and ML-specific alerts
   - `#finance`: Budget and cost alerts

2. **PagerDuty Integration**:
   - Critical alerts with automatic escalation
   - Service-specific incident routing

3. **Email Notifications**:
   - Budget threshold alerts
   - Weekly performance summaries

## Performance and Scaling

### Resource Requirements

```yaml
# Prometheus
resources:
  requests:
    memory: 4Gi
    cpu: 2000m
  limits:
    memory: 8Gi
    cpu: 4000m
storage: 100Gi

# Grafana
resources:
  requests:
    memory: 1Gi
    cpu: 500m
  limits:
    memory: 2Gi
    cpu: 1000m

# Elasticsearch (per node)
resources:
  requests:
    memory: 4Gi
    cpu: 1000m
  limits:
    memory: 4Gi
    cpu: 2000m
storage: 100Gi
```

### Retention Policies

- **Metrics**: 30 days (configurable)
- **Logs**: 30 days (configurable with lifecycle policies)
- **Dashboards**: Persistent
- **Alerts**: 7 days history

## Troubleshooting

### Common Issues

1. **High Memory Usage**:
   ```bash
   # Check Prometheus memory usage
   kubectl top pods -n monitoring
   # Adjust retention period
   kubectl edit prometheusspec -n monitoring
   ```

2. **Missing Metrics**:
   ```bash
   # Check ServiceMonitor status
   kubectl get servicemonitor -n monitoring
   # Verify target discovery
   kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
   # Visit http://localhost:9090/targets
   ```

3. **Dashboard Not Loading**:
   ```bash
   # Check ConfigMap labels
   kubectl get configmap -n monitoring --show-labels
   # Restart Grafana
   kubectl rollout restart deployment/kube-prometheus-stack-grafana -n monitoring
   ```

4. **Log Pipeline Issues**:
   ```bash
   # Check Fluentd status
   kubectl logs daemonset/fluentd-enhanced -n logging
   # Verify Elasticsearch health
   kubectl port-forward -n logging svc/elasticsearch 9200:9200
   curl http://localhost:9200/_cluster/health
   ```

### Debug Commands

```bash
# Prometheus configuration
kubectl get prometheus -o yaml

# Alert rules validation
kubectl get prometheusrules -n monitoring

# ServiceMonitor discovery
kubectl describe servicemonitor model-router-monitor -n monitoring

# Log shipping status
kubectl logs -f daemonset/fluentd-enhanced -n logging

# Dashboard provisioning
kubectl logs deployment/kube-prometheus-stack-grafana -n monitoring
```

## Integration with Model Router Service

The enhanced monitoring is tightly integrated with the Model Router Service:

1. **Metrics Export**: Service exposes Prometheus metrics at `/metrics`
2. **Health Endpoints**: Deep health checks at `/health/detailed`
3. **Analytics API**: Performance data via `/api/analytics/*`
4. **Canary Metrics**: Real-time deployment metrics via `/api/canary-deployments/metrics`
5. **Evaluation Metrics**: Model evaluation results via `/api/evaluations/metrics`

## Security Considerations

1. **Network Policies**: Restrict access to monitoring namespaces
2. **RBAC**: Least-privilege service accounts
3. **TLS Encryption**: All metric collection over TLS
4. **Data Masking**: Automatic PII redaction in logs
5. **Audit Logging**: Complete monitoring access audit trail

## Maintenance

### Regular Tasks

- **Weekly**: Review alert noise and tune thresholds
- **Monthly**: Analyze cost trends and optimize retention
- **Quarterly**: Update dashboards based on new requirements
- **Annually**: Review and update alerting runbooks

### Backup and Recovery

```bash
# Backup Grafana dashboards
kubectl get configmap -n monitoring -l grafana_dashboard=1 -o yaml > dashboards-backup.yaml

# Backup alert rules
kubectl get prometheusrules -n monitoring -o yaml > alerts-backup.yaml

# Backup logging configuration
kubectl get configmap -n logging -o yaml > logging-backup.yaml
```

This enhanced monitoring configuration provides comprehensive observability for the SMM Architect platform with particular focus on AI model performance, deployment safety, and operational excellence.