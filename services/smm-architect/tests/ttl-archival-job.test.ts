import { gunzipSync } from 'zlib';

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../shared/database/client', () => ({
  DatabaseClient: jest.fn(),
}));

const sendMock = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: sendMock,
  })),
  PutObjectCommand: jest.fn((input) => ({ input })),
}));

import { TTLArchivalJob } from '../src/jobs/ttl-archival-job';

describe('archiveToS3', () => {
  it('uploads compressed payload and returns s3 path', async () => {
    const job = new TTLArchivalJob({} as any, {
      dryRun: false,
      batchSize: 1,
      maxConcurrency: 1,
      archiveToS3: true,
      s3Bucket: 'test-bucket',
      retentionDays: 1,
    });

    const data = { foo: 'bar' };
    const result = await (job as any).archiveToS3('workspace-123', data);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command.input.Bucket).toBe('test-bucket');
    expect(command.input.Key).toMatch(/^archived-workspaces\/workspace-123\/\d+\.json\.gz$/);

    const body = command.input.Body as Buffer;
    const decompressed = JSON.parse(gunzipSync(body).toString());
    expect(decompressed).toEqual(data);
    expect(result).toBe(`s3://test-bucket/${command.input.Key}`);
  });
});
