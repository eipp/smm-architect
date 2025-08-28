/**
 * SMM Architect Pulumi Program
 * Entry point for infrastructure deployment
 */

import * as pulumi from '@pulumi/pulumi';
import SmmArchitectInfrastructure from './index';
import { developmentConfig } from '../environments/development/config';
import { stagingConfig } from '../environments/staging/config';
import { productionConfig } from '../environments/production/config';

// Get configuration from Pulumi stack
const config = new pulumi.Config();
const environmentName = config.require('environment');
const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

// Select environment configuration
let environmentConfig;
switch (environmentName) {
  case 'development':
    environmentConfig = developmentConfig;
    break;
  case 'staging':
    environmentConfig = stagingConfig;
    break;
  case 'production':
    environmentConfig = productionConfig;
    break;
  default:
    throw new Error(`Unknown environment: ${environmentName}`);
}

// Create the infrastructure
const infrastructure = new SmmArchitectInfrastructure('smm-architect', {
  config: environmentConfig,
  projectName,
  stackName
});

// Export important outputs
export const vpcId = infrastructure.vpc.vpcId;
export const clusterId = infrastructure.cluster.core.name;
export const databaseEndpoint = infrastructure.database.endpoint;
export const redisEndpoint = infrastructure.redis.primaryEndpoint;
export const kmsKeyId = infrastructure.kmsKey.keyId;
export const s3BucketName = infrastructure.s3Bucket.bucket;
export const loadBalancerDns = infrastructure.loadBalancer.dnsName;

// Export kubeconfig for cluster access
export const kubeconfig = infrastructure.cluster.kubeconfig;