import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from './card'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Search
} from 'lucide-react'
import { cn } from '../lib/utils'

// Types
export interface AuditEvent {
  id: string
  timestamp: Date
  actor: {
    id: string
    name: string
    type: 'user' | 'system' | 'agent'
    ip?: string
  }
  action: string
  resource: {
    type: string
    id: string
    path?: string
  }
  result: 'success' | 'failure' | 'warning' | 'info'
  details: Record<string, any>
  metadata: {
    sessionId?: string
    userAgent?: string
    source: string
    correlationId?: string
  }
  signature?: {
    algorithm: string
    value: string
    verified: boolean
    keyId: string
  }
  compliance: {
    status: 'compliant' | 'violation' | 'pending'
    standards: string[]
    notes?: string
  }
}

export interface DecisionStep {
  id: string
  timestamp: Date
  actor: string
  action: string
  reasoning: string
  context: Record<string, any>
  outcome: 'approved' | 'rejected' | 'modified' | 'escalated'
  confidence?: number
  aiAssisted?: boolean
}

export interface DecisionProvenance {
  id: string
  subject: string
  initialRequest: any
  finalDecision: any
  steps: DecisionStep[]
  totalDuration: number
  complexity: 'low' | 'medium' | 'high'
  reviewRequired: boolean
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf'
  dateRange: { start: Date; end: Date }
  filters: {
    actors?: string[]
    actions?: string[]
    resources?: string[]
    results?: string[]
  }
  includeSignatures: boolean
  includeDetails: boolean
}

// Simple component implementations
const SignatureVerificationBadge = ({ signature }: { signature?: AuditEvent['signature'] }) => {
  if (!signature) {
    return <Badge variant="outline">No signature</Badge>
  }
  return (
    <Badge variant={signature.verified ? "default" : "destructive"}>
      {signature.verified ? 'Verified' : 'Invalid'}
    </Badge>
  )
}

const ComplianceStatusIndicator = ({ compliance }: { compliance: AuditEvent['compliance'] }) => {
  return (
    <div className="space-y-1">
      <Badge variant="outline">{compliance.status}</Badge>
    </div>
  )
}

// Main component
export interface AuditTrailProps {
  events?: AuditEvent[]
  provenance?: DecisionProvenance[]
  onExport?: (options: ExportOptions) => void
  className?: string
}

export const AuditTrail = React.forwardRef<HTMLDivElement, AuditTrailProps>(
  ({ events = [], provenance = [], onExport, className, ...props }, ref) => {
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
    const [searchTerm, setSearchTerm] = useState('')

    const toggleExpanded = useCallback((eventId: string) => {
      setExpandedEvents(prev => {
        const next = new Set(prev)
        if (next.has(eventId)) {
          next.delete(eventId)
        } else {
          next.add(eventId)
        }
        return next
      })
    }, [])

    const filteredEvents = useMemo(() => {
      return events.filter(event => {
        if (searchTerm && !event.action.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false
        }
        return true
      })
    }, [events, searchTerm])

    return (
      <div ref={ref} className={cn("max-w-7xl mx-auto p-6 space-y-6", className)} {...props}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Audit Trail</h1>
            <p className="text-neutral-600">Complete audit log with cryptographic verification</p>
          </div>
          <Button variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Security Dashboard
          </Button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <Input
                      placeholder="Search events..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-neutral-200 rounded-lg overflow-hidden"
              >
                <div 
                  className="p-4 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => toggleExpanded(event.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {expandedEvents.has(event.id) ? (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                        <CheckCircle className="w-4 h-4 text-success-600" />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-neutral-900 truncate">
                            {event.action}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {event.resource.type}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-neutral-600">
                          <User className="w-3 h-3" />
                          <span>{event.actor.name}</span>
                          <Calendar className="w-3 h-3 ml-2" />
                          <span>{event.timestamp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <SignatureVerificationBadge signature={event.signature} />
                      <ComplianceStatusIndicator compliance={event.compliance} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {filteredEvents.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-neutral-500">
                  No audit events found matching your criteria.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
  }
)

AuditTrail.displayName = "AuditTrail"

export { AuditTrail }
export default AuditTrail