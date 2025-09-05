import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
jest.mock('sharp', () => {
  return () => ({
    metadata: jest.fn().mockResolvedValue({}),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from([])),
  });
});

import { MediaUploadService } from './MediaUploadService';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

describe('MediaUploadService video processing', () => {
  const createTestVideo = async (): Promise<Buffer> => {
    const videoPath = path.join(os.tmpdir(), `test-video-${Date.now()}.mp4`);
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input('color=c=blue:s=16x16:d=1')
        .inputFormat('lavfi')
        .save(videoPath)
        .on('end', resolve)
        .on('error', reject);
    });
    const data = await fs.readFile(videoPath);
    await fs.unlink(videoPath).catch(() => undefined);
    return data;
  };

  it('extracts video metadata and uploads thumbnail', async () => {
    const service = new MediaUploadService();
    (service as any).s3Client = { send: jest.fn().mockResolvedValue({}) };
    jest.spyOn(service as any, 'getSignedUrl').mockResolvedValue('https://example.com/temp.jpg');

    const buffer = await createTestVideo();
    const file: Express.Multer.File = {
      fieldname: 'files',
      originalname: 'video.mp4',
      encoding: '7bit',
      mimetype: 'video/mp4',
      size: buffer.length,
      buffer,
      stream: undefined as any,
      destination: '',
      filename: '',
      path: '',
    };

    const [result] = await service.uploadFiles([file], { workspaceId: 'ws', uploadedBy: 'user' });

    expect(result.metadata.duration).toBeGreaterThan(0);
    expect(result.metadata.format).toContain('mp4');
    expect(result.metadata.width).toBeGreaterThan(0);
    expect(result.metadata.height).toBeGreaterThan(0);
    expect(result.thumbnailUrl).toBeTruthy();
    expect((service as any).s3Client.send).toHaveBeenCalled();
  });
});
