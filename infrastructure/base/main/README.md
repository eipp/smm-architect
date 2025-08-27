# SMM Architect Infrastructure

Complete Infrastructure-as-Code setup for SMM Architect using Pulumi and AWS.

## 🚀 Quick Start

The infrastructure is now configured and ready for deployment!

### Current Status
✅ **Pulumi Project**: Initialized and deployed  
✅ **AWS Credentials**: Configured (Account: 288761728065)  
✅ **Base Configuration**: Ready  
⚠️  **AWS Resources**: Pending provider installation  

### Next Steps

1. **Check Status**
   ```bash
   ./status.sh
   ```

2. **Install AWS Provider** (when memory allows)
   ```bash
   npm install @pulumi/aws
   ```

3. **Deploy Infrastructure**
   ```bash
   ./deploy.sh
   ```

## 📁 Project Structure

```
infra/main/
├── index.ts          # Main infrastructure configuration
├── Pulumi.yaml       # Project definition
├── package.json      # Dependencies
├── .env             # Environment variables
├── deploy.sh        # Deployment script
├── status.sh        # Status checker
└── Pulumi.dev.yaml  # Stack configuration
```

## ⚙️ Configuration

### Current Environment: Development
- **Stack**: `dev`
- **AWS Region**: `us-east-1`
- **Resource Tier**: `small` (t3.micro instances)
- **Workspace ID**: `smm-architect-dev`

### Resource Tiers Available
- **Small**: t3.micro, 1-3 nodes, db.t3.micro (Development)
- **Medium**: t3.small, 2-10 nodes, db.t3.small (Staging)
- **Large**: t3.medium, 3-20 nodes, db.t3.medium (Production)

## 🏗️ Planned Infrastructure

When AWS provider is installed, the following resources will be deployed:

### Core Infrastructure
- **VPC**: `10.0.0.0/16` with public/private subnets
- **EKS Cluster**: Managed Kubernetes for services
- **RDS PostgreSQL**: Database for application data
- **ElastiCache Redis**: Caching and session storage
- **S3 Buckets**: Content storage and audit logs

### Security & Networking
- **Security Groups**: Network-level access controls
- **IAM Roles**: Service authentication and permissions
- **VPC Endpoints**: Secure service communication
- **Load Balancer**: Application traffic distribution

### Monitoring & Logging
- **CloudWatch**: Metrics and alerting
- **VPC Flow Logs**: Network traffic monitoring
- **CloudTrail**: API call auditing

## 🎯 Usage

### Deploy Infrastructure
```bash
# Preview changes
pulumi preview

# Deploy changes
pulumi up

# Or use the helper script
./deploy.sh
```

### Manage Stacks
```bash
# Switch to staging
pulumi stack select staging

# Create production stack
pulumi stack init prod
pulumi config set workspace:environment production
pulumi config set workspace:resourceTier large
```

### Check Status
```bash
# Quick status check
./status.sh

# Detailed stack info
pulumi stack output
pulumi stack export
```

### Cleanup
```bash
# Destroy resources
pulumi destroy

# Remove stack
pulumi stack rm dev
```

## 🔧 Configuration Options

### Environment Variables (.env)
```bash
PULUMI_STACK=dev
AWS_REGION=us-east-1
WORKSPACE_ID=smm-architect-dev
ENVIRONMENT=development
RESOURCE_TIER=small
```

### Pulumi Configuration
```bash
# Set workspace configuration
pulumi config set workspace:id \"my-workspace\"
pulumi config set workspace:environment \"production\"
pulumi config set workspace:resourceTier \"large\"

# Set AWS configuration
pulumi config set aws:region us-west-2
```

## 🐛 Troubleshooting

### Common Issues

1. **Memory Error During npm install**
   ```bash
   # Increase Node.js memory
   NODE_OPTIONS=\"--max-old-space-size=4096\" npm install @pulumi/aws
   ```

2. **AWS Credentials Not Found**
   ```bash
   aws configure
   # Or set environment variables:
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   ```

3. **Pulumi Not Logged In**
   ```bash
   pulumi login
   ```

### Getting Help
- **Pulumi Console**: https://app.pulumi.com/eipp/smm-architect-infra
- **AWS Account**: 288761728065
- **Status Script**: `./status.sh`

## 🔒 Security Notes

- AWS credentials are configured for user `claude_mcp`
- All resources are tagged with environment and project information
- Resource access is scoped to workspace boundaries
- Secrets should be managed through AWS Secrets Manager or Pulumi config secrets

## 📈 Monitoring

Once deployed, monitor your infrastructure through:
- **Pulumi Console**: Resource status and updates
- **AWS CloudWatch**: Metrics and logs
- **AWS Cost Explorer**: Cost analysis and optimization

## 🚨 Important

This setup is currently in **configuration mode**. To deploy actual AWS resources:
1. Install the AWS provider: `npm install @pulumi/aws`
2. Uncomment AWS resources in `index.ts`
3. Run `./deploy.sh` to deploy

The current deployment only includes the Pulumi stack configuration and is ready for resource deployment when the provider is available.