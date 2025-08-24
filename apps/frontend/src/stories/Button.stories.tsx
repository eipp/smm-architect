import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@smm-architect/ui'
import { Zap, Download, Settings, Trash2 } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile button component built on Radix UI primitives with various styles, sizes, and states.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style variant of the button'
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button'
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading spinner and disables the button'
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button'
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (using Radix Slot)'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// Basic variants
export const Default: Story = {
  args: {
    children: 'Default Button',
    variant: 'default'
  }
}

export const Destructive: Story = {
  args: {
    children: 'Delete Account',
    variant: 'destructive'
  }
}

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline'
  }
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary'
  }
}

export const Ghost: Story = {
  args: {
    children: 'Ghost Button',
    variant: 'ghost'
  }
}

export const Link: Story = {
  args: {
    children: 'Link Button',
    variant: 'link'
  }
}

// Sizes
export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm'
  }
}

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg'
  }
}

export const Icon: Story = {
  args: {
    children: <Settings className=\"h-4 w-4\" />,
    size: 'icon'
  }
}

// States
export const Loading: Story = {
  args: {
    children: 'Saving Changes...',
    loading: true
  }
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true
  }
}

// With Icons
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Zap className=\"mr-2 h-4 w-4\" />
        Create Workspace
      </>
    )
  }
}

export const IconRight: Story = {
  args: {
    children: (
      <>
        Download Report
        <Download className=\"ml-2 h-4 w-4\" />
      </>
    ),
    variant: 'outline'
  }
}

// Special use cases
export const DestructiveWithIcon: Story = {
  args: {
    children: (
      <>
        <Trash2 className=\"mr-2 h-4 w-4\" />
        Delete Workspace
      </>
    ),
    variant: 'destructive'
  }
}

export const LoadingWithIcon: Story = {
  args: {
    children: (
      <>
        <Zap className=\"mr-2 h-4 w-4\" />
        Creating Workspace...
      </>
    ),
    loading: true
  }
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className=\"flex flex-wrap gap-4\">
      <Button variant=\"default\">Default</Button>
      <Button variant=\"destructive\">Destructive</Button>
      <Button variant=\"outline\">Outline</Button>
      <Button variant=\"secondary\">Secondary</Button>
      <Button variant=\"ghost\">Ghost</Button>
      <Button variant=\"link\">Link</Button>
    </div>
  )
}

// All sizes showcase
export const AllSizes: Story = {
  render: () => (
    <div className=\"flex items-center gap-4\">
      <Button size=\"sm\">Small</Button>
      <Button size=\"default\">Default</Button>
      <Button size=\"lg\">Large</Button>
      <Button size=\"icon\">
        <Settings className=\"h-4 w-4\" />
      </Button>
    </div>
  )
}

// Interactive playground
export const Playground: Story = {
  args: {
    children: 'Playground Button',
    variant: 'default',
    size: 'default',
    loading: false,
    disabled: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Try different combinations of props to see how the button behaves.'
      }
    }
  }
}"