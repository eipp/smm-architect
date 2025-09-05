import { describe, it, expect, jest } from '@jest/globals';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'zlib';

import { TTLArchivalJob, TTLArchivalConfig } from '../src/jobs/ttl-archival-job';
import { DatabaseClient } from '../src/shared/database/client';

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn().mockResolvedValue({});
  const S3Client = jest.fn(() => ({ send: mockSend }));
  const PutObjectCommand = jest.fn((params) => params);
  return { S3Client, PutObjectCommand, __mockSend: mockSend };
});

// Helper to access private method
function callArchiveToS3(job: TTLArchivalJob, id: string, data: any): Promise<string> {
  return (job as any).archiveToS3(id, data);
}

describe('TTLArchivalJob.archiveToS3', () => {
  const config: TTLArchivalConfig = {
    dryRun: true,
    batchSize: 1,
    maxConcurrency: 1,
    archiveToS3: true,
    s3Bucket: 'test-bucket',
    retentionDays: 1
  };

  it('uploads compressed data to S3 and returns URL', async () => {
    const job = new TTLArchivalJob({} as DatabaseClient, config);
    const data = { hello: 'world' };

    const url = await callArchiveToS3(job, 'ws-123', data);

    const clientInstance = (S3Client as jest.Mock).mock.results[0].value;
    expect(clientInstance.send).toHaveBeenCalledTimes(1);
    const command = clientInstance.send.mock.calls[0][0] as PutObjectCommand;
    expect(command.Bucket).toBe('test-bucket');
    expect(command.Key).toMatch(/archived-workspaces\/ws-123\/\d+\.json\.gz/);

    const decompressed = JSON.parse(gunzipSync(command.Body as Buffer).toString('utf8'));
    expect(decompressed).toEqual(data);
    expect(url).toMatch(/^https:\/\/test-bucket\.s3\.amazonaws\.com\//);
  });

  it('throws an error when upload fails', async () => {
    const job = new TTLArchivalJob({} as DatabaseClient, config);
    const { __mockSend } = jest.requireMock('@aws-sdk/client-s3') as { __mockSend: jest.Mock };
    __mockSend.mockRejectedValueOnce(new Error('fail'));

    await expect(callArchiveToS3(job, 'ws-123', {})).rejects.toThrow('fail');
  });
});
