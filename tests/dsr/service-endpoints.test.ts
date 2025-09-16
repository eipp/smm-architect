import express from 'express';
import request from 'supertest';
import { dsrRoutes } from '../../services/toolhub/src/routes/dsr';
import {
  accessUserData,
  deleteUserData,
  exportUserData
} from '../../services/smm-architect/src/dsr-api';

const toolhubApp = express();
toolhubApp.use('/api/dsr', dsrRoutes);

describe('User data DSR endpoints', () => {
  const sample = { userId: 'user-1', tenantId: 'tenant-1' };

  it('smm-architect access endpoint returns data', async () => {
    const result = await accessUserData(sample);
    expect(result).toHaveProperty('data');
  });

  it('smm-architect deletion endpoint returns status', async () => {
    const result = await deleteUserData(sample);
    expect(result).toMatchObject({ status: 'deleted', userId: sample.userId });
  });

  it('smm-architect export endpoint returns URL', async () => {
    const result = await exportUserData(sample);
    expect(result).toHaveProperty('exportUrl');
  });

  it('toolhub access endpoint responds with user data', async () => {
    const res = await request(toolhubApp).get(`/api/dsr/${sample.userId}/access`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId', sample.userId);
  });

  it('toolhub deletion endpoint responds with status', async () => {
    const res = await request(toolhubApp).delete(`/api/dsr/${sample.userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'deleted');
  });

  it('toolhub export endpoint responds with URL', async () => {
    const res = await request(toolhubApp).get(`/api/dsr/${sample.userId}/export`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exportUrl');
  });
});
