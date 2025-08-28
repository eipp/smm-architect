# SMM Architect Audit Logging & SIEM Integration

This document provides comprehensive setup instructions for audit logging and SIEM integration in SMM Architect.

## Overview

The audit logging system provides:
- Comprehensive security event tracking
- Real-time streaming to SIEM systems
- Compliance-ready audit trails
- Tamper-evident logging
- Multi-destination support

## Supported SIEM Destinations

- **Elasticsearch** - Full-text search and analytics
- **Splunk** - Enterprise security platform
- **Syslog** - Standard logging protocol
- **Webhooks** - Custom integrations
- **AWS CloudWatch** (planned)
- **GCP Cloud Logging** (planned)

## Quick Start

### 1. Configure Environment Variables

Copy the SIEM configuration template:
```bash
cp .env.siem.example .env.siem
```

Edit `.env.siem` with your SIEM configuration:
```bash
# Enable audit streaming
AUDIT_STREAMING_ENABLED=true

# Configure your primary SIEM destination
ELASTICSEARCH_ENABLED=true
ELASTICSEARCH_URL=https://your-elasticsearch.com:9200
ELASTICSEARCH_INDEX=smm-audit-logs
ELASTICSEARCH_USERNAME=audit_user
ELASTICSEARCH_PASSWORD=secure_password
```

### 2. Integration in Services

Add audit middleware to your Express application:

```typescript
import express from 'express';
import { 
  auditMiddleware,
  authenticationAuditMiddleware,
  dataAccessAuditMiddleware,
  adminActionAuditMiddleware
} from '../shared/security/audit-event-middleware';

const app = express();

// Apply audit middleware
app.use(auditMiddleware());
app.use(authenticationAuditMiddleware());
app.use(dataAccessAuditMiddleware());
app.use(adminActionAuditMiddleware());

// Your existing middleware and routes
app.use('/api', yourApiRoutes);
```

### 3. Manual Event Recording

Record custom audit events programmatically:

```typescript
import { auditStreamer } from '../shared/security/audit-log-streamer';

// Record a custom security event
await auditStreamer.recordEvent({
  event_type: 'custom_security_event',
  severity: 'high',
  actor: {
    user_id: 'user123',
    tenant_id: 'tenant456',
    ip_address: '192.168.1.100'
  },
  target: {
    resource_type: 'sensitive_data',
    resource_id: 'data789'
  },
  action: 'unauthorized_access_attempt',
  outcome: 'failure',
  details: {
    reason: 'Invalid permissions',
    attempted_action: 'read_confidential'
  }
});
```

## SIEM-Specific Setup

### Elasticsearch

1. Create index template:
```bash
curl -X PUT "elasticsearch:9200/_index_template/smm-audit-template" \
  -H "Content-Type: application/json" \
  -d @elasticsearch-audit-template.json
```

2. Configure index lifecycle management:
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "30d"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "allocate": {
            "number_of_replicas": 0
          }
        }
      },
      "cold": {
        "min_age": "90d"
      },
      "delete": {
        "min_age": "2555d"
      }
    }
  }
}
```

### Splunk

1. Create HTTP Event Collector (HEC):
   - Go to Settings > Data Inputs > HTTP Event Collector
   - Create new token with appropriate permissions
   - Set default index to `smm_audit`

2. Configure props.conf:
```ini
[smm:audit:*]
SHOULD_LINEMERGE = false
TRUNCATE = 10000
TIME_PREFIX = "timestamp":"
MAX_TIMESTAMP_LOOKAHEAD = 30
KV_MODE = json
```

### Syslog

Configure rsyslog to receive audit events:
```bash
# /etc/rsyslog.d/10-smm-audit.conf
$ModLoad imudp
$UDPServerRun 514

