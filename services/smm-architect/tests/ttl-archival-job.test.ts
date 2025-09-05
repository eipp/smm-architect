import { describe, expect, it, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { gunzipSync } from 'zlib';

import { TTLArchivalJob, TTLArchivalConfig } from '../src/jobs/ttl-archival-job';

jest.mock('@smm-architect/shared/database/client', () => ({
  DatabaseClient: class {}
}));

describe('TTLArchivalJob S3 archival', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
  });

  it('uploads compressed data and returns the S3 URI', async () => {
    const config: TTLArchivalConfig = {
      dryRun: true,
      batchSize: 1,
      maxConcurrency: 1,
      archiveToS3: true,
      s3Bucket: 'test-bucket',
      retentionDays: 30,
    };

    const job = new TTLArchivalJob({} as any, config);
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const uri = await (job as any).archiveToS3('ws-123', { hello: 'world' });

    expect(uri).toBe('s3://test-bucket/archived-workspaces/ws-123/1700000000000.json.gz');

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls.length).toBe(1);
    const input = calls[0].args[0].input as any;
    expect(input.Bucket).toBe('test-bucket');
    expect(input.Key).toBe('archived-workspaces/ws-123/1700000000000.json.gz');

    const uploaded = gunzipSync(input.Body as Buffer).toString();
    expect(uploaded).toBe(JSON.stringify({ hello: 'world' }));

    dateSpy.mockRestore();
  });
});

