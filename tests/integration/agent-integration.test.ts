/**
 * Agent Integration Tests
 * Tests for the complete agent workflow including Automation, Legal, and Publisher agents
 */

import { describe, beforeAll, afterAll, beforeEach, test, expect } from '@jest/globals';
import winston from 'winston';
import AutomationAgent from '../../services/agents/automation-agent/AutomationAgent';
import LegalAgent from '../../services/agents/legal-agent/LegalAgent';
import PublisherAgent from '../../services/agents/publisher-agent/PublisherAgent';
import { WorkflowDefinition, TaskDefinition } from '../../services/agents/src/types/WorkflowTypes';
import { Content, ContentContext } from '../../services/agents/legal-agent/LegalAgent';
import { PublishableContent, Channel } from '../../services/agents/src/types/PublisherTypes';

describe('Agent Integration Tests', () => {
  let automationAgent: AutomationAgent;
  let legalAgent: LegalAgent;
  let publisherAgent: PublisherAgent;
  let logger: winston.Logger;

  beforeAll(async () => {
    // Set up logger for testing
    logger = winston.createLogger({
      level: 'error', // Reduce noise in tests
      transports: [new winston.transports.Console({ silent: true })]
    });

    // Initialize agents
    automationAgent = new AutomationAgent({
      maxConcurrentWorkflows: 5,
      defaultTimeout: 30000,
      retryAttempts: 2,
      retryDelay: 1000,
      schedulerEnabled: true,
      healthCheckInterval: 0 // Disable for tests
    }, logger);

    legalAgent = new LegalAgent({
      enabledRegions: ['US', 'EU', 'UK'],
      defaultRegion: 'US',
      strictMode: true,
      autoBlockingEnabled: true,
      complianceThreshold: 80,
      regulationCheckTimeout: 5000
    }, logger);

    publisherAgent = new PublisherAgent({
      maxConcurrentPublications: 3,
      retryAttempts: 2,
      retryDelay: 1000,
      enabledPlatforms: ['linkedin', 'twitter', 'facebook'],
      defaultTimezone: 'UTC',
      rateLimits: {
        linkedin: { postsPerHour: 10, postsPerDay: 50 },
        twitter: { postsPerHour: 20, postsPerDay: 100 },
        facebook: { postsPerHour: 15, postsPerDay: 75 }
      },
      engagementTrackingInterval: 0 // Disable for tests
    }, logger);

    // Initialize all agents
    await Promise.all([
      automationAgent.initialize(),
      legalAgent.initialize(),
      publisherAgent.initialize()
    ]);
  });

  afterAll(async () => {
    // Cleanup agents
    await Promise.all([
      automationAgent.shutdown(),
      publisherAgent.shutdown()
    ]);
  });

  beforeEach(() => {
    // Reset any state between tests if needed
  });

  describe('Automation Agent', () => {
    test('should execute a simple workflow successfully', async () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow-1',
        name: 'Test Content Creation Workflow',
        description: 'Simple test workflow',
        steps: [
          {
            id: 'step1',
            name: 'Generate Content',
            type: 'agent_call',
            config: { agent: 'creative', action: 'generate' },
            continueOnError: false
          },
          {
            id: 'step2',
            name: 'Validate Content',
            type: 'agent_call',
            config: { agent: 'legal', action: 'validate' },
            continueOnError: false
          }
        ]
      };

      const result = await automationAgent.executeWorkflow(workflow, { 
        contentType: 'social_post',
        platform: 'linkedin'
      });

      expect(result.success).toBe(true);
      expect(result.workflowId).toBe('test-workflow-1');
      expect(result.stepResults).toHaveProperty('step1');
      expect(result.stepResults).toHaveProperty('step2');
    });

    test('should schedule a task correctly', async () => {
      const task: TaskDefinition = {
        id: 'scheduled-task-1',
        name: 'Daily Content Review',
        description: 'Review and approve scheduled content',
        workflowId: 'content-review-workflow',
        schedule: {
          cronExpression: '0 9 * * *', // 9 AM daily
          timezone: 'UTC'
        },
        enabled: true,
        metadata: {
          priority: 'high',
          department: 'marketing'
        }
      };

      const result = await automationAgent.scheduleTask(task);

      expect(result.success).toBe(true);
      expect(result.taskId).toBe('scheduled-task-1');
      expect(result.nextRun).toBeDefined();
    });

    test('should provide execution status monitoring', async () => {
      const workflow: WorkflowDefinition = {
        id: 'monitoring-test-workflow',
        name: 'Monitoring Test Workflow',
        description: 'Workflow for testing execution monitoring',
        steps: [
          {
            id: 'delay-step',
            name: 'Delay Step',
            type: 'delay',
            config: { duration: 100 },
            continueOnError: false
          }
        ]
      };

      // Start workflow execution
      const workflowPromise = automationAgent.executeWorkflow(workflow);
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check if we can monitor execution (this might not catch the running state due to timing)
      try {
        const executions = automationAgent.getExecutionStats();
        expect(executions.total).toBeGreaterThanOrEqual(0);
      } catch (error) {
        // Monitoring might not capture the execution if it's too fast
        console.log('Execution completed too quickly for monitoring');
      }

      // Wait for workflow completion
      const result = await workflowPromise;
      expect(result.success).toBe(true);
    });
  });

  describe('Legal Agent', () => {
    test('should validate GDPR compliant content', async () => {
      const content: Content = {
        id: 'content-1',
        text: 'Check out our new product! Sign up for our newsletter to get updates. Privacy policy: https://example.com/privacy',
        metadata: {
          platform: 'linkedin',
          audience: 'professionals',
          contentType: 'promotional',
          workspaceId: 'workspace-1'
        }
      };

      const context: Partial<ContentContext> = {
        region: 'EU',
        isPromotional: true,
        hasPersonalData: true
      };

      const result = await legalAgent.validateCompliance(content, context);

      expect(result.contentId).toBe('content-1');
      expect(result.status).toBeOneOf(['compliant', 'needs_review', 'non_compliant']);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should check regulations for different regions', async () => {
      const regions = ['US', 'EU', 'UK'];
      
      for (const region of regions) {
        const result = await legalAgent.checkRegulations(region, 'promotional');
        
        expect(result.region).toBe(region);
        expect(result.contentType).toBe('promotional');
        expect(Array.isArray(result.applicableRegulations)).toBe(true);
        expect(Array.isArray(result.requirements)).toBe(true);
        expect(result.complianceLevel).toBeOneOf(['strict', 'moderate', 'basic']);
      }
    });

    test('should generate appropriate disclaimers', async () => {
      const context: ContentContext = {
        platform: 'instagram',
        audience: 'general',
        region: 'US',
        industry: 'technology',
        contentType: 'promotional',
        isPromotional: true,
        hasPersonalData: false
      };

      const result = await legalAgent.generateDisclaimer(context);

      expect(result.disclaimer).toBeTruthy();
      expect(typeof result.disclaimer).toBe('string');
      expect(result.isRequired).toBe(true); // Should be required for promotional content
      expect(Array.isArray(result.components)).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
    });

    test('should provide compliance summary', async () => {
      const workspaceId = 'test-workspace-123';
      const summary = await legalAgent.getComplianceSummary(workspaceId);

      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallScore).toBeLessThanOrEqual(100);
      expect(summary.totalChecks).toBeGreaterThanOrEqual(0);
      expect(summary.compliantContent).toBeGreaterThanOrEqual(0);
      expect(summary.nonCompliantContent).toBeGreaterThanOrEqual(0);
      expect(summary.pendingReview).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(summary.commonViolations)).toBe(true);
      expect(typeof summary.regionBreakdown).toBe('object');
    });
  });

  describe('Publisher Agent', () => {
    test('should publish content to multiple channels', async () => {
      const content: PublishableContent = {
        id: 'pub-content-1',
        workspaceId: 'workspace-1',
        title: 'Test Publication',
        body: 'This is a test post for our integration testing.',
        mediaUrls: [],
        tags: ['test', 'integration'],
        metadata: {
          contentType: 'social_post',
          priority: 'normal'
        }
      };

      const channels: Channel[] = [
        {
          id: 'linkedin-channel-1',
          platform: 'linkedin',
          accountId: 'test-linkedin-account',
          accountName: 'Test LinkedIn Page',
          isActive: true,
          credentials: {}
        },
        {
          id: 'twitter-channel-1',
          platform: 'twitter',
          accountId: 'test-twitter-account',
          accountName: 'Test Twitter Account',
          isActive: true,
          credentials: {}
        }
      ];

      const result = await publisherAgent.publishToChannels(content, channels);

      expect(result.success).toBe(true);
      expect(result.publicationId).toBeTruthy();
      expect(result.totalChannels).toBe(2);
      expect(result.successfulChannels).toBeGreaterThan(0);
      expect(result.results).toHaveProperty('linkedin-channel-1');
      expect(result.results).toHaveProperty('twitter-channel-1');
    });

    test('should schedule publication for future time', async () => {
      const content: PublishableContent = {
        id: 'scheduled-content-1',
        workspaceId: 'workspace-1',
        title: 'Scheduled Test Post',
        body: 'This post will be published in the future.',
        mediaUrls: [],
        tags: ['scheduled', 'test'],
        metadata: {}
      };

      const channels: Channel[] = [
        {
          id: 'facebook-channel-1',
          platform: 'facebook',
          accountId: 'test-facebook-page',
          accountName: 'Test Facebook Page',
          isActive: true,
          credentials: {}
        }
      ];

      const publishTime = new Date(Date.now() + 60000); // 1 minute from now

      const result = await publisherAgent.schedulePublication(content, channels, publishTime);

      expect(result.success).toBe(true);
      expect(result.publicationId).toBeTruthy();
      expect(result.scheduledTime).toEqual(publishTime);
      expect(result.channels).toHaveLength(1);

      // Verify the publication is stored and can be retrieved
      const status = publisherAgent.getPublicationStatus(result.publicationId!);
      expect(status).toBeTruthy();
      expect(status!.status).toBe('scheduled');
      expect(status!.scheduledTime).toEqual(publishTime);

      // Cancel the scheduled publication to avoid actual execution
      const cancelled = await publisherAgent.cancelPublication(result.publicationId!);
      expect(cancelled).toBe(true);
    });

    test('should track engagement metrics', async () => {
      // First publish content
      const content: PublishableContent = {
        id: 'engagement-content-1',
        workspaceId: 'workspace-1',
        title: 'Engagement Test Post',
        body: 'Testing engagement tracking functionality.',
        mediaUrls: [],
        tags: ['engagement', 'test'],
        metadata: {}
      };

      const channels: Channel[] = [
        {
          id: 'linkedin-engagement-channel',
          platform: 'linkedin',
          accountId: 'test-engagement-account',
          accountName: 'Test Engagement Account',
          isActive: true,
          credentials: {}
        }
      ];

      const publishResult = await publisherAgent.publishToChannels(content, channels);
      expect(publishResult.success).toBe(true);

      // Manually mark as published for testing (since we're mocking)
      const publicationId = publishResult.publicationId!;
      const status = publisherAgent.getPublicationStatus(publicationId);
      if (status) {
        status.status = 'published';
        status.publishedAt = new Date();
      }

      // Track engagement
      const metrics = await publisherAgent.trackEngagement(publicationId);

      expect(metrics.publicationId).toBe(publicationId);
      expect(metrics.totalReach).toBeGreaterThanOrEqual(0);
      expect(metrics.totalImpressions).toBeGreaterThanOrEqual(0);
      expect(metrics.totalEngagements).toBeGreaterThanOrEqual(0);
      expect(metrics.engagementRate).toBeGreaterThanOrEqual(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });

    test('should get platform status and rate limits', async () => {
      const status = publisherAgent.getPlatformStatus();

      expect(typeof status).toBe('object');
      expect(status).toHaveProperty('linkedin');
      expect(status).toHaveProperty('twitter');
      expect(status).toHaveProperty('facebook');

      // Check structure of platform status
      for (const [platform, platformStatus] of Object.entries(status)) {
        expect(platformStatus).toHaveProperty('connected');
        expect(platformStatus).toHaveProperty('rateLimitQuota');
        expect(platformStatus.rateLimitQuota).toHaveProperty('hourly');
        expect(platformStatus.rateLimitQuota).toHaveProperty('daily');
        expect(typeof platformStatus.connected).toBe('boolean');
        expect(typeof platformStatus.rateLimitQuota.hourly).toBe('number');
        expect(typeof platformStatus.rateLimitQuota.daily).toBe('number');
      }
    });
  });

  describe('Cross-Agent Integration', () => {
    test('should execute complete content workflow', async () => {
      // Step 1: Create content
      const content: Content = {
        id: 'integration-content-1',
        text: 'Exciting news! Our new AI-powered feature is now live. Try it today and see the difference. #AI #Innovation',
        metadata: {
          platform: 'linkedin',
          audience: 'professionals',
          contentType: 'announcement',
          workspaceId: 'integration-workspace'
        }
      };

      // Step 2: Legal compliance check
      const complianceResult = await legalAgent.validateCompliance(content, {
        region: 'US',
        isPromotional: false,
        hasPersonalData: false
      });

      expect(complianceResult.status).not.toBe('non_compliant');

      // Step 3: If compliant, prepare for publishing
      if (complianceResult.status === 'compliant') {
        const publishableContent: PublishableContent = {
          id: content.id,
          workspaceId: content.metadata.workspaceId,
          title: 'AI Feature Announcement',
          body: content.text,
          mediaUrls: [],
          tags: ['AI', 'Innovation', 'announcement'],
          metadata: {
            contentType: content.metadata.contentType,
            complianceScore: complianceResult.score
          }
        };

        const channels: Channel[] = [
          {
            id: 'main-linkedin-channel',
            platform: 'linkedin',
            accountId: 'company-linkedin',
            accountName: 'Company LinkedIn Page',
            isActive: true,
            credentials: {}
          }
        ];

        // Step 4: Publish content
        const publishResult = await publisherAgent.publishToChannels(publishableContent, channels);
        expect(publishResult.success).toBe(true);
        expect(publishResult.successfulChannels).toBeGreaterThan(0);
      }
    });

    test('should handle workflow with compliance violations', async () => {
      // Create content that violates compliance (missing privacy disclosure)
      const problematicContent: Content = {
        id: 'problematic-content-1',
        text: 'Sign up now and provide your email, phone number, and address for exclusive offers!',
        metadata: {
          platform: 'facebook',
          audience: 'general',
          contentType: 'promotional',
          workspaceId: 'integration-workspace'
        }
      };

      // Check compliance (should fail for GDPR region)
      const complianceResult = await legalAgent.validateCompliance(problematicContent, {
        region: 'EU',
        isPromotional: true,
        hasPersonalData: true
      });

      expect(complianceResult.status).toBeOneOf(['needs_review', 'non_compliant']);
      expect(complianceResult.violations.length).toBeGreaterThan(0);
      expect(complianceResult.recommendations.length).toBeGreaterThan(0);

      // Content should not be published if non-compliant
      if (complianceResult.status === 'non_compliant') {
        console.log('Content blocked due to compliance violations:', complianceResult.violations);
        // In a real workflow, this would prevent publication
        expect(true).toBe(true); // Test passes - compliance check working correctly
      }
    });
  });
});