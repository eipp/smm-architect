# Vault Policies and Secret Rotation

SMM Architect stores tenant database credentials in HashiCorp Vault. Each tenant receives a dedicated KV v2 path and policy to isolate secrets.

## Required Policy

```hcl
path "tenant-<TENANT_ID>/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "tenant-<TENANT_ID>/metadata/*" {
  capabilities = ["list"]
}
```

Attach this policy to the Kubernetes auth role `tenant-<TENANT_ID>-role` so pods in the tenant namespace can access their secrets.

## Rotation Process

1. **Update secret in Vault**
   ```bash
   vault kv put tenant-<TENANT_ID>/database password=<NEW_PASSWORD>
   ```
2. **External-secrets operator syncs the change**
   - The operator refreshes `tenant-<TENANT_ID>-database` automatically.
   - To force immediate rotation, delete the Kubernetes secret:
     ```bash
     kubectl delete secret tenant-<TENANT_ID>-database -n smm-tenant-<TENANT_ID>
     ```
3. **Redeploy workloads if needed** to pick up the new credentials.

Provisioning validates that the password exists in Vault before deployment and fails if the secret is missing.
