import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card"
import { Button } from "./button"
import { Badge } from "./badge"

export interface ProvenanceLink {
  title: string
  url: string
  verified: boolean
  type: 'website' | 'social' | 'report' | 'document'
}

export interface CostBreakdown {
  paidAds: number
  llmModelSpend: number
  rendering: number
  thirdPartyServices: number
  total: number
  currency: string
  timeframe: string
}

export interface DecisionCardProps {
  actionId: string
  title: string
  oneLine: string
  readinessScore: number
  policyPassPct: number
  citationCoverage: number
  duplicateRisk: 'low' | 'medium' | 'high'
  costBreakdown: CostBreakdown
  provenance: ProvenanceLink[]
  expiresAt: Date
  onApprove?: () => void
  onReject?: () => void
  onRequestChanges?: () => void
  onEscalate?: () => void
  className?: string
  loading?: boolean
}

const DecisionCard = React.forwardRef<HTMLDivElement, DecisionCardProps>(
  ({
    actionId,
    title,
    oneLine,
    readinessScore,
    policyPassPct,
    citationCoverage,
    duplicateRisk,
    costBreakdown,
    provenance,
    expiresAt,
    onApprove,
    onReject,
    onRequestChanges,
    onEscalate,
    className,
    loading = false,
    ...props
  }, ref) => {
    const [expanded, setExpanded] = React.useState(false)
    const [showProvenance, setShowProvenance] = React.useState(false)

    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'low': return 'success'
        case 'medium': return 'warning'
        case 'high': return 'destructive'
        default: return 'secondary'
      }
    }

    const getScoreColor = (score: number) => {
      if (score >= 0.8) return 'text-green-600'
      if (score >= 0.6) return 'text-yellow-600'
      return 'text-red-600'
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: costBreakdown.currency
      }).format(amount)
    }

    const timeUntilExpiry = Math.max(0, expiresAt.getTime() - Date.now())
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))

    return (
      <Card ref={ref} className={cn("w-full max-w-2xl", className)} {...props}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">{oneLine}</p>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant={hoursUntilExpiry > 24 ? 'secondary' : 'warning'}>
                {hoursUntilExpiry > 0 ? `${hoursUntilExpiry}h left` : 'Expired'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? 'Less details' : 'More details'}
              </Button>
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className={cn("text-2xl font-bold", getScoreColor(readinessScore))}>
                {Math.round(readinessScore * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Readiness</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", getScoreColor(policyPassPct))}>
                {Math.round(policyPassPct * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Policy Pass</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(costBreakdown.total)}
              </div>
              <div className="text-xs text-muted-foreground">
                {costBreakdown.timeframe}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Risk indicators */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Risk Assessment</span>
            <div className="flex space-x-2">
              <Badge variant={getRiskColor(duplicateRisk)}>
                Duplicate: {duplicateRisk}
              </Badge>
              <Badge variant={citationCoverage > 0.8 ? 'success' : 'warning'}>
                Citations: {Math.round(citationCoverage * 100)}%
              </Badge>
            </div>
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="space-y-4 border-t pt-4">
              {/* Cost breakdown */}
              <div>
                <h4 className="font-medium mb-2">Cost Breakdown</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Paid Ads</span>
                    <span>{formatCurrency(costBreakdown.paidAds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LLM Model Spend</span>
                    <span>{formatCurrency(costBreakdown.llmModelSpend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rendering</span>
                    <span>{formatCurrency(costBreakdown.rendering)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Third-party Services</span>
                    <span>{formatCurrency(costBreakdown.thirdPartyServices)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total</span>
                    <span>{formatCurrency(costBreakdown.total)}</span>
                  </div>
                </div>
              </div>

              {/* Provenance links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Source Verification</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProvenance(!showProvenance)}
                  >
                    {showProvenance ? 'Hide' : 'Show'} Sources
                  </Button>
                </div>
                
                {showProvenance && (
                  <div className="space-y-2">
                    {provenance.slice(0, 3).map((source, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant={source.verified ? 'success' : 'warning'} className="text-xs">
                            {source.verified ? 'Verified' : 'Unverified'}
                          </Badge>
                          <span className="text-sm">{source.title}</span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={source.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                    {provenance.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{provenance.length - 3} more sources
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between pt-4">
          <div className="flex space-x-2">
            {onRequestChanges && (
              <Button variant="outline" onClick={onRequestChanges} disabled={loading}>
                Request Changes
              </Button>
            )}
            {onEscalate && (
              <Button variant="outline" onClick={onEscalate} disabled={loading}>
                Escalate
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            {onReject && (
              <Button variant="destructive" onClick={onReject} disabled={loading}>
                Reject
              </Button>
            )}
            {onApprove && (
              <Button onClick={onApprove} disabled={loading} loading={loading}>
                Approve & Start
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    )
  }
)
DecisionCard.displayName = "DecisionCard"

export { DecisionCard }