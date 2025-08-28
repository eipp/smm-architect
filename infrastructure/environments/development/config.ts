/**
 * Development Environment Configuration
 * SMM Architect Infrastructure - Development Environment
 */

export interface EnvironmentConfig {
  name: string;
  region: string;
  availabilityZones: string[];
  tags: Record<string, string>;
  networking: {
    vpcCidr: string;
    publicSubnets: string[];
    privateSubnets: string[];
    databaseSubnets: string[];
  };
  database: {
    instanceClass: string;
    allocatedStorage: number;
    multiAz: boolean;
    backupRetentionPeriod: number;
    deletionProtection: boolean;
  };
  redis: {
    nodeType: string;
    numCacheNodes: number;
    parameterGroupName: string;
  };
  kubernetes: {
    version: string;
    nodeGroups: Array<{
      name: string;
      instanceTypes: string[];
      minSize: number;
      maxSize: number;
      desiredSize: number;
    }>;
  };
  monitoring: {
    retentionInDays: number;
    enableDetailedMonitoring: boolean;
    enableContainerInsights: boolean;
  };
  security: {
    enableWaf: boolean;
    enableGuardDuty: boolean;
    enableSecurityHub: boolean;
    kmsKeyRotation: boolean;
  };
}

export const developmentConfig: EnvironmentConfig = {
  name: 'development',
  region: 'us-west-2',
  availabilityZones: ['us-west-2a', 'us-west-2b', 'us-west-2c'],
  tags: {
    Environment: 'development',
    Project: 'smm-architect',
    Owner: 'dev-team',
    CostCenter: 'engineering',
    AutoShutdown: 'true'
  },
  networking: {
    vpcCidr: '10.0.0.0/16',
    publicSubnets: ['10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24'],
    privateSubnets: ['10.0.4.0/24', '10.0.5.0/24', '10.0.6.0/24'],
    databaseSubnets: ['10.0.7.0/24', '10.0.8.0/24', '10.0.9.0/24']
  },
  database: {
    instanceClass: 'db.t3.medium',
    allocatedStorage: 100,
    multiAz: false,
    backupRetentionPeriod: 7,
    deletionProtection: false
  },
  redis: {
    nodeType: 'cache.t3.micro',
    numCacheNodes: 1,
    parameterGroupName: 'default.redis7'
  },
  kubernetes: {
    version: '1.28',
    nodeGroups: [
      {
        name: 'system',
        instanceTypes: ['t3.medium'],
        minSize: 1,
        maxSize: 3,
        desiredSize: 2
      },
      {
        name: 'application',
        instanceTypes: ['t3.large', 't3.xlarge'],
        minSize: 2,
        maxSize: 10,
        desiredSize: 3
      }
    ]
  },
  monitoring: {
    retentionInDays: 30,
    enableDetailedMonitoring: true,
    enableContainerInsights: true
  },
  security: {
    enableWaf: false,
    enableGuardDuty: true,
    enableSecurityHub: false,
    kmsKeyRotation: true
  }
};

export default developmentConfig;