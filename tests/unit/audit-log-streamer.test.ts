import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const cloudwatchSendMock = jest.fn().mockResolvedValue({});
const putLogEventsMock = jest.fn();
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn(() => ({ send: cloudwatchSendMock })),
  PutLogEventsCommand: putLogEventsMock
}));

const writeMock = jest.fn().mockResolvedValue([]);
const logMock = jest.fn(() => ({
  entry: jest.fn((metadata: any, data: any) => ({ metadata, data })),
  write: writeMock
}));
jest.mock('@google-cloud/logging', () => ({
  Logging: jest.fn(() => ({ log: logMock }))
}));

jest.mock('../../services/shared/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}), { virtual: true });

import { AuditLogStreamer } from '../../services/shared/security/audit-log-streamer';

describe('AuditLogStreamer cloud integrations', () => {
  beforeEach(() => {
    cloudwatchSendMock.mockClear();
    putLogEventsMock.mockClear();
    writeMock.mockClear();
    logMock.mockClear();
  });

  afterEach(async () => {
    jest.useRealTimers();
  });

  it('delivers events to AWS CloudWatch Logs when enabled', async () => {
    const streamer = new AuditLogStreamer({
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 60000,
      retry_attempts: 0,
      retry_delay_ms: 1000,
      destinations: [
        {
          name: 'cw',
          type: 'aws_cloudwatch',
          enabled: true,
          config: {
            region: 'us-east-1',
            logGroupName: 'test-group',
            logStreamName: 'test-stream',
            accessKeyId: 'AKIA',
            secretAccessKey: 'SECRET'
          }
        }
      ]
    });

    await streamer.recordEvent({ event_type: 'test', action: 'test', target: { resource_type: 'r' }, details: {} });
    await streamer.shutdown();

    expect(putLogEventsMock).toHaveBeenCalled();
    expect(cloudwatchSendMock).toHaveBeenCalled();
  });

  it('delivers events to GCP Cloud Logging when enabled', async () => {
    const streamer = new AuditLogStreamer({
      enabled: true,
      buffer_size: 1,
      flush_interval_ms: 60000,
      retry_attempts: 0,
      retry_delay_ms: 1000,
      destinations: [
        {
          name: 'gcp',
          type: 'gcp_logging',
          enabled: true,
          config: {
            projectId: 'project',
            logName: 'log',
            credentials: {}
          }
        }
      ]
    });

    await streamer.recordEvent({ event_type: 'test', action: 'test', target: { resource_type: 'r' }, details: {} });
    await streamer.shutdown();

    expect(logMock).toHaveBeenCalledWith('log');
    expect(writeMock).toHaveBeenCalled();
  });
});
