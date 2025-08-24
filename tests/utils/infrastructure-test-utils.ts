import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { LocalWorkspace, Stack } from '@pulumi/pulumi/automation';

export interface InfrastructureConfig {
  environment: 'ephemeral' | 'staging' | 'production';
  region: string;
  testId: string;
  tags: { [key: string]: string };
  limits: {
    maxInstances: number;
    maxStorageGB: number;
    maxCostPerHour: number;
    autoDestroyAfterHours?: number;
  };
}

export interface ResourceMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  cost: number;
}

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: ResourceMetrics;
  securityScore: number;
  complianceStatus: {
    [framework: string]: boolean;
  };
}

export class InfrastructureValidator {
  private config: InfrastructureConfig;

  constructor(config: InfrastructureConfig) {
    this.config = config;
  }

  async validateStack(stack: Stack): Promise<ValidationResult> {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
      metrics: {
        cpu: 0,
        memory: 0,
        storage: 0,
        network: 0,
        cost: 0
      },
      securityScore: 0,
      complianceStatus: {}
    };

    try {
      // Get stack resources and outputs
      const resources = await stack.listStackResources();
      const outputs = await stack.outputs();

      // Validate resource count
      if (resources.length === 0) {
        result.errors.push('No resources found in stack');
        result.passed = false;
        return result;
      }

      // Validate resource limits
      await this.validateResourceLimits(resources, result);

      // Validate security configuration
      await this.validateSecurity(outputs, result);

      // Validate networking
      await this.validateNetworking(outputs, result);

      // Validate monitoring and logging
      await this.validateMonitoring(outputs, result);

      // Calculate metrics
      result.metrics = await this.calculateMetrics(resources, outputs);

      // Validate cost limits
      if (result.metrics.cost > this.config.limits.maxCostPerHour) {
        result.errors.push(`Cost ${result.metrics.cost} exceeds limit ${this.config.limits.maxCostPerHour}`);
        result.passed = false;
      }

      // Calculate security score
      result.securityScore = this.calculateSecurityScore(result);

      // Check compliance
      result.complianceStatus = {
        'SOC2': this.checkSOC2Compliance(result),
        'ISO27001': this.checkISO27001Compliance(result),
        'GDPR': this.checkGDPRCompliance(result)
      };

    } catch (error) {
      result.errors.push(`Validation failed: ${error}`);
      result.passed = false;
    }

