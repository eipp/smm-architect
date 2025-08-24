# SMM Architect Centralized Logging System

## Overview

The SMM Architect centralized logging system provides unified log collection, correlation, and analysis across all platform services. It enables comprehensive observability, troubleshooting, and compliance monitoring for the autonomous marketing platform.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SMM Services  │───▶│    Fluentd      │───▶│ Elasticsearch   │
│                 │    │  (Collection &  │    │   (Storage &    │
│ • API Gateway   │    │   Processing)   │    │    Search)      │
│ • Agents        │    │                 │    │                 │
│ • Connectors    │    └─────────────────┘    └─────────────────┘
│ • Simulation    │                                      │
│ • n8n Workflows │                                      ▼
└─────────────────┘                           ┌─────────────────┐
                                               │     Kibana      │
                                               │  (Visualization │
                                               │   & Analysis)   │
                                               └─────────────────┘
```

## Key Features

### 🔗 **Log Correlation**
- Request ID tracking across service boundaries
- Trace ID for distributed tracing
- Workspace and user context propagation
- Correlation ID for related operations

### 📊 **Structured Logging**
- JSON format for all log entries
- Standardized fields across services
- Domain-specific log types (audit, security, performance)
- Automatic field extraction and enrichment

### 🚨 **Real-time Alerting**
- Critical error notifications to Slack
- Security event alerting
- Performance anomaly detection
- Automatic escalation for high-severity events

### 📈 **Performance Monitoring**
- Response time tracking
- Error rate monitoring
- Resource utilization metrics
- Business KPI logging

## Log Types and Structure

### Standard Log Fields

All logs contain these standard fields:

```json
{
  "@timestamp": "2024-12-15T10:30:45.123Z",
  "level": "info|warn|error|debug",
  "service": "service-name",
  "environment": "production|staging|development",
  "message": "Human-readable message",
  "requestId": "uuid-v4",
  "workspaceId": "workspace-identifier",
  "userId": "user-identifier",
  "traceId": "distributed-trace-id",
  "spanId": "trace-span-id",
  "correlationId": "operation-correlation-id"
}
```

### Domain-Specific Log Types

#### 🔍 **Audit Logs**
```json
{
  "event_type": "audit",
  "action": "workspace_created",
  "resource": "workspace",
  "result": "success|failure",
  "ip_address": "192.168.1.100",
  "user_agent": "SMM-Client/1.0",
  "details": {
    "workspace_name": "Customer Campaign",
    "created_by": "user-123"
  }
}
```

#### 🛡️ **Security Events**
```json
{
  "event_type": "security",
  "security_event_type": "failed_login_attempt",
  "severity": "low|medium|high|critical",
  "risk_score": 75,
  "detection_method": "application",
  "blocked": true,
  "details": {
    "attempted_username": "admin",
    "failure_count": 5
  }
}
```

#### ⚡ **Performance Metrics**
```json
{
  "event_type": "performance",
  "operation": "database_query",
  "duration_ms": 150,
  "success": true,
  "details": {
    "query_type": "SELECT",
    "table": "workspaces",
    "rows_returned": 25
  }
}
```

#### 🤖 **Agent Execution**
```json
{
  "event_type": "agent_execution",
  "agent_type": "research|creative|legal|analytics|coordinator|brand",
  "status": "started|completed|failed",
  "details": {
    "query": "AI trends in marketing",
    "sources_found": 15,
    "processing_time": 3500
  }
}
```

#### 🔗 **Connector Calls**
```json
{
  "event_type": "connector_call",
  "platform": "linkedin|twitter|facebook|instagram",
  "endpoint": "/v2/shares",
  "response_time": 250,
  "status_code": 200,
  "details": {
    "rate_limit_remaining": 45,
    "content_type": "application/json"
  }
}
```

#### 🎲 **Simulation Events**
```json
{
  "event_type": "simulation",
  "simulation_id": "sim-abc123",
  "iteration": 500,
  "event": "iteration_completed",
  "details": {
    "readiness_score": 0.85,
    "policy_violations": 2,
    "estimated_cost": 12.50
  }
}
```

#### 🔄 **Workflow Events**
```json
{
  "event_type": "workflow",
  "workflow_id": "wf-xyz789",
  "execution_id": "exec-def456",
  "node_type": "research-agent",
  "workflow_status": "running|completed|failed",
  "details": {
    "node_duration": 2300,
    "output_size": 1024
  }
}
```

## Setup and Deployment

### Prerequisites

1. **Kubernetes Cluster**: Version 1.20+
2. **Storage**: 50GB+ persistent storage for Elasticsearch
3. **Resources**: 4GB RAM, 2 CPU cores minimum
4. **Network**: LoadBalancer or Ingress controller for Kibana access

### Installation Steps

1. **Deploy the Logging Stack**:
   ```bash
   kubectl apply -f monitoring/logging/logging-stack.yaml
   kubectl apply -f monitoring/fluentd/fluentd-config.yaml
   kubectl apply -f monitoring/elasticsearch/elasticsearch-config.yaml
   ```

2. **Configure Secrets**:
   ```bash
   # Update Slack webhook URLs
   kubectl create secret generic logging-secrets \
     --from-literal=slack-webhook-critical="https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK" \
     --from-literal=slack-webhook-security="https://hooks.slack.com/services/YOUR/SECURITY/WEBHOOK" \
     -n logging
   ```

3. **Verify Deployment**:
   ```bash
   kubectl get pods -n logging
   kubectl logs -f daemonset/fluentd -n logging
   ```

4. **Setup Index Templates**:
   ```bash
   # Apply Elasticsearch index templates
   kubectl exec -it deployment/elasticsearch -n logging -- \
     curl -X PUT "localhost:9200/_index_template/smm-logs-template" \
     -H "Content-Type: application/json" \
     -d @/path/to/smm-logs-template.json
   ```

### Service Integration

#### Express.js Services

```typescript
import { createSMMLogger, requestLoggingMiddleware, errorLoggingHandler } from './utils/logging';

