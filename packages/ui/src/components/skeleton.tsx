import * as React from "react"
import { cn } from "../lib/utils"

interface SkeletonProps {
  className?: string
  animate?: boolean
}

const Skeleton: React.FC<SkeletonProps> = ({ className, animate = true }) => (
  <div className={cn(
    "bg-muted rounded-md",
    animate && "animate-pulse",
    className
  )} />
)

export const CanvasLoadingSkeleton = () => (
  <div className="canvas-loading p-6 space-y-6">
    {/* Micro-graph skeleton */}
    <div className="flex justify-between items-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center space-y-2">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="w-16 h-4" />
        </div>
      ))}
    </div>
    
    {/* Timeline skeleton */}
    <Skeleton className="w-full h-8" />
    
    {/* Step cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      ))}
    </div>
  </div>
)

export const DecisionCardSkeleton = () => (
  <div className="decision-card-skeleton p-6 border rounded-lg space-y-4">
    <div className="flex justify-between items-start">
      <Skeleton className="w-48 h-6" />
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton className="w-full h-20" />
    <div className="flex justify-between">
      <Skeleton className="w-24 h-4" />
      <Skeleton className="w-24 h-4" />
    </div>
    <div className="flex space-x-2">
      <Skeleton className="w-20 h-8" />
      <Skeleton className="w-24 h-8" />
      <Skeleton className="w-20 h-8" />
    </div>
  </div>
)

export const WorkspaceCardSkeleton = () => (
  <div className="workspace-card-skeleton p-6 border rounded-lg space-y-4">
    <div className="flex justify-between items-start">
      <Skeleton className="w-32 h-6" />
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton className="w-full h-16" />
    <div className="flex justify-between">
      <Skeleton className="w-20 h-4" />
      <Skeleton className="w-20 h-4" />
    </div>
  </div>
)

export const DashboardSkeleton = () => (
  <div className="dashboard-skeleton space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="w-48 h-8" />
      <Skeleton className="w-32 h-10" />
    </div>
    
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-2">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-16 h-8" />
          <Skeleton className="w-20 h-3" />
        </div>
      ))}
    </div>
    
    {/* Workspace grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <WorkspaceCardSkeleton key={i} />
      ))}
    </div>
  </div>
)

export { Skeleton }