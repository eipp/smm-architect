"use client"

import * as React from "react"
import { useState, useCallback, useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../lib/utils"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Badge } from "./badge"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
  Hash,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from "lucide-react"

// Audit Event Types
export interface AuditEvent {
  id: string
  timestamp: Date
  actor: {
    id: string
    name: string
    email: string
    ip?: string
    userAgent?: string
  }
  action: string
  resource: {
    type: string
    id: string
    name?: string
  }
  details: Record<string, any>
  result: 'success' | 'failure' | 'warning'
  signature?: {
    algorithm: string
    value: string
    verified: boolean
    verifiedAt?: Date
  }
  compliance: {
    standards: string[]
    status: 'compliant' | 'violation' | 'pending'
    notes?: string
  }
  metadata: {
    sessionId?: string
    requestId?: string
    organizationId?: string
    tenantId?: string
    source: 'web' | 'api' | 'cli' | 'webhook'
  }
}

// Decision Provenance Types
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

// Signature Verification Badge
const SignatureVerificationBadge = ({ 
  signature 
}: { 
  signature?: AuditEvent['signature'] 
}) => {
  if (!signature) {
    return (
      <Badge variant="outline" className="text-neutral-600">
        <ShieldAlert className="w-3 h-3 mr-1" />
        No signature
      </Badge>
    )
  }

  const verified = signature.verified
  const variant = verified ? "default" : "destructive"
  const icon = verified ? ShieldCheck : ShieldAlert
  const Icon = icon

  return (
    <Badge variant={variant} className={cn(
      verified ? "bg-success-100 text-success-700 border-success-300" : 
                 "bg-error-100 text-error-700 border-error-300"
    )}>
      <Icon className="w-3 h-3 mr-1" />
      {verified ? 'Verified' : 'Invalid'}
    </Badge>
  )
}

// Compliance Status Indicator
const ComplianceStatusIndicator = ({ 
  compliance 
}: { 
  compliance: AuditEvent['compliance'] 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-success-100 text-success-700 border-success-300'
      case 'violation': return 'bg-error-100 text-error-700 border-error-300'
      case 'pending': return 'bg-warning-100 text-warning-700 border-warning-300'
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return CheckCircle
      case 'violation': return XCircle
      case 'pending': return Clock
      default: return AlertTriangle
    }
  }

  const Icon = getStatusIcon(compliance.status)

  return (
    <div className="space-y-1">
      <Badge className={cn("text-xs", getStatusColor(compliance.status))}>
        <Icon className="w-3 h-3 mr-1" />
        {compliance.status}
      </Badge>
      <div className="flex flex-wrap gap-1">
        {compliance.standards.map((standard) => (
          <Badge key={standard} variant="outline" className="text-xs">
            {standard}
          </Badge>
        ))}
      </div>
    </div>
  )
}

