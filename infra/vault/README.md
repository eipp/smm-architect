# Vault Configuration for SMM Architect

This directory contains comprehensive Vault configuration for the SMM Architect platform, including policies, mount configurations, and setup scripts.

## Overview

HashiCorp Vault provides secrets management, encryption as a service, and secure authentication for the SMM Architect platform. This configuration includes:

- **Service-specific policies**: Least-privilege access control for each microservice
- **Secret engines**: Dynamic credentials, encryption, and PKI infrastructure
- **Authentication methods**: Kubernetes service accounts and application roles
- **Audit logging**: Comprehensive security event tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Vault Cluster                            │
├─────────────────────────────────────────────────────────────┤
│  Authentication Methods                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Kubernetes  │  │  AppRole    │  │      Token          │ │
│  │    Auth     │  │    Auth     │  │      Auth           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Secret Engines                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   KV v2     │  │  Database   │  │      Transit        │ │
│  │  Secrets    │  │  Dynamic    │  │   Encryption        │ │
│  │             │  │   Creds     │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │     AWS     │  │     GCP     │  │        PKI          │ │
│  │   Dynamic   │  │   Dynamic   │  │   Certificates      │ │
│  │    Creds    │  │    Creds    │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Policies & Access Control                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Service   │  │   Agent     │  │      Admin          │ │
│  │  Policies   │  │  Policies   │  │     Policies        │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

