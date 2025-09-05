# Vault Policies and Secret Rotation

This document outlines the required HashiCorp Vault policies and the rotation process for tenant database credentials.

## Required Policies

Each tenant receives a dedicated KV v2 mount at `tenant-<TENANT_ID>`. The following policy grants the tenant service account full access to its own path:

```hcl
path "tenant-<TENANT_ID>/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "tenant-<TENANT_ID>/metadata/*" {
  capabilities = ["list"]
}
```

Assign this policy to the Kubernetes auth role used by the tenant's service account.

## Secret Rotation

Database passwords are stored in Vault and synchronized to Kubernetes using the External Secrets Operator. To rotate a password:

1. Update the secret value in Vault at `tenant-<TENANT_ID>/database`.
2. External Secrets Operator detects the change and updates the Kubernetes `Secret` resource.
3. A rolling restart of dependent workloads picks up the new credentials.

Regular rotation is recommended. If the secret is missing, deployment will fail to ensure that all credentials are present before provisioning.
