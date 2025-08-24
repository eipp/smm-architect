# Integration Testing Suite

The Integration Testing Suite provides comprehensive validation of external APIs, webhook endpoints, service dependencies, and system connectivity for the SMM Architect platform.

## Overview

This suite ensures that all external integrations and dependencies are functioning correctly through:

- **External API Testing**: Validation of service endpoints and API contracts
- **Webhook Testing**: Verification of webhook endpoints and payload handling  
- **Dependency Validation**: Health checks for all system dependencies
- **Service Connectivity**: Network and communication testing

## Test Components

### 1. External API Integration Tests (`external-api-integration.test.ts`)

Tests external service APIs and internal service endpoints:

```typescript
// Test service health endpoints
await framework.testServiceHealth('model-router', baseUrl);

// Test API endpoints with payload validation
await framework.testAPIEndpoint('toolhub', baseUrl, '/api/vector-search', 'POST', payload);

// Test webhook endpoints
await framework.testWebhook(baseUrl, '/webhook/mcp-evaluate', payload);
```

**Tested Services**:
- Model Router Service: Health, model registration, routing
- ToolHub: Vector search, workspace operations
- n8n: Workflow webhooks, health monitoring
- Audit Service: Health, bundle operations
- Workspace Service: Health, tenant operations

### 2. Dependency Validation (`dependency-validation.test.ts`)

Comprehensive validation of system dependencies:

```typescript
const dependencies = [
  // HTTP Services
  { name: 'model-router', type: 'http', url: 'http://...', required: true },
  
  // Infrastructure
  { name: 'redis-cache', type: 'port', host: 'redis', port: 6379, required: true },
  
  // Kubernetes Resources  
  { name: 'smm-namespace', type: 'kubernetes', namespace: 'smm-system', required: true },
  
  // External APIs
  { name: 'github-api', type: 'http', url: 'https://api.github.com', required: false }
];
```

**Dependency Types**:
- **HTTP**: Service health endpoints and API availability
- **Port**: Database and cache connectivity (Redis, PostgreSQL)
- **DNS**: Cluster and external DNS resolution
- **Kubernetes**: Namespace and resource availability

### 3. Existing Integration Tests (`n8n-mcp-toolhub.test.ts`)

Advanced integration testing for workflow orchestration:

- n8n workflow creation and execution
- MCP protocol communication
- ToolHub integration with workflows
- Agent orchestration testing
- End-to-end campaign simulation

## Test Configuration

### Environment Variables

```bash
# Service URLs
MODEL_ROUTER_URL=http://model-router.smm-system.svc.cluster.local:8080
TOOLHUB_URL=http://toolhub.smm-system.svc.cluster.local:8080
N8N_URL=http://n8n.n8n.svc.cluster.local:5678
AUDIT_SERVICE_URL=http://audit.smm-system.svc.cluster.local:8080
WORKSPACE_SERVICE_URL=http://workspace.smm-system.svc.cluster.local:8080

# Authentication
MODEL_ROUTER_TOKEN=your-token
TOOLHUB_API_KEY=your-api-key
N8N_API_KEY=your-n8n-key

# Infrastructure
REDIS_HOST=redis.smm-system.svc.cluster.local
REDIS_PORT=6379
POSTGRES_HOST=postgresql.smm-system.svc.cluster.local
POSTGRES_PORT=5432
VAULT_URL=https://vault.smm-system.svc.cluster.local:8200

# External Services
GITHUB_TOKEN=your-github-token
SLACK_WEBHOOK_URL=your-slack-webhook
```

## Running Tests

### Individual Test Suites

```bash
# External API integration tests
npm test tests/integration/external-api-integration.test.ts

# Dependency validation
npm test tests/integration/dependency-validation.test.ts

# n8n/MCP/ToolHub integration
npm test tests/integration/n8n-mcp-toolhub.test.ts

# All integration tests
npm run test:integration
```

### Test Environments

- **Local Development**: Uses localhost URLs and mock services
- **CI/CD**: Uses cluster-internal service names
- **Staging**: Uses staging environment endpoints
- **Production**: Read-only tests against production services

## Test Results and Reporting

### Test Output Format

```json
{
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "staging",
  "summary": {
    "total": 25,
    "passed": 22,
    "failed": 3,
    "successRate": 88
  },
  "serviceResults": {
    "model-router": { "total": 5, "passed": 5, "failed": 0 },
    "toolhub": { "total": 3, "passed": 2, "failed": 1 }
  },
  "results": [...],
  "recommendations": [
    "✅ All critical services are healthy",
    "⚠️ 1 optional external service unavailable"
  ]
}
```

