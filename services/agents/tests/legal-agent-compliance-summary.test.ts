import { describe, it, expect } from '@jest/globals';
import LegalAgent, { LegalConfig } from '../legal-agent/LegalAgent';
import type { Logger } from 'winston';

describe('LegalAgent.getComplianceSummary', () => {
  it('calculates totals from compliance records', async () => {
    const mockDb = {
      complianceCheck: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'compliant', score: 90, region: 'US', violations: [] },
          {
            status: 'non_compliant',
            score: 60,
            region: 'EU',
            violations: [{ ruleId: 'GDPR Data Processing Disclosure' }]
          },
          {
            status: 'needs_review',
            score: 70,
            region: 'US',
            violations: [{ ruleId: 'Promotional Content Disclosure' }]
          },
          {
            status: 'non_compliant',
            score: 55,
            region: 'EU',
            violations: [
              { ruleId: 'GDPR Data Processing Disclosure' },
              { ruleId: 'Accessibility Alt Text' }
            ]
          }
        ])
      }
    } as unknown as any;

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;

    const config: LegalConfig = {
      enabledRegions: ['US', 'EU'],
      defaultRegion: 'US',
      strictMode: false,
      autoBlockingEnabled: false,
      complianceThreshold: 80,
      regulationCheckTimeout: 5000
    };

    const agent = new LegalAgent(config, mockLogger, mockDb);

    const summary = await agent.getComplianceSummary('ws-1');

    expect(mockDb.complianceCheck.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws-1' },
      select: {
        status: true,
        score: true,
        region: true,
        violations: { select: { ruleId: true } }
      }
    });

    expect(summary).toEqual({
      overallScore: 69,
      totalChecks: 4,
      compliantContent: 1,
      nonCompliantContent: 2,
      pendingReview: 1,
      commonViolations: [
        { rule: 'GDPR Data Processing Disclosure', count: 2 },
        { rule: 'Promotional Content Disclosure', count: 1 },
        { rule: 'Accessibility Alt Text', count: 1 }
      ],
      regionBreakdown: { US: 80, EU: 58 }
    });
  });
});

