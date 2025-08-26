export interface ApprovalWorkflow {
  id: string
  title: string
  description: string
  type: 'campaign' | 'content' | 'strategy' | 'budget' | 'custom'
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdBy: string
  assignedTo: string[]
  requiredApprovals: number
  currentApprovals: number
  deadline?: Date
  createdAt: Date
  updatedAt: Date
  versions: WorkflowVersion[]
  comments: WorkflowComment[]
  approvals: WorkflowApproval[]
  auditTrail: AuditEntry[]
  metadata: Record<string, any>
  attachments: WorkflowAttachment[]
  tags: string[]
}

export interface WorkflowVersion {
  id: string
  version: string
  title: string
  description: string
  content: any // The actual workflow content (campaign data, etc.)
  changes: VersionChange[]
  createdBy: string
  createdAt: Date
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  parentVersion?: string
  isCurrent: boolean
  compareWith?: string // Version ID to compare with
}

export interface VersionChange {
  id: string
  type: 'added' | 'modified' | 'removed'
  field: string
  path: string
  oldValue?: any
  newValue?: any
  description: string
}

export interface WorkflowComment {
  id: string
  content: string
  type: 'comment' | 'suggestion' | 'question' | 'approval_note' | 'rejection_note'
  author: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  createdAt: Date
  updatedAt?: Date
  parentId?: string // For threaded comments
  replies: WorkflowComment[]
  mentions: string[]
  attachments: CommentAttachment[]
  reactions: CommentReaction[]
  isResolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  versionId?: string // Associated with specific version
  lineNumber?: number // For code/content line comments
  selection?: TextSelection // For text selection comments
}

export interface CommentAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
}

export interface CommentReaction {
  emoji: string
  users: string[]
  count: number
}

export interface TextSelection {
  start: number
  end: number
  text: string
}

export interface WorkflowApproval {
  id: string
  approver: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'delegated'
  decision: 'approve' | 'reject' | 'request_changes'
  comment?: string
  conditions?: string[]
  decidedAt?: Date
  delegatedTo?: string
  versionId: string
  weight: number // For weighted approvals
}

export interface AuditEntry {
  id: string
  action: string
  description: string
  actor: {
    id: string
    name: string
    role: string
  }
  target?: string
  changes?: Record<string, { from: any; to: any }>
  metadata: Record<string, any>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

export interface WorkflowAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedBy: string
  uploadedAt: Date
  description?: string
}

export interface ApprovalRule {
  id: string
  name: string
  description: string
  conditions: ApprovalCondition[]
  requiredApprovers: ApprovalRequirement[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ApprovalCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in'
  value: any
}

export interface ApprovalRequirement {
  type: 'role' | 'user' | 'group'
  identifier: string
  required: boolean
  weight: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  type: string
  steps: WorkflowStep[]
  approvalRules: string[]
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
  type: 'approval' | 'review' | 'notification' | 'automation'
  order: number
  conditions: StepCondition[]
  actions: StepAction[]
  timeout?: number // minutes
  isRequired: boolean
}

export interface StepCondition {
  field: string
  operator: string
  value: any
}

export interface StepAction {
  type: 'email' | 'webhook' | 'assignment' | 'notification'
  config: Record<string, any>
}

// Diff viewer types
export interface DiffChunk {
  type: 'unchanged' | 'added' | 'removed' | 'modified'
  oldStart?: number
  oldLines?: number
  newStart?: number
  newLines?: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  oldNumber?: number
  newNumber?: number
  content: string
  highlight?: boolean
}

export interface DiffOptions {
  showLineNumbers: boolean
  showInlineChanges: boolean
  contextLines: number
  wordWrap: boolean
  theme: 'light' | 'dark'
}

// Notification types
export interface WorkflowNotification {
  id: string
  type: 'approval_request' | 'approval_decision' | 'comment_added' | 'deadline_approaching' | 'workflow_completed'
  title: string
  message: string
  workflowId: string
  recipientId: string
  isRead: boolean
  createdAt: Date
  actionUrl?: string
  metadata: Record<string, any>
}

// Filter and search types
export interface WorkflowFilters {
  status?: string[]
  type?: string[]
  priority?: string[]
  assignee?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
  search?: string
}

export interface WorkflowSortOptions {
  field: 'createdAt' | 'updatedAt' | 'deadline' | 'priority' | 'status'
  direction: 'asc' | 'desc'
}

// API response types
export interface WorkflowListResponse {
  workflows: ApprovalWorkflow[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface WorkflowStatsResponse {
  total: number
  pending: number
  approved: number
  rejected: number
  drafts: number
  byType: Record<string, number>
  byPriority: Record<string, number>
}