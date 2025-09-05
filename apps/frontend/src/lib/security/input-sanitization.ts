import DOMPurify from 'isomorphic-dompurify'

/**
 * Input sanitization utilities for preventing XSS and ensuring data integrity
 */

// HTML sanitization options
const DEFAULT_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'a', 'img', 'span', 'div', 'code', 'pre'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
  // DOMPurify expects explicit attribute names; wildcards and protocol strings are unsupported
  // so we enumerate common event handlers to forbid
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
}

const STRICT_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'link', 'meta'],
  KEEP_CONTENT: true
}

const RICH_TEXT_OPTIONS = {
  ...DEFAULT_SANITIZE_OPTIONS,
  ALLOWED_TAGS: [
    ...DEFAULT_SANITIZE_OPTIONS.ALLOWED_TAGS,
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'dl', 'dt', 'dd', 'hr', 'small', 'sub', 'sup'
  ],
  ALLOWED_ATTR: [
    ...DEFAULT_SANITIZE_OPTIONS.ALLOWED_ATTR,
    'align', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
    'colspan', 'rowspan', 'width', 'height'
  ]
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (
  html: string,
  options: 'default' | 'strict' | 'rich' | object = 'default'
): string => {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let sanitizeOptions
  switch (options) {
    case 'strict':
      sanitizeOptions = STRICT_SANITIZE_OPTIONS
      break
    case 'rich':
      sanitizeOptions = RICH_TEXT_OPTIONS
      break
    case 'default':
      sanitizeOptions = DEFAULT_SANITIZE_OPTIONS
      break
    default:
      sanitizeOptions = options
  }

  try {
    return DOMPurify.sanitize(html, sanitizeOptions)
  } catch (error) {
    console.error('HTML sanitization failed:', error)
    return ''
  }
}

/**
 * Sanitize plain text input
 */
export const sanitizeText = (text: string, maxLength?: number): string => {
  if (!text || typeof text !== 'string') {
    return ''
  }

  // Remove null bytes and control characters
  let sanitized = text.replace(/[\x00-\x1F\x7F]/g, '')

  // Trim whitespace
  sanitized = sanitized.trim()

  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Sanitize URL to prevent javascript: and data: schemes.
 * Only http/https are permitted by default; pass 'mailto:' explicitly when email links are needed.
 */
export const sanitizeUrl = (url: string, allowedProtocols: string[] = ['http:', 'https:']): string => {
  if (!url || typeof url !== 'string') {
    return ''
  }

  try {
    const parsedUrl = new URL(url)
    
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      console.warn(`Blocked URL with protocol: ${parsedUrl.protocol}`)
      return ''
    }

    return parsedUrl.toString()
  } catch (error) {
    // If URL parsing fails, treat as relative URL
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url
    }
    
    console.warn('Invalid URL format:', url)
    return ''
  }
}

/**
 * Sanitize email address
 */
export const sanitizeEmail = (email: string): string => {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Basic email regex (intentionally simple for security)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  
  const sanitized = sanitizeText(email.toLowerCase(), 254) // RFC 5321 limit
  
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize phone number
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove all non-digit characters except + at the beginning
  let sanitized = phone.replace(/[^\d+]/g, '')
  
  // Ensure + is only at the beginning
  if (sanitized.includes('+')) {
    const plus = sanitized.startsWith('+') ? '+' : ''
    sanitized = plus + sanitized.replace(/\+/g, '')
  }

  // Limit length (international format max ~15 digits)
  if (sanitized.length > 16) {
    sanitized = sanitized.substring(0, 16)
  }

  return sanitized
}

/**
 * Sanitize numeric input
 */
export const sanitizeNumber = (
  value: string | number,
  options: {
    min?: number
    max?: number
    decimals?: number
    allowNegative?: boolean
  } = {}
): number | null => {
  const { min, max, decimals = 2, allowNegative = true } = options

  if (value === null || value === undefined || value === '') {
    return null
  }

  let num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  // Check negative values
  if (!allowNegative && num < 0) {
    num = 0
  }

  // Apply min/max constraints
  if (min !== undefined && num < min) {
    num = min
  }
  if (max !== undefined && num > max) {
    num = max
  }

  // Round to specified decimal places
  if (decimals >= 0) {
    num = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  return num
}

/**
 * Sanitize file name
 */
export const sanitizeFileName = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') {
    return ''
  }

  // Remove path separators and special characters
  let sanitized = fileName
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .trim()

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop()
    const name = sanitized.substring(0, 255 - (ext ? ext.length + 1 : 0))
    sanitized = ext ? `${name}.${ext}` : name
  }

  return sanitized
}

/**
 * Sanitize object by recursively sanitizing string values
 */
