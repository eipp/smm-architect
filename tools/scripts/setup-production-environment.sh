#!/bin/bash
# SMM Architect production environment setup and deployment helper
# Provisions infrastructure, builds services and deploys to production

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log() { echo -e "\033[0;34m[setup]\033[0m $1"; }

check_prerequisites() {
  log "Checking prerequisites"
  for tool in node pnpm pulumi docker; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      echo "$tool not found" >&2
      exit 1
    fi
  done
}

install_dependencies() {
  log "Installing dependencies"
  cd "$PROJECT_ROOT"
  pnpm install --frozen-lockfile
}

provision_infrastructure() {
  log "Provisioning infrastructure with Pulumi"
  cd "$PROJECT_ROOT/infrastructure/base/pulumi"
  pulumi stack select production || pulumi stack init production
  pulumi up --yes
}

build_services() {
  log "Building services"
  cd "$PROJECT_ROOT"
  pnpm run build
}

deploy_services() {
  log "Deploying services via docker-compose.prod.yml"
  cd "$PROJECT_ROOT"
  docker compose -f docker-compose.prod.yml up -d
}

check_prerequisites
install_dependencies
provision_infrastructure
build_services
deploy_services

log "Production environment setup complete"
