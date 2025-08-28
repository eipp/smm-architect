/**
 * Audit Event Middleware
 * 
 * Captures and streams audit events from security middleware
 * and application activities to SIEM systems.
 */

import { Request, Response, NextFunction } from 'express';
import { auditStreamer, AuditEvent } from './audit-log-streamer';
import { securityMetrics } from './security-metrics';
import { logger } from '../utils/logger';

interface AuditRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    sessionId?: string;
    roles?: string[];
  };
  correlationId?: string;
  auditContext?: {
    startTime: number;
    resourceType: string;
    action: string;
  };
}

/**
 * Main audit middleware that captures all requests
 */
export function auditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Generate correlation ID for request tracking
    req.correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
    
    // Set response header for correlation
    res.setHeader('X-Correlation-ID', req.correlationId);

    // Capture audit context
    req.auditContext = {
      startTime: Date.now(),
      resourceType: extractResourceType(req.path),
      action: determineAction(req.method, req.path)
    };

    // Override response methods to capture audit events
    const originalSend = res.send;
    const originalStatus = res.status;
    let statusCode = 200;

    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };

    res.send = function(data) {
      // Record audit event on response
      recordRequestAuditEvent(req, res, statusCode);
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Authentication audit middleware
 */
export function authenticationAuditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (isAuthenticationEndpoint(req.path)) {
        recordAuthenticationAuditEvent(req, res);
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Authorization audit middleware
 */
export function authorizationAuditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Record authorization attempts
    if (req.user && res.statusCode === 403) {
      recordAuthorizationAuditEvent(req, res);
    }

    next();
  };
}

/**
 * Data access audit middleware
 */
export function dataAccessAuditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Monitor data access patterns
    if (isDataEndpoint(req.path)) {
      recordDataAccessAuditEvent(req, res);
    }

    next();
  };
}

/**
 * Administrative action audit middleware
 */
export function adminActionAuditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    if (isAdminEndpoint(req.path)) {
      recordAdminAuditEvent(req, res);
    }

    next();
  };
}

/**
 * Security event audit middleware
 */
export function securityEventAuditMiddleware() {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Monitor for security-related events
    if (res.statusCode >= 400) {
      recordSecurityAuditEvent(req, res);
    }

    next();
  };
}

/**
 * Record general request audit event
 */
async function recordRequestAuditEvent(req: AuditRequest, res: Response, statusCode: number): Promise<void> {
  try {
    const event: Partial<AuditEvent> = {
      event_type: 'api_request',
      severity: statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low',
      source: 'api_gateway',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        session_id: req.user?.sessionId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: req.auditContext?.resourceType || 'unknown',
        endpoint: req.path,
        method: req.method
      },
      action: req.auditContext?.action || 'unknown',
      outcome: statusCode < 400 ? 'success' : 'failure',
      details: {
        status_code: statusCode,
        response_time_ms: req.auditContext ? Date.now() - req.auditContext.startTime : 0,
        request_size: req.get('Content-Length') || 0,
        query_params: sanitizeQueryParams(req.query),
        headers: sanitizeHeaders(req.headers)
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);
  } catch (error) {
    logger.error('Failed to record request audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
      method: req.method
    });
  }
}

/**
 * Record authentication audit event
 */
