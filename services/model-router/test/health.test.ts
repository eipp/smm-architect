import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import { app } from '../src/index';

describe('Model Router Health Endpoint', () => {
  it('returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
