# SMM Architect Production Readiness Assessment System

A comprehensive TypeScript-based production readiness assessment framework specifically designed for AI agent orchestration platforms like SMM Architect.

## Overview

This assessment system validates critical production requirements for SMM Architect, including:

- 🤖 **Agent Orchestration Reality** - Validates real vs mock agent execution
- 🔒 **Multi-Tenant Security** - Validates PostgreSQL RLS and tenant isolation
- 📊 **Campaign Simulation** - Validates Monte Carlo determinism and accuracy
- 🔗 **External Integrations** - Validates Agentuity, n8n, Vault, and social media APIs
- ⚖️ **Compliance Framework** - Validates GDPR/CCPA automation and audit integrity
- 📋 **Workspace Lifecycle** - Validates end-to-end workspace operations
- 💾 **Data Flow** - Validates real-time processing and cost accuracy
- 📈 **Monitoring & Alerting** - Validates production monitoring and SLO compliance

## Quick Start

### Installation

```bash
cd tools/assessment
npm install
npm run build
```

### Basic Usage

```bash
# Run comprehensive assessment
npm run assess

# Run production assessment
npm run assess:production

# Run quick assessment (basic level, skip non-critical)
npm run assess:quick

# Validate environment configuration
npm run validate-env

# Show current configuration
npm run show-config
```

### Direct CLI Usage

```bash
# Make CLI executable
chmod +x cli.js

# Run assessment
./cli.js run --environment production --level comprehensive

# Validate environment
./cli.js validate-env

# Show deprecated scripts
./cli.js deprecate-scripts
```

## Configuration

### Environment Variables

The assessment system requires various environment variables depending on the validators:

#### Core Configuration
```bash
# Assessment configuration
SMM_ASSESSMENT_LEVEL=comprehensive     # basic|comprehensive|enterprise
SMM_ASSESSMENT_PARALLEL=true          # Run validators in parallel
SMM_ASSESSMENT_OUTPUT_DIR=./reports    # Output directory for reports
SMM_ASSESSMENT_SKIP_NON_CRITICAL=false # Skip non-critical validators

# Project configuration
SMM_DATABASE_URL=postgresql://...       # PostgreSQL connection URL
SMM_API_URL=https://api.smm.company    # SMM Architect API URL
```

#### Agent Orchestration
```bash
AGENTUITY_WEBHOOK_URL=https://...       # Agentuity platform webhook URL
AGENTUITY_API_KEY=sk-...               # Agentuity API key
TOOLHUB_ENDPOINT=https://...           # ToolHub service endpoint
```

#### External Services
```bash
VAULT_ADDR=https://vault.company.com   # HashiCorp Vault address
VAULT_TOKEN=hvs.123...                 # Vault authentication token
N8N_WEBHOOK_URL=https://...            # n8n workflow webhook URL
```

#### Social Media APIs
```bash
LINKEDIN_API_URL=https://api.linkedin.com
LINKEDIN_API_KEY=...
TWITTER_API_URL=https://api.twitter.com
TWITTER_API_KEY=...
# Similar for Facebook, Instagram
```

#### Monitoring
```bash
PROMETHEUS_URL=https://prometheus.company.com
GRAFANA_URL=https://grafana.company.com
ALERTMANAGER_URL=https://alertmanager.company.com
```

### Configuration File

Create `.smm-assessment.json` in your project root:

```json
{
  "assessmentLevel": "comprehensive",
  "parallelExecution": true,
  "skipNonCritical": false,
  "generateReports": true,
  "outputDirectory": "./reports/production-assessment"
}
```

## Assessment Levels

### Basic Level
- Critical validators only (BLOCKER and CRITICAL severity)
- Faster execution for quick validation
- Suitable for development environments

### Comprehensive Level (Default)
- All validators including HIGH priority
- Detailed analysis and reporting
- Recommended for staging validation

### Enterprise Level
- All validators including informational checks
- Maximum detail and compliance validation
- Required for production deployment

## Validators

### 🤖 Agent Orchestration Reality Validator

**Purpose**: Validates that AI agents are executing real operations, not mock responses.

**Checks**:
- MCP protocol implementation authenticity
- Agent response variability and uniqueness
- Agentuity platform connectivity (production vs localhost)
- External API integration verification

**Critical for**: Campaign execution integrity

### 🔒 Multi-Tenant Security Validator

**Purpose**: Validates tenant isolation and data security mechanisms.

**Checks**:
- PostgreSQL Row-Level Security (RLS) policies
- Cross-tenant data access prevention
- Tenant context enforcement
- Database query filtering

**Critical for**: Data privacy and regulatory compliance

### 📊 Campaign Simulation Validator

**Purpose**: Validates Monte Carlo simulation accuracy and determinism.

**Checks**:
- Seed reproducibility for deterministic results
- Statistical accuracy and convergence
- Real social media API integration
- Cost calculation accuracy

**Critical for**: Reliable campaign planning and budgeting

### 🔗 External Integration Validator