# SMM Architect audit logs
:programname, isequal, "smm-audit" /var/log/smm-architect/audit.log
& stop
```

## Event Types and Schema

### Core Event Types

1. **api_request** - All API requests
2. **authentication** - Login/logout events
3. **authorization_failure** - Permission denied events
4. **data_access** - Database operations
5. **admin_action** - Administrative operations
6. **security_event** - Security violations

### Event Schema

All audit events follow this schema:
```typescript
interface AuditEvent {
  event_id: string;           // Unique event identifier
  timestamp: string;          // ISO 8601 timestamp
  event_type: string;         // Event category
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;             // Service/component name
  actor: {                    // Who performed the action
    user_id?: string;
    tenant_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
  };
  target: {                   // What was accessed
    resource_type: string;
    resource_id?: string;
    endpoint?: string;
    method?: string;
  };
  action: string;             // What action was performed
  outcome: 'success' | 'failure' | 'unknown';
  details: Record<string, any>; // Event-specific details
  metadata: {                 // System metadata
    service: string;
    version: string;
    environment: string;
    correlation_id?: string;
  };
}
```

## Security and Compliance

### Data Protection

- **Encryption in Transit**: All SIEM communications use TLS
- **PII Sanitization**: Sensitive data is automatically removed
- **Access Control**: RBAC for audit log access
- **Tamper Evidence**: Cryptographic signatures (planned)

### Compliance Features

- **SOX Compliance**: Financial data access tracking
- **HIPAA Compliance**: Healthcare data access auditing
- **GDPR Compliance**: Data subject activity logging
- **SOC 2**: Security control evidence

### Retention Policies

Configure retention based on compliance requirements:
```typescript
const retentionPolicies = {
  financial: '7_years',    // SOX requirement
  healthcare: '6_years',   // HIPAA requirement  
  general: '3_years',      // SOC 2 requirement
  security: '1_year'       // Security monitoring
};
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Audit Event Volume**: Normal vs. anomalous patterns
2. **Failed Deliveries**: SIEM destination health
3. **Buffer Utilization**: Performance monitoring
4. **Event Latency**: Real-time processing health

### Sample Queries

#### Elasticsearch Queries

Find failed authentication attempts:
```json
{
  "query": {
    "bool": {
      "must": [
        { "term": { "event_type": "authentication" } },
        { "term": { "outcome": "failure" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

#### Splunk Queries

Detect privilege escalation attempts:
```spl
index=smm_audit event_type="authorization_failure" 
| where match(details.required_permissions, "admin") 
| stats count by actor.user_id, actor.tenant_id 
| where count > 3
```

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce `AUDIT_BUFFER_SIZE`
   - Increase `AUDIT_FLUSH_INTERVAL`
   - Add destination filters

2. **Failed Deliveries**
   - Check network connectivity
   - Verify authentication credentials
   - Review destination configuration

3. **Missing Events**
   - Check middleware order
   - Verify environment variables
   - Review service logs

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
export AUDIT_DEBUG=true
```

### Health Checks

Monitor audit system health:
```bash
curl http://localhost:3000/security/metrics
```

## Performance Considerations

### Optimization Tips

1. **Batching**: Use appropriate buffer sizes
2. **Filtering**: Apply destination-specific filters
3. **Compression**: Enable compression for network transfers
4. **Indexing**: Optimize SIEM index structures

### Resource Requirements

- **Memory**: 100MB + (buffer_size × average_event_size)
- **Network**: Depends on event volume and destinations
- **Storage**: Plan for 1-5GB per million events

## Support and Maintenance

### Log Rotation

Configure log rotation for local audit files:
```bash
# /etc/logrotate.d/smm-audit
/var/log/smm-architect/audit.log {
    daily
    rotate 2555  # 7 years
    compress
    delaycompress
    missingok
    notifempty
    create 644 smm-audit smm-audit
}
```

### Backup and Recovery

1. **Elasticsearch**: Use snapshot and restore
2. **Splunk**: Configure summary indexing
3. **File-based**: Use incremental backups

### Updates and Migration

When updating audit schema:
1. Test with non-production SIEM
2. Use schema versioning
3. Maintain backward compatibility
4. Plan migration strategy

## References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [ISO 27001 Audit Requirements](https://www.iso.org/isoiec-27001-information-security.html)