const app = express();
const logger = createSMMLogger('api-service');

// Add request logging middleware
app.use(requestLoggingMiddleware('api-service'));

// Your routes here
app.get('/workspaces', (req, res) => {
  req.logger.info('Fetching workspaces', { userId: req.user.id });
  // ... business logic
});

// Add error logging middleware
app.use(errorLoggingHandler('api-service'));
```

#### Agent Services

```typescript
import { createSMMLogger } from './utils/logging';

class ResearchAgent {
  private logger = createSMMLogger('research-agent');

  async executeQuery(query: string, context: any) {
    const requestLogger = this.logger.child({
      requestId: context.requestId,
      workspaceId: context.workspaceId,
      userId: context.userId
    });

    requestLogger.agentExecution('research', 'started', { query });

    try {
      const results = await this.performResearch(query);
      
      requestLogger.agentExecution('research', 'completed', {
        query,
        sources_found: results.sources.length,
        processing_time: results.duration
      });

      return results;
    } catch (error) {
      requestLogger.error('Research agent failed', error, { query });
      requestLogger.agentExecution('research', 'failed', { query, error: error.message });
      throw error;
    }
  }
}
```

## Log Correlation and Tracing

### Request Flow Tracking

Each request through the SMM Architect platform maintains correlation through:

1. **Request ID**: Unique identifier for each incoming request
2. **Trace ID**: Distributed tracing across all services
3. **Span ID**: Individual service operations within a trace
4. **Correlation ID**: Related operations (e.g., simulation iterations)

### Correlation Example

```typescript
// API Gateway
const logger = createSMMLogger('api-gateway', {
  requestId: 'req-abc123',
  traceId: 'trace-xyz789',
  spanId: 'span-gateway-001'
});

// Workspace Service
const workspaceLogger = createSMMLogger('workspace-service', {
  requestId: 'req-abc123',
  traceId: 'trace-xyz789',
  spanId: 'span-workspace-001'
});

// Agent Orchestrator
const agentLogger = createSMMLogger('agent-orchestrator', {
  requestId: 'req-abc123',
  traceId: 'trace-xyz789',
  spanId: 'span-agent-001'
});
```

### Querying Correlated Logs

#### Elasticsearch Query
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "traceId": "trace-xyz789" } }
      ]
    }
  },
  "sort": [{ "@timestamp": { "order": "asc" } }]
}
```

