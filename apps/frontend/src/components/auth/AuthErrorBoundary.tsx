/**
 * Authentication Error Boundary and Error Handling Components
 * 
 * Provides comprehensive error handling for authentication failures,
 * session expiration, and other auth-related issues.
 */

"use client"

import React, { Component, ReactNode, useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, LogOut, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface AuthErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
  retryCount: number
}

interface AuthErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  maxRetries?: number
  onError?: (error: Error, errorInfo: any) => void
}

/**
 * Error boundary specifically for authentication-related errors
 */
export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AuthErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo)
    
    this.setState({ errorInfo })
    
    // Call error callback if provided
    this.props.onError?.(error, errorInfo)
    
    // Report to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          component: 'AuthErrorBoundary',
          retryCount: this.state.retryCount
        },
        extra: errorInfo
      })
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      console.warn('Max retries reached for auth error boundary')
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      
      if (fallback) {
        return fallback(this.state.error!, this.handleRetry)
      }
      
      return (
        <AuthErrorFallback 
          error={this.state.error!}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
        />
      )
    }

    return this.props.children
  }
}

interface AuthErrorFallbackProps {
  error: Error
  onRetry: () => void
  onReset: () => void
  retryCount: number
  maxRetries: number
}

/**
 * Default fallback component for authentication errors
 */
function AuthErrorFallback({ 
  error, 
  onRetry, 
  onReset, 
  retryCount, 
  maxRetries 
}: AuthErrorFallbackProps) {
  const { logout } = useAuth()
  
  const isAuthError = error.message.includes('Authentication') || 
                     error.message.includes('Token') ||
                     error.message.includes('Unauthorized')
  
  const isNetworkError = error.message.includes('Failed to fetch') ||
                        error.message.includes('Network') ||
                        error.message.includes('ERR_NETWORK')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {isAuthError ? 'Authentication Error' : 
             isNetworkError ? 'Connection Error' : 
             'Something went wrong'}
          </CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {isAuthError && 'There was a problem with your authentication session.'}
            {isNetworkError && 'Unable to connect to our servers. Please check your internet connection.'}
            {!isAuthError && !isNetworkError && 'An unexpected error occurred while loading the application.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Details</AlertTitle>
            <AlertDescription className="text-sm font-mono">
              {error.message}
            </AlertDescription>
          </Alert>
          
          {retryCount > 0 && (
            <Alert>
              <AlertDescription>
                Retry attempt {retryCount} of {maxRetries}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-2">
            {retryCount < maxRetries && (
              <Button 
                onClick={onRetry}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            {isAuthError && (
              <Button 
                onClick={() => {
                  logout()
                  onReset()
                }}
                className="w-full"
                variant="outline"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out and Return to Login
              </Button>
            )}
            
            <Button 
              onClick={onReset}
              className="w-full"
              variant="ghost"
            >
              Reset Application
            </Button>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            If this problem persists, please contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Hook for handling authentication errors in components
 */
export function useAuthErrorHandler() {
  const { logout, isAuthenticated } = useAuth()
  const [lastError, setLastError] = useState<string | null>(null)
  
  const handleAuthError = React.useCallback((error: Error | string) => {
    const errorMessage = typeof error === 'string' ? error : error.message
    
    console.error('Authentication error:', errorMessage)
    setLastError(errorMessage)
    
    // Handle specific error types
    if (errorMessage.includes('Token expired') || 
        errorMessage.includes('Invalid token') ||
        errorMessage.includes('Unauthorized')) {
      
      // Clear auth state and redirect to login
      logout()
      
      // Show user-friendly message
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert('Your session has expired. Please sign in again.')
        }, 100)
      }
    }
    
    // Report to error tracking
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { 
          component: 'AuthErrorHandler',
          authenticated: isAuthenticated
        }
      })
    }
  }, [logout, isAuthenticated])
  
  const clearError = React.useCallback(() => {
    setLastError(null)
  }, [])
  
  return {
    handleAuthError,
    clearError,
    lastError,
    hasError: lastError !== null
  }
}

/**
 * Network status component for connection issues
 */
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineMessage(false)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineMessage(true)
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  if (!showOfflineMessage) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-2 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You are currently offline. Some features may not be available.</span>
        {isOnline && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOfflineMessage(false)}
            className="text-white hover:bg-red-700"
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Session expiration warning component
 */
export function SessionExpirationWarning() {
  const { refreshToken, logout } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  
  useEffect(() => {
    const checkTokenExpiry = () => {
      if (typeof window === 'undefined') return
      
      const expiresAt = sessionStorage.getItem('token_expires_at')
      if (!expiresAt) return
      
      const timeToExpiry = parseInt(expiresAt) - Date.now()
      const warningThreshold = 5 * 60 * 1000 // 5 minutes
      
      if (timeToExpiry <= warningThreshold && timeToExpiry > 0) {
        setShowWarning(true)
        setTimeLeft(Math.ceil(timeToExpiry / 1000))
      } else {
        setShowWarning(false)
      }
    }
    
    const interval = setInterval(checkTokenExpiry, 1000)
    checkTokenExpiry() // Check immediately
    
    return () => clearInterval(interval)
  }, [])
  
  const handleExtendSession = async () => {
    try {
      await refreshToken()
      setShowWarning(false)
    } catch (error) {
      console.error('Failed to refresh token:', error)
      logout()
    }
  }
  
  if (!showWarning) return null
  
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800">Session Expiring Soon</AlertTitle>
        <AlertDescription className="text-yellow-700">
          Your session will expire in {minutes}:{seconds.toString().padStart(2, '0')}.
          <div className="mt-2 flex gap-2">
            <Button 
              size="sm" 
              onClick={handleExtendSession}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Extend Session
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowWarning(false)}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}

/**
 * Login retry component for failed login attempts
 */
interface LoginRetryProps {
  error: string
  onRetry: () => void
  onClearError: () => void
  retryCount: number
  maxRetries: number
}

export function LoginRetry({ 
  error, 
  onRetry, 
  onClearError, 
  retryCount, 
  maxRetries 
}: LoginRetryProps) {
  const isRateLimited = error.includes('Rate limit') || error.includes('Too many attempts')
  const isInvalidCredentials = error.includes('Invalid credentials') || error.includes('Authentication failed')
  
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isRateLimited ? 'Too Many Attempts' :
         isInvalidCredentials ? 'Authentication Failed' :
         'Login Error'}
      </AlertTitle>
      <AlertDescription>
        {error}
        
        {retryCount < maxRetries && !isRateLimited && (
          <div className="mt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again ({retryCount}/{maxRetries})
            </Button>
          </div>
        )}
        
        {isRateLimited && (
          <div className="mt-2 text-sm">
            Please wait before attempting to login again.
          </div>
        )}
        
        <Button 
          size="sm" 
          variant="ghost"
          onClick={onClearError}
          className="mt-2 ml-2"
        >
          Dismiss
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export default AuthErrorBoundary