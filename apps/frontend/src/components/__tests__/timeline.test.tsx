import { renderWithProviders, expectToBeAccessible, userEventSetup } from '@/lib/test-utils'
import { Timeline, TimelineStep } from '@/components/ui/timeline'
import { screen } from '@testing-library/react'

const mockSteps: TimelineStep[] = [
  {
    id: 'step1',
    title: 'Step 1',
    description: 'First step description',
    status: 'completed',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    duration: '2 minutes'
  },
  {
    id: 'step2',
    title: 'Step 2',
    description: 'Second step description',
    status: 'in-progress',
    timestamp: new Date('2024-01-01T10:02:00Z'),
    actions: [
      { label: 'Continue', onClick: jest.fn() },
      { label: 'Skip', onClick: jest.fn(), variant: 'secondary' }
    ]
  },
  {
    id: 'step3',
    title: 'Step 3',
    status: 'pending',
    metadata: { estimatedTime: '5 minutes', priority: 'high' }
  },
  {
    id: 'step4',
    title: 'Step 4',
    status: 'failed',
    timestamp: new Date('2024-01-01T10:10:00Z')
  }
]

describe('Timeline Component', () => {
  const defaultProps = {
    steps: mockSteps
  }

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<Timeline {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays all timeline steps', () => {
    renderWithProviders(<Timeline {...defaultProps} />)
    
    mockSteps.forEach(step => {
      expect(screen.getByText(step.title)).toBeInTheDocument()
      if (step.description) {
        expect(screen.getByText(step.description)).toBeInTheDocument()
      }
    })
  })

  it('shows correct status badges', () => {
    renderWithProviders(<Timeline {...defaultProps} />)
    
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('in progress')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('displays timestamps when showTimestamps is true', () => {
    renderWithProviders(<Timeline {...defaultProps} showTimestamps />)
    
    // Check for formatted timestamps
    expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument()
  })

  it('displays duration when showDuration is true', () => {
    renderWithProviders(<Timeline {...defaultProps} showDuration />)
    
    expect(screen.getByText('Duration: 2 minutes')).toBeInTheDocument()
  })

  it('displays metadata when provided', () => {
    renderWithProviders(<Timeline {...defaultProps} />)
    
    expect(screen.getByText('estimatedTime:')).toBeInTheDocument()
    expect(screen.getByText('5 minutes')).toBeInTheDocument()
  })

  it('renders in horizontal orientation', () => {
    const { container } = renderWithProviders(
      <Timeline {...defaultProps} orientation="horizontal" />
    )
    
    expect(container.querySelector('.flex.items-center.space-x-4')).toBeInTheDocument()
  })

  it('handles step clicks when interactive', async () => {
    const mockOnStepClick = jest.fn()
    const user = userEventSetup()
    
    renderWithProviders(
      <Timeline 
        {...defaultProps} 
        interactive 
        onStepClick={mockOnStepClick} 
      />
    )
    
    const firstStepIcon = screen.getByText(mockSteps[0].title).closest('div')?.previousSibling as HTMLElement
    if (firstStepIcon) {
      await user.click(firstStepIcon)
      expect(mockOnStepClick).toHaveBeenCalledWith(mockSteps[0])
    }
  })

  it('handles action button clicks', async () => {
    const user = userEventSetup()
    
    renderWithProviders(<Timeline {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue')
    await user.click(continueButton)
    
    expect(mockSteps[1].actions![0].onClick).toHaveBeenCalled()
  })

  it('highlights current step', () => {
    const { container } = renderWithProviders(
      <Timeline {...defaultProps} currentStep="step2" />
    )
    
    // Check that the current step has primary styling
    const currentStepTitle = screen.getByText('Step 2')
    expect(currentStepTitle).toHaveClass('text-primary')
  })

  it('supports keyboard navigation when interactive', async () => {
    const mockOnStepClick = jest.fn()
    const user = userEventSetup()
    
    renderWithProviders(
      <Timeline 
        {...defaultProps} 
        interactive 
        onStepClick={mockOnStepClick} 
      />
    )
    
    // Find focusable step elements
    const stepButtons = screen.getAllByRole('button')
    
    if (stepButtons.length > 0) {
      stepButtons[0].focus()
      await user.keyboard('{Enter}')
      expect(mockOnStepClick).toHaveBeenCalled()
    }
  })

  it('renders different step icons based on status', () => {
    const { container } = renderWithProviders(<Timeline {...defaultProps} />)
    
    // Check for different icons (SVG elements)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
    
    // Verify specific icons for each status
    expect(container.querySelector('[data-testid="check-icon"], .lucide-check')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="clock-icon"], .lucide-clock')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="alert-circle-icon"], .lucide-alert-circle')).toBeInTheDocument()
  })

  it('shows connectors between steps', () => {
    const { container } = renderWithProviders(<Timeline {...defaultProps} />)
    
    // Check for connector elements
    const connectors = container.querySelectorAll('.w-0\\.5, .h-0\\.5')
    expect(connectors.length).toBeGreaterThan(0)
  })

  it('applies correct styling for different step statuses', () => {
    const { container } = renderWithProviders(<Timeline {...defaultProps} />)
    
    // Check for status-specific styling classes
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument() // completed
    expect(container.querySelector('.border-primary')).toBeInTheDocument() // in-progress
    expect(container.querySelector('.bg-destructive')).toBeInTheDocument() // failed
  })

  it('handles empty steps array', () => {
    const { container } = renderWithProviders(<Timeline steps={[]} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('is accessible', async () => {
    const { container } = renderWithProviders(<Timeline {...defaultProps} />)
    await expectToBeAccessible(container)
  })

  it('has proper ARIA labels for interactive elements', () => {
    renderWithProviders(
      <Timeline {...defaultProps} interactive />
    )
    
    const interactiveElements = screen.getAllByRole('button')
    interactiveElements.forEach(element => {
      expect(element).toHaveAttribute('aria-label')
    })
  })

  it('handles step with no timestamp gracefully', () => {
    const stepsWithoutTimestamp = [
      {
        id: 'step1',
        title: 'Step without timestamp',
        status: 'pending' as const
      }
    ]
    
    renderWithProviders(
      <Timeline steps={stepsWithoutTimestamp} showTimestamps />
    )
    
    expect(screen.getByText('Step without timestamp')).toBeInTheDocument()
  })

  it('handles very long step titles', () => {
    const stepWithLongTitle = [
      {
        id: 'step1',
        title: 'This is a very long step title that should be handled gracefully by the component',
        status: 'pending' as const
      }
    ]
    
    const { container } = renderWithProviders(
      <Timeline steps={stepWithLongTitle} />
    )
    
    expect(container).toBeInTheDocument()
  })
})