/**
 * SIEM Integration Configuration and Types
 */

export interface SIEMConfig {
  enabled: boolean;
  provider: 'splunk' | 'elk' | 'azure-sentinel' | 'datadog' | 'custom';
  endpoint: string;
  apiKey?: string;
  indexName?: string;
  batchSize: number;
  flushInterval: number;
}

export interface AuditLogEntry {
  timestamp: Date;
  eventId: string;
  userId?: string;
  tenantId?: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'error';
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  risk_score?: number;
}

export interface SIEMResponse {
  success: boolean;
  eventCount: number;
  batchId?: string;
  errors?: string[];
}