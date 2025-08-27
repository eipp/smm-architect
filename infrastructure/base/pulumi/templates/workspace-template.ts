import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as gcp from "@pulumi/gcp";
import * as kubernetes from "@pulumi/kubernetes";
import * as vault from "@pulumi/vault";

/**
 * SMM Architect Workspace Infrastructure Template
 * 
 * This Pulumi template provisions a complete workspace infrastructure for SMM Architect,
 * including compute resources, storage, databases, networking, and security components.
 */

// Configuration
const config = new pulumi.Config();
const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

// Workspace Configuration
export interface WorkspaceConfig {
  // Basic Configuration
  workspaceId: string;
  tenantId: string;
  environment: "development" | "staging" | "production";
  region: "us-east-1" | "us-west-2" | "eu-west-1" | "ap-southeast-1";
  
  // Resource Scaling
  resourceTier: "small" | "medium" | "large" | "enterprise";
  
  // Feature Flags
  features: {
    enableHighAvailability: boolean;
    enableAutoScaling: boolean;
    enableMultiRegion: boolean;
    enableDataEncryption: boolean;
    enableAuditLogging: boolean;
    enableMonitoring: boolean;
    enableBackup: boolean;
  };
  
  // Network Configuration
  networking: {
    vpcCidr: string;
    enablePrivateSubnets: boolean;
    enableNatGateway: boolean;
    enableVpnAccess: boolean;
  };
  
  // Security Configuration
  security: {
    enableVault: boolean;
    vaultIntegration: "aws-kms" | "gcp-kms" | "azure-kv";
    enableOPA: boolean;
    enableNetworkPolicies: boolean;
    allowedCidrs: string[];
  };
  
  // Storage Configuration
  storage: {
    databaseSize: string;
    storageClass: "standard" | "ssd" | "nvme";
    backupRetentionDays: number;
    enablePointInTimeRecovery: boolean;
  };
  
  // Monitoring Configuration
  monitoring: {
    enablePrometheus: boolean;
    enableGrafana: boolean;
    enableAlertManager: boolean;
    slackWebhookUrl?: string;
    pagerDutyApiKey?: string;
  };
}

// Default Configuration
const workspaceConfig = config.requireObject<WorkspaceConfig>("workspace");

// Tags for all resources
const baseTags = {
  Project: projectName,
  Environment: stackName,
  WorkspaceId: workspaceConfig.workspaceId,
  TenantId: workspaceConfig.tenantId,
  ManagedBy: "pulumi",
  CreatedAt: new Date().toISOString(),
};

// Resource sizing based on tier
const resourceSpecs = {
  small: {
    nodes: { min: 2, max: 5, instanceType: "t3.medium" },
    database: { instanceClass: "db.t3.micro", allocatedStorage: 20 },
    redis: { nodeType: "cache.t3.micro" },
  },
  medium: {
    nodes: { min: 3, max: 10, instanceType: "t3.large" },
    database: { instanceClass: "db.t3.small", allocatedStorage: 100 },
    redis: { nodeType: "cache.t3.small" },
  },
  large: {
    nodes: { min: 5, max: 20, instanceType: "t3.xlarge" },
    database: { instanceClass: "db.t3.medium", allocatedStorage: 500 },
    redis: { nodeType: "cache.t3.medium" },
  },
  enterprise: {
    nodes: { min: 10, max: 50, instanceType: "c5.2xlarge" },
    database: { instanceClass: "db.r5.large", allocatedStorage: 1000 },
    redis: { nodeType: "cache.r5.large" },
  },
};

const specs = resourceSpecs[workspaceConfig.resourceTier];

//=============================================================================
// NETWORKING
//=============================================================================

// VPC
const vpc = new aws.ec2.Vpc(`${workspaceConfig.workspaceId}-vpc`, {
  cidrBlock: workspaceConfig.networking.vpcCidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-vpc`,
  },
});

// Internet Gateway
const igw = new aws.ec2.InternetGateway(`${workspaceConfig.workspaceId}-igw`, {
  vpcId: vpc.id,
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-igw`,
  },
});

