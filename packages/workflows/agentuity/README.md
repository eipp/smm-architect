# Agentuity Job Templates

✅ **Production Ready** - Complete Agentuity agent deployment system for SMM Architect

This directory contains **6 enterprise-grade Agentuity job templates** for all SMM Architect agent types. These templates define complete production configurations for deploying and running autonomous agents in enterprise environments.

## 🎆 Production Status

The SMM Architect platform uses a **complete multi-agent architecture** where specialized agents handle different aspects of social media marketing with full production deployment capability:

- **Research Agent**: Brand intelligence gathering and market research
- **Planner Agent**: Strategic campaign planning and content calendaring  
- **Creative Agent**: AI-powered content creation and asset generation
- **Automation Agent**: Workflow orchestration and scheduling
- **Legal Agent**: Compliance review and risk assessment
- **Publisher Agent**: Content distribution and performance monitoring

## Template Structure

Each agent template includes:

### Core Configuration
- **Runtime Requirements**: Node.js version, memory, timeout, concurrency
- **Triggers**: Webhooks, queues, schedules, and event-driven activation
- **Input/Output Schemas**: Comprehensive JSON schemas for data validation
- **Environment**: Variables, secrets, and external service configurations

### Operational Features
- **Monitoring**: Metrics, health checks, and alerting rules
- **Scaling**: Auto-scaling, load balancing, and resource management
- **Security**: Network policies, resource limits, and access controls
- **Integrations**: ToolHub, Vault, platform APIs, and audit services

## Agent Templates

### 1. Research Agent (`research/research-agent-template.json`)

**Purpose**: Autonomous brand intelligence gathering and competitive analysis

**Key Features**:
- Multi-source data collection (social media, news, press releases, reviews)
- Competitor analysis with similarity scoring
- Market insights and trending topics identification
- Data quality assessment and verification
- Embedding generation for semantic search

**Triggers**:
- Webhook: `/research/start`
- Queue: `research_queue`
- Schedule: Daily at 2 AM UTC

**Performance**:
- Memory: 2GB
- Timeout: 30 minutes
- Concurrency: 3 instances

### 2. Planner Agent (`planner/planner-agent-template.json`)

**Purpose**: Strategic campaign planning and content calendar generation

**Key Features**:
- Goal-based campaign strategy development
- Multi-channel content calendar creation
- Budget allocation and optimization
- Risk assessment and contingency planning
- KPI tracking and milestone scheduling

**Triggers**:
- Webhook: `/planner/generate`
- Queue: `planning_queue`
- Event: `research_completed`

**Performance**:
- Memory: 3GB
- Timeout: 40 minutes
- Concurrency: 3 instances

### 3. Creative Agent (`creative/creative-agent-template.json`)

**Purpose**: AI-powered content creation and asset generation

**Key Features**:
- Multi-format content generation (text, images, videos)
- Brand-consistent asset creation
- Quality scoring and compliance checking
- A/B testing variations
- Content safety and moderation

**Triggers**:
- Webhook: `/creative/generate`
- Queue: `creative_queue`
- Event: `plan_approved`
- Schedule: Every 6 hours

**Performance**:
- Memory: 4GB (GPU-enabled)
- Timeout: 60 minutes
- Concurrency: 5 instances

### 4. Automation Agent (`automation/automation-agent-template.json`)

**Purpose**: Workflow orchestration and content scheduling

**Key Features**:
- Multi-platform posting orchestration
- Optimal timing algorithms
- Rate limit management
- Real-time engagement monitoring
- Error handling and recovery

**Triggers**:
- Webhook: `/automation/execute`
- Queue: `automation_queue`
- Schedule: Every 15 minutes
- Event: `content_approved`

**Performance**:
- Memory: 2GB
- Timeout: 30 minutes
- Concurrency: 10 instances

### 5. Legal Agent (`legal/legal-agent-template.json`)

**Purpose**: Legal compliance review and risk assessment

**Key Features**:
- Multi-jurisdictional compliance checking
- Intellectual property risk assessment
- Platform policy validation
- Regulatory compliance verification
- Legal documentation and audit trails

**Triggers**:
- Webhook: `/legal/review`
- Queue: `legal_review_queue`
- Event: `content_created`
- Event: `plan_requires_legal_review`

**Performance**:
- Memory: 2GB
- Timeout: 15 minutes
- Concurrency: 3 instances

### 6. Publisher Agent (`publisher/publisher-agent-template.json`)

**Purpose**: Content publishing and performance monitoring

**Key Features**:
- Multi-platform content distribution
- Real-time performance analytics
- Engagement monitoring and alerting
- Optimization recommendations
- Viral content detection

**Triggers**:
- Webhook: `/publisher/execute`
- Queue: `publishing_queue`
- Schedule: Every 5 minutes
- Event: `content_approved`

**Performance**:
- Memory: 2GB
- Timeout: 20 minutes
- Concurrency: 8 instances

## Deployment Guide

### Prerequisites

