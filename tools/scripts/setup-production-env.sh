#!/bin/bash

# Automated production environment setup and deployment
# Usage: ./setup-production-env.sh [stack]

set -euo pipefail

STACK="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { error "$1 is required"; exit 1; }
}

check_prereqs() {
  log "Validating required tools"
  for cmd in docker vault pulumi; do
    require_cmd "$cmd"
  done
  [ -n "${VAULT_ADDR:-}" ] || { error "VAULT_ADDR not set"; exit 1; }
  [ -n "${VAULT_TOKEN:-}" ] || { error "VAULT_TOKEN not set"; exit 1; }
}

deploy_infrastructure() {
  log "Provisioning infrastructure with Pulumi ($STACK)"
  pulumi stack select "$STACK" || pulumi stack init "$STACK"
  pulumi up --yes
}

deploy_services() {
  log "Deploying services with docker-compose"
  docker-compose -f "$PROJECT_ROOT/docker-compose.prod.yml" up -d --build
}

verify_vault() {
  log "Verifying Vault token rotation and secret retrieval"
  TOKEN=$(vault token create -ttl=1h -format=json | jq -r '.auth.client_token')
  VAULT_TOKEN="$TOKEN" vault kv get secret/health-check >/dev/null 2>&1 || warn "health-check secret missing"
  VAULT_TOKEN="$TOKEN" vault token renew >/dev/null
  vault token revoke "$TOKEN" >/dev/null
  success "Vault token rotation verified"
}

check_prereqs
deploy_infrastructure
deploy_services
verify_vault

success "Production environment setup complete"
