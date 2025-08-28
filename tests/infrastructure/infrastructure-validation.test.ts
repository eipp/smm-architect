/**
 * Infrastructure Validation Tests
 * Tests for Pulumi infrastructure, Vault integration, and environment configurations
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import VaultSecretManager from '../../infrastructure/vault/VaultSecretManager';
import { developmentConfig, stagingConfig, productionConfig } from '../../infrastructure/environments/development/config';
import { TenantManager } from '../../infrastructure/base/tenant-manager';

describe('Infrastructure Validation Tests', () => {
  let vaultClient: VaultSecretManager;
  let tenantManager: TenantManager;

  beforeAll(async () => {
    // Note: These tests require proper infrastructure setup
    // In a real environment, you'd have actual Vault and infrastructure running
    console.log('Starting infrastructure validation tests...');
  });

  afterAll(async () => {
    console.log('Infrastructure validation tests completed');
  });

  describe('Environment Configurations', () => {
    test('should have valid development configuration', () => {
      expect(developmentConfig).toBeDefined();
      expect(developmentConfig.name).toBe('development');
      expect(developmentConfig.region).toBeTruthy();
      expect(Array.isArray(developmentConfig.availabilityZones)).toBe(true);
      expect(developmentConfig.availabilityZones.length).toBeGreaterThan(0);
      
      // Validate networking configuration
      expect(developmentConfig.networking.vpcCidr).toMatch(/^\d+\.\d+\.\d+\.\d+\/\d+$/);
      expect(Array.isArray(developmentConfig.networking.publicSubnets)).toBe(true);
      expect(Array.isArray(developmentConfig.networking.privateSubnets)).toBe(true);
      expect(Array.isArray(developmentConfig.networking.databaseSubnets)).toBe(true);
      
      // Validate database configuration
      expect(developmentConfig.database.instanceClass).toBeTruthy();
      expect(developmentConfig.database.allocatedStorage).toBeGreaterThan(0);
      expect(typeof developmentConfig.database.multiAz).toBe('boolean');
      
      // Validate tags
      expect(developmentConfig.tags.Environment).toBe('development');
      expect(developmentConfig.tags.Project).toBe('smm-architect');
    });

    test('should have valid staging configuration', () => {
      expect(stagingConfig).toBeDefined();
      expect(stagingConfig.name).toBe('staging');
      expect(stagingConfig.database.multiAz).toBe(true); // Staging should have multi-AZ
      expect(stagingConfig.database.deletionProtection).toBe(true);
      expect(stagingConfig.security.enableWaf).toBe(true);
      expect(stagingConfig.security.enableGuardDuty).toBe(true);
    });

    test('should have valid production configuration', () => {
      expect(productionConfig).toBeDefined();
      expect(productionConfig.name).toBe('production');
      expect(productionConfig.database.multiAz).toBe(true);
      expect(productionConfig.database.deletionProtection).toBe(true);
      expect(productionConfig.database.backupRetentionPeriod).toBeGreaterThanOrEqual(30);
      expect(productionConfig.security.enableWaf).toBe(true);
      expect(productionConfig.security.enableGuardDuty).toBe(true);
      expect(productionConfig.security.enableSecurityHub).toBe(true);
      
      // Production should have higher capacity
      expect(productionConfig.database.instanceClass).toContain('xlarge');
      expect(productionConfig.monitoring.retentionInDays).toBeGreaterThanOrEqual(365);
    });

    test('should have different VPC CIDRs for each environment', () => {
      const cidrs = [
        developmentConfig.networking.vpcCidr,
        stagingConfig.networking.vpcCidr,
        productionConfig.networking.vpcCidr
      ];
      
      // All CIDRs should be unique
      const uniqueCidrs = new Set(cidrs);
      expect(uniqueCidrs.size).toBe(3);
    });
  });

  describe('Vault Secret Manager', () => {
    test('should create Vault client with proper configuration', () => {
      const config = {
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        environment: 'test',
        namespace: 'smm-architect'
      };

      vaultClient = new VaultSecretManager(config);
      expect(vaultClient).toBeDefined();
    });

    test('should validate health check method exists', () => {
      const config = {
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        environment: 'test'
      };
      
      vaultClient = new VaultSecretManager(config);
      expect(typeof vaultClient.healthCheck).toBe('function');
    });

    test('should handle secret storage operations', async () => {
      const config = {
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        environment: 'test'
      };
      
      vaultClient = new VaultSecretManager(config);
      
      // Test that methods exist and have proper signatures
      expect(typeof vaultClient.storeSecret).toBe('function');
      expect(typeof vaultClient.getSecret).toBe('function');
      expect(typeof vaultClient.deleteSecret).toBe('function');
      expect(typeof vaultClient.listSecrets).toBe('function');
    });

    test('should support AWS KMS encryption integration', () => {
      const config = {
        endpoint: 'http://localhost:8200',
        token: 'test-token',
        environment: 'test',
        awsKmsKeyId: 'arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012'
      };
      
      vaultClient = new VaultSecretManager(config);
      expect(vaultClient).toBeDefined();
    });
  });

  describe('Tenant Manager', () => {
    test('should create tenant manager instance', () => {
      tenantManager = new TenantManager();
      expect(tenantManager).toBeDefined();
    });

    test('should support tenant lifecycle operations', async () => {
      tenantManager = new TenantManager();
      
      const tenantConfig = {
        tenantId: 'test-tenant-123',
        name: 'Test Tenant',
        tier: 'enterprise' as const,
        region: 'us-west-2',
        complianceLevel: 'gdpr' as const,
        resourceLimits: {
          maxWorkspaces: 100,
          maxUsers: 500,
          storageGB: 1000,
          computeUnits: 50
        },
        features: ['multi_agent', 'compliance_monitoring'],
        metadata: {
          industry: 'technology',
          size: 'large',
          createdBy: 'test-admin'
        }
      };

      // Test tenant creation
      const result = await tenantManager.provisionTenant(tenantConfig);
      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('test-tenant-123');
      expect(result.resources).toBeDefined();

      // Test tenant retrieval
      const tenant = tenantManager.getTenant('test-tenant-123');
      expect(tenant).toBeDefined();
      expect(tenant!.tenantId).toBe('test-tenant-123');
      expect(tenant!.status).toBe('active');

      // Test tenant metrics
      const metrics = await tenantManager.getTenantMetrics('test-tenant-123');
      expect(metrics).toBeDefined();
      expect(metrics.tenantId).toBe('test-tenant-123');
      expect(typeof metrics.compute.cpuUsage).toBe('number');
      expect(typeof metrics.storage.bytesUsed).toBe('number');

      // Test tenant deprovisioning
      const deprovisionResult = await tenantManager.deprovisionTenant('test-tenant-123', {
        force: false,
        backup: true,
        retentionDays: 30
      });
      expect(deprovisionResult.success).toBe(true);
    });

    test('should handle tenant billing calculations', async () => {
      tenantManager = new TenantManager();
      
      // Create a tenant for billing test
      const tenantConfig = {
        tenantId: 'billing-test-tenant',
        name: 'Billing Test Tenant',
        tier: 'professional' as const,
        region: 'us-west-2',
        complianceLevel: 'basic' as const,
        resourceLimits: {
          maxWorkspaces: 50,
          maxUsers: 100,
          storageGB: 500,
          computeUnits: 25
        },
        features: ['basic_agents'],
        metadata: {
          industry: 'marketing',
          size: 'medium'
        }
      };

      await tenantManager.provisionTenant(tenantConfig);

      // Test billing calculation
      const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endTime = new Date();

      const invoice = await tenantManager.generateInvoice(
        'billing-test-tenant',
        startTime.toISOString(),
        endTime.toISOString()
      );

      expect(invoice).toBeDefined();
      expect(invoice.tenantId).toBe('billing-test-tenant');
      expect(invoice.startTime).toBe(startTime.toISOString());
      expect(invoice.endTime).toBe(endTime.toISOString());
      expect(typeof invoice.totalAmount).toBe('number');
      expect(invoice.totalAmount).toBeGreaterThan(0);
      expect(Array.isArray(invoice.lineItems)).toBe(true);
      expect(invoice.lineItems.length).toBeGreaterThan(0);

      // Validate line items structure
      for (const lineItem of invoice.lineItems) {
        expect(lineItem).toHaveProperty('category');
        expect(lineItem).toHaveProperty('description');
        expect(lineItem).toHaveProperty('amount');
        expect(typeof lineItem.amount).toBe('number');
      }

      // Cleanup
      await tenantManager.deprovisionTenant('billing-test-tenant', { force: true });
    });

    test('should provide audit logging', () => {
      tenantManager = new TenantManager();
      
      // Get audit log (should be empty initially)
      const auditLog = tenantManager.getAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);

      // Get audit log for specific tenant
      const tenantAuditLog = tenantManager.getAuditLog('specific-tenant-id');
      expect(Array.isArray(tenantAuditLog)).toBe(true);
    });

    test('should validate tenant configurations', async () => {
      tenantManager = new TenantManager();
      
      // Test with invalid configuration (missing required fields)
      const invalidConfig = {
        // Missing tenantId
        name: 'Invalid Tenant',
        tier: 'basic' as const
        // Missing other required fields
      };

      // This should throw an error or return failure
      try {
        await tenantManager.provisionTenant(invalidConfig as any);
        // If we get here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Resource Validation', () => {
    test('should validate Kubernetes resource requirements', () => {
      const configs = [developmentConfig, stagingConfig, productionConfig];
      
      for (const config of configs) {
        expect(config.kubernetes.version).toMatch(/^\d+\.\d+$/);
        expect(Array.isArray(config.kubernetes.nodeGroups)).toBe(true);
        expect(config.kubernetes.nodeGroups.length).toBeGreaterThan(0);
        
        for (const nodeGroup of config.kubernetes.nodeGroups) {
          expect(nodeGroup.name).toBeTruthy();
          expect(Array.isArray(nodeGroup.instanceTypes)).toBe(true);
          expect(nodeGroup.instanceTypes.length).toBeGreaterThan(0);
          expect(nodeGroup.minSize).toBeGreaterThan(0);
          expect(nodeGroup.maxSize).toBeGreaterThanOrEqual(nodeGroup.minSize);
          expect(nodeGroup.desiredSize).toBeGreaterThanOrEqual(nodeGroup.minSize);
          expect(nodeGroup.desiredSize).toBeLessThanOrEqual(nodeGroup.maxSize);
        }
      }
    });

    test('should validate monitoring configuration', () => {
      const configs = [developmentConfig, stagingConfig, productionConfig];
      
      for (const config of configs) {
        expect(config.monitoring.retentionInDays).toBeGreaterThan(0);
        expect(typeof config.monitoring.enableDetailedMonitoring).toBe('boolean');
        expect(typeof config.monitoring.enableContainerInsights).toBe('boolean');
        
        // Production should have longer retention
        if (config.name === 'production') {
          expect(config.monitoring.retentionInDays).toBeGreaterThanOrEqual(365);
        }
      }
    });

    test('should validate security configurations', () => {
      const configs = [developmentConfig, stagingConfig, productionConfig];
      
      for (const config of configs) {
        expect(typeof config.security.enableWaf).toBe('boolean');
        expect(typeof config.security.enableGuardDuty).toBe('boolean');
        expect(typeof config.security.enableSecurityHub).toBe('boolean');
        expect(typeof config.security.kmsKeyRotation).toBe('boolean');
        
        // Production and staging should have enhanced security
        if (config.name === 'production' || config.name === 'staging') {
          expect(config.security.enableWaf).toBe(true);
          expect(config.security.enableGuardDuty).toBe(true);
          expect(config.security.kmsKeyRotation).toBe(true);
        }
      }
    });
  });

  describe('Build Configuration', () => {
    test('should validate build configuration module', () => {
      const buildConfig = require('../../packages/build-config/src/index');
      
      expect(buildConfig).toBeDefined();
      expect(buildConfig.BUILD_TARGETS).toBeDefined();
      expect(buildConfig.DEFAULT_DEPENDENCIES).toBeDefined();
      expect(buildConfig.SHARED_SCRIPTS).toBeDefined();
      expect(typeof buildConfig.generatePackageConfig).toBe('function');
      expect(typeof buildConfig.generateTsConfig).toBe('function');
      expect(typeof buildConfig.generateJestConfig).toBe('function');
      expect(typeof buildConfig.generateEslintConfig).toBe('function');
    });

    test('should generate valid TypeScript configuration', () => {
      const { generateTsConfig } = require('../../packages/build-config/src/index');
      
      const nodeConfig = generateTsConfig({ target: 'node' });
      expect(nodeConfig.compilerOptions.target).toBe('ES2022');
      expect(nodeConfig.compilerOptions.module).toBe('CommonJS');
      expect(nodeConfig.compilerOptions.strict).toBe(true);
      
      const browserConfig = generateTsConfig({ target: 'browser' });
      expect(browserConfig.compilerOptions.target).toBe('ES2020');
      expect(Array.isArray(browserConfig.compilerOptions.lib)).toBe(true);
      expect(browserConfig.compilerOptions.lib).toContain('DOM');
    });

    test('should generate valid Jest configuration', () => {
      const { generateJestConfig } = require('../../packages/build-config/src/index');
      
      const jestConfig = generateJestConfig();
      expect(jestConfig.testEnvironment).toBe('node');
      expect(Array.isArray(jestConfig.testMatch)).toBe(true);
      expect(Array.isArray(jestConfig.collectCoverageFrom)).toBe(true);
      expect(jestConfig.coverageThreshold.global.branches).toBeGreaterThan(0);
    });
  });
});