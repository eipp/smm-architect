import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Secure session management with JWT and encryption
 */

export interface SessionData {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
  tenantId?: string
  twoFactorVerified?: boolean
  loginTime: number
  lastActivity: number
  ipAddress: string
  userAgent: string
  sessionId: string
}

export interface SessionConfig {
  secret: string
  cookieName: string
  maxAge: number // in seconds
  secure: boolean
  httpOnly: boolean
  sameSite: 'strict' | 'lax' | 'none'
  domain?: string
  path: string
  renewalThreshold: number // seconds before expiry to auto-renew
  maxSessions: number // max concurrent sessions per user
  requireTwoFactor: boolean
}

const getSessionSecret = (): string => {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required')
  }

  return secret
}

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  secret: getSessionSecret(),
  cookieName: '__session',
  maxAge: 24 * 60 * 60, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  renewalThreshold: 2 * 60 * 60, // 2 hours
  maxSessions: 5,
  requireTwoFactor: false
}

/**
 * Session store for managing active sessions
 */
class SessionStore {
  private sessions: Map<string, {
    sessionId: string
    userId: string
    createdAt: number
    lastActivity: number
    ipAddress: string
    userAgent: string
  }> = new Map()

  addSession(sessionData: {
    sessionId: string
    userId: string
    ipAddress: string
    userAgent: string
  }): void {
    const now = Date.now()
    this.sessions.set(sessionData.sessionId, {
      ...sessionData,
      createdAt: now,
      lastActivity: now
    })

    // Clean up old sessions for this user
    this.cleanupUserSessions(sessionData.userId, DEFAULT_SESSION_CONFIG.maxSessions)
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  getUserSessions(userId: string): string[] {
    const sessions: string[] = []
    for (const [sessionId, data] of this.sessions.entries()) {
      if (data.userId === userId) {
        sessions.push(sessionId)
      }
    }
    return sessions
  }

  cleanupUserSessions(userId: string, maxSessions: number): void {
    const userSessions = this.getUserSessions(userId)
    
    if (userSessions.length > maxSessions) {
      // Sort by last activity (oldest first)
      const sortedSessions = userSessions
        .map(sessionId => ({ sessionId, session: this.sessions.get(sessionId)! }))
        .sort((a, b) => a.session.lastActivity - b.session.lastActivity)
      
      // Remove oldest sessions
      const sessionsToRemove = sortedSessions.slice(0, userSessions.length - maxSessions)
      for (const { sessionId } of sessionsToRemove) {
        this.sessions.delete(sessionId)
      }
    }
  }

  cleanupExpiredSessions(maxAge: number): void {
    const now = Date.now()
    const maxAgeMs = maxAge * 1000
    
    for (const [sessionId, data] of this.sessions.entries()) {
      if (now - data.lastActivity > maxAgeMs) {
        this.sessions.delete(sessionId)
      }
    }
  }

  isValidSession(sessionId: string, maxAge: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false
    
    const now = Date.now()
    const maxAgeMs = maxAge * 1000
    
    return (now - session.lastActivity) <= maxAgeMs
  }
}

const sessionStore = new SessionStore()

// Clean up expired sessions every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionStore.cleanupExpiredSessions(DEFAULT_SESSION_CONFIG.maxAge)
  }, 10 * 60 * 1000)
}

/**
 * Generate cryptographic session ID
 */
export const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for environments without crypto
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2) +
         Date.now().toString(36)
}

/**
 * Create JWT session token
 */
