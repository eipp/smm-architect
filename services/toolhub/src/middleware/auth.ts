import { Request, Response, NextFunction } from 'express';
import { AuthenticationService, AuthContext } from '../../../shared/auth-service';
import { VaultClientConfig } from '../../../shared/vault-client';

interface AuthenticatedRequest extends Request {
  user?: AuthContext;
}

/**
 * Authentication middleware for ToolHub API
 * Validates JWT tokens and Vault service tokens
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        code: 'MISSING_AUTH',
        message: 'Authorization header is required'
      });
      return;
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      res.status(401).json({
        code: 'INVALID_AUTH_FORMAT',
        message: 'Authorization header must be "Bearer <token>"'
      });
      return;
    }

    try {
      // Validate token using authentication service
      const authContext = await authService.validateToken(token);
      req.user = authContext;
      next();
      return;
    } catch (error) {
      // Check if this is a temporary error (e.g., Vault connectivity)
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        res.status(503).json({
          code: 'AUTH_SERVICE_UNAVAILABLE',
          message: 'Authentication service temporarily unavailable'
        });
        return;
      }
      
      res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Token validation failed'
      });
      return;
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      code: 'AUTH_ERROR',
      message: 'Authentication service error'
    });
  }
}

/**
 * Scope-based authorization middleware with workspace validation
 */
export function requireScopes(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required'
      });
      return;
    }

    const userScopes = req.user.scopes;
    const hasRequiredScopes = requiredScopes.every(scope => 
      userScopes.includes(scope) || userScopes.includes('admin')
    );

    if (!hasRequiredScopes) {
      res.status(403).json({
        code: 'INSUFFICIENT_SCOPE',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
        userScopes
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to validate workspace access
 */
export function requireWorkspaceAccess() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required'
      });
      return;
    }

    const workspaceId = req.params.workspaceId || req.body.workspaceId;
    
    if (!workspaceId) {
      res.status(400).json({
        code: 'WORKSPACE_ID_REQUIRED',
        message: 'Workspace ID is required'
      });
      return;
    }

    try {
      const hasAccess = await authService.validateWorkspaceAccess(req.user, workspaceId);
      
      if (!hasAccess) {
        res.status(403).json({
          code: 'WORKSPACE_ACCESS_DENIED',
          message: 'Access denied to workspace'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Workspace access validation error:', error);
      res.status(500).json({
        code: 'ACCESS_VALIDATION_ERROR',
        message: 'Failed to validate workspace access'
      });
    }
  };
}

export type { AuthenticatedRequest };
export { authService };