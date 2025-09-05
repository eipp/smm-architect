import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { AuditLogStreamer, SIEMConfig } from '../../services/shared/security/audit-log-streamer';

// Mock AWS CloudWatch Logs SDK
const mockCloudWatchSend = jest.fn().mockResolvedValue({ nextSequenceToken: 'token' });
class PutLogEventsCommand {
  input: any;
  constructor(input: any) {
    this.input = input;
  }
}
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn(() => ({ send: mockCloudWatchSend })),
  PutLogEventsCommand
}));

// Mock Google Cloud Logging SDK
const mockGcpWrite = jest.fn().mockResolvedValue(undefined);
const mockEntry = jest.fn((meta: any, data: any) => ({ meta, data }));
const mockLog = jest.fn(() => ({ write: mockGcpWrite, entry: mockEntry }));
jest.mock('@google-cloud/logging', () => ({
  Logging: jest.fn(() => ({ log: mockLog }))
}));

// Mock internal logger used by audit log streamer
jest.mock('../../services/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}), { virtual: true });

afterEach(() => {
  jest.clearAllMocks();
});

describe('AuditLogStreamer cloud providers', () => {
  it('sends events to AWS CloudWatch when enabled', async () => {
    const config: SIEMConfig = {
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 1000,
      retry_attempts: 0,
      retry_delay_ms: 0,
      destinations: [
        {
          name: 'cw',
          type: 'aws_cloudwatch',
          enabled: true,
          config: {
            region: 'us-east-1',
            logGroupName: 'group',
            logStreamName: 'stream'
          }
        }
      ]
    };

    const streamer = new AuditLogStreamer(config);
    await streamer.recordEvent({
      event_type: 'test',
      action: 'do',
      outcome: 'success',
      target: { resource_type: 'unit' },
      details: {},
      actor: {},
      source: 'test-service'
    });
    await streamer.shutdown();

    expect(mockCloudWatchSend).toHaveBeenCalled();
    const callArg = mockCloudWatchSend.mock.calls[0][0] as any;
    expect(callArg.input.logEvents).toHaveLength(1);
  });

  it('sends events to GCP Logging when enabled', async () => {
    const config: SIEMConfig = {
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 1000,
      retry_attempts: 0,
      retry_delay_ms: 0,
      destinations: [
        {
          name: 'gcp',
          type: 'gcp_logging',
          enabled: true,
          config: {
            projectId: 'test',
            logName: 'audit'
          }
        }
      ]
    };

    const streamer = new AuditLogStreamer(config);
    await streamer.recordEvent({
      event_type: 'test',
      action: 'do',
      outcome: 'success',
      target: { resource_type: 'unit' },
      details: {},
      actor: {},
      source: 'test-service'
    });
    await streamer.shutdown();

    expect(mockLog).toHaveBeenCalledWith('audit');
    expect(mockGcpWrite).toHaveBeenCalled();
  });
});
