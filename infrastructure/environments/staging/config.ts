/**
 * Staging Environment Configuration
 * SMM Architect Infrastructure - Staging Environment
 */

import type { EnvironmentConfig } from '../development/config';

export const stagingConfig: EnvironmentConfig = {
  name: 'staging',
  region: 'us-west-2',
  availabilityZones: ['us-west-2a', 'us-west-2b', 'us-west-2c'],
  tags: {
    Environment: 'staging',
    Project: 'smm-architect',
    Owner: 'dev-team',
    CostCenter: 'engineering',
    AutoShutdown: 'false'
  },
  networking: {
    vpcCidr: '10.1.0.0/16',
    publicSubnets: ['10.1.1.0/24', '10.1.2.0/24', '10.1.3.0/24'],
    privateSubnets: ['10.1.4.0/24', '10.1.5.0/24', '10.1.6.0/24'],
    databaseSubnets: ['10.1.7.0/24', '10.1.8.0/24', '10.1.9.0/24']
  },
  database: {
    instanceClass: 'db.t3.large',
    allocatedStorage: 200,
    multiAz: true,
    backupRetentionPeriod: 14,
    deletionProtection: true
  },
  redis: {
    nodeType: 'cache.t3.small',
    numCacheNodes: 2,
    parameterGroupName: 'default.redis7'
  },
  kubernetes: {
    version: '1.28',
    nodeGroups: [
      {
        name: 'system',
        instanceTypes: ['t3.medium'],
        minSize: 2,
        maxSize: 4,
        desiredSize: 3
      },
      {
        name: 'application',
        instanceTypes: ['t3.large', 't3.xlarge'],
        minSize: 3,
        maxSize: 15,
        desiredSize: 5
      }
    ]
  },
  monitoring: {
    retentionInDays: 90,
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

export default stagingConfig;