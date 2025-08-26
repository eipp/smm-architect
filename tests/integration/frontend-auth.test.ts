/**
 * Frontend Authentication Integration Tests
 * 
 * Tests the complete auth flow between frontend and backend
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuthService, AuthError } from '../../apps/frontend/src/lib/api/auth-service'
import { LoginRequest, User, AuthTokens } from '../../apps/frontend/src/types/auth'

// Mock fetch for testing
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)'
  }
})

describe('Frontend Authentication Integration', () => {
  let authService: AuthService
  
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    authService = new AuthService()
  })

  describe('User Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: false,
            sms: false,
            workflowUpdates: true,
            campaignAlerts: true,
            systemMaintenance: false
          },
          dashboard: {
            layout: 'grid',
            defaultView: 'campaigns',
            widgetsEnabled: []
          }
        },
        tenantId: 'tenant-123',
        roles: [],
        permissions: []
      }

      const mockResponse = {
        token: 'mock-jwt-token',
        user: mockUser,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        refreshToken: 'mock-refresh-token'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers()
      })

      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true
      }

      const result = await authService.login(credentials)

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(credentials)
        })
      )

      expect(result.user).toEqual(mockUser)
      expect(result.tokens.accessToken).toBe('mock-jwt-token')
      expect(result.session.userId).toBe('user-123')
      expect(result.session.tenantId).toBe('tenant-123')
    })

    it('should handle MFA requirement during login', async () => {
      const mockResponse = {
        mfaRequired: true,
        mfaChallenge: 'mfa-challenge-123',
        user: { id: 'user-123', email: 'test@example.com' }
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = await authService.login(credentials)

      expect(result.mfaRequired).toBe(true)
      expect(result.mfaChallenge).toBe('mfa-challenge-123')
    })

    it('should throw AuthError on invalid credentials', async () => {
      const mockErrorResponse = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse)
      })

      const credentials: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      await expect(authService.login(credentials)).rejects.toThrow(AuthError)
      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password')
    })
  })

  describe('MFA Verification Flow', () => {
    it('should successfully verify MFA code', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {} as any,
        tenantId: 'tenant-123',
        roles: [],
        permissions: []
      }

      const mockResponse = {
        token: 'mock-jwt-token',
        user: mockUser,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        refreshToken: 'mock-refresh-token'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await authService.verifyMFA('123456', 'totp')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/mfa/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: '123456', method: 'totp' })
        })
      )

      expect(result.user).toEqual(mockUser)
      expect(result.tokens.accessToken).toBe('mock-jwt-token')
    })

    it('should throw error on invalid MFA code', async () => {
      const mockErrorResponse = {
        code: 'INVALID_MFA_CODE',
        message: 'Invalid verification code'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockErrorResponse)
      })

      await expect(authService.verifyMFA('000000', 'totp'))
        .rejects.toThrow('Invalid verification code')
    })
  })

  describe('Token Management', () => {
    it('should refresh token successfully', async () => {
      localStorageMock.getItem.mockReturnValue('mock-refresh-token')

      const mockResponse = {
        token: 'new-jwt-token',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await authService.refreshToken()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'mock-refresh-token' })
        })
      )

      expect(result.token).toBe('new-jwt-token')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'smm_access_token',
        'new-jwt-token'
      )
    })

    it('should handle token refresh failure', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-refresh-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'INVALID_REFRESH_TOKEN' })
      })

      await expect(authService.refreshToken())
        .rejects.toThrow(AuthError)
    })

    it('should check token expiry correctly', () => {
      // Token expired
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'smm_access_token') return 'mock-token'
        if (key === 'token_expires_at') return (Date.now() - 1000).toString()
        return null
      })

      expect(authService.isAuthenticated()).toBe(false)

      // Token valid
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'smm_access_token') return 'mock-token'
        if (key === 'token_expires_at') return (Date.now() + 60000).toString()
        return null
      })

      expect(authService.isAuthenticated()).toBe(true)
    })
  })

  describe('User Profile Management', () => {
    it('should get current user profile', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: {} as any,
        tenantId: 'tenant-123',
        roles: [],
        permissions: []
      }

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'smm_access_token') return 'mock-token'
        if (key === 'smm_tenant_id') return 'tenant-123'
        return null
      })

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })

      const user = await authService.getCurrentUser()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'X-Tenant-ID': 'tenant-123'
          })
        })
      )

      expect(user).toEqual(mockUser)
    })

    it('should change password successfully', async () => {
      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      await authService.changePassword('oldPassword', 'newPassword')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            currentPassword: 'oldPassword',
            newPassword: 'newPassword'
          })
        })
      )
    })
  })

  describe('Session Management', () => {
    it('should get user sessions', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-123',
          tenantId: 'tenant-123',
          deviceInfo: {
            userAgent: 'Chrome',
            ip: '192.168.1.1',
            deviceType: 'desktop' as const
          },
          createdAt: new Date(),
          expiresAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        }
      ]

      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSessions)
      })

      const sessions = await authService.getSessions()

      expect(sessions).toEqual(mockSessions)
    })

    it('should revoke session successfully', async () => {
      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      })

      await authService.revokeSession('session-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/sessions/session-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('Logout Flow', () => {
    it('should logout successfully', async () => {
      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Logout successful' })
      })

      await authService.logout()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/logout',
        expect.objectContaining({
          method: 'POST'
        })
      )

      // Check that tokens are cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('smm_access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('smm_refresh_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('smm_user_data')
    })

    it('should clear local session even if API call fails', async () => {
      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await authService.logout()

      // Should still clear local storage
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('smm_access_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('smm_refresh_token')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password'
      })).rejects.toThrow(AuthError)
    })

    it('should handle rate limiting', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '60']]),
        json: () => Promise.resolve({
          code: 'RATE_LIMITED',
          message: 'Too many requests'
        })
      })

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password'
      })).rejects.toThrow('Rate limit exceeded')
    })

    it('should handle malformed responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(authService.login({
        email: 'test@example.com',
        password: 'password'
      })).rejects.toThrow(AuthError)
    })
  })

  describe('Security Features', () => {
    it('should include security headers in requests', async () => {
      localStorageMock.getItem.mockReturnValue('mock-token')

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      await authService.getCurrentUser()

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
            'X-Client-Version': '1.0.0'
          }),
          credentials: 'include'
        })
      )
    })

    it('should detect device type correctly', async () => {
      // Test mobile detection
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
        configurable: true
      })

      const mockResponse = {
        token: 'mock-token',
        user: { id: 'user-123', tenantId: 'tenant-123' } as User,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password'
      })

      expect(result.session.deviceInfo.deviceType).toBe('mobile')
    })
  })
})