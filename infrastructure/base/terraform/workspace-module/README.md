# SMM Architect Terraform Workspace Module

This Terraform module provides Infrastructure as Code (IaC) for provisioning and managing SMM Architect workspaces in Kubernetes environments. It serves as an alternative to the Pulumi implementation, offering multi-tenant workspace provisioning with comprehensive security, monitoring, and resource management capabilities.

## Features

### Core Functionality
- **Multi-tenant Kubernetes namespace provisioning** with proper isolation
- **HashiCorp Vault integration** for secrets management and audit signing
- **Kubernetes RBAC** with least-privilege service accounts
- **Network policies** for tenant isolation and security
- **Resource quotas** for cost control and resource management
- **Comprehensive monitoring** and observability configuration

### Security Features
- Pod Security Standards enforcement (restricted profile)
- Network policies for default-deny and workspace-internal communication
- Vault-based secrets management with workspace-specific policies
- Transit encryption keys for audit bundle signing
- RBAC with fine-grained permissions

### Resource Management
- Configurable CPU, memory, and storage quotas
- Database and Redis resource allocation
- Workspace API scaling configuration
- Storage class selection for performance optimization

### Observability
- Prometheus monitoring integration
- Centralized logging configuration
- Configurable retention policies
- Backup and disaster recovery setup

## Quick Start

### Prerequisites

1. **Kubernetes cluster** (1.24+) with the following components:
   - RBAC enabled
   - Network policy support
   - Storage classes configured
   - Pod Security Standards admission controller

2. **HashiCorp Vault** instance with:
   - Kubernetes authentication method enabled
   - Transit secrets engine enabled
   - KV v2 secrets engine enabled

3. **Terraform** (1.0+) with the following providers:
   - `hashicorp/kubernetes` ~> 2.23
   - `hashicorp/helm` ~> 2.11
   - `hashicorp/vault` ~> 3.20
   - `hashicorp/random` ~> 3.5

### Basic Usage

```hcl
module "workspace" {
  source = "./workspace-module"
  
  tenant_id       = "acme-corp"
  workspace_owner = "team@acme-corp.com"
  environment     = "production"
  
  # Resource quotas
  quota_cpu_requests    = "2"
  quota_memory_requests = "4Gi"
  quota_storage_requests = "50Gi"
  
  # Vault configuration
  vault_address = "https://vault.company.com"
  vault_token   = var.vault_token
}
```

### Advanced Configuration

```hcl
module "advanced_workspace" {
  source = "./workspace-module"
  
  tenant_id       = "enterprise-client"
  workspace_id    = "prod-marketing-001"
  workspace_owner = "marketing@enterprise-client.com"
  environment     = "production"
  billing_id      = "dept-marketing"
  
  # Enhanced resource quotas
  quota_cpu_requests    = "8"
  quota_cpu_limits      = "16"
  quota_memory_requests = "16Gi"
  quota_memory_limits   = "32Gi"
  quota_storage_requests = "200Gi"
  quota_pod_count       = "50"
  
  # High-performance database
  database_cpu_request    = "1"
  database_cpu_limit      = "4"
  database_memory_request = "2Gi"
  database_memory_limit   = "8Gi"
  database_storage_size   = "100Gi"
  database_storage_class  = "fast-ssd"
  
  # Highly available API
  workspace_api_replicas      = 5
  workspace_api_cpu_request   = "1"
  workspace_api_cpu_limit     = "4"
  workspace_api_memory_request = "2Gi"
  workspace_api_memory_limit   = "8Gi"
  
  # Enhanced monitoring and backup
  enable_monitoring     = true
  enable_logging        = true
  log_retention_days    = 365
  enable_backups        = true
  backup_schedule       = "0 */6 * * *" # Every 6 hours
  backup_retention_days = 180
  
  # Advanced features
  enable_advanced_features     = true
  enable_experimental_features = false
  
  custom_labels = {
    "cost-center"     = "marketing"
    "compliance"      = "gdpr-required"
    "backup-priority" = "high"
  }
}
```

## Input Variables

### Required Variables

