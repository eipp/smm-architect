import request from 'supertest';
import express from 'express';
import { newDb } from 'pg-mem';
import axios from 'axios';

// In-memory Postgres using pg-mem
const db = newDb();
const pg = db.adapters.createPg();

jest.mock('pg', () => pg);
jest.mock('axios');

// Mock auth middleware to inject user
jest.mock('../middleware/auth', () => ({
  requireScopes: () => (req: any, _res: any, next: any) => {
    req.user = { userId: 'user-1', workspaceId: 'ws1', scopes: ['admin'] };
    next();
  }
}));

import { publisherRoutes } from '../routes';

beforeAll(() => {
  db.public.none(`
    CREATE TABLE connectors (
      connector_id text PRIMARY KEY,
      workspace_id text,
      platform text,
      credentials_ref text,
      account_id text,
      display_name text,
      status text,
      last_connected_at timestamp
    );
    CREATE TABLE scheduled_posts (
      id text PRIMARY KEY,
      workspace_id text,
      content jsonb,
      platforms jsonb,
      scheduled_at timestamp,
      timezone text,
      status text,
      recurring jsonb,
      created_at timestamp,
      created_by text,
      attempts int,
      last_attempt timestamp,
      error text
    );
    CREATE TABLE publish_results (
      id text PRIMARY KEY,
      workspace_id text,
      status text,
      platforms jsonb,
      created_at timestamp,
      published_at timestamp,
      scheduled_at timestamp,
      error text
    );
  `);
});

beforeEach(() => {
  db.public.none('DELETE FROM scheduled_posts; DELETE FROM publish_results;');
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/publish', publisherRoutes);
  return app;
}

test('GET /api/publish/status/:id returns publish status with engagement', async () => {
  db.public.none(`
    INSERT INTO publish_results (id, workspace_id, status, platforms, created_at, published_at)
    VALUES ('pub-1', 'ws1', 'completed', '[{"platform":"twitter","postId":"123","url":"https://api.example.com"}]', NOW(), NOW());
  `);
  (axios.get as jest.Mock).mockResolvedValue({ data: { engagement: { likes: 1, comments: 2, shares: 3 } } });

  const res = await request(createApp()).get('/api/publish/status/pub-1');
  expect(res.status).toBe(200);
  expect(res.body.data.platforms[0].engagement.likes).toBe(1);
});

test('GET /api/publish/scheduled returns posts from database', async () => {
  db.public.none(`
    INSERT INTO scheduled_posts (id, workspace_id, content, platforms, scheduled_at, timezone, status, created_at, created_by, attempts)
    VALUES ('sched-1', 'ws1', '{"text":"hello"}', '["twitter"]', NOW(), 'UTC', 'pending', NOW(), 'user-1', 0);
  `);

  const res = await request(createApp())
    .get('/api/publish/scheduled')
    .query({ workspaceId: 'ws1', limit: 10, offset: 0 });
  expect(res.status).toBe(200);
  expect(res.body.data.posts[0].id).toBe('sched-1');
});
