variable "tenant_id" {
  description = "Unique identifier for the tenant"
  type        = string
  validation {
    condition     = length(var.tenant_id) > 0 && can(regex("^[a-z0-9-]+$", var.tenant_id))
    error_message = "Tenant ID must be non-empty and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "workspace_id" {
  description = "Unique identifier for the workspace (auto-generated if empty)"
  type        = string
  default     = ""
  validation {
    condition     = var.workspace_id == "" || can(regex("^[a-z0-9-]+$", var.workspace_id))
    error_message = "Workspace ID must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "workspace_owner" {
  description = "Email address of the workspace owner"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.workspace_owner))
    error_message = "Workspace owner must be a valid email address."
  }
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "billing_id" {
  description = "Billing identifier for cost allocation"
  type        = string
  default     = ""
}

# Kubernetes configuration
variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

# Vault configuration
variable "vault_address" {
  description = "Vault server address"
  type        = string
  default     = "https://vault.vault.svc.cluster.local:8200"
}

variable "vault_token" {
  description = "Vault authentication token"
  type        = string
  sensitive   = true
}

# Resource quotas
variable "quota_cpu_requests" {
  description = "CPU requests quota for the workspace"
  type        = string
  default     = "2"
}

variable "quota_cpu_limits" {
  description = "CPU limits quota for the workspace"
  type        = string
  default     = "4"
}

variable "quota_memory_requests" {
  description = "Memory requests quota for the workspace"
  type        = string
  default     = "4Gi"
}

variable "quota_memory_limits" {
  description = "Memory limits quota for the workspace"
  type        = string
  default     = "8Gi"
}

variable "quota_storage_requests" {
  description = "Storage requests quota for the workspace"
  type        = string
  default     = "50Gi"
}

variable "quota_pvc_count" {
  description = "Maximum number of persistent volume claims"
  type        = string
  default     = "10"
}

variable "quota_pod_count" {
  description = "Maximum number of pods"
  type        = string
  default     = "20"
}

variable "quota_service_count" {
  description = "Maximum number of services"
  type        = string
  default     = "10"
}

variable "quota_secret_count" {
  description = "Maximum number of secrets"
  type        = string
  default     = "20"
}

variable "quota_configmap_count" {
  description = "Maximum number of configmaps"
  type        = string
  default     = "20"
}

# Database configuration
variable "database_cpu_request" {
  description = "CPU request for database pod"
  type        = string
  default     = "250m"
}

variable "database_cpu_limit" {
  description = "CPU limit for database pod"
  type        = string
  default     = "1"
}

variable "database_memory_request" {
  description = "Memory request for database pod"
  type        = string
  default     = "512Mi"
}

variable "database_memory_limit" {
  description = "Memory limit for database pod"
  type        = string
  default     = "2Gi"
}

variable "database_storage_size" {
  description = "Storage size for database persistent volume"
  type        = string
  default     = "20Gi"
}

variable "database_storage_class" {
  description = "Storage class for database persistent volume"
  type        = string
  default     = "fast-ssd"
}

# Redis configuration
variable "redis_cpu_request" {
  description = "CPU request for Redis pod"
  type        = string
  default     = "100m"
}

variable "redis_cpu_limit" {
  description = "CPU limit for Redis pod"
  type        = string
  default     = "500m"
}

variable "redis_memory_request" {
  description = "Memory request for Redis pod"
  type        = string
  default     = "256Mi"
}

variable "redis_memory_limit" {
  description = "Memory limit for Redis pod"
  type        = string
  default     = "1Gi"
}

variable "redis_storage_size" {
  description = "Storage size for Redis persistent volume"
  type        = string
  default     = "5Gi"
}

# Workspace application configuration
variable "workspace_api_image" {
  description = "Docker image for workspace API"
  type        = string
  default     = "smm-architect/workspace-api:1.0.0"
}

variable "workspace_api_replicas" {
  description = "Number of workspace API replicas"
  type        = number
  default     = 2
  validation {
    condition     = var.workspace_api_replicas >= 1 && var.workspace_api_replicas <= 10
    error_message = "Workspace API replicas must be between 1 and 10."
  }
}

variable "workspace_api_cpu_request" {
  description = "CPU request for workspace API pods"
  type        = string
  default     = "200m"
}

variable "workspace_api_cpu_limit" {
  description = "CPU limit for workspace API pods"
  type        = string
  default     = "1"
}

variable "workspace_api_memory_request" {
  description = "Memory request for workspace API pods"
  type        = string
  default     = "512Mi"
}

variable "workspace_api_memory_limit" {
  description = "Memory limit for workspace API pods"
  type        = string
  default     = "2Gi"
}

# Monitoring and observability
variable "enable_monitoring" {
  description = "Enable Prometheus monitoring for the workspace"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging for the workspace"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
  validation {
    condition     = var.log_retention_days >= 1 && var.log_retention_days <= 365
    error_message = "Log retention days must be between 1 and 365."
  }
}

# Security configuration
variable "enable_network_policies" {
  description = "Enable network policies for tenant isolation"
  type        = bool
  default     = true
}

variable "enable_pod_security_policies" {
  description = "Enable pod security policies"
  type        = bool
  default     = true
}

variable "enable_vault_integration" {
  description = "Enable Vault integration for secrets management"
  type        = bool
  default     = true
}

# Backup and disaster recovery
variable "enable_backups" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_schedule" {
  description = "Cron schedule for backups"
  type        = string
  default     = "0 2 * * *" # Daily at 2 AM
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention days must be between 1 and 365."
  }
}

# Feature flags
variable "enable_advanced_features" {
  description = "Enable advanced workspace features"
  type        = bool
  default     = false
}

variable "enable_experimental_features" {
  description = "Enable experimental features (use with caution)"
  type        = bool
  default     = false
}

# Custom labels and annotations
variable "custom_labels" {
  description = "Custom labels to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "custom_annotations" {
  description = "Custom annotations to apply to all resources"
  type        = map(string)
  default     = {}
}