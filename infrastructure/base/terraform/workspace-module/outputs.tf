output "workspace_id" {
  description = "The unique identifier for the created workspace"
  value       = local.workspace_id
}

output "tenant_id" {
  description = "The tenant identifier"
  value       = var.tenant_id
}

output "namespace_name" {
  description = "The Kubernetes namespace for the workspace"
  value       = kubernetes_namespace.workspace_namespace.metadata[0].name
}

output "resource_prefix" {
  description = "The prefix used for all workspace resources"
  value       = local.resource_prefix
}

output "workspace_owner" {
  description = "The email address of the workspace owner"
  value       = var.workspace_owner
}

output "environment" {
  description = "The environment name"
  value       = var.environment
}

# Service Account Information
output "service_account_name" {
  description = "The name of the workspace service account"
  value       = kubernetes_service_account.workspace_service_account.metadata[0].name
}

output "service_account_namespace" {
  description = "The namespace of the workspace service account"
  value       = kubernetes_service_account.workspace_service_account.metadata[0].namespace
}

# Vault Information
output "vault_policy_name" {
  description = "The name of the Vault policy for this workspace"
  value       = vault_policy.workspace_policy.name
}

output "vault_auth_role_name" {
  description = "The name of the Vault Kubernetes auth role"
  value       = vault_kubernetes_auth_backend_role.workspace_auth_role.role_name
}

output "vault_secret_paths" {
  description = "The Vault secret paths used by this workspace"
  value = {
    config_path      = vault_generic_secret.workspace_config.path
    database_path    = vault_generic_secret.database_credentials.path
    tenant_base_path = "secret/data/tenant/${var.tenant_id}"
  }
}

output "transit_key_name" {
  description = "The name of the Vault transit key for audit signing"
  value       = vault_transit_secret_backend_key.audit_signing_key.name
}

# Network Information
output "network_policies" {
  description = "The network policies applied to the workspace"
  value = {
    default_deny     = kubernetes_network_policy.default_deny_all.metadata[0].name
    workspace_allow  = kubernetes_network_policy.allow_workspace_internal.metadata[0].name
  }
}

# Resource Quota Information
output "resource_quota" {
  description = "The resource quota limits for the workspace"
  value = {
    name = kubernetes_resource_quota.workspace_quota.metadata[0].name
    limits = {
      cpu_requests     = var.quota_cpu_requests
      cpu_limits       = var.quota_cpu_limits
      memory_requests  = var.quota_memory_requests
      memory_limits    = var.quota_memory_limits
      storage_requests = var.quota_storage_requests
      pod_count        = var.quota_pod_count
      service_count    = var.quota_service_count
    }
  }
}

# Database Connection Information
output "database_connection" {
  description = "Database connection information"
  value = {
    host      = "${local.resource_prefix}-postgres.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
    port      = 5432
    database  = "workspace_${replace(local.workspace_id, "-", "_")}"
    username  = "workspace_user"
    # Note: Password is stored in Vault, not output for security
  }
  sensitive = false
}

# Redis Connection Information
output "redis_connection" {
  description = "Redis connection information"
  value = {
    host = "${local.resource_prefix}-redis.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
    port = 6379
  }
}

# Labels and Annotations
output "common_labels" {
  description = "The common labels applied to all resources"
  value       = local.common_labels
}

output "namespace_labels" {
  description = "The labels applied to the namespace"
  value       = kubernetes_namespace.workspace_namespace.metadata[0].labels
}

output "namespace_annotations" {
  description = "The annotations applied to the namespace"
  value       = kubernetes_namespace.workspace_namespace.metadata[0].annotations
}

# Workspace URLs
output "workspace_endpoints" {
  description = "The endpoints for accessing workspace services"
  value = {
    api_internal       = "${local.resource_prefix}-api.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
    dashboard_internal = "${local.resource_prefix}-dashboard.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
    # External URLs would be constructed by ingress controller
    api_external       = "https://api.${local.workspace_id}.smm.local"
    dashboard_external = "https://dashboard.${local.workspace_id}.smm.local"
  }
}

# Creation timestamp
output "created_at" {
  description = "Timestamp when the workspace was created"
  value       = kubernetes_namespace.workspace_namespace.metadata[0].annotations["smm.architect/created-at"]
}

# Security Information
output "security_configuration" {
  description = "Security configuration details"
  value = {
    pod_security_standards_enabled = true
    network_policies_enabled       = var.enable_network_policies
    vault_integration_enabled      = var.enable_vault_integration
    rbac_role_name                = kubernetes_role.workspace_role.metadata[0].name
    rbac_binding_name             = kubernetes_role_binding.workspace_role_binding.metadata[0].name
  }
}

# Monitoring Information
output "monitoring_configuration" {
  description = "Monitoring and observability configuration"
  value = {
    monitoring_enabled    = var.enable_monitoring
    logging_enabled      = var.enable_logging
    log_retention_days   = var.log_retention_days
    backup_enabled       = var.enable_backups
    backup_schedule      = var.backup_schedule
    backup_retention_days = var.backup_retention_days
  }
}

# Feature Flags
output "feature_flags" {
  description = "Enabled feature flags for the workspace"
  value = {
    advanced_features     = var.enable_advanced_features
    experimental_features = var.enable_experimental_features
  }
}

# Helm Chart Information (to be used by Helm resources)
output "helm_values" {
  description = "Values to be passed to the workspace Helm chart"
  value = {
    workspaceId    = local.workspace_id
    tenantId       = var.tenant_id
    namespace      = kubernetes_namespace.workspace_namespace.metadata[0].name
    resourcePrefix = local.resource_prefix
    
    database = {
      host         = "${local.resource_prefix}-postgres.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
      port         = 5432
      database     = "workspace_${replace(local.workspace_id, "-", "_")}"
      storageSize  = var.database_storage_size
      storageClass = var.database_storage_class
      resources    = local.database_resources
    }
    
    redis = {
      host         = "${local.resource_prefix}-redis.${kubernetes_namespace.workspace_namespace.metadata[0].name}.svc.cluster.local"
      port         = 6379
      storageSize  = var.redis_storage_size
      resources    = local.redis_resources
    }
    
    api = {
      image     = var.workspace_api_image
      replicas  = var.workspace_api_replicas
      resources = {
        limits = {
          cpu    = var.workspace_api_cpu_limit
          memory = var.workspace_api_memory_limit
        }
        requests = {
          cpu    = var.workspace_api_cpu_request
          memory = var.workspace_api_memory_request
        }
      }
    }
    
    serviceAccount = {
      name      = kubernetes_service_account.workspace_service_account.metadata[0].name
      namespace = kubernetes_service_account.workspace_service_account.metadata[0].namespace
    }
    
    vault = {
      enabled    = var.enable_vault_integration
      role       = vault_kubernetes_auth_backend_role.workspace_auth_role.role_name
      secretPath = "secret/data/workspaces/${local.workspace_id}"
    }
    
    monitoring = {
      enabled = var.enable_monitoring
      labels  = local.common_labels
    }
    
    security = {
      networkPolicies = var.enable_network_policies
      podSecurity     = var.enable_pod_security_policies
    }
  }
  sensitive = false
}