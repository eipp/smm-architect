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
      // Track error metrics with sanitized message
      const sanitizedMessage = 'AI request failed';
      span.setAttribute('ai.status', 'error');
      span.setAttribute('ai.error', sanitizedMessage);

      // Log detailed error internally without exposing sensitive info
      Sentry.captureException(error);

      // Re-throw sanitized error for user-facing handling
      throw new Error(sanitizedMessage);
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
      // Track error metrics with sanitized message
      const sanitizedMessage = 'Agent execution failed';
      span.setAttribute('ai.status', 'error');
      span.setAttribute('ai.error', sanitizedMessage);

      // Capture the original error with context for internal diagnostics
      Sentry.captureException(error, {
        tags: {
          agent: agentName,
          model: modelName,
          task: task
        }
      });

      // Re-throw sanitized error
      throw new Error(sanitizedMessage);
    }
  });
}

module.exports = {
  withAISpan,
  withAgentSpan
};