| Name | Description | Type |
|------|-------------|------|
| `tenant_id` | Unique identifier for the tenant | `string` |
| `workspace_owner` | Email address of the workspace owner | `string` |
| `vault_token` | Vault authentication token | `string` |

### Optional Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `workspace_id` | Unique identifier for the workspace (auto-generated if empty) | `string` | `""` |
| `environment` | Environment name (development, staging, production) | `string` | `"development"` |
| `billing_id` | Billing identifier for cost allocation | `string` | `""` |
| `kubeconfig_path` | Path to kubeconfig file | `string` | `"~/.kube/config"` |
| `vault_address` | Vault server address | `string` | `"https://vault.vault.svc.cluster.local:8200"` |

### Resource Quota Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `quota_cpu_requests` | CPU requests quota for the workspace | `string` | `"2"` |
| `quota_cpu_limits` | CPU limits quota for the workspace | `string` | `"4"` |
| `quota_memory_requests` | Memory requests quota for the workspace | `string` | `"4Gi"` |
| `quota_memory_limits` | Memory limits quota for the workspace | `string` | `"8Gi"` |
| `quota_storage_requests` | Storage requests quota for the workspace | `string` | `"50Gi"` |
| `quota_pod_count` | Maximum number of pods | `string` | `"20"` |

### Database Configuration Variables

| Name | Description | Type | Default |
|------|-------------|------|---------|
| `database_cpu_request` | CPU request for database pod | `string` | `"250m"` |
| `database_cpu_limit` | CPU limit for database pod | `string` | `"1"` |
| `database_memory_request` | Memory request for database pod | `string` | `"512Mi"` |
| `database_memory_limit` | Memory limit for database pod | `string` | `"2Gi"` |
| `database_storage_size` | Storage size for database persistent volume | `string` | `"20Gi"` |
| `database_storage_class` | Storage class for database persistent volume | `string` | `"fast-ssd"` |

See `variables.tf` for complete list of configuration options.

## Outputs

### Primary Outputs

| Name | Description |
|------|-------------|
| `workspace_id` | The unique identifier for the created workspace |
| `namespace_name` | The Kubernetes namespace for the workspace |
| `workspace_endpoints` | The endpoints for accessing workspace services |
| `vault_secret_paths` | The Vault secret paths used by this workspace |

### Connection Information

| Name | Description |
|------|-------------|
| `database_connection` | Database connection information |
| `redis_connection` | Redis connection information |

### Security Information

| Name | Description |
|------|-------------|
| `service_account_name` | The name of the workspace service account |
| `vault_policy_name` | The name of the Vault policy for this workspace |
| `transit_key_name` | The name of the Vault transit key for audit signing |

See `outputs.tf` for complete list of outputs.

## Architecture

### Resource Hierarchy

```
Tenant Namespace (smm-tenant-{tenant_id})
├── Service Account (workspace-specific)
├── RBAC Role & Binding
├── Network Policies
│   ├── Default Deny All
│   └── Workspace Internal Allow
├── Resource Quota
├── Database Resources
│   ├── PostgreSQL StatefulSet
│   ├── PVC (fast-ssd storage)
│   └── Service
├── Redis Resources
│   ├── Redis Deployment
│   ├── PVC
│   └── Service
└── Workspace API
    ├── Deployment (multi-replica)
    ├── Service
    └── Ingress (optional)
```

### Vault Integration

```
Vault Structure:
├── Policy: smm-workspace-{tenant_id}
├── Auth Role: smm-workspace-{tenant_id}
├── Secrets:
│   ├── secret/workspaces/{workspace_id}/config
│   ├── secret/workspaces/{workspace_id}/database
│   └── secret/tenant/{tenant_id}/*
└── Transit Key: smm-audit-{tenant_id}
```

### Security Model

- **Namespace Isolation**: Each tenant gets a dedicated namespace
- **Network Policies**: Default deny with explicit allow rules
- **RBAC**: Least-privilege service accounts
- **Pod Security**: Restricted security standards enforced
- **Secrets Management**: Vault integration with dynamic secrets
- **Audit Signing**: Dedicated transit keys for cryptographic signatures

