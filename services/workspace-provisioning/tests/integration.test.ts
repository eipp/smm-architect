import request from 'supertest';
import { WorkspaceProvisioningService, ProvisioningRequest } from '../src/provisioning-service';
import app from '../src/server';

describe('Workspace Provisioning Service Integration Tests', () => {
  let provisioningService: WorkspaceProvisioningService;
  let authToken: string;

  const testTenantId = 'test-tenant-provisioning';
  const testWorkspaceId = 'test-workspace-provisioning';
  const testUserId = 'test-user-provisioning';

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.PULUMI_WORKSPACE_DIR = '/tmp/test-pulumi-workspaces';
    
    provisioningService = new WorkspaceProvisioningService();
    
    // Mock authentication token
    authToken = 'Bearer test-token';
    
    // Mock authentication service to accept test token
    jest.mock('../../shared/auth-service', () => ({
      AuthenticationService: jest.fn().mockImplementation(() => ({
        validateToken: jest.fn().mockResolvedValue({
          valid: true,
          payload: {
            userId: testUserId,
            tenantId: testTenantId,
            roles: ['workspace-manager']
          }
        })
      }))
    }));
  });

  afterAll(async () => {
    // Cleanup test workspaces
    try {
      await provisioningService.destroyWorkspace(testWorkspaceId, 'development');
    } catch (error) {
      console.warn('Failed to cleanup test workspace:', error);
    }
  });

  describe('Workspace Provisioning API', () => {
    test('should validate required fields for provisioning request', async () => {
      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should validate environment values', async () => {
      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'invalid-env',
          region: 'us-east-1',
          resourceTier: 'small'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid environment');
    });

    test('should validate resource tier values', async () => {
      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'invalid-tier'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid resourceTier');
    });

    test('should validate workspace ID format', async () => {
      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: 'invalid workspace id!',
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'small'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid workspaceId format');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/workspaces/provision')
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'small'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('authorization header');
    });

    // Note: Actual provisioning test would require AWS credentials and is resource-intensive
    test('should accept valid provisioning request (mocked)', async () => {
      // Mock the provisioning service to avoid actual AWS calls
      jest.spyOn(provisioningService, 'provisionWorkspace').mockResolvedValue({
        workspaceId: testWorkspaceId,
        stackName: `${testWorkspaceId}-development`,
        status: 'succeeded',
        outputs: {
          vpcId: 'vpc-123456',
          eksClusterName: 'test-cluster',
          contentBucketName: 'test-bucket'
        },
        resourceCount: 15,
        duration: 120000,
        cost: {
          hourly: 0.15,
          daily: 3.60,
          monthly: 108.00
        },
        createdAt: new Date(),
        completedAt: new Date()
      });

      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'small',
          features: {
            enableHighAvailability: false,
            enableAutoScaling: true,
            enableDataEncryption: true,
            enableAuditLogging: true,
            enableMonitoring: true,
            enableBackup: false
          },
          networking: {
            vpcCidr: '10.0.0.0/16',
            enablePrivateSubnets: false,
            enableNatGateway: false
          },
          security: {
            allowedCidrs: ['0.0.0.0/0'],
            enableVault: true,
            enableOPA: false
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('succeeded');
      expect(response.body.workspaceId).toBe(testWorkspaceId);
      expect(response.body.outputs).toBeDefined();
      expect(response.body.cost).toBeDefined();
    });
  });

  describe('Workspace Status API', () => {
    test('should require environment parameter for status check', async () => {
      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/status`)
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing environment query parameter');
    });

    test('should return 404 for non-existent workspace', async () => {
      jest.spyOn(provisioningService, 'getWorkspaceStatus').mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/workspaces/non-existent/status`)
        .set('Authorization', authToken)
        .query({ environment: 'development' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Workspace not found');
    });

    test('should return workspace status when it exists', async () => {
      jest.spyOn(provisioningService, 'getWorkspaceStatus').mockResolvedValue({
        workspaceId: testWorkspaceId,
        stackName: `${testWorkspaceId}-development`,
        status: 'active',
        lastUpdate: new Date(),
        resources: [
          { type: 'aws:ec2/vpc:Vpc', name: 'test-vpc', status: 'active', urn: 'urn:pulumi:test::test::aws:ec2/vpc:Vpc::test-vpc' }
        ],
        outputs: {
          vpcId: 'vpc-123456',
          eksClusterName: 'test-cluster'
        },
        tags: {
          Environment: 'development',
          WorkspaceId: testWorkspaceId
        }
      });

      const response = await request(app)
        .get(`/api/workspaces/${testWorkspaceId}/status`)
        .set('Authorization', authToken)
        .query({ environment: 'development' });

      expect(response.status).toBe(200);
      expect(response.body.workspaceId).toBe(testWorkspaceId);
      expect(response.body.status).toBe('active');
      expect(response.body.resources).toHaveLength(1);
      expect(response.body.outputs.vpcId).toBe('vpc-123456');
    });
  });

  describe('Workspace Update API', () => {
    test('should validate update request similar to provisioning', async () => {
      const response = await request(app)
        .put(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', authToken)
        .send({
          // Missing required fields
          workspaceId: testWorkspaceId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should accept valid update request (mocked)', async () => {
      jest.spyOn(provisioningService, 'updateWorkspace').mockResolvedValue({
        workspaceId: testWorkspaceId,
        stackName: `${testWorkspaceId}-development`,
        status: 'succeeded',
        outputs: {
          vpcId: 'vpc-123456',
          eksClusterName: 'test-cluster-updated'
        },
        resourceCount: 18,
        duration: 90000,
        createdAt: new Date(),
        completedAt: new Date()
      });

      const response = await request(app)
        .put(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'medium', // Upgraded from small
          features: {
            enableHighAvailability: true, // Enabled HA
            enableAutoScaling: true,
            enableDataEncryption: true,
            enableAuditLogging: true,
            enableMonitoring: true,
            enableBackup: true
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('succeeded');
      expect(response.body.resourceCount).toBe(18);
    });
  });

  describe('Workspace Deletion API', () => {
    test('should require environment parameter', async () => {
      const response = await request(app)
        .delete(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing environment query parameter');
    });

    test('should accept valid deletion request (mocked)', async () => {
      jest.spyOn(provisioningService, 'destroyWorkspace').mockResolvedValue({
        workspaceId: testWorkspaceId,
        stackName: `${testWorkspaceId}-development`,
        status: 'succeeded',
        duration: 45000,
        createdAt: new Date(),
        completedAt: new Date()
      });

      const response = await request(app)
        .delete(`/api/workspaces/${testWorkspaceId}`)
        .set('Authorization', authToken)
        .query({ environment: 'development' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('succeeded');
      expect(response.body.workspaceId).toBe(testWorkspaceId);
    });
  });

  describe('Workspace Listing API', () => {
    test('should list workspaces for tenant', async () => {
      jest.spyOn(provisioningService, 'listWorkspaces').mockResolvedValue([
        {
          workspaceId: testWorkspaceId,
          stackName: `${testWorkspaceId}-development`,
          status: 'active',
          lastUpdate: new Date(),
          resources: [],
          outputs: {},
          tags: {}
        }
      ]);

      const response = await request(app)
        .get(`/api/tenants/${testTenantId}/workspaces`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.tenantId).toBe(testTenantId);
      expect(response.body.workspaces).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });
  });

  describe('Preview Changes API', () => {
    test('should preview workspace changes', async () => {
      jest.spyOn(provisioningService, 'previewWorkspaceChanges').mockResolvedValue({
        changes: [
          { type: 'update', resource: 'eks-cluster', details: { nodeCount: '3 -> 5' } },
          { type: 'create', resource: 'nat-gateway', details: { enabled: true } }
        ],
        summary: '2 changes planned'
      });

      const response = await request(app)
        .post(`/api/workspaces/${testWorkspaceId}/preview`)
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'medium',
          networking: {
            enableNatGateway: true // New feature
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.changes).toHaveLength(2);
      expect(response.body.summary).toBe('2 changes planned');
    });
  });

  describe('Error Handling', () => {
    test('should handle provisioning service errors gracefully', async () => {
      jest.spyOn(provisioningService, 'provisionWorkspace').mockRejectedValue(
        new Error('AWS credentials not found')
      );

      const response = await request(app)
        .post('/api/workspaces/provision')
        .set('Authorization', authToken)
        .send({
          workspaceId: testWorkspaceId,
          tenantId: testTenantId,
          environment: 'development',
          region: 'us-east-1',
          resourceTier: 'small'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Provisioning failed');
      expect(response.body.details).toContain('AWS credentials not found');
    });

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(12).fill(null).map(() =>
        request(app)
          .post('/api/workspaces/provision')
          .set('Authorization', authToken)
          .send({
            workspaceId: `${testWorkspaceId}-rate-limit`,
            tenantId: testTenantId,
            environment: 'development',
            region: 'us-east-1',
            resourceTier: 'small'
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('workspace-provisioning');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});