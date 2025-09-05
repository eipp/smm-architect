/**
 * End-to-end tests for DSR API endpoints
 */

import http from 'http';
import { createHash } from 'crypto';

jest.mock('../../services/shared/middleware/auth-middleware', () => ({
  authMiddleware: () => (_req: any, _res: any, next: any) => next(),
  requirePermissions: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../services/shared/database/client', () => ({
  withTenantContext: async (_tenantId: string, fn: any) => fn({}),
  withRetryTransaction: async (fn: any) => fn(),
}));

jest.mock('../../services/shared/vault-client', () => ({
  VaultClient: jest.fn().mockImplementation(() => ({ })),
}));

jest.mock('../../services/dsr/src/data-subject-rights-service', () => {
  const mockExportData = {
    exportId: 'export_123',
    userId: 'user',
    tenantId: 'tenant',
    generatedAt: new Date().toISOString(),
    dataCategories: {},
    metadata: { totalRecords: 0, exportSize: 0, integrityHash: 'hash' },
  };
  return {
    DataSubjectRightsService: jest.fn().mockImplementation(() => ({
      generateDataExport: jest.fn().mockResolvedValue(mockExportData),
      processErasureRequest: jest.fn().mockResolvedValue({
        requestId: 'delete_123',
        userId: 'user',
        tenantId: 'tenant',
        deletionScope: 'user',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        subsystemResults: [],
        verificationResults: [],
        integrityHash: '',
        signedReport: '',
        auditTrail: [],
      }),
    })),
  };
});

import app from '../../services/dsr/src/dsr-api';

describe('DSR API Endpoints', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'string' ? 80 : addr!.port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('handles export requests', async () => {
    const res = await fetch(`${baseUrl}/api/dsr/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({
        userId: 'user',
        tenantId: 'tenant',
        userEmail: 'user@example.com',
        requestedBy: 'admin',
      }),
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.requestId).toBeDefined();

    await new Promise((r) => setTimeout(r, 10));
    const statusRes = await fetch(`${baseUrl}/api/dsr/status/${data.requestId}`, {
      headers: { Authorization: 'Bearer test' },
    });
    const status = await statusRes.json();
    expect(status.status).toBe('completed');
  });

  it('handles deletion requests', async () => {
    const token = createHash('sha256').update(`user:dev-secret`).digest('hex');
    const res = await fetch(`${baseUrl}/api/dsr/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({
        userId: 'user',
        tenantId: 'tenant',
        userEmail: 'user@example.com',
        requestedBy: 'admin',
        verificationToken: token,
        reason: 'User request',
      }),
    });
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.requestId).toBeDefined();

    await new Promise((r) => setTimeout(r, 10));
    const statusRes = await fetch(`${baseUrl}/api/dsr/status/${data.requestId}`, {
      headers: { Authorization: 'Bearer test' },
    });
    const status = await statusRes.json();
    expect(status.status).toBe('completed');
  });

  it('streams portability package', async () => {
    const res = await fetch(`${baseUrl}/api/dsr/portability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify({
        userId: 'user',
        tenantId: 'tenant',
        userEmail: 'user@example.com',
        requestedBy: 'admin',
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
  });
});