// Public Subnets
const availabilityZones = aws.getAvailabilityZones({
  state: "available",
});

const publicSubnets = availabilityZones.then(azs => 
  azs.names.slice(0, workspaceConfig.features.enableHighAvailability ? 3 : 2).map((az, index) => {
    return new aws.ec2.Subnet(`${workspaceConfig.workspaceId}-public-${index}`, {
      vpcId: vpc.id,
      availabilityZone: az,
      cidrBlock: `10.0.${index + 1}.0/24`,
      mapPublicIpOnLaunch: true,
      tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-public-${index}`,
        Type: "public",
      },
    });
  })
);

// Private Subnets (if enabled)
const privateSubnets = workspaceConfig.networking.enablePrivateSubnets
  ? availabilityZones.then(azs => 
      azs.names.slice(0, workspaceConfig.features.enableHighAvailability ? 3 : 2).map((az, index) => {
        return new aws.ec2.Subnet(`${workspaceConfig.workspaceId}-private-${index}`, {
          vpcId: vpc.id,
          availabilityZone: az,
          cidrBlock: `10.0.${index + 10}.0/24`,
          tags: {
            ...baseTags,
            Name: `${workspaceConfig.workspaceId}-private-${index}`,
            Type: "private",
          },
        });
      })
    )
  : [];

// NAT Gateway (if private subnets enabled)
const natGateway = workspaceConfig.networking.enableNatGateway && workspaceConfig.networking.enablePrivateSubnets
  ? new aws.ec2.NatGateway(`${workspaceConfig.workspaceId}-nat`, {
      allocationId: new aws.ec2.Eip(`${workspaceConfig.workspaceId}-nat-eip`, {
        vpc: true,
        tags: baseTags,
      }).id,
      subnetId: publicSubnets.then(subnets => subnets[0].id),
      tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-nat`,
      },
    })
  : undefined;

// Route Tables
const publicRouteTable = new aws.ec2.RouteTable(`${workspaceConfig.workspaceId}-public-rt`, {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    },
  ],
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-public-rt`,
  },
});

// Associate public subnets with public route table
const publicRouteTableAssociations = publicSubnets.then(subnets =>
  subnets.map((subnet, index) =>
    new aws.ec2.RouteTableAssociation(`${workspaceConfig.workspaceId}-public-rta-${index}`, {
      subnetId: subnet.id,
      routeTableId: publicRouteTable.id,
    })
  )
);

//=============================================================================
// SECURITY GROUPS
//=============================================================================

// EKS Cluster Security Group
const eksClusterSecurityGroup = new aws.ec2.SecurityGroup(`${workspaceConfig.workspaceId}-eks-cluster-sg`, {
  vpcId: vpc.id,
  description: "Security group for EKS cluster",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: workspaceConfig.security.allowedCidrs,
      description: "HTTPS access to EKS API server",
    },
  ],
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-eks-cluster-sg`,
  },
});

// Database Security Group
const databaseSecurityGroup = new aws.ec2.SecurityGroup(`${workspaceConfig.workspaceId}-db-sg`, {
  vpcId: vpc.id,
  description: "Security group for RDS database",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      securityGroups: [eksClusterSecurityGroup.id],
      description: "PostgreSQL access from EKS cluster",
    },
  ],
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-db-sg`,
  },
});

// Redis Security Group
const redisSecurityGroup = new aws.ec2.SecurityGroup(`${workspaceConfig.workspaceId}-redis-sg`, {
  vpcId: vpc.id,
  description: "Security group for Redis cluster",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 6379,
      toPort: 6379,
      securityGroups: [eksClusterSecurityGroup.id],
      description: "Redis access from EKS cluster",
    },
  ],
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-redis-sg`,
  },
});

