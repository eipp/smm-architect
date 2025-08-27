# ToolHub Service Policy
# Grants access to vector database credentials, content storage, and API keys

path "secret/data/toolhub/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/toolhub/*" {
  capabilities = ["list", "read", "delete"]
}

# Vector database credentials
path "database/creds/pinecone-db" {
  capabilities = ["read"]
}

path "database/creds/weaviate-db" {
  capabilities = ["read"]
}

# Content storage credentials
path "aws/creds/s3-content-role" {
  capabilities = ["read"]
}

path "gcp/roleset/gcs-content-role/token" {
  capabilities = ["read"]
}

# API keys for external services
path "secret/data/api-keys/openai" {
  capabilities = ["read"]
}

path "secret/data/api-keys/anthropic" {
  capabilities = ["read"]
}

path "secret/data/api-keys/serpapi" {
  capabilities = ["read"]
}

# Encryption for content processing
path "transit/encrypt/toolhub-content" {
  capabilities = ["update"]
}

path "transit/decrypt/toolhub-content" {
  capabilities = ["update"]
}

# PKI for internal service certificates
path "pki_int/issue/toolhub-role" {
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
path "auth/kubernetes/role/toolhub" {
  capabilities = ["read"]
}

# Workspace-scoped access
path "secret/data/workspaces/+/toolhub/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/toolhub/*" {
  capabilities = ["list", "read", "delete"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}