#### Kibana Discovery
1. Navigate to Discover
2. Add filter: `traceId: "trace-xyz789"`
3. Sort by `@timestamp` ascending
4. View complete request flow

## Index Management

### Index Lifecycle Policies

#### General Logs (smm-logs-*)
- **Hot Phase**: 1 day, 5GB max
- **Warm Phase**: 7 days, read-only
- **Cold Phase**: 30 days, minimal resources
- **Delete**: After 30 days

#### Audit Logs (smm-audit-logs-*)
- **Hot Phase**: 1 day, 2GB max
- **Warm Phase**: 7 days
- **Cold Phase**: 90 days
- **Delete**: After 7 years (compliance)

#### Security Events (smm-security-events-*)
- **Hot Phase**: 1 day, 1GB max
- **Warm Phase**: 30 days
- **Cold Phase**: 365 days
- **Delete**: After 7 years (compliance)

### Manual Index Management

```bash
# Check index status
curl -X GET "elasticsearch:9200/_cat/indices/smm-*?v"

# Force rollover
curl -X POST "elasticsearch:9200/smm-logs/_rollover"

# Delete old indices
curl -X DELETE "elasticsearch:9200/smm-logs-2024.01.*"
```

## Monitoring and Alerting

### Key Metrics to Monitor

#### Log Volume
- Logs per second by service
- Error rate by service
- Critical error frequency

#### Performance
- Log processing latency
- Elasticsearch query response time
- Fluentd buffer utilization

#### Storage
- Index size growth
- Disk space utilization
- Elasticsearch cluster health

### Kibana Dashboards

#### SMM Overview Dashboard
- Total log volume
- Error rate trends
- Service health summary
- Top error messages

#### Request Tracing Dashboard
- Request flow visualization
- Service response times
- Error correlation analysis

#### Security Dashboard
- Security events timeline
- Risk score trends
- Failed authentication attempts
- Suspicious activity patterns

#### Performance Dashboard
- Service response times
- Database query performance
- Connector API latencies
- Agent execution times

## Troubleshooting

### Common Issues

#### 🔴 **Logs Not Appearing in Elasticsearch**

**Symptoms**: Fluentd running but no logs in Elasticsearch

**Diagnosis**:
```bash
# Check Fluentd logs
kubectl logs -f daemonset/fluentd -n logging

# Check Elasticsearch connectivity
kubectl exec -it deployment/elasticsearch -n logging -- \
  curl -X GET "localhost:9200/_cluster/health"

# Check Fluentd buffer status
kubectl exec -it fluentd-pod -n logging -- \
  ls -la /var/log/fluentd-buffers/
```

**Solutions**:
- Verify Elasticsearch service is accessible
- Check Fluentd configuration syntax
- Ensure proper RBAC permissions
- Monitor buffer disk space

#### 🟡 **High Memory Usage in Fluentd**

**Symptoms**: Fluentd pods getting OOMKilled

**Diagnosis**:
```bash
# Check memory usage
kubectl top pods -n logging

# Check buffer sizes
kubectl exec -it fluentd-pod -n logging -- \
  du -sh /var/log/fluentd-buffers/*
```

**Solutions**:
- Increase memory limits
- Reduce buffer sizes
- Implement log sampling for high-volume services
- Add more Fluentd replicas

#### 🔴 **Elasticsearch Cluster Red Status**

**Symptoms**: Search queries failing, data loss risk

**Diagnosis**:
```bash
# Check cluster health
curl -X GET "elasticsearch:9200/_cluster/health?pretty"

# Check node status
curl -X GET "elasticsearch:9200/_cat/nodes?v"

# Check shard allocation
curl -X GET "elasticsearch:9200/_cat/shards?v"
```

**Solutions**:
- Add more Elasticsearch nodes
- Increase disk space
- Fix unassigned shards
- Restore from backup if necessary

### Performance Optimization

