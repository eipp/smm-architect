import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('logger file rotation', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'logs-'));
    process.env.LOG_DIRECTORY = tempDir;
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.LOG_DIRECTORY;
  });

  it('writes logs to a rotating file', async () => {
    jest.isolateModules(() => {
      const { logger } = require('../../packages/shared/src/utils/logger');
      logger.info('rotation test');
      logger.close();
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    const files = readdirSync(tempDir);
    expect(files.some(f => f.endsWith('.log'))).toBe(true);
  });
});
