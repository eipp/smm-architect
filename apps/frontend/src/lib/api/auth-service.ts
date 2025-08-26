/**
 * Production-ready Authentication Service
 * 
 * Integrates with the SMM Architect backend API (/api/auth/*) endpoints
 * Provides comprehensive authentication functionality with security features
 */

import { 
  User, 
  AuthTokens, 
  AuthSession, 
  LoginRequest, 
  RegisterRequest, 
  AuthError,
  MFAMethod 
} from '@/types/auth'

// Configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  endpoints: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    register: '/api/auth/register',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    changePassword: '/api/auth/change-password',
    sessions: '/api/auth/sessions',
    enableMFA: '/api/auth/mfa/enable',
    disableMFA: '/api/auth/mfa/disable',
    verifyMFA: '/api/auth/mfa/verify'
  },
  timeout: 30000, // 30 seconds
  retries: 3
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'smm_access_token',
  REFRESH_TOKEN: 'smm_refresh_token',
  USER_DATA: 'smm_user_data',
  TENANT_ID: 'smm_tenant_id',
  SESSION_ID: 'smm_session_id'
}

/**
 * HTTP Client with authentication and error handling
 */
class APIClient {
  private baseUrl: string
  private timeout: number
  private retries: number

  constructor(config: typeof API_CONFIG) {
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout
    this.retries = config.retries
  }

