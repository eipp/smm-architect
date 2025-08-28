/**
 * Security Metrics Collection System
 * 
 * Comprehensive security event tracking with Prometheus metrics
 * for monitoring authentication failures, privilege escalations,
 * and other critical security events.
 */

import { Counter, Histogram, Gauge, register } from 'prom-client';
import { logger } from '../utils/logger';

interface SecurityEventContext {
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface AuthAttemptContext extends SecurityEventContext {
  email?: string;
  loginMethod?: 'password' | 'oauth' | 'sso' | 'api_key';
  failureReason?: string;
}

interface PrivilegeEscalationContext extends SecurityEventContext {
  fromRole?: string;
  toRole?: string;
  resource?: string;
  action?: string;
}

interface RateLimitContext extends SecurityEventContext {
  tier?: string;
  limit?: number;
  windowMs?: number;
}

class SecurityMetrics {
  // Authentication metrics
  private authAttemptsTotal: Counter<string>;
  private authFailuresTotal: Counter<string>;
  private authDuration: Histogram<string>;
  private suspiciousAuthPatterns: Counter<string>;
  
  // Authorization metrics
  private privilegeEscalationAttempts: Counter<string>;
  private unauthorizedAccess: Counter<string>;
  private tenantIsolationViolations: Counter<string>;
  
  // Rate limiting metrics
  private rateLimitViolations: Counter<string>;
  private ipBlocked: Counter<string>;
  
  // Security event metrics
  private securityEventsTotal: Counter<string>;
  private securityIncidents: Counter<string>;
  private dataAccessViolations: Counter<string>;
  
  // Session metrics
  private activeSessions: Gauge<string>;
  private sessionDuration: Histogram<string>;
  
  // Input validation metrics
  private inputValidationFailures: Counter<string>;
  private maliciousInputDetected: Counter<string>;
  
  // API security metrics
  private jwtValidationFailures: Counter<string>;
  private corsViolations: Counter<string>;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.authAttemptsTotal = new Counter({
      name: 'security_auth_attempts_total',
      help: 'Total authentication attempts',
      labelNames: ['method', 'status', 'tenant_id']
    });

    this.authFailuresTotal = new Counter({
      name: 'security_auth_failures_total',
      help: 'Failed authentication attempts',
      labelNames: ['method', 'failure_reason', 'ip', 'tenant_id']
    });

