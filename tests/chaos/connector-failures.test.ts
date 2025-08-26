import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { PublisherAgent } from '../src/agents/publisher-agent';
import { ConnectorManager } from '../src/services/connector-manager';
import { DecisionCardService } from '../src/services/decision-card-service';
import { 
  ConnectorFailureSimulator, 
  FaultInjectionScenario,
  ConnectorStatus,
  PlatformError 
} from '../src/testing/chaos-engineering';

describe('Chaos Engineering - Connector Failures', () => {
  let publisherAgent: PublisherAgent;
  let connectorManager: ConnectorManager;
  let decisionCardService: DecisionCardService;
  let chaosSimulator: ConnectorFailureSimulator;

  beforeAll(() => {
    publisherAgent = new PublisherAgent();
    connectorManager = new ConnectorManager();
    decisionCardService = new DecisionCardService();
    chaosSimulator = new ConnectorFailureSimulator();
  });

  beforeEach(() => {
    // Clear any existing nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('Token Expiry Cascade Failures', () => {
    it('should handle LinkedIn token expiry with exponential backoff', async () => {
      const scenario: FaultInjectionScenario = {
        name: 'linkedin-token-expiry-cascade',
        platform: 'linkedin',
        sequence: [
          {
            step: 1,
            httpStatus: 401,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Access token expired',
              details: { tokenExpiredAt: '2024-01-15T10:30:00Z' }
            },
            delay: 0
          },
          {
            step: 2,
            httpStatus: 429,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many token refresh attempts',
              details: { retryAfter: 60 }
            },
            delay: 1000
          },
          {
            step: 3,
            httpStatus: 200,
            response: {
              id: 'urn:li:activity:7123456789',
              publishedAt: '2024-01-15T10:35:00Z',
              status: 'published'
            },
            delay: 2000
          }
        ],
        expectedBehavior: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          fallbackActivated: true,
          decisionCardGenerated: true,
          auditTrailComplete: true
        }
      };

      // Setup mock responses based on scenario
      let callCount = 0;
      nock('https://api.linkedin.com')
        .persist()
        .post('/v2/ugcPosts')
        .reply(() => {
          callCount++;
          const step = scenario.sequence.find(s => s.step === callCount);
          if (step) {
            if (step.httpStatus === 200) {
              return [step.httpStatus, step.response];
            } else {
              return [step.httpStatus, step.error];
            }
          }
          return [500, { error: 'Unexpected call' }];
        });

      // Inject chaos scenario
      await chaosSimulator.injectScenario(scenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'linkedin',
        content: {
          text: 'Test post for chaos engineering',
          media: []
        },
        scheduledTime: new Date('2024-01-15T10:30:00Z')
      };

      const result = await publisherAgent.publish(publishRequest);

      // Verify expected behavior
      expect(result.status).toBe('published');
      expect(result.retries).toBe(3);
      expect(result.fallbackUsed).toBe(true);
      expect(result.publishedAt).toBeDefined();

      // Verify decision card was generated
      const decisionCards = await decisionCardService.getByWorkspace('ws-test-001');
      const tokenExpiryCard = decisionCards.find(card => 
        card.recommendations.some(rec => rec.includes('reconnect_linkedin'))
      );
      expect(tokenExpiryCard).toBeDefined();

      // Verify audit trail
      expect(result.auditTrail).toHaveLength(3); // Initial attempt + 2 retries
      expect(result.auditTrail[0].error).toContain('Access token expired');
      expect(result.auditTrail[1].error).toContain('Rate limited');
      expect(result.auditTrail[2].status).toBe('success');
    });

    it('should activate browser fallback when all API attempts fail', async () => {
      const scenario: FaultInjectionScenario = {
        name: 'total-api-failure',
        platform: 'linkedin',
        sequence: [
          { step: 1, httpStatus: 401, error: { code: 'UNAUTHORIZED' }, delay: 0 },
          { step: 2, httpStatus: 429, error: { code: 'RATE_LIMITED' }, delay: 1000 },
          { step: 3, httpStatus: 503, error: { code: 'SERVICE_UNAVAILABLE' }, delay: 2000 },
          { step: 4, httpStatus: 500, error: { code: 'INTERNAL_ERROR' }, delay: 4000 }
        ],
        expectedBehavior: {
          maxRetries: 4,
          fallbackToBrowser: true,
          decisionCardGenerated: true
        }
      };

      nock('https://api.linkedin.com')
        .persist()
        .post('/v2/ugcPosts')
        .reply((uri, requestBody) => {
          const step = scenario.sequence.find(s => s.step <= 4);
          return [step?.httpStatus || 500, step?.error || { error: 'Unknown error' }];
        });

      await chaosSimulator.injectScenario(scenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'linkedin',
        content: {
          text: 'Test post requiring browser fallback'
        },
        allowBrowserFallback: true
      };

      const result = await publisherAgent.publish(publishRequest);

      // Should fallback to browser automation
      expect(result.status).toBe('queued_for_browser');
      expect(result.fallbackMethod).toBe('playwright');
      expect(result.apiAttempts).toBe(4);

      // Verify decision card recommendations
      const decisionCards = await decisionCardService.getByWorkspace('ws-test-001');
      const fallbackCard = decisionCards.find(card => 
        card.recommendations.some(rec => rec.includes('browser_fallback_activated'))
      );
      expect(fallbackCard).toBeDefined();
      expect(fallbackCard?.metadata.fallbackReason).toBe('api_exhausted');
    });
  });

  describe('Rate Limiting Chaos', () => {
    it('should handle cascading rate limits across multiple platforms', async () => {
      const multiPlatformScenario: FaultInjectionScenario = {
        name: 'multi-platform-rate-limit',
        platform: 'all',
        sequence: [
          {
            step: 1,
            platforms: ['linkedin', 'x', 'instagram'],
            httpStatus: 429,
            error: {
              code: 'RATE_LIMITED',
              message: 'Rate limit exceeded',
              details: { retryAfter: 300, limitType: 'burst' }
            }
          }
        ],
        expectedBehavior: {
          gracefulDegradation: true,
          redistributeLoad: true,
          decisionCardGenerated: true
        }
      };

      // Mock all platform APIs with rate limiting
      nock('https://api.linkedin.com')
        .post('/v2/ugcPosts')
        .reply(429, {
          error: 'Rate limit exceeded',
          retryAfter: 300
        });

      nock('https://api.twitter.com')
        .post('/2/tweets')
        .reply(429, {
          error: 'Rate limit exceeded',
          retryAfter: 900
        });

      nock('https://graph.facebook.com')
        .post('/me/media')
        .reply(429, {
          error: 'Application request limit reached',
          retryAfter: 1800
        });

      await chaosSimulator.injectScenario(multiPlatformScenario);

      const campaignRequest = {
        workspaceId: 'ws-test-001',
        platforms: ['linkedin', 'x', 'instagram'],
        content: {
          text: 'Multi-platform campaign test'
        },
        distributionStrategy: 'adaptive'
      };

      const result = await publisherAgent.publishToCampaign(campaignRequest);

      // Verify graceful degradation
      expect(result.overallStatus).toBe('partially_successful');
      expect(result.platformResults.every(pr => pr.status === 'rate_limited')).toBe(true);
      expect(result.redistributionApplied).toBe(true);

      // Verify load redistribution decision
      const decisionCards = await decisionCardService.getByWorkspace('ws-test-001');
      const redistributionCard = decisionCards.find(card => 
        card.recommendations.some(rec => rec.includes('redistribute_campaign_load'))
      );
      expect(redistributionCard).toBeDefined();
      expect(redistributionCard?.metadata.affectedPlatforms).toHaveLength(3);
    });

    it('should implement exponential backoff with jitter', async () => {
      const backoffScenario: FaultInjectionScenario = {
        name: 'rate-limit-backoff-test',
        platform: 'x',
        sequence: [
          { step: 1, httpStatus: 429, error: { retryAfter: 60 }, delay: 0 },
          { step: 2, httpStatus: 429, error: { retryAfter: 120 }, delay: 60000 },
          { step: 3, httpStatus: 429, error: { retryAfter: 240 }, delay: 120000 },
          { step: 4, httpStatus: 200, response: { id: '1234567890' }, delay: 240000 }
        ],
        expectedBehavior: {
          backoffStrategy: 'exponential_with_jitter',
          maxBackoffTime: 300000,
          jitterRange: 0.1
        }
      };

      let attemptTimes: number[] = [];
      
      nock('https://api.twitter.com')
        .persist()
        .post('/2/tweets')
        .reply(() => {
          attemptTimes.push(Date.now());
          const attempt = attemptTimes.length;
          const step = backoffScenario.sequence.find(s => s.step === attempt);
          return [step?.httpStatus || 500, step?.response || step?.error];
        });

      await chaosSimulator.injectScenario(backoffScenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'x',
        content: { text: 'Backoff strategy test' }
      };

      const startTime = Date.now();
      const result = await publisherAgent.publish(publishRequest);
      const totalTime = Date.now() - startTime;

      // Verify exponential backoff timing
      expect(result.status).toBe('published');
      expect(result.retries).toBe(3);
      expect(totalTime).toBeGreaterThan(420000); // Should take at least 7 minutes
      expect(totalTime).toBeLessThan(480000); // But not more than 8 minutes

      // Verify backoff intervals increased exponentially
      for (let i = 1; i < attemptTimes.length; i++) {
        const interval = attemptTimes[i] - attemptTimes[i - 1];
        const expectedMin = Math.pow(2, i - 1) * 60000 * 0.9; // With jitter tolerance
        const expectedMax = Math.pow(2, i - 1) * 60000 * 1.1;
        expect(interval).toBeGreaterThanOrEqual(expectedMin);
        expect(interval).toBeLessThanOrEqual(expectedMax);
      }
    });
  });

  describe('Platform Outage Simulation', () => {
    it('should handle complete platform outage with circuit breaker', async () => {
      const outageScenario: FaultInjectionScenario = {
        name: 'instagram-complete-outage',
        platform: 'instagram',
        sequence: [
          { step: 1, httpStatus: 500, error: { code: 'INTERNAL_ERROR' }, delay: 0 },
          { step: 2, httpStatus: 503, error: { code: 'SERVICE_UNAVAILABLE' }, delay: 1000 },
          { step: 3, httpStatus: 502, error: { code: 'BAD_GATEWAY' }, delay: 2000 },
          { step: 4, httpStatus: 504, error: { code: 'GATEWAY_TIMEOUT' }, delay: 5000 },
          { step: 5, httpStatus: 500, error: { code: 'INTERNAL_ERROR' }, delay: 10000 }
        ],
        expectedBehavior: {
          circuitBreakerTriggered: true,
          platformMarkedDegraded: true,
          alternativePlatformSuggested: true
        }
      };

      nock('https://graph.facebook.com')
        .persist()
        .post('/me/media')
        .replyWithError('ECONNREFUSED');

      await chaosSimulator.injectScenario(outageScenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'instagram',
        content: {
          media: [{ type: 'image', url: 'https://example.com/image.jpg' }],
          caption: 'Circuit breaker test'
        }
      };

      const result = await publisherAgent.publish(publishRequest);

      // Verify circuit breaker activation
      expect(result.status).toBe('circuit_breaker_open');
      expect(result.circuitBreakerState).toBe('open');
      expect(result.failureCount).toBeGreaterThanOrEqual(3);

      // Verify platform status update
      const connectorStatus = await connectorManager.getConnectorStatus('ws-test-001', 'instagram');
      expect(connectorStatus.status).toBe('degraded');
      expect(connectorStatus.lastFailure).toBeDefined();
      expect(connectorStatus.circuitBreakerState).toBe('open');

      // Verify decision card with alternative suggestions
      const decisionCards = await decisionCardService.getByWorkspace('ws-test-001');
      const outageCard = decisionCards.find(card => 
        card.recommendations.some(rec => rec.includes('platform_alternative'))
      );
      expect(outageCard).toBeDefined();
      expect(outageCard?.metadata.affectedPlatform).toBe('instagram');
      expect(outageCard?.metadata.suggestedAlternatives).toContain('facebook');
    });

    it('should recover gracefully when platform comes back online', async () => {
      // First simulate outage
      nock('https://api.linkedin.com')
        .post('/v2/ugcPosts')
        .times(3)
        .reply(500, { error: 'Internal server error' });

      const outageRequest = {
        workspaceId: 'ws-test-001',
        platform: 'linkedin',
        content: { text: 'Test during outage' }
      };

      await publisherAgent.publish(outageRequest);

      // Verify circuit breaker is open
      let connectorStatus = await connectorManager.getConnectorStatus('ws-test-001', 'linkedin');
      expect(connectorStatus.circuitBreakerState).toBe('open');

      // Simulate platform recovery
      nock.cleanAll();
      nock('https://api.linkedin.com')
        .post('/v2/ugcPosts')
        .reply(200, {
          id: 'urn:li:activity:7123456789',
          publishedAt: '2024-01-15T10:35:00Z'
        });

      // Wait for circuit breaker timeout (mocked)
      await chaosSimulator.advanceTime(60000); // Advance 1 minute

      // Attempt publication again
      const recoveryRequest = {
        workspaceId: 'ws-test-001',
        platform: 'linkedin',
        content: { text: 'Test after recovery' }
      };

      const recoveryResult = await publisherAgent.publish(recoveryRequest);

      // Verify successful recovery
      expect(recoveryResult.status).toBe('published');
      expect(recoveryResult.platformRecovered).toBe(true);

      // Verify connector status updated
      connectorStatus = await connectorManager.getConnectorStatus('ws-test-001', 'linkedin');
      expect(connectorStatus.status).toBe('connected');
      expect(connectorStatus.circuitBreakerState).toBe('closed');
      expect(connectorStatus.lastSuccessfulPublish).toBeDefined();
    });
  });

  describe('OAuth Token Management Chaos', () => {
    it('should handle token refresh failure cascade', async () => {
      const tokenChaosScenario: FaultInjectionScenario = {
        name: 'oauth-token-refresh-cascade',
        platform: 'linkedin',
        sequence: [
          {
            step: 1,
            endpoint: '/oauth/v2/accessToken',
            httpStatus: 400,
            error: {
              code: 'INVALID_GRANT',
              message: 'Refresh token expired'
            }
          },
          {
            step: 2,
            endpoint: '/v2/ugcPosts',
            httpStatus: 401,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid access token'
            }
          }
        ],
        expectedBehavior: {
          reauthorizationRequired: true,
          userNotificationSent: true,
          alternativeChannelActivated: true
        }
      };

      // Mock OAuth token refresh failure
      nock('https://www.linkedin.com')
        .post('/oauth/v2/accessToken')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'The provided refresh token is invalid or expired'
        });

      // Mock API call with invalid token
      nock('https://api.linkedin.com')
        .post('/v2/ugcPosts')
        .reply(401, {
          error: 'Unauthorized',
          message: 'Invalid access token'
        });

      await chaosSimulator.injectScenario(tokenChaosScenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'linkedin',
        content: { text: 'OAuth failure test' }
      };

      const result = await publisherAgent.publish(publishRequest);

      // Verify reauthorization workflow triggered
      expect(result.status).toBe('reauthorization_required');
      expect(result.authorizationUrl).toBeDefined();
      expect(result.errorCode).toBe('OAUTH_REFRESH_FAILED');

      // Verify user notification
      const notifications = await connectorManager.getPendingNotifications('ws-test-001');
      const authNotification = notifications.find(n => n.type === 'reauthorization_required');
      expect(authNotification).toBeDefined();
      expect(authNotification?.platform).toBe('linkedin');

      // Verify decision card with reauthorization steps
      const decisionCards = await decisionCardService.getByWorkspace('ws-test-001');
      const authCard = decisionCards.find(card => 
        card.recommendations.some(rec => rec.includes('reauthorize_linkedin'))
      );
      expect(authCard).toBeDefined();
      expect(authCard?.actionItems).toContain('complete_oauth_flow');
    });
  });

  describe('Network Failure Simulation', () => {
    it('should handle network timeouts and connection errors', async () => {
      const networkChaosScenario: FaultInjectionScenario = {
        name: 'network-instability',
        platform: 'x',
        sequence: [
          { step: 1, networkError: 'ECONNRESET', delay: 0 },
          { step: 2, networkError: 'ETIMEDOUT', delay: 5000 },
          { step: 3, networkError: 'ENOTFOUND', delay: 10000 },
          { step: 4, httpStatus: 200, response: { id: '1234567890' }, delay: 15000 }
        ],
        expectedBehavior: {
          networkRetryStrategy: 'adaptive',
          timeoutHandling: 'graceful',
          connectionPooling: 'enabled'
        }
      };

      // Simulate various network errors
      nock('https://api.twitter.com')
        .post('/2/tweets')
        .times(3)
        .replyWithError({ code: 'ECONNRESET', message: 'Connection reset by peer' })
        .post('/2/tweets')
        .reply(200, { data: { id: '1234567890', text: 'Network recovery test' } });

      await chaosSimulator.injectScenario(networkChaosScenario);

      const publishRequest = {
        workspaceId: 'ws-test-001',
        platform: 'x',
        content: { text: 'Network instability test' },
        retryConfig: {
          maxRetries: 5,
          timeoutMs: 10000,
          backoffStrategy: 'adaptive'
        }
      };

      const result = await publisherAgent.publish(publishRequest);

      // Verify eventual success despite network issues
      expect(result.status).toBe('published');
      expect(result.networkRetries).toBe(3);
      expect(result.totalLatency).toBeGreaterThan(15000);

      // Verify adaptive retry strategy was used
      expect(result.retryStrategy).toBe('adaptive');
      expect(result.connectionPoolingUsed).toBe(true);
    });
  });
});