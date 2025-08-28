/**
 * Automation Agent
 * Handles campaign workflow automation, scheduling, and execution monitoring
 */

import { AgentInterface, AgentCapability, AgentMetadata } from '../src/interfaces/AgentInterface';
import { WorkflowDefinition, WorkflowResult, TaskDefinition, ScheduleResult, ExecutionStatus } from '../src/types/WorkflowTypes';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';

export interface AutomationConfig {
  maxConcurrentWorkflows: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  schedulerEnabled: boolean;
  healthCheckInterval: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: WorkflowResult;
  error?: string;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  workflowId: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  failureCount: number;
  metadata: Record<string, any>;
}

export class AutomationAgent implements AgentInterface {
  public readonly metadata: AgentMetadata = {
    name: 'AutomationAgent',
    version: '1.0.0',
    description: 'Handles campaign workflow automation and scheduling',
    capabilities: [
      AgentCapability.WORKFLOW_EXECUTION,
      AgentCapability.TASK_SCHEDULING,
      AgentCapability.MONITORING,
      AgentCapability.ERROR_HANDLING
    ],
    dependencies: ['WorkflowEngine', 'TaskScheduler', 'MonitoringService']
  };

  private config: AutomationConfig;
  private logger: Logger;
  private eventEmitter: EventEmitter;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning: boolean = false;

  constructor(config: AutomationConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Initialize the automation agent
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Automation Agent');

      // Set up event listeners
      this.setupEventListeners();

      // Start health check if enabled
      if (this.config.healthCheckInterval > 0) {
        setInterval(() => this.performHealthCheck(), this.config.healthCheckInterval);
      }

      this.isRunning = true;
      this.logger.info('Automation Agent initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Automation Agent', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow: WorkflowDefinition, context?: Record<string, any>): Promise<WorkflowResult> {
    const executionId = uuidv4();
    
    this.logger.info('Starting workflow execution', {
      executionId,
      workflowId: workflow.id,
      workflowName: workflow.name
    });

    // Check concurrent workflow limit
    const runningExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running').length;

    if (runningExecutions >= this.config.maxConcurrentWorkflows) {
      throw new Error(`Maximum concurrent workflows limit reached: ${this.config.maxConcurrentWorkflows}`);
    }

    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0,
      metadata: context || {}
    };

    this.executions.set(executionId, execution);

    try {
      // Update status to running
      execution.status = 'running';
      this.eventEmitter.emit('execution_started', execution);

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflow, context);

      // Update execution with result
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;

      this.eventEmitter.emit('execution_completed', execution);

      this.logger.info('Workflow execution completed successfully', {
        executionId,
        workflowId: workflow.id,
        duration: execution.endTime.getTime() - execution.startTime.getTime()
      });

      return result;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);

      this.eventEmitter.emit('execution_failed', execution);

      this.logger.error('Workflow execution failed', {
        executionId,
        workflowId: workflow.id,
        error: execution.error
      });

      // Retry if configured
      if (execution.retryCount < this.config.retryAttempts) {
        return this.retryWorkflowExecution(workflow, execution, context);
      }

