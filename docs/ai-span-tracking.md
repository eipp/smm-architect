# AI Span Tracking with Sentry - SMM Architect

This document explains how to implement AI span tracking in the SMM Architect platform using Sentry for comprehensive monitoring of AI model interactions across your multi-agent system.

## Overview

AI span tracking allows you to:
- Monitor AI model performance and latency
- Track token usage and costs
- Identify bottlenecks in AI workflows
- Debug AI-related errors
- Analyze agent performance patterns
- Monitor multi-agent workflow efficiency

## Quick Start

### Basic AI Span Tracking

```typescript
import { withAISpan } from '../shared/sentry-utils';

const result = await withAISpan('gpt-4o', 'Generate Text', async (span) => {
  // Add custom attributes
  span.setAttribute('ai.prompt_length', prompt.length);
  span.setAttribute('ai.temperature', 0.7);
  
  // Call your AI service
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });
  
  // Track response metrics
  span.setAttribute('ai.tokens_used', response.usage?.total_tokens || 0);
  span.setAttribute('ai.finish_reason', response.choices[0]?.finish_reason);
  
  return response.choices[0]?.message?.content;
});
```

### Agent-Specific Tracking

```typescript
import { withAgentSpan } from '../shared/sentry-utils';

const result = await withAgentSpan(
  'creative-agent',
  'gpt-4o', 
  'Create Social Media Post',
  async (span) => {
    // Agent-specific attributes
    span.setAttribute('agent.platform', 'twitter');
    span.setAttribute('agent.content_type', 'promotional');
    
    // Your agent logic here
    return await generateSocialMediaPost(request);
  }
);
```

## Available Utilities

### `withAISpan(modelName, operation, callback)`

Tracks general AI model interactions.

**Parameters:**
- `modelName` (string): The AI model being used (e.g., 'gpt-4o', 'claude-3')
- `operation` (string): Description of the operation (e.g., 'Generate Text', 'Analyze Sentiment')
- `callback` (function): Async function containing your AI logic

**Automatically tracked attributes:**
- `ai.model`: The model name
- `ai.operation`: The operation description
- `ai.duration_ms`: Time taken for the operation
- `ai.status`: 'success' or 'error'
- `service.name`: 'smm-architect'

### `withAgentSpan(agentName, modelName, task, callback)`

Tracks agent-specific AI interactions with additional context.

**Parameters:**
- `agentName` (string): Name of the agent (e.g., 'creative-agent', 'research-agent')
- `modelName` (string): The AI model being used
- `task` (string): The specific task being performed
- `callback` (function): Async function containing your agent logic

**Automatically tracked attributes:**
- All attributes from `withAISpan`
- `ai.agent`: The agent name
- `ai.task`: The task description
- `service.component`: 'agent-layer'

## Best Practices

### 1. Add Meaningful Attributes

```typescript
await withAISpan('gpt-4o', 'Generate Content', async (span) => {
  // Context attributes
  span.setAttribute('user.id', userId);
  span.setAttribute('workspace.id', workspaceId);
  span.setAttribute('campaign.id', campaignId);
  
  // Input attributes
  span.setAttribute('ai.prompt_tokens', estimateTokens(prompt));
  span.setAttribute('ai.temperature', temperature);
  span.setAttribute('ai.max_tokens', maxTokens);
  
  // Content-specific attributes
  span.setAttribute('content.platform', 'twitter');
  span.setAttribute('content.type', 'promotional');
  
  const result = await generateContent(prompt);
  
  // Output attributes
  span.setAttribute('ai.output_tokens', result.usage.total_tokens);
  span.setAttribute('ai.output_length', result.content.length);
  span.setAttribute('content.hashtag_count', extractHashtags(result.content).length);
  
  return result;
});
```

### 2. Track Multi-Step Workflows

```typescript
import * as Sentry from '@sentry/node';

await Sentry.startSpan({
  op: 'gen_ai.campaign_workflow',
  name: 'Complete Campaign Creation',
}, async (workflowSpan) => {
  workflowSpan.setAttribute('workflow.campaign_type', 'product_launch');
  
  // Step 1: Research
  const research = await withAgentSpan(
    'research-agent', 'gpt-4o', 'market_analysis',
    async (span) => {
      span.setAttribute('research.market', targetMarket);
      return await analyzeMarket(targetMarket);
    }
  );
  
  // Step 2: Content Creation
  const content = await withAgentSpan(
    'creative-agent', 'gpt-4o', 'content_generation',
    async (span) => {
      span.setAttribute('content.based_on_research', true);
      return await createContent(research);
    }
  );
  
  workflowSpan.setAttribute('workflow.steps_completed', 2);
  return { research, content };
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await withAISpan('gpt-4o', 'Generate Content', async (span) => {
    // Add error context
    span.setAttribute('retry.attempt', retryCount);
    span.setAttribute('ai.fallback_available', true);
    
    return await aiService.generate(prompt);
  });
} catch (error) {
  // Error is automatically tracked by the span
  // Handle fallback logic here
  if (error.message.includes('rate limit')) {
    return await fallbackToAlternativeModel();
  }
  throw error;
}
```

## Integration Examples

### Research Agent

