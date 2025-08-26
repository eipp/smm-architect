"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.outputs = void 0;
const pulumi = __importStar(require("@pulumi/pulumi"));
const aws = __importStar(require("@pulumi/aws"));
const kubernetes = __importStar(require("@pulumi/kubernetes"));
const config = new pulumi.Config();
const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const workspaceConfig = config.requireObject("workspace");
const baseTags = {
    Project: projectName,
    Environment: stackName,
    WorkspaceId: workspaceConfig.workspaceId,
    TenantId: workspaceConfig.tenantId,
    ManagedBy: "pulumi",
    CreatedAt: new Date().toISOString(),
};
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
const vpc = new aws.ec2.Vpc(`${workspaceConfig.workspaceId}-vpc`, {
    cidrBlock: workspaceConfig.networking.vpcCidr,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-vpc`,
    },
});
const igw = new aws.ec2.InternetGateway(`${workspaceConfig.workspaceId}-igw`, {
    vpcId: vpc.id,
    tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-igw`,
    },
});
const availabilityZones = aws.getAvailabilityZones({
    state: "available",
});
const publicSubnets = availabilityZones.then(azs => azs.names.slice(0, workspaceConfig.features.enableHighAvailability ? 3 : 2).map((az, index) => {
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
}));
const privateSubnets = workspaceConfig.networking.enablePrivateSubnets
    ? availabilityZones.then(azs => azs.names.slice(0, workspaceConfig.features.enableHighAvailability ? 3 : 2).map((az, index) => {
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
    }))
    : [];
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
const publicRouteTableAssociations = publicSubnets.then(subnets => subnets.map((subnet, index) => new aws.ec2.RouteTableAssociation(`${workspaceConfig.workspaceId}-public-rta-${index}`, {
    subnetId: subnet.id,
    routeTableId: publicRouteTable.id,
})));
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
const eksClusterPolicyAttachment = new aws.iam.RolePolicyAttachment(`${workspaceConfig.workspaceId}-eks-cluster-policy`, {
    role: eksClusterRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
});
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
const nodeGroupPolicies = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];
const nodeGroupPolicyAttachments = nodeGroupPolicies.map((policyArn, index) => new aws.iam.RolePolicyAttachment(`${workspaceConfig.workspaceId}-nodegroup-policy-${index}`, {
    role: eksNodeGroupRole.name,
    policyArn,
}));
const dbSubnetGroup = new aws.rds.SubnetGroup(`${workspaceConfig.workspaceId}-db-subnet-group`, {
    subnetIds: workspaceConfig.networking.enablePrivateSubnets
        ? privateSubnets.then(subnets => subnets.map(s => s.id))
        : publicSubnets.then(subnets => subnets.map(s => s.id)),
    tags: {
        ...baseTags,
        Name: `${workspaceConfig.workspaceId}-db-subnet-group`,
    },
});
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
const redisSubnetGroup = new aws.elasticache.SubnetGroup(`${workspaceConfig.workspaceId}-redis-subnet-group`, {
    subnetIds: workspaceConfig.networking.enablePrivateSubnets
        ? privateSubnets.then(subnets => subnets.map(s => s.id))
        : publicSubnets.then(subnets => subnets.map(s => s.id)),
});
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
const k8sProvider = new kubernetes.Provider(`${workspaceConfig.workspaceId}-k8s`, {
    kubeconfig: eksCluster.kubeconfig,
}, { dependsOn: [eksNodeGroup] });
const smmNamespace = new kubernetes.core.v1.Namespace("smm-architect", {
    metadata: {
        name: "smm-architect",
        labels: {
            name: "smm-architect",
            workspaceId: workspaceConfig.workspaceId,
        },
    },
}, { provider: k8sProvider });
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
exports.outputs = {
    vpcId: vpc.id,
    publicSubnetIds: publicSubnets.then(subnets => subnets.map(s => s.id)),
    privateSubnetIds: workspaceConfig.networking.enablePrivateSubnets
        ? privateSubnets.then(subnets => subnets.map(s => s.id))
        : [],
    eksClusterName: eksCluster.name,
    eksClusterEndpoint: eksCluster.endpoint,
    eksClusterCertificateAuthority: eksCluster.certificateAuthority,
    kubeconfig: eksCluster.kubeconfig,
    databaseEndpoint: database.endpoint,
    databasePort: database.port,
    databaseName: database.dbName,
    databaseUsername: database.username,
    redisEndpoint: redisCluster.configurationEndpoint,
    redisPort: redisCluster.port,
    contentBucketName: contentBucket.bucket,
    contentBucketArn: contentBucket.arn,
    auditBucketName: auditBucket?.bucket,
    auditBucketArn: auditBucket?.arn,
    eksClusterSecurityGroupId: eksClusterSecurityGroup.id,
    databaseSecurityGroupId: databaseSecurityGroup.id,
    redisSecurityGroupId: redisSecurityGroup.id,
    workspaceId: workspaceConfig.workspaceId,
    environment: workspaceConfig.environment,
    resourceTier: workspaceConfig.resourceTier,
    region: workspaceConfig.region,
};
//# sourceMappingURL=workspace-template.js.map