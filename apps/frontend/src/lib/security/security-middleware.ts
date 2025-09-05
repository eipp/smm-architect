import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'
import { generateNonce } from './input-sanitization'

/**
 * Security middleware for handling various security measures
 */

export interface SecurityConfig {
  csp: {
    enabled: boolean
    reportOnly: boolean
    reportUri?: string
    directives: Record<string, string[]>
  }
  csrf: {
    enabled: boolean
    tokenName: string
    cookieName: string
    secure: boolean
    sameSite: 'strict' | 'lax' | 'none'
  }
  headers: {
    hsts: boolean
    noSniff: boolean
    frameOptions: 'DENY' | 'SAMEORIGIN' | string
    xssProtection: boolean
    referrerPolicy: string
    permissionsPolicy: Record<string, string[]>
  }
  rateLimiting: {
    enabled: boolean
    windowMs: number
    maxRequests: number
    skipSuccessful: boolean
  }
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: process.env.NODE_ENV === 'development',
    reportUri: '/api/security/csp-report',
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'strict-dynamic'"],
      'style-src': ["'self'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    }
  },
  csrf: {
    enabled: true,
    tokenName: 'csrf-token',
    cookieName: '__csrf',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  },
  headers: {
    hsts: true,
    noSniff: true,
    frameOptions: 'DENY',
    xssProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      'interest-cohort': []
    }
  },
  rateLimiting: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessful: false
  }
}


/**
 * Generate Content Security Policy header value
 */
export const generateCSP = (config: SecurityConfig['csp'], nonce?: string): string => {
  const directives: string[] = []

  for (const [directive, values] of Object.entries(config.directives)) {
    if (values.length === 0) {
      directives.push(directive)
    } else {
      let directiveValues = [...values]
      
      // Add nonce to script-src and style-src if provided
      if (nonce && (directive === 'script-src' || directive === 'style-src')) {
        directiveValues.push(`'nonce-${nonce}'`)
      }
      
      directives.push(`${directive} ${directiveValues.join(' ')}`)
    }
  }

  return directives.join('; ')
}

/**
 * Generate CSRF token
 */
export const generateCSRFToken = (): string => {
  return generateNonce() + generateNonce()
}

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (token: string, cookieToken: string): boolean => {
  return token === cookieToken && token.length >= 32
}

/**
 * Get client IP address from request
 */
export const getClientIP = (request: NextRequest): string => {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const clientIP = request.headers.get('x-client-ip')
  if (clientIP) {
    return clientIP.trim()
  }

  // Fallback to connection IP (might not be available in all environments)
  return request.ip || '127.0.0.1'
}

/**
 * Security middleware factory
 */
export const createSecurityMiddleware = (config: Partial<SecurityConfig> = {}) => {
  const fullConfig: SecurityConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    ...config,
    csp: { ...DEFAULT_SECURITY_CONFIG.csp, ...config.csp },
    csrf: { ...DEFAULT_SECURITY_CONFIG.csrf, ...config.csrf },
    headers: { ...DEFAULT_SECURITY_CONFIG.headers, ...config.headers },
    rateLimiting: { ...DEFAULT_SECURITY_CONFIG.rateLimiting, ...config.rateLimiting }
  }

  const ratelimit =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new Ratelimit({
          redis: Redis.fromEnv(),
          limiter: Ratelimit.slidingWindow(
            fullConfig.rateLimiting.maxRequests,
            `${Math.floor(fullConfig.rateLimiting.windowMs / 1000)} s`
          )
        })
      : null

  return async (request: NextRequest): Promise<NextResponse> => {
    const response = NextResponse.next()
    const clientIP = getClientIP(request)
    const url = new URL(request.url)

    // Rate limiting
    if (fullConfig.rateLimiting.enabled && ratelimit) {
      const rateLimitKey = `${clientIP}:${url.pathname}`
      const { success, limit, remaining, reset } = await ratelimit.limit(rateLimitKey)

      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(reset - Date.now() / 1000).toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString()
          }
        })
      }

      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', reset.toString())
    }

    // Generate nonce for CSP
    const nonce = generateNonce()
    response.headers.set('X-CSP-Nonce', nonce)

    // Content Security Policy
    if (fullConfig.csp.enabled) {
      const cspHeader = fullConfig.csp.reportOnly 
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy'
      
      let cspValue = generateCSP(fullConfig.csp, nonce)
      
      if (fullConfig.csp.reportUri) {
        cspValue += `; report-uri ${fullConfig.csp.reportUri}`
      }
      
      response.headers.set(cspHeader, cspValue)
    }

    // CSRF Protection
    if (fullConfig.csrf.enabled && request.method !== 'GET') {
      const csrfToken = request.headers.get(fullConfig.csrf.tokenName)
      const csrfCookie = request.cookies.get(fullConfig.csrf.cookieName)?.value

      if (!csrfToken || !csrfCookie || !verifyCSRFToken(csrfToken, csrfCookie)) {
        return new NextResponse('CSRF Token Mismatch', { status: 403 })
      }
    }

    // Security Headers
    if (fullConfig.headers.hsts) {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      )
    }

    if (fullConfig.headers.noSniff) {
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    if (fullConfig.headers.frameOptions) {
      response.headers.set('X-Frame-Options', fullConfig.headers.frameOptions)
    }

    if (fullConfig.headers.xssProtection) {
      response.headers.set('X-XSS-Protection', '1; mode=block')
    }

    if (fullConfig.headers.referrerPolicy) {
      response.headers.set('Referrer-Policy', fullConfig.headers.referrerPolicy)
    }

    // Permissions Policy
    if (fullConfig.headers.permissionsPolicy) {
      const policies: string[] = []
      for (const [feature, allowlist] of Object.entries(fullConfig.headers.permissionsPolicy)) {
        if (allowlist.length === 0) {
          policies.push(`${feature}=()`)
        } else {
          policies.push(`${feature}=(${allowlist.join(' ')})`)
        }
      }
      response.headers.set('Permissions-Policy', policies.join(', '))
    }

    // Additional security headers
    response.headers.set('X-DNS-Prefetch-Control', 'off')
    response.headers.set('X-Download-Options', 'noopen')
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

    return response
  }
}

