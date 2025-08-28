/**
 * Security Metrics Collection Service
 * 
 * Collects and exposes security-focused metrics for monitoring
 * authentication failures, privilege escalations, security violations,
 * and other critical security events.
 */

import { register, Counter, Histogram, Gauge } from 'prom-client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface SecurityEventMetrics {
  timestamp: number;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenant_id?: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  failure_reason?: string;
  additional_data?: Record<string, any>;
}

export interface AuthenticationMetrics {
  failed_logins: number;
  successful_logins: number;
  brute_force_attempts: number;
  account_lockouts: number;
  suspicious_locations: number;
  mfa_failures: number;
  token_validation_failures: number;
}

export interface PrivilegeEscalationMetrics {
  unauthorized_access_attempts: number;
  role_elevation_attempts: number;
  permission_boundary_violations: number;
  admin_access_violations: number;
  cross_tenant_access_attempts: number;
}

export interface TenantIsolationMetrics {
  cross_tenant_queries: number;
  rls_policy_violations: number;
  data_leakage_attempts: number;
  unauthorized_tenant_access: number;
}

class SecurityMetricsService {
  // Authentication Security Metrics
  private authFailures: Counter<string>;
  private authSuccesses: Counter<string>;
  private bruteForceAttempts: Counter<string>;
  private accountLockouts: Counter<string>;
  private suspiciousLogins: Counter<string>;
  private mfaFailures: Counter<string>;
  private tokenValidationFailures: Counter<string>;
  private authDuration: Histogram<string>;

  // Authorization & Privilege Escalation Metrics
  private privilegeEscalationAttempts: Counter<string>;
  private unauthorizedAccess: Counter<string>;
  private roleElevationAttempts: Counter<string>;
  private permissionViolations: Counter<string>;
  private adminAccessViolations: Counter<string>;
  private crossTenantAccess: Counter<string>;

  // Tenant Isolation Security Metrics
  private tenantIsolationViolations: Counter<string>;
  private rlsPolicyViolations: Counter<string>;
  private dataLeakageAttempts: Counter<string>;
  private crossTenantQueries: Counter<string>;

  // API Security Metrics
  private rateLimitExceeded: Counter<string>;
  private invalidApiKeys: Counter<string>;
  private malformedRequests: Counter<string>;
  private suspiciousRequestPatterns: Counter<string>;
  private csrfAttempts: Counter<string>;

  // System Security Metrics
  private securityAlerts: Counter<string>;
  private activeSecurityIncidents: Gauge<string>;
  private securityEventProcessingTime: Histogram<string>;
  private failedSecurityChecks: Counter<string>;

  // Compliance & Audit Metrics
  private auditLogFailures: Counter<string>;
  private dataRetentionViolations: Counter<string>;
  private encryptionFailures: Counter<string>;
  private complianceViolations: Counter<string>;

  constructor() {
    this.initializeMetrics();
    logger.info('Security metrics service initialized');
  }

