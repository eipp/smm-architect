# Vault Credential Workflows

This guide explains how SMM Architect services obtain and rotate Vault tokens and retrieve secrets securely across the platform.

## Token Issuance and Revocation

Agents request scoped tokens from the `VaultTokenIssuer`. Each execution issues a short‑lived token and revokes it when finished to limit exposure:

```ts
// services/agents/src/executor.ts
const vaultToken = await this.vaultTokenIssuer.issueAgentToken(
  request.agentType,
  request.workspaceId
);
// ...
await this.vaultTokenIssuer.revokeToken(vaultToken);
```

## Token Rotation

The shared `VaultClient` automatically renews tokens before expiration. Tokens can also be renewed manually when running long‑lived tasks:

```ts
// services/shared/vault-client.ts
async renewSelf(increment?: string): Promise<VaultAuthResponse> {
  const payload = increment ? { increment } : {};
  const response = await this.client.post('/v1/auth/token/renew-self', payload);
  const auth = response.data.auth;
  this.tokenExpiry = new Date(Date.now() + (auth.lease_duration * 1000));
  return auth;
}
```

The client exposes `shouldRenewToken()` to determine when renewal is required (within five minutes of expiry).

## Secret Retrieval

Services fetch secrets using the shared client. The client validates tokens and performs authenticated KV reads:

```ts
const secret = await vaultClient.readKVSecret(`agentuity/${tenantId}/webhook_key`);
```

## Verification Workflow

1. **Create a short‑lived token**
   ```bash
   VAULT_TOKEN=$(vault token create -ttl=1h -format=json | jq -r '.auth.client_token')
   ```
2. **Use the token to retrieve a secret**
   ```bash
   VAULT_TOKEN="$VAULT_TOKEN" vault kv get secret/workspaces/sample/toolhub-api-key
   ```
3. **Renew the token before expiry**
   ```bash
   VAULT_TOKEN="$VAULT_TOKEN" vault token renew
   ```
4. **Revoke the token when finished**
   ```bash
   vault token revoke "$VAULT_TOKEN"
   ```

These steps verify token rotation and secret retrieval across services while ensuring credentials are short‑lived and revocable.
