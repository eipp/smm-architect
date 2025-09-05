'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sanitizeHtml, sanitizeText, sanitizeUrl, clientRateLimit } from '@/lib/security/input-sanitization'
import { clientSessionUtils } from '@/lib/security/session-management'
import type { SessionData } from '@/lib/security/session-management'

/**
 * Hook for input sanitization
 */
export const useSanitization = () => {
  const sanitizeInput = useCallback((
    input: string,
    type: 'text' | 'html' | 'url' = 'text',
    options?: any
  ): string => {
    switch (type) {
      case 'html':
        return sanitizeHtml(input, options)
      case 'url':
        return sanitizeUrl(input, options)
      case 'text':
      default:
        return sanitizeText(input, options)
    }
  }, [])

  return { sanitizeInput }
}

/**
 * Hook for secure form handling
 *
 * Server-side validation mirrors these rules using `sanitizeFormData` and
 * related utilities (see `app/api/workspaces/validation.ts`) to prevent
 * client-side bypass.
 */
export const useSecureForm = <T extends Record<string, any>>(
  initialValues: T,
  validationRules?: Record<keyof T, {
    required?: boolean
    type?: 'text' | 'email' | 'url' | 'number'
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    sanitize?: boolean
  }>
) => {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { sanitizeInput } = useSanitization()

  const setValue = useCallback((name: keyof T, value: any) => {
    const rules = validationRules?.[name]
    
    // Sanitize input if enabled
    let sanitizedValue = value
    if (rules?.sanitize && typeof value === 'string') {
      sanitizedValue = sanitizeInput(value, rules.type || 'text')
    }

    setValues(prev => ({ ...prev, [name]: sanitizedValue }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }, [sanitizeInput, validationRules, errors])

  const validateField = useCallback((name: keyof T, value: any): string | undefined => {
    const rules = validationRules?.[name]
    if (!rules) return undefined

    // Required validation
    if (rules.required && (!value || value === '')) {
      return `${String(name)} is required`
    }

    if (!value) return undefined

    // Type validation
    if (rules.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Invalid email format'
      }
    }

    if (rules.type === 'url') {
      try {
        new URL(value)
      } catch {
        return 'Invalid URL format'
      }
    }

    if (rules.type === 'number') {
      if (isNaN(Number(value))) {
        return 'Must be a valid number'
      }
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum length is ${rules.minLength} characters`
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum length is ${rules.maxLength} characters`
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format'
    }

    return undefined
  }, [validationRules])

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    let isValid = true

    for (const [name, value] of Object.entries(values)) {
      const error = validateField(name as keyof T, value)
      if (error) {
        newErrors[name as keyof T] = error
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }, [values, validateField])

  const handleSubmit = useCallback(async (
    onSubmit: (values: T) => Promise<void> | void,
    options: { preventDuplicateSubmission?: boolean } = {}
  ) => {
    if (options.preventDuplicateSubmission && isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      if (!validate()) {
        return
      }

      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validate, isSubmitting])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setIsSubmitting(false)
  }, [initialValues])

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    validate,
    handleSubmit,
    reset
  }
}

/**
 * Hook for session management
 */
export const useSession = () => {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const sessionData = await clientSessionUtils.getSession()
      setSession(sessionData)
    } catch (err) {
      setError('Failed to fetch session')
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await clientSessionUtils.logout()
      setSession(null)
    } catch (err) {
      setError('Failed to logout')
    }
  }, [])

  const requireAuth = useCallback((redirectTo: string = '/login') => {
    if (!loading && !session) {
      router.push(redirectTo)
    }
  }, [loading, session, router])

  const hasRole = useCallback((role: string): boolean => {
    return session?.roles.includes(role) || false
  }, [session])

  const hasPermission = useCallback((permission: string): boolean => {
    return session?.permissions.includes(permission) || false
  }, [session])

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return roles.some(role => hasRole(role))
  }, [hasRole])

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }, [hasPermission])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return {
    session,
    loading,
    error,
    logout,
    requireAuth,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    refresh: fetchSession
  }
}

/**
 * Hook for client-side rate limiting
 */