  private initializeMetrics(): void {
    // Authentication Metrics
    this.authFailures = new Counter({
      name: 'smm_security_auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['tenant_id_hash', 'failure_reason', 'endpoint', 'ip_hash', 'user_agent_hash']
    });

    this.authSuccesses = new Counter({
      name: 'smm_security_auth_successes_total',
      help: 'Total number of successful authentications',
      labelNames: ['tenant_id_hash', 'auth_method', 'endpoint', 'ip_hash']
    });

    this.bruteForceAttempts = new Counter({
      name: 'smm_security_brute_force_attempts_total',
      help: 'Total number of brute force attack attempts detected',
      labelNames: ['tenant_id_hash', 'ip_hash', 'target_endpoint']
    });

    this.accountLockouts = new Counter({
      name: 'smm_security_account_lockouts_total',
      help: 'Total number of account lockouts due to security violations',
      labelNames: ['tenant_id_hash', 'lockout_reason', 'duration']
    });

    this.suspiciousLogins = new Counter({
      name: 'smm_security_suspicious_logins_total',
      help: 'Total number of suspicious login attempts',
      labelNames: ['tenant_id_hash', 'suspicion_reason', 'ip_hash', 'location_hash']
    });

    this.mfaFailures = new Counter({
      name: 'smm_security_mfa_failures_total',
      help: 'Total number of multi-factor authentication failures',
      labelNames: ['tenant_id_hash', 'mfa_method', 'failure_reason']
    });

    this.tokenValidationFailures = new Counter({
      name: 'smm_security_token_validation_failures_total',
      help: 'Total number of token validation failures',
      labelNames: ['tenant_id_hash', 'token_type', 'failure_reason']
    });

    this.authDuration = new Histogram({
      name: 'smm_security_auth_duration_seconds',
      help: 'Time taken for authentication operations',
      labelNames: ['tenant_id_hash', 'auth_method', 'success'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });

    // Authorization & Privilege Escalation Metrics
    this.privilegeEscalationAttempts = new Counter({
      name: 'smm_security_privilege_escalation_attempts_total',
      help: 'Total number of privilege escalation attempts',
      labelNames: ['tenant_id_hash', 'user_id_hash', 'from_role', 'to_role', 'endpoint']
    });

    this.unauthorizedAccess = new Counter({
      name: 'smm_security_unauthorized_access_total',
      help: 'Total number of unauthorized access attempts',
      labelNames: ['tenant_id_hash', 'user_id_hash', 'resource', 'action', 'endpoint']
    });

    this.roleElevationAttempts = new Counter({
      name: 'smm_security_role_elevation_attempts_total',
      help: 'Total number of role elevation attempts',
      labelNames: ['tenant_id_hash', 'user_id_hash', 'current_role', 'requested_role']
    });

    this.permissionViolations = new Counter({
      name: 'smm_security_permission_violations_total',
      help: 'Total number of permission boundary violations',
      labelNames: ['tenant_id_hash', 'user_id_hash', 'resource', 'required_permission', 'violation_type']
    });

    this.adminAccessViolations = new Counter({
      name: 'smm_security_admin_access_violations_total',
      help: 'Total number of administrative access violations',
      labelNames: ['tenant_id_hash', 'user_id_hash', 'admin_resource', 'action']
    });

    this.crossTenantAccess = new Counter({
      name: 'smm_security_cross_tenant_access_attempts_total',
      help: 'Total number of cross-tenant access attempts',
      labelNames: ['source_tenant_hash', 'target_tenant_hash', 'user_id_hash', 'resource']
    });

    // Tenant Isolation Security Metrics
    this.tenantIsolationViolations = new Counter({
      name: 'smm_security_tenant_isolation_violations_total',
      help: 'Total number of tenant isolation violations',
      labelNames: ['tenant_id_hash', 'violation_type', 'table_name', 'query_type']
    });

    this.rlsPolicyViolations = new Counter({
      name: 'smm_security_rls_policy_violations_total',
      help: 'Total number of Row-Level Security policy violations',
      labelNames: ['tenant_id_hash', 'table_name', 'policy_name', 'violation_severity']
    });

    this.dataLeakageAttempts = new Counter({
      name: 'smm_security_data_leakage_attempts_total',
      help: 'Total number of potential data leakage attempts',
      labelNames: ['tenant_id_hash', 'data_type', 'endpoint', 'detection_method']
    });

    this.crossTenantQueries = new Counter({
      name: 'smm_security_cross_tenant_queries_total',
      help: 'Total number of cross-tenant database queries detected',
      labelNames: ['source_tenant_hash', 'target_tenant_hash', 'table_name', 'query_type']
    });

    // API Security Metrics
    this.rateLimitExceeded = new Counter({
      name: 'smm_security_rate_limit_exceeded_total',
      help: 'Total number of rate limit violations',
      labelNames: ['tenant_id_hash', 'ip_hash', 'endpoint', 'limit_type']
    });

    this.invalidApiKeys = new Counter({
      name: 'smm_security_invalid_api_keys_total',
      help: 'Total number of invalid API key attempts',
      labelNames: ['tenant_id_hash', 'ip_hash', 'endpoint', 'key_format']
    });

    this.malformedRequests = new Counter({
      name: 'smm_security_malformed_requests_total',
      help: 'Total number of malformed requests detected',
      labelNames: ['tenant_id_hash', 'ip_hash', 'endpoint', 'malformation_type']
    });

    this.suspiciousRequestPatterns = new Counter({
      name: 'smm_security_suspicious_request_patterns_total',
      help: 'Total number of suspicious request patterns detected',
      labelNames: ['tenant_id_hash', 'ip_hash', 'pattern_type', 'severity']
    });

    this.csrfAttempts = new Counter({
      name: 'smm_security_csrf_attempts_total',
      help: 'Total number of CSRF attack attempts',
      labelNames: ['tenant_id_hash', 'ip_hash', 'endpoint', 'protection_method']
    });

    // System Security Metrics
    this.securityAlerts = new Counter({
      name: 'smm_security_alerts_total',
      help: 'Total number of security alerts generated',
      labelNames: ['alert_type', 'severity', 'source_service', 'tenant_id_hash']
    });

    this.activeSecurityIncidents = new Gauge({
      name: 'smm_security_active_incidents',
      help: 'Number of active security incidents',
      labelNames: ['incident_type', 'severity', 'tenant_id_hash']
    });

    this.securityEventProcessingTime = new Histogram({
      name: 'smm_security_event_processing_time_seconds',
      help: 'Time taken to process security events',
      labelNames: ['event_type', 'processor', 'tenant_id_hash'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.failedSecurityChecks = new Counter({
      name: 'smm_security_failed_checks_total',
      help: 'Total number of failed security checks',
      labelNames: ['check_type', 'component', 'tenant_id_hash', 'failure_reason']
    });

    // Compliance & Audit Metrics
    this.auditLogFailures = new Counter({
      name: 'smm_security_audit_log_failures_total',
      help: 'Total number of audit log failures',
      labelNames: ['tenant_id_hash', 'log_type', 'failure_reason']
    });

    this.dataRetentionViolations = new Counter({
      name: 'smm_security_data_retention_violations_total',
      help: 'Total number of data retention policy violations',
      labelNames: ['tenant_id_hash', 'data_type', 'violation_type', 'age_days']
    });

    this.encryptionFailures = new Counter({
      name: 'smm_security_encryption_failures_total',
      help: 'Total number of encryption/decryption failures',
      labelNames: ['tenant_id_hash', 'operation', 'key_type', 'failure_reason']
    });

    this.complianceViolations = new Counter({
      name: 'smm_security_compliance_violations_total',
      help: 'Total number of compliance violations',
      labelNames: ['tenant_id_hash', 'compliance_standard', 'violation_type', 'severity']
    });

    // Register all metrics
    register.registerMetric(this.authFailures);
    register.registerMetric(this.authSuccesses);
    register.registerMetric(this.bruteForceAttempts);
    register.registerMetric(this.accountLockouts);
    register.registerMetric(this.suspiciousLogins);
    register.registerMetric(this.mfaFailures);
    register.registerMetric(this.tokenValidationFailures);
    register.registerMetric(this.authDuration);
    register.registerMetric(this.privilegeEscalationAttempts);
    register.registerMetric(this.unauthorizedAccess);
    register.registerMetric(this.roleElevationAttempts);
    register.registerMetric(this.permissionViolations);
    register.registerMetric(this.adminAccessViolations);
    register.registerMetric(this.crossTenantAccess);
    register.registerMetric(this.tenantIsolationViolations);
    register.registerMetric(this.rlsPolicyViolations);
    register.registerMetric(this.dataLeakageAttempts);
    register.registerMetric(this.crossTenantQueries);
    register.registerMetric(this.rateLimitExceeded);
    register.registerMetric(this.invalidApiKeys);
    register.registerMetric(this.malformedRequests);
    register.registerMetric(this.suspiciousRequestPatterns);
    register.registerMetric(this.csrfAttempts);
    register.registerMetric(this.securityAlerts);
    register.registerMetric(this.activeSecurityIncidents);
    register.registerMetric(this.securityEventProcessingTime);
    register.registerMetric(this.failedSecurityChecks);
    register.registerMetric(this.auditLogFailures);
    register.registerMetric(this.dataRetentionViolations);
    register.registerMetric(this.encryptionFailures);
    register.registerMetric(this.complianceViolations);
  }

  /**
   * Safely hash sensitive identifiers for metrics labels
   */
  private hashIdentifier(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(
    tenantId: string,
    failureReason: string,
    endpoint: string,
    ipAddress: string,
    userAgent: string
  ): void {
    this.authFailures.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      failure_reason: failureReason,
      endpoint,
      ip_hash: this.hashIdentifier(ipAddress),
      user_agent_hash: this.hashIdentifier(userAgent)
    });

    logger.warn('Authentication failure recorded', {
      tenantId: this.hashIdentifier(tenantId),
      failureReason,
      endpoint,
      ipHash: this.hashIdentifier(ipAddress)
    });
  }

  /**
   * Record successful authentication
   */
  recordAuthSuccess(
    tenantId: string,
    authMethod: string,
    endpoint: string,
    ipAddress: string,
    duration: number
  ): void {
    this.authSuccesses.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      auth_method: authMethod,
      endpoint,
      ip_hash: this.hashIdentifier(ipAddress)
    });

    this.authDuration.observe(
      {
        tenant_id_hash: this.hashIdentifier(tenantId),
        auth_method: authMethod,
        success: 'true'
      },
      duration
    );
  }

  /**
   * Record brute force attack attempt
   */
  recordBruteForceAttempt(
    tenantId: string,
    ipAddress: string,
    targetEndpoint: string
  ): void {
    this.bruteForceAttempts.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      ip_hash: this.hashIdentifier(ipAddress),
      target_endpoint: targetEndpoint
    });

