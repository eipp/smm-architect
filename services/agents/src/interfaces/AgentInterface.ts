/**
 * Agent Interface Definitions
 * Base interfaces for all SMM Architect agents
 */

export enum AgentCapability {
  WORKFLOW_EXECUTION = 'workflow_execution',
  TASK_SCHEDULING = 'task_scheduling',
  MONITORING = 'monitoring',
  ERROR_HANDLING = 'error_handling',
  CONTENT_ANALYSIS = 'content_analysis',
  COMPLIANCE_VALIDATION = 'compliance_validation',
  REGULATORY_CHECKING = 'regulatory_checking',
  DISCLAIMER_GENERATION = 'disclaimer_generation',
  CONTENT_PUBLISHING = 'content_publishing',
  SCHEDULING = 'scheduling',
  ENGAGEMENT_TRACKING = 'engagement_tracking',
  PLATFORM_INTEGRATION = 'platform_integration'
}

export interface AgentMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: AgentCapability[];
  dependencies: string[];
}

export interface AgentInterface {
  readonly metadata: AgentMetadata;
  initialize(): Promise<void>;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
  processingTime?: number;
}

export interface AgentContext {
  workspaceId: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export default AgentInterface;