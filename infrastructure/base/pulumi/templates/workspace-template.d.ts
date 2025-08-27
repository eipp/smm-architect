import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
export interface WorkspaceConfig {
    workspaceId: string;
    tenantId: string;
    environment: "development" | "staging" | "production";
    region: "us-east-1" | "us-west-2" | "eu-west-1" | "ap-southeast-1";
    resourceTier: "small" | "medium" | "large" | "enterprise";
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
        vaultIntegration: "aws-kms" | "gcp-kms" | "azure-kv";
        enableOPA: boolean;
        enableNetworkPolicies: boolean;
        allowedCidrs: string[];
    };
    storage: {
        databaseSize: string;
        storageClass: "standard" | "ssd" | "nvme";
        backupRetentionDays: number;
        enablePointInTimeRecovery: boolean;
    };
    monitoring: {
        enablePrometheus: boolean;
        enableGrafana: boolean;
        enableAlertManager: boolean;
        slackWebhookUrl?: string;
        pagerDutyApiKey?: string;
    };
}
export declare const outputs: {
    vpcId: pulumi.Output<string>;
    publicSubnetIds: Promise<pulumi.Output<string>[]>;
    privateSubnetIds: any;
    eksClusterName: pulumi.Output<string>;
    eksClusterEndpoint: pulumi.Output<string>;
    eksClusterCertificateAuthority: pulumi.Output<aws.types.output.eks.ClusterCertificateAuthority>;
    kubeconfig: any;
    databaseEndpoint: pulumi.Output<string>;
    databasePort: pulumi.OutputInstance<number>;
    databaseName: pulumi.Output<string>;
    databaseUsername: pulumi.Output<string>;
    redisEndpoint: any;
    redisPort: pulumi.OutputInstance<number | undefined>;
    contentBucketName: pulumi.Output<string>;
    contentBucketArn: pulumi.Output<string>;
    auditBucketName: pulumi.Output<string> | undefined;
    auditBucketArn: pulumi.Output<string> | undefined;
    eksClusterSecurityGroupId: pulumi.Output<string>;
    databaseSecurityGroupId: pulumi.Output<string>;
    redisSecurityGroupId: pulumi.Output<string>;
    workspaceId: string;
    environment: "development" | "staging" | "production";
    resourceTier: "small" | "medium" | "large" | "enterprise";
    region: "us-east-1" | "us-west-2" | "eu-west-1" | "ap-southeast-1";
};
//# sourceMappingURL=workspace-template.d.ts.map