export const createSessionToken = async (
  sessionData: SessionData,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<string> => {
  const secret = new TextEncoder().encode(config.secret)
  
  const token = await new SignJWT({
    userId: sessionData.userId,
    email: sessionData.email,
    roles: sessionData.roles,
    permissions: sessionData.permissions,
    tenantId: sessionData.tenantId,
    twoFactorVerified: sessionData.twoFactorVerified,
    loginTime: sessionData.loginTime,
    lastActivity: sessionData.lastActivity,
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent,
    sessionId: sessionData.sessionId
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.maxAge}s`)
    .setSubject(sessionData.userId)
    .setAudience('smm-architect')
    .setIssuer('smm-architect-auth')
    .sign(secret)

  // Store session in session store
  sessionStore.addSession({
    sessionId: sessionData.sessionId,
    userId: sessionData.userId,
    ipAddress: sessionData.ipAddress,
    userAgent: sessionData.userAgent
  })

  return token
}

/**
 * Verify and decode JWT session token
 */
export const verifySessionToken = async (
  token: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<SessionData | null> => {
  try {
    const secret = new TextEncoder().encode(config.secret)
    
    const { payload } = await jwtVerify(token, secret, {
      audience: 'smm-architect',
      issuer: 'smm-architect-auth'
    })

    const sessionData = payload as unknown as SessionData
    
    // Verify session is still active in session store
    if (!sessionStore.isValidSession(sessionData.sessionId, config.maxAge)) {
      return null
    }

    // Update last activity
    sessionStore.updateActivity(sessionData.sessionId)
    
    return sessionData
  } catch (error) {
    console.error('Session verification failed:', error)
    return null
  }
}

/**
 * Create session cookie
 */
export const createSessionCookie = (
  token: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): string => {
  const cookieOptions: string[] = [
    `${config.cookieName}=${token}`,
    `Max-Age=${config.maxAge}`,
    `Path=${config.path}`
  ]

  if (config.secure) {
    cookieOptions.push('Secure')
  }

  if (config.httpOnly) {
    cookieOptions.push('HttpOnly')
  }

  if (config.sameSite) {
    cookieOptions.push(`SameSite=${config.sameSite}`)
  }

  if (config.domain) {
    cookieOptions.push(`Domain=${config.domain}`)
  }

  return cookieOptions.join('; ')
}

/**
 * Set session cookie in response
 */
export const setSessionCookie = (
  response: NextResponse,
  token: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): void => {
  response.cookies.set({
    name: config.cookieName,
    value: token,
    maxAge: config.maxAge,
    path: config.path,
    secure: config.secure,
    httpOnly: config.httpOnly,
    sameSite: config.sameSite,
    domain: config.domain
  })
}

/**
 * Clear session cookie
 */
export const clearSessionCookie = (
  response: NextResponse,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): void => {
  response.cookies.set({
    name: config.cookieName,
    value: '',
    maxAge: 0,
    path: config.path,
    secure: config.secure,
    httpOnly: config.httpOnly,
    sameSite: config.sameSite,
    domain: config.domain
  })
}

/**
 * Get session from request
 */
export const getSessionFromRequest = async (
  request: NextRequest,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<SessionData | null> => {
  const token = request.cookies.get(config.cookieName)?.value
  
  if (!token) {
    return null
  }

  return await verifySessionToken(token, config)
}

/**
 * Get session from cookies (server component)
 */
export const getSessionFromCookies = async (
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<SessionData | null> => {
  const cookieStore = cookies()
  const token = cookieStore.get(config.cookieName)?.value
  
  if (!token) {
    return null
  }

  return await verifySessionToken(token, config)
}

/**
 * Refresh session if needed
 */
export const refreshSessionIfNeeded = async (
  sessionData: SessionData,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<{ shouldRefresh: boolean; newToken?: string }> => {
  const now = Date.now()
  const timeUntilExpiry = (sessionData.lastActivity + (config.maxAge * 1000)) - now
  
  if (timeUntilExpiry <= (config.renewalThreshold * 1000)) {
    // Update last activity time
    const updatedSessionData: SessionData = {
      ...sessionData,
      lastActivity: now
    }
    
    const newToken = await createSessionToken(updatedSessionData, config)
    return { shouldRefresh: true, newToken }
  }
  
  return { shouldRefresh: false }
}

/**
 * Logout user and invalidate session
 */
export const logout = async (
  sessionId: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<void> => {
  sessionStore.removeSession(sessionId)
}

/**
 * Logout all user sessions
 */
export const logoutAllSessions = async (
  userId: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG
): Promise<void> => {
  const userSessions = sessionStore.getUserSessions(userId)
  for (const sessionId of userSessions) {
    sessionStore.removeSession(sessionId)
  }
}

/**
 * Session validation middleware
 */
export const createSessionMiddleware = (config: Partial<SessionConfig> = {}) => {
  const fullConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config }
  
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const session = await getSessionFromRequest(request, fullConfig)
    
    if (!session) {
      return null // No session, continue to login
    }

    // Check if session needs refresh
    const { shouldRefresh, newToken } = await refreshSessionIfNeeded(session, fullConfig)
    
    if (shouldRefresh && newToken) {
      const response = NextResponse.next()
      setSessionCookie(response, newToken, fullConfig)
      return response
    }
    
    return null // Session is valid, continue
  }
}

/**
 * Protected route wrapper
 */
export const withAuth = (
  handler: (request: NextRequest, session: SessionData) => Promise<NextResponse>,
  config: Partial<SessionConfig> = {}
) => {
  const fullConfig: SessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config }
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const session = await getSessionFromRequest(request, fullConfig)
    
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check two-factor authentication if required
    if (fullConfig.requireTwoFactor && !session.twoFactorVerified) {
      return new NextResponse('Two-factor authentication required', { status: 403 })
    }

    return await handler(request, session)
  }
}

/**
 * Role-based access control
 */
export const requireRole = (
  requiredRoles: string[],
  handler: (request: NextRequest, session: SessionData) => Promise<NextResponse>,
  config: Partial<SessionConfig> = {}
) => {
  return withAuth(async (request: NextRequest, session: SessionData) => {
    const hasRequiredRole = requiredRoles.some(role => 
      session.roles.includes(role)
    )
    
    if (!hasRequiredRole) {
      return new NextResponse('Insufficient permissions', { status: 403 })
    }
    
    return await handler(request, session)
  }, config)
}

/**
 * Permission-based access control
 */
export const requirePermission = (
  requiredPermissions: string[],
  handler: (request: NextRequest, session: SessionData) => Promise<NextResponse>,
  config: Partial<SessionConfig> = {}
) => {
  return withAuth(async (request: NextRequest, session: SessionData) => {
    const hasRequiredPermissions = requiredPermissions.every(permission => 
      session.permissions.includes(permission)
    )
    
    if (!hasRequiredPermissions) {
      return new NextResponse('Insufficient permissions', { status: 403 })
    }
    
    return await handler(request, session)
  }, config)
}

/**
 * Rate limiting per user
 */
export const createUserRateLimit = (
  maxRequests: number,
  windowMs: number
) => {
  const userRequests: Map<string, { count: number; resetTime: number }> = new Map()
  
  return withAuth(async (request: NextRequest, session: SessionData) => {
    const now = Date.now()
    const existing = userRequests.get(session.userId)
    
    if (!existing || now > existing.resetTime) {
      userRequests.set(session.userId, { count: 1, resetTime: now + windowMs })
      return NextResponse.next()
    }
    
    if (existing.count >= maxRequests) {
      return new NextResponse('Rate limit exceeded', { status: 429 })
    }
    
    existing.count++
    return NextResponse.next()
  })
}

/**
 * Session utilities for client-side use
 */
export const clientSessionUtils = {
  /**
   * Check if user is authenticated (client-side)
   */
  isAuthenticated: (): boolean => {
    if (typeof document === 'undefined') return false
    return document.cookie.includes(DEFAULT_SESSION_CONFIG.cookieName)
  },

  /**
   * Logout (client-side)
   */
  logout: async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      // Force page reload to clear any cached data
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Clear cookie manually as fallback
      document.cookie = `${DEFAULT_SESSION_CONFIG.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      window.location.href = '/login'
    }
  },

  /**
   * Get session info (requires API call)
   */
  getSession: async (): Promise<SessionData | null> => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        return null
      }
      
      return await response.json()
    } catch (error) {
      console.error('Failed to get session:', error)
      return null
    }
  }
}

export default {
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  getSessionFromCookies,
  setSessionCookie,
  clearSessionCookie,
  logout,
  logoutAllSessions,
  withAuth,
  requireRole,
  requirePermission,
  createSessionMiddleware,
  generateSessionId,
  refreshSessionIfNeeded,
  clientSessionUtils
}