    return result;
  }

  private async validateResourceLimits(resources: any[], result: ValidationResult): Promise<void> {
    const instanceCount = resources.filter(r => 
      r.type.includes('aws:ec2/instance') || 
      r.type.includes('aws:rds/instance') ||
      r.type.includes('aws:elasticache')
    ).length;

    if (instanceCount > this.config.limits.maxInstances) {
      result.errors.push(`Instance count ${instanceCount} exceeds limit ${this.config.limits.maxInstances}`);
    }

    // Check for storage resources
    const storageResources = resources.filter(r => 
      r.type.includes('aws:ebs') || 
      r.type.includes('aws:s3') ||
      r.type.includes('aws:rds')
    );

    if (storageResources.length > 0) {
      result.warnings.push(`${storageResources.length} storage resources found - verify within limits`);
    }
  }

  private async validateSecurity(outputs: any, result: ValidationResult): Promise<void> {
    // Check for VPC
    if (!outputs.vpcId) {
      result.warnings.push('No VPC found - consider network isolation');
    }

    // Check for encryption
    if (!outputs.secretArn) {
      result.warnings.push('No secrets manager found - consider secure credential storage');
    }

    // Check for security groups
    const hasSecurityGroups = Object.keys(outputs).some(key => key.includes('SecurityGroup'));
    if (!hasSecurityGroups) {
      result.warnings.push('No security groups found - verify network security');
    }
  }

  private async validateNetworking(outputs: any, result: ValidationResult): Promise<void> {
    if (outputs.vpcId) {
      // Check for private subnets
      if (!outputs.privateSubnetId) {
        result.warnings.push('No private subnets found - consider network isolation');
      }

      // Check for public subnet restrictions
      if (outputs.publicSubnetId) {
        result.warnings.push('Public subnet found - verify it\'s necessary');
      }
    }
  }

  private async validateMonitoring(outputs: any, result: ValidationResult): Promise<void> {
    // Check for CloudWatch logs
    const hasLogging = Object.keys(outputs).some(key => 
      key.includes('log') || key.includes('cloudwatch')
    );
    
    if (!hasLogging && this.config.environment !== 'ephemeral') {
      result.warnings.push('No logging configuration found - consider enabling monitoring');
    }
  }

  private async calculateMetrics(resources: any[], outputs: any): Promise<ResourceMetrics> {
    const metrics: ResourceMetrics = {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0,
      cost: 0
    };

    // Calculate based on resource types (simplified)
    for (const resource of resources) {
      switch (true) {
        case resource.type.includes('aws:rds/instance'):
          metrics.cpu += 1; // 1 vCPU for db.t3.micro
          metrics.memory += 1; // 1 GB for db.t3.micro
          metrics.storage += 20; // 20 GB allocated storage
          metrics.cost += 0.017; // $0.017/hour for db.t3.micro
          break;

        case resource.type.includes('aws:elasticache'):
          metrics.cpu += 1;
          metrics.memory += 0.5;
          metrics.cost += 0.017; // cache.t3.micro
          break;

        case resource.type.includes('aws:eks/cluster'):
          metrics.cost += 0.10; // EKS cluster cost
          break;

        case resource.type.includes('aws:s3/bucket'):
          metrics.storage += 0; // No baseline storage cost
          metrics.cost += 0.001; // Minimal cost for bucket itself
          break;

        case resource.type.includes('aws:ec2/vpc'):
          // No direct cost for VPC
          break;

        default:
          metrics.cost += 0.001; // Small cost for other resources
      }
    }

    return metrics;
  }

  private calculateSecurityScore(result: ValidationResult): number {
    let score = 100;

    // Deduct points for security issues
    score -= result.errors.length * 20;
    score -= result.warnings.filter(w => w.includes('security') || w.includes('encrypt')).length * 10;

    // Bonus points for security features
    if (result.warnings.some(w => w.includes('VPC'))) score -= 5;
    if (result.warnings.some(w => w.includes('secrets'))) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private checkSOC2Compliance(result: ValidationResult): boolean {
    // SOC2 requires encryption, access controls, monitoring
    const hasEncryption = !result.warnings.some(w => w.includes('secrets'));
    const hasNetworkIsolation = !result.warnings.some(w => w.includes('VPC'));
    const hasMonitoring = !result.warnings.some(w => w.includes('logging'));

    return hasEncryption && hasNetworkIsolation && hasMonitoring;
  }

  private checkISO27001Compliance(result: ValidationResult): boolean {
    // ISO27001 requires comprehensive security controls
    return this.checkSOC2Compliance(result) && result.securityScore >= 80;
  }

  private checkGDPRCompliance(result: ValidationResult): boolean {
    // GDPR requires data protection and encryption
    const hasEncryption = !result.warnings.some(w => w.includes('encrypt'));
    const hasAccess_controls = result.securityScore >= 70;

    return hasEncryption && hasAccess_controls;
  }
}

export class CostEstimator {
  private readonly hourlyRates = {
    'db.t3.micro': 0.017,
    'cache.t3.micro': 0.017,
    'eks.cluster': 0.10,
    't3.micro': 0.0104,
    't3.small': 0.0208,
    't3.medium': 0.0416,
    's3.standard': 0.023 / (24 * 30), // Per GB per month
    'vpc.natgateway': 0.045,
    'rds.storage': 0.115 / (24 * 30) // Per GB per month
  };

  estimateStackCost(resources: any[]): {
    hourly: number;
    daily: number;
    monthly: number;
    breakdown: { [resource: string]: number };
  } {
    let hourlyCost = 0;
    const breakdown: { [resource: string]: number } = {};

    for (const resource of resources) {
      let resourceCost = 0;

      // Estimate cost based on resource type
      switch (true) {
        case resource.type.includes('aws:rds/instance'):
          resourceCost = this.hourlyRates['db.t3.micro'];
          breakdown['RDS Database'] = resourceCost;
          break;

        case resource.type.includes('aws:elasticache'):
          resourceCost = this.hourlyRates['cache.t3.micro'];
          breakdown['ElastiCache Redis'] = resourceCost;
          break;

        case resource.type.includes('aws:eks/cluster'):
          resourceCost = this.hourlyRates['eks.cluster'];
          breakdown['EKS Cluster'] = resourceCost;
          break;

        case resource.type.includes('aws:ec2/natGateway'):
          resourceCost = this.hourlyRates['vpc.natgateway'];
          breakdown['NAT Gateway'] = resourceCost;
          break;

        case resource.type.includes('aws:s3/bucket'):
          resourceCost = 0.001; // Minimal cost for bucket management
          breakdown['S3 Storage'] = resourceCost;
          break;

        default:
          resourceCost = 0.001; // Small cost for other resources
          breakdown['Other Resources'] = (breakdown['Other Resources'] || 0) + resourceCost;
      }

      hourlyCost += resourceCost;
    }

    return {
      hourly: Math.round(hourlyCost * 1000) / 1000,
      daily: Math.round(hourlyCost * 24 * 1000) / 1000,
      monthly: Math.round(hourlyCost * 24 * 30 * 1000) / 1000,
      breakdown
    };
  }
}

