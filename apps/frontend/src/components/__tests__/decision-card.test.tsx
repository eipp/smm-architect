import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DecisionCard } from '@smm-architect/ui'

const mockProposal = {
  actionId: 'action-001',
  title: 'LinkedIn Holiday Post',
  oneLine: 'Engaging holiday content for professional audience',
  readinessScore: 0.89,
  policyPassPct: 0.95,
  citationCoverage: 0.87,
  duplicateRisk: 'low' as const,
  costBreakdown: {
    paidAds: 100,
    llmModelSpend: 25,
    rendering: 15,
    thirdPartyServices: 10,
    total: 150,
    currency: 'USD',
    timeframe: 'per week'
  },
  provenance: [
    {
      title: 'Industry Report 2024',
      url: 'https://example.com/report',
      verified: true,
      type: 'report' as const
    }
  ],
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours from now
}

describe('DecisionCard', () => {
  it('displays proposal information correctly', () => {
    render(<DecisionCard {...mockProposal} />)
    
    expect(screen.getByText('LinkedIn Holiday Post')).toBeInTheDocument()
    expect(screen.getByText('Engaging holiday content for professional audience')).toBeInTheDocument()
    expect(screen.getByText('89%')).toBeInTheDocument() // Readiness score
    expect(screen.getByText('95%')).toBeInTheDocument() // Policy pass
    expect(screen.getByText('$150')).toBeInTheDocument() // Total cost
  })
  
  it('displays risk indicators correctly', () => {
    render(<DecisionCard {...mockProposal} />)
    
    expect(screen.getByText(/Duplicate: low/)).toBeInTheDocument()
    expect(screen.getByText(/Citations: 87%/)).toBeInTheDocument()
  })
  
  it('shows time until expiry', () => {
    render(<DecisionCard {...mockProposal} />)
    
    // Should show hours remaining (48h left)
    expect(screen.getByText(/48h left/)).toBeInTheDocument()
  })
  
  it('handles expired proposals', () => {
    const expiredProposal = {
      ...mockProposal,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
    }
    
    render(<DecisionCard {...expiredProposal} />)
    expect(screen.getByText('Expired')).toBeInTheDocument()
  })
  
  it('expands to show cost breakdown when clicked', async () => {
    const user = userEvent.setup()
    
    render(<DecisionCard {...mockProposal} />)
    
    // Initially collapsed
    expect(screen.queryByText('Cost Breakdown')).not.toBeInTheDocument()
    
    // Click to expand
    await user.click(screen.getByText('More details'))
    
    // Should show cost breakdown
    expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Paid Ads')).toBeInTheDocument()
    expect(screen.getByText('$100')).toBeInTheDocument()
    expect(screen.getByText('LLM Model Spend')).toBeInTheDocument()
    expect(screen.getByText('$25')).toBeInTheDocument()
  })
  
  it('shows provenance sources when expanded', async () => {
    const user = userEvent.setup()
    
    render(<DecisionCard {...mockProposal} />)
    
    // Expand details first
    await user.click(screen.getByText('More details'))
    
    // Then show sources
    await user.click(screen.getByText('Show Sources'))
    
    expect(screen.getByText('Industry Report 2024')).toBeInTheDocument()
  })
  
  it('handles approval workflow', async () => {
    const user = userEvent.setup()
    const onApprove = jest.fn()
    const onReject = jest.fn()
    const onRequestChanges = jest.fn()
    
    render(
      <DecisionCard 
        {...mockProposal} 
        onApprove={onApprove}
        onReject={onReject}
        onRequestChanges={onRequestChanges}
      />
    )
    
    // Should have action buttons
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Reject')).toBeInTheDocument()
    expect(screen.getByText('Request Changes')).toBeInTheDocument()
    
    // Test approve action
    await user.click(screen.getByText('Approve'))
    expect(onApprove).toHaveBeenCalledTimes(1)
    
    // Test reject action
    await user.click(screen.getByText('Reject'))
    expect(onReject).toHaveBeenCalledTimes(1)
    
    // Test request changes action
    await user.click(screen.getByText('Request Changes'))
    expect(onRequestChanges).toHaveBeenCalledTimes(1)
  })
  
  it('applies correct score colors based on thresholds', () => {
    const lowScoreProposal = {
      ...mockProposal,
      readinessScore: 0.5,
      policyPassPct: 0.4
    }
    
    render(<DecisionCard {...lowScoreProposal} />)
    
    // Low scores should have red color
    const readinessElement = screen.getByText('50%')
    const policyElement = screen.getByText('40%')
    
    expect(readinessElement).toHaveClass('text-red-600')
    expect(policyElement).toHaveClass('text-red-600')
  })
  
  it('shows loading state when processing', () => {
    render(<DecisionCard {...mockProposal} loading />)
    
    // Action buttons should be disabled during loading
    expect(screen.getByText('Approve')).toBeDisabled()
    expect(screen.getByText('Reject')).toBeDisabled()
  })
  
  it('handles escalation workflow', async () => {
    const user = userEvent.setup()
    const onEscalate = jest.fn()
    
    render(<DecisionCard {...mockProposal} onEscalate={onEscalate} />)
    
    await user.click(screen.getByText('Escalate'))
    expect(onEscalate).toHaveBeenCalledTimes(1)
  })
  
  it('has proper accessibility attributes', () => {
    render(<DecisionCard {...mockProposal} />)
    
    // Card should have proper role
    const card = screen.getByRole('article') || screen.getByRole('region')
    expect(card).toBeInTheDocument()
    
    // Buttons should be properly labeled
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })
})"