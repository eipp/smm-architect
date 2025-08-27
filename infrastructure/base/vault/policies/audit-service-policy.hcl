# Audit Service Policy
# Grants access to audit data, cryptographic operations, and compliance records

path "secret/data/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/audit/*" {
  capabilities = ["list", "read", "delete"]
}

# KMS access for audit bundle signing
path "transit/sign/audit-bundle" {
  capabilities = ["update"]
}

path "transit/verify/audit-bundle" {
  capabilities = ["update"]
}

path "transit/encrypt/audit-data" {
  capabilities = ["update"]
}

path "transit/decrypt/audit-data" {
  capabilities = ["update"]
}

# Storage credentials for audit bundles
path "aws/creds/s3-audit-role" {
  capabilities = ["read"]
}

path "gcp/roleset/gcs-audit-role/token" {
  capabilities = ["read"]
}

# External audit and compliance services
path "secret/data/audit-services/external-auditors" {
  capabilities = ["read"]
}

path "secret/data/compliance/soc2-keys" {
  capabilities = ["read"]
}

path "secret/data/compliance/iso27001-keys" {
  capabilities = ["read"]
}

# PKI for audit service certificates
path "pki_int/issue/audit-role" {
  capabilities = ["create", "update"]
}

# Auth token management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Kubernetes auth
path "auth/kubernetes/role/audit-service" {
  capabilities = ["read"]
}

# Workspace-scoped audit data
path "secret/data/workspaces/+/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/audit/*" {
  capabilities = ["list", "read", "delete"]
}

# System audit access (comprehensive)
path "sys/audit" {
  capabilities = ["read", "list", "sudo"]
}

path "sys/audit-hash" {
  capabilities = ["update"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}