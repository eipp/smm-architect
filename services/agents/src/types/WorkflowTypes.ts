/**
 * Workflow Types
 * Type definitions for workflow execution and task scheduling
 */

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'http_request' | 'database_operation' | 'agent_call' | 'delay' | 'conditional' | 'loop';
  config: Record<string, any>;
  continueOnError: boolean;
  retryPolicy?: {
    maxRetries: number;
    delayMs: number;
    backoffStrategy: 'fixed' | 'exponential';
  };
  timeout?: number;
  dependencies?: string[];
  outputMapping?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version?: string;
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    delayMs: number;
  };
}

export interface WorkflowResult {
  success: boolean;
  workflowId: string;
  executionTime: number;
  stepResults: Record<string, any>;
  context: Record<string, any>;
  error?: string;
  duration?: number;
}

export interface TaskSchedule {
  cronExpression: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  workflowId: string;
  schedule?: TaskSchedule;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface ScheduleResult {
  success: boolean;
  taskId?: string;
  nextRun?: Date;
  message: string;
  error?: string;
}

export interface ExecutionStatus {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration: number;
  progress: number;
  error?: string;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface WorkflowContext {
  workspaceId: string;
  userId?: string;
  sessionId?: string;
  variables: Record<string, any>;
  secrets?: Record<string, string>;
}

