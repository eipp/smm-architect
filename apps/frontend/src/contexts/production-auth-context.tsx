"use client"

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useEffect, 
  useCallback,
  ReactNode 
} from 'react'
import { 
  User, 
  AuthTokens, 
  AuthSession, 
  AuthState,
  AuthError,
  LoginRequest,
  RegisterRequest,
  MFAMethod,
  Tenant,
  PermissionCheck,
  ResourceAction
} from '@/types/auth'
import { authService } from '@/lib/api/auth-service'

// Auth context type
interface AuthContextType extends AuthState {
  // Core authentication methods
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  refreshToken: () => Promise<void>
  
  // MFA methods
  verifyMFA: (code: string, method: string) => Promise<void>
  enableMFA: (method: string) => Promise<{ qrCode?: string; backupCodes?: string[] }>
  disableMFA: (method: string, verificationCode: string) => Promise<void>
  
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
  
  // Utilities
  clearError: () => void
  checkTokenExpiry: () => boolean
  
  // API client access
  apiRequest: <T>(endpoint: string, options?: RequestInit) => Promise<T>
}

// Auth state actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AuthError | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TENANT'; payload: Tenant | null }
  | { type: 'SET_TOKENS'; payload: AuthTokens | null }
  | { type: 'SET_SESSION'; payload: AuthSession | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_MFA_REQUIRED'; payload: boolean }
  | { type: 'SET_MFA_METHODS'; payload: MFAMethod[] }
  | { type: 'SET_MFA_CHALLENGE'; payload: string | undefined }
  | { type: 'RESET_STATE' }

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_USER':
      return { ...state, user: action.payload }
    
    case 'SET_TENANT':
      return { ...state, tenant: action.payload }
    
    case 'SET_TOKENS':
      return { ...state, tokens: action.payload }
    
    case 'SET_SESSION':
      return { ...state, session: action.payload }
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload }
    
    case 'SET_MFA_REQUIRED':
      return { 
        ...state, 
        mfa: { ...state.mfa, required: action.payload }
      }
    
    case 'SET_MFA_METHODS':
      return { 
        ...state, 
        mfa: { ...state.mfa, methods: action.payload }
      }
    
    case 'SET_MFA_CHALLENGE':
      return { 
        ...state, 
        mfa: { ...state.mfa, challenge: action.payload }
      }
    
    case 'RESET_STATE':
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

