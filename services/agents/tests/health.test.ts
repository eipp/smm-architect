import request from 'supertest';
import app from '../src/server';

describe('Agents service health', () => {
  it('returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'healthy',
      service: 'agents'
    });
  });
});
