/**
 * Comprehensive Security Middleware
 * 
 * Combines all security monitoring and metrics collection into a single
 * middleware stack for easy integration into services.
 */

import { Express } from 'express';
import { 
  securityMetricsMiddleware,
  authFailureTrackingMiddleware,
  privilegeEscalationMiddleware,
  tenantIsolationMiddleware,
  rateLimitMetricsMiddleware,
  apiSecurityMiddleware,
  securityAlertMiddleware
} from './security-metrics-middleware';
import { securityMetrics } from './security-metrics';
import { logger } from '../utils/logger';

/**
 * Apply comprehensive security monitoring to an Express app
 */
export function applySecurityMonitoring(app: Express): void {
  logger.info('Applying comprehensive security monitoring middleware');

  // 1. Basic security metrics collection (should be first)
  app.use(securityMetricsMiddleware());

  // 2. API security monitoring
  app.use(apiSecurityMiddleware());

  // 3. Rate limiting metrics
  app.use(rateLimitMetricsMiddleware());

  // 4. Authentication failure tracking
  app.use(authFailureTrackingMiddleware());

  // 5. Security alert generation
  app.use(securityAlertMiddleware());

  logger.info('Security monitoring middleware applied successfully');
}

/**
 * Apply security monitoring to authenticated routes only
 */
export function applyAuthenticatedSecurityMonitoring(app: Express): void {
  logger.info('Applying authenticated security monitoring middleware');

  // These middleware should run after authentication
  app.use(privilegeEscalationMiddleware());
  app.use(tenantIsolationMiddleware());

  logger.info('Authenticated security monitoring middleware applied successfully');
}

/**
 * Security metrics endpoint for health checks
 */
export function createSecurityMetricsEndpoint() {
  return async (req: any, res: any) => {
    try {
      const summary = await securityMetrics.getSecurityMetricsSummary();
      
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        security_metrics: summary,
        monitoring: {
          auth_failures: summary.authFailures,
          privilege_escalations: summary.privilegeEscalations,
          tenant_violations: summary.tenantViolations,
          active_incidents: summary.activeIncidents
        }
      });
    } catch (error) {
      logger.error('Failed to get security metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve security metrics'
      });
    }
  };
}

export {
  applySecurityMonitoring,
  applyAuthenticatedSecurityMonitoring,
  createSecurityMetricsEndpoint
};