//=============================================================================
// IAM ROLES AND POLICIES
//=============================================================================

// EKS Cluster Service Role
const eksClusterRole = new aws.iam.Role(`${workspaceConfig.workspaceId}-eks-cluster-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "eks.amazonaws.com",
        },
      },
    ],
  }),
  tags: baseTags,
});

// Attach required policies to EKS cluster role
const eksClusterPolicyAttachment = new aws.iam.RolePolicyAttachment(`${workspaceConfig.workspaceId}-eks-cluster-policy`, {
  role: eksClusterRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
});

// EKS Node Group Role
const eksNodeGroupRole = new aws.iam.Role(`${workspaceConfig.workspaceId}-eks-nodegroup-role`, {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
      },
    ],
  }),
  tags: baseTags,
});

// Attach required policies to node group role
const nodeGroupPolicies = [
  "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
  "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

const nodeGroupPolicyAttachments = nodeGroupPolicies.map((policyArn, index) =>
  new aws.iam.RolePolicyAttachment(`${workspaceConfig.workspaceId}-nodegroup-policy-${index}`, {
    role: eksNodeGroupRole.name,
    policyArn,
  })
);

//=============================================================================
// DATABASE
//=============================================================================

// DB Subnet Group
const dbSubnetGroup = new aws.rds.SubnetGroup(`${workspaceConfig.workspaceId}-db-subnet-group`, {
  subnetIds: workspaceConfig.networking.enablePrivateSubnets 
    ? privateSubnets.then(subnets => subnets.map(s => s.id))
    : publicSubnets.then(subnets => subnets.map(s => s.id)),
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-db-subnet-group`,
  },
});

// RDS Instance
const database = new aws.rds.Instance(`${workspaceConfig.workspaceId}-db`, {
  identifier: `${workspaceConfig.workspaceId}-db`,
  engine: "postgres",
  engineVersion: "14.9",
  instanceClass: specs.database.instanceClass,
  allocatedStorage: specs.database.allocatedStorage,
  storageType: workspaceConfig.storage.storageClass === "ssd" ? "gp3" : "gp2",
  storageEncrypted: workspaceConfig.features.enableDataEncryption,
  
  dbName: "smmarchitect",
  username: "smmadmin",
  passwordParameterName: `/smm-architect/${workspaceConfig.workspaceId}/db-password`,
  
  vpcSecurityGroupIds: [databaseSecurityGroup.id],
  dbSubnetGroupName: dbSubnetGroup.name,
  
  backupRetentionPeriod: workspaceConfig.storage.backupRetentionDays,
  backupWindow: "03:00-04:00",
  maintenanceWindow: "sun:04:00-sun:05:00",
  
  skipFinalSnapshot: workspaceConfig.environment !== "production",
  deletionProtection: workspaceConfig.environment === "production",
  
  performanceInsightsEnabled: workspaceConfig.features.enableMonitoring,
  monitoringInterval: workspaceConfig.features.enableMonitoring ? 60 : 0,
  
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-db`,
  },
});

//=============================================================================
// REDIS CACHE
//=============================================================================

// Redis Subnet Group
const redisSubnetGroup = new aws.elasticache.SubnetGroup(`${workspaceConfig.workspaceId}-redis-subnet-group`, {
  subnetIds: workspaceConfig.networking.enablePrivateSubnets 
    ? privateSubnets.then(subnets => subnets.map(s => s.id))
    : publicSubnets.then(subnets => subnets.map(s => s.id)),
});

// Redis Cluster
const redisCluster = new aws.elasticache.ReplicationGroup(`${workspaceConfig.workspaceId}-redis`, {
  replicationGroupId: `${workspaceConfig.workspaceId}-redis`,
  description: "Redis cluster for SMM Architect workspace",
  
  nodeType: specs.redis.nodeType,
  numCacheClusters: workspaceConfig.features.enableHighAvailability ? 3 : 1,
  
  engine: "redis",
  engineVersion: "7.0",
  parameterGroupName: "default.redis7",
  
  port: 6379,
  subnetGroupName: redisSubnetGroup.name,
  securityGroupIds: [redisSecurityGroup.id],
  
  atRestEncryptionEnabled: workspaceConfig.features.enableDataEncryption,
  transitEncryptionEnabled: workspaceConfig.features.enableDataEncryption,
  
  snapshotRetentionLimit: workspaceConfig.storage.backupRetentionDays,
  snapshotWindow: "03:00-05:00",
  maintenanceWindow: "sun:05:00-sun:07:00",
  
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-redis`,
  },
});

