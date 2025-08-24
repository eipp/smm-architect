# Simulator Service Policy
# Grants access to simulation data, Monte Carlo parameters, and test credentials

path "secret/data/simulator/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/simulator/*" {
  capabilities = ["list", "read", "delete"]
}

# Simulation configuration and parameters
path "secret/data/simulation/monte-carlo-config" {
  capabilities = ["read", "update"]
}

path "secret/data/simulation/test-data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Test API credentials for simulation
path "secret/data/test-apis/sandbox-linkedin" {
  capabilities = ["read"]
}

path "secret/data/test-apis/sandbox-twitter" {
  capabilities = ["read"]
}

path "secret/data/test-apis/mock-services" {
  capabilities = ["read"]
}

# Encryption for simulation data
path "transit/encrypt/simulation-data" {
  capabilities = ["update"]
}

path "transit/decrypt/simulation-data" {
  capabilities = ["update"]
}

# PKI for simulator certificates
path "pki_int/issue/simulator-role" {
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
path "auth/kubernetes/role/simulator" {
  capabilities = ["read"]
}

# Workspace-scoped simulation data
path "secret/data/workspaces/+/simulator/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/workspaces/+/simulator/*" {
  capabilities = ["list", "read", "delete"]
}

# Health check
path "sys/health" {
  capabilities = ["read"]
}