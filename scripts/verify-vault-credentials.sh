#!/bin/bash
# Helper script to verify Vault token issuance, rotation and secret retrieval
# Usage: ./scripts/verify-vault-credentials.sh <role> <secret-path>

set -euo pipefail

ROLE="${1:-}"           # AppRole or auth role to login with
SECRET_PATH="${2:-}"    # Secret path to read, e.g. secret/data/api
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"

if [[ -z "$ROLE" || -z "$SECRET_PATH" ]]; then
  echo "Usage: $0 <role> <secret-path>" >&2
  exit 1
fi

log() { echo "[vault-check] $1"; }

log "Logging in to Vault using role $ROLE"
LOGIN_RESP=$(curl -s --fail -X POST "$VAULT_ADDR/v1/auth/$ROLE/login" || exit 1)
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.auth.client_token')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Failed to retrieve token" >&2
  exit 1
fi

log "Reading secret at $SECRET_PATH"
SECRET=$(curl -s --fail -H "X-Vault-Token: $TOKEN" "$VAULT_ADDR/v1/$SECRET_PATH" || exit 1)
log "Secret data: $(echo "$SECRET" | jq -c '.data.data')"

log "Rotating token"
ROTATE_RESP=$(curl -s --fail -X POST -H "X-Vault-Token: $TOKEN" "$VAULT_ADDR/v1/auth/token/renew" || exit 1)
NEW_TOKEN=$(echo "$ROTATE_RESP" | jq -r '.auth.client_token')

if [[ -z "$NEW_TOKEN" || "$NEW_TOKEN" == "null" ]]; then
  echo "Failed to rotate token" >&2
  exit 1
fi

log "Reading secret with rotated token"
SECOND_READ=$(curl -s --fail -H "X-Vault-Token: $NEW_TOKEN" "$VAULT_ADDR/v1/$SECRET_PATH" || exit 1)
log "Secret read after rotation: $(echo "$SECOND_READ" | jq -c '.data.data')"

log "Vault credential workflow verified"
