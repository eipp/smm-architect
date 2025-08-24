"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Eye,
  Settings
} from "lucide-react"

export interface MetricCard {
  title: string
  value: number | string
  unit?: string
  change?: { value: number; period: string; type: 'increase' | 'decrease' }
  status: 'normal' | 'warning' | 'critical'
  threshold?: { warning: number; critical: number }
  icon?: React.ReactNode
}

export interface Alert {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: Date
  acknowledged: boolean
  source: string
}

export interface MonitoringData {
  metrics: {
    budget: {
      utilized: number
      remaining: number
      total: number
      currency: string
    }
    workspaces: {
      active: number
      total: number
      paused: number
    }
    agents: {
      successRate: number
      totalRuns: number
      failedRuns: number
    }
    connectors: {
      healthy: number
      total: number
      errors: number
    }
    performance: {
      avgResponseTime: number
      uptime: number
      errorRate: number
    }
  }
  alerts: {
    critical: Alert[]
    warning: Alert[]
    info: Alert[]
  }
  slos: {
    availability: number
    responseTime: number
    errorRate: number
  }
  realTimeEvents: {
    timestamp: Date
    type: 'workspace_created' | 'campaign_started' | 'approval_required' | 'error_occurred'
    message: string
  }[]
}

// Mock data for demo
const mockMonitoringData: MonitoringData = {
  metrics: {
    budget: {
      utilized: 3400,
      remaining: 1600,
      total: 5000,
      currency: 'USD'
    },
    workspaces: {
      active: 8,
      total: 12,
      paused: 2
    },
    agents: {
      successRate: 0.956,
      totalRuns: 450,
      failedRuns: 20
    },
    connectors: {
      healthy: 5,
      total: 6,
      errors: 1
    },
    performance: {
      avgResponseTime: 245,
      uptime: 0.997,
      errorRate: 0.008
    }
  },
  alerts: {
    critical: [
      {
        id: 'alert-1',
        title: 'Facebook Connector Down',
        message: 'OAuth token expired for Facebook connector',
        severity: 'critical',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        acknowledged: false,
        source: 'connector-facebook'
      }
    ],
    warning: [
      {
        id: 'alert-2',
        title: 'Budget Alert',
        message: 'Weekly budget 80% utilized',
        severity: 'warning',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        acknowledged: true,
        source: 'budget-monitor'
      }
    ],
    info: []
  },
  slos: {
    availability: 0.997,
    responseTime: 0.95,
    errorRate: 0.992
  },
  realTimeEvents: [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      type: 'campaign_started',
      message: 'Campaign "Holiday Social Push" started'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      type: 'approval_required',
      message: 'Campaign "Product Launch" requires approval'
    }
  ]
}

export interface MonitoringDashboardProps {
  data?: MonitoringData
  onEmergencyPause?: () => void
  onRefresh?: () => void
  className?: string
}

