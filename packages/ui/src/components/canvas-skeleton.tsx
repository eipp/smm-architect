import * as React from "react"
import { cn } from "@/lib/utils"

export interface CanvasSkeletonProps {
  className?: string
  showSteps?: boolean
  stepCount?: number
}

const CanvasSkeleton = React.forwardRef<HTMLDivElement, CanvasSkeletonProps>(
  ({ className, showSteps = true, stepCount = 6 }, ref) => {
    return (
      <div ref={ref} className={cn("w-full space-y-6 p-6", className)}>
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded-md w-64 animate-pulse" />
          <div className="h-4 bg-muted rounded-md w-96 animate-pulse" />
        </div>

        {/* Micro-graph skeleton */}
        {showSteps && (
          <div className="bg-canvas-background border rounded-lg p-6">
            <div className="flex justify-between items-center">
              {Array.from({ length: stepCount }).map((_, index) => (
                <div key={index} className="flex items-center">
                  {/* Step node */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
                    <div className="mt-2 text-center">
                      <div className="h-3 bg-muted rounded w-12 mx-auto animate-pulse" />
                      <div className="h-2 bg-muted rounded w-8 mx-auto mt-1 animate-pulse" />
                    </div>
                  </div>
                  
                  {/* Connector */}
                  {index < stepCount - 1 && (
                    <div className="w-16 h-0.5 bg-muted mx-4 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline skeleton */}
        <div className="space-y-4">
          <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-48 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-96 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="h-5 bg-muted rounded w-48 animate-pulse" />
              <div className="h-3 bg-muted rounded w-full animate-pulse" />
              <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              <div className="flex space-x-2 pt-2">
                <div className="h-8 bg-muted rounded w-20 animate-pulse" />
                <div className="h-8 bg-muted rounded w-24 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Replay scrubber skeleton */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          <div className="relative">
            <div className="w-full h-2 bg-muted rounded animate-pulse" />
            <div className="w-4 h-4 bg-muted rounded-full absolute top-[-4px] left-1/3 animate-pulse" />
          </div>
          <div className="flex justify-between text-xs">
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }
)
CanvasSkeleton.displayName = "CanvasSkeleton"

export { CanvasSkeleton }