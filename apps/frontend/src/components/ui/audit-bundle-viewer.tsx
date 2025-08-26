"use client"

import * as React from "react"
import { Shield, ShieldCheck, ShieldX, Eye, EyeOff, Download, Copy, Search, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./button"
import { Input } from "./input"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Badge } from "./badge"
import { ScrollArea } from "./scroll-area"

export interface AuditSignature {
  id: string
  signer: string
  algorithm: string
  timestamp: Date
  verified: boolean
  certificate?: {
    issuer: string
    subject: string
    validFrom: Date
    validTo: Date
    fingerprint: string
  }
  metadata?: Record<string, any>
}

export interface AuditBundle {
  id: string
  version: string
  created: Date
  signatures: AuditSignature[]
  payload: Record<string, any>
  metadata: {
    bundleType: string
    schemaVersion: string
    creator: string
    description?: string
  }
  verification: {
    status: 'verified' | 'unverified' | 'tampered' | 'expired'
    score: number
    issues: string[]
  }
}

interface AuditBundleViewerProps {
  bundle: AuditBundle
  showSignatures?: boolean
  showRawJson?: boolean
  searchable?: boolean
  onDownload?: () => void
  onVerifySignature?: (signatureId: string) => void
  className?: string
}

const AuditBundleViewer = React.forwardRef<HTMLDivElement, AuditBundleViewerProps>(
  ({
    bundle,
    showSignatures = true,
    showRawJson = false,
    searchable = true,
    onDownload,
    onVerifySignature,
    className
  }, ref) => {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'payload' | 'signatures' | 'raw'>('overview')
    const [searchQuery, setSearchQuery] = React.useState("")
    const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set())
    const [copyStatus, setCopyStatus] = React.useState<string | null>(null)

    const getVerificationIcon = (status: AuditBundle['verification']['status']) => {
      switch (status) {
        case 'verified':
          return <ShieldCheck className="h-4 w-4 text-green-600" />
        case 'tampered':
          return <ShieldX className="h-4 w-4 text-red-600" />
        case 'expired':
          return <Shield className="h-4 w-4 text-yellow-600" />
        default:
          return <Shield className="h-4 w-4 text-gray-600" />
      }
    }

    const toggleSection = (path: string) => {
      setExpandedSections(prev => {
        const newSet = new Set(prev)
        if (newSet.has(path)) {
          newSet.delete(path)
        } else {
          newSet.add(path)
        }
        return newSet
      })
    }

    const handleCopy = async (content: string, label: string) => {
      try {
        await navigator.clipboard.writeText(content)
        setCopyStatus(label)
        setTimeout(() => setCopyStatus(null), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }

    const renderJsonValue = (value: any, path: string = '', depth: number = 0): React.ReactNode => {
      if (value === null) return <span className="text-gray-500">null</span>
      if (value === undefined) return <span className="text-gray-500">undefined</span>
      
      if (typeof value === 'string') {
        return <span className="text-green-700">&quot;{value}&quot;</span>
      }
      
      if (typeof value === 'number' || typeof value === 'boolean') {
        return <span className="text-blue-600">{String(value)}</span>
      }
      
      if (value instanceof Date) {
        return <span className="text-purple-600">&quot;{value.toISOString()}&quot;</span>
      }
      
      if (Array.isArray(value)) {
        if (value.length === 0) return <span>[]</span>
        
        const isExpanded = expandedSections.has(path)
        
        return (
          <div>
            <button
              onClick={() => toggleSection(path)}
              className="flex items-center text-left hover:bg-muted rounded px-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <span>[{value.length} items]</span>
            </button>
            {isExpanded && (
              <div className="ml-4 border-l border-border pl-2">
                {value.map((item, index) => (
                  <div key={index} className="py-1">
                    <span className="text-gray-500">{index}:</span>{' '}
                    {renderJsonValue(item, `${path}[${index}]`, depth + 1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }
      
      if (typeof value === 'object') {
        const keys = Object.keys(value)
        if (keys.length === 0) return <span>{'{}'}</span>
        
        const isExpanded = expandedSections.has(path)
        
        return (
          <div>
            <button
              onClick={() => toggleSection(path)}
              className="flex items-center text-left hover:bg-muted rounded px-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              <span>{'{'}{keys.length} keys{'}'}</span>
            </button>
            {isExpanded && (
              <div className="ml-4 border-l border-border pl-2">
                {keys.map(key => {
                  const keyPath = path ? `${path}.${key}` : key
                  const shouldShow = !searchQuery || 
                    key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    JSON.stringify(value[key]).toLowerCase().includes(searchQuery.toLowerCase())
                  
                  if (!shouldShow) return null
                  
                  return (
                    <div key={key} className="py-1">
                      <span className="text-blue-800 font-medium">&quot;{key}&quot;</span>
                      <span className="text-gray-500">: </span>
                      {renderJsonValue(value[key], keyPath, depth + 1)}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      }
      
      return <span>{String(value)}</span>
    }

    const renderOverview = () => (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Bundle ID</label>
            <div className="font-mono text-sm">{bundle.id}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Version</label>
            <div className="text-sm">{bundle.version}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Created</label>
            <div className="text-sm">{bundle.created.toLocaleString()}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Type</label>
            <div className="text-sm">{bundle.metadata.bundleType}</div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
          <div className="flex items-center gap-2 mt-1">
            {getVerificationIcon(bundle.verification.status)}
            <Badge 
              variant={
                bundle.verification.status === 'verified' ? 'default' :
                bundle.verification.status === 'tampered' ? 'destructive' : 'secondary'
              }
            >
              {bundle.verification.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Score: {bundle.verification.score}/100
            </span>
          </div>
        </div>

        {bundle.verification.issues.length > 0 && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Issues</label>
            <ul className="mt-1 space-y-1">
              {bundle.verification.issues.map((issue, index) => (
                <li key={index} className="text-sm text-destructive flex items-center gap-1">
                  <ShieldX className="h-3 w-3" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {bundle.metadata.description && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <div className="text-sm mt-1">{bundle.metadata.description}</div>
          </div>
        )}
      </div>
    )

    const renderSignatures = () => (
      <div className="space-y-4">
        {bundle.signatures.map((signature) => (
          <Card key={signature.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  {signature.verified ? (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  ) : (
                    <ShieldX className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">{signature.signer}</span>
                  <Badge variant={signature.verified ? 'default' : 'destructive'}>
                    {signature.verified ? 'Verified' : 'Invalid'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Algorithm:</span> {signature.algorithm}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Signed:</span> {signature.timestamp.toLocaleString()}
                  </div>
                </div>

                {signature.certificate && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                    <div><strong>Issuer:</strong> {signature.certificate.issuer}</div>
                    <div><strong>Subject:</strong> {signature.certificate.subject}</div>
                    <div><strong>Valid:</strong> {signature.certificate.validFrom.toLocaleDateString()} - {signature.certificate.validTo.toLocaleDateString()}</div>
                    <div><strong>Fingerprint:</strong> <code>{signature.certificate.fingerprint}</code></div>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onVerifySignature?.(signature.id)}
              >
                Verify
              </Button>
            </div>
          </Card>
        ))}
      </div>
    )

    const renderPayload = () => (
      <div className="font-mono text-sm">
        {renderJsonValue(bundle.payload, 'payload')}
      </div>
    )

    const renderRawJson = () => (
      <div className="relative">
        <Button
          size="sm"
          variant="outline"
          className="absolute top-2 right-2 z-10"
          onClick={() => handleCopy(JSON.stringify(bundle, null, 2), 'Raw JSON')}
        >
          <Copy className="h-3 w-3 mr-1" />
          {copyStatus === 'Raw JSON' ? 'Copied!' : 'Copy'}
        </Button>
        <pre className="bg-muted p-4 rounded text-xs overflow-auto">
          {JSON.stringify(bundle, null, 2)}
        </pre>
      </div>
    )

    return (
      <Card ref={ref} className={cn("", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getVerificationIcon(bundle.verification.status)}
              Audit Bundle
            </CardTitle>
            <div className="flex gap-1">
              {onDownload && (
                <Button size="sm" variant="outline" onClick={onDownload}>
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'payload' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('payload')}
            >
              Payload
            </Button>
            {showSignatures && (
              <Button
                size="sm"
                variant={activeTab === 'signatures' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('signatures')}
              >
                Signatures ({bundle.signatures.length})
              </Button>
            )}
            {showRawJson && (
              <Button
                size="sm"
                variant={activeTab === 'raw' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('raw')}
              >
                Raw JSON
              </Button>
            )}
          </div>

          {searchable && (activeTab === 'payload' || activeTab === 'raw') && (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search in bundle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          )}
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-96">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'payload' && renderPayload()}
            {activeTab === 'signatures' && renderSignatures()}
            {activeTab === 'raw' && renderRawJson()}
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }
)

AuditBundleViewer.displayName = "AuditBundleViewer"

export { AuditBundleViewer, type AuditBundle, type AuditSignature }