1. **Vault cluster** deployed and initialized
2. **Kubernetes cluster** with SMM Architect namespace
3. **Vault CLI** installed and configured
4. **Admin access** to Vault for initial setup

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourorg/smm-architect.git
   cd smm-architect/infra/vault
   ```

2. **Set Vault environment**:
   ```bash
   export VAULT_ADDR="https://vault.yourdomain.com"
   export VAULT_TOKEN="your-admin-token"
   ```

3. **Run configuration script**:
   ```bash
   ./scripts/configure-vault.sh
   ```

4. **Verify configuration**:
   ```bash
   vault status
   vault auth list
   vault secrets list
   vault policy list
   ```

## Policies

### Service Policies

#### `smm-architect-policy.hcl`
- **Purpose**: Core SMM Architect service access
- **Permissions**: Workspace secrets, database credentials, KMS operations
- **Scope**: `/secret/data/smm-architect/*`, database dynamic credentials

#### `toolhub-policy.hcl`
- **Purpose**: ToolHub service for content and vector operations
- **Permissions**: Vector DB credentials, content storage, API keys
- **Scope**: `/secret/data/toolhub/*`, external API access

#### `agents-policy.hcl`
- **Purpose**: All agent services (research, planner, creative, etc.)
- **Permissions**: LLM API keys, social platform credentials, research APIs
- **Scope**: `/secret/data/agents/*`, platform-specific secrets

#### `policy-service-policy.hcl`
- **Purpose**: OPA policy service
- **Permissions**: Policy bundles, compliance data, signing keys
- **Scope**: `/secret/data/policy/*`, policy bundle operations

#### `audit-service-policy.hcl`
- **Purpose**: Audit and compliance service
- **Permissions**: Audit data, cryptographic operations, storage access
- **Scope**: `/secret/data/audit/*`, system audit logs

#### `simulator-policy.hcl`
- **Purpose**: Monte Carlo simulation service
- **Permissions**: Simulation parameters, test credentials
- **Scope**: `/secret/data/simulator/*`, test environment access

### Administrative Policies

#### `admin-policy.hcl`
- **Purpose**: Platform administrators
- **Permissions**: Full system access, policy management, mount configuration
- **Scope**: All paths with sudo capabilities

## Secret Engines

### Key-Value Store (KV v2)
**Mount**: `/secret`

```bash
# Application secrets
vault kv put secret/smm-architect/config \
    database_url="postgres://..." \
    redis_url="redis://..."

# API keys
vault kv put secret/agents/openai \
    api_key="sk-..." \
    organization="org-..."

# Social platform credentials
vault kv put secret/social-platforms/linkedin \
    client_id="..." \
    client_secret="..." \
    access_token="..."
```

### Database Engine
**Mount**: `/database`

```bash
# Configure PostgreSQL connection
vault write database/config/smm-architect-db \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/smmarchitect?sslmode=require" \
    allowed_roles="smm-architect-role" \
    username="vault" \
    password="vault-password"

# Create role for dynamic credentials
vault write database/roles/smm-architect-role \
    db_name=smm-architect-db \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### AWS Secrets Engine
**Mount**: `/aws`

```bash
# Configure AWS root credentials
vault write aws/config/root \
    access_key="AKIA..." \
    secret_key="..." \
    region="us-east-1"

# Create role for S3 access
vault write aws/roles/s3-content-role \
    credential_type=iam_user \
    policy_document=-<<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::smm-architect-content/*"
    }
  ]
}
EOF
```

### Transit Encryption
**Mount**: `/transit`

```bash
# Create encryption key
vault write -f transit/keys/smm-architect-data \
    type=aes256-gcm96

# Encrypt data
vault write transit/encrypt/smm-architect-data \
    plaintext=$(base64 <<< "sensitive data")

# Decrypt data
vault write transit/decrypt/smm-architect-data \
    ciphertext="vault:v1:..."
```

### PKI Infrastructure
**Mounts**: `/pki` (root), `/pki_int` (intermediate)

```bash
# Generate certificate for service
vault write pki_int/issue/smm-architect-role \
    common_name="smm-architect.svc.cluster.local" \
    ttl=24h
```

## Authentication

### Kubernetes Authentication

Services authenticate using Kubernetes service accounts:

```bash
# Configure from within a pod
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"

# Create role for service
vault write auth/kubernetes/role/smm-architect \
    bound_service_account_names=smm-architect \
    bound_service_account_namespaces=smm-architect \
    policies=smm-architect-policy \
    ttl=24h

# Authenticate from service
vault write auth/kubernetes/login \
    role=smm-architect \
    jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"
```

### AppRole Authentication

For CI/CD and non-Kubernetes applications:

```bash
# Enable AppRole auth
vault auth enable approle

# Create role
vault write auth/approle/role/ci-cd \
    policies=smm-architect-policy \
    token_ttl=1h \
    token_max_ttl=4h

# Get role credentials
vault read auth/approle/role/ci-cd/role-id
vault write -f auth/approle/role/ci-cd/secret-id

# Authenticate
vault write auth/approle/login \
    role_id="..." \
    secret_id="..."
```

## Secret Organization

### Hierarchical Structure

```
secret/
├── smm-architect/          # Core service secrets
│   ├── config/            # Configuration
│   ├── database/          # Database connections
│   └── external-apis/     # Third-party API keys
├── toolhub/               # ToolHub service secrets
│   ├── vector-db/         # Vector database credentials
│   ├── storage/           # Content storage credentials
│   └── ai-models/         # AI model API keys
├── agents/                # Agent service secrets
│   ├── research/          # Research agent specific
│   ├── creative/          # Creative agent specific
│   └── shared/            # Shared agent credentials
├── social-platforms/      # Social media platform credentials
│   ├── linkedin/          # LinkedIn API credentials
│   ├── twitter/           # Twitter API credentials
│   └── instagram/         # Instagram API credentials
├── workspaces/            # Workspace-scoped secrets
│   ├── ws-001/            # Workspace specific secrets
│   └── ws-002/            # Another workspace
└── compliance/            # Compliance and audit data
    ├── certifications/    # Security certifications
    └── audit-keys/        # Audit signing keys
```

### Workspace Isolation

Secrets are organized by workspace to ensure tenant isolation:

```bash
# Workspace-specific secrets
vault kv put secret/workspaces/ws-001/smm-architect/config \
    tenant_id="tenant-001" \
    custom_domain="tenant1.example.com"

vault kv put secret/workspaces/ws-001/agents/creative/config \
    brand_voice_model="custom-model-001" \
    content_templates="tenant1-templates"
```

## Security Best Practices

### Access Control

1. **Principle of Least Privilege**: Each service only has access to required secrets
2. **Time-limited Tokens**: All tokens have TTL with reasonable expiration
3. **Workspace Isolation**: Tenant secrets are completely isolated
4. **Audit Everything**: All access is logged and monitored

### Secret Rotation

```bash
# Rotate database credentials
vault write -f database/rotate-root/smm-architect-db

# Rotate AWS credentials
vault write -f aws/config/rotate-root

# Rotate transit encryption keys
vault write -f transit/keys/smm-architect-data/rotate
```

### Policy Testing

```bash
# Test policy permissions
vault policy read smm-architect-policy

# Test authentication
vault auth -method=kubernetes role=smm-architect

# Test secret access
vault kv get secret/smm-architect/config
```

## Deployment Integration

### Kubernetes Integration

Service accounts automatically authenticate and retrieve secrets:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: smm-architect
  namespace: smm-architect
  annotations:
    vault.hashicorp.com/role: "smm-architect"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smm-architect
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/smm-architect/config"
        vault.hashicorp.com/role: "smm-architect"
    spec:
      serviceAccountName: smm-architect
```

### Environment Variable Injection

```bash
# Using Vault Agent
vault agent -config=agent.hcl

# Using envconsul
envconsul -secret="secret/smm-architect/config" env
```

## Monitoring and Alerting

### Vault Metrics

Monitor key Vault metrics:
- Authentication success/failure rates
- Secret access patterns
- Token expiration rates
- Seal/unseal events

### Audit Log Analysis

```bash
# Search audit logs
grep "auth/kubernetes/login" /vault/logs/audit.log

# Monitor failed authentications
grep '"type":"request".*"error":' /vault/logs/audit.log

# Track secret access
grep '"path":"secret/' /vault/logs/audit.log
```

### Alerting Rules

Set up alerts for:
- Failed authentication attempts
- Unusual secret access patterns
- Token near expiration
- Vault seal/unseal events
- Policy violations

## Backup and Recovery

### Vault Snapshots

```bash
# Create snapshot
vault operator raft snapshot save backup.snap

# Restore snapshot
vault operator raft snapshot restore backup.snap
```

### Secret Backup

```bash
# Export secrets (for migration)
vault kv get -format=json secret/smm-architect/config

# Bulk export
vault kv export secret/ > secrets-backup.json
```

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   ```bash
   # Check service account token
   kubectl get serviceaccount smm-architect -o yaml
   
   # Verify Kubernetes auth config
   vault read auth/kubernetes/config
   
   # Check role binding
   vault read auth/kubernetes/role/smm-architect
   ```

2. **Permission Denied**:
   ```bash
   # Check policy
   vault policy read smm-architect-policy
   
   # Check token capabilities
   vault token capabilities secret/smm-architect/config
   
   # Check current token info
   vault token lookup
   ```

3. **Secret Not Found**:
   ```bash
   # List secrets
   vault kv list secret/smm-architect/
   
   # Check secret versions
   vault kv metadata secret/smm-architect/config
   
   # Check mount point
   vault secrets list
   ```

### Debug Commands

```bash
# Vault status
vault status
vault operator raft list-peers

# Authentication debug
vault auth list -detailed
vault auth -method=kubernetes -path=kubernetes role=smm-architect

# Policy debug
vault policy list
vault token capabilities secret/smm-architect/config

# Audit log analysis
tail -f /vault/logs/audit.log | jq '.'
```

## Maintenance

### Regular Tasks

1. **Monitor token expiration** and renew as needed
2. **Rotate secrets** according to security policy
3. **Review audit logs** for unusual patterns
4. **Update policies** as services evolve
5. **Backup Vault data** regularly

### Security Reviews

1. **Quarterly policy review** - ensure least privilege
2. **Annual secret rotation** - rotate long-lived secrets
3. **Access pattern analysis** - review who accesses what
4. **Compliance verification** - ensure audit requirements met

## Migration Guide

### From Environment Variables

```bash
# Current: Environment variables
export DATABASE_URL="postgres://..."
export REDIS_URL="redis://..."

# Migration: Store in Vault
vault kv put secret/smm-architect/config \
    database_url="postgres://..." \
    redis_url="redis://..."
```

### From ConfigMaps/Secrets

```bash
# Extract from Kubernetes
kubectl get secret smm-config -o json | \
    jq -r '.data | to_entries[] | "\(.key)=\(.value | @base64d)"'

# Store in Vault
vault kv put secret/smm-architect/config \
    key1="value1" \
    key2="value2"
```

## Support

### Documentation
- [Vault Documentation](https://www.vaultproject.io/docs)
- [Kubernetes Auth Method](https://www.vaultproject.io/docs/auth/kubernetes)
- [KV Secrets Engine](https://www.vaultproject.io/docs/secrets/kv/kv-v2)

### Community
- [SMM Architect Discussions](https://github.com/yourorg/smm-architect/discussions)
- [Vault Community Forum](https://discuss.hashicorp.com/c/vault)

### Enterprise Support
- Email: security@smmarchitect.com
- Slack: #vault-support

---

**Last Updated**: December 2024  
**Configuration Version**: 1.0.0  
**Vault Version**: 1.15+