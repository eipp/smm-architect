terraform {
  required_version = ">= 1.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.20"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# Configure providers
provider "kubernetes" {
  config_path = var.kubeconfig_path
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig_path
  }
}

provider "vault" {
  address = var.vault_address
  token   = var.vault_token
}

# Generate unique workspace identifier
resource "random_id" "workspace_suffix" {
  byte_length = 4
}

# Local values for consistent naming
locals {
  workspace_id       = var.workspace_id != "" ? var.workspace_id : "ws-${random_id.workspace_suffix.hex}"
  namespace_name     = "smm-tenant-${var.tenant_id}"
  resource_prefix    = "ws-${local.workspace_id}"
  common_labels = {
    "app.kubernetes.io/name"      = "smm-architect"
    "app.kubernetes.io/component" = "workspace"
    "smm.architect/tenant-id"     = var.tenant_id
    "smm.architect/workspace-id"  = local.workspace_id
    "smm.architect/environment"   = var.environment
  }
  
  # Resource limits and requests
  database_resources = {
    limits = {
      cpu    = var.database_cpu_limit
      memory = var.database_memory_limit
    }
    requests = {
      cpu    = var.database_cpu_request
      memory = var.database_memory_request
    }
  }
  
  redis_resources = {
    limits = {
      cpu    = var.redis_cpu_limit
      memory = var.redis_memory_limit
    }
    requests = {
      cpu    = var.redis_cpu_request
      memory = var.redis_memory_request
    }
  }
}

# Create namespace for tenant
resource "kubernetes_namespace" "workspace_namespace" {
  metadata {
    name = local.namespace_name
    labels = merge(local.common_labels, {
      "smm.architect/resource-type" = "namespace"
      "pod-security.kubernetes.io/enforce" = "restricted"
      "pod-security.kubernetes.io/audit"   = "restricted"
      "pod-security.kubernetes.io/warn"    = "restricted"
    })
    
    annotations = {
      "smm.architect/created-at"    = timestamp()
      "smm.architect/owner"         = var.workspace_owner
      "smm.architect/billing-id"    = var.billing_id
    }
  }
}

# Network policies for tenant isolation
resource "kubernetes_network_policy" "default_deny_all" {
  metadata {
    name      = "default-deny-all"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
  }
  
  spec {
    pod_selector {}
    policy_types = ["Ingress", "Egress"]
  }
}

resource "kubernetes_network_policy" "allow_workspace_internal" {
  metadata {
    name      = "allow-workspace-internal"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
  }
  
  spec {
    pod_selector {
      match_labels = local.common_labels
    }
    
    policy_types = ["Ingress", "Egress"]
    
    ingress {
      from {
        pod_selector {
          match_labels = local.common_labels
        }
      }
    }
    
    egress {
      to {
        pod_selector {
          match_labels = local.common_labels
        }
      }
    }
    
    # Allow egress to system services
    egress {
      to {
        namespace_selector {
          match_labels = {
            name = "kube-system"
          }
        }
      }
    }
    
    # Allow egress to SMM system services
    egress {
      to {
        namespace_selector {
          match_labels = {
            name = "smm-system"
          }
        }
      }
    }
  }
}

# Resource quota for tenant
resource "kubernetes_resource_quota" "workspace_quota" {
  metadata {
    name      = "${local.resource_prefix}-quota"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
  }
  
  spec {
    hard = {
      "requests.cpu"       = var.quota_cpu_requests
      "requests.memory"    = var.quota_memory_requests
      "limits.cpu"         = var.quota_cpu_limits
      "limits.memory"      = var.quota_memory_limits
      "persistentvolumeclaims" = var.quota_pvc_count
      "requests.storage"   = var.quota_storage_requests
      "pods"              = var.quota_pod_count
      "services"          = var.quota_service_count
      "secrets"           = var.quota_secret_count
      "configmaps"        = var.quota_configmap_count
    }
  }
}

