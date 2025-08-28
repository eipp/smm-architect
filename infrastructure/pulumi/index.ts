/**
 * SMM Architect Pulumi Infrastructure
 * Main infrastructure stack with multi-tenant support
 */

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';
import * as eks from '@pulumi/eks';
import { EnvironmentConfig } from '../environments/development/config';

export interface InfrastructureArgs {
  config: EnvironmentConfig;
  projectName: string;
  stackName: string;
}

export class SmmArchitectInfrastructure extends pulumi.ComponentResource {
  public readonly vpc: awsx.ec2.Vpc;
  public readonly cluster: eks.Cluster;
  public readonly database: aws.rds.Instance;
  public readonly redis: aws.elasticache.ReplicationGroup;
  public readonly kmsKey: aws.kms.Key;
  public readonly secretsManager: aws.secretsmanager.Secret[];
  public readonly s3Bucket: aws.s3.Bucket;
  public readonly loadBalancer: aws.lb.LoadBalancer;

  constructor(name: string, args: InfrastructureArgs, opts?: pulumi.ComponentResourceOptions) {
    super('smm-architect:infrastructure:SmmArchitectInfrastructure', name, {}, opts);

    const { config, projectName, stackName } = args;

    // Create VPC with public and private subnets
    this.vpc = new awsx.ec2.Vpc(`${name}-vpc`, {
      cidrBlock: config.networking.vpcCidr,
      numberOfAvailabilityZones: config.availabilityZones.length,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnets: [
        // Public subnets for load balancers
        ...config.networking.publicSubnets.map((cidr, index) => ({
          type: 'public' as const,
          cidrBlock: cidr,
          availabilityZone: config.availabilityZones[index],
          tags: { ...config.tags, Tier: 'public' }
        })),
        // Private subnets for applications
        ...config.networking.privateSubnets.map((cidr, index) => ({
          type: 'private' as const,
          cidrBlock: cidr,
          availabilityZone: config.availabilityZones[index],
          tags: { ...config.tags, Tier: 'private' }
        })),
        // Database subnets
        ...config.networking.databaseSubnets.map((cidr, index) => ({
          type: 'isolated' as const,
          cidrBlock: cidr,
          availabilityZone: config.availabilityZones[index],
          tags: { ...config.tags, Tier: 'database' }
        }))
      ],
      tags: config.tags
    }, { parent: this });

    // Create KMS key for encryption
    this.kmsKey = new aws.kms.Key(`${name}-kms`, {
      description: `SMM Architect ${config.name} environment encryption key`,
      deletionWindowInDays: config.name === 'production' ? 30 : 7,
      enableKeyRotation: config.security.kmsKeyRotation,
      tags: config.tags
    }, { parent: this });

    new aws.kms.Alias(`${name}-kms-alias`, {
      name: `alias/${projectName}-${stackName}`,
      targetKeyId: this.kmsKey.keyId
    }, { parent: this });

    // Create S3 bucket for media and assets
    this.s3Bucket = new aws.s3.Bucket(`${name}-storage`, {
      bucket: `${projectName}-${stackName}-storage`,
      versioning: {
        enabled: true
      },
      serverSideEncryptionConfiguration: {
        rule: {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: 'aws:kms',
            kmsMasterKeyId: this.kmsKey.arn
          }
        }
      },
      lifecycleRules: [
        {
          enabled: true,
          id: 'cleanup_old_versions',
          noncurrentVersionExpiration: {
            days: config.name === 'production' ? 90 : 30
          }
        }
      ],
      tags: config.tags
    }, { parent: this });

    // Block public access to S3 bucket
    new aws.s3.BucketPublicAccessBlock(`${name}-storage-pab`, {
      bucket: this.s3Bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true
    }, { parent: this });

    // Create database subnet group
    const dbSubnetGroup = new aws.rds.SubnetGroup(`${name}-db-subnet-group`, {
      subnetIds: this.vpc.isolatedSubnetIds,
      tags: { ...config.tags, Component: 'database' }
    }, { parent: this });

