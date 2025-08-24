# Admin Policy for SMM Architect Platform
# Grants administrative access to all SMM Architect resources

# Full access to all SMM Architect secrets
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# System administration
path "sys/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Auth method administration
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Policy administration
path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Mount administration
path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Database secrets engine
path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# AWS secrets engine
path "aws/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# GCP secrets engine
path "gcp/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Transit secrets engine
path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# PKI secrets engine
path "pki/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "pki_int/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Kubernetes auth
path "auth/kubernetes/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Token auth
path "auth/token/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Audit configuration
path "sys/audit" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Health and status
path "sys/health" {
  capabilities = ["read"]
}

path "sys/seal-status" {
  capabilities = ["read"]
}

path "sys/leader" {
  capabilities = ["read"]
}