```typescript
// services/agents/research-agent/src/research.ts
import { withAgentSpan } from '../../shared/sentry-utils';

export async function performMarketResearch(
  topic: string,
  depth: 'basic' | 'detailed' = 'basic'
): Promise<ResearchResult> {
  return withAgentSpan('research-agent', 'gpt-4o', 'market_research', async (span) => {
    span.setAttribute('research.topic', topic);
    span.setAttribute('research.depth', depth);
    span.setAttribute('research.sources_limit', depth === 'detailed' ? 20 : 10);
    
    const prompt = buildResearchPrompt(topic, depth);
    const analysis = await callAI(prompt);
    
    span.setAttribute('research.findings_count', analysis.findings.length);
    span.setAttribute('research.confidence_score', analysis.confidence);
    
    return analysis;
  });
}
```

### Creative Agent

```typescript
// services/agents/creative-agent/src/content.ts
import { withAgentSpan } from '../../shared/sentry-utils';

export async function generateSocialMediaPost(
  request: ContentRequest
): Promise<GeneratedContent> {
  return withAgentSpan('creative-agent', 'gpt-4o', 'social_media_generation', async (span) => {
    span.setAttribute('content.platform', request.platform);
    span.setAttribute('content.tone', request.tone);
    span.setAttribute('content.target_length', request.targetLength);
    span.setAttribute('content.include_hashtags', request.includeHashtags);
    
    const content = await generateContent(request);
    
    span.setAttribute('content.actual_length', content.text.length);
    span.setAttribute('content.hashtag_count', content.hashtags.length);
    span.setAttribute('content.media_required', content.requiresMedia);
    
    return content;
  });
}
```

### SMM Architect Service Integration

```typescript
// services/smm-architect/src/campaign/content-generation.ts
import { withAISpan } from '../../shared/sentry-utils';

export async function generateCampaignContent(
  campaignId: string,
  requirements: ContentRequirements
): Promise<CampaignContent> {
  return withAISpan('gpt-4o', 'Campaign Content Generation', async (span) => {
    // Campaign context
    span.setAttribute('campaign.id', campaignId);
    span.setAttribute('campaign.platforms', requirements.platforms.join(','));
    span.setAttribute('campaign.content_pieces', requirements.contentCount);
    
    // Generate content for each platform
    const content = {};
    for (const platform of requirements.platforms) {
      content[platform] = await withAgentSpan(
        'creative-agent',
        'gpt-4o',
        `generate_${platform}_content`,
        async (platformSpan) => {
          platformSpan.setAttribute('platform.name', platform);
          return await generatePlatformContent(platform, requirements);
        }
      );
    }
    
    span.setAttribute('generation.success_rate', 
      Object.keys(content).length / requirements.platforms.length);
    
    return content;
  });
}
```

## Monitoring and Alerts

### Sentry Dashboard Queries

Use these queries in your Sentry dashboard to monitor AI performance:

```sql
-- Average AI response time by model
SELECT ai.model, AVG(ai.duration_ms) as avg_duration_ms
FROM spans 
WHERE op = 'gen_ai.request'
GROUP BY ai.model

-- Error rate by agent
SELECT ai.agent, 
       COUNT(*) as total_requests,
       SUM(CASE WHEN ai.status = 'error' THEN 1 ELSE 0 END) as errors,
       SUM(CASE WHEN ai.status = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
FROM spans 
WHERE op = 'gen_ai.agent'
GROUP BY ai.agent

-- Token usage by operation
SELECT ai.operation, 
       SUM(ai.tokens_used) as total_tokens,
       AVG(ai.tokens_used) as avg_tokens
FROM spans 
WHERE ai.tokens_used IS NOT NULL
GROUP BY ai.operation
```

### Recommended Alerts

1. **High Error Rate**: Alert when AI error rate > 5% in 5 minutes
2. **Slow Response**: Alert when average AI response time > 10 seconds
3. **High Token Usage**: Alert when hourly token usage exceeds budget
4. **Agent Failures**: Alert when specific agent fails > 3 times in 10 minutes

## Testing

Run the test script to verify your AI span tracking:

```bash
cd /Users/ivan/smm-architect
node ai-span-tracking-test.js
```

This will:
- Test basic AI span functionality
- Test agent-specific tracking
- Test error handling
- Test multi-step workflows
- Send test data to your Sentry dashboard

## Troubleshooting

### Common Issues

1. **Spans not appearing in Sentry**
   - Verify Sentry DSN is configured correctly
   - Check that `instrument.js` is imported first
   - Ensure sample rates are > 0 for development

2. **Missing attributes**
   - Call `span.setAttribute()` before the span completes
   - Ensure attribute values are strings, numbers, or booleans

3. **Performance impact**
   - Reduce sample rates in production (0.1 or lower)
   - Avoid adding too many attributes per span
   - Use async spans to avoid blocking

### Debug Mode

Enable debug mode to see span creation:

```typescript
// In your Sentry configuration
Sentry.init({
  // ... other config
  debug: true,
  tracesSampleRate: 1.0, // Only for development
});
```

## Cost Optimization

Track and optimize AI costs using span data:

```typescript
// Add cost tracking to spans
span.setAttribute('ai.cost_usd', calculateCost(tokens, model));
span.setAttribute('ai.cost_center', 'marketing_campaigns');
span.setAttribute('ai.budget_category', 'content_generation');
```

## Next Steps

1. Implement AI span tracking in all agent services
2. Set up Sentry alerts for your team
3. Create custom dashboards for AI performance monitoring
4. Implement cost tracking and budgeting
5. Use insights to optimize agent workflows

---

## Related Documentation

- [Sentry Setup Complete](./sentry-setup-complete.md)
- [SMM Architect Architecture](../README.md)
- [Agent Development Guide](./agent-development.md)
- [Performance Monitoring](./performance-monitoring.md)