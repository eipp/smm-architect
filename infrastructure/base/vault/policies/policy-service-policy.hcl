# Policy Service (OPA) Policy
# Grants access to policy configurations, audit data, and compliance secrets

path "secret/data/policy/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/policy/*" {
  capabilities = ["list", "read", "delete"]
}

# OPA configuration and bundles
path "secret/data/opa/bundles/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/data/opa/config" {
  capabilities = ["read", "update"]
}

# Policy signing keys
path "transit/sign/policy-bundle" {
  capabilities = ["update"]
}

path "transit/verify/policy-bundle" {
  capabilities = ["update"]
}

# Compliance and regulatory data
path "secret/data/compliance/regulations/*" {
  capabilities = ["read", "list"]
}

path "secret/data/compliance/certifications/*" {
  capabilities = ["read", "list"]
}

# External policy services
path "secret/data/external-policy/rego-apis" {
  capabilities = ["read"]
}

# PKI for policy service certificates
path "pki_int/issue/policy-role" {
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
path "auth/kubernetes/role/policy-service" {
  capabilities = ["read"]
}

# Workspace-scoped policy data
path "secret/data/workspaces/+/policy/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/policy/*" {
  capabilities = ["list", "read", "delete"]
}

# Audit log access (read-only for compliance)
path "sys/audit" {
  capabilities = ["read", "list"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}