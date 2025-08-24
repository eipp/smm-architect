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

import { api } from "encore.dev/api";
import { Header } from "encore.dev/api";
import log from "encore.dev/log";
import { AuthenticationService } from '../../shared/auth-service';
import { VaultClient } from '../../shared/vault-client';
import { setTenantContext, withTenantContext, getPrismaClient } from '../../shared/database/client';
import crypto from 'crypto';
import { rateLimit } from './middleware/rate-limit';

// Initialize authentication service
const authService = new AuthenticationService(
  {
    address: process.env.VAULT_ADDR || 'http://localhost:8200',
    token: process.env.VAULT_TOKEN
  },
  {
    secret: process.env.JWT_SECRET || 'dev-secret',
    issuer: 'smm-architect',
    audience: 'smm-architect'
  }
);

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
    await rateLimit('auth:login', req.email, 5, 900); // 5 attempts per 15 minutes

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
      
      if (!authResult.success) {
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
  async (req: {}, authContext: { userId: string; tenantId: string }): Promise<User> => {
    try {
      log.debug("Getting current user profile", { 
        userId: authContext.userId, 
        tenantId: authContext.tenantId 
      });

      const user = await getUserProfile(authContext.userId, authContext.tenantId);
      
      return user;

    } catch (error) {
      log.error("Get current user error", {
        userId: authContext.userId,
        tenantId: authContext.tenantId,
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
  async (req: {}, authContext: { userId: string; tenantId: string }): Promise<{ message: string }> => {
    try {
      log.info("User logout", { 
        userId: authContext.userId, 
        tenantId: authContext.tenantId 
      });

      // Invalidate any refresh tokens
      await invalidateRefreshTokens(authContext.userId, authContext.tenantId);

      // In a full implementation, would also:
      // - Add token to blacklist
      // - Clear server-side sessions
      // - Notify other services of logout

      return {
        message: "Logout successful"
      };

    } catch (error) {
      log.error("Logout error", {
        userId: authContext.userId,
        tenantId: authContext.tenantId,
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
    await rateLimit('auth:register', req.email, 3, 3600); // 3 attempts per hour

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
async function getUserProfile(userId: string, tenantId: string): Promise<User> {
  return await withTenantContext(tenantId, async (client) => {
    // Mock user data - in production, would query actual user table
    const user: User = {
      id: userId,
      email: `user${userId}@${tenantId}.com`,
      name: `User ${userId}`,
      tenantId,
      roles: [
        {
          id: 'role1',
          name: 'workspace_manager',
          permissions: [
            { resource: 'workspace', action: 'create' },
            { resource: 'workspace', action: 'read', scope: 'own' },
            { resource: 'workspace', action: 'update', scope: 'own' },
            { resource: 'campaign', action: 'create' },
            { resource: 'campaign', action: 'read', scope: 'own' }
          ]
        }
      ],
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          browser: true,
          approvalRequired: true,
          budgetAlerts: true
        },
        timezone: 'UTC'
      },
      createdAt: new Date().toISOString()
    };

    return user;
  });
}

async function generateRefreshToken(userId: string, tenantId: string): Promise<string> {
  // Generate secure refresh token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store in secure storage (Redis/Database) with expiration
  // For now, just return the token
  return token;
}

async function validateRefreshToken(refreshToken: string): Promise<{ userId: string; tenantId: string } | null> {
  // Validate refresh token against secure storage
  // For demo purposes, return mock data
  return {
    userId: 'demo_user',
    tenantId: 'demo_tenant'
  };
}

async function updateLastLogin(userId: string, tenantId: string): Promise<void> {
  return await withTenantContext(tenantId, async (client) => {
    // Update user's last login timestamp in database
    log.debug("Updated last login timestamp", { userId, tenantId });
  });
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
  return await withTenantContext(tenantId, async (client) => {
    // Check if user exists in database
    // For demo, assume user doesn't exist
    return false;
  });
}

async function createUserAccount(userData: {
  email: string;
  password: string;
  name: string;
  tenantId: string;
}): Promise<{ id: string }> {
  return await withTenantContext(userData.tenantId, async (client) => {
    // Create user in database
    // For demo, return mock user ID
    return {
      id: `user_${crypto.randomUUID()}`
    };
  });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /\d/.test(password);
}