      throw error;
    }
  }

  /**
   * Schedule a task for repeated execution
   */
  async scheduleTask(task: TaskDefinition): Promise<ScheduleResult> {
    if (!this.config.schedulerEnabled) {
      throw new Error('Task scheduler is disabled');
    }

    this.logger.info('Scheduling task', {
      taskId: task.id,
      taskName: task.name,
      cronExpression: task.schedule?.cronExpression
    });

    try {
      const scheduledTask: ScheduledTask = {
        id: task.id,
        name: task.name,
        description: task.description || '',
        cronExpression: task.schedule?.cronExpression || '0 0 * * *', // Default: daily at midnight
        workflowId: task.workflowId,
        enabled: task.enabled !== false,
        runCount: 0,
        failureCount: 0,
        metadata: task.metadata || {}
      };

      // Validate cron expression
      if (!cron.validate(scheduledTask.cronExpression)) {
        throw new Error(`Invalid cron expression: ${scheduledTask.cronExpression}`);
      }

      // Create cron job
      const cronJob = cron.schedule(scheduledTask.cronExpression, async () => {
        await this.executeScheduledTask(scheduledTask);
      }, {
        scheduled: false, // Don't start immediately
        timezone: task.schedule?.timezone || 'UTC'
      });

      // Store task and job
      this.scheduledTasks.set(task.id, scheduledTask);
      this.cronJobs.set(task.id, cronJob);

      // Start the job if enabled
      if (scheduledTask.enabled) {
        cronJob.start();
        scheduledTask.nextRun = this.getNextRunTime(scheduledTask.cronExpression);
      }

      this.logger.info('Task scheduled successfully', {
        taskId: task.id,
        nextRun: scheduledTask.nextRun
      });

      return {
        success: true,
        taskId: task.id,
        nextRun: scheduledTask.nextRun,
        message: 'Task scheduled successfully'
      };

    } catch (error) {
      this.logger.error('Failed to schedule task', {
        taskId: task.id,
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        taskId: task.id,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Monitor workflow execution status
   */
  async monitorExecution(executionId: string): Promise<ExecutionStatus> {
    const execution = this.executions.get(executionId);

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    return {
      id: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      startTime: execution.startTime.toISOString(),
      endTime: execution.endTime?.toISOString(),
      duration: execution.endTime ? 
        execution.endTime.getTime() - execution.startTime.getTime() : 
        Date.now() - execution.startTime.getTime(),
      progress: this.calculateExecutionProgress(execution),
      error: execution.error,
      retryCount: execution.retryCount,
      metadata: execution.metadata
    };
  }

  /**
   * Get all scheduled tasks
   */
  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Enable/disable a scheduled task
   */
  async toggleScheduledTask(taskId: string, enabled: boolean): Promise<void> {
    const task = this.scheduledTasks.get(taskId);
    const cronJob = this.cronJobs.get(taskId);

    if (!task || !cronJob) {
      throw new Error(`Scheduled task not found: ${taskId}`);
    }

    task.enabled = enabled;

    if (enabled) {
      cronJob.start();
      task.nextRun = this.getNextRunTime(task.cronExpression);
    } else {
      cronJob.stop();
      task.nextRun = undefined;
    }

    this.logger.info('Scheduled task toggled', {
      taskId,
      enabled,
      nextRun: task.nextRun
    });
  }

  /**
   * Remove a scheduled task
   */
  async removeScheduledTask(taskId: string): Promise<void> {
    const cronJob = this.cronJobs.get(taskId);

    if (cronJob) {
      cronJob.stop();
      cronJob.stop();
      this.cronJobs.delete(taskId);
    }

    this.scheduledTasks.delete(taskId);

    this.logger.info('Scheduled task removed', { taskId });
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    averageDuration: number;
  } {
    const executions = Array.from(this.executions.values());
    const completed = executions.filter(e => e.status === 'completed');
    const failed = executions.filter(e => e.status === 'failed');
    const running = executions.filter(e => e.status === 'running');

    const totalDuration = completed.reduce((sum, exec) => {
      return sum + (exec.endTime!.getTime() - exec.startTime.getTime());
    }, 0);

    return {
      total: executions.length,
      running: running.length,
      completed: completed.length,
      failed: failed.length,
      averageDuration: completed.length > 0 ? totalDuration / completed.length : 0
    };
  }

  /**
   * Shutdown the agent gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Automation Agent');

    this.isRunning = false;

    // Stop all cron jobs
    for (const [taskId, cronJob] of this.cronJobs) {
      cronJob.stop();
      cronJob.stop();
    }

    // Cancel running executions
    for (const execution of this.executions.values()) {
      if (execution.status === 'running') {
        execution.status = 'cancelled';
        execution.endTime = new Date();
      }
    }

    this.logger.info('Automation Agent shutdown completed');
  }

  // Private helper methods

  private async executeWorkflowSteps(workflow: WorkflowDefinition, context?: Record<string, any>): Promise<WorkflowResult> {
    const stepResults: Record<string, any> = {};
    let currentContext = { ...context };

    for (const step of workflow.steps) {
      this.logger.debug('Executing workflow step', {
        workflowId: workflow.id,
        stepId: step.id,
        stepName: step.name
      });

      try {
        // Execute step based on type
        const stepResult = await this.executeStep(step, currentContext);
        stepResults[step.id] = stepResult;

        // Update context with step results
        if (step.outputMapping) {
          Object.assign(currentContext, step.outputMapping);
        }

      } catch (error) {
        if (step.continueOnError) {
          this.logger.warn('Step failed but continuing', {
            stepId: step.id,
            error: error instanceof Error ? error.message : error
          });
          stepResults[step.id] = { error: error instanceof Error ? error.message : error };
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      workflowId: workflow.id,
      executionTime: Date.now(),
      stepResults,
      context: currentContext
    };
  }

  private async executeStep(step: any, context: Record<string, any>): Promise<any> {
    // Implementation would call appropriate service based on step type
    // This is a simplified version
    switch (step.type) {
      case 'http_request':
        return this.executeHttpRequest(step, context);
      case 'database_operation':
        return this.executeDatabaseOperation(step, context);
      case 'agent_call':
        return this.executeAgentCall(step, context);
      case 'delay':
        return this.executeDelay(step);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeHttpRequest(step: any, context: Record<string, any>): Promise<any> {
    // HTTP request implementation
    return { status: 'completed', response: 'Mock HTTP response' };
  }

  private async executeDatabaseOperation(step: any, context: Record<string, any>): Promise<any> {
    // Database operation implementation
    return { status: 'completed', rowsAffected: 1 };
  }

  private async executeAgentCall(step: any, context: Record<string, any>): Promise<any> {
    // Agent call implementation
    return { status: 'completed', agentResponse: 'Mock agent response' };
  }

  private async executeDelay(step: any): Promise<any> {
    const delay = step.config?.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    return { status: 'completed', delayed: delay };
  }

  private async retryWorkflowExecution(
    workflow: WorkflowDefinition, 
    execution: WorkflowExecution, 
    context?: Record<string, any>
  ): Promise<WorkflowResult> {
    execution.retryCount++;
    execution.status = 'pending';

    this.logger.info('Retrying workflow execution', {
      executionId: execution.id,
      retryCount: execution.retryCount,
      maxRetries: this.config.retryAttempts
    });

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    return this.executeWorkflow(workflow, context);
  }

  private async executeScheduledTask(task: ScheduledTask): Promise<void> {
    try {
      task.lastRun = new Date();
      task.runCount++;

      this.logger.info('Executing scheduled task', {
        taskId: task.id,
        taskName: task.name,
        runCount: task.runCount
      });

      // Get workflow definition
      const workflow = this.workflows.get(task.workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${task.workflowId}`);
      }

      // Execute workflow
      await this.executeWorkflow(workflow, task.metadata);

      // Update next run time
      task.nextRun = this.getNextRunTime(task.cronExpression);

    } catch (error) {
      task.failureCount++;
      this.logger.error('Scheduled task execution failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : error,
        failureCount: task.failureCount
      });

      // Disable task after too many failures
      if (task.failureCount >= 5) {
        await this.toggleScheduledTask(task.id, false);
        this.logger.warn('Scheduled task disabled due to repeated failures', {
          taskId: task.id,
          failureCount: task.failureCount
        });
      }
    }
  }

  private calculateExecutionProgress(execution: WorkflowExecution): number {
    // Simplified progress calculation
    if (execution.status === 'completed') return 100;
    if (execution.status === 'failed' || execution.status === 'cancelled') return 0;
    if (execution.status === 'running') return 50; // Mock progress
    return 0;
  }

  private getNextRunTime(cronExpression: string): Date {
    // Simple calculation - in practice you'd use a proper cron parser
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day (simplified)
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('execution_started', (execution) => {
      this.logger.debug('Workflow execution started', { executionId: execution.id });
    });

    this.eventEmitter.on('execution_completed', (execution) => {
      this.logger.debug('Workflow execution completed', { executionId: execution.id });
    });

    this.eventEmitter.on('execution_failed', (execution) => {
      this.logger.debug('Workflow execution failed', { executionId: execution.id });
    });
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const stats = this.getExecutionStats();
      
      this.logger.debug('Automation Agent health check', {
        isRunning: this.isRunning,
        totalExecutions: stats.total,
        runningExecutions: stats.running,
        scheduledTasks: this.scheduledTasks.size,
        activeCronJobs: this.cronJobs.size
      });

      // Clean up old executions to prevent memory leaks
      this.cleanupOldExecutions();

    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private cleanupOldExecutions(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = new Date(Date.now() - maxAge);

    for (const [id, execution] of this.executions) {
      if (execution.endTime && execution.endTime < cutoff) {
        this.executions.delete(id);
      }
    }
  }
}

export default AutomationAgent;