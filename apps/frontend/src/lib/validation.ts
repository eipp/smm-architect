import DOMPurify from 'dompurify'

interface SanitizeOptions {
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
}

// HTML sanitization for rich content
export const sanitizeHtml = (input: string, options: SanitizeOptions = {}) => {
  const config = {
    ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: options.allowedAttributes || {
      'a': ['href', 'title'],
      '*': ['class']
    },
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  }
  
  return DOMPurify.sanitize(input, config)
}

// User input sanitization for text inputs
export const sanitizeUserInput = (input: string) => {
  return input
    .replace(/[<>\"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '\"': '&quot;',
        \"'\": '&#x27;',
        '&': '&amp;'
      }
      return entities[match]
    })
    .trim()
}

// URL validation and sanitization
export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url)
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    
    return parsed.toString()
  } catch {
    return null
  }
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return emailRegex.test(email)
}

// Strong password validation
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/
  return strongPasswordRegex.test(password)
}

// Input validation for workspace names, campaign titles, etc.
export const validateWorkspaceName = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' }
  }
  
  if (name.length < 3) {
    return { valid: false, error: 'Name must be at least 3 characters' }
  }
  
  if (name.length > 50) {
    return { valid: false, error: 'Name cannot exceed 50 characters' }
  }
  
  // Allow letters, numbers, spaces, hyphens, underscores
  const validNameRegex = /^[a-zA-Z0-9\\s\\-_]+$/
  if (!validNameRegex.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' }
  }
  
  return { valid: true }
}

// Budget validation
export const validateBudget = (amount: number, currency: string = 'USD'): { valid: boolean; error?: string } => {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Budget must be greater than 0' }
  }
  
  if (amount > 1000000) {
    return { valid: false, error: 'Budget cannot exceed $1,000,000' }
  }
  
  // Check for reasonable decimal places (2 for most currencies)
  const decimalPlaces = amount.toString().split('.')[1]?.length || 0
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Budget cannot have more than 2 decimal places' }
  }
  
  return { valid: true }
}

// Content length validation
export const validateContentLength = (content: string, maxLength: number = 2200): { valid: boolean; error?: string } => {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Content is required' }
  }
  
  if (content.length > maxLength) {
    return { valid: false, error: `Content cannot exceed ${maxLength} characters` }
  }
  
  return { valid: true }
}

// Hashtag validation
export const validateHashtag = (hashtag: string): boolean => {
  // Hashtags should start with # and contain only letters, numbers, underscores
  const hashtagRegex = /^#[a-zA-Z0-9_]+$/
  return hashtagRegex.test(hashtag)
}

// Social media handle validation
export const validateSocialHandle = (handle: string, platform: 'twitter' | 'linkedin' | 'instagram'): boolean => {
  switch (platform) {
    case 'twitter':
      // Twitter handles: 1-15 characters, letters, numbers, underscores
      return /^@?[a-zA-Z0-9_]{1,15}$/.test(handle)
    case 'linkedin':
      // LinkedIn: letters, numbers, hyphens, minimum 3 characters
      return /^[a-zA-Z0-9-]{3,}$/.test(handle)
    case 'instagram':
      // Instagram: letters, numbers, periods, underscores, 1-30 characters
      return /^[a-zA-Z0-9._]{1,30}$/.test(handle)
    default:
      return false
  }
}

// File upload validation
export const validateFileUpload = (file: File, maxSize: number = 10 * 1024 * 1024): { valid: boolean; error?: string } => {
  // Check file size (default 10MB)
  if (file.size > maxSize) {
    return { valid: false, error: `File size cannot exceed ${maxSize / 1024 / 1024}MB` }
  }
  
  // Check file type (images, videos, documents)
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'text/plain',
    'application/json'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' }
  }
  
  return { valid: true }
}

// Rate limiting check (client-side)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(private maxRequests: number = 60, private windowMs: number = 60000) {}
  
  canMakeRequest(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }
  
  getRemainingRequests(key: string): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

// Global rate limiter for API requests
export const apiRateLimiter = new RateLimiter(100, 60000) // 100 requests per minute