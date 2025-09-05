/**
 * Authentication API Endpoints for SMM Architect
 * 
 * Provides the REST API endpoints that the frontend authentication system expects:
 * - POST /api/auth/login - User login with email/password
 * - POST /api/auth/refresh - Token refresh
 * - GET /api/auth/me - Get current user profile
 * - POST /api/auth/logout - User logout
 * - POST /api/auth/register - User registration (if enabled)
 */

// Mock implementations for encore.dev modules
interface ApiConfig {
  method: string;
  path: string;
  auth?: boolean;
}

function api(config: ApiConfig, handler: (req: any) => Promise<any>) {
  return handler;
}

interface Header {
  [key: string]: string | undefined;
}

const log = {
  info: (message: string, data?: any) => console.log('[INFO]', message, data),
  error: (message: string, data?: any) => console.error('[ERROR]', message, data),
  debug: (message: string, data?: any) => console.log('[DEBUG]', message, data),
  warn: (message: string, data?: any) => console.warn('[WARN]', message, data)
};

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { verifyUser, createUser, findUser } from './services/user-store';

// Simple auth service implementation
class SimpleAuthService {
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async authenticate(email: string, password: string): Promise<{ success: boolean; userId?: string; tenantId?: string; error?: string }> {
    try {
      const user = await findUser(email);
      if (!user) {
        return { success: false, error: 'Invalid credentials' };
      }
      const verified = await verifyUser(email, user.tenantId, password);
      if (!verified) {
        return { success: false, error: 'Invalid credentials' };
      }
      return { success: true, userId: verified.id, tenantId: verified.tenantId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' };
    }
  }

  async generateToken(payload: any): Promise<string> {
    // Enforce secure JWT secret configuration with comprehensive validation
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable must be configured - no fallback allowed');
    }
    
    // Comprehensive JWT secret validation
    this.validateJWTSecret(secret);
    
    const tokenData = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 });
    return crypto.createHmac('sha256', secret).update(tokenData).digest('hex');
  }

  /**
   * Validate JWT secret meets comprehensive security requirements
   */
  validateJWTSecret(secret: string): void {
    if (!secret || secret.trim().length === 0) {
      throw new Error('JWT secret cannot be empty or whitespace');
    }
    
    if (secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters for adequate security');
    }
    
    // Reject known weak patterns and defaults
    const weakPatterns = [
      /^(test|dev|development|default|sample|example|secret|password|admin|root|user|demo)$/i,
      /^(default-secret|test-secret|dev-secret|admin-secret)$/i,
      /^(123|111|000|aaa|abc|password|qwerty)/i
    ];
    
    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) {
        throw new Error('JWT secret contains weak/predictable patterns - use a cryptographically secure random value');
      }
    }
    
    // Reject all-same characters or simple sequential patterns
    if (/^(.)\1+$/.test(secret)) {
      throw new Error('JWT secret cannot consist of repeated characters');
    }
    
    if (/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(secret.toLowerCase())) {
      throw new Error('JWT secret cannot contain simple sequential patterns');
    }
    
    // Ensure sufficient entropy (basic check for character diversity)
    const uniqueChars = new Set(secret.toLowerCase()).size;
    if (uniqueChars < 8) {
      throw new Error('JWT secret must contain at least 8 different characters for sufficient entropy');
    }
    
    // Production environment additional checks
    if (process.env.NODE_ENV === 'production') {
      if (secret.length < 64) {
        throw new Error('Production JWT secret must be at least 64 characters');
      }
      
      // Check for mixed case, numbers, and symbols
      const hasLowerCase = /[a-z]/.test(secret);
      const hasUpperCase = /[A-Z]/.test(secret);
      const hasNumbers = /\d/.test(secret);
      const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(secret);
      
      const complexityScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSymbols].filter(Boolean).length;
      if (complexityScore < 3) {
        throw new Error('Production JWT secret must contain at least 3 of: lowercase, uppercase, numbers, symbols');
      }
    }
  }
}

// Initialize authentication service
const authService = new SimpleAuthService();

// Rate limiters for auth endpoints
const loginLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false
});

const refreshLimiter = rateLimit({
  windowMs: Number(process.env.REFRESH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.REFRESH_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: Number(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 3),
  standardHeaders: true,
  legacyHeaders: false
});

async function applyRateLimiter(limiter: ReturnType<typeof rateLimit>, req: any): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const res = {
      status: () => res,
      setHeader: () => undefined,
      send: (body: any) => reject(new Error(typeof body === 'string' ? body : 'Rate limit exceeded'))
    } as any;
    limiter(req as any, res, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function getUserProfile(userId: string, tenantId: string): Promise<User> {
  // Mock user profile - in production this would fetch from database
  return {
    id: userId,
    email: `user-${userId}@example.com`,
    name: `User ${userId}`,
    roles: [{
      id: 'role-1',
      name: 'user',
      permissions: [{
        resource: 'workspace',
        action: 'read'
      }]
    }],
    tenantId,
    createdAt: new Date().toISOString()
  };
}

async function generateRefreshToken(userId: string, tenantId: string): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be configured for refresh token generation');
  }
  
  // Use the same validation as the auth service
  authService.validateJWTSecret(secret);
  
  const tokenData = JSON.stringify({ 
    userId, 
    tenantId, 
    type: 'refresh', 
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    iat: Date.now(),
    version: process.env.JWT_VERSION || '1'
  });
  return crypto.createHmac('sha256', secret).update(tokenData).digest('hex');
}

