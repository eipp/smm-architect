import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import app from '../src/server';

describe('Agents Service Health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