**Purpose**: Validates external service integrations for production readiness.

**Checks**:
- Agentuity platform production connectivity
- n8n workflow engine integration
- HashiCorp Vault secrets management
- Social media platform API connections

**Critical for**: Service availability and functionality

## Reports

The assessment system generates comprehensive reports in multiple formats:

### Console Output
- Real-time validation progress
- Overall score and production readiness status
- Critical blockers summary
- Category-wise scores

### JSON Reports
- `assessment-report-{id}.json` - Complete assessment data
- `executive-summary-{id}.json` - Executive summary
- `detailed-findings-{id}.json` - All findings and recommendations

### Report Structure
```json
{
  "assessmentId": "smm-assessment-1234567890",
  "projectName": "SMM Architect",
  "assessmentDate": "2025-01-XX",
  "overallScore": 85,
  "productionReady": true,
  "criticalBlockers": [],
  "categoryScores": {
    "agent_orchestration": 90,
    "multi_tenant_security": 95,
    "campaign_simulation": 80
  },
  "executiveSummary": {
    "readinessStatus": "ready",
    "timeToProduction": "Ready now",
    "confidenceLevel": 92
  },
  "riskAnalysis": {
    "overallRiskScore": 25,
    "criticalRisks": [],
    "contingencyPlans": []
  }
}
```

## Migration from Legacy Scripts

This assessment system replaces several legacy validation scripts:

### Replaced Scripts

| Legacy Script | New Command | Notes |
|---------------|-------------|-------|
| `production-readiness-check.sh` | `smm-assessment run` | Basic checks now in TypeScript |
| `production-readiness-validation.sh` | `smm-assessment run --level comprehensive` | Enhanced validation |
| `verify-production-ready.sh` | `smm-assessment run --environment production` | Production-specific checks |
| `agentuity-smoke-tests.sh` | Agent Orchestration Validator | Integrated into comprehensive framework |

### Migration Commands

```bash
# Replace basic production checks
./tools/scripts/production-readiness-check.sh
# Becomes:
npm run assess:quick

# Replace comprehensive validation
./tools/scripts/production-readiness-validation.sh production
# Becomes:
npm run assess:production

# Replace agent smoke tests
./tools/scripts/agentuity-smoke-tests.sh
# Becomes:
npm run assess  # (includes agent validation)
```

### Scripts to Keep

These scripts remain complementary to the assessment system:
- `run-security-tests.sh` - Specific security testing
- `generate-sbom.sh` - SBOM generation
- `deploy-*.sh` - Deployment automation
- `setup-*.sh` - Environment setup

## Development

### Adding New Validators

1. Create validator class implementing `IValidator`:

```typescript
export class NewValidator implements IValidator {
  public readonly name = 'new-validator';
  public readonly category = AssessmentCategory.NEW_CATEGORY;
  public readonly criticalityLevel = CriticalityLevel.HIGH;

  public async validate(config: SMMProductionAssessmentConfig): Promise<AssessmentResult> {
    // Implementation
  }
}
```

2. Add to orchestrator initialization:

```typescript
this.validators = [
  // ... existing validators
  new NewValidator()
];
```

3. Update configuration manager with new requirements.

### Testing

```bash
# Run assessment on local environment
npm run assess -- --environment staging --level basic

# Test specific environment validation
npm run validate-env

# Test configuration loading
npm run show-config
```

## Troubleshooting

### Common Issues

1. **Configuration Validation Errors**
   ```bash
   # Check environment variables
   npm run validate-env
   
   # Show current configuration
   npm run show-config
   ```

2. **Validator Timeouts**
   ```bash
   # Run with non-critical validators skipped
   npm run assess:quick
   
   # Run sequentially instead of parallel
   ./cli.js run --no-parallel
   ```

3. **Database Connection Issues**
   ```bash
   # Check database URL configuration
   echo $SMM_DATABASE_URL
   
   # Test database connectivity separately
   pg_isready -d $SMM_DATABASE_URL
   ```

4. **External Service Connectivity**
   ```bash
   # Test individual service endpoints
   curl -f $AGENTUITY_WEBHOOK_URL/_health
   curl -f $VAULT_ADDR/v1/sys/health
   ```

### Debug Mode

Set environment variables for detailed debugging:

```bash
DEBUG=smm-assessment:* npm run assess
VERBOSE=true npm run assess
```

## Integration

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Production Readiness Assessment
  run: |
    cd tools/assessment
    npm install
    npm run build
    npm run assess:production
```

### Makefile Integration

Add to project Makefile:

```makefile
.PHONY: production-assessment
production-assessment:
	cd tools/assessment && npm run assess:production

.PHONY: assessment-quick
assessment-quick:
	cd tools/assessment && npm run assess:quick
```

## License

Proprietary - SMM Architect Team

## Support

For issues and questions:
1. Check this README and troubleshooting section
2. Review the implementation plan in `IMPLEMENTATION_PLAN.md`
3. Check existing script functionality for reference
4. Contact the development team