export const MonitoringDashboard = React.forwardRef<HTMLDivElement, MonitoringDashboardProps>(
  ({ data = mockMonitoringData, onEmergencyPause, onRefresh, className }, ref) => {
    const [isPaused, setIsPaused] = React.useState(false)
    const [showConfirm, setShowConfirm] = React.useState(false)

    const handleEmergencyPause = () => {
      if (!showConfirm) {
        setShowConfirm(true)
        return
      }
      
      setIsPaused(true)
      setShowConfirm(false)
      onEmergencyPause?.()
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.metrics.budget.currency
      }).format(amount)
    }

    const getMetricStatus = (value: number, thresholds?: { warning: number; critical: number }) => {
      if (!thresholds) return 'normal'
      if (value >= thresholds.critical) return 'critical'
      if (value >= thresholds.warning) return 'warning'
      return 'normal'
    }

    const budgetUtilizationPct = (data.metrics.budget.utilized / data.metrics.budget.total) * 100
    const agentSuccessRatePct = data.metrics.agents.successRate * 100
    const uptimePct = data.metrics.performance.uptime * 100

    const metricCards: MetricCard[] = [
      {
        title: "Budget Utilization",
        value: budgetUtilizationPct.toFixed(1),
        unit: "%",
        change: { value: 12, period: "this week", type: "increase" },
        status: getMetricStatus(budgetUtilizationPct, { warning: 80, critical: 95 }),
        threshold: { warning: 80, critical: 95 },
        icon: <DollarSign className="h-4 w-4" />
      },
      {
        title: "Active Workspaces",
        value: data.metrics.workspaces.active,
        unit: "workspaces",
        status: "normal",
        icon: <Activity className="h-4 w-4" />
      },
      {
        title: "Agent Success Rate",
        value: agentSuccessRatePct.toFixed(1),
        unit: "%",
        status: getMetricStatus(100 - agentSuccessRatePct, { warning: 5, critical: 10 }),
        threshold: { warning: 95, critical: 90 },
        icon: <Zap className="h-4 w-4" />
      },
      {
        title: "Connector Health",
        value: `${data.metrics.connectors.healthy}/${data.metrics.connectors.total}`,
        status: data.metrics.connectors.healthy < data.metrics.connectors.total ? "warning" : "normal",
        icon: <CheckCircle className="h-4 w-4" />
      }
    ]

    return (
      <div ref={ref} className={cn("monitoring-dashboard space-y-6", className)}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">System Monitoring</h2>
            <p className="text-muted-foreground">Real-time platform health and metrics</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Alerts
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {data.alerts.critical.length > 0 && (
          <AlertBanner alerts={data.alerts.critical} severity="critical" />
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((metric, index) => (
            <MetricCardComponent key={index} metric={metric} />
          ))}
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Utilized</span>
                  <span className="font-semibold">
                    {formatCurrency(data.metrics.budget.utilized)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining</span>
                  <span className="font-semibold">
                    {formatCurrency(data.metrics.budget.remaining)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Total Budget</span>
                  <span>{formatCurrency(data.metrics.budget.total)}</span>
                </div>
              </div>
              
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className={cn(
                    "h-3 rounded-full transition-all",
                    budgetUtilizationPct > 95 ? "bg-red-500" :
                    budgetUtilizationPct > 80 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(budgetUtilizationPct, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uptimePct.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {data.metrics.performance.avgResponseTime}ms
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Response</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span className={cn(
                    "font-semibold",
                    data.metrics.performance.errorRate > 0.02 ? "text-red-600" : "text-green-600"
                  )}>
                    {(data.metrics.performance.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed Agent Runs</span>
                  <span className="font-semibold">
                    {data.metrics.agents.failedRuns} / {data.metrics.agents.totalRuns}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Events & Emergency Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real-time Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Recent Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.realTimeEvents.slice(0, 5).map((event, index) => (
                  <div key={index} className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                    <span className="flex-1">{event.message}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Controls */}
          <EmergencyControlPanel
            isPaused={isPaused}
            showConfirm={showConfirm}
            onPause={handleEmergencyPause}
            onCancel={() => setShowConfirm(false)}
          />
        </div>
      </div>
    )
  }
)
MonitoringDashboard.displayName = "MonitoringDashboard"

// Helper Components
const MetricCardComponent: React.FC<{ metric: MetricCard }> = ({ metric }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-green-600'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
        {metric.icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", getStatusColor(metric.status))}>
          {metric.value}{metric.unit}
        </div>
        {metric.change && (
          <p className="text-xs text-muted-foreground flex items-center mt-1">
            {metric.change.type === 'increase' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {metric.change.type === 'increase' ? '+' : ''}{metric.change.value}% {metric.change.period}
          </p>
        )}
        {metric.threshold && metric.status !== 'normal' && (
          <p className="text-xs mt-1">
            <Badge variant={metric.status === 'critical' ? 'destructive' : 'warning'} className="text-xs">
              {metric.status === 'critical' ? 'Critical' : 'Warning'}
            </Badge>
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const AlertBanner: React.FC<{ alerts: Alert[]; severity: 'critical' | 'warning' }> = ({ 
  alerts, 
  severity 
}) => {
  if (alerts.length === 0) return null

  return (
    <div className={cn(
      "p-4 rounded-lg border-l-4",
      severity === 'critical' 
        ? "bg-red-50 border-red-500 text-red-800" 
        : "bg-yellow-50 border-yellow-500 text-yellow-800"
    )}>
      <div className="flex items-center space-x-2">
        {severity === 'critical' ? (
          <XCircle className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
        <h3 className="font-semibold">
          {severity === 'critical' ? 'Critical Alerts' : 'Warning Alerts'}
        </h3>
        <Badge variant={severity === 'critical' ? 'destructive' : 'warning'}>
          {alerts.length}
        </Badge>
      </div>
      <div className="mt-2 space-y-1">
        {alerts.slice(0, 3).map((alert) => (
          <div key={alert.id} className="text-sm">
            <strong>{alert.title}:</strong> {alert.message}
          </div>
        ))}
        {alerts.length > 3 && (
          <p className="text-sm">+{alerts.length - 3} more alerts</p>
        )}
      </div>
    </div>
  )
}

const EmergencyControlPanel: React.FC<{
  isPaused: boolean
  showConfirm: boolean
  onPause: () => void
  onCancel: () => void
}> = ({ isPaused, showConfirm, onPause, onCancel }) => {
  return (
    <Card className="border-warning/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" />
          Emergency Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use these controls only in emergency situations to immediately halt all active campaigns and agents.
        </p>
        
        <div className="flex space-x-3">
          {isPaused ? (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <Play className="mr-2 h-4 w-4" />
              Resume All
            </Button>
          ) : (
            <Button 
              variant={showConfirm ? "destructive" : "outline"}
              onClick={onPause}
            >
              <Pause className="mr-2 h-4 w-4" />
              {showConfirm ? "Confirm: Pause All" : "Emergency Pause All"}
            </Button>
          )}
          
          {showConfirm && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        
        {showConfirm && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This will immediately pause all active campaigns and agents. Are you sure?
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Utility functions
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export { AlertBanner, MetricCardComponent, EmergencyControlPanel }
export type { MonitoringData, Alert, MetricCard }