#### Fluentd Optimization
```yaml
# Increase buffer sizes for high throughput
<buffer>
  @type file
  path /var/log/fluentd-buffers/
  flush_mode interval
  flush_interval 10s
  chunk_limit_size 64MB
  total_limit_size 2GB
  overflow_action block
  retry_max_times 3
</buffer>
```

#### Elasticsearch Optimization
```yaml
# Increase heap size
env:
  - name: ES_JAVA_OPTS
    value: "-Xms4g -Xmx4g"

# Optimize indexing
index.refresh_interval: "30s"
index.number_of_replicas: 0  # For non-critical logs
```

## Security Considerations

### Data Protection
- **Encryption**: All log data encrypted at rest and in transit
- **Access Control**: RBAC for Kibana and Elasticsearch access
- **Data Masking**: Sensitive data automatically redacted
- **Audit Trail**: All access to logging system logged

### Compliance
- **GDPR**: Personal data automatically identified and managed
- **SOX**: Financial data audit trails maintained
- **HIPAA**: Healthcare data (if applicable) properly isolated
- **Retention**: Automated deletion per compliance requirements

### Security Monitoring
- **Anomaly Detection**: Unusual log patterns detected
- **Access Monitoring**: Unauthorized access attempts logged
- **Data Integrity**: Log tampering detection
- **Backup Security**: Encrypted backup verification

## Best Practices

### Development
1. **Structured Logging**: Always use JSON format with standard fields
2. **Meaningful Messages**: Include context and actionable information
3. **Appropriate Levels**: Use correct log levels (debug/info/warn/error)
4. **Correlation IDs**: Always propagate correlation context
5. **Sensitive Data**: Never log passwords, tokens, or PII

### Operations
1. **Regular Monitoring**: Check dashboard daily for anomalies
2. **Index Management**: Monitor index sizes and rotation
3. **Backup Strategy**: Regular backups of critical log data
4. **Performance Tuning**: Optimize based on log volume patterns
5. **Alerting Rules**: Set up appropriate thresholds for alerts

### Security
1. **Access Control**: Limit log access to authorized personnel
2. **Data Retention**: Follow compliance requirements strictly
3. **Encryption**: Ensure all log data is encrypted
4. **Monitoring**: Monitor access to logging infrastructure
5. **Incident Response**: Include logs in incident response procedures

## API Reference

### SMMLogger Methods

```typescript
// Basic logging
logger.info(message: string, fields?: LogFields): void
logger.warn(message: string, fields?: LogFields): void
logger.error(message: string, error?: Error, fields?: LogFields): void
logger.debug(message: string, fields?: LogFields): void

// Domain-specific logging
logger.audit(action: string, resource: string, result: 'success' | 'failure', details?: any): void
logger.security(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void
logger.performance(operation: string, duration: number, success: boolean, details?: any): void
logger.agentExecution(agentType: string, status: 'started' | 'completed' | 'failed', details?: any): void
logger.connectorCall(platform: string, endpoint: string, responseTime: number, statusCode: number, details?: any): void
logger.simulationEvent(simulationId: string, iteration: number, event: string, details?: any): void
logger.workflowEvent(workflowId: string, executionId: string, nodeType: string, status: string, details?: any): void
logger.businessMetric(metric: string, value: number, unit: string, tags?: Record<string, string>): void

// Context management
logger.child(additionalContext: LogContext): SMMLogger
logger.setContext(context: LogContext): void
logger.generateCorrelationId(): string
```

## Support and Escalation

### Contact Information
- **Platform Team**: platform-team@smm-architect.com
- **On-Call Engineer**: oncall@smm-architect.com (for critical issues)
- **Security Team**: security-team@smm-architect.com (for security events)

### Escalation Matrix
1. **Level 1**: Platform team (response: 4 hours)
2. **Level 2**: Engineering manager (response: 2 hours)
3. **Level 3**: CTO (response: 1 hour)

### Emergency Procedures
1. **Log System Down**: Contact on-call immediately
2. **Security Breach**: Contact security team within 15 minutes
3. **Data Loss**: Engage disaster recovery procedures
4. **Compliance Issue**: Notify legal and compliance teams

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintained By**: SMM Architect Platform Team