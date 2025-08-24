import * as pulumi from '@pulumi/pulumi';

// Define the workspace configuration interface that matches the Pulumi template
export interface WorkspaceConfig {
  workspaceId: string;
  tenantId: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  resourceTier: 'small' | 'medium' | 'large' | 'enterprise';
  features: {
    enableHighAvailability: boolean;
    enableAutoScaling: boolean;
    enableMultiRegion: boolean;
    enableDataEncryption: boolean;
    enableAuditLogging: boolean;
    enableMonitoring: boolean;
    enableBackup: boolean;
  };
  networking: {
    vpcCidr: string;
    enablePrivateSubnets: boolean;
    enableNatGateway: boolean;
    enableVpnAccess: boolean;
  };
  security: {
    enableVault: boolean;
    vaultIntegration: string;
    enableOPA: boolean;
    enableNetworkPolicies: boolean;
    allowedCidrs: string[];
  };
  storage: {
    databaseSize: string;
    storageClass: string;
    backupRetentionDays: number;
    enablePointInTimeRecovery: boolean;
  };
  monitoring: {
    enablePrometheus: boolean;
    enableGrafana: boolean;
    enableAlertManager: boolean;
  };
}

/**
 * Create a Pulumi program for workspace provisioning
 * This wraps the existing workspace-template.ts and makes it usable with Automation API
 */
export function createPulumiProgram(config: WorkspaceConfig) {
  return async () => {
    // Create a Pulumi config object with our workspace configuration
    const pulumiConfig = new pulumi.Config();
    
    // The workspace template expects configuration under the 'workspace' key
    pulumiConfig.require('workspace');
    
    // Import and execute the workspace template
    // Note: This assumes the workspace-template.ts exports are properly structured
    const workspaceTemplate = await import('../../../infra/pulumi/templates/workspace-template');
    
    // The template should export all the resources and outputs
    return {
      // Export key infrastructure outputs that services need
      vpcId: workspaceTemplate.vpc?.id,
      eksClusterName: workspaceTemplate.eksCluster?.name,
      eksClusterEndpoint: workspaceTemplate.eksCluster?.endpoint,
      kubeconfig: workspaceTemplate.eksCluster?.kubeconfig,
      databaseEndpoint: workspaceTemplate.database?.address,
      databasePort: workspaceTemplate.database?.port,
      redisEndpoint: workspaceTemplate.redisCluster?.primaryEndpoint,
      redisPort: workspaceTemplate.redisCluster?.port,
      contentBucketName: workspaceTemplate.contentBucket?.bucket,
      auditBucketName: workspaceTemplate.auditBucket?.bucket,
      workspaceId: config.workspaceId,
      tenantId: config.tenantId,
      environment: config.environment,
      region: config.region,
      resourceTier: config.resourceTier
    };
  };
}

/**
 * Alternative implementation that creates infrastructure directly
 * This is a simplified version for cases where the template import doesn't work
 */