# Service account for workspace
resource "kubernetes_service_account" "workspace_service_account" {
  metadata {
    name      = "${local.resource_prefix}-sa"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
    
    annotations = {
      "vault.hashicorp.com/agent-inject"                = "true"
      "vault.hashicorp.com/agent-inject-status"         = "update"
      "vault.hashicorp.com/agent-inject-secret-config"  = "secret/data/tenant/${var.tenant_id}"
      "vault.hashicorp.com/role"                        = "smm-workspace"
    }
  }
  
  automount_service_account_token = true
}

# RBAC for workspace service account
resource "kubernetes_role" "workspace_role" {
  metadata {
    name      = "${local.resource_prefix}-role"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
  }
  
  rule {
    api_groups = [""]
    resources  = ["pods", "services", "configmaps", "secrets", "persistentvolumeclaims"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
  
  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets", "statefulsets"]
    verbs      = ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
  
  rule {
    api_groups = ["networking.k8s.io"]
    resources  = ["networkpolicies"]
    verbs      = ["get", "list", "watch"]
  }
}

resource "kubernetes_role_binding" "workspace_role_binding" {
  metadata {
    name      = "${local.resource_prefix}-role-binding"
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
    labels    = local.common_labels
  }
  
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.workspace_role.metadata[0].name
  }
  
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.workspace_service_account.metadata[0].name
    namespace = kubernetes_namespace.workspace_namespace.metadata[0].name
  }
}

# Vault policy for workspace
resource "vault_policy" "workspace_policy" {
  name = "smm-workspace-${var.tenant_id}"
  
  policy = <<EOT
# Allow reading workspace-specific secrets
path "secret/data/tenant/${var.tenant_id}/*" {
  capabilities = ["read"]
}

# Allow writing workspace data
path "secret/data/workspaces/${local.workspace_id}/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# Allow reading shared SMM configuration
path "secret/data/smm/shared/*" {
  capabilities = ["read"]
}

# Allow key management for audit signing
path "transit/encrypt/smm-audit-${var.tenant_id}" {
  capabilities = ["update"]
}

path "transit/decrypt/smm-audit-${var.tenant_id}" {
  capabilities = ["update"]
}

path "transit/sign/smm-audit-${var.tenant_id}" {
  capabilities = ["update"]
}

path "transit/verify/smm-audit-${var.tenant_id}" {
  capabilities = ["update"]
}
EOT
}

# Vault Kubernetes auth role
resource "vault_kubernetes_auth_backend_role" "workspace_auth_role" {
  backend                          = "kubernetes"
  role_name                       = "smm-workspace-${var.tenant_id}"
  bound_service_account_names     = [kubernetes_service_account.workspace_service_account.metadata[0].name]
  bound_service_account_namespaces = [kubernetes_namespace.workspace_namespace.metadata[0].name]
  token_ttl                       = 3600
  token_max_ttl                   = 7200
  token_policies                  = [vault_policy.workspace_policy.name]
  audience                        = null
}

# Create workspace secrets in Vault
resource "vault_generic_secret" "workspace_config" {
  path = "secret/workspaces/${local.workspace_id}/config"
  
  data_json = jsonencode({
    workspace_id    = local.workspace_id
    tenant_id       = var.tenant_id
    namespace       = kubernetes_namespace.workspace_namespace.metadata[0].name
    owner           = var.workspace_owner
    environment     = var.environment
    created_at      = timestamp()
    database_config = {
      host     = "${local.resource_prefix}-postgres.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
      port     = 5432
      database = "workspace_${replace(local.workspace_id, "-", "_")}"
      username = "workspace_user"
    }
    redis_config = {
      host = "${local.resource_prefix}-redis.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
      port = 6379
    }
  })
}

# Generate database password
resource "random_password" "database_password" {
  length  = 32
  special = true
}

resource "vault_generic_secret" "database_credentials" {
  path = "secret/workspaces/${local.workspace_id}/database"
  
  data_json = jsonencode({
    password = random_password.database_password.result
    username = "workspace_user"
  })
}

# Transit key for audit signing
resource "vault_transit_secret_backend_key" "audit_signing_key" {
  backend = "transit"
  name    = "smm-audit-${var.tenant_id}"
  type    = "rsa-4096"
  
  exportable = false
  allows_signing = true
}