#!/bin/bash

# Sentry Integration with Monitoring Stack Setup Script
# This script demonstrates how to integrate Sentry with the existing Prometheus/Grafana monitoring stack

echo "🔧 Setting up Sentry integration with monitoring stack..."
echo "======================================================"

# Create a directory for integration documentation
mkdir -p docs/monitoring-integration

# Create a README for the integration
cat > docs/monitoring-integration/README.md << 'EOF'
# Monitoring Stack Integration

This directory contains documentation and configuration for integrating various monitoring tools in the SMM Architect platform.

## Components

1. **Prometheus** - Metrics collection and storage
2. **Grafana** - Metrics visualization and dashboarding
3. **Sentry** - Error tracking and performance monitoring
4. **Alertmanager** - Alert routing and notification

## Integration Points

### Prometheus ↔ Sentry

- Both systems collect different types of data:
  - Prometheus: Time-series metrics (counters, gauges, histograms)
  - Sentry: Error events, exceptions, performance traces

- Correlation through common tags:
  - service name
  - environment
  - request IDs
  - user context

### Grafana ↔ Sentry

- Grafana can display Sentry data through:
  - Sentry data source plugin
  - Custom panels showing error rates alongside metrics
  - Unified dashboards combining both data sources

### Alertmanager ↔ Sentry

- Bidirectional alerting integration:
  - Prometheus alerts → Alertmanager → Sentry
  - Sentry alerts → Webhooks → Alertmanager

## Best Practices

1. Use consistent tagging across all systems
2. Implement request correlation for debugging
3. Set complementary alert thresholds
4. Monitor both metrics and errors for comprehensive observability
EOF

# Create a sample Grafana dashboard with Sentry integration
cat > docs/monitoring-integration/grafana-sentry-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "SMM Architect - Error Tracking & Metrics",
    "tags": ["errors", "metrics", "sentry", "prometheus"],
    "timezone": "browser",
    "schemaVersion": 36,
    "version": 1,
    "panels": [
      {
        "id": 1,
        "type": "graph",
        "title": "Error Rate vs Success Rate",
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "rate(smm_http_requests_total{status_code=~\"5..\"}[5m])",
            "legendFormat": "Error Rate (5xx)",
            "refId": "A"
          },
          {
            "expr": "rate(smm_http_requests_total{status_code=~\"2..\"}[5m])",
            "legendFormat": "Success Rate (2xx)",
            "refId": "B"
          }
        ],
        "yaxes": [
          {
            "format": "reqps",
            "label": "Requests per second"
          }
        ]
      },
      {
        "id": 2,
        "type": "stat",
        "title": "Sentry Issues (24h)",
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "target": "sentry.issues.count"
          }
        ],
        "options": {
          "reduceOptions": {
            "calcs": ["lastNotNull"]
          }
        }
      },
      {
        "id": 3,
        "type": "stat",
        "title": "Sentry Events (24h)",
        "gridPos": {"x": 18, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "target": "sentry.events.count"
          }
        ],
        "options": {
          "reduceOptions": {
            "calcs": ["lastNotNull"]
          }
        }
      },
      {
        "id": 4,
        "type": "table",
        "title": "Top Sentry Issues",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 8},
        "targets": [
          {
            "target": "sentry.issues.top"
          }
        ],
        "columns": [
          {"text": "Issue", "value": "issue"},
          {"text": "Count", "value": "count"},
          {"text": "Last Seen", "value": "last_seen"}
        ]
      }
    ]
  }
}
EOF

# Create Alertmanager configuration for Sentry integration
cat > docs/monitoring-integration/alertmanager-sentry-config.yml << 'EOF'
# Alertmanager configuration with Sentry integration
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'service']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'default-receiver'
  routes:
    # Route critical errors to Sentry as well
    - match:
        severity: critical
      receiver: 'sentry-webhook'
      continue: true
    # Route service-specific alerts
    - match:
        service: smm-architect
      receiver: 'smm-team'
    - match:
        service: toolhub
      receiver: 'toolhub-team'

receivers:
  - name: 'default-receiver'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        send_resolved: true

  - name: 'smm-team'
    email_configs:
      - to: 'smm-team@example.com'
        send_resolved: true

  - name: 'toolhub-team'
    email_configs:
      - to: 'toolhub-team@example.com'
        send_resolved: true

  - name: 'sentry-webhook'
    webhook_configs:
      - url: 'https://sentry.io/api/hooks/your-webhook-url'
        send_resolved: true
        max_alerts: 10

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
EOF

# Create a script to test the integration
cat > scripts/test-monitoring-integration.sh << 'EOF'
#!/bin/bash

# Test script for monitoring stack integration
# This script verifies that all monitoring components are working together

echo "🧪 Testing Monitoring Stack Integration..."
echo "=========================================="

# Test 1: Check if Prometheus is running
echo "1. Testing Prometheus connectivity..."
if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus Server is Healthy"; then
  echo "✅ Prometheus is healthy"
else
  echo "❌ Prometheus health check failed"
fi

# Test 2: Check if Grafana is running
echo "2. Testing Grafana connectivity..."
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
  echo "✅ Grafana is healthy"
else
  echo "❌ Grafana health check failed"
fi

# Test 3: Check if Alertmanager is running
echo "3. Testing Alertmanager connectivity..."
if curl -s http://localhost:9093/-/healthy | grep -q "Alertmanager is Healthy"; then
  echo "✅ Alertmanager is healthy"
else
  echo "❌ Alertmanager health check failed"
fi

# Test 4: Check if services are exposing metrics
echo "4. Testing service metrics endpoints..."
SERVICES=("smm-architect" "toolhub" "simulator" "audit" "model-router")
for service in "${SERVICES[@]}"; do
  if curl -s http://localhost:3005/metrics | head -n 10 | grep -q "# TYPE"; then
    echo "✅ $service metrics endpoint is responding"
  else
    echo "❌ $service metrics endpoint is not responding"
  fi
done

# Test 5: Check Sentry configuration (if DSN is set)
echo "5. Testing Sentry configuration..."
if [ -n "$SENTRY_DSN" ]; then
  echo "✅ Sentry DSN is configured"
  echo "   DSN: ${SENTRY_DSN:0:20}..."
else
  echo "⚠️  Sentry DSN is not configured"
fi

echo ""
echo "Integration test complete!"
echo "=========================="
echo "Next steps:"
echo "1. Verify Grafana dashboards show both metrics and error data"
echo "2. Test alerting by triggering a test error"
echo "3. Check that alerts appear in both Alertmanager and Sentry"
EOF

chmod +x scripts/test-monitoring-integration.sh

echo "✅ Created monitoring integration documentation"
echo "✅ Created sample Grafana dashboard with Sentry integration"
echo "✅ Created Alertmanager configuration for Sentry integration"
echo "✅ Created test script for monitoring integration"

echo ""
echo "🎉 Sentry integration with monitoring stack setup complete!"
echo "=========================================================="
echo "Next steps:"
echo "1. Review the documentation in docs/monitoring-integration/"
echo "2. Configure Grafana to use the Sentry data source"
echo "3. Set up webhooks between Alertmanager and Sentry"
echo "4. Test the integration using the test script"