# SMM Architect API Reference

This document provides a comprehensive overview of all APIs available in the SMM Architect monorepo.

## Overview

SMM Architect exposes multiple APIs through its microservices architecture:

- **SMM Architect Service**: Core workspace and campaign management
- **ToolHub Service**: Content ingestion and MCP server capabilities  
- **Model Router Service**: AI model routing and optimization
- **Simulator Service**: Campaign simulation and testing
- **Audit Service**: Compliance and audit trail management
- **Monitoring Service**: System health and metrics
- **Workspace Provisioning**: Infrastructure automation
- **Policy Service**: Governance and compliance rules

## Authentication

All APIs use Bearer token authentication:

```bash
Authorization: Bearer <your-token>
```

Tokens are managed through HashiCorp Vault and have workspace-scoped permissions.

## Core APIs

### SMM Architect Service (`/api/v1`)

#### Workspace Management

**Create Workspace**
```http
POST /api/v1/workspaces
Content-Type: application/json
Authorization: Bearer <token>

{
  "contract": {
    "tenantId": "tenant-example",
    "createdBy": "user:alice@example.com",
    "contractVersion": "v1.0.0",
    "goals": [{"key": "lead_gen", "target": 200, "unit": "leads_per_month"}],
    "primaryChannels": ["linkedin", "x"],
    "budget": {
      "currency": "USD",
      "weeklyCap": 1000,
      "hardCap": 4000
    }
  }
}
```

**Get Workspace Status**
```http
GET /api/v1/workspaces/{workspaceId}/status
Authorization: Bearer <token>
```

**Simulate Campaign**
```http
POST /api/v1/workspaces/{workspaceId}/simulate
Content-Type: application/json

{
  "dryRun": true,
  "targetChannels": ["linkedin", "x"]
}
```

**Approve Campaign**
```http
POST /api/v1/workspaces/{workspaceId}/approve
Content-Type: application/json

{
  "action": "approve",
  "comments": "Looks good to go",
  "overrides": {
    "customCanaryPct": 0.1
  }
}
```

#### Audit Management

**Get Audit Bundle**
```http
GET /api/v1/workspaces/{workspaceId}/audit
Authorization: Bearer <token>
```

### ToolHub Service (`/toolhub/v1`)

#### Content Ingestion

**Ingest Content**
```http
POST /toolhub/v1/ingest
Content-Type: application/json

{
  "content": "Marketing content to analyze",
  "metadata": {
    "source": "linkedin",
    "campaign": "q4-launch"
  }
}
```

**Vector Search**
```http
POST /toolhub/v1/search
Content-Type: application/json

{
  "query": "social media best practices",
  "limit": 10,
  "filters": {
    "source": "linkedin"
  }
}
```

#### MCP Server Endpoints

**List Tools**
```http
GET /toolhub/v1/mcp/tools
Authorization: Bearer <token>
```

**Execute Tool**
```http
POST /toolhub/v1/mcp/tools/{toolId}/execute
Content-Type: application/json

{
  "parameters": {
    "query": "content analysis",
    "options": {}
  }
}
```

### Model Router Service (`/models/v1`)

#### Model Management

**List Available Models**
```http
GET /models/v1/models
Authorization: Bearer <token>
```

**Route Request**
```http
POST /models/v1/route
Content-Type: application/json

{
  "modelType": "text-generation",
  "requirements": {
    "maxTokens": 1000,
    "temperature": 0.7
  },
  "prompt": "Generate marketing content for..."
}
```

**Get Model Metrics**
```http
GET /models/v1/models/{modelId}/metrics
Authorization: Bearer <token>
```

### Simulator Service (`/simulator/v1`)

#### Campaign Simulation

**Run Simulation**
```http
POST /simulator/v1/simulate
Content-Type: application/json

{
  "workspaceId": "ws-example-001",
  "campaignConfig": {
    "channels": ["linkedin", "x"],
    "budget": 1000,
    "duration": "30d"
  },
  "simulationParams": {
    "iterations": 10000,
    "confidenceLevel": 0.95
  }
}
```

**Get Simulation Results**
```http
GET /simulator/v1/simulations/{simulationId}/results
Authorization: Bearer <token>
```

### Audit Service (`/audit/v1`)

#### Audit Bundle Management

**Create Audit Bundle**
```http
POST /audit/v1/bundles
Content-Type: application/json

{
  "workspaceId": "ws-example-001",
  "includeSignatures": true
}
```

**Verify Bundle Signature**
```http
POST /audit/v1/bundles/{bundleId}/verify
Content-Type: application/json

{
  "signature": "cryptographic-signature-here"
}
```

### Monitoring Service (`/monitoring/v1`)

#### Health Checks

