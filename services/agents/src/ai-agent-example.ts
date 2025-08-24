import { withAISpan, withAgentSpan } from '../../shared/sentry-utils';
import * as Sentry from '@sentry/node';

// Example AI service interface
interface AIResponse {
  content: string;
  tokensUsed?: number;
  model: string;
  finishReason?: string;
}

interface AgentContext {
  agentName: string;
  userId?: string;
  workspaceId?: string;
  sessionId?: string;
}

/**
 * Example function showing how to track AI model calls with Sentry
 */
export async function generateTextWithTracking(
  prompt: string,
  modelName: string = 'gpt-4o',
  context?: AgentContext
): Promise<AIResponse> {
  return withAISpan(modelName, 'Generate Text', async (span) => {
    // Add additional context to the span
    span.setAttribute('ai.prompt_length', prompt.length);
    span.setAttribute('ai.prompt_type', 'text_generation');
    
    if (context) {
      span.setAttribute('user.id', context.userId || 'anonymous');
      span.setAttribute('workspace.id', context.workspaceId || 'default');
      span.setAttribute('session.id', context.sessionId || 'unknown');
    }
    
    try {
      // Simulate AI API call (replace with your actual AI service)
      const response = await simulateAICall(prompt, modelName);
      
      // Track response metrics
      span.setAttribute('ai.tokens_used', response.tokensUsed || 0);
      span.setAttribute('ai.response_length', response.content.length);
      span.setAttribute('ai.finish_reason', response.finishReason || 'complete');
      
      return response;
    } catch (error) {
      // The span will automatically track the error
      // Additional error context can be added here
      span.setAttribute('ai.error_type', error instanceof Error ? error.constructor.name : 'unknown');
      throw error;
    }
  });
}

/**
 * Example function showing how to track agent-specific operations
 */
export async function executeAgentTask(
  task: string,
  input: any,
  agentName: string = 'creative-agent',
  modelName: string = 'gpt-4o'
): Promise<any> {
  return withAgentSpan(agentName, modelName, task, async (span) => {
    // Add task-specific attributes
    span.setAttribute('agent.task_type', task);
    span.setAttribute('agent.input_size', JSON.stringify(input).length);
    
    try {
      let result;
      
      // Different task types for different agents
      switch (task) {
        case 'research':
          result = await performResearch(input, span);
          break;
        case 'create_content':
          result = await createContent(input, span);
          break;
        case 'analyze_sentiment':
          result = await analyzeSentiment(input, span);
          break;
        default:
          throw new Error(`Unknown task type: ${task}`);
      }
      
      // Track result metrics
      span.setAttribute('agent.result_size', JSON.stringify(result).length);
      span.setAttribute('agent.task_success', true);
      
      return result;
    } catch (error) {
      span.setAttribute('agent.task_success', false);
      throw error;
    }
  });
}

/**
 * Example function showing multi-step agent workflow with nested spans
 */
export async function executeMultiStepWorkflow(
  workflowName: string,
  steps: Array<{ agent: string; task: string; input: any }>,
  modelName: string = 'gpt-4o'
): Promise<any[]> {
  return Sentry.startSpan({
    op: 'gen_ai.workflow',
    name: `Multi-Agent Workflow: ${workflowName}`,
  }, async (workflowSpan) => {
    workflowSpan.setAttribute('workflow.name', workflowName);
    workflowSpan.setAttribute('workflow.steps_count', steps.length);
    
    const results: any[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      try {
        const stepResult = await withAgentSpan(
          step.agent,
          modelName,
          step.task,
          async (stepSpan) => {
            stepSpan.setAttribute('workflow.step_index', i);
            stepSpan.setAttribute('workflow.step_name', `${step.agent}-${step.task}`);
            
            // Execute the step (replace with actual implementation)
            return executeAgentTask(step.task, step.input, step.agent, modelName);
          }
        );\n        \n        results.push(stepResult);\n        workflowSpan.setAttribute(`workflow.step_${i}_status`, 'success');\n        \n      } catch (error) {\n        workflowSpan.setAttribute(`workflow.step_${i}_status`, 'failed');\n        workflowSpan.setAttribute(`workflow.step_${i}_error`, error instanceof Error ? error.message : String(error));\n        \n        // Decide whether to continue or abort the workflow\n        throw error; // For now, abort on any error\n      }\n    }\n    \n    workflowSpan.setAttribute('workflow.completed_steps', results.length);\n    workflowSpan.setAttribute('workflow.status', 'completed');\n    \n    return results;\n  });\n}\n\n// Helper functions (replace with your actual implementations)\n\nasync function simulateAICall(prompt: string, model: string): Promise<AIResponse> {\n  // Simulate AI API call delay\n  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));\n  \n  // Simulate potential errors (5% chance)\n  if (Math.random() < 0.05) {\n    throw new Error('AI API rate limit exceeded');\n  }\n  \n  return {\n    content: `Generated response for: ${prompt.substring(0, 50)}...`,\n    tokensUsed: Math.floor(Math.random() * 1000) + 100,\n    model,\n    finishReason: 'complete'\n  };\n}\n\nasync function performResearch(input: any, span: Sentry.Span): Promise<any> {\n  span.setAttribute('research.topic', input.topic || 'unknown');\n  span.setAttribute('research.depth', input.depth || 'standard');\n  \n  // Simulate research task\n  await new Promise(resolve => setTimeout(resolve, 800));\n  \n  return {\n    findings: [`Research result for ${input.topic}`],\n    sources: ['source1.com', 'source2.com'],\n    confidence: 0.85\n  };\n}\n\nasync function createContent(input: any, span: Sentry.Span): Promise<any> {\n  span.setAttribute('content.type', input.type || 'text');\n  span.setAttribute('content.length_target', input.targetLength || 'medium');\n  \n  // Simulate content creation\n  await new Promise(resolve => setTimeout(resolve, 1200));\n  \n  return {\n    content: `Created ${input.type} content`,\n    wordCount: 250,\n    sentiment: 'positive'\n  };\n}\n\nasync function analyzeSentiment(input: any, span: Sentry.Span): Promise<any> {\n  span.setAttribute('sentiment.text_length', input.text?.length || 0);\n  \n  // Simulate sentiment analysis\n  await new Promise(resolve => setTimeout(resolve, 300));\n  \n  return {\n    sentiment: 'positive',\n    confidence: 0.92,\n    emotions: ['joy', 'excitement']\n  };\n}