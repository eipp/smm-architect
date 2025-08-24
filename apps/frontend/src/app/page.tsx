import Link from "next/link"
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
  Activity,
  Calendar,
  DollarSign,
  Settings,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react"

// Mock data - in real app this would come from API
const mockWorkspaces = [
  {
    id: "ws-tenant1-abc123",
    name: "Q4 Holiday Campaign",
    description: "Cross-platform holiday marketing initiative",
    status: "active" as const,
    lastActivity: "2 hours ago",
    budget: { used: 2400, total: 5000, currency: "USD" },
    channels: ["linkedin", "twitter", "facebook"],
    metrics: {
      postsScheduled: 24,
      engagement: 0.078,
      reach: 45000,
    },
  },
  {
    id: "ws-tenant1-def456",
    name: "Product Launch 2024",
    description: "New feature announcement campaign",
    status: "planning" as const,
    lastActivity: "1 day ago",
    budget: { used: 800, total: 3000, currency: "USD" },
    channels: ["linkedin", "twitter"],
    metrics: {
      postsScheduled: 12,
      engagement: 0.065,
      reach: 28000,
    },
  },
  {
    id: "ws-tenant1-ghi789",
    name: "Brand Awareness Drive",
    description: "Ongoing brand visibility campaign",
    status: "paused" as const,
    lastActivity: "3 days ago",
    budget: { used: 1200, total: 2500, currency: "USD" },
    channels: ["facebook", "instagram"],
    metrics: {
      postsScheduled: 8,
      engagement: 0.042,
      reach: 15000,
    },
  },
]

const mockStats = {
  totalBudget: 10500,
  totalSpent: 4400,
  activeWorkspaces: 2,
  totalReach: 88000,
  avgEngagement: 0.062,
  postsThisWeek: 18,
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "success"
    case "planning":
      return "secondary"
    case "paused":
      return "warning"
    default:
      return "outline"
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "active":
      return <CheckCircle className="h-4 w-4" />
    case "planning":
      return <Clock className="h-4 w-4" />
    case "paused":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Activity className="h-4 w-4" />
  }
}

export default function Dashboard() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/onboard">
              <Zap className="mr-2 h-4 w-4" />
              New Workspace
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${mockStats.totalBudget.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${mockStats.totalSpent.toLocaleString()} spent ({Math.round((mockStats.totalSpent / mockStats.totalBudget) * 100)}%)
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Workspaces
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeWorkspaces}</div>
            <p className="text-xs text-muted-foreground">
              {mockWorkspaces.length} total workspaces
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reach
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(mockStats.totalReach / 1000).toFixed(0)}K
            </div>
            <p className="text-xs text-muted-foreground">
              {(mockStats.avgEngagement * 100).toFixed(1)}% avg engagement
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Posts This Week
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.postsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last week
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Workspaces Grid */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Your Workspaces</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockWorkspaces.map((workspace) => (
            <Card key={workspace.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{workspace.name}</CardTitle>
                  <Badge variant={getStatusColor(workspace.status)} className="flex items-center gap-1">
                    {getStatusIcon(workspace.status)}
                    {workspace.status}
                  </Badge>
                </div>
                <CardDescription>{workspace.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Budget Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Used</span>
                    <span>
                      ${workspace.budget.used} / ${workspace.budget.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((workspace.budget.used / workspace.budget.total) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                
                {/* Channels */}
                <div>
                  <div className="text-sm font-medium mb-2">Channels</div>
                  <div className="flex gap-2">
                    {workspace.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Quick Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{workspace.metrics.postsScheduled}</div>
                    <div className="text-xs text-muted-foreground">Posts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {(workspace.metrics.reach / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-muted-foreground">Reach</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {(workspace.metrics.engagement * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Updated {workspace.lastActivity}
                </span>
                <div className="flex gap-2">
                  <Link href={`/workspaces/${workspace.id}`}>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Link href={`/workspaces/${workspace.id}/settings`}>
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/canvas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Canvas
                </CardTitle>
                <CardDescription>
                  Interactive workflow visualization
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/chat">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Agent Chat
                </CardTitle>
                <CardDescription>
                  Interact with AI agents
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/connectors">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Connectors
                </CardTitle>
                <CardDescription>
                  Manage platform connections
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          
          <Link href="/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
                <CardDescription>
                  Configure preferences
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
