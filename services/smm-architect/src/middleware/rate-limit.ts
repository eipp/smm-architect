/**
 * Rate Limiting Middleware for SMM Architect
 * 
 * Provides rate limiting functionality to prevent abuse and brute force attacks
 * on authentication endpoints and other sensitive operations.
 */

import logger from '../config/logger';

// In-memory store for demo - in production use Redis
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting function
 * @param category - Category of operation (e.g., 'auth:login', 'auth:register')
 * @param identifier - Unique identifier (e.g., email, IP address)
 * @param maxAttempts - Maximum attempts allowed
 * @param windowSeconds - Time window in seconds
 */
export async function rateLimit(
  category: string,
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<void> {
  const key = `${category}:${identifier}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  
  let entry = rateLimitStore.get(key);
  
  // If no entry exists or window has expired, create new entry
  if (!entry || now >= entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
      firstAttempt: now
    };
    rateLimitStore.set(key, entry);
    
    logger.debug("Rate limit - new window", { 
      category, 
      identifier: maskIdentifier(identifier), 
      count: 1, 
      maxAttempts 
    });
    
    return;
  }
  
  // Increment attempt count
  entry.count++;
  
  // Check if limit exceeded
  if (entry.count > maxAttempts) {
    const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);
    
    logger.warn("Rate limit exceeded", {
      category,
      identifier: maskIdentifier(identifier),
      attempts: entry.count,
      maxAttempts,
      resetInSeconds: timeUntilReset
    });
    
    throw new Error(
      `Rate limit exceeded. Too many attempts. Try again in ${timeUntilReset} seconds.`
    );
  }
  
  logger.debug("Rate limit check", {
    category,
    identifier: maskIdentifier(identifier),
    count: entry.count,
    maxAttempts,
    remaining: maxAttempts - entry.count
  });
}

/**
 * Check current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  category: string,
  identifier: string
): Promise<{
  count: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
}> {
  const key = `${category}:${identifier}`;
  const entry = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!entry || now >= entry.resetTime) {
    return {
      count: 0,
      remaining: Infinity,
      resetTime: now,
      blocked: false
    };
  }
  
  return {
    count: entry.count,
    remaining: Math.max(0, 5 - entry.count), // Default max of 5
    resetTime: entry.resetTime,
    blocked: entry.count >= 5
  };
}

/**
 * Clear rate limit for a specific identifier
 * (useful for successful operations or admin overrides)
 */
export async function clearRateLimit(
  category: string,
  identifier: string
): Promise<void> {
  const key = `${category}:${identifier}`;
  rateLimitStore.delete(key);
  
  logger.info("Rate limit cleared", {
    category,
    identifier: maskIdentifier(identifier)
  });
}

/**
 * Cleanup expired entries (should be called periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug("Rate limit cleanup", { expiredEntries: cleaned });
  }
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  totalEntries: number;
  categories: Record<string, number>;
  oldestEntry: number | null;
} {
  const stats = {
    totalEntries: rateLimitStore.size,
    categories: {} as Record<string, number>,
    oldestEntry: null as number | null
  };
  
  let oldestTime = Infinity;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    const category = key.split(':')[0];
    if (category) {
      stats.categories[category] = (stats.categories[category] || 0) + 1;
    }
    
    if (entry.firstAttempt < oldestTime) {
      oldestTime = entry.firstAttempt;
    }
  }
  
  if (oldestTime !== Infinity) {
    stats.oldestEntry = oldestTime;
  }
  
  return stats;
}

/**
 * Mask sensitive identifiers for logging
 */
function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    // Email masking
    const [username, domain] = identifier.split('@');
    if (username && domain) {
      const maskedUsername = username.length > 2 
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username;
      return `${maskedUsername}@${domain}`;
    }
  }
  
  if (identifier.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    // IP address masking
    const parts = identifier.split('.');
    return `${parts[0]}.${parts[1]}.***.**`;
  }
  
  // Generic masking
  return identifier.length > 4
    ? identifier.substring(0, 4) + '*'.repeat(identifier.length - 4)
    : identifier;
}

// Cleanup expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

export default {
  rateLimit,
  getRateLimitStatus,
  clearRateLimit,
  cleanupExpiredEntries,
  getRateLimitStats
};