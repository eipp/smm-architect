"use client"

import * as React from "react"
import { Check, Clock, AlertCircle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./button"
import { Badge } from "./badge"

export interface TimelineStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped'
  timestamp?: Date
  duration?: string
  metadata?: Record<string, any>
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'secondary' | 'destructive'
  }>
}

interface TimelineProps {
  steps: TimelineStep[]
  currentStep?: string
  orientation?: 'vertical' | 'horizontal'
  interactive?: boolean
  showTimestamps?: boolean
  showDuration?: boolean
  onStepClick?: (step: TimelineStep) => void
  className?: string
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ 
    steps, 
    currentStep, 
    orientation = 'vertical',
    interactive = false,
    showTimestamps = false,
    showDuration = false,
    onStepClick,
    className 
  }, ref) => {
    const getStepIcon = (status: TimelineStep['status']) => {
      switch (status) {
        case 'completed':
          return <Check className="h-4 w-4 text-white" />
        case 'in-progress':
          return <Clock className="h-4 w-4 text-primary" />
        case 'failed':
          return <AlertCircle className="h-4 w-4 text-destructive" />
        case 'skipped':
          return <ChevronRight className="h-4 w-4 text-muted-foreground" />
        default:
          return <div className="h-2 w-2 rounded-full bg-muted-foreground" />
      }
    }

    const getStepStyles = (status: TimelineStep['status'], isActive: boolean) => {
      const baseStyles = "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
      
      if (isActive) {
        return cn(baseStyles, "bg-primary border-primary ring-2 ring-primary/20")
      }

      switch (status) {
        case 'completed':
          return cn(baseStyles, "bg-green-500 border-green-500")
        case 'in-progress':
          return cn(baseStyles, "bg-background border-primary animate-pulse")
        case 'failed':
          return cn(baseStyles, "bg-destructive border-destructive")
        case 'skipped':
          return cn(baseStyles, "bg-muted border-muted")
        default:
          return cn(baseStyles, "bg-muted border-border")
      }
    }

    const getConnectorStyles = (status: TimelineStep['status'], nextStatus?: TimelineStep['status']) => {
      if (status === 'completed' || status === 'in-progress') {
        return "bg-primary"
      }
      return "bg-border"
    }

    if (orientation === 'horizontal') {
      return (
        <div ref={ref} className={cn("flex items-center space-x-4 overflow-x-auto", className)}>
          {steps.map((step, index) => {
            const isActive = currentStep === step.id
            const isLast = index === steps.length - 1
            
            return (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    "flex flex-col items-center min-w-0",
                    interactive && "cursor-pointer"
                  )}
                  onClick={() => interactive && onStepClick?.(step)}
                >
                  <div className={getStepStyles(step.status, isActive)}>
                    {getStepIcon(step.status)}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium">{step.title}</div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-24 truncate">
                        {step.description}
                      </div>
                    )}
                    {showTimestamps && step.timestamp && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {step.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                    {showDuration && step.duration && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {step.duration}
                      </Badge>
                    )}
                  </div>
                  {step.actions && step.actions.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {step.actions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          size="sm"
                          variant={action.variant || "secondary"}
                          onClick={action.onClick}
                          className="text-xs px-2 py-1"
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {!isLast && (
                  <div className="flex-1 h-0.5 mx-4 min-w-8">
                    <div className={cn(
                      "h-full transition-colors",
                      getConnectorStyles(step.status, steps[index + 1]?.status)
                    )} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    // Vertical orientation
    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {steps.map((step, index) => {
          const isActive = currentStep === step.id
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.id} className="flex">
              <div className="flex flex-col items-center mr-4">
                <div 
                  className={cn(
                    getStepStyles(step.status, isActive),
                    interactive && "cursor-pointer hover:scale-105"
                  )}
                  onClick={() => interactive && onStepClick?.(step)}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? `Go to step: ${step.title}` : undefined}
                >
                  {getStepIcon(step.status)}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-16 mt-2">
                    <div className={cn(
                      "w-full h-full transition-colors",
                      getConnectorStyles(step.status, steps[index + 1]?.status)
                    )} />
                  </div>
                )}
              </div>
              <div className="flex-1 pb-8">
                <div 
                  className={cn(
                    "space-y-1",
                    interactive && "cursor-pointer"
                  )}
                  onClick={() => interactive && onStepClick?.(step)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      "font-medium text-sm",
                      isActive && "text-primary",
                      step.status === 'failed' && "text-destructive"
                    )}>
                      {step.title}
                    </h3>
                    <Badge 
                      variant={step.status === 'completed' ? 'default' : 
                              step.status === 'failed' ? 'destructive' : 
                              step.status === 'in-progress' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {step.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  {step.description && (
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {showTimestamps && step.timestamp && (
                      <span>{step.timestamp.toLocaleString()}</span>
                    )}
                    {showDuration && step.duration && (
                      <span>Duration: {step.duration}</span>
                    )}
                  </div>
                  {step.metadata && Object.keys(step.metadata).length > 0 && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                      {Object.entries(step.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {step.actions && step.actions.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {step.actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        size="sm"
                        variant={action.variant || "secondary"}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)

Timeline.displayName = "Timeline"

export { Timeline, type TimelineStep }