/**
 * Security Metrics Types and Interfaces
 */

export interface SecurityEvent {
  timestamp: Date;
  eventType: SecurityEventType;
  tenantId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: SecuritySeverity;
  source: string;
}

export enum SecurityEventType {
  // Authentication Events
  AUTH_FAILURE = 'auth_failure',
  AUTH_SUCCESS = 'auth_success',
  JWT_VALIDATION_FAILURE = 'jwt_validation_failure',
  INVALID_API_KEY = 'invalid_api_key',
  ACCOUNT_LOCKOUT = 'account_lockout',
  
  // Authorization Events
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  TENANT_ISOLATION_VIOLATION = 'tenant_isolation_violation',
  RLS_POLICY_VIOLATION = 'rls_policy_violation',
  
  // Rate Limiting Events
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DDoS_PATTERN_DETECTED = 'ddos_pattern_detected',
  
  // Input Validation Events
  INJECTION_ATTEMPT = 'injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  MALFORMED_REQUEST = 'malformed_request',
  
  // System Security Events
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_POLICY_VIOLATION = 'security_policy_violation',
  ANOMALY_DETECTED = 'anomaly_detected'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityMetrics {
  authFailures: {
    total: number;
    last24h: number;
    lastHour: number;
    byTenant: Record<string, number>;
    byIP: Record<string, number>;
  };
  privilegeEscalations: {
    total: number;
    last24h: number;
    byTenant: Record<string, number>;
    byUser: Record<string, number>;
  };
  rateLimitViolations: {
    total: number;
    last24h: number;
    byEndpoint: Record<string, number>;
    byIP: Record<string, number>;
  };
  tenantIsolationViolations: {
    total: number;
    last24h: number;
    byTenant: Record<string, number>;
  };
  suspiciousActivity: {
    total: number;
    last24h: number;
    byType: Record<string, number>;
  };
}