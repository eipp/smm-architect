#!/bin/bash
set -euo pipefail

# Vault Mount Configuration Script for SMM Architect
# This script configures all necessary secret engines and authentication methods

VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_TOKEN="${VAULT_TOKEN:-}"

if [ -z "$VAULT_TOKEN" ]; then
    echo "Error: VAULT_TOKEN environment variable is required"
    exit 1
fi

echo "🔧 Configuring Vault mounts for SMM Architect..."
echo "Vault Address: $VAULT_ADDR"

# Function to check if mount exists
mount_exists() {
    vault auth list -format=json | jq -r '.["'$1'/"].type' &>/dev/null || 
    vault secrets list -format=json | jq -r '.["'$1'/"].type' &>/dev/null
}

# Function to enable secret engine
enable_secret_engine() {
    local path=$1
    local type=$2
    local description=$3
    local config=${4:-"{}"}
    
    if mount_exists "$path"; then
        echo "✓ Secret engine $path already exists"
    else
        echo "→ Enabling $type secret engine at $path"
        vault secrets enable -path="$path" -description="$description" "$type"
        
        if [ "$config" != "{}" ]; then
            echo "→ Configuring $path"
            vault write "$path/config" $config
        fi
    fi
}

# Function to enable auth method
enable_auth_method() {
    local path=$1
    local type=$2
    local description=$3
    
    if mount_exists "$path"; then
        echo "✓ Auth method $path already exists"
    else
        echo "→ Enabling $type auth method at $path"
        vault auth enable -path="$path" -description="$description" "$type"
    fi
}

#=============================================================================
# SECRET ENGINES
#=============================================================================

echo ""
echo "📦 Configuring Secret Engines..."

# KV v2 for application secrets
enable_secret_engine "secret" "kv-v2" "SMM Architect application secrets"

# Database secrets engine
enable_secret_engine "database" "database" "Dynamic database credentials" 

# AWS secrets engine
enable_secret_engine "aws" "aws" "AWS dynamic credentials"

# GCP secrets engine  
enable_secret_engine "gcp" "gcp" "GCP dynamic credentials"

# Transit encryption engine
enable_secret_engine "transit" "transit" "Encryption as a service"

# PKI engine for internal certificates
enable_secret_engine "pki" "pki" "Root CA for SMM Architect"

# Intermediate PKI engine
enable_secret_engine "pki_int" "pki" "Intermediate CA for services"

#=============================================================================
# AUTHENTICATION METHODS
#=============================================================================

echo ""
echo "🔐 Configuring Authentication Methods..."

# Kubernetes auth for service accounts
enable_auth_method "kubernetes" "kubernetes" "Kubernetes service account authentication"

# AppRole auth for CI/CD and applications
enable_auth_method "approle" "approle" "Application role authentication"

# LDAP auth for human users (optional)
# enable_auth_method "ldap" "ldap" "LDAP user authentication"

#=============================================================================
# PKI CONFIGURATION
#=============================================================================

echo ""
echo "🔒 Configuring PKI Infrastructure..."

# Configure root CA
echo "→ Configuring root CA"
vault write pki/config/urls \
    issuing_certificates="$VAULT_ADDR/v1/pki/ca" \
    crl_distribution_points="$VAULT_ADDR/v1/pki/crl"

# Generate root certificate
if ! vault read pki/cert/ca >/dev/null 2>&1; then
    echo "→ Generating root certificate"
    vault write pki/root/generate/internal \
        common_name="SMM Architect Root CA" \
        ttl=8760h \
        organization="SMM Architect" \
        ou="Security" \
        country="US"
else
    echo "✓ Root certificate already exists"
fi

# Configure intermediate CA
echo "→ Configuring intermediate CA"
vault write pki_int/config/urls \
    issuing_certificates="$VAULT_ADDR/v1/pki_int/ca" \
    crl_distribution_points="$VAULT_ADDR/v1/pki_int/crl"