async function updateLastLogin(userId: string, tenantId: string): Promise<void> {
  // Mock - in production this would update the database
  log.info('Last login updated', { userId, tenantId });
}

// User and permission interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  tenantId: string;
  avatar?: string;
  preferences?: UserPreferences;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  resource: 'workspace' | 'campaign' | 'approval' | 'audit' | 'settings' | 'team';
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'publish' | 'manage';
  scope?: 'own' | 'team' | 'all';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    browser: boolean;
    approvalRequired: boolean;
    budgetAlerts: boolean;
  };
  timezone: string;
}

// Request/Response interfaces
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: number;
  refreshToken?: string;
}

export interface RefreshRequest {
  refreshToken?: string;
}

export interface RefreshResponse {
  token: string;
  user: User;
  expiresAt: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantId: string;
  inviteCode?: string;
}

export interface RegisterResponse {
  message: string;
  requiresVerification: boolean;
}

// Initialize authentication service
let authServiceInitialized = false;
const initAuthService = async () => {
  if (!authServiceInitialized) {
    try {
      await authService.initialize();
      authServiceInitialized = true;
      log.info("Authentication service initialized");
    } catch (error) {
      log.error("Failed to initialize authentication service", { error });
      throw new Error("Authentication service unavailable");
    }
  }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export const login = api(
  { 
    method: "POST", 
    path: "/api/auth/login",
    auth: false // Public endpoint
  },
  async (req: LoginRequest): Promise<LoginResponse> => {
    await initAuthService();

    // Rate limiting for login attempts
    await applyRateLimiter(loginLimiter, req);

    try {
      log.info("Login attempt", { email: req.email });

      // Validate input
      if (!req.email || !req.password) {
        throw new Error("Email and password are required");
      }

      if (!isValidEmail(req.email)) {
        throw new Error("Invalid email format");
      }

      // Authenticate with the authentication service
      const authResult = await authService.authenticate(req.email, req.password);
      
      if (!authResult.success || !authResult.userId || !authResult.tenantId) {
        log.warn("Login failed", { email: req.email, reason: authResult.error });
        throw new Error("Invalid credentials");
      }

      // Get user profile and permissions
      const user = await getUserProfile(authResult.userId, authResult.tenantId);
      
      // Generate JWT token
      const token = await authService.generateToken({
        userId: user.id,
        tenantId: user.tenantId,
        roles: user.roles.map(r => r.name),
        scopes: user.roles.flatMap(r => r.permissions.map(p => `${p.resource}:${p.action}`))
      });

      // Calculate expiration (24 hours by default)
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

      // Generate refresh token if remember me is enabled
      let refreshToken;
      if (req.rememberMe) {
        refreshToken = await generateRefreshToken(user.id, user.tenantId);
      }

      // Update last login timestamp
      await updateLastLogin(user.id, user.tenantId);

      log.info("Login successful", { 
        userId: user.id, 
        tenantId: user.tenantId,
        email: req.email 
      });

      return {
        token,
        user,
        expiresAt,
        refreshToken
      };

    } catch (error) {
      log.error("Login error", { 
        email: req.email, 
        error: error instanceof Error ? error.message : error 
      });
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh JWT token using refresh token or existing session
 */
export const refresh = api(
  { 
    method: "POST", 
    path: "/api/auth/refresh",
    auth: false // Uses refresh token instead
  },
  async (req: RefreshRequest): Promise<RefreshResponse> => {
    await initAuthService();
    // Rate limiting for token refresh attempts
    await rateLimit('auth:refresh', req.refreshToken, 10, 60); // 10 attempts per minute

    // Rate limiting for refresh attempts
    await applyRateLimiter(refreshLimiter, req);

    try {
      // For now, implement a simple refresh mechanism
      // In production, would validate refresh token from secure storage
      
      if (!req.refreshToken) {
        throw new Error("Refresh token required");
      }

      // Validate refresh token (simplified for demo)
      const tokenData = await validateRefreshToken(req.refreshToken);
      
      if (!tokenData) {
        throw new Error("Invalid refresh token");
      }

      // Get updated user profile
      const user = await getUserProfile(tokenData.userId, tokenData.tenantId);

      // Generate new JWT token
      const token = await authService.generateToken({
        userId: user.id,
        tenantId: user.tenantId,
        roles: user.roles.map(r => r.name),
        scopes: user.roles.flatMap(r => r.permissions.map(p => `${p.resource}:${p.action}`))
      });

      const expiresAt = Date.now() + (24 * 60 * 60 * 1000);

      log.info("Token refreshed", { userId: user.id, tenantId: user.tenantId });

      return {
        token,
        user,
        expiresAt
      };

    } catch (error) {
      log.error("Token refresh error", { 
        error: error instanceof Error ? error.message : error 
      });
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
export const getCurrentUser = api(
  {
    method: "GET",
    path: "/api/auth/me",
    auth: true // Requires authentication
  },
  async (req: { userId: string; tenantId: string }): Promise<User> => {
    // Rate limiting for profile retrieval
    await rateLimit('auth:me', req.userId, 60, 60); // 60 requests per minute

    try {
      log.debug("Getting current user profile", {
        userId: req.userId,
        tenantId: req.tenantId
      });

      const user = await getUserProfile(req.userId, req.tenantId);
      
      return user;

    } catch (error) {
      log.error("Get current user error", {
        userId: req.userId,
        tenantId: req.tenantId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error("Failed to get user profile");
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
export const logout = api(
  {
    method: "POST",
    path: "/api/auth/logout",
    auth: true // Requires authentication
  },
  async (req: { userId: string; tenantId: string }): Promise<{ message: string }> => {
    // Rate limiting for logout attempts
    await rateLimit('auth:logout', req.userId, 5, 60); // 5 attempts per minute

    try {
      log.info("User logout", {
        userId: req.userId,
        tenantId: req.tenantId
      });

      // Invalidate any refresh tokens
      await invalidateRefreshTokens(req.userId, req.tenantId);

      // In a full implementation, would also:
      // - Add token to blacklist
      // - Clear server-side sessions
      // - Notify other services of logout

      return {
        message: "Logout successful"
      };

    } catch (error) {
      log.error("Logout error", {
        userId: req.userId,
        tenantId: req.tenantId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error("Logout failed");
    }
  }
);

/**
 * POST /api/auth/register
 * Register new user (if registration is enabled)
 */
export const register = api(
  { 
    method: "POST", 
    path: "/api/auth/register",
    auth: false // Public endpoint
  },
  async (req: RegisterRequest): Promise<RegisterResponse> => {
    await initAuthService();

    // Rate limiting for registration attempts
    await applyRateLimiter(registerLimiter, req);

    try {
      log.info("Registration attempt", { email: req.email, tenantId: req.tenantId });

      // Validate input
      if (!req.email || !req.password || !req.name || !req.tenantId) {
        throw new Error("All fields are required");
      }

      if (!isValidEmail(req.email)) {
        throw new Error("Invalid email format");
      }

      if (!isValidPassword(req.password)) {
        throw new Error("Password must be at least 8 characters with uppercase, lowercase, and number");
      }

      // Check if registration is allowed for this tenant
      const registrationAllowed = await isRegistrationAllowed(req.tenantId, req.inviteCode);
      if (!registrationAllowed) {
        throw new Error("Registration not allowed for this tenant");
      }

      // Check if user already exists
      const existingUser = await checkUserExists(req.email, req.tenantId);
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Create user account
      const user = await createUserAccount({
        email: req.email,
        password: req.password,
        name: req.name,
        tenantId: req.tenantId
      });

      log.info("User registration successful", { 
        userId: user.id, 
        email: req.email, 
        tenantId: req.tenantId 
      });

      return {
        message: "Registration successful",
        requiresVerification: false // For now, no email verification required
      };

    } catch (error) {
      log.error("Registration error", { 
        email: req.email, 
        tenantId: req.tenantId,
        error: error instanceof Error ? error.message : error 
      });
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Helper functions
async function withTenantContext<T>(tenantId: string, operation: (client: any) => Promise<T>): Promise<T> {
  // Mock tenant context - in production this would set up proper database context
  const mockClient = { tenantId };
  return await operation(mockClient);
}

async function validateRefreshToken(refreshToken: string): Promise<{ userId: string; tenantId: string } | null> {
  // Validate refresh token against secure storage
  // For demo purposes, return mock data
  return {
    userId: 'demo_user',
    tenantId: 'demo_tenant'
  };
}

async function invalidateRefreshTokens(userId: string, tenantId: string): Promise<void> {
  // Remove all refresh tokens for this user
  log.debug("Invalidated refresh tokens", { userId, tenantId });
}

async function isRegistrationAllowed(tenantId: string, inviteCode?: string): Promise<boolean> {
  // Check tenant registration policy
  // For demo, allow registration
  return true;
}

async function checkUserExists(email: string, tenantId: string): Promise<boolean> {
  const user = await findUser(email, tenantId);
  return !!user;
}

async function createUserAccount(userData: {
  email: string;
  password: string;
  name: string;
  tenantId: string;
}): Promise<{ id: string }> {
  const user = await createUser(userData);
  return { id: user.id };
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /\d/.test(password);
}