import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PublisherService } from '../services/PublisherService';
import { PublishRequest, PublishResult, ScheduleRequest } from '../types';
import Queue from 'bull';

// Mock dependencies
jest.mock('bull');
jest.mock('redis');
jest.mock('pg');

const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn(),
  getCompleted: jest.fn(),
  getFailed: jest.fn(),
} as any;

(Queue as any).mockImplementation(() => mockQueue);

describe('PublisherService', () => {
  let publisherService: PublisherService;

  beforeEach(() => {
    jest.clearAllMocks();
    publisherService = new PublisherService({
      redis: {
        host: 'localhost',
        port: 6379,
      },
      s3: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        region: 'us-east-1',
        bucket: 'test-bucket',
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('publishImmediate', () => {
    test('should publish content immediately to single platform', async () => {
      const request: PublishRequest = {
        content: 'Test social media post',
        platforms: ['linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
      };

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await publisherService.publishImmediate(request);

      expect(result).toEqual({
        success: true,
        jobId: 'job-123',
        platforms: ['linkedin'],
        scheduledAt: expect.any(String),
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-immediate',
        expect.objectContaining({
          content: 'Test social media post',
          platforms: ['linkedin'],
          workspaceId: 'workspace-123',
          userId: 'user-123',
        }),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        })
      );
    });

    test('should publish content to multiple platforms', async () => {
      const request: PublishRequest = {
        content: 'Multi-platform post',
        platforms: ['linkedin', 'twitter', 'facebook'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
        media: [
          {
            url: 'https://example.com/image.jpg',
            type: 'image',
            altText: 'Test image',
          },
        ],
      };

      mockQueue.add.mockResolvedValue({ id: 'job-456' });

      const result = await publisherService.publishImmediate(request);

      expect(result.success).toBe(true);
      expect(result.platforms).toEqual(['linkedin', 'twitter', 'facebook']);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-immediate',
        expect.objectContaining({
          content: 'Multi-platform post',
          platforms: ['linkedin', 'twitter', 'facebook'],
          media: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://example.com/image.jpg',
              type: 'image',
              altText: 'Test image',
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    test('should handle platform-specific content adaptation', async () => {
      const request: PublishRequest = {
        content: 'Original content that needs adaptation',
        platforms: ['twitter', 'linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
        platformOptions: {
          twitter: {
            hashtags: ['#tech', '#innovation'],
            threadMode: false,
          },
          linkedin: {
            tone: 'professional',
            includeCallToAction: true,
          },
        },
      };

      mockQueue.add.mockResolvedValue({ id: 'job-789' });

      const result = await publisherService.publishImmediate(request);

      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-immediate',
        expect.objectContaining({
          platformOptions: {
            twitter: {
              hashtags: ['#tech', '#innovation'],
              threadMode: false,
            },
            linkedin: {
              tone: 'professional',
              includeCallToAction: true,
            },
          },
        }),
        expect.any(Object)
      );
    });

    test('should reject empty content', async () => {
      const request: PublishRequest = {
        content: '',
        platforms: ['linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
      };

      await expect(publisherService.publishImmediate(request))
        .rejects
        .toThrow('Content cannot be empty');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    test('should reject invalid platforms', async () => {
      const request: PublishRequest = {
        content: 'Test content',
        platforms: ['invalid-platform' as any],
        workspaceId: 'workspace-123',
        userId: 'user-123',
      };

      await expect(publisherService.publishImmediate(request))
        .rejects
        .toThrow('Invalid platform: invalid-platform');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('schedulePublish', () => {
    test('should schedule content for future publication', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1 minute from now
      const request: ScheduleRequest = {
        content: 'Scheduled post',
        platforms: ['linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
        scheduledAt: futureDate,
      };

      mockQueue.add.mockResolvedValue({ id: 'scheduled-job-123' });

      const result = await publisherService.schedulePublish(request);

      expect(result).toEqual({
        success: true,
        jobId: 'scheduled-job-123',
        platforms: ['linkedin'],
        scheduledAt: futureDate.toISOString(),
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-scheduled',
        expect.objectContaining({
          content: 'Scheduled post',
          platforms: ['linkedin'],
          scheduledAt: futureDate,
        }),
        expect.objectContaining({
          delay: expect.any(Number),
          attempts: 3,
        })
      );
    });

    test('should reject past scheduled dates', async () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const request: ScheduleRequest = {
        content: 'Past scheduled post',
        platforms: ['linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
        scheduledAt: pastDate,
      };

      await expect(publisherService.schedulePublish(request))
        .rejects
        .toThrow('Scheduled time must be in the future');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    test('should handle recurring posts', async () => {
      const firstDate = new Date(Date.now() + 60000);
      const request: ScheduleRequest = {
        content: 'Recurring post',
        platforms: ['twitter'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
        scheduledAt: firstDate,
        recurring: {
          frequency: 'daily',
          count: 7,
        },
      };

      mockQueue.add.mockResolvedValue({ id: 'recurring-job-123' });

      const result = await publisherService.schedulePublish(request);

      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'publish-scheduled',
        expect.objectContaining({
          recurring: {
            frequency: 'daily',
            count: 7,
          },
        }),
        expect.any(Object)
      );
    });
  });

  describe('bulkPublish', () => {
    test('should handle bulk publishing to multiple platforms', async () => {
      const requests: PublishRequest[] = [
        {
          content: 'First post',
          platforms: ['linkedin'],
          workspaceId: 'workspace-123',
          userId: 'user-123',
        },
        {
          content: 'Second post',
          platforms: ['twitter', 'facebook'],
          workspaceId: 'workspace-123',
          userId: 'user-123',
        },
      ];

      mockQueue.add
        .mockResolvedValueOnce({ id: 'bulk-job-1' })
        .mockResolvedValueOnce({ id: 'bulk-job-2' });

      const results = await publisherService.bulkPublish(requests);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        success: true,
        jobId: 'bulk-job-1',
        platforms: ['linkedin'],
        scheduledAt: expect.any(String),
      });
      expect(results[1]).toEqual({
        success: true,
        jobId: 'bulk-job-2',
        platforms: ['twitter', 'facebook'],
        scheduledAt: expect.any(String),
      });

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });

    test('should handle partial failures in bulk publishing', async () => {
      const requests: PublishRequest[] = [
        {
          content: 'Valid post',
          platforms: ['linkedin'],
          workspaceId: 'workspace-123',
          userId: 'user-123',
        },
        {
          content: '', // Invalid content
          platforms: ['twitter'],
          workspaceId: 'workspace-123',
          userId: 'user-123',
        },
      ];

      mockQueue.add.mockResolvedValueOnce({ id: 'bulk-job-success' });

      const results = await publisherService.bulkPublish(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Content cannot be empty');

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublishStatus', () => {
    test('should return job status for valid job ID', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          content: 'Test content',
          platforms: ['linkedin'],
        },
        progress: 100,
        finishedOn: Date.now(),
        returnvalue: {
          success: true,
          results: [
            {
              platform: 'linkedin',
              success: true,
              postId: 'li-post-123',
            },
          ],
        },
      };

      mockQueue.getJob.mockResolvedValue(mockJob);

      const status = await publisherService.getPublishStatus('job-123');

      expect(status).toEqual({
        jobId: 'job-123',
        status: 'completed',
        progress: 100,
        platforms: ['linkedin'],
        results: [
          {
            platform: 'linkedin',
            success: true,
            postId: 'li-post-123',
          },
        ],
        completedAt: expect.any(String),
      });
    });

    test('should return not found for invalid job ID', async () => {
      mockQueue.getJob.mockResolvedValue(null);

      const status = await publisherService.getPublishStatus('invalid-job');

      expect(status).toEqual({
        jobId: 'invalid-job',
        status: 'not_found',
        error: 'Job not found',
      });
    });
  });

  describe('optimizePublishTime', () => {
    test('should optimize publish time based on audience data', async () => {
      const request = {
        platforms: ['linkedin', 'twitter'],
        audienceTimezone: 'America/New_York',
        workspaceId: 'workspace-123',
      };

      const optimizedTime = await publisherService.optimizePublishTime(request);

      expect(optimizedTime).toEqual({
        recommendedTime: expect.any(Date),
        confidence: expect.any(Number),
        reasoning: expect.any(String),
        alternatives: expect.arrayContaining([
          expect.objectContaining({
            time: expect.any(Date),
            confidence: expect.any(Number),
          }),
        ]),
      });

      expect(optimizedTime.confidence).toBeGreaterThanOrEqual(0);
      expect(optimizedTime.confidence).toBeLessThanOrEqual(100);
    });

    test('should handle platform-specific optimization', async () => {
      const request = {
        platforms: ['linkedin'],
        audienceTimezone: 'UTC',
        workspaceId: 'workspace-123',
        contentType: 'professional' as const,
      };

      const optimizedTime = await publisherService.optimizePublishTime(request);

      expect(optimizedTime.reasoning).toContain('LinkedIn');
      expect(optimizedTime.alternatives).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should handle Redis connection errors gracefully', async () => {
      mockQueue.add.mockRejectedValue(new Error('Redis connection failed'));

      const request: PublishRequest = {
        content: 'Test content',
        platforms: ['linkedin'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
      };

      await expect(publisherService.publishImmediate(request))
        .rejects
        .toThrow('Failed to queue publish job: Redis connection failed');
    });

    test('should validate workspace permissions', async () => {
      const request: PublishRequest = {
        content: 'Test content',
        platforms: ['linkedin'],
        workspaceId: 'unauthorized-workspace',
        userId: 'user-123',
      };

      // Mock unauthorized workspace
      jest.spyOn(publisherService as any, 'validateWorkspaceAccess')
        .mockResolvedValue(false);

      await expect(publisherService.publishImmediate(request))
        .rejects
        .toThrow('Access denied to workspace: unauthorized-workspace');
    });
  });

  describe('analytics tracking', () => {
    test('should track publication metrics', async () => {
      const request: PublishRequest = {
        content: 'Analytics test post',
        platforms: ['linkedin', 'twitter'],
        workspaceId: 'workspace-123',
        userId: 'user-123',
      };

      mockQueue.add.mockResolvedValue({ id: 'analytics-job-123' });

      const trackAnalyticsSpy = jest.spyOn(publisherService as any, 'trackAnalytics')
        .mockResolvedValue(undefined);

      await publisherService.publishImmediate(request);

      expect(trackAnalyticsSpy).toHaveBeenCalledWith({
        eventType: 'publish_immediate',
        workspaceId: 'workspace-123',
        userId: 'user-123',
        platforms: ['linkedin', 'twitter'],
        contentLength: 'Analytics test post'.length,
      });
    });
  });
});