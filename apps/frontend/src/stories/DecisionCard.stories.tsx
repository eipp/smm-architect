import type { Meta, StoryObj } from '@storybook/react'
import { DecisionCard } from '@smm-architect/ui'
import { action } from '@storybook/addon-actions'

const baseMockProposal = {
  actionId: 'action-001',
  title: 'LinkedIn Thought Leadership Post',
  oneLine: 'Share insights about AI in marketing automation to establish thought leadership',
  readinessScore: 0.92,
  policyPassPct: 0.89,
  citationCoverage: 0.87,
  duplicateRisk: 'low' as const,
  costBreakdown: {
    paidAds: 150,
    llmModelSpend: 35,
    rendering: 20,
    thirdPartyServices: 15,
    total: 220,
    currency: 'USD',
    timeframe: 'per week'
  },
  provenance: [
    {
      title: 'AI Marketing Trends Report 2024',
      url: 'https://example.com/ai-marketing-report',
      verified: true,
      type: 'report' as const
    },
    {
      title: 'Industry Best Practices Guide',
      url: 'https://example.com/best-practices',
      verified: true,
      type: 'document' as const
    },
    {
      title: 'Competitor Analysis: TechCorp',
      url: 'https://linkedin.com/company/techcorp/posts',
      verified: false,
      type: 'social' as const
    }
  ],
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours from now
}

const meta: Meta<typeof DecisionCard> = {
  title: 'UI/DecisionCard',
  component: DecisionCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive decision card for reviewing and approving marketing campaign proposals with cost breakdowns, risk assessment, and provenance tracking.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    readinessScore: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Campaign readiness score (0-1)'
    },
    policyPassPct: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Policy compliance percentage (0-1)'
    },
    citationCoverage: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Citation coverage percentage (0-1)'
    },
    duplicateRisk: {
      control: { type: 'select' },
      options: ['low', 'medium', 'high'],
      description: 'Risk level for content duplication'
    },
    loading: {
      control: 'boolean',
      description: 'Loading state for actions'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// Default story
export const Default: Story = {
  args: {
    ...baseMockProposal,
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  }
}

// High performing proposal
export const HighPerformance: Story = {
  args: {
    ...baseMockProposal,
    title: 'Product Launch Announcement',
    oneLine: 'Exciting product launch with strong market positioning and clear value proposition',
    readinessScore: 0.95,
    policyPassPct: 0.98,
    citationCoverage: 0.92,
    duplicateRisk: 'low',
    costBreakdown: {
      ...baseMockProposal.costBreakdown,
      total: 180
    },
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes')
  }
}

// Medium risk proposal
export const MediumRisk: Story = {
  args: {
    ...baseMockProposal,
    title: 'Controversial Industry Take',
    oneLine: 'Bold stance on industry practices that may generate debate',
    readinessScore: 0.71,
    policyPassPct: 0.76,
    citationCoverage: 0.65,
    duplicateRisk: 'medium',
    costBreakdown: {
      ...baseMockProposal.costBreakdown,
      total: 320
    },
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  }
}

// High risk proposal
export const HighRisk: Story = {
  args: {
    ...baseMockProposal,
    title: 'Competitor Critique Campaign',
    oneLine: 'Direct comparison with competitor products highlighting weaknesses',
    readinessScore: 0.45,
    policyPassPct: 0.52,
    citationCoverage: 0.38,
    duplicateRisk: 'high',
    costBreakdown: {
      ...baseMockProposal.costBreakdown,
      paidAds: 500,
      total: 585
    },
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  }
}

// Expiring soon
export const ExpiringSoon: Story = {
  args: {
    ...baseMockProposal,
    title: 'Time-Sensitive Market Response',
    oneLine: 'Rapid response to competitor announcement - needs immediate attention',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  }
}

// Expired
export const Expired: Story = {
  args: {
    ...baseMockProposal,
    title: 'Missed Opportunity Campaign',
    oneLine: 'Campaign proposal that has exceeded its review deadline',
    expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes')
  }
}

// Loading state
export const Loading: Story = {
  args: {
    ...baseMockProposal,
    loading: true,
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes')
  }
}

// High cost proposal
export const HighCost: Story = {
  args: {
    ...baseMockProposal,
    title: 'Premium Video Production Campaign',
    oneLine: 'High-production value video series for brand awareness',
    costBreakdown: {
      paidAds: 2500,
      llmModelSpend: 150,
      rendering: 800,
      thirdPartyServices: 550,
      total: 4000,
      currency: 'USD',
      timeframe: 'per month'
    },
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  }
}

// Multiple cards layout
export const MultipleCards: Story = {
  render: () => (
    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl\">
      <DecisionCard
        {...baseMockProposal}
        onApprove={action('approved-1')}
        onReject={action('rejected-1')}
        onRequestChanges={action('requested-changes-1')}
      />
      <DecisionCard
        {...baseMockProposal}
        title=\"Twitter Thread Series\"
        oneLine=\"Educational thread about industry best practices\"
        readinessScore={0.78}
        duplicateRisk=\"medium\"
        costBreakdown={{
          ...baseMockProposal.costBreakdown,
          total: 95
        }}
        onApprove={action('approved-2')}
        onReject={action('rejected-2')}
        onRequestChanges={action('requested-changes-2')}
      />
      <DecisionCard
        {...baseMockProposal}
        title=\"Instagram Story Campaign\"
        oneLine=\"Behind-the-scenes content showcasing company culture\"
        readinessScore={0.91}
        duplicateRisk=\"low\"
        expiresAt={new Date(Date.now() + 1000 * 60 * 60 * 4)}
        onApprove={action('approved-3')}
        onReject={action('rejected-3')}
        onRequestChanges={action('requested-changes-3')}
      />
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Multiple decision cards as they would appear in the actual interface.'
      }
    }
  }
}

// Interactive playground
export const Playground: Story = {
  args: {
    ...baseMockProposal,
    onApprove: action('approved'),
    onReject: action('rejected'),
    onRequestChanges: action('requested-changes'),
    onEscalate: action('escalated')
  },
  parameters: {
    docs: {
      description: {
        story: 'Adjust the props to see how different scores and risk levels affect the card appearance.'
      }
    }
  }
}"