export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  sanitizeOptions: {
    textFields?: string[]
    htmlFields?: string[]
    urlFields?: string[]
    emailFields?: string[]
    phoneFields?: string[]
    maxDepth?: number
  } = {}
): T => {
  const {
    textFields = [],
    htmlFields = [],
    urlFields = [],
    emailFields = [],
    phoneFields = [],
    maxDepth = 5
  } = sanitizeOptions

  const sanitizeValue = (value: any, key: string, depth: number): any => {
    if (depth > maxDepth) {
      return value
    }

    if (typeof value === 'string') {
      if (htmlFields.includes(key)) {
        return sanitizeHtml(value)
      }
      if (urlFields.includes(key)) {
        return sanitizeUrl(value)
      }
      if (emailFields.includes(key)) {
        return sanitizeEmail(value)
      }
      if (phoneFields.includes(key)) {
        return sanitizePhone(value)
      }
      if (textFields.includes(key) || textFields.length === 0) {
        return sanitizeText(value)
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => 
        sanitizeValue(item, `${key}[${index}]`, depth + 1)
      )
    }

    if (value && typeof value === 'object') {
      const sanitized: any = {}
      for (const [k, v] of Object.entries(value)) {
        sanitized[k] = sanitizeValue(v, k, depth + 1)
      }
      return sanitized
    }

    return value
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(value, key, 0)
  }

  return sanitized as T
}

/**
 * Validate and sanitize form data
 */
export const sanitizeFormData = (
  formData: FormData | Record<string, any>,
  schema: {
    [key: string]: {
      type: 'text' | 'html' | 'email' | 'url' | 'phone' | 'number' | 'file'
      required?: boolean
      maxLength?: number
      min?: number
      max?: number
      allowedTypes?: string[] // for file uploads
    }
  }
): { data: Record<string, any>; errors: Record<string, string> } => {
  const data: Record<string, any> = {}
  const errors: Record<string, string> = {}

  // Convert FormData to object if needed
  const inputData = formData instanceof FormData 
    ? Object.fromEntries(formData.entries())
    : formData

  for (const [key, config] of Object.entries(schema)) {
    const value = inputData[key]

    // Check required fields
    if (config.required && (!value || value === '')) {
      errors[key] = `${key} is required`
      continue
    }

    // Skip empty optional fields
    if (!value || value === '') {
      data[key] = ''
      continue
    }

    // Sanitize based on type
    switch (config.type) {
      case 'text':
        data[key] = sanitizeText(value, config.maxLength)
        break

      case 'html':
        data[key] = sanitizeHtml(value)
        break

      case 'email':
        const sanitizedEmail = sanitizeEmail(value)
        if (!sanitizedEmail && value) {
          errors[key] = 'Invalid email format'
        } else {
          data[key] = sanitizedEmail
        }
        break

      case 'url':
        const sanitizedUrl = sanitizeUrl(value)
        if (!sanitizedUrl && value) {
          errors[key] = 'Invalid URL format'
        } else {
          data[key] = sanitizedUrl
        }
        break

      case 'phone':
        data[key] = sanitizePhone(value)
        break

      case 'number':
        const sanitizedNumber = sanitizeNumber(value, {
          min: config.min,
          max: config.max
        })
        if (sanitizedNumber === null && value) {
          errors[key] = 'Invalid number format'
        } else {
          data[key] = sanitizedNumber
        }
        break

      case 'file':
        if (value instanceof File) {
          const sanitizedName = sanitizeFileName(value.name)
          if (config.allowedTypes && !config.allowedTypes.includes(value.type)) {
            errors[key] = `File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
          } else {
            data[key] = new File([value], sanitizedName, { type: value.type })
          }
        } else {
          data[key] = value
        }
        break

      default:
        data[key] = sanitizeText(value)
    }
  }

  return { data, errors }
}

/**
 * Content Security Policy nonce generator
 */
export const generateNonce = (): string => {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for server-side or unsupported browsers
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

/**
 * Escape special characters for use in regex
 */
export const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Rate limiting store for client-side rate limiting
 */
class ClientRateLimit {
  private requests: Map<string, number[]> = new Map()

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const windowStart = now - windowMs

    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }

    const requests = this.requests.get(key)!
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)

    return true
  }

  reset(key: string): void {
    this.requests.delete(key)
  }
}

export const clientRateLimit = new ClientRateLimit()

/**
 * Secure session storage with encryption (basic implementation)
 */
export const secureStorage = {
  set: (key: string, value: any, encrypt: boolean = true): void => {
    try {
      const serialized = JSON.stringify(value)
      const stored = encrypt ? btoa(serialized) : serialized
      sessionStorage.setItem(key, stored)
    } catch (error) {
      console.error('Failed to store data:', error)
    }
  },

  get: <T>(key: string, decrypt: boolean = true): T | null => {
    try {
      const stored = sessionStorage.getItem(key)
      if (!stored) return null
      
      const serialized = decrypt ? atob(stored) : stored
      return JSON.parse(serialized) as T
    } catch (error) {
      console.error('Failed to retrieve data:', error)
      return null
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(key)
  },

  clear: (): void => {
    sessionStorage.clear()
  }
}