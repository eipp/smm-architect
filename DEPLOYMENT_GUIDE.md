# SMM Architect Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the SMM Architect platform across different environments. The platform uses Infrastructure as Code (IaC) with Pulumi for AWS deployment, HashiCorp Vault for secrets management, and Kubernetes for container orchestration.

## Prerequisites

### Required Tools

- **Node.js** 18+ and pnpm 8.15.0
- **Encore CLI**: `npm install -g @encore/cli`
- **Pulumi CLI**: [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
- **AWS CLI**: [Install AWS CLI](https://aws.amazon.com/cli/)
- **Kubernetes CLI** (kubectl): [Install kubectl](https://kubernetes.io/docs/tasks/tools/)
- **Docker**: [Install Docker](https://docs.docker.com/get-docker/)
- **HashiCorp Vault CLI**: [Install Vault](https://www.vaultproject.io/downloads)

### AWS Account Setup

1. **AWS Account**: Active AWS account with appropriate permissions
2. **IAM Role**: Create deployment role with required permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "ec2:*",
           "eks:*",
           "rds:*",
           "s3:*",
           "kms:*",
           "iam:*",
           "elasticache:*",
           "secretsmanager:*",
           "cloudformation:*"
         ],
         "Resource": "*"
       }
     ]
   }
   ```

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, and preferred region
   ```

## Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/yourorg/smm-architect.git
cd smm-architect
npm install -g pnpm@8.15.0
pnpm install
```

### 2. Environment Configuration

Create environment-specific configuration files:

```bash
# Development
cp infrastructure/environments/development/config.ts.example infrastructure/environments/development/config.ts

# Staging  
cp infrastructure/environments/staging/config.ts.example infrastructure/environments/staging/config.ts

# Production
cp infrastructure/environments/production/config.ts.example infrastructure/environments/production/config.ts
```

Edit each configuration file according to your requirements.

### 3. Secrets Management Setup

#### Initialize Vault

```bash
# Start Vault in development mode (for testing)
vault server -dev -dev-root-token-id="root"

# In another terminal, configure Vault
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN="root"

# Enable required engines
vault auth enable approle
vault secrets enable -path=kv kv-v2
vault secrets enable database
vault secrets enable aws
```

#### Configure Vault Policies

```bash
# Create SMM Architect policy
vault policy write smm-architect - <<EOF
path "kv/data/smm-architect/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/creds/smm-*" {
  capabilities = ["read"]
}

path "aws/creds/smm-*" {
  capabilities = ["read"]
}
EOF

# Create AppRole
vault auth enable approle
vault write auth/approle/role/smm-architect \
    token_policies="smm-architect" \
    token_ttl=1h \
    token_max_ttl=4h
```

## Infrastructure Deployment

### 1. Pulumi Stack Initialization

```bash
cd infrastructure/pulumi

# Initialize Pulumi stack for development
pulumi stack init dev
pulumi config set environment development
pulumi config set aws:region us-west-2

# For staging
pulumi stack init staging
pulumi config set environment staging
pulumi config set aws:region us-west-2

# For production
pulumi stack init prod
pulumi config set environment production
pulumi config set aws:region us-west-2
```

### 2. Deploy Infrastructure

#### Development Environment

```bash
cd infrastructure/pulumi
pulumi stack select dev
pulumi up

# This will create:
# - VPC with public/private subnets
# - EKS cluster with node groups
# - RDS PostgreSQL instance
# - ElastiCache Redis cluster
# - S3 bucket for storage
# - KMS keys for encryption
# - Secrets Manager for credentials
# - Application Load Balancer
```

#### Staging Environment

```bash
pulumi stack select staging
pulumi up
```

#### Production Environment

```bash
pulumi stack select prod
pulumi up
```

### 3. Verify Infrastructure

```bash
# Get cluster credentials
aws eks update-kubeconfig --region us-west-2 --name smm-architect-dev

# Verify cluster
kubectl get nodes
kubectl get namespaces

# Check RDS instance
aws rds describe-db-instances --query 'DBInstances[?DBName==`smmarchitect`]'

# Check S3 bucket
aws s3 ls | grep smm-architect
```

## Application Deployment

### 1. Build Services

```bash
# Build all services
pnpm build

# Or build specific services
pnpm build --filter=smm-architect-service
pnpm build --filter=model-router
pnpm build --filter=toolhub
```

### 2. Docker Images

```bash
# Build Docker images
make docker-build

# Or build individual images
docker build -t smm-architect/smm-service ./services/smm-architect
docker build -t smm-architect/model-router ./services/model-router
docker build -t smm-architect/toolhub ./services/toolhub
docker build -t smm-architect/frontend ./apps/frontend
```

### 3. Deploy to Kubernetes

```bash
cd infrastructure/kubernetes

# Deploy infrastructure components
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secrets.yaml
kubectl apply -f 03-rbac.yaml

# Deploy services
kubectl apply -f 10-smm-architect-service.yaml
kubectl apply -f 11-toolhub-service.yaml
kubectl apply -f 12-frontend-service.yaml
kubectl apply -f 13-model-router-service.yaml
kubectl apply -f 14-publisher-service.yaml
kubectl apply -f 15-agents-service.yaml

# Deploy networking
kubectl apply -f 20-istio-gateway.yaml
kubectl apply -f 21-istio-destination-rules.yaml
kubectl apply -f 22-istio-security.yaml
kubectl apply -f 23-network-policies.yaml

# Deploy monitoring
kubectl apply -f 30-monitoring.yaml

# Deploy storage
kubectl apply -f 40-storage.yaml
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n smm-architect

# Check services
kubectl get services -n smm-architect

# Check ingress
kubectl get ingress -n smm-architect

# View logs
kubectl logs -f deployment/smm-architect-service -n smm-architect
```

## Database Setup

### 1. Database Migration

```bash
# Connect to RDS instance
export DB_HOST=$(pulumi stack output databaseEndpoint)
export DB_PASSWORD=$(aws secretsmanager get-secret-value --secret-id smm-architect/dev/database/credentials --query SecretString --output text | jq -r .password)

# Run migrations
cd services/shared/database
npx prisma migrate deploy
npx prisma db seed
```

### 2. Redis Configuration

```bash
# Get Redis endpoint
export REDIS_HOST=$(pulumi stack output redisEndpoint)

# Test connection
redis-cli -h $REDIS_HOST ping
```

## Monitoring Setup

### 1. Prometheus Configuration

```bash
# Deploy Prometheus
kubectl apply -f monitoring/prometheus/prometheus.yml
kubectl apply -f monitoring/servicemonitors/enhanced-monitoring.yaml

# Deploy Grafana
helm repo add grafana https://grafana.github.io/helm-charts
helm install grafana grafana/grafana -n monitoring --create-namespace
```

### 2. Alerting Setup

```bash
# Deploy Alertmanager
kubectl apply -f monitoring/alertmanager/alertmanager.yml

# Configure alerts
kubectl apply -f monitoring/prometheus/rules/
```

### 3. Logging Setup

```bash
# Deploy ELK stack
kubectl apply -f monitoring/elasticsearch/elasticsearch-config.yaml
kubectl apply -f monitoring/fluentd/fluentd-config.yaml
kubectl apply -f monitoring/logging/logging-stack.yaml
```

## Security Configuration

### 1. Network Security

```bash
# Apply network policies
kubectl apply -f infrastructure/kubernetes/23-network-policies.yaml

# Configure Istio security
kubectl apply -f infrastructure/kubernetes/22-istio-security.yaml
```

### 2. RBAC Configuration

```bash
# Apply RBAC policies
kubectl apply -f infrastructure/kubernetes/03-rbac.yaml

# Verify RBAC
kubectl auth can-i create pods --as=system:serviceaccount:smm-architect:smm-service
```

### 3. Secrets Management

```bash
# Store secrets in Vault
vault kv put kv/smm-architect/database username=postgres password=secretpassword
vault kv put kv/smm-architect/jwt secret=your-jwt-secret
vault kv put kv/smm-architect/external/social-apis linkedin_client_id=your_client_id
```

## Environment-Specific Configurations

### Development Environment

- **Database**: Single instance, no backups
- **Redis**: Single node
- **Scaling**: Minimal resources
- **Security**: Reduced security measures
- **Monitoring**: Basic monitoring

### Staging Environment

- **Database**: Multi-AZ, daily backups
- **Redis**: Multi-node cluster
- **Scaling**: Moderate resources
- **Security**: Production-like security
- **Monitoring**: Full monitoring suite

### Production Environment

- **Database**: Multi-AZ, automated backups, read replicas
- **Redis**: Clustered, encrypted
- **Scaling**: Auto-scaling enabled
- **Security**: Full security suite (WAF, GuardDuty, Security Hub)
- **Monitoring**: Comprehensive monitoring and alerting

## Backup and Disaster Recovery

### 1. Database Backups

```bash
# Manual backup
aws rds create-db-snapshot \
    --db-instance-identifier smm-architect-prod-postgres \
    --db-snapshot-identifier smm-backup-$(date +%Y%m%d%H%M%S)

# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier smm-architect-restored \
    --db-snapshot-identifier smm-backup-20240101120000
```

### 2. Application Data Backup

```bash
# Backup S3 data
aws s3 sync s3://smm-architect-prod-storage s3://smm-architect-backup-storage

# Backup Kubernetes configurations
kubectl get all -n smm-architect -o yaml > smm-architect-k8s-backup.yaml
```

### 3. Disaster Recovery Testing

```bash
# Run disaster recovery drill
./scripts/dr-test.sh

# Verify recovery procedures
./scripts/verify-recovery.sh
```

## Troubleshooting

### Common Issues

1. **Pod Startup Failures**
   ```bash
   kubectl describe pod <pod-name> -n smm-architect
   kubectl logs <pod-name> -n smm-architect
   ```

2. **Database Connection Issues**
   ```bash
   # Check security groups
   aws ec2 describe-security-groups --group-ids <db-security-group-id>
   
   # Test connection
   telnet <db-endpoint> 5432
   ```

3. **Service Discovery Issues**
   ```bash
   # Check DNS resolution
   kubectl exec -it <pod-name> -n smm-architect -- nslookup <service-name>
   
   # Check service endpoints
   kubectl get endpoints -n smm-architect
   ```

### Log Analysis

```bash
# View aggregated logs
kubectl logs -l app=smm-architect-service -n smm-architect --tail=100

# Search logs
kubectl logs -l app=smm-architect-service -n smm-architect | grep ERROR

# Export logs
kubectl logs -l app=smm-architect-service -n smm-architect > app-logs.txt
```

## Performance Optimization

### 1. Resource Tuning

```bash
# Update resource limits
kubectl patch deployment smm-architect-service -n smm-architect -p '{"spec":{"template":{"spec":{"containers":[{"name":"smm-service","resources":{"limits":{"cpu":"2000m","memory":"4Gi"}}}]}}}}'

# Scale deployments
kubectl scale deployment smm-architect-service --replicas=5 -n smm-architect
```

### 2. Database Optimization

```bash
# Monitor slow queries
aws rds describe-db-log-files --db-instance-identifier smm-architect-prod-postgres

# Analyze performance insights
aws pi get-resource-metrics --service-type RDS --identifier <resource-id>
```

### 3. Caching Configuration

```bash
# Monitor Redis performance
redis-cli -h <redis-endpoint> --latency
redis-cli -h <redis-endpoint> info memory
```

## Security Best Practices

1. **Regular Security Updates**
   - Update base images monthly
   - Patch operating systems
   - Update Kubernetes version

2. **Access Control**
   - Use least privilege principle
   - Rotate access keys regularly
   - Enable MFA for all accounts

3. **Network Security**
   - Implement network segmentation
   - Use encryption in transit
   - Configure WAF rules

4. **Monitoring and Alerting**
   - Monitor for security events
   - Set up intrusion detection
   - Regular security assessments

## Maintenance Procedures

### 1. Regular Maintenance

```bash
# Weekly maintenance script
./scripts/weekly-maintenance.sh

# Monthly security updates
./scripts/security-updates.sh

# Quarterly disaster recovery test
./scripts/quarterly-dr-test.sh
```

### 2. Scaling Procedures

```bash
# Scale up for high traffic
kubectl scale deployment smm-architect-service --replicas=10 -n smm-architect

# Update auto-scaling policies
kubectl patch hpa smm-architect-hpa -n smm-architect -p '{"spec":{"maxReplicas":20}}'
```

### 3. Update Procedures

```bash
# Rolling update
kubectl set image deployment/smm-architect-service smm-service=smm-architect/smm-service:v2.0.0 -n smm-architect

# Rollback if needed
kubectl rollout undo deployment/smm-architect-service -n smm-architect
```

## Cost Optimization

1. **Resource Right-Sizing**
   - Monitor resource utilization
   - Adjust instance sizes based on usage
   - Use Spot instances for non-critical workloads

2. **Storage Optimization**
   - Implement data lifecycle policies
   - Use appropriate storage classes
   - Regular cleanup of unused data

3. **Network Optimization**
   - Use VPC endpoints to reduce data transfer costs
   - Optimize data transfer between regions
   - Implement efficient caching strategies

## Support and Documentation

- **Architecture Documentation**: See `/docs/architecture/`
- **API Documentation**: See `/docs/api/`
- **Troubleshooting Guide**: See `/docs/troubleshooting/`
- **Security Guidelines**: See `/docs/security/`
- **Performance Tuning**: See `/docs/performance/`

For additional support, contact the SMM Architect team or refer to the comprehensive documentation in the `/docs` directory.