//=============================================================================
// EKS CLUSTER
//=============================================================================

// EKS Cluster
const eksCluster = new aws.eks.Cluster(`${workspaceConfig.workspaceId}-eks`, {
  name: `${workspaceConfig.workspaceId}-eks`,
  version: "1.28",
  roleArn: eksClusterRole.arn,
  
  vpcConfig: {
    subnetIds: publicSubnets.then(subnets => subnets.map(s => s.id)),
    securityGroupIds: [eksClusterSecurityGroup.id],
    endpointPrivateAccess: true,
    endpointPublicAccess: true,
    publicAccessCidrs: workspaceConfig.security.allowedCidrs,
  },
  
  enabledClusterLogTypes: workspaceConfig.features.enableAuditLogging 
    ? ["api", "audit", "authenticator", "controllerManager", "scheduler"]
    : [],
  
  encryptionConfig: workspaceConfig.features.enableDataEncryption 
    ? [{
        provider: {
          keyArn: new aws.kms.Key(`${workspaceConfig.workspaceId}-eks-kms`, {
            description: "EKS encryption key",
            tags: baseTags,
          }).arn,
        },
        resources: ["secrets"],
      }]
    : [],
  
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-eks`,
  },
}, { dependsOn: [eksClusterPolicyAttachment] });

// EKS Node Group
const eksNodeGroup = new aws.eks.NodeGroup(`${workspaceConfig.workspaceId}-eks-nodes`, {
  clusterName: eksCluster.name,
  nodeGroupName: `${workspaceConfig.workspaceId}-eks-nodes`,
  nodeRoleArn: eksNodeGroupRole.arn,
  
  subnetIds: workspaceConfig.networking.enablePrivateSubnets 
    ? privateSubnets.then(subnets => subnets.map(s => s.id))
    : publicSubnets.then(subnets => subnets.map(s => s.id)),
  
  instanceTypes: [specs.nodes.instanceType],
  amiType: "AL2_x86_64",
  capacityType: "ON_DEMAND",
  
  scalingConfig: {
    desiredSize: Math.ceil((specs.nodes.min + specs.nodes.max) / 2),
    minSize: specs.nodes.min,
    maxSize: specs.nodes.max,
  },
  
  updateConfig: {
    maxUnavailablePercentage: 25,
  },
  
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-eks-nodes`,
  },
}, { dependsOn: nodeGroupPolicyAttachments });

//=============================================================================
// KUBERNETES PROVIDER
//=============================================================================

const k8sProvider = new kubernetes.Provider(`${workspaceConfig.workspaceId}-k8s`, {
  kubeconfig: eksCluster.kubeconfig,
}, { dependsOn: [eksNodeGroup] });

//=============================================================================
// KUBERNETES RESOURCES
//=============================================================================

// Namespace for SMM Architect services
const smmNamespace = new kubernetes.core.v1.Namespace("smm-architect", {
  metadata: {
    name: "smm-architect",
    labels: {
      name: "smm-architect",
      workspaceId: workspaceConfig.workspaceId,
    },
  },
}, { provider: k8sProvider });

