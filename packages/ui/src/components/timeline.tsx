import * as React from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"

export type AgentType = 'research' | 'planner' | 'creative' | 'legal' | 'automation' | 'publisher'
export type ExecutionMode = 'sequential' | 'parallel' | 'conditional'

export interface AgentStep {
  id: string
  title: string
  description?: string
  agentType: AgentType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked' | 'skipped'
  startTime?: Date
  endTime?: Date
  duration?: string
  progress?: number
  dependencies?: string[]
  outputs?: string[]
  executionMode?: ExecutionMode
  parallelGroup?: string
  metadata?: Record<string, any>
  logs?: Array<{
    timestamp: Date
    level: 'info' | 'warning' | 'error'
    message: string
  }>
}

export interface TimelineProps {
  steps: AgentStep[]
  currentStep?: string
  onStepClick?: (stepId: string) => void
  onStepExpand?: (stepId: string) => void
  showParallelPaths?: boolean
  showProgress?: boolean
  showLogs?: boolean
  compact?: boolean
  className?: string
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ 
    steps, 
    currentStep, 
    onStepClick, 
    onStepExpand,
    showParallelPaths = true,
    showProgress = true,
    showLogs = false,
    compact = false,
    className 
  }, ref) => {
    const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set())
    
    const getAgentColor = (agentType: AgentType) => {
      switch (agentType) {
        case 'research':
          return 'bg-blue-500'
        case 'planner':
          return 'bg-purple-500'
        case 'creative':
          return 'bg-pink-500'
        case 'legal':
          return 'bg-yellow-500'
        case 'automation':
          return 'bg-green-500'
        case 'publisher':
          return 'bg-orange-500'
        default:
          return 'bg-neutral-500'
      }
    }
    
    const getStatusColor = (status: AgentStep['status']) => {
      switch (status) {
        case 'completed':
          return 'bg-success-500'
        case 'running':
          return 'bg-primary-500 animate-pulse'
        case 'failed':
          return 'bg-error-500'
        case 'blocked':
          return 'bg-warning-500'
        case 'skipped':
          return 'bg-neutral-400'
        default:
          return 'bg-neutral-300'
      }
    }

    const getStatusVariant = (status: AgentStep['status']) => {
      switch (status) {
        case 'completed':
          return 'success' as const
        case 'running':
          return 'default' as const
        case 'failed':
          return 'destructive' as const
        case 'blocked':
          return 'warning' as const
        case 'skipped':
          return 'secondary' as const
        default:
          return 'outline' as const
      }
    }
    
    const getAgentIcon = (agentType: AgentType) => {
      switch (agentType) {
        case 'research':
          return '🔍'
        case 'planner':
          return '📋'
        case 'creative':
          return '🎨'
        case 'legal':
          return '⚖️'
        case 'automation':
          return '🤖'
        case 'publisher':
          return '📢'
        default:
          return '⚙️'
      }
    }
    
    const handleStepExpand = (stepId: string) => {
      const newExpanded = new Set(expandedSteps)
      if (newExpanded.has(stepId)) {
        newExpanded.delete(stepId)
      } else {
        newExpanded.add(stepId)
      }
      setExpandedSteps(newExpanded)
      onStepExpand?.(stepId)
    }
    
    // Group parallel steps
    const groupedSteps = React.useMemo(() => {
      if (!showParallelPaths) return steps.map(step => [step])
      
      const groups: AgentStep[][] = []
      const parallelGroups: Record<string, AgentStep[]> = {}
      
      for (const step of steps) {
        if (step.parallelGroup) {
          if (!parallelGroups[step.parallelGroup]) {
            parallelGroups[step.parallelGroup] = []
          }
          parallelGroups[step.parallelGroup].push(step)
        } else {
          groups.push([step])
        }
      }
      
      // Insert parallel groups in order
      const result: AgentStep[][] = []
      let parallelGroupIndex = 0
      
      for (const group of groups) {
        result.push(group)
        // Check if there are parallel groups to insert
        const parallelGroupKey = `group-${parallelGroupIndex}`
        if (parallelGroups[parallelGroupKey]) {
          result.push(parallelGroups[parallelGroupKey])
          parallelGroupIndex++
        }
      }
      
      return result
    }, [steps, showParallelPaths])

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {groupedSteps.map((stepGroup, groupIndex) => (
          <div key={groupIndex} className="relative">
            {stepGroup.length > 1 ? (
              // Parallel execution group
              <div className="relative">
                <div className="flex items-center mb-2">
                  <div className="h-0.5 w-4 bg-neutral-300" />
                  <span className="px-2 text-xs text-neutral-500 bg-neutral-100 rounded">Parallel</span>
                  <div className="flex-1 h-0.5 bg-neutral-300" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-8">
                  {stepGroup.map((step) => (
                    <div key={step.id} className="bg-white border border-neutral-200 rounded-lg p-4">
                      {renderStep(step, true)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Sequential step
              <div className="relative flex items-start space-x-4">
                {groupIndex < groupedSteps.length - 1 && (
                  <div className="absolute left-4 top-10 h-full w-0.5 bg-neutral-200" />
                )}
                {renderStep(stepGroup[0], false)}
              </div>
            )}
          </div>
        ))}
      </div>
    )
    
    function renderStep(step: AgentStep, isParallel: boolean) {
      const isExpanded = expandedSteps.has(step.id)
      const hasLogs = step.logs && step.logs.length > 0
      
      return (
        <>
          {/* Status indicator */}
          <div
            className={cn(
              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-sm",
              getStatusColor(step.status),
              onStepClick && "cursor-pointer hover:scale-110 transition-transform"
            )}
            onClick={() => onStepClick?.(step.id)}
          >
            <span className="text-xs">{getAgentIcon(step.agentType)}</span>
          </div>

          {/* Step content */}
          <div className={cn("flex-1 min-w-0", !isParallel && "pb-8")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className={cn(
                  "text-sm font-medium",
                  currentStep === step.id && "text-primary-600"
                )}>
                  {step.title}
                </h3>
                <Badge variant={getStatusVariant(step.status)} className="text-xs">
                  {step.status}
                </Badge>
              </div>
              
              {!compact && (hasLogs || step.outputs) && (
                <button
                  onClick={() => handleStepExpand(step.id)}
                  className="text-xs text-neutral-500 hover:text-neutral-700"
                >
                  {isExpanded ? '▼' : '▶'}
                </button>
              )}
            </div>
            
            {step.description && (
              <p className="mt-1 text-sm text-neutral-600">
                {step.description}
              </p>
            )}
            
            {/* Progress bar */}
            {showProgress && step.status === 'running' && step.progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Progress</span>
                  <span>{step.progress}%</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              {step.startTime && (
                <span>Started: {step.startTime.toLocaleTimeString()}</span>
              )}
              {step.duration && (
                <span>Duration: {step.duration}</span>
              )}
              {step.dependencies && step.dependencies.length > 0 && (
                <span>Depends on: {step.dependencies.length} step(s)</span>
              )}
            </div>
            
            {/* Expanded content */}
            {isExpanded && (
              <div className="mt-4 space-y-3 border-t border-neutral-200 pt-3">
                {/* Outputs */}
                {step.outputs && step.outputs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-neutral-700 mb-1">Outputs</h4>
                    <ul className="text-xs text-neutral-600 space-y-1">
                      {step.outputs.map((output, i) => (
                        <li key={i}>• {output}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Logs */}
                {showLogs && hasLogs && (
                  <div>
                    <h4 className="text-xs font-medium text-neutral-700 mb-1">Logs</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {step.logs!.map((log, i) => (
                        <div key={i} className={cn(
                          "text-xs p-2 rounded",
                          log.level === 'error' && "bg-error-50 text-error-700",
                          log.level === 'warning' && "bg-warning-50 text-warning-700",
                          log.level === 'info' && "bg-neutral-50 text-neutral-700"
                        )}>
                          <span className="font-mono">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          {' '}
                          <span>{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )
    }
  }
)
  }
)
Timeline.displayName = "Timeline"

export { Timeline }