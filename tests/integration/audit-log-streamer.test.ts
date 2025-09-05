/**
 * Integration tests for AuditLogStreamer
 */
import { describe, expect, test, beforeEach } from '@jest/globals';

const mockCloudWatchSend = jest.fn();
const CloudWatchLogsClient = jest.fn(() => ({ send: mockCloudWatchSend }));
const PutLogEventsCommand = jest.fn();

jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient,
  PutLogEventsCommand
}));

const mockLogWrite = jest.fn();
const mockLogEntry = jest.fn((metadata: any, data: any) => ({ metadata, data }));
const Logging = jest.fn(() => ({
  log: jest.fn(() => ({ write: mockLogWrite, entry: mockLogEntry }))
}));

jest.mock('@google-cloud/logging', () => ({ Logging }));

import { AuditLogStreamer } from '../../services/shared/security/audit-log-streamer';

const baseEvent = {
  event_type: 'test_event',
  action: 'test',
  target: { resource_type: 'test' },
  details: {},
  metadata: {}
};

describe('AuditLogStreamer SIEM destinations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends events to CloudWatch and GCP Logging', async () => {
    mockCloudWatchSend.mockResolvedValue({});
    mockLogWrite.mockResolvedValue(undefined);

    const streamer = new AuditLogStreamer({
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 1000,
      retry_attempts: 0,
      retry_delay_ms: 10,
      destinations: [
        {
          name: 'cw',
          type: 'aws_cloudwatch',
          enabled: true,
          config: { region: 'us-east-1', logGroupName: 'g', logStreamName: 's' }
        },
        {
          name: 'gcp',
          type: 'gcp_logging',
          enabled: true,
          config: { projectId: 'p', logName: 'l' }
        }
      ]
    });

    await streamer.recordEvent(baseEvent);

    expect(mockCloudWatchSend).toHaveBeenCalledTimes(1);
    expect(mockLogWrite).toHaveBeenCalledTimes(1);
    expect(streamer.getDeadLetterQueue().size).toBe(0);

    await streamer.shutdown();
  });

  test('retries failed events and moves to dead-letter queue', async () => {
    mockCloudWatchSend.mockRejectedValue(new Error('fail'));

    const streamer = new AuditLogStreamer({
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 1000,
      retry_attempts: 2,
      retry_delay_ms: 10,
      destinations: [
        {
          name: 'cw',
          type: 'aws_cloudwatch',
          enabled: true,
          config: { region: 'us-east-1', logGroupName: 'g', logStreamName: 's' }
        }
      ]
    });

    await streamer.recordEvent(baseEvent);
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockCloudWatchSend).toHaveBeenCalledTimes(3);
    const dead = streamer.getDeadLetterQueue();
    expect(dead.get('cw')?.length).toBe(1);

    await streamer.shutdown();
  });
});