/**
 * CSRF token management utilities
 */
export const csrfUtils = {
  /**
   * Set CSRF token in cookie
   */
  setCSRFCookie: (response: NextResponse, config: SecurityConfig['csrf']): string => {
    const token = generateCSRFToken()
    
    response.cookies.set(config.cookieName, token, {
      httpOnly: true,
      secure: config.secure,
      sameSite: config.sameSite,
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return token
  },

  /**
   * Get CSRF token for client-side use
   */
  getCSRFToken: (request: NextRequest, config: SecurityConfig['csrf']): string | null => {
    return request.cookies.get(config.cookieName)?.value || null
  }
}

/**
 * Input validation middleware
 */
export const validateInput = (schema: Record<string, any>) => {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        const contentType = request.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          const body = await request.json()
          
          // Validate against schema
          for (const [field, rules] of Object.entries(schema)) {
            const value = body[field]
            
            if (rules.required && (value === undefined || value === null || value === '')) {
              return new NextResponse(`Field '${field}' is required`, { status: 400 })
            }
            
            if (rules.type && value !== undefined && typeof value !== rules.type) {
              return new NextResponse(`Field '${field}' must be of type ${rules.type}`, { status: 400 })
            }
            
            if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
              return new NextResponse(`Field '${field}' exceeds maximum length`, { status: 400 })
            }
            
            if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
              return new NextResponse(`Field '${field}' format is invalid`, { status: 400 })
            }
          }
        }
      }
      
      return null // Continue to next middleware/handler
    } catch (error) {
      return new NextResponse('Invalid request body', { status: 400 })
    }
  }
}

/**
 * File upload security
 */
export const fileUploadSecurity = {
  /**
   * Validate file type and size
   */
  validateFile: (
    file: File,
    options: {
      allowedTypes?: string[]
      maxSize?: number
      allowedExtensions?: string[]
    } = {}
  ): { valid: boolean; error?: string } => {
    const { allowedTypes, maxSize, allowedExtensions } = options

    // Check file size
    if (maxSize && file.size > maxSize) {
      return { valid: false, error: `File size exceeds limit of ${maxSize} bytes` }
    }

    // Check file type
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} is not allowed` }
    }

    // Check file extension
    if (allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !allowedExtensions.includes(extension)) {
        return { valid: false, error: `File extension is not allowed` }
      }
    }

    // Check for dangerous file names
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return { valid: false, error: 'Invalid file name' }
    }

    return { valid: true }
  },

  /**
   * Generate secure file name
   */
  generateSecureFileName: (originalName: string, prefix?: string): string => {
    const extension = originalName.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2)
    const securePrefix = prefix ? `${prefix}_` : ''
    
    return `${securePrefix}${timestamp}_${random}${extension ? `.${extension}` : ''}`
  }
}

export default createSecurityMiddleware