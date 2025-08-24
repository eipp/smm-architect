import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Core class name utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatting utilities
export const formatCurrency = (amount: number, locale: string = 'en-US') => {
  const formatters: Record<string, Intl.NumberFormat> = {
    'en': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    'es': new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
    'fr': new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
    'de': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
    'ja': new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
    'zh': new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
  };
  
  const formatter = formatters[locale] || formatters['en'];
  return formatter.format(amount);
};

export const formatDateTime = (date: Date, locale: string = 'en-US') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatPercentage = (value: number, locale: string = 'en-US') => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

// Utility for generating unique IDs
export const generateId = (prefix?: string) => {
  const id = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}-${id}` : id;
};

// Sleep utility for testing/development
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}