# Generate intermediate CSR and sign it
if ! vault read pki_int/cert/ca >/dev/null 2>&1; then
    echo "→ Generating intermediate certificate"
    
    # Generate CSR
    vault write -format=json pki_int/intermediate/generate/internal \
        common_name="SMM Architect Intermediate CA" \
        organization="SMM Architect" \
        ou="Security" \
        country="US" \
        | jq -r '.data.csr' > /tmp/pki_intermediate.csr
    
    # Sign CSR with root CA
    vault write -format=json pki/root/sign-intermediate \
        csr=@/tmp/pki_intermediate.csr \
        format=pem_bundle \
        ttl=4380h \
        | jq -r '.data.certificate' > /tmp/intermediate.cert.pem
    
    # Import signed certificate
    vault write pki_int/intermediate/set-signed \
        certificate=@/tmp/intermediate.cert.pem
    
    # Clean up temp files
    rm -f /tmp/pki_intermediate.csr /tmp/intermediate.cert.pem
else
    echo "✓ Intermediate certificate already exists"
fi

#=============================================================================
# PKI ROLES
#=============================================================================

echo ""
echo "🎭 Configuring PKI Roles..."

# SMM Architect service role
vault write pki_int/roles/smm-architect-role \
    allowed_domains="smm-architect.svc.cluster.local,smm-architect.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Services"

# ToolHub service role
vault write pki_int/roles/toolhub-role \
    allowed_domains="toolhub.svc.cluster.local,toolhub.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Services"

# Agents role
vault write pki_int/roles/agents-role \
    allowed_domains="agents.svc.cluster.local,agents.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Agents"

# Policy service role
vault write pki_int/roles/policy-role \
    allowed_domains="policy.svc.cluster.local,policy.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Services"

# Audit service role
vault write pki_int/roles/audit-role \
    allowed_domains="audit.svc.cluster.local,audit.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Services"

# Simulator service role
vault write pki_int/roles/simulator-role \
    allowed_domains="simulator.svc.cluster.local,simulator.local" \
    allow_subdomains=true \
    max_ttl=720h \
    ttl=24h \
    organization="SMM Architect" \
    ou="Services"

#=============================================================================
# TRANSIT ENCRYPTION KEYS
#=============================================================================

echo ""
echo "🔐 Configuring Transit Encryption Keys..."

# SMM Architect encryption key
if ! vault read transit/keys/smm-architect-data >/dev/null 2>&1; then
    vault write -f transit/keys/smm-architect-data \
        type=aes256-gcm96 \
        exportable=false \
        allow_plaintext_backup=false
fi

# ToolHub content encryption key
if ! vault read transit/keys/toolhub-content >/dev/null 2>&1; then
    vault write -f transit/keys/toolhub-content \
        type=aes256-gcm96 \
        exportable=false \
        allow_plaintext_backup=false
fi

# Agent data encryption key
if ! vault read transit/keys/agents-data >/dev/null 2>&1; then
    vault write -f transit/keys/agents-data \
        type=aes256-gcm96 \
        exportable=false \
        allow_plaintext_backup=false
fi

# Audit bundle signing key
if ! vault read transit/keys/audit-bundle >/dev/null 2>&1; then
    vault write -f transit/keys/audit-bundle \
        type=ecdsa-p256 \
        exportable=false \
        allow_plaintext_backup=false
fi

# Policy bundle signing key
if ! vault read transit/keys/policy-bundle >/dev/null 2>&1; then
    vault write -f transit/keys/policy-bundle \
        type=ecdsa-p256 \
        exportable=false \
        allow_plaintext_backup=false
fi

# Simulation data encryption key
if ! vault read transit/keys/simulation-data >/dev/null 2>&1; then
    vault write -f transit/keys/simulation-data \
        type=aes256-gcm96 \
        exportable=false \
        allow_plaintext_backup=false
fi

#=============================================================================
# KUBERNETES AUTH CONFIGURATION
#=============================================================================

echo ""
echo "🎯 Configuring Kubernetes Authentication..."

# Get Kubernetes configuration
K8S_HOST="${K8S_HOST:-https://kubernetes.default.svc:443}"
K8S_CA_CERT="${K8S_CA_CERT:-$(cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt 2>/dev/null || echo '')}"
K8S_TOKEN="${K8S_TOKEN:-$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null || echo '')}"

