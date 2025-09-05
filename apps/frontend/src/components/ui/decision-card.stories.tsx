import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import { DecisionCard } from '@/components/ui/decision-card'

const meta = {
  title: 'UI/DecisionCard',
  component: DecisionCard,
  parameters: {
    layout: 'centered',
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

const baseProps = {
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
    timeframe: 'per week',
  },
  provenance: [
    {
      title: 'Industry Report 2024',
      url: 'https://example.com/report',
      verified: true,
      type: 'report' as const,
    },
    {
      title: 'Marketing Blog',
      url: 'https://example.com/blog',
      verified: false,
      type: 'article' as const,
    },
  ],
  expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
}

export const Default: Story = {
  args: {
    ...baseProps,
  },
}

export const Expired: Story = {
  args: {
    ...baseProps,
    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
  },
}
