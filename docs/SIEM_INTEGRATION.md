# SIEM Integration Configuration

## Environment Variables

Add the following environment variables to enable SIEM audit log streaming:

```bash
# Enable SIEM integration
SIEM_ENABLED=true

# SIEM endpoint URL (required)
SIEM_ENDPOINT=https://your-siem-system.com/api/events

# SIEM API key for authentication (optional)
SIEM_API_KEY=your-api-key-here

# SIEM provider type (optional, defaults to 'custom')
SIEM_PROVIDER=elk  # Options: elk, splunk, azure-sentinel, datadog, custom

# SIEM index/collection name (optional)
SIEM_INDEX=smm-architect-audit

# Batch size for event streaming (optional, defaults to 50)
SIEM_BATCH_SIZE=50

# Flush interval in milliseconds (optional, defaults to 30000)
SIEM_FLUSH_INTERVAL=30000
```

## Supported SIEM Systems

### Elasticsearch/ELK Stack
```bash
SIEM_ENABLED=true
SIEM_PROVIDER=elk
SIEM_ENDPOINT=https://elasticsearch.example.com:9200
SIEM_API_KEY=your-api-key
SIEM_INDEX=smm-architect-audit
```

### Splunk HEC (HTTP Event Collector)
```bash
SIEM_ENABLED=true
SIEM_PROVIDER=splunk
SIEM_ENDPOINT=https://splunk.example.com:8088
SIEM_API_KEY=your-hec-token
SIEM_INDEX=main
```

### Azure Sentinel
```bash
SIEM_ENABLED=true
SIEM_PROVIDER=azure-sentinel
SIEM_ENDPOINT=https://your-workspace.ods.opinsights.azure.com
SIEM_API_KEY=your-workspace-key
SIEM_INDEX=SMMArchitectAudit
```

### Custom Webhook
```bash
SIEM_ENABLED=true
SIEM_PROVIDER=custom
SIEM_ENDPOINT=https://your-webhook.example.com/audit
SIEM_API_KEY=bearer-token-here
```

## Event Types

The following security events are automatically streamed to SIEM:

### Authentication Events
- `authentication_success` - Successful JWT authentication
- `authentication_failure` - Failed authentication attempts
- `jwt_validation_failure` - JWT token validation errors

### Authorization Events
- `tenant_isolation_violation` - Cross-tenant access attempts
- `privilege_escalation` - Unauthorized privilege escalation attempts
- `unauthorized_access` - Access denied events

### Security Events
- `rate_limit_exceeded` - Rate limiting violations
- `suspicious_activity` - Detected anomalous behavior
- `security_policy_violation` - Security policy breaches

## Event Schema

Each audit event contains the following fields:

```json
{
  "timestamp": "2025-01-01T12:00:00.000Z",
  "eventId": "auth_1640995200000_abc123",
  "source": "smm-architect-auth",
  "eventType": "authentication_failure",
  "userId": "user-123",
  "tenantId": "tenant-456",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "action": "jwt_authentication",
  "outcome": "failure",
  "details": {
    "endpoint": "/api/workspaces",
    "method": "GET",
    "errorCode": "AUTHENTICATION_FAILED",
    "errorMessage": "Invalid token"
  },
  "riskScore": 50
}
```

## Risk Scoring

Events are automatically assigned risk scores (0-100):

- **10-30**: Low risk (successful authentication, normal operations)
- **40-60**: Medium risk (authentication failures, rate limit violations)
- **70-85**: High risk (privilege escalation attempts, unauthorized access)
- **90-100**: Critical risk (tenant isolation violations, security breaches)

## Monitoring & Alerting

Set up alerts in your SIEM system for:

1. **Critical Events** (riskScore >= 90)
   - Tenant isolation violations
   - Multiple authentication failures from single IP

2. **High Risk Events** (riskScore >= 70)
   - Privilege escalation attempts
   - Unusual access patterns

3. **Volume-based Alerts**
   - More than 10 authentication failures per IP per hour
   - More than 5 tenant violation attempts per user per day

## Testing

To test SIEM integration:

1. Set up a test webhook endpoint (e.g., using webhook.site)
2. Configure SIEM variables to point to the test endpoint
3. Trigger authentication events in the application
4. Verify events are received at the test endpoint

## Troubleshooting

### Common Issues

1. **Events not appearing in SIEM**
   - Check `SIEM_ENABLED=true` is set
   - Verify `SIEM_ENDPOINT` is accessible
   - Check authentication credentials
   - Review application logs for SIEM errors

2. **Authentication errors**
   - Verify `SIEM_API_KEY` is correct
   - Check SIEM system API documentation for proper headers

3. **Performance impact**
   - SIEM calls are non-blocking and asynchronous
   - Increase `SIEM_BATCH_SIZE` and `SIEM_FLUSH_INTERVAL` if needed
   - Monitor application performance metrics

### Debug Logging

Enable debug logging to troubleshoot SIEM integration:

```bash
LOG_LEVEL=debug
```

This will show SIEM-related debug messages in application logs.