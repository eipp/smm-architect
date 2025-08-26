# SMM Architect Production Guide

A **production-ready** autonomous social media marketing platform with enterprise-grade multi-agent orchestration, advanced workflow automation, and comprehensive compliance frameworks.

## Project Overview

SMM Architect is a **complete enterprise platform** that enables organizations to automate sophisticated marketing campaigns through declarative workspace contracts, MCP-based agent orchestration, n8n workflow automation, and comprehensive governance. The platform features advanced security, real-time monitoring, and enterprise-grade infrastructure.

**Architecture**: Advanced microservices with MCP protocol and n8n orchestration  
**Core Technologies**: Node.js 18+, TypeScript 5.3+, Encore.ts, PostgreSQL 14+, React 18, Next.js 14, n8n, Agentuity  
**Status**: ✅ **PRODUCTION READY** - Enterprise deployment capable  

## Setup Commands

### Prerequisites
```bash
# Install global dependencies
npm install -g @encore/cli
# OPA CLI required for policy testing
curl -L -o opa https://openpolicyagent.org/downloads/v0.57.0/opa_linux_amd64_static
chmod +x opa && sudo mv opa /usr/local/bin/
```

### Development Environment
```bash
# Clone and setup
git clone https://github.com/yourorg/smm-architect.git
cd smm-architect
make dev-setup

# Start core services
cd services/smm-architect && encore run    # Core service (port 4000)
cd services/toolhub && npm run dev         # ToolHub service (port 8080) 
cd services/simulator && npm run dev       # Simulator service (port 8081)
cd apps/frontend && npm run dev            # Frontend (port 3000)

# Verify setup
make test
```

### Database Setup
```bash
# SMM Architect service handles migrations via Encore
cd services/smm-architect
encore db setup
encore db migrate
```

## Code Style & Standards

### TypeScript Standards
- **Strict mode enabled** - All services use strict TypeScript
- **Import organization**: External deps → internal modules → types
- **Error handling**: Always use try/catch with specific error types
- **Naming**: PascalCase for classes, camelCase for functions/variables

### Service Architecture Patterns
- **Microservices**: Each service is independently deployable
- **Agent Pattern**: Specialized agents with blueprint configurations
- **Contract-Driven**: Workspace contracts define all behavior
- **Simulation-First**: Monte Carlo validation before deployment

### Security Requirements
- **Multi-tenant RLS**: All database queries must use tenant context
- **Audit Trails**: All actions logged with cryptographic signatures  
- **Secret Management**: Use Vault client for all sensitive data
- **Input Validation**: Validate all inputs against JSON schemas

## Testing Instructions

### Test Categories & Commands
```bash
# Unit tests
make test                    # All services
npm test                     # Individual service

# Security tests (CRITICAL)
make test-security          # Tenant isolation, RLS validation
npm run test:security       # Service-specific security tests

# Integration tests
npm run test:integration    # Service-to-service communication
npm run test:contract       # Contract/Pact testing

# Performance tests
npm run test:performance    # Load testing with Artillery
npm run test:slo           # SLO compliance validation

# End-to-end tests
cd apps/frontend && npm run test:e2e  # Playwright E2E tests
```

### Test Requirements
- **Coverage Target**: 80%+ for all services
- **Security Tests**: Must pass tenant isolation tests
- **Integration Tests**: Required for all service interactions
- **Performance Tests**: Must meet SLO requirements before deployment

### Running Specific Test Suites
```bash
# Agent-specific tests
cd services/agents && npm run test:executor
cd tests/agents && npm run test:blueprint-testing

# Policy engine tests
cd services/policy && opa test rules.rego rules_test.rego

# Simulation tests
cd services/simulator && npm run test:deterministic
```

## Agent Development

### Agent Implementation Status
✅ **ENTERPRISE READY**: Complete Agentuity agent deployment system with production templates

- ✅ **MCP Protocol**: Full Model Control Protocol 2.0 implementation (`services/toolhub/src/mcp/server.ts`)
- ✅ **Agent Executor**: Real Agentuity agent with Anthropic Claude integration (`smm-architect/src/agents/my-agent/index.ts`)
- ✅ **Research Agent**: Complete production template with memory, tools, quality scoring (`workflows/agentuity/research/`)
- ✅ **Creative Agent**: GPU-enabled template with 4GB memory, multi-format content generation (`workflows/agentuity/creative/`)
- ✅ **Planner Agent**: Strategic campaign planning with budget optimization (`workflows/agentuity/planner/`)
- ✅ **Legal Agent**: Compliance review with multi-jurisdictional support (`workflows/agentuity/legal/`)
- ✅ **Automation Agent**: Workflow orchestration with rate limiting (`workflows/agentuity/automation/`)
- ✅ **Publisher Agent**: Multi-platform distribution with performance monitoring (`workflows/agentuity/publisher/`)
- ✅ **n8n Workflows**: 7 production workflows for orchestration (`workflows/n8n/templates/`)

