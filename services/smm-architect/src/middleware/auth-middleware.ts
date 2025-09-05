import jwt from 'jsonwebtoken';
import { APIError } from '../types';

export interface AuthenticatedRequest {
  headers?: Record<string, string>;
  user?: { userId: string; tenantId: string };
  tenantId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Basic JWT authentication ensuring user and tenant context
 */
export function authenticate(req: AuthenticatedRequest): void {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } as APIError;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userId = payload.sub;
    const tenantId = payload.tenantId;
    if (!userId || !tenantId) {
      throw new Error('Invalid token payload');
    }
    if (req.tenantId && req.tenantId !== tenantId) {
      throw { code: 'FORBIDDEN', message: 'Tenant mismatch' } as APIError;
    }
    req.user = { userId, tenantId };
    req.tenantId = tenantId;
  } catch (error) {
    if ((error as APIError).code) {
      throw error;
    }
    throw { code: 'UNAUTHORIZED', message: 'Invalid authentication token' } as APIError;
  }
}
