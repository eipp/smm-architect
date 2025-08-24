import type { Meta, StoryObj } from '@storybook/react';
import { DecisionCard, type DecisionCardProps } from '@smm-architect/ui';

const meta: Meta<typeof DecisionCard> = {
  title: 'UI/DecisionCard',
  component: DecisionCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A decision card component for displaying campaign proposals with metrics, cost breakdown, and approval actions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    readinessScore: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Campaign readiness score (0-1)',
    },
    policyPassPct: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Policy compliance percentage (0-1)',
    },
    citationCoverage: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Citation coverage percentage (0-1)',
    },
    duplicateRisk: {
      control: { type: 'select' },
      options: ['low', 'medium', 'high'],
      description: 'Duplicate content risk level',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseProps: DecisionCardProps = {
  actionId: 'action-001',
  title: 'LinkedIn Thought Leadership Post',
  oneLine: 'Share insights about AI in marketing automation with industry statistics and expert quotes.',
  readinessScore: 0.92,
  policyPassPct: 0.95,
  citationCoverage: 0.88,
  duplicateRisk: 'low',
  costBreakdown: {
    paidAds: 150,
    llmModelSpend: 25,
    rendering: 10,
    thirdPartyServices: 15,
    total: 200,
    currency: 'USD',
    timeframe: 'per campaign',
  },
  provenance: [
    {
      title: 'Marketing AI Report 2024',
      url: 'https://example.com/report',
      verified: true,
      type: 'report',
    },
    {
      title: 'Industry Expert Interview',
      url: 'https://example.com/interview',
      verified: true,
      type: 'website',
    },
    {
      title: 'LinkedIn Marketing Guide',
      url: 'https://example.com/guide',
      verified: false,
      type: 'document',
    },
  ],
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48), // 48 hours from now
};

export const Default: Story = {
  args: baseProps,
};

export const HighReadiness: Story = {
  args: {
    ...baseProps,
    title: 'Product Launch Announcement',
    oneLine: 'Announce our new AI-powered marketing platform with feature highlights and early bird pricing.',
    readinessScore: 0.98,
    policyPassPct: 1.0,
    citationCoverage: 0.95,
    duplicateRisk: 'low',
    costBreakdown: {
      ...baseProps.costBreakdown,
      paidAds: 500,
      total: 550,
    },
  },
};

export const MediumReadiness: Story = {
  args: {
    ...baseProps,
    title: 'Holiday Social Campaign',
    oneLine: 'Seasonal marketing campaign with festive content and promotional offers.',
    readinessScore: 0.75,
    policyPassPct: 0.82,
    citationCoverage: 0.65,
    duplicateRisk: 'medium',
  },
};

export const LowReadiness: Story = {
  args: {
    ...baseProps,
    title: 'Crisis Response Communication',
    oneLine: 'Urgent response to recent industry concerns with transparency and action plan.',
    readinessScore: 0.45,
    policyPassPct: 0.60,
    citationCoverage: 0.40,
    duplicateRisk: 'high',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
  },
};

export const ExpiringCard: Story = {
  args: {
    ...baseProps,
    title: 'Time-Sensitive Announcement',
    oneLine: 'Breaking news response that needs immediate attention and approval.',
    expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes from now
  },
};

export const ExpiredCard: Story = {
  args: {
    ...baseProps,
    title: 'Expired Campaign Proposal',
    oneLine: 'This campaign proposal has expired and needs to be regenerated.',
    expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
};

export const Loading: Story = {
  args: {
    ...baseProps,
    loading: true,
  },
};

export const WithoutActions: Story = {
  args: {
    ...baseProps,
    onApprove: undefined,
    onReject: undefined,
    onRequestChanges: undefined,
    onEscalate: undefined,
  },
};

export const HighCostCampaign: Story = {
  args: {
    ...baseProps,
    title: 'Enterprise Product Launch',
    oneLine: 'Major product launch with extensive paid advertising and multi-channel approach.',
    costBreakdown: {
      paidAds: 5000,
      llmModelSpend: 150,
      rendering: 75,
      thirdPartyServices: 275,
      total: 5500,
      currency: 'USD',
      timeframe: 'per campaign',
    },
  },
};

// Interactive story with actions
export const Interactive: Story = {
  args: {
    ...baseProps,
    onApprove: () => alert('Campaign approved!'),
    onReject: () => alert('Campaign rejected!'),
    onRequestChanges: () => alert('Changes requested!'),
    onEscalate: () => alert('Campaign escalated!'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive version with working action buttons.',
      },
    },
  },
};