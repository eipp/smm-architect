import * as React from "react"
import { cn } from "../lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "./card"
import { Badge } from "./badge"
import { Button } from "./button"
import { Progress } from "./progress"

export interface SimulationConfig {
  iterations: number
  timeHorizon: number
  confidenceLevel: number
  seed?: number
}

export interface SimulationMetrics {
  reach: {
    mean: number
    p10: number
    p50: number
    p90: number
    confidenceBands: Array<{ x: number; lower: number; upper: number; mean: number }>
  }
  engagement: {
    mean: number
    p10: number
    p50: number
    p90: number
    confidenceBands: Array<{ x: number; lower: number; upper: number; mean: number }>
  }
  cost: {
    total: number
    breakdown: Array<{ category: string; amount: number; percentage: number }>
    projections: Array<{ period: string; min: number; max: number; expected: number }>
  }
  roi: {
    expected: number
    range: { min: number; max: number }
    probability: { positive: number; breakeven: number }
  }
  risks: Array<{
    id: string
    category: 'budget' | 'performance' | 'compliance' | 'timeline'
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    probability: number
    impact: number
    mitigation?: string
  }>
}

export interface SimulationDashboardProps {
  config: SimulationConfig
  metrics?: SimulationMetrics
  status: 'idle' | 'running' | 'completed' | 'error'
  progress?: number
  onConfigChange?: (config: SimulationConfig) => void
  onRunSimulation?: () => void
  onStopSimulation?: () => void
  onExportResults?: () => void
  className?: string
}

const SimulationDashboard = React.forwardRef<HTMLDivElement, SimulationDashboardProps>(
  ({
    config,
    metrics,
    status,
    progress = 0,
    onConfigChange,
    onRunSimulation,
    onStopSimulation,
    onExportResults,
    className
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'metrics' | 'risks' | 'config'>('overview')
    
    const formatNumber = (num: number, type: 'currency' | 'percentage' | 'number' = 'number') => {
      switch (type) {
        case 'currency':
          return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num)
        case 'percentage':
          return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1 }).format(num / 100)
        default:
          return new Intl.NumberFormat('en-US').format(num)
      }
    }
    
    const getStatusColor = (status: typeof status) => {
      switch (status) {
        case 'running':
          return 'bg-primary-500'
        case 'completed':
          return 'bg-success-500'
        case 'error':
          return 'bg-error-500'
        default:
          return 'bg-neutral-400'
      }
    }
    
    const getRiskColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
      switch (severity) {
        case 'low':
          return 'bg-success-100 text-success-800'
        case 'medium':
          return 'bg-warning-100 text-warning-800'
        case 'high':
          return 'bg-error-100 text-error-800'
        case 'critical':
          return 'bg-error-200 text-error-900'
        default:
          return 'bg-neutral-100 text-neutral-800'
      }
    }

    return (
      <div ref={ref} className={cn("space-y-6", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Campaign Simulation</h2>
            <p className="text-sm text-neutral-600">Monte Carlo analysis with {formatNumber(config.iterations)} iterations</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
              getStatusColor(status), 
              "text-white"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                status === 'running' && "animate-pulse",
                "bg-white"
              )} />
              <span className="capitalize">{status}</span>
            </div>
            
            {status === 'running' ? (
              <Button variant="outline" size="sm" onClick={onStopSimulation}>
                Stop
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={onRunSimulation}>
                Run Simulation
              </Button>
            )}
            
            {metrics && status === 'completed' && (
              <Button variant="outline" size="sm" onClick={onExportResults}>
                Export Results
              </Button>
            )}
          </div>
        </div>

        {/* Progress */}
        {status === 'running' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Simulation Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-neutral-500">
                  Running Monte Carlo simulation...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-neutral-200">
          <nav className="flex space-x-8">
            {['overview', 'metrics', 'risks', 'config'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab
                    ? "border-primary-500 text-primary-600"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Forecast</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Expected Reach</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatNumber(metrics.reach.mean)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Range: {formatNumber(metrics.reach.p10)} - {formatNumber(metrics.reach.p90)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Expected Engagement</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatNumber(metrics.engagement.mean)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Range: {formatNumber(metrics.engagement.p10)} - {formatNumber(metrics.engagement.p90)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-neutral-600">ROI Probability</p>
                    <Badge variant="success">{formatNumber(metrics.roi.probability.positive, 'percentage')}</Badge>
                  </div>
                  <div className="w-full bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-success-500 h-2 rounded-full" 
                      style={{ width: `${metrics.roi.probability.positive}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">Total Expected Cost</p>
                    <p className="text-2xl font-bold text-neutral-900">
                      {formatNumber(metrics.cost.total, 'currency')}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {metrics.cost.breakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">{item.category}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium">{formatNumber(item.amount, 'currency')}</span>
                          <span className="text-xs text-neutral-500 ml-2">
                            ({formatNumber(item.percentage, 'percentage')})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'risks' && metrics && (
          <div className="space-y-4">
            {metrics.risks.map((risk) => (
              <Card key={risk.id} className="border-l-4 border-l-current">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getRiskColor(risk.severity)}>
                          {risk.severity}
                        </Badge>
                        <span className="text-xs text-neutral-500 uppercase tracking-wide">
                          {risk.category}
                        </span>
                      </div>
                      <p className="font-medium text-neutral-900 mb-1">{risk.description}</p>
                      {risk.mitigation && (
                        <p className="text-sm text-neutral-600">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-neutral-600">Probability</p>
                      <p className="font-medium">{formatNumber(risk.probability, 'percentage')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'config' && (
          <Card>
            <CardHeader>
              <CardTitle>Simulation Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Iterations
                  </label>
                  <input
                    type="number"
                    value={config.iterations}
                    onChange={(e) => onConfigChange?.({ ...config, iterations: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                    min="100"
                    max="10000"
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Time Horizon (days)
                  </label>
                  <input
                    type="number"
                    value={config.timeHorizon}
                    onChange={(e) => onConfigChange?.({ ...config, timeHorizon: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                    min="1"
                    max="365"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Confidence Level (%)
                  </label>
                  <input
                    type="number"
                    value={config.confidenceLevel}
                    onChange={(e) => onConfigChange?.({ ...config, confidenceLevel: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                    min="80"
                    max="99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Random Seed (optional)
                  </label>
                  <input
                    type="number"
                    value={config.seed || ''}
                    onChange={(e) => onConfigChange?.({ ...config, seed: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm"
                    placeholder="Auto-generated"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }
)

SimulationDashboard.displayName = "SimulationDashboard"

export { SimulationDashboard }
export type { SimulationConfig, SimulationMetrics, SimulationDashboardProps }