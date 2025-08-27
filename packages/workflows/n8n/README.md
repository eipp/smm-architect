# n8n Workflows and Test Data

✅ **Production Ready** - Complete n8n workflow orchestration system for SMM Architect platform

This directory contains **7 production-ready n8n workflow templates** and comprehensive test data for enterprise campaign automation.

## 🎆 Production Workflows

### 1. Campaign Execution Workflow (`smm-campaign-execution.json`) ✅

Complete end-to-end campaign workflow that orchestrates all SMM Architect services:

**Flow**: Webhook Trigger → Get Workspace → Research Agent → Planner Agent → Simulator → Readiness Check → Legal Review → Creative Agent → Publisher Agent → Response

**Key Features**:
- **Multi-agent orchestration**: Coordinates research, planning, creative, legal, and publishing agents
- **Readiness scoring**: Uses Monte Carlo simulation to validate campaign readiness
- **Legal compliance**: Automated legal review before content creation
- **Conditional execution**: Only proceeds if readiness score meets threshold (≥0.85)
- **Error handling**: Proper response for rejected campaigns

**Usage**:
```bash
# Import into n8n
curl -X POST http://n8n:5678/api/v1/workflows/import \
  -H "Content-Type: application/json" \
  -d @campaign-execution-workflow.json

# Trigger campaign
curl -X POST http://n8n:5678/webhook/campaign-trigger \
  -H "Content-Type: application/json" \
  -d '{"workspaceId": "ws-001", "urgent": false}'
```

## Test Data

### Simulation Test Scenarios (`test-scenarios.json`)

Comprehensive test data for Monte Carlo simulation validation:

#### Scenario 1: Tech Startup LinkedIn Campaign
- **Target**: B2B lead generation on LinkedIn
- **Budget**: $800/week, moderate spend
- **Expected Readiness**: 0.85-0.95
- **Channels**: LinkedIn only
- **Use Case**: Conservative B2B approach

#### Scenario 2: E-commerce Multi-Channel Campaign  
- **Target**: Consumer sales across social platforms
- **Budget**: $2000/week, aggressive spend
- **Expected Readiness**: 0.75-0.90
- **Channels**: Instagram, Facebook, TikTok
- **Use Case**: High-volume consumer marketing

### Mock API Responses

Pre-configured responses for testing agent interactions:
- **Research Agent**: Brand intelligence and competitor analysis
- **Planner Agent**: Campaign strategy and content calendar
- **Simulation Service**: Monte Carlo analysis results

## Integration Testing

### Running End-to-End Tests

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Import n8n workflow**:
   ```bash
   curl -X POST http://localhost:5678/api/v1/workflows/import \
     -H "Content-Type: application/json" \
     -d @workflows/n8n/examples/campaign-execution-workflow.json
   ```

3. **Execute test scenarios**:
   ```bash
   # Tech startup scenario
   curl -X POST http://localhost:5678/webhook/campaign-trigger \
     -H "Content-Type: application/json" \
     -d @tests/data/simulation/tech-startup-trigger.json
   
   # E-commerce scenario  
   curl -X POST http://localhost:5678/webhook/campaign-trigger \
     -H "Content-Type: application/json" \
     -d @tests/data/simulation/ecommerce-trigger.json
   ```

### Simulation Validation

Test Monte Carlo simulation with different scenarios:

```bash
# Conservative scenario
curl -X POST http://simulator:3003/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "workspace": {...},
    "request": {
      "dryRun": true,
      "targetChannels": ["linkedin"],
      "iterations": 1000
    }
  }'

# Aggressive scenario
curl -X POST http://simulator:3003/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "workspace": {...},
    "request": {
      "dryRun": true, 
      "targetChannels": ["instagram", "facebook", "tiktok"],
      "iterations": 2000
    }
  }'
```

## Performance Testing

### Load Testing Scenarios

1. **Single workspace, multiple campaigns**:
   - Simulate 10 concurrent campaigns for one workspace
   - Measure agent response times and resource usage
   - Validate readiness score consistency

2. **Multiple workspaces, parallel execution**:
   - Run 5 different workspaces simultaneously
   - Test tenant isolation and data consistency
   - Monitor system performance under load

3. **High-frequency simulation requests**:
   - Execute 100 Monte Carlo simulations rapidly
   - Test deterministic seeding and result reproducibility
   - Validate simulation performance scaling

### Monitoring During Tests

Key metrics to monitor:
- **Agent response times**: Each agent should respond within SLA
- **Simulation accuracy**: Results should match expected ranges
- **Resource utilization**: CPU, memory, and network usage
- **Error rates**: Should remain below 1% during normal operation

## Configuration

### Environment Setup

```bash
# Set test environment variables
export SMM_ARCHITECT_URL="http://localhost:4000"
export TOOLHUB_URL="http://localhost:4001" 
export N8N_URL="http://localhost:5678"
export TEST_DATA_PATH="./tests/data"

# Configure n8n credentials
export N8N_SMM_ARCHITECT_TOKEN="test-token"
export N8N_WEBHOOK_SECRET="test-secret"
```

### Test Database Setup

```sql
-- Create test database
CREATE DATABASE smm_architect_test;

-- Insert test workspace
INSERT INTO workspaces (id, tenant_id, config) VALUES 
  ('ws-test-001', 'test-tenant', '{"name": "Test Workspace"}');

-- Insert test brand data
INSERT INTO brand_twins (workspace_id, data) VALUES
  ('ws-test-001', '{"brandName": "Test Brand", "voice": "professional"}');
```

## Troubleshooting

### Common Issues

1. **Workflow execution fails**:
   - Check service availability: `curl http://service:port/health`
   - Verify authentication tokens in n8n credentials
   - Review workflow error logs in n8n interface

2. **Simulation results inconsistent**:
   - Verify random seed is set for deterministic results
   - Check input data format matches schema
   - Ensure sufficient iterations for stable results

3. **Agent communication errors**:
   - Verify network connectivity between services
   - Check API endpoint URLs in workflow configuration
   - Validate request/response JSON formats

### Debug Commands

```bash
# Check n8n workflow status
curl http://localhost:5678/api/v1/workflows

# View execution history
curl http://localhost:5678/api/v1/executions

# Test individual agent endpoints
curl http://research-agent:3001/health
curl http://planner-agent:3002/health
curl http://creative-agent:3006/health

# Validate simulation determinism
for i in {1..5}; do
  curl -X POST http://simulator:3003/simulate \
    -H "Content-Type: application/json" \
    -d '{"workspace": {...}, "request": {"randomSeed": 42}}'
done
```

## Best Practices

### Workflow Design

1. **Error handling**: Always include error branches and appropriate responses
2. **Timeout configuration**: Set reasonable timeouts for each agent call
3. **Data validation**: Validate input/output at each step
4. **Logging**: Include correlation IDs for tracing across services

### Test Data Management

1. **Deterministic inputs**: Use fixed seeds and known data for reproducible tests
2. **Scenario coverage**: Include edge cases and boundary conditions
3. **Data cleanup**: Reset test data between runs
4. **Version control**: Track changes to test scenarios

### Performance Optimization

1. **Parallel execution**: Use n8n's parallel branches where possible
2. **Caching**: Cache frequently used data like brand twins
3. **Batch processing**: Group similar operations together
4. **Resource limits**: Set appropriate memory and CPU limits

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: SMM Architect Team