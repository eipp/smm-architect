"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { motion, AnimatePresence } from "framer-motion"

// Readiness Score Component
const ReadinessScore = ({ 
  score, 
  label, 
  details 
}: { 
  score: number
  label: string
  details?: string[]
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success-600 bg-success-100"
    if (score >= 70) return "text-warning-600 bg-warning-100"
    return "text-error-600 bg-error-100"
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return "✓"
    if (score >= 70) return "⚠"
    return "✗"
  }

  return (
    <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold", getScoreColor(score))}>
            {getScoreIcon(score)}
          </span>
          <span className="font-medium text-neutral-900">{label}</span>
        </div>
        {details && details.length > 0 && (
          <div className="ml-8 space-y-1">
            {details.map((detail, index) => (
              <p key={index} className="text-sm text-neutral-600">• {detail}</p>
            ))}
          </div>
        )}
      </div>
      <div className="text-right">
        <div className={cn("text-lg font-bold", getScoreColor(score).split(' ')[0])}>
          {score}%
        </div>
      </div>
    </div>
  )
}

// Canvas Node Component
const CanvasNode = ({ 
  node, 
  isSelected, 
  onSelect, 
  position 
}: { 
  node: any
  isSelected: boolean
  onSelect: () => void
  position: { x: number; y: number }
}) => {
  const getNodeColor = (type: string) => {
    switch (type) {
      case "content": return "bg-primary-100 border-primary-300 text-primary-800"
      case "approval": return "bg-accent-100 border-accent-300 text-accent-800"
      case "schedule": return "bg-success-100 border-success-300 text-success-800"
      case "analytics": return "bg-warning-100 border-warning-300 text-warning-800"
      default: return "bg-neutral-100 border-neutral-300 text-neutral-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-success-500"
      case "in-progress": return "bg-warning-500"
      case "pending": return "bg-neutral-400"
      case "blocked": return "bg-error-500"
      default: return "bg-neutral-400"
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "absolute cursor-pointer border-2 rounded-lg p-3 min-w-[120px] transition-all duration-200",
        getNodeColor(node.type),
        isSelected && "ring-4 ring-primary-200 shadow-lg scale-105"
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        transform: isSelected ? "scale(1.05)" : "scale(1)"
      }}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">{node.title}</h4>
        <div className={cn("w-3 h-3 rounded-full", getStatusColor(node.status))} />
      </div>
      <p className="text-xs opacity-80">{node.description}</p>
      {node.readinessScore && (
        <div className="mt-2 text-xs font-medium">
          Readiness: {node.readinessScore}%
        </div>
      )}
    </motion.div>
  )
}

// Canvas Component
const ApprovalCanvas = ({ 
  nodes, 
  connections, 
  selectedNode, 
  onNodeSelect 
}: {
  nodes: any[]
  connections: any[]
  selectedNode: string | null
  onNodeSelect: (nodeId: string) => void
}) => {
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    
    // Layout nodes in a workflow pattern
    const cols = 3
    const rows = Math.ceil(nodes.length / cols)
    const nodeWidth = 140
    const nodeHeight = 100
    const spacing = { x: 200, y: 120 }
    
    nodes.forEach((node, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      positions[node.id] = {
        x: col * spacing.x + 50,
        y: row * spacing.y + 50
      }
    })
    
    return positions
  }, [nodes])

  return (
    <div className="relative bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden" style={{ height: '400px' }}>
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {connections.map((connection, index) => {
          const fromPos = nodePositions[connection.from]
          const toPos = nodePositions[connection.to]
          if (!fromPos || !toPos) return null
          
          return (
            <motion.path
              key={index}
              d={`M ${fromPos.x + 70} ${fromPos.y + 40} Q ${(fromPos.x + toPos.x) / 2} ${fromPos.y + 40} ${toPos.x + 70} ${toPos.y + 40}`}
              stroke="#6b7280"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            />
          )
        })}
      </svg>
      
      {/* Nodes */}
      {nodes.map((node) => (
        <CanvasNode
          key={node.id}
          node={node}
          isSelected={selectedNode === node.id}
          onSelect={() => onNodeSelect(node.id)}
          position={nodePositions[node.id] || { x: 0, y: 0 }}
        />
      ))}
    </div>
  )
}

