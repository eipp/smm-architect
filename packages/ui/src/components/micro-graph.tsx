import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"

export interface Step {
  id: 'discover' | 'plan' | 'draft' | 'verify' | 'approve' | 'post'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  duration?: string
  progress?: number
  actions?: Array<'fix' | 'rerun' | 'approve' | 'rollback'>
  tooltip?: string
  dependencies?: string[]
  metadata?: Record<string, any>
}

export interface MicroGraphProps {
  steps: Step[]
  mode: 'plan' | 'live'
  onStepAction: (stepId: string, action: string) => void
  className?: string
}

const StepIcon: React.FC<{ stepId: string; status: Step['status'] }> = ({ stepId, status }) => {
  const getIcon = () => {
    switch (stepId) {
      case 'discover':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        )
      case 'plan':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        )
      case 'draft':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        )
      case 'verify':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'approve':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'post':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        )
      default:
        return <div className="w-3 h-3 rounded-full bg-current" />
    }
  }

  if (status === 'running') {
    return <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
  }

  return getIcon()
}

const StepConnector: React.FC<{
  fromStatus: Step['status']
  toStatus: Step['status']
  animated: boolean
}> = ({ fromStatus, toStatus, animated }) => {
  const isActive = fromStatus === 'completed' || fromStatus === 'running'
  
  return (
    <div className="flex-1 flex items-center justify-center mx-4">
      <div className={cn(
        "h-0.5 w-full bg-border transition-colors duration-200",
        isActive && "bg-primary",
        animated && isActive && "animate-pulse"
      )} />
      {animated && isActive && (
        <div className="absolute w-2 h-2 bg-primary rounded-full animate-ping" />
      )}
    </div>
  )
}

const StepActionPopover: React.FC<{
  step: Step
  onAction: (action: string) => void
  onClose: () => void
}> = ({ step, onAction, onClose }) => {
  if (!step.actions || step.actions.length === 0) return null

  return (
    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-popover border rounded-lg shadow-lg p-3 z-20">
      <div className="space-y-2">
        <div className="text-sm font-medium">{step.id} Actions</div>
        <div className="flex flex-col space-y-1">
          {step.actions.map((action) => (
            <Button
              key={action}
              variant="ghost"
              size="sm"
              onClick={() => onAction(action)}
              className="justify-start"
            >
              {action.charAt(0).toUpperCase() + action.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover border-t border-l rotate-45" />
    </div>
  )
}

const StepNode: React.FC<{
  step: Step
  isHovered: boolean
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  mode: 'plan' | 'live'
}> = ({ step, isHovered, isSelected, onClick, onMouseEnter, onMouseLeave, mode }) => {
  const getStatusColor = (status: Step['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white border-green-500'
      case 'running': return 'bg-blue-500 text-white border-blue-500 animate-pulse'
      case 'failed': return 'bg-red-500 text-white border-red-500'
      case 'blocked': return 'bg-gray-400 text-white border-gray-400'
      default: return 'bg-canvas-node border-2 border-canvas-edge text-foreground'
    }
  }
  
  return (
    <div className="relative flex flex-col items-center">
      <button
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 relative",
          getStatusColor(step.status),
          isHovered && "scale-110 shadow-lg",
          isSelected && "ring-2 ring-primary ring-offset-2",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid={`step-${step.id}`}
        aria-label={`${step.id} step - ${step.status}`}
      >
        <StepIcon stepId={step.id} status={step.status} />
        
        {/* Progress ring for running steps */}
        {step.status === 'running' && step.progress !== undefined && (
          <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeOpacity="0.3"
            />
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${step.progress * 1.88} 188`}
              className="transition-all duration-300"
            />
          </svg>
        )}
      </button>
      
      {/* Tooltip on hover */}
      {isHovered && step.tooltip && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 max-w-48">
          {step.tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-popover" />
        </div>
      )}
      
      <div className="mt-3 text-center min-w-0">
        <div className="text-sm font-medium capitalize truncate">{step.id}</div>
        {step.duration && (
          <div className="text-xs text-muted-foreground">{step.duration}</div>
        )}
        {step.status === 'running' && step.progress !== undefined && (
          <div className="text-xs text-muted-foreground">
            {Math.round(step.progress)}%
          </div>
        )}
      </div>
    </div>
  )
}

const MicroGraph = React.forwardRef<HTMLDivElement, MicroGraphProps>(
  ({ steps, mode, onStepAction, className }, ref) => {
    const [hoveredStep, setHoveredStep] = React.useState<string | null>(null)
    const [selectedStep, setSelectedStep] = React.useState<string | null>(null)
    
    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        <div className="bg-canvas-background border rounded-lg p-8">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <StepNode
                  step={step}
                  isHovered={hoveredStep === step.id}
                  isSelected={selectedStep === step.id}
                  onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
                  onMouseEnter={() => setHoveredStep(step.id)}
                  onMouseLeave={() => setHoveredStep(null)}
                  mode={mode}
                />
                {index < steps.length - 1 && (
                  <StepConnector 
                    fromStatus={step.status}
                    toStatus={steps[index + 1].status}
                    animated={mode === 'live'}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Mode indicator */}
          <div className="flex justify-center mt-6">
            <Badge variant={mode === 'live' ? 'default' : 'secondary'}>
              {mode === 'live' ? 'Live Mode' : 'Plan Mode'}
            </Badge>
          </div>
        </div>
        
        {/* Action popover */}
        {selectedStep && (
          <StepActionPopover
            step={steps.find(s => s.id === selectedStep)!}
            onAction={(action) => {
              onStepAction(selectedStep, action)
              setSelectedStep(null)
            }}
            onClose={() => setSelectedStep(null)}
          />
        )}
      </div>
    )
  }
)
MicroGraph.displayName = "MicroGraph"

export { MicroGraph }