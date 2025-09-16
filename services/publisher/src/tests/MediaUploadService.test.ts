import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';

const screenshotsMock = jest.fn(function (opts: any) {
  fs.writeFileSync(path.join(opts.folder, opts.filename), Buffer.from('thumb'));
  this._events?.end?.();
  return this;
});

const ffmpegMock: any = function () {
  return {
    _events: {} as Record<string, any>,
    on(event: string, handler: any) {
      this._events[event] = handler;
      return this;
    },
    screenshots: screenshotsMock,
  };
};
ffmpegMock.ffprobe = jest.fn((p: string, cb: any) => cb(null, {
  format: { duration: 2, format_name: 'mp4' },
  streams: [{ width: 160, height: 120 }],
}));
ffmpegMock.setFfmpegPath = jest.fn();
ffmpegMock.setFfprobePath = jest.fn();

jest.mock('fluent-ffmpeg', () => ffmpegMock);
jest.mock('ffmpeg-static', () => '/usr/bin/ffmpeg');
jest.mock('ffprobe-static', () => ({ path: '/usr/bin/ffprobe' }));

import { MediaUploadService } from '../services/MediaUploadService';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn(() => ({ send })),
    PutObjectCommand: jest.fn((args) => ({ input: args })),
    GetObjectCommand: jest.fn((args) => ({ input: args })),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockImplementation((_, command) =>
    Promise.resolve(`https://signed.example.com/${command.input.Key}`)
  ),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-file-id') }));

describe('MediaUploadService video processing', () => {
  let service: MediaUploadService;

  beforeEach(() => {
    process.env.CDN_DOMAIN = 'cdn.example.com';
    jest.clearAllMocks();
    service = new MediaUploadService();
  });

  test('extracts metadata and uploads thumbnail', async () => {
    const uploadThumbnailSpy = jest
      .spyOn<any, any>(service, 'uploadThumbnail')
      .mockResolvedValue('https://cdn.example.com/workspaces/ws1/thumbnails/test-file-id.jpg');

    const buffer = Buffer.from('video');
    const file: any = {
      fieldname: 'files',
      originalname: 'video.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
    };

    const result = await (service as any).uploadSingleFile(file, {
      workspaceId: 'ws1',
      uploadedBy: 'user1',
    });

    expect(result.metadata.duration).toBe(2);
    expect(result.metadata.format).toBe('mp4');
    expect(result.metadata.resolution).toBe('160x120');
    expect(result.thumbnailUrl).toBe('https://cdn.example.com/workspaces/ws1/thumbnails/test-file-id.jpg');
    expect(uploadThumbnailSpy).toHaveBeenCalled();
  });
});
