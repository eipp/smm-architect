import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { Timeline, TimelineStep } from '@/components/ui/timeline'

const meta = {
  title: 'UI/Timeline',
  component: Timeline,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible timeline component for displaying step-by-step progress with interactive states, timestamps, and actions. Supports both vertical and horizontal orientations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['vertical', 'horizontal'],
      description: 'The orientation of the timeline',
    },
    interactive: {
      control: { type: 'boolean' },
      description: 'Whether steps can be clicked',
    },
    showTimestamps: {
      control: { type: 'boolean' },
      description: 'Whether to show timestamps for steps',
    },
    showDuration: {
      control: { type: 'boolean' },
      description: 'Whether to show duration for steps',
    },
    currentStep: {
      control: { type: 'text' },
      description: 'ID of the currently active step',
    },
  },
  args: {
    onStepClick: fn(),
  },
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

// Sample data
const basicSteps: TimelineStep[] = [
  {
    id: 'step1',
    title: 'Project Initialization',
    description: 'Set up project structure and dependencies',
    status: 'completed',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    duration: '15 minutes'
  },
  {
    id: 'step2',
    title: 'Configuration',
    description: 'Configure build tools and environment',
    status: 'completed',
    timestamp: new Date('2024-01-01T10:15:00Z'),
    duration: '10 minutes'
  },
  {
    id: 'step3',
    title: 'Development',
    description: 'Implement core features and components',
    status: 'in-progress',
    timestamp: new Date('2024-01-01T10:25:00Z'),
    actions: [
      { label: 'Continue', onClick: fn() },
      { label: 'Pause', onClick: fn(), variant: 'secondary' }
    ]
  },
  {
    id: 'step4',
    title: 'Testing',
    description: 'Run unit tests and integration tests',
    status: 'pending'
  },
  {
    id: 'step5',
    title: 'Deployment',
    description: 'Deploy to production environment',
    status: 'pending'
  }
]

const workflowSteps: TimelineStep[] = [
  {
    id: 'draft',
    title: 'Draft Created',
    description: 'Document draft has been created',
    status: 'completed',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    metadata: { author: 'John Doe', version: '1.0' }
  },
  {
    id: 'review',
    title: 'Under Review',
    description: 'Document is being reviewed by team members',
    status: 'completed',
    timestamp: new Date('2024-01-01T09:30:00Z'),
    duration: '2 hours',
    metadata: { reviewers: ['Alice', 'Bob'], comments: 3 }
  },
  {
    id: 'approval',
    title: 'Pending Approval',
    description: 'Waiting for final approval from stakeholders',
    status: 'in-progress',
    timestamp: new Date('2024-01-01T11:30:00Z'),
    actions: [
      { label: 'Approve', onClick: fn() },
      { label: 'Request Changes', onClick: fn(), variant: 'secondary' },
      { label: 'Reject', onClick: fn(), variant: 'destructive' }
    ]
  },
  {
    id: 'published',
    title: 'Published',
    description: 'Document has been published and is live',
    status: 'pending'
  }
]

const errorSteps: TimelineStep[] = [
  {
    id: 'build',
    title: 'Build Started',
    status: 'completed',
    timestamp: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: 'test',
    title: 'Running Tests',
    status: 'failed',
    timestamp: new Date('2024-01-01T10:05:00Z'),
    actions: [
      { label: 'Retry', onClick: fn() },
      { label: 'View Logs', onClick: fn(), variant: 'secondary' }
    ]
  },
  {
    id: 'deploy',
    title: 'Deploy',
    status: 'skipped'
  }
]

// Basic stories
export const Default: Story = {
  args: {
    steps: basicSteps,
  },
}

export const Horizontal: Story = {
  args: {
    steps: basicSteps,
    orientation: 'horizontal',
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Timeline displayed in horizontal orientation, useful for process flows.',
      },
    },
  },
}

export const WithTimestamps: Story = {
  args: {
    steps: basicSteps,
    showTimestamps: true,
  },
}

export const WithDuration: Story = {
  args: {
    steps: basicSteps,
    showDuration: true,
  },
}

export const Interactive: Story = {
  args: {
    steps: basicSteps,
    interactive: true,
    currentStep: 'step3',
  },
}

export const CompleteTimeline: Story = {
  args: {
    steps: basicSteps,
    showTimestamps: true,
    showDuration: true,
    interactive: true,
    currentStep: 'step3',
  },
}

// Workflow examples
export const ApprovalWorkflow: Story = {
  args: {
    steps: workflowSteps,
    showTimestamps: true,
    showDuration: true,
    interactive: true,
    currentStep: 'approval',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of a document approval workflow with metadata and actions.',
      },
    },
  },
}

export const ErrorHandling: Story = {
  args: {
    steps: errorSteps,
    showTimestamps: true,
    interactive: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline showing error states and recovery actions.',
      },
    },
  },
}

// Edge cases
export const EmptyTimeline: Story = {
  args: {
    steps: [],
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with no steps - should render without errors.',
      },
    },
  },
}

export const SingleStep: Story = {
  args: {
    steps: [
      {
        id: 'only',
        title: 'Single Step',
        description: 'This is the only step in the timeline',
        status: 'completed',
      }
    ],
  },
}

export const LongTitles: Story = {
  args: {
    steps: [
      {
        id: 'long1',
        title: 'This is a very long step title that might wrap to multiple lines',
        description: 'This is also a very long description that demonstrates how the timeline handles lengthy content and ensures proper layout and readability',
        status: 'completed',
      },
      {
        id: 'long2',
        title: 'Another extremely long step title with lots of words to test text wrapping behavior',
        status: 'in-progress',
      }
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with very long titles and descriptions to test text wrapping.',
      },
    },
  },
}

// All statuses
export const AllStatuses: Story = {
  args: {
    steps: [
      {
        id: 'pending',
        title: 'Pending Step',
        status: 'pending',
      },
      {
        id: 'progress',
        title: 'In Progress Step',
        status: 'in-progress',
      },
      {
        id: 'completed',
        title: 'Completed Step',
        status: 'completed',
      },
      {
        id: 'failed',
        title: 'Failed Step',
        status: 'failed',
      },
      {
        id: 'skipped',
        title: 'Skipped Step',
        status: 'skipped',
      }
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline showing all available status types with their corresponding visual indicators.',
      },
    },
  },
}

// Responsive example
export const ResponsiveExample: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Desktop View (Horizontal)</h3>
        <div className="hidden md:block">
          <Timeline 
            steps={basicSteps} 
            orientation="horizontal" 
            showTimestamps 
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Mobile View (Vertical)</h3>
        <div className="md:hidden">
          <Timeline 
            steps={basicSteps} 
            orientation="vertical" 
            showTimestamps 
          />
        </div>
      </div>
      
      <div className="md:hidden">
        <Timeline 
          steps={basicSteps} 
          orientation="vertical" 
          showTimestamps 
        />
      </div>
      
      <div className="hidden md:block">
        <Timeline 
          steps={basicSteps} 
          orientation="horizontal" 
          showTimestamps 
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Responsive timeline that adapts orientation based on screen size.',
      },
    },
  },
}

// Accessibility demonstration
export const Accessibility: Story = {
  args: {
    steps: workflowSteps,
    interactive: true,
    showTimestamps: true,
    currentStep: 'approval',
  },
  parameters: {
    docs: {
      description: {
        story: 'Timeline with full accessibility features including keyboard navigation and screen reader support.',
      },
    },
  },
}