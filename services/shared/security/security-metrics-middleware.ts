/**
 * Security Metrics Middleware
 * 
 * Integrates with authentication and authorization flows to collect
 * security metrics, detect anomalies, and trigger security alerts.
 */

import { Request, Response, NextFunction } from 'express';
import { securityMetrics } from './security-metrics';
import { logger } from '../utils/logger';

interface SecurityRequest extends Request {
  tenant?: { id: string };
  user?: { id: string; roles: string[] };
  security?: {
    startTime: number;
    ipAddress: string;
    userAgent: string;
    endpoint: string;
    method: string;
  };
}

/**
 * Security metrics collection middleware
 */
export function securityMetricsMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const endpoint = req.path;
    const method = req.method;

    // Add security context to request
    req.security = {
      startTime,
      ipAddress,
      userAgent,
      endpoint,
      method
    };

    // Track request processing time
    const originalSend = res.send;
    res.send = function(data) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Record security event processing time
      if (req.tenant?.id) {
        securityMetrics.recordSecurityEventProcessingTime(
          'request_processing',
          'auth_middleware',
          req.tenant.id,
          duration
        );
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Authentication failure tracking middleware
 */
export function authFailureTrackingMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    const originalStatus = res.status;
    const originalSend = res.send;

    res.status = function(code: number) {
      if (code === 401 || code === 403) {
        // Record authentication failure
        const tenantId = req.tenant?.id || 'unknown';
        const failureReason = code === 401 ? 'invalid_credentials' : 'insufficient_privileges';
        
        securityMetrics.recordAuthFailure(
          tenantId,
          failureReason,
          req.security?.endpoint || req.path,
          req.security?.ipAddress || 'unknown',
          req.security?.userAgent || 'unknown'
        );

        // Check for brute force patterns
        checkBruteForcePattern(req);
      }

      return originalStatus.call(this, code);
    };

    res.send = function(data) {
      // Record successful authentication for 200 responses on auth endpoints
      if (res.statusCode === 200 && isAuthEndpoint(req.path)) {
        const tenantId = req.tenant?.id || 'unknown';
        const duration = req.security ? (Date.now() - req.security.startTime) / 1000 : 0;
        
        securityMetrics.recordAuthSuccess(
          tenantId,
          determineAuthMethod(req),
          req.security?.endpoint || req.path,
          req.security?.ipAddress || 'unknown',
          duration
        );
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Privilege escalation detection middleware
 */
export function privilegeEscalationMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    const requiredRole = extractRequiredRole(req);
    const userRoles = req.user?.roles || [];

    if (requiredRole && !userRoles.includes(requiredRole)) {
      // Check if this is an escalation attempt
      if (isPrivilegeEscalation(userRoles, requiredRole)) {
        securityMetrics.recordPrivilegeEscalationAttempt(
          req.tenant?.id || 'unknown',
          req.user?.id || 'unknown',
          userRoles.join(','),
          requiredRole,
          req.path
        );
      }

      // Record unauthorized access
      securityMetrics.recordUnauthorizedAccess(
        req.tenant?.id || 'unknown',
        req.user?.id || 'unknown',
        extractResourceName(req.path),
        req.method,
        req.path
      );
    }

    next();
  };
}

/**
 * Tenant isolation monitoring middleware
 */
export function tenantIsolationMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Monitor for cross-tenant access attempts
    const requestedTenantId = extractTenantIdFromRequest(req);
    const userTenantId = req.tenant?.id;

    if (requestedTenantId && userTenantId && requestedTenantId !== userTenantId) {
      securityMetrics.recordCrossTenantAccess(
        userTenantId,
        requestedTenantId,
        req.user?.id || 'unknown',
        extractResourceName(req.path)
      );

      logger.warn('Cross-tenant access attempt detected', {
        userTenantId,
        requestedTenantId,
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });
    }

    next();
  };
}

/**
 * Rate limiting metrics middleware
 */
export function rateLimitMetricsMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Check if rate limit was exceeded (typically status 429)
    const originalStatus = res.status;
    
    res.status = function(code: number) {
      if (code === 429) {
        securityMetrics.recordRateLimitExceeded(
          req.tenant?.id || 'unknown',
          req.security?.ipAddress || 'unknown',
          req.path,
          determineLimitType(req)
        );
      }

      return originalStatus.call(this, code);
    };

    next();
  };
}

