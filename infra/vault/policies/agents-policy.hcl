# Agent Services Policy
# Grants access to agent-specific secrets, LLM API keys, and platform credentials

path "secret/data/agents/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/agents/*" {
  capabilities = ["list", "read", "delete"]
}

# LLM API keys for content generation
path "secret/data/llm-keys/openai" {
  capabilities = ["read"]
}

path "secret/data/llm-keys/anthropic" {
  capabilities = ["read"]
}

path "secret/data/llm-keys/midjourney" {
  capabilities = ["read"]
}

path "secret/data/llm-keys/stability-ai" {
  capabilities = ["read"]
}

path "secret/data/llm-keys/eleven-labs" {
  capabilities = ["read"]
}

# Social media platform credentials
path "secret/data/social-platforms/linkedin" {
  capabilities = ["read"]
}

path "secret/data/social-platforms/twitter" {
  capabilities = ["read"]
}

path "secret/data/social-platforms/instagram" {
  capabilities = ["read"]
}

path "secret/data/social-platforms/facebook" {
  capabilities = ["read"]
}

path "secret/data/social-platforms/youtube" {
  capabilities = ["read"]
}

path "secret/data/social-platforms/tiktok" {
  capabilities = ["read"]
}

# Research data sources
path "secret/data/research-apis/newsapi" {
  capabilities = ["read"]
}

path "secret/data/research-apis/crunchbase" {
  capabilities = ["read"]
}

path "secret/data/research-apis/clearbit" {
  capabilities = ["read"]
}

# Legal research APIs
path "secret/data/legal-apis/westlaw" {
  capabilities = ["read"]
}

path "secret/data/legal-apis/lexis-nexis" {
  capabilities = ["read"]
}

path "secret/data/legal-apis/uspto" {
  capabilities = ["read"]
}

# Encryption for agent data
path "transit/encrypt/agents-*" {
  capabilities = ["update"]
}

path "transit/decrypt/agents-*" {
  capabilities = ["update"]
}

# PKI for agent certificates
path "pki_int/issue/agents-role" {
  capabilities = ["create", "update"]
}

# Auth token management
path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Kubernetes auth for different agent roles
path "auth/kubernetes/role/research-agent" {
  capabilities = ["read"]
}

path "auth/kubernetes/role/planner-agent" {
  capabilities = ["read"]
}

path "auth/kubernetes/role/creative-agent" {
  capabilities = ["read"]
}

path "auth/kubernetes/role/automation-agent" {
  capabilities = ["read"]
}

path "auth/kubernetes/role/legal-agent" {
  capabilities = ["read"]
}

path "auth/kubernetes/role/publisher-agent" {
  capabilities = ["read"]
}

# Workspace-scoped agent secrets
path "secret/data/workspaces/+/agents/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/agents/*" {
  capabilities = ["list", "read", "delete"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}