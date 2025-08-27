import { EventEmitter } from 'events';
import { ResearchAgent } from './research-agent';
import { CreativeAgent } from './creative-agent';
import { LegalAgent } from './legal-agent';

export interface WorkflowRequest {
  workspaceId: string;
  campaignId: string;
  workflowType: 'full_campaign' | 'content_creation' | 'compliance_check' | 'optimization';
  parameters: {
    domain?: string;
    industry?: string;
    platforms: string[];
    objectives: string[];
    timeline: string;
    budget?: number;
  };
  scheduling?: {
    startDate: Date;
    frequency: 'daily' | 'weekly' | 'monthly';
    duration: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  agent: 'research' | 'creative' | 'legal' | 'publisher';
  dependencies: string[];
  parameters: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workspaceId: string;
  campaignId: string;
  workflowType: string;
  steps: WorkflowStep[];
  status: 'created' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  results: {
    research?: any;
    creative?: any;
    legal?: any;
    publisher?: any;
  };
}

export class AutomationAgent extends EventEmitter {
  private researchAgent: ResearchAgent;
  private creativeAgent: CreativeAgent;
  private legalAgent: LegalAgent;
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();

  constructor() {
    super();
    this.researchAgent = new ResearchAgent();
    this.creativeAgent = new CreativeAgent();
    this.legalAgent = new LegalAgent();
  }

  async executeWorkflow(request: WorkflowRequest): Promise<WorkflowExecution> {
    const workflowId = `workflow_${Date.now()}`;
    
    const execution: WorkflowExecution = {
      id: workflowId,
      workspaceId: request.workspaceId,
      campaignId: request.campaignId,
      workflowType: request.workflowType,
      steps: this.createWorkflowSteps(request),
      status: 'created',
      progress: 0,
      startedAt: new Date(),
      results: {}
    };

    this.activeWorkflows.set(workflowId, execution);
    
    try {
      execution.status = 'running';
      await this.processWorkflowSteps(execution);
      execution.status = 'completed';
      execution.completedAt = new Date();
      
      this.emit('workflowCompleted', execution);
      return execution;
      
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  private createWorkflowSteps(request: WorkflowRequest): WorkflowStep[] {
    const steps: WorkflowStep[] = [];

    if (request.workflowType === 'full_campaign') {
      steps.push(
        {
          id: 'research',
          name: 'Market Research',
          agent: 'research',
          dependencies: [],
          parameters: {
            domain: request.parameters.domain,
            industry: request.parameters.industry,
            researchType: 'comprehensive'
          },
          status: 'pending'
        },
        {
          id: 'creative',
          name: 'Creative Development',
          agent: 'creative',
          dependencies: ['research'],
          parameters: {
            campaignType: 'brand_awareness',
            platforms: request.parameters.platforms,
            objectives: request.parameters.objectives
          },
          status: 'pending'
        },
        {
          id: 'legal',
          name: 'Compliance Review',
          agent: 'legal',
          dependencies: ['creative'],
          parameters: {
            industry: request.parameters.industry
          },
          status: 'pending'
        },
        {
          id: 'publish',
          name: 'Content Publishing',
          agent: 'publisher',
          dependencies: ['legal'],
          parameters: {
            platforms: request.parameters.platforms,
            scheduling: request.scheduling
          },
          status: 'pending'
        }
      );
    }

    return steps;
  }

  private async processWorkflowSteps(execution: WorkflowExecution): Promise<void> {
    const totalSteps = execution.steps.length;
    let completedSteps = 0;

    while (completedSteps < totalSteps) {
      const readySteps = execution.steps.filter(step => 
        step.status === 'pending' && 
        step.dependencies.every(dep => 
          execution.steps.find(s => s.id === dep)?.status === 'completed'
        )
      );

      if (readySteps.length === 0) {
        throw new Error('Workflow deadlock: no ready steps available');
      }

      await Promise.all(readySteps.map(step => this.executeStep(step, execution)));
      
      completedSteps = execution.steps.filter(s => s.status === 'completed').length;
      execution.progress = (completedSteps / totalSteps) * 100;
      
      this.emit('workflowProgress', { workflowId: execution.id, progress: execution.progress });
    }
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    try {
      step.status = 'running';
      
      switch (step.agent) {
        case 'research':
          step.result = await this.researchAgent.conductResearch({
            workspaceId: execution.workspaceId,
            ...step.parameters
          });
          execution.results.research = step.result;
          break;
          
        case 'creative':
          step.result = await this.creativeAgent.generateCreativeConcepts({
            workspaceId: execution.workspaceId,
            ...step.parameters
          });
          execution.results.creative = step.result;
          break;
          
        case 'legal':
          // Review each creative idea
          const creativeResult = execution.results.creative;
          if (creativeResult?.ideas) {
            step.result = await Promise.all(
              creativeResult.ideas.map((idea: any) => 
                this.legalAgent.reviewContent({
                  workspaceId: execution.workspaceId,
                  content: idea.description,
                  contentType: 'post',
                  platform: 'multi',
                  ...step.parameters
                })
              )
            );
          }
          execution.results.legal = step.result;
          break;
          
        case 'publisher':
          // Mock publishing logic
          step.result = {
            scheduled: true,
            posts: execution.results.creative?.ideas?.length || 0,
            scheduledAt: new Date()
          };
          execution.results.publisher = step.result;
          break;
      }
      
      step.status = 'completed';
      
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  getWorkflowStatus(workflowId: string): WorkflowExecution | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  pauseWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = 'paused';
    }
  }

  resumeWorkflow(workflowId: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow && workflow.status === 'paused') {
      workflow.status = 'running';
      this.processWorkflowSteps(workflow);
    }
  }
}