export function createSimplePulumiProgram(config: WorkspaceConfig) {
  return async () => {
    const aws = await import('@pulumi/aws');
    const kubernetes = await import('@pulumi/kubernetes');
    
    // Create basic infrastructure programmatically
    const vpc = new aws.ec2.Vpc(`${config.workspaceId}-vpc`, {
      cidrBlock: config.networking.vpcCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Name: `${config.workspaceId}-vpc`,
        WorkspaceId: config.workspaceId,
        TenantId: config.tenantId,
        Environment: config.environment,
        ManagedBy: 'pulumi-automation'
      }
    });

    // Internet Gateway
    const igw = new aws.ec2.InternetGateway(`${config.workspaceId}-igw`, {
      vpcId: vpc.id,
      tags: {
        Name: `${config.workspaceId}-igw`,
        WorkspaceId: config.workspaceId
      }
    });

    // Get availability zones
    const azs = await aws.getAvailabilityZones({ state: 'available' });
    const azCount = config.features.enableHighAvailability ? 3 : 2;

    // Public subnets
    const publicSubnets = azs.names.slice(0, azCount).map((az, index) => {
      return new aws.ec2.Subnet(`${config.workspaceId}-public-${index}`, {
        vpcId: vpc.id,
        availabilityZone: az,
        cidrBlock: `10.0.${index + 1}.0/24`,
        mapPublicIpOnLaunch: true,
        tags: {
          Name: `${config.workspaceId}-public-${index}`,
          Type: 'public',
          WorkspaceId: config.workspaceId
        }
      });
    });

    // Route table for public subnets
    const publicRouteTable = new aws.ec2.RouteTable(`${config.workspaceId}-public-rt`, {
      vpcId: vpc.id,
      routes: [{
        cidrBlock: '0.0.0.0/0',
        gatewayId: igw.id
      }],
      tags: {
        Name: `${config.workspaceId}-public-rt`,
        WorkspaceId: config.workspaceId
      }
    });

    // Associate public subnets with route table
    publicSubnets.forEach((subnet, index) => {
      new aws.ec2.RouteTableAssociation(`${config.workspaceId}-public-rta-${index}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id
      });
    });

    // Security group for EKS cluster
    const eksSecurityGroup = new aws.ec2.SecurityGroup(`${config.workspaceId}-eks-sg`, {
      vpcId: vpc.id,
      description: 'Security group for EKS cluster',
      ingress: [
        {
          fromPort: 443,
          toPort: 443,
          protocol: 'tcp',
          cidrBlocks: config.security.allowedCidrs
        }
      ],
      egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: '-1',
        cidrBlocks: ['0.0.0.0/0']
      }],
      tags: {
        Name: `${config.workspaceId}-eks-sg`,
        WorkspaceId: config.workspaceId
      }
    });

    // IAM role for EKS cluster
    const eksRole = new aws.iam.Role(`${config.workspaceId}-eks-role`, {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'eks.amazonaws.com' }
        }]
      }),
      tags: {
        WorkspaceId: config.workspaceId
      }
    });

    // Attach EKS cluster policy
    new aws.iam.RolePolicyAttachment(`${config.workspaceId}-eks-cluster-policy`, {
      role: eksRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AmazonEKSClusterPolicy'
    });

    // Resource specifications based on tier
    const resourceSpecs = {
      small: { instanceType: 't3.medium', minNodes: 2, maxNodes: 5 },
      medium: { instanceType: 't3.large', minNodes: 3, maxNodes: 10 },
      large: { instanceType: 't3.xlarge', minNodes: 5, maxNodes: 20 },
      enterprise: { instanceType: 'c5.2xlarge', minNodes: 10, maxNodes: 50 }
    };

    const specs = resourceSpecs[config.resourceTier];

    // EKS cluster
    const eksCluster = new aws.eks.Cluster(`${config.workspaceId}-eks`, {
      name: `${config.workspaceId}-eks`,
      version: '1.28',
      roleArn: eksRole.arn,
      vpcConfig: {
        subnetIds: publicSubnets.map(s => s.id),
        securityGroupIds: [eksSecurityGroup.id],
        endpointPrivateAccess: true,
        endpointPublicAccess: true,
        publicAccessCidrs: config.security.allowedCidrs
      },
      enabledClusterLogTypes: config.features.enableAuditLogging ? 
        ['api', 'audit', 'authenticator', 'controllerManager', 'scheduler'] : [],
      tags: {
        Name: `${config.workspaceId}-eks`,
        WorkspaceId: config.workspaceId,
        Environment: config.environment
      }
    });

    // IAM role for node group
    const nodeGroupRole = new aws.iam.Role(`${config.workspaceId}-nodegroup-role`, {
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: { Service: 'ec2.amazonaws.com' }
        }]
      })
    });

    // Attach required policies to node group role
    const nodeGroupPolicies = [
      'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
      'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
      'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly'
    ];

    nodeGroupPolicies.forEach((policyArn, index) => {
      new aws.iam.RolePolicyAttachment(`${config.workspaceId}-nodegroup-policy-${index}`, {
        role: nodeGroupRole.name,
        policyArn
      });
    });

    // EKS node group
    const nodeGroup = new aws.eks.NodeGroup(`${config.workspaceId}-nodes`, {
      clusterName: eksCluster.name,
      nodeGroupName: `${config.workspaceId}-nodes`,
      nodeRoleArn: nodeGroupRole.arn,
      subnetIds: publicSubnets.map(s => s.id),
      instanceTypes: [specs.instanceType],
      scalingConfig: {
        desiredSize: Math.ceil((specs.minNodes + specs.maxNodes) / 2),
        minSize: specs.minNodes,
        maxSize: specs.maxNodes
      },
      tags: {
        Name: `${config.workspaceId}-nodes`,
        WorkspaceId: config.workspaceId
      }
    }, { 
      dependsOn: nodeGroupPolicies.map((_, index) => 
        pulumi.getResource(`${config.workspaceId}-nodegroup-policy-${index}`)
      )
    });

    // S3 bucket for content storage
    const contentBucket = new aws.s3.Bucket(`${config.workspaceId}-content`, {
      bucket: `smm-architect-${config.workspaceId}-content`,
      versioning: { enabled: true },
      serverSideEncryptionConfiguration: config.features.enableDataEncryption ? {
        rule: {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: 'AES256'
          }
        }
      } : undefined,
      tags: {
        Name: `${config.workspaceId}-content`,
        WorkspaceId: config.workspaceId,
        Purpose: 'content-storage'
      }
    });

    // Return outputs
    return {
      vpcId: vpc.id,
      eksClusterName: eksCluster.name,
      eksClusterEndpoint: eksCluster.endpoint,
      kubeconfig: eksCluster.kubeconfig,
      contentBucketName: contentBucket.bucket,
      workspaceId: config.workspaceId,
      tenantId: config.tenantId,
      environment: config.environment,
      region: config.region,
      resourceTier: config.resourceTier,
      publicSubnetIds: publicSubnets.map(s => s.id),
      eksSecurityGroupId: eksSecurityGroup.id
    };
  };
}