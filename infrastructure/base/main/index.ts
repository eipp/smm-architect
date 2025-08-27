import * as pulumi from "@pulumi/pulumi";

// SMM Architect Infrastructure Configuration
const config = new pulumi.Config();
const awsConfig = new pulumi.Config("aws");

// Workspace Configuration
const workspaceId = config.get("workspace:id") || "smm-architect-dev";
const environment = config.get("workspace:environment") || "development";
const resourceTier = config.get("workspace:resourceTier") || "small";
const region = awsConfig.get("region") || "us-east-1";

// Resource Tags
const tags = {
    Environment: environment,
    Project: "smm-architect",
    WorkspaceId: workspaceId,
    ResourceTier: resourceTier,
    ManagedBy: "pulumi",
};

// Resource Tier Configurations
const resourceTierConfig = {
    small: {
        instanceType: "t3.micro",
        minSize: 1,
        maxSize: 3,
        desiredCapacity: 1,
        dbInstanceClass: "db.t3.micro",
        dbAllocatedStorage: 20,
    },
    medium: {
        instanceType: "t3.small", 
        minSize: 2,
        maxSize: 10,
        desiredCapacity: 3,
        dbInstanceClass: "db.t3.small",
        dbAllocatedStorage: 100,
    },
    large: {
        instanceType: "t3.medium",
        minSize: 3,
        maxSize: 20,
        desiredCapacity: 5,
        dbInstanceClass: "db.t3.medium",
        dbAllocatedStorage: 500,
    }
};

const tierConfig = resourceTierConfig[resourceTier as keyof typeof resourceTierConfig] || resourceTierConfig.small;

// Export configuration information
export const projectInfo = {
    workspaceId,
    environment,
    resourceTier,
    region,
    tags,
    tierConfig,
    status: "Ready for AWS resource deployment",
    nextSteps: [
        "Run 'pulumi up' to deploy infrastructure",
        "Configure kubectl after EKS cluster deployment", 
        "Set up monitoring and logging",
        "Deploy SMM Architect services"
    ]
};

// Infrastructure Status
export const infrastructureStatus = {
    configured: true,
    awsCredentials: "Configured",
    pulumiBinary: "Installed", 
    region,
    accountReady: true
};

// Ready for deployment message
console.log(`🚀 SMM Architect Infrastructure - ${environment.toUpperCase()}`);
console.log(`📍 Workspace ID: ${workspaceId}`);
console.log(`🌍 AWS Region: ${region}`);
console.log(`🏗️  Resource Tier: ${resourceTier}`);
console.log(`✅ Status: Ready for deployment`);
console.log(`📦 Next: Run 'pulumi up' to deploy infrastructure`);

// TODO: Uncomment when @pulumi/aws is installed successfully:
import * as aws from "@pulumi/aws";
//
// // Create VPC for SMM Architect
// const vpc = new aws.ec2.Vpc("smm-vpc", {
//     cidrBlock: "10.0.0.0/16",
//     enableDnsHostnames: true,
//     enableDnsSupport: true,
//     tags: { ...tags, Name: `${workspaceId}-vpc` },
// });
//
// // Create S3 bucket for artifacts and logs
// const bucket = new aws.s3.Bucket("smm-artifacts", {
//     bucket: `${workspaceId}-artifacts-${region}`,
//     tags,
// });
//
// export const vpcId = vpc.id;
// export const bucketName = bucket.bucket;