if [ -n "$K8S_CA_CERT" ] && [ -n "$K8S_TOKEN" ]; then
    echo "→ Configuring Kubernetes auth backend"
    vault write auth/kubernetes/config \
        kubernetes_host="$K8S_HOST" \
        kubernetes_ca_cert="$K8S_CA_CERT" \
        token_reviewer_jwt="$K8S_TOKEN"
    
    echo "→ Creating Kubernetes auth roles"
    
    # SMM Architect role
    vault write auth/kubernetes/role/smm-architect \
        bound_service_account_names=smm-architect \
        bound_service_account_namespaces=smm-architect \
        policies=smm-architect-policy \
        ttl=24h
    
    # ToolHub role
    vault write auth/kubernetes/role/toolhub \
        bound_service_account_names=toolhub \
        bound_service_account_namespaces=smm-architect \
        policies=toolhub-policy \
        ttl=24h
    
    # Agent roles
    for agent in research planner creative automation legal publisher; do
        vault write auth/kubernetes/role/${agent}-agent \
            bound_service_account_names=${agent}-agent \
            bound_service_account_namespaces=smm-architect \
            policies=agents-policy \
            ttl=24h
    done
    
    # Policy service role
    vault write auth/kubernetes/role/policy-service \
        bound_service_account_names=policy-service \
        bound_service_account_namespaces=smm-architect \
        policies=policy-service-policy \
        ttl=24h
    
    # Audit service role
    vault write auth/kubernetes/role/audit-service \
        bound_service_account_names=audit-service \
        bound_service_account_namespaces=smm-architect \
        policies=audit-service-policy \
        ttl=24h
    
    # Simulator role
    vault write auth/kubernetes/role/simulator \
        bound_service_account_names=simulator \
        bound_service_account_namespaces=smm-architect \
        policies=simulator-policy \
        ttl=24h
else
    echo "⚠️  Kubernetes configuration not available, skipping auth setup"
    echo "   Run this script from within a Kubernetes pod or set K8S_* environment variables"
fi

#=============================================================================
# AUDIT LOGGING
#=============================================================================

echo ""
echo "📋 Configuring Audit Logging..."

# Enable file audit device
if ! vault audit list | grep -q "file/"; then
    echo "→ Enabling file audit logging"
    vault audit enable file file_path=/vault/logs/audit.log
else
    echo "✓ File audit logging already enabled"
fi

# Enable stdout audit device for development
if [ "${VAULT_ENV:-production}" = "development" ]; then
    if ! vault audit list | grep -q "stdout/"; then
        echo "→ Enabling stdout audit logging for development"
        vault audit enable stdout
    else
        echo "✓ Stdout audit logging already enabled"
    fi
fi

#=============================================================================
# POLICIES
#=============================================================================

echo ""
echo "📜 Installing Vault Policies..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICIES_DIR="$SCRIPT_DIR/../policies"

if [ -d "$POLICIES_DIR" ]; then
    for policy_file in "$POLICIES_DIR"/*.hcl; do
        if [ -f "$policy_file" ]; then
            policy_name=$(basename "$policy_file" .hcl)
            echo "→ Installing policy: $policy_name"
            vault policy write "$policy_name" "$policy_file"
        fi
    done
else
    echo "⚠️  Policies directory not found at $POLICIES_DIR"
    echo "   Install policies manually using: vault policy write <name> <file>"
fi

#=============================================================================
# COMPLETION
#=============================================================================

echo ""
echo "✅ Vault configuration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure database connections: vault write database/config/..."
echo "2. Configure AWS/GCP credentials: vault write aws/config/root ..."
echo "3. Store application secrets: vault kv put secret/..."
echo "4. Test authentication: vault auth -method=kubernetes ..."
echo ""
echo "Useful commands:"
echo "  vault status                    # Check Vault status"
echo "  vault auth list                # List auth methods"
echo "  vault secrets list             # List secret engines"
echo "  vault policy list              # List policies"
echo "  vault audit list               # List audit devices"