**Service Health**
```http
GET /monitoring/v1/health
```

**Detailed Health**
```http
GET /monitoring/v1/health/detailed
Authorization: Bearer <token>
```

#### Metrics

**Get Metrics**
```http
GET /monitoring/v1/metrics
Authorization: Bearer <token>
```

**Get Workspace Metrics**
```http
GET /monitoring/v1/workspaces/{workspaceId}/metrics
Authorization: Bearer <token>
```

### Policy Service (`/policy/v1`)

#### Policy Validation

**Validate Campaign**
```http
POST /policy/v1/validate
Content-Type: application/json

{
  "workspaceId": "ws-example-001",
  "campaign": {
    "content": "Campaign content here",
    "channels": ["linkedin"],
    "budget": 500
  }
}
```

**Get Policy Rules**
```http
GET /policy/v1/rules
Authorization: Bearer <token>
```

## Error Responses

All APIs return consistent error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "budget.weeklyCap",
      "reason": "Must be positive number"
    },
    "timestamp": "2025-01-27T10:30:00Z",
    "requestId": "req-123456"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401): Missing or invalid authentication
- `AUTHORIZATION_FAILED` (403): Insufficient permissions
- `VALIDATION_ERROR` (400): Invalid request data
- `RESOURCE_NOT_FOUND` (404): Requested resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

APIs implement rate limiting based on authentication context:

- **Authenticated requests**: 1000 requests/hour per workspace
- **Public endpoints**: 100 requests/hour per IP
- **Bulk operations**: 10 requests/minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1643280000
```

## Webhooks

SMM Architect supports webhook notifications for key events:

### Workspace Events
- `workspace.created`
- `workspace.updated`
- `workspace.status_changed`

### Campaign Events
- `campaign.approved`
- `campaign.started`
- `campaign.completed`
- `campaign.failed`

### Audit Events
- `audit.bundle_created`
- `audit.compliance_violation`

Webhook payload format:
```json
{
  "event": "workspace.created",
  "timestamp": "2025-01-27T10:30:00Z",
  "workspaceId": "ws-example-001",
  "data": {
    // Event-specific data
  }
}
```

## SDKs and Libraries

### TypeScript/JavaScript SDK
```bash
npm install @smm-architect/sdk
```

```typescript
import { SMMArchitectClient } from '@smm-architect/sdk';

const client = new SMMArchitectClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.smmarchitect.com'
});

// Create workspace
const workspace = await client.workspaces.create({
  contract: workspaceContract
});

// Run simulation
const simulation = await client.simulator.run({
  workspaceId: workspace.id,
  config: simulationConfig
});
```

### Python SDK
```bash
pip install smm-architect
```

```python
from smm_architect import SMMArchitectClient

client = SMMArchitectClient(
    api_key="your-api-key",
    base_url="https://api.smmarchitect.com"
)

# Create workspace
workspace = client.workspaces.create(contract=workspace_contract)

# Run simulation
simulation = client.simulator.run(
    workspace_id=workspace.id,
    config=simulation_config
)
```

## OpenAPI Specifications

Complete OpenAPI 3.0 specifications are available for each service:

- [SMM Architect Service](../services/smm-architect/openapi.yaml)
- [ToolHub Service](../services/toolhub/openapi.yaml)
- [Model Router Service](../services/model-router/openapi.yaml)
- [Simulator Service](../services/simulator/openapi.yaml)
- [Audit Service](../services/audit/openapi.yaml)
- [Monitoring Service](../services/monitoring/openapi.yaml)
- [Policy Service](../services/policy/openapi.yaml)

## Testing APIs

### Using cURL
```bash
# Set base URL and token
export SMM_API_BASE="https://api.smmarchitect.com"
export SMM_TOKEN="your-bearer-token"

# Test workspace creation
curl -X POST "$SMM_API_BASE/api/v1/workspaces" \
  -H "Authorization: Bearer $SMM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @workspace-contract.json
```

### Using HTTPie
```bash
# Install HTTPie
pip install httpie

# Test API
http POST api.smmarchitect.com/api/v1/workspaces \
  Authorization:"Bearer your-token" \
  contract:=@workspace-contract.json
```

### Using Postman

Import the OpenAPI specifications into Postman for interactive testing:

1. Open Postman
2. Import → Link → Enter OpenAPI spec URL
3. Configure authentication in the collection settings
4. Run requests and collections

## Support and Resources

- **API Documentation**: This reference document
- **OpenAPI Specs**: Interactive documentation in `/docs/openapi/`
- **SDK Documentation**: Language-specific guides in `/docs/sdks/`
- **Examples**: Complete examples in `/examples/`
- **Support**: Contact dev@smmarchitect.com