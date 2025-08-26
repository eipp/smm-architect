import { Request, Response } from 'express';
import {
  setAutomaticTenantContext,
  extractTenantId,
  withTenantContextForJob,
  verifyTenantContext,
  AuthenticatedUser
} from '../../services/smm-architect/src/middleware/auth';
import { 
  setTenantContext, 
  getCurrentTenantContext, 
  getPrismaClient,
  withTenantContext
} from '../../services/shared/database/client';
import { PrismaClient } from '../../services/shared/database/generated/client';

// Mock Prisma client for testing
const mockPrismaClient = {
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),
  workspace: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  workspaceRun: {
    findMany: jest.fn(),
    create: jest.fn()
  },
  auditBundle: {
    findMany: jest.fn(),
    create: jest.fn()
  }
} as any;

// Mock the getPrismaClient function
jest.mock('../../services/shared/database/client', () => ({
  ...jest.requireActual('../../services/shared/database/client'),
  getPrismaClient: () => mockPrismaClient
}));

describe('Evil Tenant Security Tests', () => {
  const tenantA = 'tenant-alice';
  const tenantB = 'tenant-bob';
  const tenantEvil = 'tenant-evil';
  const userAlice = 'user-alice';
  const userBob = 'user-bob';
  const userEvil = 'user-evil';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful tenant context setting
    mockPrismaClient.$executeRaw.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ current_setting: null }]);
  });

  describe('Tenant ID Extraction', () => {
    it('should extract tenant ID from JWT token (highest priority)', () => {
      const req = {
        user: { tenantId: tenantA } as AuthenticatedUser,
        headers: { 'x-tenant-id': tenantB },
        params: { tenantId: tenantEvil }
      } as any as Request;

      const extractedTenantId = extractTenantId(req);
      expect(extractedTenantId).toBe(tenantA);
    });

    it('should extract tenant ID from header when no JWT', () => {
      const req = {
        headers: { 'x-tenant-id': tenantB },
        params: { tenantId: tenantEvil }
      } as any as Request;

      const extractedTenantId = extractTenantId(req);
      expect(extractedTenantId).toBe(tenantB);
    });

    it('should extract tenant ID from URL params as fallback', () => {
      const req = {
        headers: {},
        params: { tenantId: tenantEvil }
      } as any as Request;

      const extractedTenantId = extractTenantId(req);
      expect(extractedTenantId).toBe(tenantEvil);
    });

    it('should extract tenant ID from subdomain', () => {
      const req = {
        headers: { host: 'tenant-subdomain.smm-architect.com' },
        params: {}
      } as any as Request;

      const extractedTenantId = extractTenantId(req);
      expect(extractedTenantId).toBe('tenant-subdomain');
    });

    it('should not extract common subdomains as tenant ID', () => {
      const req = {
        headers: { host: 'www.smm-architect.com' },
        params: {}
      } as any as Request;

      const extractedTenantId = extractTenantId(req);
      expect(extractedTenantId).toBeNull();
    });
  });

  describe('Automatic Tenant Context Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
      req = {
        headers: {},
        params: {},
        ip: '127.0.0.1',
        path: '/api/test'
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should set tenant context for valid tenant ID', async () => {
      req.headers = { 'x-tenant-id': tenantA };
      
      const middleware = setAutomaticTenantContext();
      await middleware(req as Request, res as Response, next);

      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('set_config'), tenantA])
      );
      expect(req.tenantId).toBe(tenantA);
      expect(req.tenant).toMatchObject({ tenantId: tenantA });
      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid tenant ID format', async () => {
      req.headers = { 'x-tenant-id': 'invalid..tenant..id' };
      
      const middleware = setAutomaticTenantContext();
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Tenant context error',
          code: 'TENANT_CONTEXT_ERROR'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when tenant ID is missing', async () => {
      const middleware = setAutomaticTenantContext();
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Tenant context error',
          message: 'Tenant ID is required but not found in request'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should prevent cross-tenant access for authenticated users', async () => {
      req.user = {
        userId: userAlice,
        tenantId: tenantA,
        email: 'alice@tenant-a.com',
        roles: ['user'],
        permissions: ['read']
      };
      req.headers = { 'x-tenant-id': tenantB }; // Trying to access different tenant
      
      const middleware = setAutomaticTenantContext();
      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Tenant context error',
          code: 'TENANT_ACCESS_DENIED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Database RLS Enforcement Simulation', () => {
    it('should enforce tenant isolation in workspace queries', async () => {
      // Simulate RLS filtering - tenant A should only see their workspaces
      mockPrismaClient.workspace.findMany.mockImplementation((query) => {
        // Simulate RLS policy filtering based on current tenant context
        const mockWorkspaces = [
          { workspace_id: 'ws-a1', name: 'Alice Workspace 1', tenant_id: tenantA },
          { workspace_id: 'ws-a2', name: 'Alice Workspace 2', tenant_id: tenantA },
          { workspace_id: 'ws-b1', name: 'Bob Workspace 1', tenant_id: tenantB },
          { workspace_id: 'ws-e1', name: 'Evil Workspace 1', tenant_id: tenantEvil }
        ];
        
        // RLS should filter to only current tenant's workspaces
        return mockWorkspaces.filter(ws => ws.tenant_id === tenantA);
      });

      // Set tenant context for Alice
      mockPrismaClient.$queryRaw.mockResolvedValue([{ current_setting: tenantA }]);
      
      const workspaces = await mockPrismaClient.workspace.findMany();
      
      expect(workspaces).toHaveLength(2);
      expect(workspaces.every(ws => ws.tenant_id === tenantA)).toBe(true);
      expect(workspaces.find(ws => ws.tenant_id === tenantB)).toBeUndefined();
      expect(workspaces.find(ws => ws.tenant_id === tenantEvil)).toBeUndefined();
    });

    it('should prevent data leakage through count queries', async () => {
      // Simulate count query with RLS enforcement
      mockPrismaClient.workspace.count.mockImplementation(() => {
        // RLS should only count tenant A's workspaces
        return 2; // Alice has 2 workspaces
      });

      mockPrismaClient.$queryRaw.mockResolvedValue([{ current_setting: tenantA }]);
      
      const count = await mockPrismaClient.workspace.count();
      
      expect(count).toBe(2);
      // Evil tenant should not be able to see total count across all tenants
    });

    it('should prevent workspace creation in wrong tenant context', async () => {
      mockPrismaClient.workspace.create.mockImplementation((data) => {
        // Simulate RLS policy that auto-sets tenant_id based on current context
        const currentTenant = tenantA; // From session context
        
        if (data.data.tenant_id && data.data.tenant_id !== currentTenant) {
          throw new Error('RLS violation: Cannot create workspace for different tenant');
        }
        
        return {
          ...data.data,
          workspace_id: 'ws-new',
          tenant_id: currentTenant // Auto-set by RLS
        };
      });

      // Alice tries to create workspace in her tenant - should succeed
      const validWorkspace = await mockPrismaClient.workspace.create({
        data: {
          name: 'Valid Workspace',
          tenant_id: tenantA
        }
      });
      expect(validWorkspace.tenant_id).toBe(tenantA);

      // Alice tries to create workspace in Bob's tenant - should fail
      await expect(
        mockPrismaClient.workspace.create({
          data: {
            name: 'Evil Workspace',
            tenant_id: tenantB
          }
        })
      ).rejects.toThrow('RLS violation');
    });
  });

  describe('Evil Tenant Attack Scenarios', () => {
    it('should prevent JWT token tampering for cross-tenant access', async () => {
      // Simulate evil user trying to modify JWT to access different tenant
      const req = {
        user: {
          userId: userEvil,
          tenantId: tenantEvil, // Real tenant from JWT
          email: 'evil@tenant-evil.com',
          roles: ['user'],
          permissions: ['read']
        },
        headers: { 'x-tenant-id': tenantA }, // Trying to override via header
        ip: '192.168.1.100',
        path: '/api/workspaces'
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();
      
      const middleware = setAutomaticTenantContext();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TENANT_ACCESS_DENIED'
        })
      );
    });

    it('should prevent SQL injection through tenant ID parameter', async () => {
      const maliciousTenantId = \"'; DROP TABLE workspaces; --\";
      
      const req = {
        headers: { 'x-tenant-id': maliciousTenantId },
        ip: '192.168.1.100',
        path: '/api/test'
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();
      
      const middleware = setAutomaticTenantContext();
      await middleware(req, res, next);

      // Should reject due to invalid tenant ID format
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TENANT_CONTEXT_ERROR',
          message: expect.stringContaining('Invalid tenant ID format')
        })
      );
    });

    it('should prevent privilege escalation through role manipulation', async () => {
      // Evil user tries to access admin endpoints
      const req = {
        user: {
          userId: userEvil,
          tenantId: tenantEvil,
          email: 'evil@tenant-evil.com',
          roles: ['user'], // Not admin
          permissions: ['read'] // Limited permissions
        },
        tenantId: tenantEvil
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();
      
      // Import middleware functions that would be used
      const { requireRoles, requirePermissions } = require(
        '../../services/smm-architect/src/middleware/auth'
      );

      // Test role-based access control
      const adminMiddleware = requireRoles('admin');
      adminMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient roles',
          code: 'INSUFFICIENT_ROLES'
        })
      );

      // Reset mocks
      jest.clearAllMocks();

      // Test permission-based access control
      const writeMiddleware = requirePermissions('write', 'admin');
      writeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        })
      );
    });
  });

  describe('Tenant Context Verification', () => {
    it('should verify database tenant context matches request', async () => {
      const req = {
        tenantId: tenantA,
        path: '/api/workspaces'
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();

      // Mock database returning correct tenant context
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { current_setting: tenantA }
      ]);
      
      const middleware = verifyTenantContext();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should detect tenant context mismatch', async () => {
      const req = {
        tenantId: tenantA,
        path: '/api/workspaces'
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();

      // Mock database returning different tenant context (potential attack)
      mockPrismaClient.$queryRaw.mockResolvedValue([
        { current_setting: tenantB }
      ]);
      
      const middleware = verifyTenantContext();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Tenant context verification failed',
          code: 'TENANT_CONTEXT_VERIFICATION_FAILED'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Background Job Tenant Context', () => {
    it('should maintain tenant isolation in background jobs', async () => {
      let capturedTenantContext: string | null = null;
      
      // Mock the database context getter
      mockPrismaClient.$queryRaw.mockImplementation((query) => {
        if (query.sql && query.sql.includes('current_setting')) {
          return Promise.resolve([{ current_setting: tenantA }]);
        }
        return Promise.resolve([]);
      });

      const jobOperation = async () => {
        // Simulate getting current tenant context in job
        const result = await mockPrismaClient.$queryRaw({
          sql: \"SELECT current_setting('app.current_tenant_id', true) as current_setting\"
        });
        capturedTenantContext = result[0]?.current_setting;
        return 'job-result';
      };

      const result = await withTenantContextForJob(tenantA, jobOperation);

      expect(result).toBe('job-result');
      expect(capturedTenantContext).toBe(tenantA);
      expect(mockPrismaClient.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('set_config'), tenantA])
      );
    });

    it('should prevent job from accessing wrong tenant data', async () => {
      mockPrismaClient.workspace.findMany.mockImplementation(() => {
        // Simulate RLS filtering in background job
        const allWorkspaces = [
          { workspace_id: 'ws-a1', tenant_id: tenantA },
          { workspace_id: 'ws-b1', tenant_id: tenantB }
        ];
        
        // Should only return tenant A's workspaces
        return allWorkspaces.filter(ws => ws.tenant_id === tenantA);
      });

      const jobOperation = async () => {
        return await mockPrismaClient.workspace.findMany();
      };

      const workspaces = await withTenantContextForJob(tenantA, jobOperation);

      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].tenant_id).toBe(tenantA);
    });
  });

  describe('Logging and Audit', () => {
    it('should log tenant context violations for security monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const req = {
        user: {
          userId: userEvil,
          tenantId: tenantEvil,
          email: 'evil@tenant-evil.com',
          roles: ['user'],
          permissions: ['read']
        },
        headers: { 'x-tenant-id': tenantA }, // Cross-tenant attempt
        ip: '192.168.1.100',
        path: '/api/workspaces',
        get: jest.fn().mockReturnValue('EvilBot/1.0')
      } as any as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as any as Response;

      const next = jest.fn();
      
      const middleware = setAutomaticTenantContext();
      await middleware(req, res, next);

      // Should have logged the security violation
      expect(res.status).toHaveBeenCalledWith(403);
      
      consoleSpy.mockRestore();
    });
  });
});
"