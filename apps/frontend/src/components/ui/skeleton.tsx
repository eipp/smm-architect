import * as React from "react"
import { cn } from "@/lib/cn"

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
        <div key={i} className="p-6 border rounded-lg space-y-4">
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
      ))}
    </div>
  </div>
)

export { Skeleton }