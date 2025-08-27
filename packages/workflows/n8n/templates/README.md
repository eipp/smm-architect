# MCP Integration n8n Workflow Templates

This directory contains n8n workflow templates for Model Communication Protocol (MCP) integration with the SMM Architect platform.

## Overview

The MCP integration workflows provide standardized communication and orchestration between AI models, agents, and the SMM platform infrastructure. These templates implement the MCP 2.0 protocol specification for model evaluation, agent communication, and health monitoring.

## Available Templates

### 1. MCP Model Evaluation (`mcp-model-evaluation.json`)

**Purpose**: Automated model evaluation using the MCP protocol for quality assessment and deployment approval.

**Features**:
- Golden dataset testing
- A/B testing between models
- Drift detection and monitoring
- Performance benchmarking
- Automated approval/rejection decisions
- Canary deployment triggering

**Webhook Endpoint**: `/mcp-evaluate`

**Request Format**:
```json
{
  "modelId": "model-123",
  "evaluationType": "golden_dataset|ab_test|drift_detection|performance_benchmark",
  "datasetId": "golden-dataset-v1",
  "comparisonModelId": "model-456", // for A/B tests
  "timeout": 300000
}
```

**Response Format**:
```json
{
  "protocol": "mcp-2.0",
  "requestId": "mcp-eval-1234567890",
  "status": "completed",
  "results": {
    "overall_score": 0.85,
    "quality_assessment": {
      "accuracy": 0.87,
      "latency": 1500,
      "cost_efficiency": 0.8,
      "reliability": 0.95
    },
    "compliance": {
      "safety_check": true,
      "bias_check": true,
      "content_policy": true
    }
  },
  "approvalDecision": {
    "approved": true,
    "reasons": [],
    "nextActions": ["Model approved for deployment"]
  }
}
```

### 2. MCP Agent Communication (`mcp-agent-communication.json`)

**Purpose**: Standardized communication and orchestration for AI agents using MCP protocol.

**Features**:
- Agent preference-based model routing
- Task execution across different agent types
- Quality validation and scoring
- Performance monitoring
- Audit logging for compliance

**Webhook Endpoint**: `/mcp-agent-communicate`

**Supported Agent Types**:
- `research`: Market research and competitive analysis
- `creative`: Content creation and brand alignment
- `legal`: Compliance review and risk assessment
- `planner`: Campaign planning and resource allocation
- `publisher`: Content publishing and distribution

**Request Format**:
```json
{
  "agentType": "research",
  "task": {
    "query": "AI marketing trends 2024",
    "scope": "comprehensive",
    "sources": ["web", "academic", "industry"]
  },
  "workspaceId": "workspace-123",
  "preferredModels": ["claude-3-sonnet"],
  "qualityThreshold": 0.8
}
```

**Response Format**:
```json
{
  "protocol": "mcp-2.0",
  "requestId": "mcp-agent-1234567890",
  "agentType": "research",
  "status": "completed",
  "output": {
    "primary": "Research report content...",
    "metadata": {
      "confidence": 0.9,
      "qualityScore": 0.85,
      "sources": ["source1", "source2"]
    }
  },
  "qualityValidation": {
    "passed": true,
    "score": 0.85,
    "recommendation": "accept"
  }
}
```

### 3. MCP Model Health Monitor (`mcp-model-health-monitor.json`)

**Purpose**: Automated health monitoring and metrics collection for AI models using MCP protocol.

**Features**:
- Scheduled health checks (every 5 minutes)
- Endpoint availability monitoring
- Performance metrics collection
- Resource utilization tracking
- Automated alerting for issues
- Health status aggregation

**Monitoring Checks**:
- Endpoint availability
- Response latency
- Error rate monitoring
- Quality score tracking
- Resource utilization (CPU, memory, GPU)

**Health Status Levels**:
- `healthy`: All metrics within thresholds
- `degraded`: Minor issues detected
- `unhealthy`: Critical issues requiring attention
- `unreachable`: Endpoint not responding

**Thresholds**:
```json
{
  "maxLatency": 5000,     // milliseconds
  "maxErrorRate": 0.05,   // 5%
  "minAvailability": 0.99, // 99%
  "minQualityScore": 0.8   // 80%
}
```

## Integration with Model Router Service

These MCP workflows integrate seamlessly with the Model Router Service:

1. **Model Registration**: Models are registered through the Model Router API
2. **Health Updates**: Health status is updated via `/api/models/{id}/health`
3. **Routing Decisions**: Agent preferences are retrieved from `/api/agents/{type}/preferences`
4. **Evaluation Results**: Stored via `/api/models/{id}/status`
5. **Canary Deployments**: Triggered through `/api/canary-deployments`

## Deployment

### Prerequisites

1. n8n workflow engine running in the cluster
2. Model Router Service deployed and accessible
3. Audit Service for logging and compliance
4. Monitoring infrastructure for alerts

### Installation

1. Import the workflow templates into n8n:
   ```bash
   # Copy templates to n8n workflows directory
   kubectl cp workflows/n8n/templates/ n8n-pod:/home/node/.n8n/workflows/
   ```

2. Configure webhook credentials and service endpoints in n8n

3. Set up monitoring dashboards to visualize health metrics

### Configuration

Update the following service endpoints in the workflow templates:

- `model-router.smm-system.svc.cluster.local:8080` - Model Router Service
- `audit.smm-system.svc.cluster.local:8080` - Audit Service
- `monitoring.smm-system.svc.cluster.local:8080` - Monitoring Service

## Protocol Compliance

All workflows implement MCP 2.0 protocol specifications:

- **Request/Response Format**: Standardized JSON schema
- **Error Handling**: Consistent error reporting
- **Metadata Tracking**: Complete audit trail
- **Quality Assurance**: Built-in validation and scoring
- **Performance Monitoring**: Latency and resource tracking

## Security Considerations

- All webhooks should be secured with authentication tokens
- Service-to-service communication uses cluster-internal networking
- Audit logs capture all model interactions for compliance
- Quality thresholds prevent deployment of substandard models

## Monitoring and Alerting

The health monitor workflow generates alerts for:

- Model endpoint failures
- Performance degradation
- Quality score drops
- Resource utilization spikes
- Compliance violations

Alerts are sent to the monitoring service for dashboard display and notification routing.

## Troubleshooting

### Common Issues

1. **Webhook Timeouts**: Increase timeout values for long-running evaluations
2. **Model Unreachable**: Check network connectivity and endpoint configuration
3. **Quality Validation Failures**: Review thresholds and model training data
4. **Authentication Errors**: Verify service credentials and RBAC permissions

### Debug Mode

Enable debug logging in n8n workflows to capture detailed execution information for troubleshooting model communication issues.