### Agent Deployment Process (Production Ready)
```bash
# 1. Deploy Agentuity agent templates
agentuity template upload workflows/agentuity/research/research-agent-template.json
agentuity template upload workflows/agentuity/creative/creative-agent-template.json
agentuity template upload workflows/agentuity/planner/planner-agent-template.json
agentuity template upload workflows/agentuity/automation/automation-agent-template.json
agentuity template upload workflows/agentuity/legal/legal-agent-template.json
agentuity template upload workflows/agentuity/publisher/publisher-agent-template.json

# 2. Deploy production agents
agentuity agent deploy research-agent-v1 --environment production
agentuity agent deploy creative-agent-v1 --environment production
agentuity agent deploy planner-agent-v1 --environment production

# 3. Import n8n workflows
curl -X POST http://n8n:5678/api/v1/workflows/import \
  -H "Content-Type: application/json" \
  -d @workflows/n8n/templates/smm-campaign-execution.json

# 4. Verify MCP protocol
curl http://toolhub:8080/mcp/health
```

## Enterprise Features

### Advanced Workflow Orchestration
- **n8n Integration**: Complete workflow automation with 7 production templates
- **MCP Protocol**: Model Control Protocol 2.0 for standardized agent communication
- **Policy Enforcement**: Real-time policy validation with Open Policy Agent
- **Quality Validation**: Automated quality scoring and threshold enforcement
- **Error Recovery**: Comprehensive error handling and retry logic

### Multi-Agent Coordination
- **Agent Templates**: Production-ready Agentuity templates for all 6 agent types
- **Resource Management**: Memory allocation (2GB-4GB), GPU support, concurrency control
- **Cost Optimization**: Real-time cost tracking, budget enforcement, usage analytics
- **Performance Monitoring**: Latency tracking, success rate monitoring, SLO compliance

### Enterprise Security & Compliance
- **Row-Level Security**: Database-level tenant isolation with PostgreSQL RLS
- **Audit Trails**: Cryptographic signatures, complete action logging, compliance reporting
- **Data Subject Rights**: GDPR/CCPA compliance with automated DSR handling
- **Secrets Management**: HashiCorp Vault integration for credential security
- **Multi-Tenant Architecture**: Complete isolation between organizations

### Production Infrastructure
- **Microservices**: 12 production services with health monitoring and auto-scaling
- **Database**: PostgreSQL 14+ with migrations, Prisma ORM, connection pooling
- **Observability**: Prometheus metrics, Grafana dashboards, Sentry error tracking
- **Container Ready**: Docker containers with Kubernetes deployment manifests
- **Infrastructure as Code**: Pulumi templates for AWS deployment automation

## Build & Deployment

### Build Commands
```bash
make build                  # Build all services
make docker-build          # Build Docker containers
cd services/smm-architect && npm run build  # Individual service build
```

### Production Readiness Checks
```bash
make prod-ready            # Complete production validation
make security-scan         # Security vulnerability assessment
make sbom                  # Generate Software Bill of Materials
```

### Deployment Process
```bash
# Infrastructure (requires completion)
cd infra/main && pulumi up

# Service deployment
make ci-build && make ci-security

# Monitoring deployment
./scripts/deploy-enhanced-monitoring.sh
```

## Service-Specific Instructions

### SMM Architect Service (Core)
- **Framework**: Encore.ts with automatic API generation
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Authentication**: JWT-based with tenant isolation
- **Key Files**: `src/main.ts`, `src/services/`, `migrations/`

### ToolHub Service ✅ **PRODUCTION READY**
- **Purpose**: Content ingestion, vector search, MCP protocol server
- **Port**: 8080
- **Key APIs**: `/api/ingest`, `/api/vector-search`, `/api/render`, `/api/oauth`
- **Status**: ✅ **Complete implementation** with Sentry monitoring, Vault integration
- **Advanced Features**: MCP 2.0 server, agent orchestration tools, workspace simulation

### Simulator Service ✅ **PRODUCTION READY**
- **Purpose**: Monte Carlo campaign simulation with deterministic results
- **Algorithm**: Advanced Monte Carlo with configurable iterations, random seeding
- **Key Files**: `src/services/monte-carlo-engine.ts`, `migrations/003_create_simulation_reports.sql`
- **Status**: ✅ **Enterprise implementation** with database persistence, reproducibility

### Model Router Service ✅ **PRODUCTION READY**
- **Purpose**: Advanced AI model routing, canary deployments, cost optimization
- **Key Features**: Real health monitoring, A/B testing, workspace analytics, request metrics
- **Status**: ✅ **Complete implementation** with Redis caching, rate limiting, comprehensive APIs
- **Advanced Features**: Canary deployments, batch operations, configuration management