// Audit Event Row
const AuditEventRow = ({ 
  event, 
  onExpand,
  isExpanded 
}: { 
  event: AuditEvent
  onExpand: (id: string) => void
  isExpanded: boolean
}) => {
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success': return CheckCircle
      case 'failure': return XCircle
      case 'warning': return AlertTriangle
      default: return Clock
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'success': return 'text-success-600'
      case 'failure': return 'text-error-600'
      case 'warning': return 'text-warning-600'
      default: return 'text-neutral-600'
    }
  }

  const ResultIcon = getResultIcon(event.result)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-neutral-200 rounded-lg overflow-hidden"
    >
      <div 
        className="p-4 hover:bg-neutral-50 cursor-pointer"
        onClick={() => onExpand(event.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              )}
              <ResultIcon className={cn("w-4 h-4", getResultColor(event.result))} />
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
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">Event Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Resource:</span>
                      <span className="font-mono text-xs">{event.resource.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Session ID:</span>
                      <span className="font-mono text-xs">{event.metadata.sessionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Source:</span>
                      <Badge variant="outline" className="text-xs">{event.metadata.source}</Badge>
                    </div>
                    {event.actor.ip && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600">IP Address:</span>
                        <span className="font-mono text-xs">{event.actor.ip}</span>
                      </div>
                    )}\n                  </div>\n                </div>\n                \n                <div>\n                  <h4 className=\"font-medium text-neutral-900 mb-2\">Security</h4>\n                  <div className=\"space-y-2 text-sm\">\n                    {event.signature && (\n                      <div>\n                        <div className=\"flex justify-between mb-1\">\n                          <span className=\"text-neutral-600\">Algorithm:</span>\n                          <span className=\"font-mono text-xs\">{event.signature.algorithm}</span>\n                        </div>\n                        <div className=\"flex justify-between\">\n                          <span className=\"text-neutral-600\">Signature:</span>\n                          <span className=\"font-mono text-xs truncate max-w-32\">\n                            {event.signature.value.substring(0, 16)}...\n                          </span>\n                        </div>\n                      </div>\n                    )}\n                    \n                    <div className=\"mt-3\">\n                      <span className=\"text-neutral-600 text-xs\">Compliance Notes:</span>\n                      <p className=\"text-xs text-neutral-700 mt-1\">\n                        {event.compliance.notes || 'No additional notes'}\n                      </p>\n                    </div>\n                  </div>\n                </div>\n              </div>\n              \n              {Object.keys(event.details).length > 0 && (\n                <div className=\"mt-4\">\n                  <h4 className=\"font-medium text-neutral-900 mb-2\">Additional Details</h4>\n                  <div className=\"bg-white p-3 rounded border\">\n                    <pre className=\"text-xs text-neutral-700 overflow-auto\">\n                      {JSON.stringify(event.details, null, 2)}\n                    </pre>\n                  </div>\n                </div>\n              )}\n            </div>\n          </motion.div>\n        )}\n      </AnimatePresence>\n    </motion.div>\n  )\n}\n\n// Decision Provenance Visualization\nconst DecisionProvenanceVisualization = ({ \n  provenance \n}: { \n  provenance: DecisionProvenance \n}) => {\n  const getOutcomeColor = (outcome: string) => {\n    switch (outcome) {\n      case 'approved': return 'text-success-600 bg-success-100'\n      case 'rejected': return 'text-error-600 bg-error-100'\n      case 'modified': return 'text-warning-600 bg-warning-100'\n      case 'escalated': return 'text-primary-600 bg-primary-100'\n      default: return 'text-neutral-600 bg-neutral-100'\n    }\n  }\n\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle className=\"flex items-center justify-between\">\n          <span>Decision Provenance</span>\n          <div className=\"flex items-center space-x-2\">\n            <Badge variant=\"outline\">\n              {provenance.steps.length} steps\n            </Badge>\n            <Badge variant=\"outline\">\n              {Math.round(provenance.totalDuration / 1000)}s\n            </Badge>\n          </div>\n        </CardTitle>\n      </CardHeader>\n      <CardContent>\n        <div className=\"space-y-4\">\n          <div className=\"text-sm\">\n            <span className=\"font-medium\">Subject:</span> {provenance.subject}\n          </div>\n          \n          <div className=\"relative\">\n            {provenance.steps.map((step, index) => (\n              <div key={step.id} className=\"flex items-start space-x-3 pb-4\">\n                {/* Timeline line */}\n                {index < provenance.steps.length - 1 && (\n                  <div className=\"absolute left-4 top-8 w-0.5 h-full bg-neutral-200\" />\n                )}\n                \n                {/* Step indicator */}\n                <div className={cn(\n                  \"w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium relative z-10\",\n                  getOutcomeColor(step.outcome)\n                )}>\n                  {index + 1}\n                </div>\n                \n                {/* Step content */}\n                <div className=\"flex-1 min-w-0\">\n                  <div className=\"flex items-center justify-between\">\n                    <div className=\"flex items-center space-x-2\">\n                      <h4 className=\"font-medium text-neutral-900\">{step.action}</h4>\n                      {step.aiAssisted && (\n                        <Badge variant=\"outline\" className=\"text-xs\">\n                          🤖 AI\n                        </Badge>\n                      )}\n                    </div>\n                    <span className=\"text-xs text-neutral-500\">\n                      {step.timestamp.toLocaleTimeString()}\n                    </span>\n                  </div>\n                  \n                  <p className=\"text-sm text-neutral-600 mt-1\">\n                    {step.reasoning}\n                  </p>\n                  \n                  <div className=\"flex items-center justify-between mt-2\">\n                    <span className=\"text-xs text-neutral-500\">\n                      by {step.actor}\n                    </span>\n                    {step.confidence && (\n                      <Badge variant=\"outline\" className=\"text-xs\">\n                        {Math.round(step.confidence * 100)}% confidence\n                      </Badge>\n                    )}\n                  </div>\n                </div>\n              </div>\n            ))}\n          </div>\n        </div>\n      </CardContent>\n    </Card>\n  )\n}\n\n// Export Interface\ninterface ExportOptions {\n  format: 'json' | 'csv' | 'pdf'\n  dateRange: { start: Date; end: Date }\n  filters: {\n    actors?: string[]\n    actions?: string[]\n    resources?: string[]\n    results?: string[]\n  }\n  includeSignatures: boolean\n  includeDetails: boolean\n}\n\nconst ExportInterface = ({ \n  onExport \n}: { \n  onExport: (options: ExportOptions) => void \n}) => {\n  const [options, setOptions] = useState<ExportOptions>({\n    format: 'json',\n    dateRange: {\n      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago\n      end: new Date()\n    },\n    filters: {},\n    includeSignatures: true,\n    includeDetails: false\n  })\n\n  return (\n    <Card>\n      <CardHeader>\n        <CardTitle>Export Audit Trail</CardTitle>\n      </CardHeader>\n      <CardContent className=\"space-y-4\">\n        <div>\n          <label className=\"block text-sm font-medium mb-2\">Format</label>\n          <select \n            value={options.format}\n            onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as any }))}\n            className=\"w-full p-2 border border-neutral-300 rounded-md\"\n          >\n            <option value=\"json\">JSON</option>\n            <option value=\"csv\">CSV</option>\n            <option value=\"pdf\">PDF Report</option>\n          </select>\n        </div>\n        \n        <div className=\"grid grid-cols-2 gap-4\">\n          <div>\n            <label className=\"block text-sm font-medium mb-2\">Start Date</label>\n            <Input \n              type=\"date\"\n              value={options.dateRange.start.toISOString().split('T')[0]}\n              onChange={(e) => setOptions(prev => ({\n                ...prev,\n                dateRange: { ...prev.dateRange, start: new Date(e.target.value) }\n              }))}\n            />\n          </div>\n          <div>\n            <label className=\"block text-sm font-medium mb-2\">End Date</label>\n            <Input \n              type=\"date\"\n              value={options.dateRange.end.toISOString().split('T')[0]}\n              onChange={(e) => setOptions(prev => ({\n                ...prev,\n                dateRange: { ...prev.dateRange, end: new Date(e.target.value) }\n              }))}\n            />\n          </div>\n        </div>\n        \n        <div className=\"space-y-2\">\n          <label className=\"flex items-center space-x-2\">\n            <input \n              type=\"checkbox\"\n              checked={options.includeSignatures}\n              onChange={(e) => setOptions(prev => ({ ...prev, includeSignatures: e.target.checked }))}\n            />\n            <span className=\"text-sm\">Include cryptographic signatures</span>\n          </label>\n          <label className=\"flex items-center space-x-2\">\n            <input \n              type=\"checkbox\"\n              checked={options.includeDetails}\n              onChange={(e) => setOptions(prev => ({ ...prev, includeDetails: e.target.checked }))}\n            />\n            <span className=\"text-sm\">Include detailed event data</span>\n          </label>\n        </div>\n        \n        <Button onClick={() => onExport(options)} className=\"w-full\">\n          <Download className=\"w-4 h-4 mr-2\" />\n          Export Audit Trail\n        </Button>\n      </CardContent>\n    </Card>\n  )\n}\n\n// Main Audit Trail Component\nexport interface AuditTrailProps {\n  events?: AuditEvent[]\n  provenance?: DecisionProvenance[]\n  onExport?: (options: ExportOptions) => void\n  className?: string\n}\n\nexport const AuditTrail = React.forwardRef<\n  HTMLDivElement,\n  AuditTrailProps\n>(({ events = [], provenance = [], onExport, className, ...props }, ref) => {\n  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())\n  const [searchTerm, setSearchTerm] = useState('')\n  const [selectedFilters, setSelectedFilters] = useState<{\n    result?: string\n    compliance?: string\n    actor?: string\n  }>({})\n\n  const toggleExpanded = useCallback((eventId: string) => {\n    setExpandedEvents(prev => {\n      const next = new Set(prev)\n      if (next.has(eventId)) {\n        next.delete(eventId)\n      } else {\n        next.add(eventId)\n      }\n      return next\n    })\n  }, [])\n\n  const filteredEvents = useMemo(() => {\n    return events.filter(event => {\n      if (searchTerm && !(\n        event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||\n        event.actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||\n        event.resource.type.toLowerCase().includes(searchTerm.toLowerCase())\n      )) {\n        return false\n      }\n      \n      if (selectedFilters.result && event.result !== selectedFilters.result) {\n        return false\n      }\n      \n      if (selectedFilters.compliance && event.compliance.status !== selectedFilters.compliance) {\n        return false\n      }\n      \n      if (selectedFilters.actor && event.actor.name !== selectedFilters.actor) {\n        return false\n      }\n      \n      return true\n    })\n  }, [events, searchTerm, selectedFilters])\n\n  return (\n    <div \n      ref={ref} \n      className={cn(\"max-w-7xl mx-auto p-6 space-y-6\", className)} \n      {...props}\n    >\n      <div className=\"flex items-center justify-between\">\n        <div>\n          <h1 className=\"text-2xl font-semibold text-neutral-900\">Audit Trail</h1>\n          <p className=\"text-neutral-600\">Complete audit log with cryptographic verification</p>\n        </div>\n        <Button variant=\"outline\">\n          <Shield className=\"w-4 h-4 mr-2\" />\n          Security Dashboard\n        </Button>\n      </div>\n\n      <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">\n        <div className=\"lg:col-span-3 space-y-4\">\n          {/* Search and Filters */}\n          <Card>\n            <CardContent className=\"p-4\">\n              <div className=\"flex items-center space-x-4\">\n                <div className=\"flex-1\">\n                  <div className=\"relative\">\n                    <Search className=\"absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4\" />\n                    <Input\n                      placeholder=\"Search events...\"\n                      value={searchTerm}\n                      onChange={(e) => setSearchTerm(e.target.value)}\n                      className=\"pl-10\"\n                    />\n                  </div>\n                </div>\n                <div className=\"flex space-x-2\">\n                  <select\n                    value={selectedFilters.result || ''}\n                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, result: e.target.value || undefined }))}\n                    className=\"px-3 py-2 border border-neutral-300 rounded-md text-sm\"\n                  >\n                    <option value=\"\">All Results</option>\n                    <option value=\"success\">Success</option>\n                    <option value=\"failure\">Failure</option>\n                    <option value=\"warning\">Warning</option>\n                  </select>\n                  <select\n                    value={selectedFilters.compliance || ''}\n                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, compliance: e.target.value || undefined }))}\n                    className=\"px-3 py-2 border border-neutral-300 rounded-md text-sm\"\n                  >\n                    <option value=\"\">All Compliance</option>\n                    <option value=\"compliant\">Compliant</option>\n                    <option value=\"violation\">Violation</option>\n                    <option value=\"pending\">Pending</option>\n                  </select>\n                </div>\n              </div>\n            </CardContent>\n          </Card>\n\n          {/* Events List */}\n          <div className=\"space-y-2\">\n            {filteredEvents.map((event) => (\n              <AuditEventRow\n                key={event.id}\n                event={event}\n                onExpand={toggleExpanded}\n                isExpanded={expandedEvents.has(event.id)}\n              />\n            ))}\n            \n            {filteredEvents.length === 0 && (\n              <Card>\n                <CardContent className=\"p-8 text-center text-neutral-500\">\n                  No audit events found matching your criteria.\n                </CardContent>\n              </Card>\n            )}\n          </div>\n          \n          {/* Decision Provenance */}\n          {provenance.length > 0 && (\n            <div className=\"space-y-4\">\n              <h2 className=\"text-lg font-semibold text-neutral-900\">Decision Provenance</h2>\n              {provenance.map((prov) => (\n                <DecisionProvenanceVisualization key={prov.id} provenance={prov} />\n              ))}\n            </div>\n          )}\n        </div>\n        \n        <div className=\"space-y-4\">\n          {/* Export Interface */}\n          {onExport && (\n            <ExportInterface onExport={onExport} />\n          )}\n          \n          {/* Summary Stats */}\n          <Card>\n            <CardHeader>\n              <CardTitle className=\"text-sm\">Summary</CardTitle>\n            </CardHeader>\n            <CardContent className=\"space-y-3\">\n              <div className=\"flex justify-between text-sm\">\n                <span className=\"text-neutral-600\">Total Events:</span>\n                <span className=\"font-medium\">{events.length}</span>\n              </div>\n              <div className=\"flex justify-between text-sm\">\n                <span className=\"text-neutral-600\">Verified:</span>\n                <span className=\"font-medium text-success-600\">\n                  {events.filter(e => e.signature?.verified).length}\n                </span>\n              </div>\n              <div className=\"flex justify-between text-sm\">\n                <span className=\"text-neutral-600\">Violations:</span>\n                <span className=\"font-medium text-error-600\">\n                  {events.filter(e => e.compliance.status === 'violation').length}\n                </span>\n              </div>\n            </CardContent>\n          </Card>\n        </div>\n      </div>\n    </div>\n  )\n})\n\nAuditTrail.displayName = \"AuditTrail\"\n\nexport type { AuditEvent, DecisionProvenance, DecisionStep, ExportOptions }\nexport default AuditTrail