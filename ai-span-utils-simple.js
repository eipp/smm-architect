const Sentry = require('@sentry/node');

/**
 * Create a span for AI model interactions
 */
async function withAISpan(modelName, operation, callback) {
  return Sentry.startSpan({
    op: 'gen_ai.request',
    name: operation,
  }, async (span) => {
    // Set AI-specific attributes
    span.setAttribute('ai.model', modelName);
    span.setAttribute('ai.operation', operation);
    span.setAttribute('service.name', 'smm-architect');
    
    try {
      const startTime = Date.now();
      const result = await callback(span);
      
      // Track success metrics
      const duration = Date.now() - startTime;
      span.setAttribute('ai.duration_ms', duration);
      span.setAttribute('ai.status', 'success');
      
      return result;
    } catch (error) {
      // Track error metrics
      span.setAttribute('ai.status', 'error');
      span.setAttribute('ai.error', error instanceof Error ? error.message : String(error));
      
      // Re-throw the error for proper error handling
      throw error;
    }
  });
}

/**
 * Create a span for AI agent interactions specifically
 */
async function withAgentSpan(agentName, modelName, task, callback) {
  return Sentry.startSpan({
    op: 'gen_ai.agent',
    name: `${agentName}: ${task}`,
  }, async (span) => {
    // Set agent-specific attributes
    span.setAttribute('ai.model', modelName);
    span.setAttribute('ai.agent', agentName);
    span.setAttribute('ai.task', task);
    span.setAttribute('service.name', 'smm-architect');
    span.setAttribute('service.component', 'agent-layer');
    
    try {
      const startTime = Date.now();
      const result = await callback(span);
      
      // Track success metrics
      const duration = Date.now() - startTime;
      span.setAttribute('ai.duration_ms', duration);
      span.setAttribute('ai.status', 'success');
      
      return result;
    } catch (error) {
      // Track error metrics
      span.setAttribute('ai.status', 'error');
      span.setAttribute('ai.error', error instanceof Error ? error.message : String(error));
      
      // Capture the error for this specific agent
      Sentry.captureException(error, {
        tags: {
          agent: agentName,
          model: modelName,
          task: task
        }
      });
      
      throw error;
    }
  });
}

module.exports = {
  withAISpan,
  withAgentSpan
};