export class InfrastructureManager {
  private stacks: Map<string, Stack> = new Map();

  async createEphemeralStack(config: InfrastructureConfig, program: () => Promise<any>): Promise<Stack> {
    const stackName = `ephemeral-${config.testId}-${Date.now()}`;
    
    const workspace = await LocalWorkspace.create({
      projectName: 'smm-infrastructure-test',
      program
    });

    const stack = await workspace.createStack(stackName);
    
    // Set configuration
    await stack.setConfig('aws:region', { value: config.region });
    await stack.setConfig('smm:environment', { value: config.environment });
    await stack.setConfig('smm:testId', { value: config.testId });

    this.stacks.set(stackName, stack);

    // Schedule auto-destruction if configured
    if (config.limits.autoDestroyAfterHours) {
      this.scheduleAutoDestroy(stackName, config.limits.autoDestroyAfterHours);
    }

    return stack;
  }

  async deployStack(stack: Stack): Promise<{ success: boolean; duration: number; outputs: any }> {
    const startTime = Date.now();
    
    try {
      const result = await stack.up({ onOutput: console.log });
      const outputs = await stack.outputs();
      
      return {
        success: result.summary.result === 'succeeded',
        duration: (Date.now() - startTime) / 1000,
        outputs
      };
    } catch (error) {
      console.error('Stack deployment failed:', error);
      return {
        success: false,
        duration: (Date.now() - startTime) / 1000,
        outputs: {}
      };
    }
  }

  async destroyStack(stackName: string): Promise<boolean> {
    const stack = this.stacks.get(stackName);
    if (!stack) {
      console.warn(`Stack ${stackName} not found`);
      return false;
    }

    try {
      const result = await stack.destroy({ onOutput: console.log });
      this.stacks.delete(stackName);
      return result.summary.result === 'succeeded';
    } catch (error) {
      console.error(`Failed to destroy stack ${stackName}:`, error);
      return false;
    }
  }

  async destroyAllStacks(): Promise<void> {
    const destroyPromises = Array.from(this.stacks.keys()).map(stackName => 
      this.destroyStack(stackName)
    );
    
    await Promise.all(destroyPromises);
  }

  private scheduleAutoDestroy(stackName: string, hours: number): void {
    setTimeout(async () => {
      console.log(`Auto-destroying stack ${stackName} after ${hours} hours`);
      await this.destroyStack(stackName);
    }, hours * 60 * 60 * 1000);
  }

  getActiveStacks(): string[] {
    return Array.from(this.stacks.keys());
  }

  async getStackHealth(stackName: string): Promise<{
    status: 'healthy' | 'unhealthy' | 'unknown';
    resourceCount: number;
    lastUpdate: string;
  }> {
    const stack = this.stacks.get(stackName);
    if (!stack) {
      return { status: 'unknown', resourceCount: 0, lastUpdate: 'never' };
    }

    try {
      const resources = await stack.listStackResources();
      // In a real implementation, this would check actual resource health
      return {
        status: 'healthy',
        resourceCount: resources.length,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      return { status: 'unhealthy', resourceCount: 0, lastUpdate: 'error' };
    }
  }
}

export function generateResourceTags(config: InfrastructureConfig): { [key: string]: string } {
  return {
    Environment: config.environment,
    TestId: config.testId,
    ManagedBy: 'pulumi-automation',
    Project: 'smm-architect',
    Owner: 'qa-team',
    CreatedAt: new Date().toISOString(),
    Region: config.region,
    AutoDestroy: config.limits.autoDestroyAfterHours ? 'true' : 'false',
    ...config.tags
  };
}

export function validateResourceConfiguration(resourceType: string, config: any): string[] {
  const errors: string[] = [];

  switch (resourceType) {
    case 'aws:rds/instance':
      if (!config.storageEncrypted) {
        errors.push('RDS instance must have encryption enabled');
      }
      if (config.publiclyAccessible) {
        errors.push('RDS instance should not be publicly accessible');
      }
      if (!config.vpcSecurityGroupIds || config.vpcSecurityGroupIds.length === 0) {
        errors.push('RDS instance must have security groups configured');
      }
      break;

    case 'aws:s3/bucket':
      if (!config.serverSideEncryptionConfiguration) {
        errors.push('S3 bucket must have encryption enabled');
      }
      if (config.acl === 'public-read' || config.acl === 'public-read-write') {
        errors.push('S3 bucket should not have public access');
      }
      break;

    case 'aws:ec2/securityGroup':
      if (config.ingress?.some((rule: any) => rule.cidrBlocks?.includes('0.0.0.0/0'))) {
        errors.push('Security group should not allow unrestricted inbound access');
      }
      break;
  }

  return errors;
}