async function recordAuthenticationAuditEvent(req: AuditRequest, res: Response): Promise<void> {
  try {
    const isSuccess = res.statusCode < 400;
    const authMethod = determineAuthMethod(req);

    const event: Partial<AuditEvent> = {
      event_type: 'authentication',
      severity: isSuccess ? 'low' : 'medium',
      source: 'auth_service',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: 'authentication',
        endpoint: req.path,
        method: req.method
      },
      action: 'authenticate',
      outcome: isSuccess ? 'success' : 'failure',
      details: {
        auth_method: authMethod,
        status_code: res.statusCode,
        failure_reason: isSuccess ? null : getFailureReason(res.statusCode),
        session_id: req.user?.sessionId,
        roles: req.user?.roles
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);

    // Also update security metrics
    if (isSuccess) {
      securityMetrics.recordAuthSuccess(
        req.user?.tenantId || 'unknown',
        authMethod,
        req.path,
        req.ip || 'unknown',
        req.auditContext ? (Date.now() - req.auditContext.startTime) / 1000 : 0
      );
    } else {
      securityMetrics.recordAuthFailure(
        req.user?.tenantId || 'unknown',
        getFailureReason(res.statusCode),
        req.path,
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown'
      );
    }
  } catch (error) {
    logger.error('Failed to record authentication audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });
  }
}

/**
 * Record authorization audit event
 */
async function recordAuthorizationAuditEvent(req: AuditRequest, res: Response): Promise<void> {
  try {
    const event: Partial<AuditEvent> = {
      event_type: 'authorization_failure',
      severity: 'medium',
      source: 'auth_service',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        session_id: req.user?.sessionId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: req.auditContext?.resourceType || 'unknown',
        endpoint: req.path,
        method: req.method
      },
      action: 'authorize',
      outcome: 'failure',
      details: {
        required_permissions: extractRequiredPermissions(req),
        user_roles: req.user?.roles || [],
        status_code: res.statusCode,
        resource_accessed: req.path
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);
  } catch (error) {
    logger.error('Failed to record authorization audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });
  }
}

/**
 * Record data access audit event
 */
async function recordDataAccessAuditEvent(req: AuditRequest, res: Response): Promise<void> {
  try {
    const event: Partial<AuditEvent> = {
      event_type: 'data_access',
      severity: 'low',
      source: 'data_service',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        session_id: req.user?.sessionId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: extractDataType(req.path),
        endpoint: req.path,
        method: req.method
      },
      action: mapMethodToAction(req.method),
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      details: {
        data_type: extractDataType(req.path),
        operation: mapMethodToAction(req.method),
        record_count: extractRecordCount(res),
        filters: sanitizeQueryParams(req.query),
        status_code: res.statusCode
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);
  } catch (error) {
    logger.error('Failed to record data access audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });
  }
}

/**
 * Record administrative action audit event
 */
async function recordAdminAuditEvent(req: AuditRequest, res: Response): Promise<void> {
  try {
    const event: Partial<AuditEvent> = {
      event_type: 'admin_action',
      severity: 'high',
      source: 'admin_service',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        session_id: req.user?.sessionId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: 'admin_resource',
        endpoint: req.path,
        method: req.method
      },
      action: req.auditContext?.action || 'admin_action',
      outcome: res.statusCode < 400 ? 'success' : 'failure',
      details: {
        admin_action: extractAdminAction(req.path),
        target_resource: req.path,
        request_body: sanitizeRequestBody(req.body),
        status_code: res.statusCode,
        user_roles: req.user?.roles || []
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);
  } catch (error) {
    logger.error('Failed to record admin audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });
  }
}

/**
 * Record security audit event
 */
async function recordSecurityAuditEvent(req: AuditRequest, res: Response): Promise<void> {
  try {
    const severity = res.statusCode >= 500 ? 'high' : 
                    res.statusCode === 403 ? 'medium' : 
                    res.statusCode === 401 ? 'medium' : 'low';

    const event: Partial<AuditEvent> = {
      event_type: 'security_event',
      severity,
      source: 'security_monitor',
      actor: {
        user_id: req.user?.userId,
        tenant_id: req.user?.tenantId,
        session_id: req.user?.sessionId,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent')
      },
      target: {
        resource_type: req.auditContext?.resourceType || 'unknown',
        endpoint: req.path,
        method: req.method
      },
      action: 'security_check',
      outcome: 'failure',
      details: {
        status_code: res.statusCode,
        error_type: getErrorType(res.statusCode),
        request_pattern: analyzeRequestPattern(req),
        potential_threat: assessThreatLevel(req, res.statusCode)
      },
      metadata: {
        correlation_id: req.correlationId,
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await auditStreamer.recordEvent(event);
  } catch (error) {
    logger.error('Failed to record security audit event', {
      error: error instanceof Error ? error.message : String(error),
      path: req.path
    });
  }
}

// Helper functions

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractResourceType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[1] || 'unknown';
}

function determineAction(method: string, path: string): string {
  const action = method.toLowerCase();
  if (action === 'get') return 'read';
  if (action === 'post') return 'create';
  if (action === 'put' || action === 'patch') return 'update';
  if (action === 'delete') return 'delete';
  return action;
}

function isAuthenticationEndpoint(path: string): boolean {
  return path.includes('/auth/') || path.includes('/login') || path.includes('/token');
}

function isDataEndpoint(path: string): boolean {
  const dataEndpoints = ['/api/workspaces', '/api/models', '/api/data', '/api/users'];
  return dataEndpoints.some(endpoint => path.startsWith(endpoint));
}

function isAdminEndpoint(path: string): boolean {
  return path.includes('/admin/') || path.includes('/system/') || path.includes('/config/');
}

function determineAuthMethod(req: AuditRequest): string {
  if (req.get('Authorization')?.startsWith('Bearer')) return 'jwt';
  if (req.get('X-API-Key')) return 'api_key';
  if (req.body?.username) return 'credentials';
  return 'unknown';
}

function getFailureReason(statusCode: number): string {
  switch (statusCode) {
    case 401: return 'invalid_credentials';
    case 403: return 'insufficient_permissions';
    case 429: return 'rate_limit_exceeded';
    default: return 'unknown';
  }
}

function sanitizeQueryParams(query: any): Record<string, any> {
  const sanitized = { ...query };
  // Remove sensitive parameters
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  return sanitized;
}

function sanitizeHeaders(headers: any): Record<string, any> {
  const sanitized = { ...headers };
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized.cookie;
  delete sanitized['x-api-key'];
  return sanitized;
}

function sanitizeRequestBody(body: any): any {
  if (!body) return null;
  const sanitized = { ...body };
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  return sanitized;
}

function extractRequiredPermissions(req: AuditRequest): string[] {
  // This would extract required permissions from route metadata
  return [];
}

function extractDataType(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[2] || 'unknown';
}

function mapMethodToAction(method: string): string {
  const mapping = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return mapping[method as keyof typeof mapping] || 'unknown';
}

function extractRecordCount(res: Response): number {
  // This would extract record count from response if available
  return 0;
}

function extractAdminAction(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'unknown';
}

function getErrorType(statusCode: number): string {
  if (statusCode === 401) return 'authentication_error';
  if (statusCode === 403) return 'authorization_error';
  if (statusCode === 404) return 'not_found';
  if (statusCode === 429) return 'rate_limit';
  if (statusCode >= 500) return 'server_error';
  return 'client_error';
}

function analyzeRequestPattern(req: AuditRequest): string {
  // Analyze request for suspicious patterns
  const path = req.path.toLowerCase();
  if (path.includes('..')) return 'path_traversal';
  if (path.includes('<script')) return 'xss_attempt';
  if (path.includes('union select')) return 'sql_injection';
  return 'normal';
}

function assessThreatLevel(req: AuditRequest, statusCode: number): 'low' | 'medium' | 'high' {
  if (statusCode === 403 && req.user) return 'medium';
  if (statusCode === 401 && !req.user) return 'low';
  if (statusCode >= 500) return 'high';
  return 'low';
}

export {
  auditMiddleware,
  authenticationAuditMiddleware,
  authorizationAuditMiddleware,
  dataAccessAuditMiddleware,
  adminActionAuditMiddleware,
  securityEventAuditMiddleware
};