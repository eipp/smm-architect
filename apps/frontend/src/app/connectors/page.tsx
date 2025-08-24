"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Plus, 
  ExternalLink,
  Settings,
  Trash2
} from "lucide-react"

// Mock data - in real app this would come from API
const mockConnectors = [
  {
    id: "conn-linkedin-1",
    platform: "LinkedIn",
    accountName: "SMM Architect Official",
    accountId: "@smm-architect",
    status: "connected" as const,
    lastSync: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    permissions: ["read_profile", "post_content", "read_analytics"],
    metrics: {
      postsThisWeek: 5,
      engagement: 0.087,
      followers: 12500,
    }
  },
  {
    id: "conn-twitter-1", 
    platform: "Twitter",
    accountName: "SMM Architect",
    accountId: "@smmarchitect",
    status: "connected" as const,
    lastSync: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    permissions: ["read_profile", "post_content", "read_analytics"],
    metrics: {
      postsThisWeek: 8,
      engagement: 0.054,
      followers: 8900,
    }
  },
  {
    id: "conn-facebook-1",
    platform: "Facebook",
    accountName: "SMM Architect Page",
    accountId: "smm-architect-page",
    status: "error" as const,
    lastSync: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    permissions: ["read_profile", "post_content"],
    error: "Authentication expired. Please reconnect.",
    metrics: {
      postsThisWeek: 3,
      engagement: 0.032,
      followers: 5600,
    }
  },
  {
    id: "conn-instagram-1",
    platform: "Instagram",
    accountName: "SMM Architect",
    accountId: "@smmarchitect",
    status: "pending" as const,
    lastSync: null,
    permissions: [],
    metrics: {
      postsThisWeek: 0,
      engagement: 0,
      followers: 0,
    }
  }
]

interface Connector {
  id: string
  platform: string
  accountName: string
  accountId: string
  status: 'connected' | 'error' | 'pending' | 'disconnected'
  lastSync: Date | null
  permissions: string[]
  error?: string
  metrics: {
    postsThisWeek: number
    engagement: number
    followers: number
  }
}

function getStatusIcon(status: Connector['status']) {
  switch (status) {
    case 'connected':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'pending':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'disconnected':
      return <XCircle className="h-4 w-4 text-gray-400" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

function getStatusColor(status: Connector['status']) {
  switch (status) {
    case 'connected':
      return 'success'
    case 'error':
      return 'destructive'
    case 'pending':
      return 'warning'
    case 'disconnected':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatLastSync(lastSync: Date | null) {
  if (!lastSync) return 'Never'
  
  const now = new Date()
  const diffMs = now.getTime() - lastSync.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = React.useState<Connector[]>(mockConnectors)

  const handleConnect = (platform: string) => {
    // In real app, this would initiate OAuth flow
    console.log(`Connecting to ${platform}...`)
  }

  const handleReconnect = (connectorId: string) => {
    // In real app, this would refresh OAuth tokens
    console.log(`Reconnecting ${connectorId}...`)
  }

  const handleDisconnect = (connectorId: string) => {
    // In real app, this would revoke OAuth tokens
    setConnectors(prev => prev.filter(c => c.id !== connectorId))
  }

  const connectedCount = connectors.filter(c => c.status === 'connected').length
  const errorCount = connectors.filter(c => c.status === 'error').length

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Connected Accounts</h2>
        <Button onClick={() => handleConnect('new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Connected
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Errors
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorCount}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Posts This Week
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectors.reduce((sum, c) => sum + c.metrics.postsThisWeek, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Engagement
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(connectors.reduce((sum, c) => sum + c.metrics.engagement, 0) / connectors.length * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Cross-platform average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connectors Grid */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Your Connections</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((connector) => (
            <Card key={connector.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(connector.status)}
                    {connector.platform}
                  </CardTitle>
                  <Badge variant={getStatusColor(connector.status)}>
                    {connector.status}
                  </Badge>
                </div>
                <CardDescription>{connector.accountName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Account ID</span>
                  <span className="font-mono">{connector.accountId}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span>{formatLastSync(connector.lastSync)}</span>
                </div>
                
                {connector.error && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {connector.error}
                  </div>
                )}

                {connector.status === 'connected' && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold">{connector.metrics.postsThisWeek}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {(connector.metrics.engagement * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Engagement</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {(connector.metrics.followers / 1000).toFixed(1)}K
                        </div>
                        <div className="text-xs text-muted-foreground">Followers</div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Permissions</p>
                      <div className="flex flex-wrap gap-1">
                        {connector.permissions.map((permission) => (
                          <Badge key={permission} variant="outline" className="text-xs">
                            {permission.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {connector.status === 'error' ? (
                  <Button onClick={() => handleReconnect(connector.id)} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconnect
                  </Button>
                ) : connector.status === 'pending' ? (
                  <Button onClick={() => handleConnect(connector.platform)} className="flex-1">
                    Complete Setup
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://${connector.platform.toLowerCase()}.com/${connector.accountId}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDisconnect(connector.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}