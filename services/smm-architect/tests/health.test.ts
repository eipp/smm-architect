import { describe, it, expect } from '@jest/globals';
import { health } from '../src/main';

describe('SMM Architect Health Endpoint', () => {
  it('returns healthy status', async () => {
    const res = await health();
    expect(res.status).toBe('healthy');
  });
});
