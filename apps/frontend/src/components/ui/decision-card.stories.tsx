import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { DecisionCard, CampaignProposal } from '@/components/ui/decision-card'

const meta = {
  title: 'UI/DecisionCard',
  component: DecisionCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A comprehensive decision card component for displaying campaign proposals with cost breakdown, risk assessment, approval workflows, and provenance tracking.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showCostBreakdown: {
      control: { type: 'boolean' },
      description: 'Whether to show detailed cost breakdown',
    },
    showProvenance: {
      control: { type: 'boolean' },
      description: 'Whether to show provenance sources',
    },
    compact: {
      control: { type: 'boolean' },
      description: 'Whether to use compact layout',
    },
  },
  args: {
    onApprove: fn(),
    onReject: fn(),
    onRequestChanges: fn(),
    onEscalate: fn(),
  },
} satisfies Meta<typeof DecisionCard>

export default meta
type Story = StoryObj<typeof meta>

// Sample campaign data
const basicCampaign: CampaignProposal = {
  id: 'camp-001',
  title: 'Summer Product Launch Campaign',
  description: 'Comprehensive digital marketing campaign for our new product line launch targeting millennials and Gen Z consumers.',
  platforms: ['facebook', 'instagram', 'twitter'],
  budget: {
    total: 25000,
    breakdown: [
      { category: 'Ad Spend', amount: 15000, percentage: 60 },
      { category: 'Creative Production', amount: 5000, percentage: 20 },
      { category: 'Influencer Partnerships', amount: 3000, percentage: 12 },
      { category: 'Analytics & Tools', amount: 2000, percentage: 8 }
    ]
  },
  timeline: {
    start: new Date('2024-06-01'),
    end: new Date('2024-08-31'),
    duration: '3 months'
  },
  metrics: {
    estimatedReach: 500000,
    expectedCTR: 2.5,
    projectedROI: 3.2,
    confidenceScore: 85
  },
  riskAssessment: {
    overall: 'medium',
    factors: [
      { type: 'market', level: 'low', description: 'Stable market conditions' },
      { type: 'competition', level: 'medium', description: 'Moderate competition expected' },
      { type: 'budget', level: 'low', description: 'Budget within approved limits' }
    ]
  },
  provenance: [
    {
      id: 'source-1',
      title: 'Market Research Report Q1 2024',
      url: 'https://example.com/research',
      verified: true,
      snippet: 'Target demographic shows 40% increase in digital engagement'
    },
    {
      id: 'source-2',
      title: 'Competitor Analysis Dashboard',
      url: 'https://example.com/analysis',
      verified: true,
      snippet: 'Average CTR for similar campaigns: 2.1%'
    }
  ],
  status: 'pending',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  expiresAt: new Date('2024-01-22T10:30:00Z'),
  creator: 'Sarah Johnson',
  assignee: 'Marketing Team Lead'
}

const highRiskCampaign: CampaignProposal = {
  ...basicCampaign,
  id: 'camp-002',
  title: 'Experimental AR Campaign',
  description: 'Cutting-edge augmented reality campaign using new technology platform.',
  budget: {
    total: 75000,
    breakdown: [
      { category: 'Technology Development', amount: 45000, percentage: 60 },
      { category: 'Content Creation', amount: 15000, percentage: 20 },
      { category: 'Testing & QA', amount: 10000, percentage: 13 },
      { category: 'Launch Support', amount: 5000, percentage: 7 }
    ]
  },
  riskAssessment: {
    overall: 'high',
    factors: [
      { type: 'technology', level: 'high', description: 'Unproven AR technology' },
      { type: 'market', level: 'medium', description: 'Limited AR adoption data' },
      { type: 'budget', level: 'high', description: 'Significant investment required' }
    ]
  },
  metrics: {
    estimatedReach: 100000,
    expectedCTR: 5.0,
    projectedROI: 2.8,
    confidenceScore: 65
  }
}

const lowBudgetCampaign: CampaignProposal = {
  ...basicCampaign,
  id: 'camp-003',
  title: 'Organic Social Media Push',
  description: 'Low-cost organic content campaign focusing on community engagement.',
  budget: {
    total: 5000,
    breakdown: [
      { category: 'Content Creation', amount: 3000, percentage: 60 },
      { category: 'Community Management', amount: 1500, percentage: 30 },
      { category: 'Analytics Tools', amount: 500, percentage: 10 }
    ]
  },
  riskAssessment: {
    overall: 'low',
    factors: [
      { type: 'budget', level: 'low', description: 'Minimal financial risk' },
      { type: 'market', level: 'low', description: 'Organic approach reduces risk' }
    ]
  },
  metrics: {
    estimatedReach: 50000,
    expectedCTR: 1.8,
    projectedROI: 4.5,
    confidenceScore: 90
  }
}

