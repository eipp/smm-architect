# Example usage of the SMM Architect Workspace Module
# This file demonstrates how to provision workspaces using Terraform

terraform {
  required_version = ">= 1.0"
  
  backend "kubernetes" {
    secret_suffix    = "state"
    config_path      = "~/.kube/config"
    namespace        = "terraform-state"
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

# Example: Development workspace
module "development_workspace" {
  source = "./workspace-module"
  
  tenant_id       = "acme-corp"
  workspace_id    = "dev-marketing-001"
  workspace_owner = "marketing-team@acme-corp.com"
  environment     = "development"
  billing_id      = "dept-marketing-dev"
  
  # Development resource quotas (smaller)
  quota_cpu_requests    = "1"
  quota_cpu_limits      = "2"
  quota_memory_requests = "2Gi"
  quota_memory_limits   = "4Gi"
  quota_storage_requests = "20Gi"
  quota_pod_count       = "10"
  
  # Development database resources
  database_cpu_request    = "100m"
  database_cpu_limit      = "500m"
  database_memory_request = "256Mi"
  database_memory_limit   = "1Gi"
  database_storage_size   = "10Gi"
  
  # Development features
  enable_advanced_features     = false
  enable_experimental_features = true
  
  # Development monitoring (reduced retention)
  log_retention_days    = 7
  backup_retention_days = 7
  
  custom_labels = {
    "cost-center" = "marketing"
    "team"        = "smm-dev"
    "project"     = "smm-architect"
  }
}

# Example: Production workspace
module "production_workspace" {
  source = "./workspace-module"
  
  tenant_id       = "acme-corp"
  workspace_id    = "prod-marketing-001"
  workspace_owner = "marketing-lead@acme-corp.com"
  environment     = "production"
  billing_id      = "dept-marketing-prod"
  
  # Production resource quotas (larger)
  quota_cpu_requests    = "4"
  quota_cpu_limits      = "8"
  quota_memory_requests = "8Gi"
  quota_memory_limits   = "16Gi"
  quota_storage_requests = "100Gi"
  quota_pod_count       = "20"
  quota_service_count   = "15"
  
  # Production database resources
  database_cpu_request    = "500m"
  database_cpu_limit      = "2"
  database_memory_request = "1Gi"
  database_memory_limit   = "4Gi"
  database_storage_size   = "50Gi"
  database_storage_class  = "fast-ssd"
  
  # Production Redis resources
  redis_cpu_request    = "200m"
  redis_cpu_limit      = "1"
  redis_memory_request = "512Mi"
  redis_memory_limit   = "2Gi"
  redis_storage_size   = "10Gi"
  
  # Production API configuration
  workspace_api_replicas      = 3
  workspace_api_cpu_request   = "500m"
  workspace_api_cpu_limit     = "2"
  workspace_api_memory_request = "1Gi"
  workspace_api_memory_limit   = "4Gi"
  
  # Production features
  enable_advanced_features     = true
  enable_experimental_features = false
  
  # Production monitoring (extended retention)
  enable_monitoring     = true
  enable_logging        = true
  log_retention_days    = 90
  enable_backups        = true
  backup_schedule       = "0 1 * * *" # Daily at 1 AM
  backup_retention_days = 90
  
  # Production security
  enable_network_policies      = true
  enable_pod_security_policies = true
  enable_vault_integration     = true
  
  custom_labels = {
    "cost-center"     = "marketing"
    "team"            = "smm-prod"
    "project"         = "smm-architect"
    "environment"     = "production"
    "backup-required" = "true"
  }
  
  custom_annotations = {
    "backup.velero.io/backup-volumes" = "true"
    "monitoring.coreos.com/scrape"    = "true"
  }
}

# Example: Multi-tenant setup for different customers
module "customer_alpha_workspace" {
  source = "./workspace-module"
  
  tenant_id       = "customer-alpha"
  workspace_owner = "admin@customer-alpha.com"
  environment     = "production"
  billing_id      = "customer-alpha-billing"
  
  # Customer-specific resource quotas
  quota_cpu_requests    = "2"
  quota_cpu_limits      = "4"
  quota_memory_requests = "4Gi"
  quota_memory_limits   = "8Gi"
  quota_storage_requests = "50Gi"
  
  # Standard configuration
  enable_advanced_features = true
  enable_monitoring        = true
  enable_backups          = true
  
  custom_labels = {
    "customer"    = "alpha"
    "tier"        = "premium"
    "cost-center" = "customer-alpha"
  }
}

module "customer_beta_workspace" {
  source = "./workspace-module"
  
  tenant_id       = "customer-beta"
  workspace_owner = "admin@customer-beta.com"
  environment     = "production"
  billing_id      = "customer-beta-billing"
  
  # Customer-specific resource quotas (smaller tier)
  quota_cpu_requests    = "1"
  quota_cpu_limits      = "2"
  quota_memory_requests = "2Gi"
  quota_memory_limits   = "4Gi"
  quota_storage_requests = "25Gi"
  
  # Basic configuration
  enable_advanced_features = false
  enable_monitoring        = true
  enable_backups          = true
  
  # Reduced retention for cost savings
  log_retention_days    = 30
  backup_retention_days = 30
  
  custom_labels = {
    "customer"    = "beta"
    "tier"        = "standard"
    "cost-center" = "customer-beta"
  }
}

# Variables for the examples
variable "kubeconfig_path" {
  description = "Path to kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

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

# Outputs for the example workspaces
output "development_workspace_info" {
  description = "Information about the development workspace"
  value = {
    workspace_id = module.development_workspace.workspace_id
    namespace    = module.development_workspace.namespace_name
    endpoints    = module.development_workspace.workspace_endpoints
  }
}

output "production_workspace_info" {
  description = "Information about the production workspace"
  value = {
    workspace_id = module.production_workspace.workspace_id
    namespace    = module.production_workspace.namespace_name
    endpoints    = module.production_workspace.workspace_endpoints
  }
  sensitive = false
}

output "customer_workspaces_info" {
  description = "Information about customer workspaces"
  value = {
    alpha = {
      workspace_id = module.customer_alpha_workspace.workspace_id
      namespace    = module.customer_alpha_workspace.namespace_name
      endpoints    = module.customer_alpha_workspace.workspace_endpoints
    }
    beta = {
      workspace_id = module.customer_beta_workspace.workspace_id
      namespace    = module.customer_beta_workspace.namespace_name
      endpoints    = module.customer_beta_workspace.workspace_endpoints
    }
  }
}