    this.authDuration = new Histogram({
      name: 'security_auth_duration_seconds',
      help: 'Authentication process duration',
      labelNames: ['method', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.suspiciousAuthPatterns = new Counter({
      name: 'security_suspicious_auth_patterns_total',
      help: 'Suspicious authentication patterns detected',
      labelNames: ['pattern_type', 'ip', 'severity']
    });

    this.privilegeEscalationAttempts = new Counter({
      name: 'security_privilege_escalation_attempts_total',
      help: 'Privilege escalation attempts',
      labelNames: ['user_id', 'from_role', 'to_role', 'tenant_id']
    });

    this.unauthorizedAccess = new Counter({
      name: 'security_unauthorized_access_total',
      help: 'Unauthorized access attempts',
      labelNames: ['endpoint', 'method', 'user_id', 'tenant_id']
    });

    this.tenantIsolationViolations = new Counter({
      name: 'security_tenant_isolation_violations_total',
      help: 'Tenant isolation boundary violations',
      labelNames: ['user_tenant', 'accessed_tenant', 'resource_type']
    });

    this.rateLimitViolations = new Counter({
      name: 'security_rate_limit_violations_total',
      help: 'Rate limit violations',
      labelNames: ['tier', 'ip', 'endpoint']
    });

    this.ipBlocked = new Counter({
      name: 'security_ip_blocked_total',
      help: 'IP addresses blocked due to suspicious activity',
      labelNames: ['ip', 'reason', 'duration_minutes']
    });

    this.securityEventsTotal = new Counter({
      name: 'security_events_total',
      help: 'Total security events',
      labelNames: ['event_type', 'severity', 'tenant_id']
    });

    this.securityIncidents = new Counter({
      name: 'security_incidents_total',
      help: 'Security incidents requiring investigation',
      labelNames: ['incident_type', 'severity', 'tenant_id']
    });

    this.dataAccessViolations = new Counter({
      name: 'security_data_access_violations_total',
      help: 'Data access violations',
      labelNames: ['data_type', 'user_id', 'tenant_id']
    });

    this.activeSessions = new Gauge({
      name: 'security_active_sessions',
      help: 'Number of active user sessions',
      labelNames: ['tenant_id', 'session_type']
    });

    this.sessionDuration = new Histogram({
      name: 'security_session_duration_seconds',
      help: 'User session duration',
      labelNames: ['tenant_id', 'user_type'],
      buckets: [300, 900, 1800, 3600, 7200, 14400, 28800]
    });

    this.inputValidationFailures = new Counter({
      name: 'security_input_validation_failures_total',
      help: 'Input validation failures',
      labelNames: ['endpoint', 'field', 'validation_type']
    });

    this.maliciousInputDetected = new Counter({
      name: 'security_malicious_input_detected_total',
      help: 'Malicious input patterns detected',
      labelNames: ['attack_type', 'endpoint', 'ip', 'blocked']
    });

    this.jwtValidationFailures = new Counter({
      name: 'security_jwt_validation_failures_total',
      help: 'JWT token validation failures',
      labelNames: ['failure_reason', 'endpoint', 'ip']
    });

    this.corsViolations = new Counter({
      name: 'security_cors_violations_total',
      help: 'CORS policy violations',
      labelNames: ['origin', 'endpoint', 'method']
    });

    this.registerAllMetrics();
  }

  private registerAllMetrics(): void {
    register.registerMetric(this.authAttemptsTotal);
    register.registerMetric(this.authFailuresTotal);
    register.registerMetric(this.authDuration);
    register.registerMetric(this.suspiciousAuthPatterns);
    register.registerMetric(this.privilegeEscalationAttempts);
    register.registerMetric(this.unauthorizedAccess);
    register.registerMetric(this.tenantIsolationViolations);
    register.registerMetric(this.rateLimitViolations);
    register.registerMetric(this.ipBlocked);
    register.registerMetric(this.securityEventsTotal);
    register.registerMetric(this.securityIncidents);
    register.registerMetric(this.dataAccessViolations);
    register.registerMetric(this.activeSessions);
    register.registerMetric(this.sessionDuration);
    register.registerMetric(this.inputValidationFailures);
    register.registerMetric(this.maliciousInputDetected);
    register.registerMetric(this.jwtValidationFailures);
    register.registerMetric(this.corsViolations);
  }

  // Authentication tracking methods
  recordAuthAttempt(context: AuthAttemptContext, success: boolean): void {
    this.authAttemptsTotal.inc({
      method: context.loginMethod || 'unknown',
      status: success ? 'success' : 'failure',
      tenant_id: context.tenantId || 'unknown'
    });

    if (!success) {
      this.authFailuresTotal.inc({
        method: context.loginMethod || 'unknown',
        failure_reason: context.failureReason || 'unknown',
        ip: context.ip || 'unknown',
        tenant_id: context.tenantId || 'unknown'
      });

      logger.warn('Authentication failure', {
        userId: context.userId,
        email: context.email,
        ip: context.ip,
        failureReason: context.failureReason,
        tenantId: context.tenantId
      });
    }
  }

  recordAuthDuration(method: string, status: string, durationSeconds: number): void {
    this.authDuration.observe({ method, status }, durationSeconds);
  }

  recordSuspiciousAuthPattern(patternType: string, ip: string, severity: string): void {
    this.suspiciousAuthPatterns.inc({
      pattern_type: patternType,
      ip: ip || 'unknown',
      severity
    });
    this.recordSecurityEvent('suspicious_auth', severity, 'unknown');
  }

  // Authorization tracking methods
  recordPrivilegeEscalationAttempt(context: PrivilegeEscalationContext): void {
    this.privilegeEscalationAttempts.inc({
      user_id: context.userId || 'unknown',
      from_role: context.fromRole || 'unknown',
      to_role: context.toRole || 'unknown',
      tenant_id: context.tenantId || 'unknown'
    });

    this.recordSecurityIncident('privilege_escalation', 'high', context.tenantId || 'unknown');
    
    logger.error('Privilege escalation attempt detected', {
      userId: context.userId,
      fromRole: context.fromRole,
      toRole: context.toRole,
      resource: context.resource,
      tenantId: context.tenantId,
      ip: context.ip
    });
  }

  recordUnauthorizedAccess(endpoint: string, method: string, userId: string, tenantId: string): void {
    this.unauthorizedAccess.inc({
      endpoint,
      method,
      user_id: userId,
      tenant_id: tenantId
    });
    this.recordSecurityEvent('unauthorized_access', 'medium', tenantId);
  }

  recordTenantIsolationViolation(userTenant: string, accessedTenant: string, resourceType: string): void {
    this.tenantIsolationViolations.inc({
      user_tenant: userTenant,
      accessed_tenant: accessedTenant,
      resource_type: resourceType
    });

    this.recordSecurityIncident('tenant_isolation_violation', 'critical', userTenant);
    
    logger.error('Tenant isolation violation detected', {
      userTenant,
      accessedTenant,
      resourceType
    });
  }

  recordRateLimitViolation(tier: string, ip: string, endpoint: string): void {
    this.rateLimitViolations.inc({
      tier,
      ip,
      endpoint
    });
    this.recordSecurityEvent('rate_limit_violation', 'medium', 'unknown');
  }

  recordIPBlocked(ip: string, reason: string, durationMinutes: number): void {
    this.ipBlocked.inc({
      ip,
      reason,
      duration_minutes: durationMinutes.toString()
    });
    logger.warn('IP address blocked', { ip, reason, durationMinutes });
  }

  recordSecurityEvent(eventType: string, severity: string, tenantId: string): void {
    this.securityEventsTotal.inc({
      event_type: eventType,
      severity,
      tenant_id: tenantId
    });
  }

  recordSecurityIncident(incidentType: string, severity: string, tenantId: string): void {
    this.securityIncidents.inc({
      incident_type: incidentType,
      severity,
      tenant_id: tenantId
    });

    logger.error('Security incident recorded', {
      incidentType,
      severity,
      tenantId
    });
  }

  recordDataAccessViolation(dataType: string, userId: string, tenantId: string): void {
    this.dataAccessViolations.inc({
      data_type: dataType,
      user_id: userId,
      tenant_id: tenantId
    });
  }

  setActiveSessions(tenantId: string, sessionType: string, count: number): void {
    this.activeSessions.set({ tenant_id: tenantId, session_type: sessionType }, count);
  }

  recordSessionDuration(tenantId: string, userType: string, durationSeconds: number): void {
    this.sessionDuration.observe({ tenant_id: tenantId, user_type: userType }, durationSeconds);
  }

  recordInputValidationFailure(endpoint: string, field: string, validationType: string): void {
    this.inputValidationFailures.inc({
      endpoint,
      field,
      validation_type: validationType
    });
  }

  recordMaliciousInput(attackType: string, endpoint: string, ip: string, blocked: boolean): void {
    this.maliciousInputDetected.inc({
      attack_type: attackType,
      endpoint,
      ip,
      blocked: blocked.toString()
    });
  }

  recordJWTValidationFailure(failureReason: string, endpoint: string, ip: string): void {
    this.jwtValidationFailures.inc({
      failure_reason: failureReason,
      endpoint,
      ip
    });
  }

  recordCORSViolation(origin: string, endpoint: string, method: string): void {
    this.corsViolations.inc({
      origin,
      endpoint,
      method
    });
  }

  // Metrics endpoint for Prometheus scraping
  getMetrics(): string {
    return register.metrics();
  }

  // Health check method
  healthCheck(): { healthy: boolean; metricsCount: number } {
    try {
      const metricsCount = register.getMetricsAsArray().length;
      return { healthy: true, metricsCount };
    } catch (error) {
      logger.error('Security metrics health check failed', { error });
      return { healthy: false, metricsCount: 0 };
    }
  }
}

// Export singleton instance
export const securityMetrics = new SecurityMetrics();

// Export types
export {
  SecurityEventContext,
  AuthAttemptContext,
  PrivilegeEscalationContext,
  RateLimitContext,
  SecurityMetrics
};