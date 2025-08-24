import { DashboardSkeleton } from '@smm-architect/ui'

export default function Loading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <DashboardSkeleton />
    </div>
  )
}