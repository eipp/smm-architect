import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Badge',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
}

export const WithIcon: Story = {
  args: {
    variant: 'success',
    children: (
      <>
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </>
    ),
  },
}

export const StatusBadges: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="success" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
      <Badge variant="warning" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Failed
      </Badge>
      <Badge variant="secondary">Planning</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Various status badges used throughout SMM Architect for campaign states, job statuses, and system indicators.',
      },
    },
  },
}

export const ChannelBadges: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Badge variant="outline" className="text-xs">linkedin</Badge>
      <Badge variant="outline" className="text-xs">twitter</Badge>
      <Badge variant="outline" className="text-xs">facebook</Badge>
      <Badge variant="outline" className="text-xs">instagram</Badge>
      <Badge variant="outline" className="text-xs">youtube</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Channel badges showing social media platform connections.',
      },
    },
  },
}

export const NotificationBadge: Story = {
  args: {
    variant: 'destructive',
    className: 'text-xs px-1.5 py-0.5',
    children: '3',
  },
  parameters: {
    docs: {
      description: {
        story: 'Small notification badge typically used for counters and alerts.',
      },
    },
  },
}