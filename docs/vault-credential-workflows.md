# Vault Credential Workflows

This guide documents how SMM Architect services interact with HashiCorp Vault for secret management. It covers token rotation, secret retrieval and cross-service usage patterns.

## Overview

SMM Architect relies on HashiCorp Vault to store sensitive configuration such as API keys and database credentials. Each service authenticates with Vault using a short-lived token and retrieves only the secrets it needs.

## Token Issuance and Rotation

1. **Initial Authentication** – Services authenticate using a bootstrap token or cloud IAM role to obtain a scoped Vault token.
2. **Ephemeral Tokens** – The `VaultTokenIssuer` service issues time-bound tokens for agents and microservices.
3. **Automatic Rotation** – Tokens are renewed before expiration and revoked when no longer needed.

### Verifying Token Rotation

Use the `scripts/verify-vault-credentials.sh` helper to issue a token, fetch a secret and verify rotation:

```bash
./scripts/verify-vault-credentials.sh my-app-role secret/data/api
```

The script will:

1. Authenticate using the provided role.
2. Read the requested secret path.
3. Rotate the token and verify that the new token can still access the secret.

## Secret Retrieval Across Services

Each service uses the shared `VaultClient` (`services/shared/vault-client.js`) to retrieve secrets.

Example usage:

```ts
import { VaultClient } from '../shared/vault-client';

const vault = new VaultClient({
  url: process.env.VAULT_ADDR!,
  token: process.env.VAULT_TOKEN!,
  namespace: process.env.VAULT_NAMESPACE,
});

const dbPassword = await vault.getSecret('secret/data/db').then(r => r.data.password);
```

Secrets are namespaced by tenant and service. Policies enforce least privilege and all accesses are auditable.

## Operational Considerations

- **Audit Logging** – All Vault interactions are logged and shipped to the central SIEM.
- **Revocation** – Tokens are revoked on service shutdown and during incident response.
- **Health Checks** – Services call `vaultClient.healthCheck()` during startup to validate connectivity.

For more details on security testing and infrastructure setup, see `docs/production-readiness-guide.md` and `tools/scripts/setup-production-environment.sh`.
