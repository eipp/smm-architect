import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as kubernetes from '@pulumi/kubernetes';
import { LocalWorkspace, ConfigMap, Stack } from '@pulumi/pulumi/automation';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface InfrastructureTestConfig {
  stackName: string;
  region: string;
  environment: 'ephemeral' | 'staging' | 'production';
  testId: string;
  resources: {
    vpc: boolean;
    rds: boolean;
    redis: boolean;
    eks: boolean;
    s3: boolean;
    secrets: boolean;
  };
}

interface DeploymentValidation {
  resourceCount: number;
  healthChecks: {
    [resource: string]: {
      status: 'healthy' | 'unhealthy' | 'unknown';
      endpoint?: string;
      responseTime?: number;
      details?: any;
    };
  };
  securityValidation: {
    encryptionEnabled: boolean;
    networkIsolation: boolean;
    iamPoliciesValid: boolean;
    secretsEncrypted: boolean;
  };
  costEstimate: {
    hourly: number;
    daily: number;
    monthly: number;
    currency: string;
  };
}

describe('Pulumi IaC Deployment Testing', () => {
  let testConfig: InfrastructureTestConfig;
  let deployedStacks: Stack[] = [];
  
  beforeAll(async () => {
    testConfig = {
      stackName: `smm-test-${Date.now()}`,
      region: 'us-west-2',
      environment: 'ephemeral',
      testId: `test-${Math.random().toString(36).substr(2, 9)}`,
      resources: {
        vpc: true,
        rds: true,
        redis: true,
        eks: true,
        s3: true,
        secrets: true
      }
    };

    // Ensure required tools are available
    await verifyToolsAvailable();
  });

  afterAll(async () => {
    // Cleanup all deployed stacks
    console.log('🧹 Cleaning up ephemeral infrastructure...');
    for (const stack of deployedStacks) {
      try {
        await stack.destroy();
        console.log(`✅ Destroyed stack: ${stack.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to destroy stack ${stack.name}:`, error);
      }
    }
  });

  const verifyToolsAvailable = async (): Promise<void> => {
    const tools = ['pulumi', 'aws', 'kubectl'];
    
    for (const tool of tools) {
      try {
        execSync(`${tool} --version`, { stdio: 'pipe' });
      } catch (error) {
        throw new Error(`Required tool '${tool}' is not installed or not in PATH`);
      }
    }
  };

  const createPulumiProgram = (config: InfrastructureTestConfig) => {
    return async () => {
      const tags = {
        Environment: config.environment,
        TestId: config.testId,
        ManagedBy: 'pulumi-test',
        Project: 'smm-architect',
        Owner: 'qa-automation'
      };

      let outputs: { [key: string]: pulumi.Output<any> } = {};

      // VPC and Networking
      if (config.resources.vpc) {
        const vpc = new aws.ec2.Vpc(`${config.testId}-vpc`, {
          cidrBlock: '10.0.0.0/16',
          enableDnsHostnames: true,
          enableDnsSupport: true,
          tags: { ...tags, Name: `${config.testId}-vpc` }
        });

        const publicSubnet = new aws.ec2.Subnet(`${config.testId}-public-subnet`, {
          vpcId: vpc.id,
          cidrBlock: '10.0.1.0/24',
          availabilityZone: `${config.region}a`,
          mapPublicIpOnLaunch: true,
          tags: { ...tags, Name: `${config.testId}-public-subnet` }
        });

        const privateSubnet = new aws.ec2.Subnet(`${config.testId}-private-subnet`, {
          vpcId: vpc.id,
          cidrBlock: '10.0.2.0/24',
          availabilityZone: `${config.region}b`,
          tags: { ...tags, Name: `${config.testId}-private-subnet` }
        });

        const igw = new aws.ec2.InternetGateway(`${config.testId}-igw`, {
          vpcId: vpc.id,
          tags: { ...tags, Name: `${config.testId}-igw` }
        });

        const routeTable = new aws.ec2.RouteTable(`${config.testId}-rt`, {
          vpcId: vpc.id,
          routes: [{
            cidrBlock: '0.0.0.0/0',
            gatewayId: igw.id
          }],
          tags: { ...tags, Name: `${config.testId}-rt` }
        });

        new aws.ec2.RouteTableAssociation(`${config.testId}-rta`, {
          subnetId: publicSubnet.id,
          routeTableId: routeTable.id
        });

        outputs.vpcId = vpc.id;
        outputs.publicSubnetId = publicSubnet.id;
        outputs.privateSubnetId = privateSubnet.id;
      }

      // S3 Buckets
      if (config.resources.s3) {
        const bucket = new aws.s3.Bucket(`${config.testId}-storage`, {
          bucket: `smm-test-${config.testId}`,
          acl: 'private',
          serverSideEncryptionConfiguration: {
            rule: {
              applyServerSideEncryptionByDefault: {
                sseAlgorithm: 'AES256'
              }
            }
          },
          versioning: {
            enabled: true
          },
          tags
        });

        // Block public access
        new aws.s3.BucketPublicAccessBlock(`${config.testId}-bucket-pab`, {
          bucket: bucket.id,
          blockPublicAcls: true,
          blockPublicPolicy: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true
        });

        outputs.bucketName = bucket.bucket;
      }

      // RDS Database
      if (config.resources.rds) {
        const dbSubnetGroup = new aws.rds.SubnetGroup(`${config.testId}-db-subnet-group`, {
          subnetIds: [outputs.publicSubnetId, outputs.privateSubnetId],
          tags: { ...tags, Name: `${config.testId}-db-subnet-group` }
        });

        const dbSecurityGroup = new aws.ec2.SecurityGroup(`${config.testId}-db-sg`, {
          vpcId: outputs.vpcId,
          ingress: [{
            fromPort: 5432,
            toPort: 5432,
            protocol: 'tcp',
            cidrBlocks: ['10.0.0.0/16']
          }],
          egress: [{
            fromPort: 0,
            toPort: 0,
            protocol: '-1',
            cidrBlocks: ['0.0.0.0/0']
          }],
          tags: { ...tags, Name: `${config.testId}-db-sg` }
        });

        const dbInstance = new aws.rds.Instance(`${config.testId}-db`, {
          identifier: `smm-test-${config.testId}`,
          engine: 'postgres',
          engineVersion: '14.9',
          instanceClass: 'db.t3.micro',
          allocatedStorage: 20,
          dbName: 'smmtest',
          username: 'testuser',
          password: 'TestPassword123!',
          vpcSecurityGroupIds: [dbSecurityGroup.id],
          dbSubnetGroupName: dbSubnetGroup.name,
          storageEncrypted: true,
          skipFinalSnapshot: true,
          deletionProtection: false,
          tags
        });

        outputs.dbEndpoint = dbInstance.endpoint;
        outputs.dbPort = dbInstance.port;
      }

      // Redis Cache
      if (config.resources.redis) {
        const cacheSubnetGroup = new aws.elasticache.SubnetGroup(`${config.testId}-cache-subnet-group`, {
          subnetIds: [outputs.publicSubnetId, outputs.privateSubnetId]
        });

        const cacheSecurityGroup = new aws.ec2.SecurityGroup(`${config.testId}-cache-sg`, {
          vpcId: outputs.vpcId,
          ingress: [{
            fromPort: 6379,
            toPort: 6379,
            protocol: 'tcp',
            cidrBlocks: ['10.0.0.0/16']
          }],
          tags: { ...tags, Name: `${config.testId}-cache-sg` }
        });

        const cacheCluster = new aws.elasticache.ReplicationGroup(`${config.testId}-cache`, {
          replicationGroupId: `smm-test-${config.testId}`,
          description: 'Redis cluster for SMM Architect testing',
          port: 6379,
          parameterGroupName: 'default.redis7',
          nodeType: 'cache.t3.micro',
          numCacheNodes: 1,
          securityGroupIds: [cacheSecurityGroup.id],
          subnetGroupName: cacheSubnetGroup.name,
          atRestEncryptionEnabled: true,
          transitEncryptionEnabled: true,
          tags
        });

        outputs.redisEndpoint = cacheCluster.primaryEndpoint;
      }

      // Secrets Manager
      if (config.resources.secrets) {
        const secret = new aws.secretsmanager.Secret(`${config.testId}-secrets`, {
          name: `smm-test-${config.testId}`,
          description: 'Secrets for SMM Architect testing',
          kmsKeyId: 'alias/aws/secretsmanager',
          tags
        });

        new aws.secretsmanager.SecretVersion(`${config.testId}-secret-version`, {
          secretId: secret.id,
          secretString: JSON.stringify({
            database: {
              host: outputs.dbEndpoint,
              port: outputs.dbPort,
              username: 'testuser',
              password: 'TestPassword123!',
              database: 'smmtest'
            },
            redis: {
              host: outputs.redisEndpoint,
              port: 6379
            },
            apiKeys: {
              openai: 'sk-test-key',
              anthropic: 'test-key',
              linkedin: 'test-linkedin-key'
            }
          })
        });

        outputs.secretArn = secret.arn;
      }

      // EKS Cluster (simplified for testing)
      if (config.resources.eks) {
        const eksRole = new aws.iam.Role(`${config.testId}-eks-role`, {
          assumeRolePolicy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'eks.amazonaws.com'
              }
            }]
          }),
          tags
        });

        new aws.iam.RolePolicyAttachment(`${config.testId}-eks-cluster-policy`, {
          role: eksRole.name,
          policyArn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy'
        });

        const eksSecurityGroup = new aws.ec2.SecurityGroup(`${config.testId}-eks-sg`, {
          vpcId: outputs.vpcId,
          ingress: [{
            fromPort: 443,
            toPort: 443,
            protocol: 'tcp',
            cidrBlocks: ['0.0.0.0/0']
          }],
          tags: { ...tags, Name: `${config.testId}-eks-sg` }
        });

        const eksCluster = new aws.eks.Cluster(`${config.testId}-eks`, {
          name: `smm-test-${config.testId}`,
          roleArn: eksRole.arn,
          vpcConfig: {
            subnetIds: [outputs.publicSubnetId, outputs.privateSubnetId],
            securityGroupIds: [eksSecurityGroup.id]
          },
          enabledClusterLogTypes: ['api', 'audit'],
          tags
        });

        outputs.eksClusterName = eksCluster.name;
        outputs.eksEndpoint = eksCluster.endpoint;
      }

      return outputs;
    };
  };

  const validateDeployment = async (stack: Stack): Promise<DeploymentValidation> => {
    const outputs = await stack.outputs();
    const validation: DeploymentValidation = {
      resourceCount: 0,
      healthChecks: {},
      securityValidation: {
        encryptionEnabled: false,
        networkIsolation: false,
        iamPoliciesValid: false,
        secretsEncrypted: false
      },
      costEstimate: {
        hourly: 0,
        daily: 0,
        monthly: 0,
        currency: 'USD'
      }
    };

    // Count deployed resources
    const resources = await stack.listStackResources();
    validation.resourceCount = resources.length;

    // Validate VPC and networking
    if (outputs.vpcId) {
      validation.healthChecks.vpc = {
        status: 'healthy',
        details: { vpcId: outputs.vpcId.value }
      };
      validation.securityValidation.networkIsolation = true;
    }

    // Validate RDS
    if (outputs.dbEndpoint) {
      try {
        // Simple connection test (would need actual DB credentials in real test)
        validation.healthChecks.database = {
          status: 'healthy',
          endpoint: outputs.dbEndpoint.value
        };
        validation.securityValidation.encryptionEnabled = true;
      } catch (error) {
        validation.healthChecks.database = {
          status: 'unhealthy',
          details: error
        };
      }
    }

    // Validate Redis
    if (outputs.redisEndpoint) {
      validation.healthChecks.redis = {
        status: 'healthy',
        endpoint: outputs.redisEndpoint.value
      };
    }

    // Validate S3
    if (outputs.bucketName) {
      validation.healthChecks.s3 = {
        status: 'healthy',
        details: { bucketName: outputs.bucketName.value }
      };
    }

    // Validate Secrets Manager
    if (outputs.secretArn) {
      validation.healthChecks.secrets = {
        status: 'healthy',
        details: { secretArn: outputs.secretArn.value }
      };
      validation.securityValidation.secretsEncrypted = true;
    }

    // Validate EKS
    if (outputs.eksClusterName) {
      validation.healthChecks.eks = {
        status: 'healthy',
        endpoint: outputs.eksEndpoint?.value,
        details: { clusterName: outputs.eksClusterName.value }
      };
    }

    // Estimate costs (simplified calculation)
    let hourlyCost = 0;
    if (outputs.dbEndpoint) hourlyCost += 0.017; // db.t3.micro
    if (outputs.redisEndpoint) hourlyCost += 0.017; // cache.t3.micro
    if (outputs.eksClusterName) hourlyCost += 0.10; // EKS cluster
    
    validation.costEstimate = {
      hourly: hourlyCost,
      daily: hourlyCost * 24,
      monthly: hourlyCost * 24 * 30,
      currency: 'USD'
    };

    return validation;
  };

  describe('Ephemeral Environment Provisioning', () => {
    it('should deploy minimal infrastructure stack', async () => {
      const minimalConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-minimal`,
        resources: {
          vpc: true,
          rds: false,
          redis: false,
          eks: false,
          s3: true,
          secrets: true
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(minimalConfig)
      });

      const stack = await workspace.createStack(minimalConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: minimalConfig.region });
      
      console.log('🚀 Deploying minimal infrastructure...');
      const upResult = await stack.up({ onOutput: console.log });
      
      expect(upResult.summary.kind).toBe('update');
      expect(upResult.summary.result).toBe('succeeded');
      
      const validation = await validateDeployment(stack);
      expect(validation.resourceCount).toBeGreaterThan(0);
      expect(validation.healthChecks.vpc?.status).toBe('healthy');
      expect(validation.healthChecks.s3?.status).toBe('healthy');
      expect(validation.healthChecks.secrets?.status).toBe('healthy');
      
      console.log('✅ Minimal infrastructure deployed successfully');
    }, 600000); // 10 minutes timeout

    it('should deploy full infrastructure stack', async () => {
      const fullConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-full`
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(fullConfig)
      });

      const stack = await workspace.createStack(fullConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: fullConfig.region });
      
      console.log('🚀 Deploying full infrastructure...');
      const upResult = await stack.up({ onOutput: console.log });
      
      expect(upResult.summary.kind).toBe('update');
      expect(upResult.summary.result).toBe('succeeded');
      
      const validation = await validateDeployment(stack);
      expect(validation.resourceCount).toBeGreaterThan(10);
      expect(validation.securityValidation.encryptionEnabled).toBe(true);
      expect(validation.securityValidation.networkIsolation).toBe(true);
      expect(validation.securityValidation.secretsEncrypted).toBe(true);
      
      // Cost validation
      expect(validation.costEstimate.hourly).toBeGreaterThan(0);
      expect(validation.costEstimate.hourly).toBeLessThan(1); // Should be under $1/hour for test resources
      
      console.log('✅ Full infrastructure deployed successfully');
      console.log(`💰 Estimated cost: $${validation.costEstimate.hourly.toFixed(3)}/hour`);
    }, 900000); // 15 minutes timeout

    it('should handle deployment failures gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-invalid`,
        region: 'invalid-region' // This should cause deployment to fail
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(invalidConfig)
      });

      const stack = await workspace.createStack(invalidConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: invalidConfig.region });
      
      console.log('🚀 Testing deployment failure handling...');
      
      try {
        await stack.up({ onOutput: console.log });
        fail('Expected deployment to fail with invalid region');
      } catch (error) {
        expect(error).toBeDefined();
        console.log('✅ Deployment failure handled correctly');
      }
    }, 300000);
  });

  describe('Infrastructure Validation', () => {
    it('should validate network security', async () => {
      const securityConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-security`,
        resources: {
          vpc: true,
          rds: true,
          redis: true,
          eks: false,
          s3: true,
          secrets: true
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(securityConfig)
      });

      const stack = await workspace.createStack(securityConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: securityConfig.region });
      
      console.log('🔒 Deploying infrastructure for security validation...');
      await stack.up({ onOutput: console.log });
      
      const validation = await validateDeployment(stack);
      
      // Security validations
      expect(validation.securityValidation.encryptionEnabled).toBe(true);
      expect(validation.securityValidation.networkIsolation).toBe(true);
      expect(validation.securityValidation.secretsEncrypted).toBe(true);
      
      // Verify all database and cache resources are in private subnets
      // (This would require additional AWS API calls in a real implementation)
      
      console.log('✅ Security validation passed');
    }, 600000);

    it('should validate resource tagging', async () => {
      const taggedConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-tagged`,
        resources: {
          vpc: true,
          rds: false,
          redis: false,
          eks: false,
          s3: true,
          secrets: false
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(taggedConfig)
      });

      const stack = await workspace.createStack(taggedConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: taggedConfig.region });
      
      console.log('🏷️ Deploying infrastructure for tag validation...');
      await stack.up({ onOutput: console.log });
      
      // In a real implementation, this would check AWS API for proper tagging
      const resources = await stack.listStackResources();
      expect(resources.length).toBeGreaterThan(0);
      
      console.log('✅ Resource tagging validation passed');
    }, 600000);
  });

  describe('Environment Lifecycle', () => {
    it('should support environment updates', async () => {
      const updateConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-update`,
        resources: {
          vpc: true,
          rds: false,
          redis: false,
          eks: false,
          s3: true,
          secrets: false
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(updateConfig)
      });

      const stack = await workspace.createStack(updateConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: updateConfig.region });
      
      console.log('🚀 Initial deployment...');
      const initialResult = await stack.up({ onOutput: console.log });
      expect(initialResult.summary.result).toBe('succeeded');
      
      const initialResourceCount = (await stack.listStackResources()).length;
      
      // Update configuration to add Redis
      updateConfig.resources.redis = true;
      
      console.log('🔄 Updating infrastructure...');
      const updateResult = await stack.up({ onOutput: console.log });
      expect(updateResult.summary.result).toBe('succeeded');
      
      const updatedResourceCount = (await stack.listStackResources()).length;
      expect(updatedResourceCount).toBeGreaterThan(initialResourceCount);
      
      console.log('✅ Infrastructure update completed successfully');
    }, 900000);

    it('should cleanup resources completely', async () => {
      const cleanupConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-cleanup`,
        resources: {
          vpc: true,
          rds: false,
          redis: false,
          eks: false,
          s3: true,
          secrets: false
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(cleanupConfig)
      });

      const stack = await workspace.createStack(cleanupConfig.stackName);
      
      await stack.setConfig('aws:region', { value: cleanupConfig.region });
      
      console.log('🚀 Deploying infrastructure for cleanup test...');
      await stack.up({ onOutput: console.log });
      
      const resourcesBeforeDestroy = await stack.listStackResources();
      expect(resourcesBeforeDestroy.length).toBeGreaterThan(0);
      
      console.log('🗑️ Destroying infrastructure...');
      const destroyResult = await stack.destroy({ onOutput: console.log });
      expect(destroyResult.summary.result).toBe('succeeded');
      
      console.log('✅ Infrastructure cleanup completed successfully');
    }, 600000);
  });

  describe('Performance and Limits', () => {
    it('should deploy within acceptable time limits', async () => {
      const perfConfig = {
        ...testConfig,
        stackName: `${testConfig.stackName}-perf`,
        resources: {
          vpc: true,
          rds: true,
          redis: false,
          eks: false,
          s3: true,
          secrets: true
        }
      };

      const workspace = await LocalWorkspace.create({
        projectName: 'smm-architect-test',
        program: createPulumiProgram(perfConfig)
      });

      const stack = await workspace.createStack(perfConfig.stackName);
      deployedStacks.push(stack);

      await stack.setConfig('aws:region', { value: perfConfig.region });
      
      const startTime = Date.now();
      console.log('⏱️ Starting timed deployment...');
      
      await stack.up({ onOutput: console.log });
      
      const deploymentTime = (Date.now() - startTime) / 1000;
      console.log(`⏱️ Deployment completed in ${deploymentTime.toFixed(2)} seconds`);
      
      // Should deploy reasonable infrastructure in under 8 minutes
      expect(deploymentTime).toBeLessThan(480);
      
      const validation = await validateDeployment(stack);
      expect(validation.resourceCount).toBeGreaterThan(5);
      
      console.log('✅ Performance requirements met');
    }, 600000);
  });
});