import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Button } from '@/components/ui/button'
import { Download, Plus, Trash2, Settings } from 'lucide-react'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component built on top of Radix UI primitives with multiple variants, sizes, and states. Supports icons and loading states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    asChild: {
      control: { type: 'boolean' },
      description: 'Change the default rendered element for the one passed as a child',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled',
    },
    children: {
      control: { type: 'text' },
      description: 'The content of the button',
    },
    onClick: {
      action: 'clicked',
      description: 'Function called when the button is clicked',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

// Basic variants
export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
}

// Sizes
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
}

export const Icon: Story = {
  args: {
    size: 'icon',
    children: <Plus className="h-4 w-4" />,
  },
}

// States
export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
}

// With icons
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download className="mr-2 h-4 w-4" />
        Download
      </>
    ),
  },
}

export const IconOnly: Story = {
  args: {
    size: 'icon',
    variant: 'outline',
    children: <Settings className="h-4 w-4" />,
  },
}

// Loading state (custom implementation)
export const Loading: Story = {
  args: {
    children: (
      <>
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Loading...
      </>
    ),
    disabled: true,
  },
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants displayed together for comparison.',
      },
    },
  },
}

// All sizes showcase
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button sizes displayed together for comparison.',
      },
    },
  },
}

// Interactive example
export const Interactive: Story = {
  render: () => {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={() => alert('Primary action')}>
            Primary Action
          </Button>
          <Button variant="outline" onClick={() => alert('Secondary action')}>
            Secondary Action
          </Button>
          <Button variant="destructive" onClick={() => alert('Danger action')}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Click any button to see the interaction
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing different button actions.',
      },
    },
  },
}

// Accessibility demonstration
export const Accessibility: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Focus Management</h3>
        <div className="flex gap-2">
          <Button>First</Button>
          <Button>Second</Button>
          <Button>Third</Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Use Tab to navigate between buttons
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">Screen Reader Support</h3>
        <div className="flex gap-2">
          <Button aria-label="Save document">
            <Download className="h-4 w-4" />
          </Button>
          <Button aria-describedby="delete-description" variant="destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <p id="delete-description" className="text-sm text-muted-foreground mt-2">
          This action cannot be undone
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples demonstrating accessibility features including focus management and screen reader support.',
      },
    },
  },
}