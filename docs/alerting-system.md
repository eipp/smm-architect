# SMM Architect Alerting System

## Overview

The SMM Architect alerting system provides comprehensive monitoring and notification capabilities for the autonomous marketing platform. It uses Prometheus for metrics collection and alerting rules, combined with Alertmanager for notification routing and delivery.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SMM Services  │───▶│   Prometheus    │───▶│  Alertmanager   │
│                 │    │   (Metrics &    │    │  (Routing &     │
│ • Agents        │    │    Alerting)    │    │   Delivery)     │
│ • Connectors    │    │                 │    │                 │
│ • ToolHub       │    └─────────────────┘    └─────────────────┘
│ • Simulation    │                                      │
└─────────────────┘                                      ▼
                                               ┌─────────────────┐
                                               │  Notifications  │
                                               │                 │
                                               │ • Slack         │
                                               │ • Email         │
                                               │ • PagerDuty     │
                                               │ • Teams         │
                                               └─────────────────┘
```

## Alert Categories

### 🔌 Connector Alerts
- **SMM_ConnectorDown**: Connector completely unavailable
- **SMM_ConnectorHighErrorRate**: Error rate > 5% over 5 minutes
- **SMM_ConnectorHighLatency**: P95 latency > 5 seconds
- **SMM_ConnectorRateLimited**: Hitting platform rate limits
- **SMM_ConnectorTokenExpiry**: Authentication tokens expiring soon

### 💰 Budget Alerts
- **SMM_BudgetThresholdExceeded**: 80% budget utilization reached
- **SMM_BudgetCriticalOverspend**: 95% budget utilization (critical)
- **SMM_BudgetBurnRateHigh**: Daily burn rate exceeds weekly allocation
- **SMM_BudgetExhaustionPredicted**: Budget will be exhausted < 3 days

### 🤖 Agent Alerts
- **SMM_AgentHighFailureRate**: Failure rate > 10% over 10 minutes
- **SMM_AgentHighLatency**: P95 execution time > 60 seconds
- **SMM_AgentQueueBacklog**: Queue depth > 100 jobs
- **SMM_AgentMemoryLeak**: Memory usage increased > 1GB/hour

### 🎲 Simulation Alerts
- **SMM_SimulationHighFailureRate**: Failure rate > 5% over 1 hour
- **SMM_SimulationHighLatency**: P95 duration > 30 seconds
- **SMM_SimulationResourceExhaustion**: > 50 concurrent simulations

### 🚀 Canary Alerts
- **SMM_CanaryDeploymentFailure**: Canary deployment failed
- **SMM_CanaryTrafficAnomalies**: Traffic split deviation > 5%
- **SMM_CanaryModelDrift**: Model drift score > 0.3
- **SMM_CanaryQualityDegradation**: Quality score < 0.8

### 🏗️ Infrastructure Alerts
- **SMM_DatabaseConnectionFailure**: Database connectivity issues
- **SMM_RedisConnectionFailure**: Cache connectivity issues
- **SMM_DiskSpaceWarning**: Disk usage > 85%
- **SMM_HighMemoryUsage**: Memory usage > 90%

### 🔒 Security Alerts
- **SMM_UnauthorizedAPIAccess**: > 20 401 errors in 5 minutes
- **SMM_SuspiciousUserActivity**: > 100 requests/minute per user
- **SMM_VaultConnectionFailure**: Secrets management system down

### 📊 Business Alerts
- **SMM_PublishingSuccessRateDropped**: 24-hour success rate < 95%
- **SMM_WorkspaceActivityDrop**: < 100 active workspaces/day
- **SMM_LicenseExpiration**: License expires < 30 days

## Notification Routing

### Severity Levels

#### 🚨 Critical (Immediate Response)
- **Recipients**: PagerDuty + Slack + Email
- **Response Time**: < 10 minutes
- **Escalation**: Auto-escalate after 30 minutes
- **Examples**: System down, security breach, critical budget overspend

#### ⚠️ Warning (Business Hours Response)
- **Recipients**: Slack + Email
- **Response Time**: < 2 hours during business hours
- **Escalation**: Manual escalation if needed
- **Examples**: High error rates, approaching thresholds

### Team Routing

```yaml
Critical Alerts:
  ├── Database Issues → Database Team + Platform Team
  ├── Security Issues → Security Team + CISO
  ├── Canary Failures → Platform Team + ML Team
  └── Budget Issues → Finance Team + Platform Team