// Initial state
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

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }, [])

  // Check token expiry
  const checkTokenExpiry = useCallback((): boolean => {
    if (!state.tokens) return false
    
    const expiresAt = localStorage.getItem('token_expires_at')
    if (!expiresAt) return false
    
    return Date.now() < parseInt(expiresAt)
  }, [state.tokens])

  // API request wrapper with auth
  const apiRequest = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    if (!state.tokens?.accessToken) {
      throw new AuthError('NO_TOKEN', 'No authentication token available')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.tokens.accessToken}`,
      ...options.headers
    }

    if (state.tenant?.id) {
      headers['X-Tenant-ID'] = state.tenant.id
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include'
    })

    if (response.status === 401) {
      // Try to refresh token
      try {
        await refreshToken()
        // Retry request with new token
        const newToken = localStorage.getItem('smm_access_token')
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          const retryResponse = await fetch(endpoint, {
            ...options,
            headers,
            credentials: 'include'
          })
          
          if (retryResponse.ok) {
            return await retryResponse.json()
          }
        }
      } catch (refreshError) {
        // Refresh failed, force logout
        await logout()
        throw new AuthError('SESSION_EXPIRED', 'Session expired, please login again')
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        message: `HTTP ${response.status}: ${response.statusText}` 
      }))
      throw new AuthError(
        errorData.code || 'API_ERROR',
        errorData.message || 'Request failed'
      )
    }

    return await response.json()
  }, [state.tokens, state.tenant])

  // Login
  const login = useCallback(async (credentials: LoginRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const result = await authService.login(credentials)

      if (result.mfaRequired) {
        dispatch({ type: 'SET_MFA_REQUIRED', payload: true })
        dispatch({ type: 'SET_MFA_CHALLENGE', payload: result.mfaChallenge })
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      // Login successful
      dispatch({ type: 'SET_USER', payload: result.user })
      dispatch({ type: 'SET_TOKENS', payload: result.tokens })
      dispatch({ type: 'SET_SESSION', payload: result.session })
      dispatch({ type: 'SET_AUTHENTICATED', payload: true })
      dispatch({ type: 'SET_LOADING', payload: false })

      // Set tenant if user has one
      if (result.user.tenantId) {
        // In a real app, you might fetch full tenant data here
        dispatch({ type: 'SET_TENANT', payload: {
          id: result.user.tenantId,
          name: '', // Would be fetched from API
          slug: '',
          status: 'active',
          plan: 'professional',
          settings: {} as any,
          limits: {} as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          ownerId: result.user.id
        }})
      }

    } catch (error) {
      const authError = error instanceof AuthError 
        ? error 
        : new AuthError('LOGIN_FAILED', 'Login failed')
      
      dispatch({ type: 'SET_ERROR', payload: authError })
      dispatch({ type: 'SET_LOADING', payload: false })
      throw authError
    }
  }, [])

  // Verify MFA
  const verifyMFA = useCallback(async (code: string, method: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const result = await authService.verifyMFA(code, method)

      dispatch({ type: 'SET_USER', payload: result.user })
      dispatch({ type: 'SET_TOKENS', payload: result.tokens })
      dispatch({ type: 'SET_SESSION', payload: result.session })
      dispatch({ type: 'SET_AUTHENTICATED', payload: true })
      dispatch({ type: 'SET_MFA_REQUIRED', payload: false })
      dispatch({ type: 'SET_MFA_CHALLENGE', payload: undefined })
      dispatch({ type: 'SET_LOADING', payload: false })

    } catch (error) {
      const authError = error instanceof AuthError 
        ? error 
        : new AuthError('MFA_VERIFICATION_FAILED', 'MFA verification failed')
      
      dispatch({ type: 'SET_ERROR', payload: authError })
      dispatch({ type: 'SET_LOADING', payload: false })
      throw authError
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      await authService.logout()
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      dispatch({ type: 'RESET_STATE' })
    }
  }, [])

  // Register
  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const result = await authService.register(data)

      if (result.tokens) {
        dispatch({ type: 'SET_USER', payload: result.user })
        dispatch({ type: 'SET_TOKENS', payload: result.tokens })
        dispatch({ type: 'SET_AUTHENTICATED', payload: true })
      }

      dispatch({ type: 'SET_LOADING', payload: false })
      return result

    } catch (error) {
      const authError = error instanceof AuthError 
        ? error 
        : new AuthError('REGISTRATION_FAILED', 'Registration failed')
      
      dispatch({ type: 'SET_ERROR', payload: authError })
      dispatch({ type: 'SET_LOADING', payload: false })
      throw authError
    }
  }, [])

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const result = await authService.refreshToken()
      
      dispatch({ type: 'SET_TOKENS', payload: {
        accessToken: result.token,
        refreshToken: state.tokens?.refreshToken || '',
        expiresIn: result.expiresAt,
        tokenType: 'Bearer'
      }})
      
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      throw error
    }
  }, [state.tokens, logout])

  // Enable MFA
  const enableMFA = useCallback(async (method: string) => {
    return await authService.enableMFA(method)
  }, [])

  // Disable MFA
  const disableMFA = useCallback(async (method: string, verificationCode: string) => {
    await authService.disableMFA(method, verificationCode)
  }, [])

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    const updatedUser = await apiRequest<User>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
    
    dispatch({ type: 'SET_USER', payload: updatedUser })
    
    // Update stored user data
    localStorage.setItem('smm_user_data', JSON.stringify(updatedUser))
  }, [apiRequest])

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword)
  }, [])

  // Get sessions
  const getSessions = useCallback(async () => {
    return await authService.getSessions()
  }, [])

  // Revoke session
  const revokeSession = useCallback(async (sessionId: string) => {
    await authService.revokeSession(sessionId)
  }, [])

  // Permission checking
  const hasPermission = useCallback((check: PermissionCheck): boolean => {
    if (!state.user?.permissions) return false
    
    return state.user.permissions.some(permission => {
      // Basic resource and action matching
      if (permission.resource !== check.resource || permission.action !== check.action) {
        return false
      }
      
      // Check conditions if specified
      if (check.conditions && permission.conditions) {
        return check.conditions.every(checkCondition =>
          permission.conditions!.some(permCondition =>
            permCondition.field === checkCondition.field &&
            permCondition.operator === checkCondition.operator &&
            permCondition.value === checkCondition.value
          )
        )
      }
      
      return true
    })
  }, [state.user])

  // Role checking
  const hasRole = useCallback((roleName: string): boolean => {
    return state.user?.roles?.some(role => role.name === roleName) || false
  }, [state.user])

  // Multiple role checking
  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    return roleNames.some(roleName => hasRole(roleName))
  }, [hasRole])

  // Resource access checking
  const canAccess = useCallback((resource: ResourceAction): boolean => {
    const [resourceType, action] = resource.split(':')
    return hasPermission({
      resource: resourceType,
      action,
      conditions: []
    })
  }, [hasPermission])

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is authenticated
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser()
          
          if (storedUser) {
            dispatch({ type: 'SET_USER', payload: storedUser })
            dispatch({ type: 'SET_AUTHENTICATED', payload: true })
            
            // Try to get fresh user data
            try {
              const currentUser = await authService.getCurrentUser()
              dispatch({ type: 'SET_USER', payload: currentUser })
            } catch (error) {
              console.warn('Failed to refresh user data:', error)
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    initializeAuth()
  }, [])

  // Listen for auth events from other tabs
  useEffect(() => {
    const handleAuthLogin = (event: CustomEvent) => {
      dispatch({ type: 'SET_USER', payload: event.detail })
      dispatch({ type: 'SET_AUTHENTICATED', payload: true })
    }

    const handleAuthLogout = () => {
      dispatch({ type: 'RESET_STATE' })
    }

    window.addEventListener('auth:login', handleAuthLogin as EventListener)
    window.addEventListener('auth:logout', handleAuthLogout)

    return () => {
      window.removeEventListener('auth:login', handleAuthLogin as EventListener)
      window.removeEventListener('auth:logout', handleAuthLogout)
    }
  }, [])

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) return

    const checkAndRefreshToken = () => {
      const expiresAt = localStorage.getItem('token_expires_at')
      if (!expiresAt) return

      const timeUntilExpiry = parseInt(expiresAt) - Date.now()
      
      // Refresh token 5 minutes before expiry
      if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
        refreshToken().catch(console.error)
      }
    }

    // Check immediately and then every minute
    checkAndRefreshToken()
    const interval = setInterval(checkAndRefreshToken, 60000)

    return () => clearInterval(interval)
  }, [state.isAuthenticated, state.tokens, refreshToken])

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    refreshToken,
    verifyMFA,
    enableMFA,
    disableMFA,
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccess,
    updateProfile,
    changePassword,
    getSessions,
    revokeSession,
    clearError,
    checkTokenExpiry,
    apiRequest
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for permission checking
export function usePermissions() {
  const { hasPermission, hasRole, hasAnyRole, canAccess, user } = useAuth()
  
  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    canAccess,
    isAdmin: hasRole('admin'),
    isModerator: hasRole('moderator'),
    canManageUsers: canAccess('users:manage'),
    canManageWorkspaces: canAccess('workspaces:manage'),
    canApprove: canAccess('approvals:create'),
    user
  }
}