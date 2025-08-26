"use client"

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { 
  User, 
  Tenant, 
  AuthSession, 
  AuthTokens, 
  AuthState, 
  AuthError,
  LoginRequest,
  RegisterRequest,
  PermissionCheck,
  ResourceAction
} from '@/types/auth'

interface AuthContextType extends AuthState {
  // Authentication methods
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  refreshToken: () => Promise<void>
  
  // MFA methods
  enableMFA: (method: string) => Promise<void>
  disableMFA: (method: string) => Promise<void>
  verifyMFA: (code: string, method: string) => Promise<void>
  
  // Permission checking
  hasPermission: (check: PermissionCheck) => boolean
  hasRole: (roleName: string) => boolean
  hasAnyRole: (roleNames: string[]) => boolean
  canAccess: (resource: ResourceAction) => boolean
  
  // Profile management
  updateProfile: (data: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  
  // Session management
  getSessions: () => Promise<AuthSession[]>
  revokeSession: (sessionId: string) => Promise<void>
  
  // Tenant switching (for users with multiple tenants)
  switchTenant: (tenantId: string) => Promise<void>
  
  // Utilities
  clearError: () => void
  checkTokenExpiry: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth reducer
type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TENANT'; payload: Tenant | null }
  | { type: 'SET_SESSION'; payload: AuthSession | null }
  | { type: 'SET_TOKENS'; payload: AuthTokens | null }
  | { type: 'SET_MFA_REQUIRED'; payload: boolean }
  | { type: 'SET_MFA_CHALLENGE'; payload: string | undefined }
  | { type: 'RESET_AUTH' }

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false 
      }
    
    case 'SET_TENANT':
      return { ...state, tenant: action.payload }
    
    case 'SET_SESSION':
      return { ...state, session: action.payload }
    
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload }
    
    case 'SET_MFA_REQUIRED':
      return { 
        ...state, 
        mfa: { ...state.mfa, required: action.payload }
      }
    
    case 'SET_MFA_CHALLENGE':
      return { 
        ...state, 
        mfa: { ...state.mfa, challenge: action.payload }
      }
    
    case 'RESET_AUTH':
      return {
        user: null,
        tenant: null,
        session: null,
        tokens: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
        mfa: {
          required: false,
          methods: [],
          challenge: undefined
        }
      }
    
    default:
      return state
  }
}