  /**
   * Make authenticated API request
   */
  async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    includeAuth = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Version': '1.0.0',
      ...options.headers
    }

    // Add authentication headers
    if (includeAuth) {
      const token = this.getStoredToken()
      const tenantId = this.getStoredTenantId()
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      if (tenantId) {
        headers['X-Tenant-ID'] = tenantId
      }
    }

    // Add CSRF protection for state-changing operations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      const csrfToken = await this.getCSRFToken()
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }
    }

    const requestConfig: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Include cookies for CSRF
      signal: AbortSignal.timeout(this.timeout)
    }

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, requestConfig)
        
        // Handle specific HTTP status codes
        if (response.status === 401) {
          // Try to refresh token once
          if (includeAuth && attempt === 1) {
            const refreshed = await this.attemptTokenRefresh()
            if (refreshed) {
              // Retry with new token
              const newToken = this.getStoredToken()
              if (newToken) {
                requestConfig.headers = {
                  ...requestConfig.headers,
                  'Authorization': `Bearer ${newToken}`
                }
                continue
              }
            }
          }
          throw new AuthError('UNAUTHORIZED', 'Authentication required')
        }

        if (response.status === 403) {
          throw new AuthError('FORBIDDEN', 'Insufficient permissions')
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          throw new AuthError('RATE_LIMITED', `Rate limit exceeded. Retry after ${retryAfter} seconds`)
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ 
            message: `HTTP ${response.status}: ${response.statusText}` 
          }))
          throw new AuthError(
            errorData.code || 'API_ERROR',
            errorData.message || errorData.error || 'An error occurred'
          )
        }

        // Parse response
        const contentType = response.headers.get('Content-Type')
        if (contentType?.includes('application/json')) {
          return await response.json()
        } else {
          return await response.text() as unknown as T
        }

      } catch (error) {
        // Don't retry on auth errors or client errors
        if (error instanceof AuthError || 
            (error as any)?.name === 'AbortError' ||
            attempt === this.retries) {
          throw error
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new AuthError('NETWORK_ERROR', 'Request failed after retries')
  }

  /**
   * Get CSRF token for state-changing operations
   */
  private async getCSRFToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/csrf-token`, {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        return data.csrfToken
      }
    } catch (error) {
      console.warn('Failed to get CSRF token:', error)
    }
    return null
  }

  /**
   * Attempt to refresh the access token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = this.getStoredRefreshToken()
      if (!refreshToken) return false

      const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.refresh}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        this.storeTokens(data.token, refreshToken, data.expiresAt)
        return true
      }
    } catch (error) {
      console.warn('Token refresh failed:', error)
    }

    // Clear invalid tokens
    this.clearStoredTokens()
    return false
  }

  // Token storage methods
  private getStoredToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }

  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  }

  private getStoredTenantId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TENANT_ID)
  }

  private storeTokens(accessToken: string, refreshToken: string, expiresAt?: number): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    
    if (expiresAt) {
      localStorage.setItem('token_expires_at', expiresAt.toString())
    }
  }

  private clearStoredTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem('token_expires_at')
  }
}

/**
 * Authentication Service
 */
export class AuthService {
  private client: APIClient

  constructor() {
    this.client = new APIClient(API_CONFIG)
  }

  /**
   * User login with email and password
   */
  async login(credentials: LoginRequest): Promise<{
    user: User
    tokens: AuthTokens
    session: AuthSession
    mfaRequired?: boolean
    mfaChallenge?: string
  }> {
    const response = await this.client.request<{
      token: string
      user: User
      expiresAt: number
      refreshToken?: string
      mfaRequired?: boolean
      mfaChallenge?: string
    }>(
      API_CONFIG.endpoints.login,
      {
        method: 'POST',
        body: JSON.stringify(credentials)
      },
      false // Don't include auth headers for login
    )

    // Store tokens if no MFA required
    if (!response.mfaRequired && response.token) {
      this.storeUserSession({
        accessToken: response.token,
        refreshToken: response.refreshToken || '',
        expiresIn: response.expiresAt,
        tokenType: 'Bearer'
      }, response.user)
    }

    return {
      user: response.user,
      tokens: {
        accessToken: response.token,
        refreshToken: response.refreshToken || '',
        expiresIn: response.expiresAt,
        tokenType: 'Bearer'
      },
      session: {
        id: '', // Will be populated by backend
        userId: response.user.id,
        tenantId: response.user.tenantId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          ip: '', // Will be populated by backend
          deviceType: this.detectDeviceType()
        },
        createdAt: new Date(),
        expiresAt: new Date(response.expiresAt),
        lastActivity: new Date(),
        isActive: true
      },
      mfaRequired: response.mfaRequired,
      mfaChallenge: response.mfaChallenge
    }
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(code: string, method: string): Promise<{
    user: User
    tokens: AuthTokens
    session: AuthSession
  }> {
    const response = await this.client.request<{
      token: string
      user: User
      expiresAt: number
      refreshToken: string
    }>(
      API_CONFIG.endpoints.verifyMFA,
      {
        method: 'POST',
        body: JSON.stringify({ code, method })
      },
      false
    )

    // Store tokens after successful MFA
    const tokens = {
      accessToken: response.token,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresAt,
      tokenType: 'Bearer' as const
    }

    this.storeUserSession(tokens, response.user)

    return {
      user: response.user,
      tokens,
      session: {
        id: '',
        userId: response.user.id,
        tenantId: response.user.tenantId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          ip: '',
          deviceType: this.detectDeviceType()
        },
        createdAt: new Date(),
        expiresAt: new Date(response.expiresAt),
        lastActivity: new Date(),
        isActive: true
      }
    }
  }

  /**
   * User logout
   */
  async logout(): Promise<void> {
    try {
      await this.client.request(API_CONFIG.endpoints.logout, {
        method: 'POST'
      })
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      this.clearUserSession()
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return await this.client.request<User>(API_CONFIG.endpoints.me)
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ token: string; expiresAt: number }> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) {
      throw new AuthError('NO_REFRESH_TOKEN', 'No refresh token available')
    }

    const response = await this.client.request<{
      token: string
      expiresAt: number
    }>(
      API_CONFIG.endpoints.refresh,
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      },
      false
    )

    // Update stored token
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.token)
    localStorage.setItem('token_expires_at', response.expiresAt.toString())

    return response
  }

  /**
   * User registration
   */
  async register(data: RegisterRequest): Promise<{
    user: User
    tokens?: AuthTokens
    emailVerificationRequired?: boolean
  }> {
    return await this.client.request<{
      user: User
      tokens?: AuthTokens
      emailVerificationRequired?: boolean
    }>(
      API_CONFIG.endpoints.register,
      {
        method: 'POST',
        body: JSON.stringify(data)
      },
      false
    )
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<AuthSession[]> {
    return await this.client.request<AuthSession[]>(API_CONFIG.endpoints.sessions)
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.client.request(
      `${API_CONFIG.endpoints.sessions}/${sessionId}`,
      { method: 'DELETE' }
    )
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.request(
      API_CONFIG.endpoints.changePassword,
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      }
    )
  }

  /**
   * Enable MFA
   */
  async enableMFA(method: string): Promise<{ qrCode?: string; backupCodes?: string[] }> {
    return await this.client.request<{ qrCode?: string; backupCodes?: string[] }>(
      API_CONFIG.endpoints.enableMFA,
      {
        method: 'POST',
        body: JSON.stringify({ method })
      }
    )
  }

  /**
   * Disable MFA
   */
  async disableMFA(method: string, verificationCode: string): Promise<void> {
    await this.client.request(
      API_CONFIG.endpoints.disableMFA,
      {
        method: 'POST',
        body: JSON.stringify({ method, verificationCode })
      }
    )
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const expiresAt = localStorage.getItem('token_expires_at')
    
    if (!token || !expiresAt) return false
    
    return Date.now() < parseInt(expiresAt)
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    if (userData) {
      try {
        return JSON.parse(userData)
      } catch (error) {
        console.warn('Failed to parse stored user data:', error)
        localStorage.removeItem(STORAGE_KEYS.USER_DATA)
      }
    }
    return null
  }

  /**
   * Store user session data
   */
  private storeUserSession(tokens: AuthTokens, user: User): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
    localStorage.setItem(STORAGE_KEYS.TENANT_ID, user.tenantId)
    localStorage.setItem('token_expires_at', tokens.expiresIn.toString())
    
    // Broadcast login event to other tabs
    window.dispatchEvent(new CustomEvent('auth:login', { detail: user }))
  }

  /**
   * Clear user session data
   */
  private clearUserSession(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    localStorage.removeItem('token_expires_at')
    
    // Broadcast logout event to other tabs
    window.dispatchEvent(new CustomEvent('auth:logout'))
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(userAgent)) {
      return 'tablet'
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile'
    }
    
    return 'desktop'
  }
}

// Export singleton instance
export const authService = new AuthService()

// Export error class
export { AuthError }