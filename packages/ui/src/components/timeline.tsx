import * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

export interface TimelineStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  timestamp?: Date
  duration?: string
  metadata?: Record<string, any>
}

export interface TimelineProps {
  steps: TimelineStep[]
  currentStep?: string
  onStepClick?: (stepId: string) => void
  className?: string
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ steps, currentStep, onStepClick, className }, ref) => {
    const getStatusColor = (status: TimelineStep['status']) => {
      switch (status) {
        case 'completed':
          return 'bg-green-500'
        case 'running':
          return 'bg-blue-500 animate-pulse'
        case 'failed':
          return 'bg-red-500'
        case 'blocked':
          return 'bg-gray-400'
        default:
          return 'bg-gray-300'
      }
    }

    const getStatusVariant = (status: TimelineStep['status']) => {
      switch (status) {
        case 'completed':
          return 'success' as const
        case 'running':
          return 'default' as const
        case 'failed':
          return 'destructive' as const
        case 'blocked':
          return 'secondary' as const
        default:
          return 'outline' as const
      }
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-start space-x-4">
            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="absolute left-4 top-10 h-full w-0.5 bg-border" />
            )}
            
            {/* Status indicator */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background",
                getStatusColor(step.status),
                onStepClick && "cursor-pointer hover:scale-110 transition-transform"
              )}
              onClick={() => onStepClick?.(step.id)}
            >
              {step.status === 'running' && (
                <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
              )}
              {step.status === 'completed' && (
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {step.status === 'failed' && (
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0 pb-8">
              <div className="flex items-center space-x-2">
                <h3 className={cn(
                  "text-sm font-medium",
                  currentStep === step.id && "text-primary"
                )}>
                  {step.title}
                </h3>
                <Badge variant={getStatusVariant(step.status)} className="text-xs">
                  {step.status}
                </Badge>
              </div>
              
              {step.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
              
              <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                {step.timestamp && (
                  <span>{step.timestamp.toLocaleTimeString()}</span>
                )}
                {step.duration && (
                  <span>Duration: {step.duration}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
)
Timeline.displayName = "Timeline"

export { Timeline }