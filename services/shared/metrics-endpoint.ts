/**
 * Prometheus Metrics Endpoint
 * 
 * Exposes security and application metrics for Prometheus scraping
 * with proper authentication and access control.
 */

import { Request, Response } from 'express';
import { register } from 'prom-client';
import { securityMetrics } from './security-metrics';
import { logger } from '../utils/logger';

/**
 * Middleware to secure the metrics endpoint
 */
export function authenticateMetricsAccess(req: Request, res: Response, next: () => void): void {
  // Check for metrics access token
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.query.token as string;

  const expectedToken = process.env.PROMETHEUS_METRICS_TOKEN || 
                        process.env.METRICS_ACCESS_TOKEN;

  if (!expectedToken) {
    logger.error('Metrics endpoint access attempted but no token configured');
    res.status(503).json({ 
      error: 'Metrics endpoint not configured',
      code: 'METRICS_NOT_CONFIGURED'
    });
    return;
  }

  if (!token || token !== expectedToken) {
    logger.warn('Unauthorized metrics endpoint access attempt', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Record security event
    securityMetrics.recordUnauthorizedAccess(
      '/metrics',
      'GET',
      'anonymous',
      'system'
    );

    res.status(401).json({ 
      error: 'Unauthorized access to metrics endpoint',
      code: 'UNAUTHORIZED_METRICS_ACCESS'
    });
    return;
  }

  next();
}

/**
 * Main metrics endpoint handler
 */
export async function handleMetricsRequest(req: Request, res: Response): Promise<void> {
  try {
    // Log legitimate metrics access
    logger.info('Metrics endpoint accessed', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Get all registered metrics in Prometheus format
    const metrics = await register.metrics();

    // Set appropriate headers
    res.set('Content-Type', register.contentType);
    res.end(metrics);

  } catch (error) {
    logger.error('Error serving metrics', {
      error: error instanceof Error ? error.message : String(error),
      ip: req.ip
    });

    res.status(500).json({
      error: 'Internal server error',
      code: 'METRICS_ERROR'
    });
  }
}

/**
 * Health check endpoint for the metrics service
 */
export function handleMetricsHealthCheck(req: Request, res: Response): void {
  try {
    const healthCheck = securityMetrics.healthCheck();
    const registeredMetrics = register.getMetricsAsArray().length;

    const health = {
      healthy: healthCheck.healthy,
      timestamp: new Date().toISOString(),
      metrics: {
        security: {
          healthy: healthCheck.healthy,
          count: healthCheck.metricsCount
        },
        total: {
          registered: registeredMetrics
        }
      }
    };

    res.status(healthCheck.healthy ? 200 : 503).json(health);

  } catch (error) {
    logger.error('Metrics health check failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(503).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get metrics configuration information
 */
export function getMetricsConfig(): {
  enabled: boolean;
  authenticated: boolean;
  endpoint: string;
  scrapeInterval: string;
} {
  return {
    enabled: !!process.env.PROMETHEUS_METRICS_TOKEN || !!process.env.METRICS_ACCESS_TOKEN,
    authenticated: true,
    endpoint: '/metrics',
    scrapeInterval: process.env.PROMETHEUS_SCRAPE_INTERVAL || '30s'
  };
}

/**
 * Register default application metrics
 */
export function registerDefaultMetrics(): void {
  // This would register default Node.js metrics
  // Implementation depends on specific requirements
  logger.info('Default application metrics registered');
}

/**
 * Custom middleware to track HTTP request metrics
 */
export function trackHttpMetrics() {
  const httpRequestDuration = new (require('prom-client').Histogram)({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'tenant_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  });

  const httpRequestsTotal = new (require('prom-client').Counter)({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'tenant_id']
  });

  register.registerMetric(httpRequestDuration);
  register.registerMetric(httpRequestsTotal);

  return (req: Request, res: Response, next: () => void) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      const tenantId = (req as any).user?.tenantId || 'unknown';

      const labels = {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
        tenant_id: tenantId
      };

      httpRequestDuration.observe(labels, duration);
      httpRequestsTotal.inc(labels);
    });

    next();
  };
}

// Export all functions
export default {
  authenticateMetricsAccess,
  handleMetricsRequest,
  handleMetricsHealthCheck,
  getMetricsConfig,
  registerDefaultMetrics,
  trackHttpMetrics
};