const expiredCampaign: CampaignProposal = {
  ...basicCampaign,
  id: 'camp-004',
  title: 'Expired Campaign Proposal',
  status: 'expired',
  expiresAt: new Date('2024-01-10T10:30:00Z')
}

// Basic stories
export const Default: Story = {
  args: {
    proposal: basicCampaign,
  },
}

export const HighRisk: Story = {
  args: {
    proposal: highRiskCampaign,
  },
  parameters: {
    docs: {
      description: {
        story: 'Campaign proposal with high risk assessment and significant budget.',
      },
    },
  },
}

export const LowBudget: Story = {
  args: {
    proposal: lowBudgetCampaign,
  },
  parameters: {
    docs: {
      description: {
        story: 'Low-budget campaign with minimal risk and high confidence score.',
      },
    },
  },
}

export const Expired: Story = {
  args: {
    proposal: expiredCampaign,
  },
  parameters: {
    docs: {
      description: {
        story: 'Expired campaign proposal showing disabled state and expiry notification.',
      },
    },
  },
}

// Feature variations
export const WithCostBreakdown: Story = {
  args: {
    proposal: basicCampaign,
    showCostBreakdown: true,
  },
}

export const WithProvenance: Story = {
  args: {
    proposal: basicCampaign,
    showProvenance: true,
  },
}

export const CompactView: Story = {
  args: {
    proposal: basicCampaign,
    compact: true,
  },
}

export const FullFeatures: Story = {
  args: {
    proposal: basicCampaign,
    showCostBreakdown: true,
    showProvenance: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete decision card with all features enabled.',
      },
    },
  },
}

// Interactive examples
export const ApprovalWorkflow: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Different Approval States</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DecisionCard
            proposal={basicCampaign}
            onApprove={fn()}
            onReject={fn()}
            onRequestChanges={fn()}
            onEscalate={fn()}
          />
          <DecisionCard
            proposal={highRiskCampaign}
            onApprove={fn()}
            onReject={fn()}
            onRequestChanges={fn()}
            onEscalate={fn()}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Interactive approval workflow showing different campaign risk levels.',
      },
    },
  },
}

// Loading state
export const Loading: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded-lg" />
      </div>
      <p className="text-sm text-muted-foreground">
        Loading state representation - actual loading component would be implemented based on needs
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading state for when campaign data is being fetched.',
      },
    },
  },
}

// Comparison view
export const ComparisonView: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Campaign Comparison</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <DecisionCard proposal={basicCampaign} compact />
        <DecisionCard proposal={lowBudgetCampaign} compact />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Side-by-side comparison of multiple campaign proposals.',
      },
    },
  },
}

// Responsive example
export const ResponsiveExample: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="block md:hidden">
        <h3 className="text-lg font-semibold mb-4">Mobile View</h3>
        <DecisionCard proposal={basicCampaign} compact />
      </div>
      
      <div className="hidden md:block">
        <h3 className="text-lg font-semibold mb-4">Desktop View</h3>
        <DecisionCard 
          proposal={basicCampaign} 
          showCostBreakdown 
          showProvenance 
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Responsive design adapting to different screen sizes.',
      },
    },
  },
}

// Edge cases
export const MinimalData: Story = {
  args: {
    proposal: {
      id: 'minimal',
      title: 'Minimal Campaign',
      description: 'Campaign with minimal data',
      platforms: ['facebook'],
      budget: { total: 1000, breakdown: [] },
      timeline: {
        start: new Date(),
        end: new Date(),
        duration: '1 week'
      },
      metrics: {
        estimatedReach: 1000,
        expectedCTR: 1.0,
        projectedROI: 1.0,
        confidenceScore: 50
      },
      riskAssessment: {
        overall: 'low',
        factors: []
      },
      provenance: [],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      creator: 'Test User',
      assignee: 'Test Assignee'
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Campaign with minimal data to test edge cases.',
      },
    },
  },
}