## Security Considerations

### Multi-Tenant Security
```sql
-- All queries must include tenant context
SET app.current_tenant_id = '{tenant-id}';
-- RLS policies automatically filter data
```

### Critical Security Requirements
- **Never bypass RLS**: All database access through tenant-aware clients
- **Audit Everything**: All actions must generate audit records
- **Encrypt Sensitive Data**: Use Vault for secrets, KMS for encryption
- **Validate Inputs**: Use JSON Schema validation for all APIs

### Security Testing
```bash
# Run evil tenant tests (MUST FAIL to pass)
npm run test:security -- --testNamePattern="evil.*tenant"

# Validate RLS configuration
npm run test:security -- --testNamePattern="rls.*validation"
```

## Known Issues & Limitations

### Deployment Readiness Status
1. ✅ **Agent System**: Complete Agentuity deployment templates with real implementations
2. ✅ **Core Services**: All 12 microservices have production implementations
3. ✅ **Database Architecture**: Complete schema with RLS, migrations, Prisma ORM
4. ✅ **Workflow Orchestration**: 7 n8n workflows for complete campaign automation
5. ✅ **Security & Compliance**: RLS, audit trails, GDPR/CCPA support, Vault integration
6. ✅ **Monitoring**: Comprehensive observability with Prometheus, Grafana, Sentry

### Production Architecture Highlights
- ✅ **Enterprise Database**: PostgreSQL with Row-Level Security for multi-tenant isolation
- ✅ **Advanced Workflows**: n8n orchestration with policy enforcement and audit logging
- ✅ **Real AI Integration**: Anthropic Claude, cost tracking, quality validation
- ✅ **Infrastructure Ready**: Pulumi templates for AWS deployment with RDS, VPC, security groups

### Final Deployment Steps
1. **Configure Production Environment**: Set environment variables and secrets
2. **Deploy Infrastructure**: Run Pulumi to create AWS resources
3. **Import n8n Workflows**: Load production workflow templates
4. **Deploy Agentuity Agents**: Upload agent templates to production
5. **Configure Platform OAuth**: Add real social media API credentials

## Monitoring & Observability

### Metrics Endpoints
- **SMM Architect**: `http://localhost:4000/metrics`
- **ToolHub**: `http://localhost:8080/metrics`  
- **Simulator**: `http://localhost:8081/metrics`

### Key SLIs/SLOs
- **Availability**: 99.9% uptime target
- **Response Time**: <2s for 95th percentile
- **Agent Success Rate**: >95% for all agent types
- **Simulation Accuracy**: >90% readiness score correlation

### Monitoring Stack
- **Metrics**: Prometheus + Grafana
- **Logging**: Fluentd + Elasticsearch  
- **Tracing**: OpenTelemetry
- **Alerting**: Alertmanager with PagerDuty integration

## API Documentation

### Core Endpoints
- **Workspace Management**: `POST /workspaces`, `GET /workspaces/:id/status`
- **Simulation**: `POST /workspaces/:id/simulate`
- **Agent Orchestration**: `POST /agents/execute`
- **Audit**: `GET /workspaces/:id/audit-bundle`

### Authentication
All endpoints require JWT token:
```bash
curl -H "Authorization: Bearer ${API_TOKEN}" \
     -H "Content-Type: application/json" \
     https://api.smm-architect.com/workspaces
```

## Contributing Guidelines

### Pull Request Process
1. **Run full test suite**: `make test && make test-security`
2. **Security validation**: Ensure no RLS bypasses
3. **Performance check**: Validate SLO compliance
4. **Documentation**: Update relevant docs and schemas

### Code Review Requirements
- **Security Review**: Required for all database interactions
- **Architecture Review**: Required for new services or major changes
- **Performance Review**: Required for changes affecting SLOs

### Development Environment
- **Node.js**: 18+ required
- **Database**: Local PostgreSQL 14+ instance
- **IDE**: VS Code with TypeScript and Encore extensions recommended

## Emergency Procedures

### Production Issues
1. **Emergency Pause**: Use workspace emergency flags
2. **Rollback**: Revert to previous workspace contract version
3. **Audit**: Generate audit bundles for compliance review

### Security Incidents
1. **Tenant Isolation**: Verify RLS policies active
2. **Access Review**: Audit recent access patterns
3. **Incident Response**: Follow security incident playbook

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 2024-08-26  
**Version**: 1.0.0  
**Deployment Capability**: Enterprise Scale  
**Platform Grade**: Enterprise Production System

📋 **See [PRODUCTION-READY.md](PRODUCTION-READY.md) for complete deployment readiness overview**