    // Create database security group
    const dbSecurityGroup = new aws.ec2.SecurityGroup(`${name}-db-sg`, {
      vpcId: this.vpc.vpcId,
      description: 'Database security group',
      ingress: [
        {
          fromPort: 5432,
          toPort: 5432,
          protocol: 'tcp',
          cidrBlocks: [config.networking.vpcCidr],
          description: 'PostgreSQL access from VPC'
        }
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: '-1',
          cidrBlocks: ['0.0.0.0/0'],
          description: 'All outbound traffic'
        }
      ],
      tags: { ...config.tags, Component: 'database' }
    }, { parent: this });

    // Create RDS PostgreSQL instance
    this.database = new aws.rds.Instance(`${name}-postgres`, {
      identifier: `${projectName}-${stackName}-postgres`,
      engine: 'postgres',
      engineVersion: '15.4',
      instanceClass: config.database.instanceClass,
      allocatedStorage: config.database.allocatedStorage,
      maxAllocatedStorage: config.database.allocatedStorage * 2,
      storageEncrypted: true,
      kmsKeyId: this.kmsKey.arn,
      
      dbName: 'smmarchitect',
      username: 'postgres',
      passwordLength: 32,
      
      vpcSecurityGroupIds: [dbSecurityGroup.id],
      dbSubnetGroupName: dbSubnetGroup.name,
      multiAz: config.database.multiAz,
      
      backupRetentionPeriod: config.database.backupRetentionPeriod,
      backupWindow: '03:00-04:00',
      maintenanceWindow: 'sun:04:00-sun:05:00',
      
      deletionProtection: config.database.deletionProtection,
      skipFinalSnapshot: !config.database.deletionProtection,
      finalSnapshotIdentifier: config.database.deletionProtection ? 
        `${projectName}-${stackName}-final-snapshot` : undefined,
      
      performanceInsightsEnabled: true,
      performanceInsightsKmsKeyId: this.kmsKey.arn,
      performanceInsightsRetentionPeriod: config.name === 'production' ? 731 : 7,
      
      enabledCloudwatchLogsExports: ['postgresql'],
      
      tags: { ...config.tags, Component: 'database' }
    }, { parent: this });

    // Create Redis subnet group
    const redisSubnetGroup = new aws.elasticache.SubnetGroup(`${name}-redis-subnet-group`, {
      subnetIds: this.vpc.privateSubnetIds,
      tags: { ...config.tags, Component: 'cache' }
    }, { parent: this });

    // Create Redis security group
    const redisSecurityGroup = new aws.ec2.SecurityGroup(`${name}-redis-sg`, {
      vpcId: this.vpc.vpcId,
      description: 'Redis security group',
      ingress: [
        {
          fromPort: 6379,
          toPort: 6379,
          protocol: 'tcp',
          cidrBlocks: [config.networking.vpcCidr],
          description: 'Redis access from VPC'
        }
      ],
      tags: { ...config.tags, Component: 'cache' }
    }, { parent: this });

    // Create Redis cluster
    this.redis = new aws.elasticache.ReplicationGroup(`${name}-redis`, {
      replicationGroupId: `${projectName}-${stackName}-redis`,
      description: 'SMM Architect Redis cluster',
      
      nodeType: config.redis.nodeType,
      numCacheNodes: config.redis.numCacheNodes,
      parameterGroupName: config.redis.parameterGroupName,
      
      subnetGroupName: redisSubnetGroup.name,
      securityGroupIds: [redisSecurityGroup.id],
      
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
      kmsKeyId: this.kmsKey.arn,
      
      automaticFailoverEnabled: config.redis.numCacheNodes > 1,
      multiAzEnabled: config.redis.numCacheNodes > 1,
      
      snapshotRetentionLimit: config.name === 'production' ? 7 : 1,
      snapshotWindow: '03:00-05:00',
      maintenanceWindow: 'sun:05:00-sun:07:00',
      
      tags: { ...config.tags, Component: 'cache' }
    }, { parent: this });

    // Create EKS cluster
    this.cluster = new eks.Cluster(`${name}-eks`, {
      name: `${projectName}-${stackName}`,
      version: config.kubernetes.version,
      vpcId: this.vpc.vpcId,
      subnetIds: this.vpc.privateSubnetIds,
      
      instanceRoles: [
        aws.iam.createRole(`${name}-eks-node-role`, {
          assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: 'ec2.amazonaws.com'
          }),
          managedPolicyArns: [
            'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
            'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
            'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'
          ]
        })
      ],
      
      createOidcProvider: true,
      endpointConfigPrivateAccess: true,
      endpointConfigPublicAccess: true,
      endpointConfigPublicAccessCidrs: ['0.0.0.0/0'],
      
      enabledClusterLogTypes: [
        'api', 'audit', 'authenticator', 'controllerManager', 'scheduler'
      ],
      
      tags: { ...config.tags, Component: 'kubernetes' }
    }, { parent: this });

    // Create node groups
    config.kubernetes.nodeGroups.forEach((nodeGroupConfig, index) => {
      new eks.NodeGroup(`${name}-eks-ng-${nodeGroupConfig.name}`, {
        cluster: this.cluster.core,
        nodeGroupName: `${projectName}-${stackName}-${nodeGroupConfig.name}`,
        
        instanceTypes: nodeGroupConfig.instanceTypes,
        scalingConfig: {
          minSize: nodeGroupConfig.minSize,
          maxSize: nodeGroupConfig.maxSize,
          desiredSize: nodeGroupConfig.desiredSize
        },
        
        subnetIds: this.vpc.privateSubnetIds,
        
        labels: {
          nodegroup: nodeGroupConfig.name,
          environment: config.name
        },
        
        taints: nodeGroupConfig.name === 'system' ? [
          {
            key: 'node-role.kubernetes.io/system',
            value: 'true',
            effect: 'NO_SCHEDULE'
          }
        ] : undefined,
        
        tags: { ...config.tags, Component: 'kubernetes', NodeGroup: nodeGroupConfig.name }
      }, { parent: this });
    });

    // Create Application Load Balancer
    const albSecurityGroup = new aws.ec2.SecurityGroup(`${name}-alb-sg`, {
      vpcId: this.vpc.vpcId,
      description: 'Application Load Balancer security group',
      ingress: [
        {
          fromPort: 80,
          toPort: 80,
          protocol: 'tcp',
          cidrBlocks: ['0.0.0.0/0'],
          description: 'HTTP access'
        },
        {
          fromPort: 443,
          toPort: 443,
          protocol: 'tcp',
          cidrBlocks: ['0.0.0.0/0'],
          description: 'HTTPS access'
        }
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: '-1',
          cidrBlocks: ['0.0.0.0/0'],
          description: 'All outbound traffic'
        }
      ],
      tags: { ...config.tags, Component: 'loadbalancer' }
    }, { parent: this });

    this.loadBalancer = new aws.lb.LoadBalancer(`${name}-alb`, {
      name: `${projectName}-${stackName}-alb`,
      loadBalancerType: 'application',
      securityGroups: [albSecurityGroup.id],
      subnets: this.vpc.publicSubnetIds,
      enableDeletionProtection: config.name === 'production',
      tags: { ...config.tags, Component: 'loadbalancer' }
    }, { parent: this });

    // Create secrets in AWS Secrets Manager
    this.secretsManager = [
      new aws.secretsmanager.Secret(`${name}-db-credentials`, {
        name: `${projectName}/${stackName}/database/credentials`,
        description: 'Database credentials',
        kmsKeyId: this.kmsKey.arn,
        tags: { ...config.tags, Component: 'secrets' }
      }, { parent: this }),
      
      new aws.secretsmanager.Secret(`${name}-jwt-secrets`, {
        name: `${projectName}/${stackName}/auth/jwt`,
        description: 'JWT signing secrets',
        kmsKeyId: this.kmsKey.arn,
        tags: { ...config.tags, Component: 'secrets' }
      }, { parent: this }),
      
      new aws.secretsmanager.Secret(`${name}-api-keys`, {
        name: `${projectName}/${stackName}/external/api-keys`,
        description: 'External API keys',
        kmsKeyId: this.kmsKey.arn,
        tags: { ...config.tags, Component: 'secrets' }
      }, { parent: this })
    ];

    // Output important values
    this.registerOutputs({
      vpcId: this.vpc.vpcId,
      clusterId: this.cluster.core.name,
      databaseEndpoint: this.database.endpoint,
      redisEndpoint: this.redis.primaryEndpoint,
      kmsKeyId: this.kmsKey.keyId,
      s3BucketName: this.s3Bucket.bucket,
      loadBalancerDns: this.loadBalancer.dnsName
    });
  }
}

export default SmmArchitectInfrastructure;