import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock logger to avoid module resolution issues
jest.mock('../../services/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}), { virtual: true });

import { AuditLogStreamer, AuditEvent, SIEMDestination } from '../../services/shared/security/audit-log-streamer';

const baseConfig = {
  enabled: true,
  buffer_size: 100,
  flush_interval_ms: 60000,
  retry_attempts: 3,
  retry_delay_ms: 100,
  destinations: []
};

const sampleEvent: AuditEvent = {
  event_id: 'e1',
  timestamp: new Date().toISOString(),
  event_type: 'test',
  severity: 'low',
  source: 'jest',
  actor: {},
  target: { resource_type: 'x' },
  action: 'act',
  outcome: 'success',
  details: {},
  metadata: { service: 'svc', version: '1', environment: 'test' }
};

describe('AuditLogStreamer retry logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('retries with exponential backoff and re-queues on success', async () => {
    const streamer = new AuditLogStreamer(baseConfig as any);
    const destination: SIEMDestination = { name: 'test', type: 'webhook', enabled: true, config: {} };

    const sendMock = jest
      .spyOn(streamer as any, 'sendToDestination')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    const promise = (streamer as any).retryFailedEvents([sampleEvent], destination);

    expect(sendMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(baseConfig.retry_delay_ms);
    await promise;

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect((streamer as any).eventBuffer).toHaveLength(1);
  });

  it('emits failure after exhausting retries', async () => {
    const streamer = new AuditLogStreamer(baseConfig as any);
    const destination: SIEMDestination = { name: 'test', type: 'webhook', enabled: true, config: {} };

    const sendMock = jest
      .spyOn(streamer as any, 'sendToDestination')
      .mockRejectedValue(new Error('fail'));

    const failureListener = jest.fn();
    streamer.on('delivery_failed', failureListener);

    const promise = (streamer as any).retryFailedEvents([sampleEvent], destination);

    expect(sendMock).toHaveBeenCalledTimes(1);
    for (let i = 0; i < baseConfig.retry_attempts - 1; i++) {
      await jest.advanceTimersByTimeAsync(baseConfig.retry_delay_ms * Math.pow(2, i));
    }
    await promise;

    expect(sendMock).toHaveBeenCalledTimes(baseConfig.retry_attempts);
    expect(failureListener).toHaveBeenCalledTimes(1);
  });
});
