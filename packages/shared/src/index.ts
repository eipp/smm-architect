/**
 * SMM Architect Shared Package
 * 
 * Central exports for shared utilities, types, and database access
 */

// Database exports
export * from './database/client';

// Utility exports  
export * from './utils/logger';

// Types and interfaces will be exported here as they're created
export interface TenantContext {
  tenantId: string;
  userId?: string;
  permissions?: string[];
}

export interface WorkspaceConfig {
  workspaceId: string;
  tenantId: string;
  lifecycle: 'draft' | 'active' | 'archived';
}