// Node Details Panel
const NodeDetailsPanel = ({ 
  node, 
  onApprove, 
  onReject, 
  onModify 
}: {
  node: any
  onApprove: () => void
  onReject: () => void
  onModify: () => void
}) => {
  if (!node) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 flex items-center justify-center text-neutral-500">
          Select a node to view details
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {node.title}
          <span className={cn(
            "px-2 py-1 text-xs font-medium rounded-full",
            node.status === "completed" ? "bg-success-100 text-success-700" :
            node.status === "in-progress" ? "bg-warning-100 text-warning-700" :
            node.status === "pending" ? "bg-neutral-100 text-neutral-700" :
            "bg-error-100 text-error-700"
          )}>
            {node.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-neutral-600">{node.description}</p>
        
        {node.content && (
          <div>
            <h4 className="font-medium text-neutral-900 mb-2">Content Preview</h4>
            <div className="p-3 bg-neutral-50 rounded border text-sm">
              {node.content}
            </div>
          </div>
        )}
        
        {node.readinessScore && (
          <div>
            <h4 className="font-medium text-neutral-900 mb-2">Readiness Assessment</h4>
            <ReadinessScore 
              score={node.readinessScore} 
              label="Overall Readiness"
              details={node.readinessDetails}
            />
          </div>
        )}
        
        {node.metadata && (
          <div>
            <h4 className="font-medium text-neutral-900 mb-2">Metadata</h4>
            <div className="space-y-1">
              {Object.entries(node.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-neutral-600 capitalize">{key}:</span>
                  <span className="text-neutral-900">{value as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {node.status === "pending" && (
          <div className="flex gap-2 pt-4">
            <Button variant="success" size="sm" onClick={onApprove}>
              Approve
            </Button>
            <Button variant="danger" size="sm" onClick={onReject}>
              Reject
            </Button>
            <Button variant="outline" size="sm" onClick={onModify}>
              Modify
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Main Campaign Approval Flow Component
export interface CampaignApprovalFlowProps {
  campaign?: any
  onApprovalComplete?: (decisions: any) => void
  onCancel?: () => void
  className?: string
}

export const CampaignApprovalFlow = React.forwardRef<
  HTMLDivElement,
  CampaignApprovalFlowProps
>(({ campaign, onApprovalComplete, onCancel, className, ...props }, ref) => {
  // Mock data for demonstration
  const [nodes, setNodes] = useState([
    {
      id: "content-1",
      type: "content",
      title: "Social Post #1",
      description: "LinkedIn thought leadership post",
      status: "pending",
      content: "🚀 Exciting news! Our AI-powered SMM platform just hit a major milestone...",
      readinessScore: 92,
      readinessDetails: [
        "Content quality: Excellent",
        "Brand alignment: Strong",
        "Compliance: Passed"
      ],
      metadata: {
        platform: "LinkedIn",
        scheduledTime: "2024-01-15 09:00",
        targetAudience: "B2B Professionals"
      }
    },
    {
      id: "content-2", 
      type: "content",
      title: "Social Post #2",
      description: "Twitter engagement post",
      status: "pending",
      content: "What's your biggest challenge with social media automation? 🤔 #SMM #AI",
      readinessScore: 78,
      readinessDetails: [
        "Content quality: Good",
        "Engagement potential: High",
        "Timing optimization needed"
      ],
      metadata: {
        platform: "Twitter",
        scheduledTime: "2024-01-15 14:30",
        targetAudience: "Tech Enthusiasts"
      }
    },
    {
      id: "approval-1",
      type: "approval",
      title: "Legal Review",
      description: "Compliance and legal approval",
      status: "completed",
      readinessScore: 100,
      metadata: {
        reviewer: "Legal Team",
        completedAt: "2024-01-14 16:45"
      }
    },
    {
      id: "schedule-1",
      type: "schedule",
      title: "Campaign Schedule",
      description: "Timing and coordination",
      status: "in-progress",
      readinessScore: 85,
      readinessDetails: [
        "Optimal timing identified",
        "Cross-platform coordination ready",
        "Audience timezone alignment needed"
      ],
      metadata: {
        startDate: "2024-01-15",
        duration: "7 days",
        platforms: "LinkedIn, Twitter"
      }
    },
    {
      id: "analytics-1",
      type: "analytics",
      title: "Success Metrics",
      description: "KPI tracking setup",
      status: "pending",
      readinessScore: 65,
      readinessDetails: [
        "Engagement metrics configured",
        "Conversion tracking needs setup",
        "ROI measurement pending"
      ],
      metadata: {
        metrics: "Engagement, Reach, Conversions",
        dashboardReady: "No"
      }
    }
  ])

  const connections = [
    { from: "content-1", to: "approval-1" },
    { from: "content-2", to: "approval-1" },
    { from: "approval-1", to: "schedule-1" },
    { from: "schedule-1", to: "analytics-1" }
  ]

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, string>>({})

  const selectedNode = useMemo(() => 
    nodes.find(node => node.id === selectedNodeId) || null, 
    [nodes, selectedNodeId]
  )

  const overallReadiness = useMemo(() => {
    const scores = nodes
      .filter(node => node.readinessScore)
      .map(node => node.readinessScore)
    
    return scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0
  }, [nodes])

  const updateNodeStatus = useCallback((nodeId: string, status: string, decision: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, status } : node
    ))
    setDecisions(prev => ({ ...prev, [nodeId]: decision }))
  }, [])

  const handleApprove = useCallback(() => {
    if (selectedNodeId) {
      updateNodeStatus(selectedNodeId, "completed", "approved")
    }
  }, [selectedNodeId, updateNodeStatus])

  const handleReject = useCallback(() => {
    if (selectedNodeId) {
      updateNodeStatus(selectedNodeId, "blocked", "rejected")
    }
  }, [selectedNodeId, updateNodeStatus])

  const handleModify = useCallback(() => {
    if (selectedNodeId) {
      updateNodeStatus(selectedNodeId, "in-progress", "modification-requested")
    }
  }, [selectedNodeId, updateNodeStatus])

  const pendingNodes = nodes.filter(node => node.status === "pending").length
  const canFinalize = pendingNodes === 0

  const handleFinalize = useCallback(() => {
    onApprovalComplete?.(decisions)
  }, [decisions, onApprovalComplete])

  return (
    <div 
      ref={ref} 
      className={cn("max-w-7xl mx-auto p-6", className)} 
      {...props}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Campaign Approval</h1>
            <p className="text-neutral-600">Review and approve campaign components</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-neutral-600">Overall Readiness</div>
              <div className={cn(
                "text-2xl font-bold",
                overallReadiness >= 90 ? "text-success-600" :
                overallReadiness >= 70 ? "text-warning-600" :
                "text-error-600"
              )}>
                {overallReadiness}%
              </div>
            </div>
            <Button
              variant={canFinalize ? "success" : "outline"}
              disabled={!canFinalize}
              onClick={handleFinalize}
            >
              {canFinalize ? "Finalize Campaign" : `${pendingNodes} Pending`}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalCanvas
                  nodes={nodes}
                  connections={connections}
                  selectedNode={selectedNodeId}
                  onNodeSelect={setSelectedNodeId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Details Panel */}
          <div>
            <NodeDetailsPanel
              node={selectedNode}
              onApprove={handleApprove}
              onReject={handleReject}
              onModify={handleModify}
            />
          </div>
        </div>

        {/* Readiness Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Readiness Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {nodes
                .filter(node => node.readinessScore)
                .map(node => (
                  <ReadinessScore
                    key={node.id}
                    score={node.readinessScore!}
                    label={node.title}
                    details={node.readinessDetails}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

CampaignApprovalFlow.displayName = "CampaignApprovalFlow"

export default CampaignApprovalFlow