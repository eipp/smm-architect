"use client"

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react'

export interface User {
  id: string
  email: string
  name: string
  roles: Role[]
  tenantId: string
  avatar?: string
  preferences?: UserPreferences
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export interface Permission {
  resource: 'workspace' | 'campaign' | 'approval' | 'audit' | 'settings' | 'team'
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'publish' | 'manage'
  scope?: 'own' | 'team' | 'all'
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    browser: boolean
    approvalRequired: boolean
    budgetAlerts: boolean
  }
  timezone: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  token: string | null
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
  hasPermission: (resource: string, action: string, scope?: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthConfig {
  apiBaseUrl: string
  tokenKey: string
  refreshThreshold: number // seconds before expiry
  maxAge: number
}

const defaultConfig: AuthConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  tokenKey: 'smm_auth_token',
  refreshThreshold: 300, // 5 minutes
  maxAge: 24 * 60 * 60, // 24 hours
}

export function AuthProvider({ 
  children, 
  config = defaultConfig 
}: { 
  children: React.ReactNode
  config?: Partial<AuthConfig>
}) {
  const fullConfig = { ...defaultConfig, ...config }
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    token: null,
    error: null,
  })

  // Token management
  const getStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(fullConfig.tokenKey)
  }, [fullConfig.tokenKey])

  const storeToken = useCallback((token: string, expiresAt: number) => {
    if (typeof window === 'undefined') return
    
    // Store token in sessionStorage for client-side access
    sessionStorage.setItem(fullConfig.tokenKey, token)
    sessionStorage.setItem('token_expires_at', expiresAt.toString())
    
    // Also set httpOnly cookie for server-side requests
    document.cookie = `${fullConfig.tokenKey}=${token}; Secure; HttpOnly; SameSite=Strict; Max-Age=${fullConfig.maxAge}`
  }, [fullConfig])

  const clearToken = useCallback(() => {
    if (typeof window === 'undefined') return
    
    sessionStorage.removeItem(fullConfig.tokenKey)
    sessionStorage.removeItem('token_expires_at')
    document.cookie = `${fullConfig.tokenKey}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }, [fullConfig.tokenKey])

  // API helpers
  const apiRequest = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const token = state.token || getStoredToken()
    
    const response = await fetch(`${fullConfig.apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'X-Trace-ID': generateTraceId(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }

    return response.json()
  }, [state.token, getStoredToken, fullConfig.apiBaseUrl])

  // Auth actions
  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${fullConfig.apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Invalid credentials')
      }

      const { token, user, expiresAt } = await response.json()
      
      storeToken(token, expiresAt)
      setState({
        user,
        token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }))
    }
  }, [fullConfig.apiBaseUrl, storeToken])

  const logout = useCallback(() => {
    clearToken()
    setState({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    })
  }, [clearToken])

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${fullConfig.apiBaseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const { token, user, expiresAt } = await response.json()
      
      storeToken(token, expiresAt)
      setState(prev => ({
        ...prev,
        user,
        token,
        isAuthenticated: true,
      }))
    } catch (error) {
      logout()
    }
  }, [fullConfig.apiBaseUrl, storeToken, logout])

  const updateUser = useCallback((updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }))
  }, [])

  // Permission checking
  const hasPermission = useCallback((
    resource: string, 
    action: string, 
    scope?: string
  ): boolean => {
    if (!state.user?.roles) return false
    
    return state.user.roles.some(role => 
      role.permissions.some(permission => 
        permission.resource === resource &&
        permission.action === action &&
        (!scope || permission.scope === scope || permission.scope === 'all')
      )
    )
  }, [state.user])

  // Token refresh logic
  useEffect(() => {
    const checkTokenExpiry = () => {
      if (typeof window === 'undefined') return
      
      const expiresAt = sessionStorage.getItem('token_expires_at')
      if (!expiresAt || !state.token) return

      const timeToExpiry = parseInt(expiresAt) - Date.now()
      
      // Refresh if within threshold
      if (timeToExpiry < fullConfig.refreshThreshold * 1000 && timeToExpiry > 0) {
        refreshToken()
      } else if (timeToExpiry <= 0) {
        logout()
      }
    }

    // Check immediately and then every minute
    checkTokenExpiry()
    const interval = setInterval(checkTokenExpiry, 60000)
    
    return () => clearInterval(interval)
  }, [state.token, fullConfig.refreshThreshold, refreshToken, logout])

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredToken()
      
      if (!token) {
        setState(prev => ({ ...prev, isLoading: false }))
        return
      }

      try {
        const user = await apiRequest<User>('/api/auth/me')
        setState({
          user,
          token,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
      } catch (error) {
        clearToken()
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initializeAuth()
  }, [getStoredToken, clearToken, apiRequest])

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    updateUser,
    hasPermission,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Permission hook for convenience
export function usePermissions() {
  const { hasPermission, user } = useAuth()
  
  const canApprove = React.useMemo(() => 
    hasPermission('campaign', 'approve'), [hasPermission]
  )
  
  const canPublish = React.useMemo(() => 
    hasPermission('campaign', 'publish'), [hasPermission]
  )
  
  const canManageTeam = React.useMemo(() => 
    hasPermission('team', 'manage'), [hasPermission]
  )

  const canManageSettings = React.useMemo(() => 
    hasPermission('settings', 'manage'), [hasPermission]
  )

  const canCreateWorkspace = React.useMemo(() => 
    hasPermission('workspace', 'create'), [hasPermission]
  )

  const canViewAudit = React.useMemo(() => 
    hasPermission('audit', 'read'), [hasPermission]
  )

  return {
    hasPermission,
    canApprove,
    canPublish,
    canManageTeam,
    canManageSettings,
    canCreateWorkspace,
    canViewAudit,
    user,
  }
}

// Utility functions
function generateTraceId(): string {
  return `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export type { AuthContextValue, AuthConfig }