Warning Alerts:
  ├── Agent Issues → Platform Team + Agent Team
  ├── Connector Issues → Platform Team + Connector Team
  ├── ML Issues → ML Team
  └── Business Metrics → Business Team
```

## Setup Instructions

### Prerequisites

1. **Required Tools**:
   ```bash
   # Install required tools
   curl -LO https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
   curl -LO https://github.com/prometheus/alertmanager/releases/download/v0.25.0/alertmanager-0.25.0.linux-amd64.tar.gz
   
   # Install promtool and amtool
   sudo cp prometheus-*/promtool /usr/local/bin/
   sudo cp alertmanager-*/amtool /usr/local/bin/
   ```

2. **Environment Variables**:
   ```bash
   export PROMETHEUS_NAMESPACE="monitoring"
   export ALERTMANAGER_NAMESPACE="monitoring"
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
   export PAGERDUTY_INTEGRATION_KEY="your-pagerduty-integration-key"
   export SMTP_PASSWORD="your-smtp-password"
   ```

### Deployment

1. **Validate Configuration**:
   ```bash
   ./scripts/deploy-alerting.sh staging --validate-only
   ```

2. **Deploy to Staging**:
   ```bash
   ./scripts/deploy-alerting.sh staging
   ```

3. **Deploy to Production**:
   ```bash
   ./scripts/deploy-alerting.sh production
   ```

### Manual Deployment

If you need to deploy manually:

```bash
# Deploy Prometheus rules
kubectl create configmap smm-prometheus-rules \
  --from-file=monitoring/prometheus/rules/smm-alerts.yml \
  --namespace=monitoring

# Deploy Alertmanager config
kubectl create secret generic smm-alertmanager-config \
  --from-file=alertmanager.yml=monitoring/alertmanager/alertmanager.yml \
  --namespace=monitoring

# Restart services
kubectl rollout restart deployment/prometheus-server -n monitoring
kubectl rollout restart deployment/alertmanager -n monitoring
```

## Configuration

### Adding New Alerts

1. **Define the Alert Rule** in `monitoring/prometheus/rules/smm-alerts.yml`:
   ```yaml
   - alert: SMM_YourNewAlert
     expr: your_metric > threshold
     for: 5m
     labels:
       severity: warning
       team: platform
       service: your-service
     annotations:
       summary: "Brief description"
       description: "Detailed description with context"
       runbook_url: "https://wiki.smm-architect.com/runbooks/your-alert"
       dashboard_url: "https://grafana.smm-architect.com/d/your-dashboard"
   ```

2. **Configure Routing** in `monitoring/alertmanager/alertmanager.yml`:
   ```yaml
   # Add route under appropriate team section
   - match:
       service: your-service
     receiver: 'your-team'
   ```

3. **Add Test Case** in `tests/monitoring/alerting-system.test.ts`:
   ```typescript
   {
     name: 'Your New Alert Test',
     rule: { /* alert rule definition */ },
     mockMetrics: { 'your_metric': threshold_value },
     expectedAlert: true,
     expectedSeverity: 'warning'
   }
   ```

### Notification Channels

#### Slack Configuration
```yaml
slack_configs:
  - channel: '#your-channel'
    username: 'SMM Monitor'
    icon_emoji: ':warning:'
    title: 'Alert Title'
    text: 'Alert description with context'
    color: 'danger'  # danger, warning, good
```

#### Email Configuration
```yaml
email_configs:
  - to: 'team@smm-architect.com'
    subject: 'Alert Subject'
    body: 'Plain text alert body'
    html: '<html>HTML alert body</html>'
```

#### PagerDuty Configuration
```yaml
pagerduty_configs:
  - routing_key: 'your-integration-key'
    description: 'Alert description'
    severity: 'critical'
    details:
      service: '{{ .CommonLabels.service }}'
      environment: '{{ .CommonLabels.environment }}'
```

## Monitoring and Maintenance

### Health Checks

1. **Prometheus Rules Status**:
   ```bash
   curl http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name | startswith("smm_"))'
   ```

2. **Alertmanager Status**:
   ```bash
   curl http://alertmanager:9093/api/v1/status
   ```

3. **Active Alerts**:
   ```bash
   curl http://alertmanager:9093/api/v1/alerts
   ```

### Regular Maintenance

1. **Weekly Tasks**:
   - Review alert frequency and tune thresholds
   - Check for new false positives
   - Verify notification delivery

2. **Monthly Tasks**:
   - Review and update runbooks
   - Test emergency escalation procedures
   - Audit alert rule coverage

3. **Quarterly Tasks**:
   - Review team routing configurations
   - Update notification channels
   - Performance optimization

## Troubleshooting

### Common Issues

#### Alerts Not Firing
```bash
# Check if rule is loaded
promtool query instant 'your_alert_expression'