1. **Agentuity Platform**: Configured and running
2. **Vault Integration**: Secrets management setup
3. **ToolHub Service**: Content and vector search API
4. **Platform APIs**: Social media platform credentials

### Deployment Steps

1. **Upload Templates**:
   ```bash
   agentuity template upload research/research-agent-template.json
   agentuity template upload planner/planner-agent-template.json
   agentuity template upload creative/creative-agent-template.json
   agentuity template upload automation/automation-agent-template.json
   agentuity template upload legal/legal-agent-template.json
   agentuity template upload publisher/publisher-agent-template.json
   ```

2. **Configure Secrets**:
   ```bash
   # Set up API keys in Vault
   vault kv put secret/research-agent TOOLHUB_API_KEY=xxx
   vault kv put secret/social-platforms LINKEDIN_API_KEY=xxx
   ```

3. **Deploy Agents**:
   ```bash
   agentuity agent deploy research-agent-v1 --environment production
   agentuity agent deploy planner-agent-v1 --environment production
   # ... repeat for all agents
   ```

4. **Verify Deployment**:
   ```bash
   agentuity agent status --all
   agentuity agent health --all
   ```

## Configuration

### Environment Variables

Common environment variables across all agents:

```env
TOOLHUB_API_ENDPOINT=https://toolhub.smm-architect.com
VAULT_ADDR=https://vault.smm-architect.com
NODE_ENV=production
LOG_LEVEL=info
```

### Secrets Management

All sensitive credentials are stored in Vault:

```bash
# Research Agent
secret/research-agent/
├── TOOLHUB_API_KEY
├── SOCIAL_MEDIA_API_KEYS
├── NEWS_API_KEY
└── SERPAPI_KEY

# Creative Agent
secret/creative-agent/
├── OPENAI_API_KEY
├── MIDJOURNEY_API_KEY
├── STABILITY_AI_KEY
└── CONTENT_STORAGE_CREDENTIALS
```

## Monitoring

### Key Metrics

Each agent exposes standardized metrics:

- **Execution Metrics**: Success rate, duration, concurrency
- **Business Metrics**: Content quality, engagement rates, compliance scores
- **System Metrics**: CPU, memory, error rates, API quotas

### Alerting

Critical alerts are configured for:

- High error rates (>10%)
- Performance degradation
- Compliance violations
- Resource exhaustion
- Security incidents

### Dashboards

Grafana dashboards are available for:

- Agent performance overview
- Campaign execution status
- Content performance analytics
- System health monitoring

## Security

### Network Policies

All agents are configured with strict egress policies:

- Internal services: ToolHub, Vault, Audit service
- External APIs: Only required social media platforms
- No unrestricted internet access

### Resource Limits

Resource constraints prevent resource exhaustion:

- CPU and memory limits
- Network request quotas
- File size restrictions
- Execution timeouts

### Data Classification

Agents handle different data sensitivity levels:

- **Public**: Content and metrics
- **Internal**: Brand intelligence and strategies
- **Confidential**: Legal reviews and compliance data
- **Restricted**: API credentials and tokens

## Troubleshooting

### Common Issues

1. **Agent Startup Failures**:
   - Check Vault connectivity
   - Verify secret availability
   - Review resource allocation

2. **API Rate Limiting**:
   - Monitor rate limit metrics
   - Adjust concurrency settings
   - Implement backoff strategies

3. **Content Quality Issues**:
   - Review training data quality
   - Adjust creativity parameters
   - Update brand guidelines

### Debugging

Enable debug logging:

```bash
agentuity agent update research-agent-v1 --env LOG_LEVEL=debug
```

Access agent logs:

```bash
agentuity agent logs research-agent-v1 --tail 100
```

## Best Practices

### Template Customization

1. **Environment-Specific Values**: Use environment variables for configuration
2. **Resource Sizing**: Monitor usage and adjust memory/CPU allocations
3. **Timeout Configuration**: Set appropriate timeouts for workload characteristics
4. **Retry Logic**: Configure retry attempts based on failure patterns

### Performance Optimization

1. **Concurrency Tuning**: Balance throughput with resource usage
2. **Caching Strategies**: Implement caching for frequently accessed data
3. **Batch Processing**: Group operations to reduce overhead
4. **Connection Pooling**: Reuse database and API connections

### Security Hardening

1. **Principle of Least Privilege**: Grant minimal required permissions
2. **Regular Secret Rotation**: Implement automated credential rotation
3. **Audit Logging**: Enable comprehensive audit trails
4. **Vulnerability Scanning**: Regular security assessments

## Support

### Documentation

- [Agentuity Platform Docs](https://docs.agentuity.com)
- [SMM Architect API Reference](../../docs/api-reference.md)
- [Agent Development Guide](../../docs/agent-development.md)

### Community

- [GitHub Discussions](https://github.com/yourorg/smm-architect/discussions)
- [Slack Channel](https://smmarchitect.slack.com)
- [Support Email](mailto:support@smmarchitect.com)

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Maintainer**: SMM Architect Team