export const useRateLimit = (key: string, maxRequests: number, windowMs: number) => {
  const isAllowed = useCallback((): boolean => {
    return clientRateLimit.isAllowed(key, maxRequests, windowMs)
  }, [key, maxRequests, windowMs])

  const reset = useCallback(() => {
    clientRateLimit.reset(key)
  }, [key])

  return { isAllowed, reset }
}

/**
 * Hook for CSRF protection
 */
export const useCSRF = () => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const fetchCSRFToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/csrf', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setCsrfToken(data.token)
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
  }, [])

  const getCSRFHeaders = useCallback(() => {
    return csrfToken ? { 'csrf-token': csrfToken } : {}
  }, [csrfToken])

  useEffect(() => {
    fetchCSRFToken()
  }, [fetchCSRFToken])

  return {
    csrfToken,
    getCSRFHeaders,
    refresh: fetchCSRFToken
  }
}

/**
 * Hook for secure API calls
 */
export const useSecureAPI = () => {
  const { getCSRFHeaders } = useCSRF()
  const { session } = useSession()

  const secureRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const headers = {
      'Content-Type': 'application/json',
      ...getCSRFHeaders(),
      ...options.headers
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })
  }, [getCSRFHeaders])

  const get = useCallback(async (url: string): Promise<Response> => {
    return secureRequest(url, { method: 'GET' })
  }, [secureRequest])

  const post = useCallback(async (url: string, data?: any): Promise<Response> => {
    return secureRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [secureRequest])

  const put = useCallback(async (url: string, data?: any): Promise<Response> => {
    return secureRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }, [secureRequest])

  const del = useCallback(async (url: string): Promise<Response> => {
    return secureRequest(url, { method: 'DELETE' })
  }, [secureRequest])

  return { get, post, put, delete: del, secureRequest }
}

/**
 * Security context provider
 */
import React, { createContext, useContext, ReactNode } from 'react'

interface SecurityContextType {
  sanitizeInput: (input: string, type?: 'text' | 'html' | 'url', options?: any) => string
  session: SessionData | null
  loading: boolean
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  logout: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { sanitizeInput } = useSanitization()
  const { session, loading, hasRole, hasPermission, logout } = useSession()

  const value: SecurityContextType = {
    sanitizeInput,
    session,
    loading,
    hasRole,
    hasPermission,
    logout
  }

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  )
}

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider')
  }
  return context
}

/**
 * Security components
 */

// Component for role-based access control
export const RequireRole: React.FC<{
  roles: string[]
  fallback?: ReactNode
  children: ReactNode
}> = ({ roles, fallback = null, children }) => {
  const { hasAnyRole } = useSession()
  
  if (!hasAnyRole(roles)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Component for permission-based access control
export const RequirePermission: React.FC<{
  permissions: string[]
  requireAll?: boolean
  fallback?: ReactNode
  children: ReactNode
}> = ({ permissions, requireAll = false, fallback = null, children }) => {
  const { hasPermission, hasAllPermissions } = useSession()
  
  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : permissions.some(permission => hasPermission(permission))
  
  if (!hasAccess) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Component for authenticated users only
export const RequireAuth: React.FC<{
  fallback?: ReactNode
  children: ReactNode
}> = ({ fallback = null, children }) => {
  const { session, loading } = useSession()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (!session) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// Secure content renderer (sanitizes HTML)
export const SecureContent: React.FC<{
  content: string
  type?: 'text' | 'html' | 'url'
  options?: any
  className?: string
}> = ({ content, type = 'html', options, className }) => {
  const { sanitizeInput } = useSanitization()
  
  const sanitizedContent = sanitizeInput(content, type, options)
  
  if (type === 'html') {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    )
  }
  
  return <div className={className}>{sanitizedContent}</div>
}

// Secure link component
export const SecureLink: React.FC<{
  href: string
  children: ReactNode
  className?: string
  target?: string
  rel?: string
}> = ({ href, children, className, target, rel }) => {
  const { sanitizeInput } = useSanitization()
  
  const sanitizedHref = sanitizeInput(href, 'url')
  
  if (!sanitizedHref) {
    return <span className={className}>{children}</span>
  }
  
  const linkRel = target === '_blank' ? 'noopener noreferrer' : rel
  
  return (
    <a
      href={sanitizedHref}
      className={className}
      target={target}
      rel={linkRel}
    >
      {children}
    </a>
  )
}