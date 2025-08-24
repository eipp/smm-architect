import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Settings, TrendingUp } from 'lucide-react'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Card with Footer</CardTitle>
        <CardDescription>This card includes a footer with actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Some content that explains what this card is about.</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Continue</Button>
      </CardFooter>
    </Card>
  ),
}

export const WorkspaceCard: Story = {
  render: () => (
    <Card className="w-[380px] hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Q4 Holiday Campaign</CardTitle>
          <Badge variant="default" className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            active
          </Badge>
        </div>
        <CardDescription>Cross-platform holiday marketing initiative</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Budget Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Budget Used</span>
            <span>$2,400 / $5,000</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: '48%' }} />
          </div>
        </div>
        
        {/* Channels */}
        <div>
          <div className="text-sm font-medium mb-2">Channels</div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">linkedin</Badge>
            <Badge variant="outline" className="text-xs">twitter</Badge>
            <Badge variant="outline" className="text-xs">facebook</Badge>
          </div>
        </div>
        
        {/* Quick Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">24</div>
            <div className="text-xs text-muted-foreground">Posts</div>
          </div>
          <div>
            <div className="text-lg font-bold">45K</div>
            <div className="text-xs text-muted-foreground">Reach</div>
          </div>
          <div>
            <div className="text-lg font-bold">7.8%</div>
            <div className="text-xs text-muted-foreground">Engagement</div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">Updated 2 hours ago</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A workspace card showing campaign details, budget progress, channels, and metrics - typical for the SMM Architect dashboard.',
      },
    },
  },
}

export const MetricCard: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$45,231.89</div>
        <p className="text-xs text-muted-foreground">
          <TrendingUp className="inline h-3 w-3 mr-1" />
          +20.1% from last month
        </p>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'A metric card displaying key performance indicators with trend information.',
      },
    },
  },
}