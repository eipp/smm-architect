import { describe, it, expect } from '@jest/globals';
import { health } from '../src/main';

describe('Health endpoint', () => {
  it('returns healthy status', async () => {
    const res = await health({});
    expect(res).toMatchObject({
      status: 'healthy',
      service: 'smm-architect'
    });
    expect(typeof res.timestamp).toBe('string');
  });
});