    logger.error('Brute force attempt detected', {
      tenantId: this.hashIdentifier(tenantId),
      ipHash: this.hashIdentifier(ipAddress),
      targetEndpoint
    });
  }

  /**
   * Record privilege escalation attempt
   */
  recordPrivilegeEscalationAttempt(
    tenantId: string,
    userId: string,
    fromRole: string,
    toRole: string,
    endpoint: string
  ): void {
    this.privilegeEscalationAttempts.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      user_id_hash: this.hashIdentifier(userId),
      from_role: fromRole,
      to_role: toRole,
      endpoint
    });

    logger.error('Privilege escalation attempt detected', {
      tenantId: this.hashIdentifier(tenantId),
      userId: this.hashIdentifier(userId),
      fromRole,
      toRole,
      endpoint
    });
  }

  /**
   * Record unauthorized access attempt
   */
  recordUnauthorizedAccess(
    tenantId: string,
    userId: string,
    resource: string,
    action: string,
    endpoint: string
  ): void {
    this.unauthorizedAccess.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      user_id_hash: this.hashIdentifier(userId),
      resource,
      action,
      endpoint
    });

    logger.error('Unauthorized access attempt', {
      tenantId: this.hashIdentifier(tenantId),
      userId: this.hashIdentifier(userId),
      resource,
      action,
      endpoint
    });
  }

  /**
   * Record tenant isolation violation
   */
  recordTenantIsolationViolation(
    tenantId: string,
    violationType: string,
    tableName: string,
    queryType: string
  ): void {
    this.tenantIsolationViolations.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      violation_type: violationType,
      table_name: tableName,
      query_type: queryType
    });

    logger.error('Tenant isolation violation detected', {
      tenantId: this.hashIdentifier(tenantId),
      violationType,
      tableName,
      queryType
    });
  }

  /**
   * Record RLS policy violation
   */
  recordRLSPolicyViolation(
    tenantId: string,
    tableName: string,
    policyName: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    this.rlsPolicyViolations.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      table_name: tableName,
      policy_name: policyName,
      violation_severity: severity
    });

    logger.error('RLS policy violation detected', {
      tenantId: this.hashIdentifier(tenantId),
      tableName,
      policyName,
      severity
    });
  }

  /**
   * Record cross-tenant access attempt
   */
  recordCrossTenantAccess(
    sourceTenantId: string,
    targetTenantId: string,
    userId: string,
    resource: string
  ): void {
    this.crossTenantAccess.inc({
      source_tenant_hash: this.hashIdentifier(sourceTenantId),
      target_tenant_hash: this.hashIdentifier(targetTenantId),
      user_id_hash: this.hashIdentifier(userId),
      resource
    });

    logger.error('Cross-tenant access attempt detected', {
      sourceTenantId: this.hashIdentifier(sourceTenantId),
      targetTenantId: this.hashIdentifier(targetTenantId),
      userId: this.hashIdentifier(userId),
      resource
    });
  }

  /**
   * Record malformed request
   */
  recordMalformedRequest(
    tenantId: string,
    ipAddress: string,
    endpoint: string,
    malformationType: string
  ): void {
    this.malformedRequests.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      ip_hash: this.hashIdentifier(ipAddress),
      endpoint,
      malformation_type: malformationType
    });
  }

  /**
   * Record suspicious request pattern
   */
  recordSuspiciousRequestPattern(
    tenantId: string,
    ipAddress: string,
    patternType: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    this.suspiciousRequestPatterns.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      ip_hash: this.hashIdentifier(ipAddress),
      pattern_type: patternType,
      severity
    });
  }

  /**
   * Record invalid API key attempt
   */
  recordInvalidApiKey(
    tenantId: string,
    ipAddress: string,
    endpoint: string,
    keyFormat: string
  ): void {
    this.invalidApiKeys.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      ip_hash: this.hashIdentifier(ipAddress),
      endpoint,
      key_format: keyFormat
    });
  }

  /**
   * Record rate limit exceeded
   */
  recordRateLimitExceeded(
    tenantId: string,
    ipAddress: string,
    endpoint: string,
    limitType: string
  ): void {
    this.rateLimitExceeded.inc({
      tenant_id_hash: this.hashIdentifier(tenantId),
      ip_hash: this.hashIdentifier(ipAddress),
      endpoint,
      limit_type: limitType
    });
  }

  /**
   * Record security alert
   */
  recordSecurityAlert(
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    sourceService: string,
    tenantId?: string
  ): void {
    this.securityAlerts.inc({
      alert_type: alertType,
      severity,
      source_service: sourceService,
      tenant_id_hash: tenantId ? this.hashIdentifier(tenantId) : 'unknown'
    });

    logger.warn('Security alert generated', {
      alertType,
      severity,
      sourceService,
      tenantIdHash: tenantId ? this.hashIdentifier(tenantId) : 'unknown'
    });
  }

  /**
   * Update active security incidents count
   */
  updateActiveIncidents(
    incidentType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    tenantId: string,
    count: number
  ): void {
    this.activeSecurityIncidents.set(
      {
        incident_type: incidentType,
        severity,
        tenant_id_hash: this.hashIdentifier(tenantId)
      },
      count
    );
  }

  /**
   * Record security event processing time
   */
  recordSecurityEventProcessingTime(
    eventType: string,
    processor: string,
    tenantId: string,
    duration: number
  ): void {
    this.securityEventProcessingTime.observe(
      {
        event_type: eventType,
        processor,
        tenant_id_hash: this.hashIdentifier(tenantId)
      },
      duration
    );
  }

  /**
   * Get current security metrics summary
   */
  async getSecurityMetricsSummary(): Promise<{
    authFailures: number;
    privilegeEscalations: number;
    tenantViolations: number;
    activeIncidents: number;
  }> {
    try {
      const metrics = await register.getMetricsAsJSON();
      
      const authFailuresMetric = metrics.find(m => m.name === 'smm_security_auth_failures_total');
      const privilegeEscalationsMetric = metrics.find(m => m.name === 'smm_security_privilege_escalation_attempts_total');
      const tenantViolationsMetric = metrics.find(m => m.name === 'smm_security_tenant_isolation_violations_total');
      const activeIncidentsMetric = metrics.find(m => m.name === 'smm_security_active_incidents');

      return {
        authFailures: authFailuresMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
        privilegeEscalations: privilegeEscalationsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
        tenantViolations: tenantViolationsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0,
        activeIncidents: activeIncidentsMetric?.values.reduce((sum, v) => sum + v.value, 0) || 0
      };
    } catch (error) {
      logger.error('Failed to get security metrics summary', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        authFailures: 0,
        privilegeEscalations: 0,
        tenantViolations: 0,
        activeIncidents: 0
      };
    }
  }
}

// Export singleton instance
export const securityMetrics = new SecurityMetricsService();

export { SecurityMetricsService };