# Check rule evaluation
curl http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name=="your_group") | .rules[] | select(.name=="your_alert")'

# Verify metric availability
curl http://prometheus:9090/api/v1/query?query=your_metric
```

#### Notifications Not Delivered
```bash
# Check Alertmanager logs
kubectl logs deployment/alertmanager -n monitoring

# Test notification channels
amtool alert add alertname=test service=test severity=warning

# Verify routing configuration
amtool config routes test --config.file=alertmanager.yml
```

#### High Alert Volume
```bash
# Identify noisy alerts
curl http://alertmanager:9093/api/v1/alerts | jq '[.data[] | .labels.alertname] | group_by(.) | map({alert: .[0], count: length}) | sort_by(.count) | reverse'

# Review inhibition rules
amtool config show --config.file=alertmanager.yml | grep -A 10 inhibit_rules
```

### Log Analysis

```bash
# Prometheus logs
kubectl logs deployment/prometheus-server -n monitoring | grep -i alert

# Alertmanager logs
kubectl logs deployment/alertmanager -n monitoring | grep -i notification

# SMM service logs with alert context
kubectl logs deployment/smm-service -n smm | grep -i "metric\|alert"
```

## Testing

### Unit Tests
```bash
# Run alerting system tests
npm test tests/monitoring/alerting-system.test.ts

# Test specific alert rules
npm test -- --testNamePattern="Connector Down Alert"
```

### Integration Tests
```bash
# Test with live Prometheus
PROMETHEUS_URL=http://localhost:9090 npm test tests/monitoring/alerting-system.test.ts

# Test notification delivery
amtool alert add alertname=SMM_TestAlert severity=warning service=test team=platform
```

### Load Testing
```bash
# Generate test alerts
for i in {1..100}; do
  amtool alert add alertname=SMM_LoadTest$i severity=warning service=test
done

# Monitor Alertmanager performance
curl http://alertmanager:9093/metrics | grep alertmanager_
```

## Best Practices

### Alert Design
1. **Be Specific**: Alert names should clearly indicate the problem
2. **Provide Context**: Include relevant labels and detailed descriptions
3. **Add Runbooks**: Every critical alert should have a runbook URL
4. **Set Appropriate Thresholds**: Avoid false positives while catching real issues

### Notification Management
1. **Right Audience**: Route alerts to teams that can take action
2. **Appropriate Urgency**: Match severity to business impact
3. **Avoid Spam**: Use inhibition rules to prevent alert storms
4. **Test Regularly**: Verify notification channels work

### Maintenance
1. **Regular Reviews**: Tune thresholds based on historical data
2. **Documentation**: Keep runbooks up to date
3. **Automation**: Use deployment scripts for consistency
4. **Monitoring**: Monitor the monitoring system itself

## Metrics and SLOs

### Alerting System SLOs
- **Alert Processing Latency**: P95 < 30 seconds
- **Notification Delivery**: 99.5% success rate
- **False Positive Rate**: < 5% of total alerts
- **Mean Time to Acknowledge**: < 10 minutes for critical alerts

### Key Metrics
```promql
# Alert processing latency
histogram_quantile(0.95, rate(prometheus_rule_evaluation_duration_seconds_bucket[5m]))

# Notification success rate
rate(alertmanager_notifications_total{state="success"}[5m]) / rate(alertmanager_notifications_total[5m])

# Active alerts by severity
count by (severity) (ALERTS{alertstate="firing"})

# Alert frequency
rate(prometheus_notifications_total[1h])
```

## Security Considerations

1. **Access Control**: Limit who can modify alert rules and configurations
2. **Secrets Management**: Store sensitive tokens securely
3. **Network Security**: Encrypt communications between components
4. **Audit Logging**: Track changes to alerting configurations
5. **Incident Response**: Have procedures for security-related alerts

## Support and Escalation

### Contact Information
- **Platform Team**: platform-team@smm-architect.com
- **On-Call Engineer**: oncall@smm-architect.com (PagerDuty)
- **Security Team**: security-team@smm-architect.com
- **Manager Escalation**: engineering-manager@smm-architect.com

### Emergency Procedures
1. **Critical System Down**: Page on-call immediately
2. **Security Incident**: Contact security team within 15 minutes
3. **Data Breach**: Notify CISO and legal team immediately
4. **Customer Impact**: Engage customer success team

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Maintained By**: SMM Architect Platform Team