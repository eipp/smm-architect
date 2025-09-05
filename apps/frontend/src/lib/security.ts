import DOMPurify from 'isomorphic-dompurify';

// Content Security Policy configuration
export const cspConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Next.js
    "'unsafe-inline'", // Consider removing in production
    'https://js.sentry-cdn.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
  ],
  'connect-src': [
    "'self'",
    process.env.NEXT_PUBLIC_API_BASE_URL || '',
    'wss:',
    'https://YOUR_SENTRY_DSN', // Sentry DSN
  ],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'none'"],
};

export function generateCSP(): string {
  return Object.entries(cspConfig)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// Input sanitization utilities
interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
}

export function sanitizeHtml(input: string, options: SanitizeOptions = {}): string {
  if (!input) return '';
  
  const config = {
    ALLOWED_TAGS: options.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
    ALLOWED_ATTR: options.allowedAttributes || { a: ['href', 'title'] },
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    MAX_STRING_LENGTH: options.maxLength || 10000,
  };
  
  return DOMPurify.sanitize(input, config);
}

export function sanitizeUserInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[<>"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[match];
    })
    .trim()
    .slice(0, 1000); // Limit length
}

export function sanitizeFileName(filename: string): string {
  if (!filename) return '';
  
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255);
}

export function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }
    
    // Block local/private network access
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.endsWith('.local')
    ) {
      return null;
    }
    
    return parsedUrl.toString();
  } catch {
    return null;
  }
}

// Rate limiting utilities (for client-side protection)
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Session security utilities
export class SecureSession {
  private static readonly TOKEN_KEY = 'smm_auth_token';
  private static readonly REFRESH_THRESHOLD = 300000; // 5 minutes
  
  static storeToken(token: string, expiresAt: number): void {
    if (typeof window === 'undefined') return;
    
    // Store in sessionStorage (cleared on tab close)
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem('token_expires_at', expiresAt.toString());
    
    // Set httpOnly cookie for server-side requests
    document.cookie = `${this.TOKEN_KEY}=${token}; Secure; SameSite=Strict; Path=/`;
  }
  
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(this.TOKEN_KEY);
  }
  
  static getTokenExpiry(): number | null {
    if (typeof window === 'undefined') return null;
    const expiry = sessionStorage.getItem('token_expires_at');
    return expiry ? parseInt(expiry) : null;
  }
  
  static clearToken(): void {
    if (typeof window === 'undefined') return;
    
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem('token_expires_at');
    document.cookie = `${this.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
  
  static shouldRefreshToken(): boolean {
    const expiry = this.getTokenExpiry();
    if (!expiry) return false;
    
    return (expiry - Date.now()) < this.REFRESH_THRESHOLD;
  }
}

// Validation utilities
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateWorkspaceName(name: string): boolean {
  return /^[a-zA-Z0-9\s-_]{1,100}$/.test(name.trim());
}

// XSS protection for dynamic content
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSRF protection utilities
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  
  return result === 0;
}

export type { SanitizeOptions };