### Dependency Validation Report

```json
{
  "summary": {
    "required": { "total": 10, "available": 9, "critical_failures": 1 },
    "optional": { "total": 5, "available": 3 },
    "averageLatency": 234
  },
  "results": [
    {
      "name": "model-router",
      "status": "available",
      "latency": 156,
      "required": true
    }
  ],
  "recommendations": [
    "🚨 1 critical dependency unavailable",
    "⚠️ 2 services have high latency (>5s)"
  ]
}
```

## Test Strategies

### Health Check Testing

1. **Basic Connectivity**: Verify service endpoints respond
2. **Response Validation**: Check status codes and response structure
3. **Latency Monitoring**: Measure response times
4. **Retry Logic**: Handle temporary failures gracefully

### API Contract Testing

1. **Request Validation**: Test valid and invalid payloads
2. **Response Structure**: Verify expected response fields
3. **Error Handling**: Test error conditions and status codes
4. **Authentication**: Validate API key and token handling

### Dependency Resilience

1. **Graceful Degradation**: Test behavior when dependencies fail
2. **Circuit Breaker**: Validate failure detection and recovery
3. **Fallback Mechanisms**: Test alternative service paths
4. **Health Recovery**: Verify automatic reconnection

## Failure Scenarios

### Common Integration Issues

1. **Service Unavailable**: Target service is down or unreachable
2. **Authentication Failures**: Invalid or expired API keys/tokens
3. **Network Timeouts**: High latency or network issues
4. **Protocol Mismatches**: API version incompatibilities
5. **Resource Limits**: Rate limiting or quota exhaustion

### Troubleshooting

```bash
# Check service connectivity
kubectl get pods -n smm-system
kubectl get services -n smm-system

# Verify DNS resolution
nslookup model-router.smm-system.svc.cluster.local

# Test direct service access
kubectl port-forward svc/model-router 8080:8080
curl http://localhost:8080/health

# Check service logs
kubectl logs -n smm-system deployment/model-router

# Network policy debugging
kubectl describe networkpolicy -n smm-system
```

## CI/CD Integration

### GitHub Actions Workflow

The integration tests are included in the main CI/CD pipeline:

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration
  env:
    MODEL_ROUTER_URL: http://model-router.default:8080
    TOOLHUB_URL: http://toolhub.default:8080
```

### Test Environments

- **PR Builds**: Basic health checks and mock service testing
- **Staging Deployment**: Full integration testing against staging services
- **Production Monitoring**: Read-only health checks and dependency validation

## Best Practices

### Test Design

1. **Isolation**: Each test should be independent and not affect others
2. **Idempotency**: Tests should be repeatable with consistent results
3. **Cleanup**: Properly clean up test data and resources
4. **Timeouts**: Set appropriate timeouts for different service types

### Error Handling

1. **Graceful Failures**: Allow some services to be unavailable in test environments
2. **Retry Logic**: Implement exponential backoff for transient failures
3. **Clear Errors**: Provide actionable error messages and debugging information
4. **Fallback Tests**: Have alternative tests when primary services are unavailable

### Monitoring

1. **Test Metrics**: Track test execution times and success rates
2. **Trend Analysis**: Monitor test health over time
3. **Alert Integration**: Notify teams of critical integration failures
4. **Dashboard**: Visualize integration test results and service health

## Security Considerations

### Authentication Testing

- Test with valid and invalid credentials
- Verify proper token expiration handling
- Test different permission levels and access controls

### Data Protection

- Use test data only, never production data
- Mask sensitive information in logs and reports
- Follow data privacy regulations in test scenarios

### Network Security

- Test service-to-service authentication
- Verify TLS/SSL certificate validation
- Test network policy enforcement

## Future Enhancements

1. **Contract Testing**: Implement Pact contract testing for API compatibility
2. **Chaos Engineering**: Add fault injection testing for resilience validation  
3. **Performance Integration**: Combine with performance testing for load validation
4. **Multi-Region**: Test cross-region connectivity and failover
5. **Service Mesh**: Integration testing with Istio service mesh features

## Contributing

When adding new integration tests:

1. **Follow Patterns**: Use existing test framework patterns
2. **Add Documentation**: Update this README with new test scenarios
3. **Environment Config**: Add necessary environment variables
4. **Error Scenarios**: Include both success and failure test cases

For questions or issues, contact the SRE team or create an issue in the repository.