"use client"

import React, { useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Timeline } from '@/components/ui/timeline'
import DiffViewer from './diff-viewer'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageCircle, 
  User, 
  Calendar,
  Tag,
  FileText,
  GitBranch,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Send,
  MoreHorizontal
} from 'lucide-react'
import { 
  ApprovalWorkflow, 
  WorkflowComment, 
  WorkflowApproval, 
  WorkflowVersion,
  AuditEntry 
} from '@/types/approval'

interface ApprovalWorkflowViewProps {
  workflow: ApprovalWorkflow
  onApprove?: (comment?: string, conditions?: string[]) => void
  onReject?: (reason: string) => void
  onRequestChanges?: (feedback: string) => void
  onAddComment?: (content: string, type?: string) => void
  onUpdateWorkflow?: (updates: Partial<ApprovalWorkflow>) => void
  className?: string
}

export const ApprovalWorkflowView: React.FC<ApprovalWorkflowViewProps> = ({
  workflow,
  onApprove,
  onReject,
  onRequestChanges,
  onAddComment,
  onUpdateWorkflow,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'comments' | 'audit'>('overview')
  const [selectedVersions, setSelectedVersions] = useState<[string, string] | null>(null)
  const [showApprovalForm, setShowApprovalForm] = useState<'approve' | 'reject' | 'changes' | null>(null)
  const [approvalComment, setApprovalComment] = useState('')
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<'comment' | 'suggestion' | 'question'>('comment')

  const currentVersion = workflow.versions.find(v => v.isCurrent)
  const latestVersion = workflow.versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'draft': return 'text-gray-600 bg-gray-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'reject' | 'changes') => {
    switch (action) {
      case 'approve':
        await onApprove?.(approvalComment)
        break
      case 'reject':
        await onReject?.(approvalComment)
        break
      case 'changes':
        await onRequestChanges?.(approvalComment)
        break
    }
    setShowApprovalForm(null)
    setApprovalComment('')
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    await onAddComment?.(newComment, commentType)
    setNewComment('')
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(workflow.status)}>
                {workflow.status}
              </Badge>
              <Badge className={getPriorityColor(workflow.priority)}>
                {workflow.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Status & Priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {workflow.currentApprovals}/{workflow.requiredApprovals}
            </div>
            <p className="text-sm text-muted-foreground">Approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                {workflow.deadline ? new Date(workflow.deadline).toLocaleDateString() : 'No deadline'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Deadline</p>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{workflow.description}</p>
          
          {workflow.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4">
              {workflow.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approvals Status */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflow.approvals.map(approval => (
              <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={approval.approver.avatar} />
                    <AvatarFallback>
                      {approval.approver.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{approval.approver.name}</p>
                    <p className="text-xs text-muted-foreground">{approval.approver.role}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {approval.status === 'approved' && (
                    <Badge className="text-green-600 bg-green-100">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {approval.status === 'rejected' && (
                    <Badge className="text-red-600 bg-red-100">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  )}
                  {approval.status === 'pending' && (
                    <Badge className="text-yellow-600 bg-yellow-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  
                  {approval.decidedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(approval.decidedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {workflow.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Review and make a decision on this workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => setShowApprovalForm('approve')} className="flex-1">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowApprovalForm('reject')}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowApprovalForm('changes')}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Request Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Form Modal */}
      {showApprovalForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {showApprovalForm === 'approve' && 'Approve Workflow'}
              {showApprovalForm === 'reject' && 'Reject Workflow'}
              {showApprovalForm === 'changes' && 'Request Changes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comment (optional)</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Add your comment or feedback..."
                className="w-full mt-1 p-2 border border-border rounded-md resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={() => handleApprovalAction(showApprovalForm)}>
                Submit
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowApprovalForm(null)
                  setApprovalComment('')
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderVersions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Version History</h3>
        {selectedVersions && (
          <Button
            variant="outline"
            onClick={() => setSelectedVersions(null)}
          >
            Clear Comparison
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {workflow.versions.map(version => (
          <Card 
            key={version.id}
            className={cn(
              "cursor-pointer transition-colors",
              selectedVersions?.includes(version.id) && "border-primary",
              version.isCurrent && "border-green-500"
            )}
            onClick={() => {
              if (!selectedVersions) {
                setSelectedVersions([version.id, ''])
              } else if (selectedVersions[1] === '') {
                setSelectedVersions([selectedVersions[0], version.id])
              } else {
                setSelectedVersions([version.id, ''])
              }
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Version {version.version}</p>
                    <p className="text-sm text-muted-foreground">{version.title}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {version.isCurrent && (
                    <Badge className="text-green-600 bg-green-100">Current</Badge>
                  )}
                  <Badge className={getStatusColor(version.status)}>
                    {version.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {version.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {version.description}
                </p>
              )}
              
              {version.changes.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {version.changes.length} changes
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedVersions && selectedVersions[1] && (
        <Card>
          <CardHeader>
            <CardTitle>Version Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffViewer
              oldContent={workflow.versions.find(v => v.id === selectedVersions[0])?.content}
              newContent={workflow.versions.find(v => v.id === selectedVersions[1])?.content}
              oldVersion={`v${workflow.versions.find(v => v.id === selectedVersions[0])?.version}`}
              newVersion={`v${workflow.versions.find(v => v.id === selectedVersions[1])?.version}`}
              comments={workflow.comments.filter(c => c.versionId === selectedVersions[1])}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderComments = () => (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['comment', 'suggestion', 'question'] as const).map(type => (
                <Button
                  key={type}
                  size="sm"
                  variant={commentType === type ? 'default' : 'outline'}
                  onClick={() => setCommentType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
            
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment, suggestion, or question..."
              className="w-full p-3 border border-border rounded-md resize-none"
              rows={3}
            />
            
            <div className="flex justify-end">
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {workflow.comments
          .filter(comment => !comment.parentId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map(comment => (
            <Card key={comment.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.author.avatar} />
                    <AvatarFallback>
                      {comment.author.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">{comment.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      {comment.type !== 'comment' && (
                        <Badge variant="outline" className="text-xs">
                          {comment.type}
                        </Badge>
                      )}
                      {comment.isResolved && (
                        <Badge className="text-green-600 bg-green-100 text-xs">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm leading-relaxed mb-3">{comment.content}</p>
                    
                    {comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {comment.attachments.map(attachment => (
                          <Badge key={attachment.id} variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            {attachment.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Reply
                      </Button>
                      
                      {comment.reactions.length > 0 && (
                        <div className="flex gap-1">
                          {comment.reactions.map(reaction => (
                            <span key={reaction.emoji} className="flex items-center gap-1">
                              {reaction.emoji} {reaction.count}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {!comment.isResolved && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs">
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                    
                    {/* Replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-4 pl-4 border-l-2 border-border space-y-3">
                        {comment.replies.map(reply => (
                          <div key={reply.id} className="flex items-start gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={reply.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {reply.author.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs">{reply.author.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )

  const renderAudit = () => {
    const timelineSteps = workflow.auditTrail.map(entry => ({
      id: entry.id,
      title: entry.action,
      description: entry.description,
      status: 'completed' as const,
      timestamp: entry.timestamp,
      metadata: {
        actor: entry.actor.name,
        role: entry.actor.role,
        changes: entry.changes
      }
    }))

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <CardDescription>
              Complete history of all actions performed on this workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline 
              steps={timelineSteps}
              showTimestamps
              orientation="vertical"
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'versions', label: 'Versions', icon: GitBranch },
    { id: 'comments', label: 'Comments', icon: MessageCircle, count: workflow.comments.length },
    { id: 'audit', label: 'Audit Trail', icon: User }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{workflow.title}</h1>
            <p className="text-muted-foreground">
              Created by {workflow.createdBy} • {new Date(workflow.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        
        {workflow.deadline && new Date(workflow.deadline) < new Date() && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This workflow has passed its deadline of {new Date(workflow.deadline).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'versions' && renderVersions()}
        {activeTab === 'comments' && renderComments()}
        {activeTab === 'audit' && renderAudit()}
      </div>
    </div>
  )
}

export default ApprovalWorkflowView