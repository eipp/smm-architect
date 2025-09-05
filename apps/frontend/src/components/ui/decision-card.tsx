"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { Button } from "./button"
import { Badge } from "./badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card"
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield
} from "lucide-react"

export interface ProvenanceLink {
  title: string
  url: string
  verified: boolean
  type: 'report' | 'article' | 'template' | 'research'
  confidence?: number
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
  onRequestChanges?: (feedback: string) => void
  onEscalate?: () => void
  loading?: boolean
  className?: string
}

const DecisionCard: React.FC<DecisionCardProps> = ({
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
  loading = false,
  className
}) => {
  const [showDetails, setShowDetails] = React.useState(false)
  const [showSources, setShowSources] = React.useState(false)

  // Calculate time until expiry
  const timeToExpiry = React.useMemo(() => {
    const now = new Date()
    const diffMs = expiresAt.getTime() - now.getTime()
    
    if (diffMs <= 0) return "Expired"

    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 72) return `${hours}h left`

    const days = Math.floor(hours / 24)
    return `${days}d left`
  }, [expiresAt])

  const isExpired = expiresAt.getTime() <= Date.now()

  // Score color helpers
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return "text-green-600 bg-green-50"
      case 'medium': return "text-yellow-600 bg-yellow-50"
      case 'high': return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: costBreakdown.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card
      role="article"
      className={cn("decision-card relative", isExpired && "opacity-75", className)}
    >
      {isExpired && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="destructive">Expired</Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-4">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1">{oneLine}</CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge 
              className={cn("text-xs", getRiskColor(duplicateRisk))}
              variant="outline"
            >
              Duplicate: {duplicateRisk}
            </Badge>
            <div className="text-xs text-muted-foreground flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {timeToExpiry}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
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
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(costBreakdown.total)}
            </div>
            <div className="text-xs text-muted-foreground">{costBreakdown.timeframe}</div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Citations: {Math.round(citationCoverage * 100)}%</span>
          <span className="text-muted-foreground">Action ID: {actionId}</span>
        </div>

        {/* Details Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full justify-between"
        >
          More details
          {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {/* Expanded Details */}
        {showDetails && (
          <div className="space-y-4 pt-2 border-t">
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
                  <span>Third Party Services</span>
                  <span>{formatCurrency(costBreakdown.thirdPartyServices)}</span>
                </div>
              </div>
            </div>

            {/* Sources */}
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSources(!showSources)}
                className="w-full justify-between"
              >
                Show Sources
                {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {showSources && (
                <div className="mt-2 space-y-2">
                  {provenance.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                      <div className="flex items-center space-x-2">
                        {source.verified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span>{source.title}</span>
                        {source.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(source.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={loading || isExpired}
              className="flex-1"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          )}
          
          {onReject && (
            <Button
              variant="outline"
              onClick={onReject}
              disabled={loading || isExpired}
              className="flex-1"
              size="sm"
            >
              Reject
            </Button>
          )}
          
          {onRequestChanges && (
            <Button
              variant="outline"
              onClick={() => onRequestChanges("")}
              disabled={loading || isExpired}
              size="sm"
            >
              Request Changes
            </Button>
          )}
          
          {onEscalate && (
            <Button
              variant="ghost"
              onClick={onEscalate}
              disabled={loading || isExpired}
              size="sm"
            >
              <Shield className="h-4 w-4 mr-1" />
              Escalate
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  )
}

export { DecisionCard }

