# SMM Architect Core Service Policy
# Grants access to workspace secrets, API keys, and database credentials

path "secret/data/smm-architect/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/smm-architect/*" {
  capabilities = ["list", "read", "delete"]
}

# Database credentials access
path "database/creds/smm-architect-db" {
  capabilities = ["read"]
}

path "database/static-creds/smm-architect-admin" {
  capabilities = ["read"]
}

# KMS access for encryption/decryption
path "transit/encrypt/smm-architect-*" {
  capabilities = ["update"]
}

path "transit/decrypt/smm-architect-*" {
  capabilities = ["update"]
}

path "transit/datakey/plaintext/smm-architect-*" {
  capabilities = ["update"]
}

# PKI for internal service certificates
path "pki_int/issue/smm-architect-role" {
  capabilities = ["create", "update"]
}

# Auth token renewal and lookup
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Kubernetes auth for service account
path "auth/kubernetes/role/smm-architect" {
  capabilities = ["read"]
}

# Workspace-specific secrets (tenant isolation)
path "secret/data/workspaces/+/smm-architect/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/smm-architect/*" {
  capabilities = ["list", "read", "delete"]
}

# Audit logging access (read-only)
path "sys/audit" {
  capabilities = ["read", "list"]
}

# Health check access
path "sys/health" {
  capabilities = ["read"]
}