// Vault Namespace (if enabled)
const vaultNamespace = workspaceConfig.security.enableVault
  ? new kubernetes.core.v1.Namespace("vault", {
      metadata: {
        name: "vault",
        labels: {
          name: "vault",
          workspaceId: workspaceConfig.workspaceId,
        },
      },
    }, { provider: k8sProvider })
  : undefined;

// Monitoring Namespace (if enabled)
const monitoringNamespace = workspaceConfig.features.enableMonitoring
  ? new kubernetes.core.v1.Namespace("monitoring", {
      metadata: {
        name: "monitoring",
        labels: {
          name: "monitoring",
          workspaceId: workspaceConfig.workspaceId,
        },
      },
    }, { provider: k8sProvider })
  : undefined;

//=============================================================================
// STORAGE
//=============================================================================

// S3 Bucket for content storage
const contentBucket = new aws.s3.Bucket(`${workspaceConfig.workspaceId}-content`, {
  bucket: `smm-architect-${workspaceConfig.workspaceId}-content`,
  
  versioning: {
    enabled: true,
  },
  
  serverSideEncryptionConfiguration: workspaceConfig.features.enableDataEncryption 
    ? {
        rule: {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "AES256",
          },
        },
      }
    : undefined,
  
  lifecycleRules: [
    {
      enabled: true,
      transitions: [
        {
          days: 30,
          storageClass: "STANDARD_IA",
        },
        {
          days: 90,
          storageClass: "GLACIER",
        },
      ],
    },
  ],
  
  tags: {
    ...baseTags,
    Name: `${workspaceConfig.workspaceId}-content`,
    Purpose: "content-storage",
  },
});

// S3 Bucket for audit logs
const auditBucket = workspaceConfig.features.enableAuditLogging
  ? new aws.s3.Bucket(`${workspaceConfig.workspaceId}-audit`, {
      bucket: `smm-architect-${workspaceConfig.workspaceId}-audit`,
      
      versioning: {
        enabled: true,
      },
      
      serverSideEncryptionConfiguration: {
        rule: {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "AES256",
          },
        },
      },
      
      lifecycleRules: [
        {
          enabled: true,
          transitions: [
            {
              days: 90,
              storageClass: "GLACIER",
            },
            {
              days: 365,
              storageClass: "DEEP_ARCHIVE",
            },
          ],
        },
      ],
      
      tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-audit`,
        Purpose: "audit-logs",
      },
    })
  : undefined;

//=============================================================================
// OUTPUTS
//=============================================================================

export const outputs = {
  // Infrastructure
  vpcId: vpc.id,
  publicSubnetIds: publicSubnets.then(subnets => subnets.map(s => s.id)),
  privateSubnetIds: workspaceConfig.networking.enablePrivateSubnets 
    ? privateSubnets.then(subnets => subnets.map(s => s.id))
    : [],
  
  // EKS
  eksClusterName: eksCluster.name,
  eksClusterEndpoint: eksCluster.endpoint,
  eksClusterCertificateAuthority: eksCluster.certificateAuthority,
  kubeconfig: eksCluster.kubeconfig,
  
  // Database
  databaseEndpoint: database.endpoint,
  databasePort: database.port,
  databaseName: database.dbName,
  databaseUsername: database.username,
  
  // Redis
  redisEndpoint: redisCluster.configurationEndpoint,
  redisPort: redisCluster.port,
  
  // Storage
  contentBucketName: contentBucket.bucket,
  contentBucketArn: contentBucket.arn,
  auditBucketName: auditBucket?.bucket,
  auditBucketArn: auditBucket?.arn,
  
  // Security
  eksClusterSecurityGroupId: eksClusterSecurityGroup.id,
  databaseSecurityGroupId: databaseSecurityGroup.id,
  redisSecurityGroupId: redisSecurityGroup.id,
  
  // Configuration
  workspaceId: workspaceConfig.workspaceId,
  environment: workspaceConfig.environment,
  resourceTier: workspaceConfig.resourceTier,
  region: workspaceConfig.region,
};