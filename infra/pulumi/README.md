# Pulumi Infrastructure Templates

This directory contains Pulumi templates for provisioning complete SMM Architect workspace infrastructure on AWS with Kubernetes.

## Overview

The Pulumi workspace template provides Infrastructure as Code (IaC) for deploying:

- **VPC and Networking**: Secure multi-AZ network setup
- **EKS Cluster**: Managed Kubernetes for container orchestration
- **RDS PostgreSQL**: Primary database for application data
- **ElastiCache Redis**: Caching and session storage
- **S3 Buckets**: Content storage and audit logs
- **IAM Roles**: Secure service authentication
- **Security Groups**: Network-level security controls
- **Monitoring**: CloudWatch integration for observability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Region (Multi-AZ)                    │
├─────────────────────────────────────────────────────────────┤
│  VPC (10.0.0.0/16)                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Public Subnet  │  │  Public Subnet  │  │ Public Sub. │ │
│  │   (10.0.1.0/24) │  │   (10.0.2.0/24) │  │(10.0.3.0/24)│ │
│  │                 │  │                 │  │             │ │
│  │  ┌───────────┐  │  │  ┌───────────┐  │  │             │ │
│  │  │EKS Cluster│  │  │  │EKS Cluster│  │  │   NAT GW    │ │
│  │  │   Nodes   │  │  │  │   Nodes   │  │  │             │ │
│  │  └───────────┘  │  │  └───────────┘  │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Private Subnet  │  │ Private Subnet  │  │Private Sub. │ │
│  │  (10.0.11.0/24) │  │  (10.0.12.0/24) │  │(10.0.13.0/24│ │
│  │                 │  │                 │  │             │ │
│  │ ┌─────────────┐ │  │ ┌─────────────┐ │  │             │ │
│  │ │RDS Primary  │ │  │ │RDS Standby  │ │  │   Redis     │ │
│  │ │(PostgreSQL) │ │  │ │(PostgreSQL) │ │  │  Cluster    │ │
│  │ └─────────────┘ │  │ └─────────────┘ │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                      External Services                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │S3 - Content │  │S3 - Audit   │  │   CloudWatch        │  │
│  │   Storage   │  │    Logs     │  │   Monitoring        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Resource Tiers

### Small (Development/Testing)
- **EKS**: 2-5 t3.medium nodes
- **Database**: db.t3.micro, 20GB storage
- **Redis**: cache.t3.micro
- **Cost**: ~$150-300/month

### Medium (Staging/Small Production)
- **EKS**: 3-10 t3.large nodes
- **Database**: db.t3.small, 100GB storage
- **Redis**: cache.t3.small
- **Cost**: ~$400-800/month

### Large (Production)
- **EKS**: 5-20 t3.xlarge nodes
- **Database**: db.t3.medium, 500GB storage
- **Redis**: cache.t3.medium with Multi-AZ
- **Cost**: ~$1,000-2,500/month

### Enterprise (High-Scale Production)
- **EKS**: 10-50 c5.2xlarge nodes
- **Database**: db.r5.large, 1TB storage with Multi-AZ
- **Redis**: cache.r5.large cluster mode
- **Cost**: ~$3,000-8,000/month

## Quick Start

### Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Pulumi CLI** installed and logged in
3. **Node.js 18+** for running the template
4. **kubectl** for Kubernetes management

### Installation

1. **Clone the template**:
   ```bash
   pulumi new https://github.com/yourorg/smm-architect/tree/main/infra/pulumi/templates
   cd my-smm-workspace
   ```

2. **Configure your workspace**:
   ```bash
   # Copy example configuration
   cp ../examples/Pulumi.dev.yaml Pulumi.dev.yaml
   
   # Edit configuration
   nano Pulumi.dev.yaml
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Deploy infrastructure**:
   ```bash
   pulumi stack init dev
   pulumi up
   ```

### Manual Setup

1. **Create new Pulumi project**:
   ```bash
   mkdir my-smm-workspace
   cd my-smm-workspace
   pulumi new typescript
   ```

2. **Copy template files**:
   ```bash
   cp /path/to/workspace-template.ts index.ts
   cp /path/to/package.json package.json
   ```

3. **Configure workspace**:
   ```bash
   pulumi config set workspace:workspaceId "my-workspace-001"
   pulumi config set workspace:tenantId "my-tenant"
   pulumi config set workspace:environment "development"
   # ... set other configuration values
   ```

## Configuration

### Required Configuration

```yaml
workspace:
  workspaceId: "unique-workspace-id"    # Must be unique across all workspaces
  tenantId: "tenant-identifier"        # Your organization identifier
  environment: "development"           # development/staging/production
  region: "us-east-1"                  # AWS region for deployment
  resourceTier: "medium"               # small/medium/large/enterprise
```

### Feature Flags

```yaml
features:
  enableHighAvailability: true         # Multi-AZ deployment
  enableAutoScaling: true              # Auto-scaling node groups
  enableDataEncryption: true           # Encryption at rest and in transit
  enableAuditLogging: true             # CloudTrail and container logging
  enableMonitoring: true               # CloudWatch and Prometheus
  enableBackup: true                   # Automated backups
```

### Security Configuration

```yaml
security:
  enableVault: true                    # Deploy Vault for secrets management
  vaultIntegration: "aws-kms"          # KMS integration for Vault
  enableOPA: true                      # Open Policy Agent for governance
  enableNetworkPolicies: true          # Kubernetes network policies
  allowedCidrs:                        # IP ranges allowed to access cluster
    - "10.0.0.0/8"
    - "172.16.0.0/12"
```

## Deployment

### Development Environment

```bash
# Set stack
pulumi stack select dev

# Configure for development
pulumi config set workspace:environment development
pulumi config set workspace:resourceTier small
pulumi config set workspace:features.enableHighAvailability false

# Deploy
pulumi up
```

### Production Environment

```bash
# Set stack
pulumi stack select prod

# Configure for production
pulumi config set workspace:environment production
pulumi config set workspace:resourceTier large
pulumi config set workspace:features.enableHighAvailability true
pulumi config set --secret workspace:monitoring.slackWebhookUrl "https://hooks.slack.com/..."

# Deploy
pulumi up
```

## Post-Deployment Setup

### 1. Configure kubectl

```bash
# Get kubeconfig
pulumi stack output kubeconfig > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

### 2. Deploy SMM Architect Services

```bash
# Apply Kubernetes manifests
kubectl apply -f ../../services/k8s/

# Or use Helm
helm install smm-architect ./helm-chart
```

### 3. Configure Database

```bash
# Get database connection info
DB_ENDPOINT=$(pulumi stack output databaseEndpoint)
DB_USERNAME=$(pulumi stack output databaseUsername)
DB_PASSWORD=$(aws ssm get-parameter --name "/smm-architect/$WORKSPACE_ID/db-password" --with-decryption --query "Parameter.Value" --output text)

# Run database migrations
npm run migrate
```

### 4. Set up Monitoring

```bash
# Install monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Deploy Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring

# Deploy Grafana
helm install grafana grafana/grafana -n monitoring
```

## Outputs

The template provides the following outputs:

### Infrastructure
- `vpcId`: VPC identifier
- `publicSubnetIds`: Public subnet identifiers
- `privateSubnetIds`: Private subnet identifiers (if enabled)

### EKS Cluster
- `eksClusterName`: EKS cluster name
- `eksClusterEndpoint`: API server endpoint
- `kubeconfig`: Complete kubeconfig for cluster access

### Database
- `databaseEndpoint`: RDS endpoint
- `databasePort`: Database port (5432)
- `databaseName`: Database name
- `databaseUsername`: Database username

### Storage
- `contentBucketName`: S3 bucket for content storage
- `auditBucketName`: S3 bucket for audit logs

## Monitoring and Observability

### CloudWatch Integration

The template automatically configures:
- EKS cluster logging (API, audit, authenticator, etc.)
- RDS performance insights
- ElastiCache metrics
- VPC flow logs (if audit logging enabled)

### Prometheus Integration

When monitoring is enabled:
- Kubernetes metrics collection
- Application metrics scraping
- Custom SMM Architect metrics

### Alerting

Configure alerts for:
- High CPU/memory usage
- Database connection issues
- Storage capacity thresholds
- Security policy violations

## Security Best Practices

### Network Security
- Private subnets for databases and cache
- Security groups with minimal required access
- VPC endpoints for AWS services (optional)
- Network ACLs for additional layer security

### Data Protection
- Encryption at rest for all storage
- Encryption in transit with TLS
- IAM roles with least privilege
- Secrets stored in AWS Parameter Store

### Access Control
- RBAC for Kubernetes cluster
- IAM roles for service accounts
- Network policies for pod-to-pod communication
- API server endpoint access restrictions

## Troubleshooting

### Common Issues

1. **EKS node group fails to create**:
   - Check IAM permissions
   - Verify subnet configuration
   - Ensure instance type availability

2. **Database connection failures**:
   - Verify security group rules
   - Check subnet group configuration
   - Confirm database is in available state

3. **S3 access denied**:
   - Check bucket policies
   - Verify IAM role permissions
   - Ensure correct region configuration

### Debugging Commands

```bash
# Check Pulumi state
pulumi stack
pulumi config
pulumi stack output

# Verify AWS resources
aws eks describe-cluster --name $(pulumi stack output eksClusterName)
aws rds describe-db-instances --db-instance-identifier $(pulumi stack output databaseEndpoint | cut -d. -f1)

# Check Kubernetes
kubectl get nodes
kubectl get pods -A
kubectl describe node
```

## Maintenance

### Regular Tasks

1. **Update cluster version**:
   ```bash
   pulumi config set eks:version "1.29"
   pulumi up
   ```

2. **Scale resources**:
   ```bash
   pulumi config set workspace:resourceTier large
   pulumi up
   ```

3. **Backup verification**:
   ```bash
   aws rds describe-db-snapshots --db-instance-identifier $DB_INSTANCE
   ```

### Cost Optimization

1. **Use Spot instances** for development environments
2. **Right-size resources** based on actual usage
3. **Enable auto-scaling** to handle traffic patterns
4. **Schedule shutdown** for non-production environments

## Migration

### Upgrading Resource Tiers

```bash
# Small to Medium
pulumi config set workspace:resourceTier medium
pulumi up

# Enable high availability
pulumi config set workspace:features.enableHighAvailability true
pulumi up
```

### Cross-Region Migration

```bash
# Deploy to new region
pulumi config set workspace:region us-west-2
pulumi up

# Migrate data (manual process)
# Update DNS records
# Decommission old region
```

## Support

### Documentation
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Pulumi AWS Guide](https://www.pulumi.com/docs/clouds/aws/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

### Community
- [SMM Architect Discussions](https://github.com/yourorg/smm-architect/discussions)
- [Pulumi Community Slack](https://slack.pulumi.com/)

### Enterprise Support
- Email: infrastructure@smmarchitect.com
- Slack: #infrastructure-support

---

**Last Updated**: December 2024  
**Template Version**: 1.0.0  
**Pulumi Version**: 3.96+