const initialState: AuthState = {
  user: null,
  tenant: null,
  session: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  mfa: {
    required: false,
    methods: [],
    challenge: undefined
  }
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Token management
  const saveTokens = useCallback((tokens: AuthTokens) => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    dispatch({ type: 'SET_TOKENS', payload: tokens })
  }, [])

  const clearTokens = useCallback(() => {
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_tenant')
    dispatch({ type: 'SET_TOKENS', payload: null })
  }, [])

  const checkTokenExpiry = useCallback((): boolean => {
    if (!state.tokens) return true
    
    const now = Date.now()
    const expiry = new Date(state.tokens.expiresIn).getTime()
    return now >= expiry
  }, [state.tokens])

  // API call wrapper with auth
  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as Record<string, string>

    if (state.tokens?.accessToken) {
      headers.Authorization = `Bearer ${state.tokens.accessToken}`
    }

    if (state.tenant?.id) {
      headers['X-Tenant-ID'] = state.tenant.id
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: 'An error occurred' 
      }))
      throw new AuthError(error.code || 'API_ERROR', error.message)
    }

    return response.json()
  }, [state.tokens, state.tenant])

  // Authentication methods
  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new AuthError(data.code || 'LOGIN_FAILED', data.message)
      }

      if (data.mfaRequired) {
        dispatch({ type: 'SET_MFA_REQUIRED', payload: true })
        dispatch({ type: 'SET_MFA_CHALLENGE', payload: data.mfaChallenge })
        return
      }

      saveTokens(data.tokens)
      dispatch({ type: 'SET_USER', payload: data.user })
      dispatch({ type: 'SET_TENANT', payload: data.tenant })
      dispatch({ type: 'SET_SESSION', payload: data.session })

      // Save to localStorage for persistence
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      localStorage.setItem('auth_tenant', JSON.stringify(data.tenant))

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as AuthError })
    }
  }, [saveTokens])

  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      if (state.tokens?.accessToken) {
        await apiCall('/api/auth/logout', { method: 'POST' })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearTokens()
      dispatch({ type: 'RESET_AUTH' })
    }
  }, [state.tokens, apiCall, clearTokens])

  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new AuthError(result.code || 'REGISTER_FAILED', result.message)
      }

      // Auto-login after successful registration
      if (result.autoLogin) {
        saveTokens(result.tokens)
        dispatch({ type: 'SET_USER', payload: result.user })
        dispatch({ type: 'SET_TENANT', payload: result.tenant })
        dispatch({ type: 'SET_SESSION', payload: result.session })
      }

    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error as AuthError })
    }
  }, [saveTokens])

  const refreshToken = useCallback(async () => {
    if (!state.tokens?.refreshToken) {
      await logout()
      return
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: state.tokens.refreshToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        await logout()
        return
      }

      saveTokens(data.tokens)
      dispatch({ type: 'SET_USER', payload: data.user })

    } catch (error) {
      await logout()
    }
  }, [state.tokens, saveTokens, logout])

  // MFA methods
  const enableMFA = useCallback(async (method: string) => {
    await apiCall('/api/auth/mfa/enable', {
      method: 'POST',
      body: JSON.stringify({ method }),
    })
  }, [apiCall])

  const disableMFA = useCallback(async (method: string) => {
    await apiCall('/api/auth/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ method }),
    })
  }, [apiCall])

  const verifyMFA = useCallback(async (code: string, method: string) => {
    const response = await apiCall('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code, method }),
    })

    if (response.success) {
      dispatch({ type: 'SET_MFA_REQUIRED', payload: false })
      dispatch({ type: 'SET_MFA_CHALLENGE', payload: undefined })
      
      saveTokens(response.tokens)
      dispatch({ type: 'SET_USER', payload: response.user })
      dispatch({ type: 'SET_TENANT', payload: response.tenant })
      dispatch({ type: 'SET_SESSION', payload: response.session })
    }
  }, [apiCall, saveTokens])

  // Permission checking
  const hasPermission = useCallback((check: PermissionCheck): boolean => {
    if (!state.user) return false

    return state.user.permissions.some(permission => {
      if (permission.resource !== check.resource || permission.action !== check.action) {
        return false
      }

      // Check conditions if they exist
      if (permission.conditions && check.context) {
        return permission.conditions.every(condition => {
          const contextValue = check.context![condition.field]
          switch (condition.operator) {
            case 'equals':
              return contextValue === condition.value
            case 'not_equals':
              return contextValue !== condition.value
            case 'contains':
              return Array.isArray(contextValue) ? 
                contextValue.includes(condition.value) : 
                String(contextValue).includes(String(condition.value))
            case 'in':
              return Array.isArray(condition.value) ? 
                condition.value.includes(contextValue) : false
            case 'not_in':
              return Array.isArray(condition.value) ? 
                !condition.value.includes(contextValue) : true
            default:
              return true
          }
        })
      }

      return true
    })
  }, [state.user])

  const hasRole = useCallback((roleName: string): boolean => {
    if (!state.user) return false
    return state.user.roles.some(role => role.name === roleName)
  }, [state.user])

  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    if (!state.user) return false
    return state.user.roles.some(role => roleNames.includes(role.name))
  }, [state.user])

  const canAccess = useCallback((resource: ResourceAction): boolean => {
    const [resourceName, action] = resource.split(':')
    return hasPermission({ resource: resourceName, action })
  }, [hasPermission])

  // Profile management
  const updateProfile = useCallback(async (data: Partial<User>) => {
    const updatedUser = await apiCall('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    
    dispatch({ type: 'SET_USER', payload: updatedUser })
    localStorage.setItem('auth_user', JSON.stringify(updatedUser))
  }, [apiCall])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await apiCall('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  }, [apiCall])

  // Session management
  const getSessions = useCallback(async (): Promise<AuthSession[]> => {
    return apiCall('/api/auth/sessions')
  }, [apiCall])

  const revokeSession = useCallback(async (sessionId: string) => {
    await apiCall(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' })
  }, [apiCall])

  // Tenant switching
  const switchTenant = useCallback(async (tenantId: string) => {
    const response = await apiCall('/api/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    })

    dispatch({ type: 'SET_TENANT', payload: response.tenant })
    dispatch({ type: 'SET_USER', payload: response.user })
    localStorage.setItem('auth_tenant', JSON.stringify(response.tenant))
    localStorage.setItem('auth_user', JSON.stringify(response.user))
  }, [apiCall])

  // Utilities
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedTokens = localStorage.getItem('auth_tokens')
        const savedUser = localStorage.getItem('auth_user')
        const savedTenant = localStorage.getItem('auth_tenant')

        if (savedTokens && savedUser && savedTenant) {
          const tokens = JSON.parse(savedTokens)
          const user = JSON.parse(savedUser)
          const tenant = JSON.parse(savedTenant)

          if (!checkTokenExpiry()) {
            dispatch({ type: 'SET_TOKENS', payload: tokens })
            dispatch({ type: 'SET_USER', payload: user })
            dispatch({ type: 'SET_TENANT', payload: tenant })
          } else {
            // Try to refresh token
            await refreshToken()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        clearTokens()
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [refreshToken, clearTokens, checkTokenExpiry])

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.tokens || !state.isAuthenticated) return

    const refreshInterval = setInterval(() => {
      const timeUntilExpiry = new Date(state.tokens!.expiresIn).getTime() - Date.now()
      
      // Refresh token 5 minutes before expiry
      if (timeUntilExpiry < 5 * 60 * 1000) {
        refreshToken()
      }
    }, 60000) // Check every minute

    return () => clearInterval(refreshInterval)
  }, [state.tokens, state.isAuthenticated, refreshToken])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    refreshToken,
    enableMFA,
    disableMFA,
    verifyMFA,
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccess,
    updateProfile,
    changePassword,
    getSessions,
    revokeSession,
    switchTenant,
    clearError,
    checkTokenExpiry,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Custom AuthError class
class AuthError extends Error {
  code: string
  details?: Record<string, any>

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    this.details = details
  }
}