/**
 * API security monitoring middleware
 */
export function apiSecurityMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    // Check for malformed requests
    if (isMalformedRequest(req)) {
      securityMetrics.recordMalformedRequest(
        req.tenant?.id || 'unknown',
        req.security?.ipAddress || 'unknown',
        req.path,
        detectMalformationType(req)
      );
    }

    // Check for suspicious request patterns
    if (isSuspiciousRequestPattern(req)) {
      securityMetrics.recordSuspiciousRequestPattern(
        req.tenant?.id || 'unknown',
        req.security?.ipAddress || 'unknown',
        detectPatternType(req),
        assessPatternSeverity(req)
      );
    }

    // Check for invalid API keys
    const apiKey = req.get('X-API-Key') || req.get('Authorization');
    if (apiKey && !isValidApiKeyFormat(apiKey)) {
      securityMetrics.recordInvalidApiKey(
        req.tenant?.id || 'unknown',
        req.security?.ipAddress || 'unknown',
        req.path,
        detectKeyFormat(apiKey)
      );
    }

    next();
  };
}

/**
 * Security alert generation middleware
 */
export function securityAlertMiddleware() {
  return (req: SecurityRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Generate alerts for critical security events
      if (res.statusCode >= 400) {
        const alertType = determineAlertType(res.statusCode, req.path);
        const severity = determineSeverity(res.statusCode, req.path);
        
        if (alertType && severity) {
          securityMetrics.recordSecurityAlert(
            alertType,
            severity,
            'auth_middleware',
            req.tenant?.id
          );
        }
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Helper functions

function isAuthEndpoint(path: string): boolean {
  const authEndpoints = ['/auth/login', '/auth/token', '/auth/refresh', '/auth/verify'];
  return authEndpoints.some(endpoint => path.includes(endpoint));
}

function determineAuthMethod(req: SecurityRequest): string {
  if (req.get('Authorization')?.startsWith('Bearer')) return 'jwt';
  if (req.get('X-API-Key')) return 'api_key';
  if (req.body?.username && req.body?.password) return 'credentials';
  return 'unknown';
}

function extractRequiredRole(req: SecurityRequest): string | null {
  // Extract required role from route metadata or headers
  // This would typically be set by your authorization middleware
  return req.get('X-Required-Role') || null;
}

function isPrivilegeEscalation(userRoles: string[], requiredRole: string): boolean {
  const roleHierarchy = ['user', 'moderator', 'admin', 'super_admin'];
  const userLevel = Math.max(...userRoles.map(role => roleHierarchy.indexOf(role)));
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  
  return requiredLevel > userLevel;
}

function extractResourceName(path: string): string {
  // Extract resource name from API path
  const parts = path.split('/').filter(Boolean);
  return parts[1] || 'unknown';
}

function extractTenantIdFromRequest(req: SecurityRequest): string | null {
  // Extract tenant ID from various sources
  return req.get('X-Tenant-ID') || req.query.tenantId as string || null;
}

function determineLimitType(req: SecurityRequest): string {
  if (isAuthEndpoint(req.path)) return 'auth';
  if (req.path.includes('/api/')) return 'api';
  return 'general';
}

function isMalformedRequest(req: SecurityRequest): boolean {
  try {
    // Check for malformed JSON in POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      JSON.stringify(req.body);
    }
    return false;
  } catch {
    return true;
  }
}

function detectMalformationType(req: SecurityRequest): string {
  if (req.get('Content-Type')?.includes('json') && typeof req.body !== 'object') {
    return 'invalid_json';
  }
  if (req.url.length > 2048) return 'oversized_url';
  if (detectSQLInjectionPattern(req.url)) return 'sql_injection_attempt';
  return 'unknown';
}

function isSuspiciousRequestPattern(req: SecurityRequest): boolean {
  const suspiciousPatterns = [
    /\/\.\./,  // Path traversal
    /<script/i,  // XSS attempt
    /union\s+select/i,  // SQL injection
    /\bor\s+1=1/i,  // SQL injection
  ];
  
  const fullUrl = req.url + JSON.stringify(req.body || {});
  return suspiciousPatterns.some(pattern => pattern.test(fullUrl));
}

function detectPatternType(req: SecurityRequest): string {
  const url = req.url.toLowerCase();
  if (url.includes('..')) return 'path_traversal';
  if (url.includes('<script')) return 'xss_attempt';
  if (url.includes('union select')) return 'sql_injection';
  return 'unknown';
}

function assessPatternSeverity(req: SecurityRequest): 'low' | 'medium' | 'high' | 'critical' {
  const url = req.url.toLowerCase();
  if (url.includes('union select') || url.includes('drop table')) return 'critical';
  if (url.includes('<script') || url.includes('..')) return 'high';
  return 'medium';
}

function isValidApiKeyFormat(key: string): boolean {
  // Basic API key format validation
  if (key.startsWith('Bearer ')) {
    const token = key.substring(7);
    return token.length >= 32 && /^[A-Za-z0-9._-]+$/.test(token);
  }
  return key.length >= 32 && /^[A-Za-z0-9._-]+$/.test(key);
}

function detectKeyFormat(key: string): string {
  if (key.startsWith('Bearer ')) return 'bearer_token';
  if (key.startsWith('sk-')) return 'openai_key';
  if (key.length < 16) return 'too_short';
  return 'unknown';
}

function checkBruteForcePattern(req: SecurityRequest): void {
  // This would typically involve checking a cache/database for repeated failures
  // For now, we'll implement a simple in-memory check
  const key = `${req.security?.ipAddress}_${req.path}`;
  
  // This is a simplified implementation - in production, use Redis or similar
  const attempts = bruteForceAttempts.get(key) || 0;
  bruteForceAttempts.set(key, attempts + 1);
  
  if (attempts >= 5) {
    securityMetrics.recordBruteForceAttempt(
      req.tenant?.id || 'unknown',
      req.security?.ipAddress || 'unknown',
      req.path
    );
  }
  
  // Clean up old entries periodically
  setTimeout(() => bruteForceAttempts.delete(key), 300000); // 5 minutes
}

function determineAlertType(statusCode: number, path: string): string | null {
  if (statusCode === 401) return 'authentication_failure';
  if (statusCode === 403) return 'authorization_failure';
  if (statusCode === 429) return 'rate_limit_exceeded';
  if (statusCode >= 500) return 'system_error';
  return null;
}

function determineSeverity(statusCode: number, path: string): 'low' | 'medium' | 'high' | 'critical' | null {
  if (statusCode === 401 && isAuthEndpoint(path)) return 'medium';
  if (statusCode === 403) return 'high';
  if (statusCode === 429) return 'medium';
  if (statusCode >= 500) return 'high';
  return null;
}

function detectSQLInjectionPattern(input: string): boolean {
  const sqlPatterns = [
    /(\bunion\b.*\bselect\b)/i,
    /(\bor\b.*=.*)/i,
    /(\bdrop\b.*\btable\b)/i,
    /(\binsert\b.*\binto\b)/i,
    /(\bdelete\b.*\bfrom\b)/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// Add missing function implementations
function recordMalformedRequest(tenantId: string, ipAddress: string, path: string, malformationType: string): void {
  // This would be implemented in the SecurityMetricsService class
  securityMetrics.recordMalformedRequest?.(tenantId, ipAddress, path, malformationType);
}

function recordSuspiciousRequestPattern(tenantId: string, ipAddress: string, patternType: string, severity: string): void {
  // This would be implemented in the SecurityMetricsService class
  securityMetrics.recordSuspiciousRequestPattern?.(tenantId, ipAddress, patternType, severity);
}

function recordInvalidApiKey(tenantId: string, ipAddress: string, path: string, keyFormat: string): void {
  // This would be implemented in the SecurityMetricsService class
  securityMetrics.recordInvalidApiKey?.(tenantId, ipAddress, path, keyFormat);
}

// Simple in-memory store for brute force detection
// In production, this should use Redis or similar
const bruteForceAttempts = new Map<string, number>();

export {
  securityMetricsMiddleware,
  authFailureTrackingMiddleware,
  privilegeEscalationMiddleware,
  tenantIsolationMiddleware,
  rateLimitMetricsMiddleware,
  apiSecurityMiddleware,
  securityAlertMiddleware
};