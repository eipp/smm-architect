/**
 * Production Environment Configuration
 * SMM Architect Infrastructure - Production Environment
 */

import type { EnvironmentConfig } from '../development/config';

export const productionConfig: EnvironmentConfig = {
  name: 'production',
  region: 'us-west-2',
  availabilityZones: ['us-west-2a', 'us-west-2b', 'us-west-2c'],
  tags: {
    Environment: 'production',
    Project: 'smm-architect',
    Owner: 'ops-team',
    CostCenter: 'production',
    AutoShutdown: 'false',
    Backup: 'required',
    Compliance: 'gdpr-ccpa'
  },
  networking: {
    vpcCidr: '10.2.0.0/16',
    publicSubnets: ['10.2.1.0/24', '10.2.2.0/24', '10.2.3.0/24'],
    privateSubnets: ['10.2.4.0/24', '10.2.5.0/24', '10.2.6.0/24'],
    databaseSubnets: ['10.2.7.0/24', '10.2.8.0/24', '10.2.9.0/24']
  },
  database: {
    instanceClass: 'db.r6g.xlarge',
    allocatedStorage: 1000,
    multiAz: true,
    backupRetentionPeriod: 30,
    deletionProtection: true
  },
  redis: {
    nodeType: 'cache.r6g.large',
    numCacheNodes: 3,
    parameterGroupName: 'default.redis7'
  },
  kubernetes: {
    version: '1.28',
    nodeGroups: [
      {
        name: 'system',
        instanceTypes: ['m6i.large'],
        minSize: 3,
        maxSize: 6,
        desiredSize: 3
      },
      {
        name: 'application',
        instanceTypes: ['m6i.xlarge', 'm6i.2xlarge'],
        minSize: 5,
        maxSize: 50,
        desiredSize: 10
      },
      {
        name: 'compute-intensive',
        instanceTypes: ['c6i.2xlarge', 'c6i.4xlarge'],
        minSize: 2,
        maxSize: 20,
        desiredSize: 3
      }
    ]
  },
  monitoring: {
    retentionInDays: 365,
    enableDetailedMonitoring: true,
    enableContainerInsights: true
  },
  security: {
    enableWaf: true,
    enableGuardDuty: true,
    enableSecurityHub: true,
    kmsKeyRotation: true
  }
};

export default productionConfig;