"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart3,
  Users,
  Calendar,
  Settings,
  Play,
  Pause,
  Activity,
  TrendingUp,
  MessageSquare,
  Share2,
  Heart,
  Eye
} from "lucide-react"

// Mock data - in real app this would come from API
const mockWorkspace = {
  id: "ws-123",
  name: "Q4 Product Launch Campaign",
  description: "Multi-platform campaign for our new product launch targeting Q4 2024",
  status: "active" as const,
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
  owner: "Sarah Chen",
  members: 8,
  campaigns: 3,
  totalPosts: 24,
  platforms: ["LinkedIn", "Twitter", "Facebook", "Instagram"],
  metrics: {
    reach: 125000,
    engagement: 8750,
    clicks: 2340,
    conversions: 156
  }
}

const mockCampaigns = [
  {
    id: "camp-1",
    name: "Product Awareness",
    status: "running" as const,
    platform: "LinkedIn",
    postsScheduled: 8,
    postsPublished: 5,
    engagement: 4200,
    reach: 45000
  },
  {
    id: "camp-2", 
    name: "Feature Highlights",
    status: "paused" as const,
    platform: "Twitter",
    postsScheduled: 12,
    postsPublished: 8,
    engagement: 2800,
    reach: 38000
  },
  {
    id: "camp-3",
    name: "Customer Stories",
    status: "draft" as const,
    platform: "Instagram",
    postsScheduled: 6,
    postsPublished: 0,
    engagement: 0,
    reach: 0
  }
]

const mockRecentActivity = [
  {
    id: "act-1",
    type: "post_published" as const,
    title: "New post published to LinkedIn",
    description: "Product feature showcase post went live",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    user: "Sarah Chen"
  },
  {
    id: "act-2",
    type: "campaign_created" as const,
    title: "New campaign created",
    description: "Customer Stories campaign was created",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: "Mike Johnson"
  },
  {
    id: "act-3",
    type: "member_added" as const,
    title: "Team member added",
    description: "Alex Rodriguez joined the workspace",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    user: "Sarah Chen"
  }
]

function getStatusColor(status: string) {
  switch (status) {
    case "running":
    case "active":
      return "success"
    case "paused":
      return "warning"
    case "draft":
      return "secondary"
    default:
      return "outline"
  }
}

function getActivityIcon(type: string) {
  switch (type) {
    case "post_published":
      return <Share2 className="h-4 w-4" />
    case "campaign_created":
      return <Calendar className="h-4 w-4" />
    case "member_added":
      return <Users className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.id as string
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading workspace data
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [workspaceId])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{mockWorkspace.name}</h1>
            <Badge variant={getStatusColor(mockWorkspace.status)}>
              {mockWorkspace.status}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {mockWorkspace.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span>Created {formatTimeAgo(mockWorkspace.createdAt)}</span>
            <span>•</span>
            <span>Last activity {formatTimeAgo(mockWorkspace.lastActivity)}</span>
            <span>•</span>
            <span>{mockWorkspace.members} members</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(mockWorkspace.metrics.reach)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(mockWorkspace.metrics.engagement)}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(mockWorkspace.metrics.clicks)}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWorkspace.metrics.conversions}</div>
            <p className="text-xs text-muted-foreground">+22% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Active Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>Currently running campaigns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockCampaigns.filter(c => c.status === 'running').map(campaign => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">{campaign.platform}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-medium">{formatNumber(campaign.engagement)} engagements</p>
                      <p className="text-xs text-muted-foreground">{campaign.postsPublished}/{campaign.postsScheduled} posts</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Coverage</CardTitle>
                <CardDescription>Content distribution across platforms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockWorkspace.platforms.map(platform => (
                  <div key={platform} className="flex items-center justify-between">
                    <span className="font-medium">{platform}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.floor(Math.random() * 10) + 1} posts
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {mockCampaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{campaign.platform} Campaign</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.status === 'running' ? (
                      <Button size="sm" variant="outline">
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button size="sm">
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{campaign.postsScheduled}</p>
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{campaign.postsPublished}</p>
                      <p className="text-sm text-muted-foreground">Published</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(campaign.reach)}</p>
                      <p className="text-sm text-muted-foreground">Reach</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{formatNumber(campaign.engagement)}</p>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
              <CardDescription>Detailed performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard would be displayed here</p>
                  <p className="text-sm">Integration with analytics service required</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes in this workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentActivity.map(activity => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{activity.user}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}