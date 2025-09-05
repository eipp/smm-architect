import request from 'supertest';
import app from '../server';

describe('Publisher service health', () => {
  it('responds with status information', async () => {
    const res = await request(app).get('/health');
    expect([200,503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
  });
});