## Monitoring and Observability

### Metrics Collection

The module configures Prometheus monitoring for:
- Resource utilization (CPU, memory, storage)
- Application metrics (workspace API)
- Database and Redis metrics
- Network policy enforcement

### Logging

Centralized logging configuration includes:
- Application logs (workspace API)
- Database logs
- Audit logs
- System events

### Alerting

Pre-configured alerts for:
- Resource quota violations
- Pod restart loops
- Database connectivity issues
- Vault authentication failures

## Backup and Disaster Recovery

### Automated Backups

- **Database Backups**: Scheduled PostgreSQL dumps
- **Volume Snapshots**: Kubernetes volume snapshots
- **Configuration Backups**: Vault secret exports

### Recovery Procedures

1. **Namespace Recreation**: Terraform apply recreates namespace
2. **Database Recovery**: Restore from backup snapshots
3. **Secret Recovery**: Re-provision from Vault
4. **Application Recovery**: Rolling deployment restart

## Cost Management

### Resource Optimization

- **Right-sizing**: Configurable resource requests and limits
- **Storage Tiering**: Multiple storage classes available
- **Auto-scaling**: HPA configuration for workspace API
- **Quota Enforcement**: Hard limits prevent cost overruns

### Billing Integration

- Custom labels for cost allocation
- Billing ID annotation for chargeback
- Resource usage tracking via Prometheus

## Security Best Practices

### Network Security

- Default deny network policies
- Explicit allow rules for required communication
- Service mesh integration (optional)
- TLS encryption for all communications

### Access Control

- Kubernetes RBAC with minimal privileges
- Vault-based secret management
- Service account token rotation
- Audit logging for all access

### Compliance

- GDPR-compliant data handling
- SOX audit trail requirements
- Regulatory compliance annotations
- Data retention policies

## Troubleshooting

### Common Issues

1. **Vault Authentication Failures**
   ```bash
   kubectl logs -n {namespace} {pod-name}
   # Check Vault policy and role configuration
   ```

2. **Resource Quota Exceeded**
   ```bash
   kubectl describe resourcequota -n {namespace}
   # Increase quotas or optimize resource usage
   ```

3. **Network Policy Issues**
   ```bash
   kubectl describe networkpolicy -n {namespace}
   # Verify policy rules and pod labels
   ```

4. **Database Connection Issues**
   ```bash
   kubectl exec -n {namespace} {pod} -- pg_isready -h {host}
   # Check database pod status and network connectivity
   ```

### Debugging Commands

```bash
# Check workspace status
kubectl get all -n smm-tenant-{tenant_id}

# Verify resource quota usage
kubectl describe resourcequota -n smm-tenant-{tenant_id}

# Check Vault integration
kubectl describe serviceaccount -n smm-tenant-{tenant_id}

# Network policy troubleshooting
kubectl describe networkpolicy -n smm-tenant-{tenant_id}

# Database logs
kubectl logs -n smm-tenant-{tenant_id} {postgres-pod}

# Workspace API logs
kubectl logs -n smm-tenant-{tenant_id} deployment/{workspace-api}
```

## Contributing

### Development Setup

1. Clone the repository
2. Configure local Kubernetes cluster
3. Set up Vault instance
4. Create `terraform.tfvars` file with configuration
5. Run `terraform plan` to validate

### Testing

```bash
# Validate Terraform configuration
terraform validate

# Run plan with test variables
terraform plan -var-file="test.tfvars"

# Apply to test environment
terraform apply -var-file="test.tfvars"

# Destroy test resources
terraform destroy -var-file="test.tfvars"
```

### Code Standards

- Use consistent naming conventions
- Add validation rules for all variables
- Include comprehensive documentation
- Follow Terraform best practices
- Use semantic versioning for releases

## License

This module is part of the SMM Architect project and follows the same licensing terms.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Terraform and Kubernetes logs
3. Consult the SMM Architect documentation
4. Contact the development team

---

*This module provides production-ready Infrastructure as Code for SMM Architect workspace provisioning with comprehensive security, monitoring, and multi-tenant support.*