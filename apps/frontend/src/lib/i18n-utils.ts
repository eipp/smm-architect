'use client'

import { SupportedLocale } from './i18n'

/**
 * Advanced i18n utilities for pluralization, formatting, and locale-specific operations
 */

// Pluralization rules for different languages
interface PluralRule {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}

type PluralRules = {
  [key in SupportedLocale]: (count: number) => keyof PluralRule
}

// Simplified plural rules (actual implementation would be more complex)
const pluralRules: PluralRules = {
  en: (count: number) => {
    if (count === 0) return 'zero'
    if (count === 1) return 'one'
    return 'other'
  },
  es: (count: number) => {
    if (count === 1) return 'one'
    return 'other'
  },
  fr: (count: number) => {
    if (count === 0 || count === 1) return 'one'
    return 'other'
  },
  de: (count: number) => {
    if (count === 1) return 'one'
    return 'other'
  },
  ja: (count: number) => 'other', // Japanese doesn't have plural forms
  zh: (count: number) => 'other'  // Chinese doesn't have plural forms
}

/**
 * Pluralization helper
 */
export const pluralize = (
  locale: SupportedLocale,
  count: number,
  rules: PluralRule
): string => {
  const rule = pluralRules[locale](count)
  return rules[rule] || rules.other
}

/**
 * Number formatting utilities
 */
export const formatNumber = (
  value: number,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {}
): string => {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN'
  }
  
  return new Intl.NumberFormat(localeMap[locale], options).format(value)
}

export const formatCurrency = (
  amount: number,
  locale: SupportedLocale,
  currency?: string
): string => {
  const currencyMap: Record<SupportedLocale, string> = {
    en: 'USD',
    es: 'EUR',
    fr: 'EUR',
    de: 'EUR',
    ja: 'JPY',
    zh: 'CNY'
  }
  
  return formatNumber(amount, locale, {
    style: 'currency',
    currency: currency || currencyMap[locale]
  })
}

export const formatPercentage = (
  value: number,
  locale: SupportedLocale,
  decimals: number = 1
): string => {
  return formatNumber(value, locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Date and time formatting utilities
 */
export const formatDate = (
  date: Date,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN'
  }
  
  return new Intl.DateTimeFormat(localeMap[locale], options).format(date)
}

export const formatRelativeTime = (
  date: Date,
  locale: SupportedLocale,
  baseDate: Date = new Date()
): string => {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ja: 'ja-JP',
    zh: 'zh-CN'
  }
  
  const diff = date.getTime() - baseDate.getTime()
  const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: 'auto' })
  
  const absDiff = Math.abs(diff)
  const sign = diff < 0 ? -1 : 1
  
  if (absDiff < 60000) { // Less than 1 minute
    return rtf.format(sign * Math.floor(absDiff / 1000), 'second')
  } else if (absDiff < 3600000) { // Less than 1 hour
    return rtf.format(sign * Math.floor(absDiff / 60000), 'minute')
  } else if (absDiff < 86400000) { // Less than 1 day
    return rtf.format(sign * Math.floor(absDiff / 3600000), 'hour')
  } else if (absDiff < 2592000000) { // Less than 30 days
    return rtf.format(sign * Math.floor(absDiff / 86400000), 'day')
  } else if (absDiff < 31536000000) { // Less than 365 days
    return rtf.format(sign * Math.floor(absDiff / 2592000000), 'month')
  } else {
    return rtf.format(sign * Math.floor(absDiff / 31536000000), 'year')
  }
}

/**
 * Locale-specific utilities
 */
export const getTextDirection = (locale: SupportedLocale): 'ltr' | 'rtl' => {
  // All supported locales use left-to-right text direction
  // This would need to be expanded for RTL languages like Arabic
  return 'ltr'
}

export const getLocaleInfo = (locale: SupportedLocale) => {
  const info: Record<SupportedLocale, {
    name: string
    nativeName: string
    code: string
    flag: string
    direction: 'ltr' | 'rtl'
    dateFormat: string
    timeFormat: string
  }> = {
    en: {
      name: 'English',
      nativeName: 'English',
      code: 'en-US',
      flag: '🇺🇸',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    },
    es: {
      name: 'Spanish',
      nativeName: 'Español',
      code: 'es-ES',
      flag: '🇪🇸',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    fr: {
      name: 'French',
      nativeName: 'Français',
      code: 'fr-FR',
      flag: '🇫🇷',
      direction: 'ltr',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    },
    de: {
      name: 'German',
      nativeName: 'Deutsch',
      code: 'de-DE',
      flag: '🇩🇪',
      direction: 'ltr',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h'
    },
    ja: {
      name: 'Japanese',
      nativeName: '日本語',
      code: 'ja-JP',
      flag: '🇯🇵',
      direction: 'ltr',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h'
    },
    zh: {
      name: 'Chinese',
      nativeName: '中文',
      code: 'zh-CN',
      flag: '🇨🇳',
      direction: 'ltr',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h'
    }
  }
  
  return info[locale]
}

/**
 * Translation validation and missing key detection
 */
export const validateTranslations = (
  translations: Record<string, Record<string, string>>,
  baseLocale: string = 'en'
) => {
  const baseKeys = Object.keys(translations[baseLocale] || {})
  const results: Record<string, {
    missing: string[]
    extra: string[]
    coverage: number
  }> = {}
  
  Object.keys(translations).forEach(locale => {
    if (locale === baseLocale) return
    
    const localeKeys = Object.keys(translations[locale] || {})
    const missing = baseKeys.filter(key => !localeKeys.includes(key))
    const extra = localeKeys.filter(key => !baseKeys.includes(key))
    const coverage = ((baseKeys.length - missing.length) / baseKeys.length) * 100
    
    results[locale] = { missing, extra, coverage }
  })
  
  return results
}

/**
 * Translation interpolation with HTML support
 */
export const interpolate = (
  template: string,
  params: Record<string, string | number>,
  allowHTML: boolean = false
): string => {
  let result = template
  
  Object.entries(params).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\\\s*${key}\\\\s*}}`, 'g')
    const stringValue = String(value)
    
    if (allowHTML) {
      result = result.replace(regex, stringValue)
    } else {
      // Escape HTML if not allowed
      const escapedValue = stringValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')
      
      result = result.replace(regex, escapedValue)
    }
  })
  
  return result
}

/**
 * Lazy loading for translation chunks
 */
export const loadTranslationChunk = async (
  locale: SupportedLocale,
  chunk: string
): Promise<Record<string, string> | null> => {
  try {
    // In a real implementation, this would load translation files dynamically
    const response = await fetch(`/locales/${locale}/${chunk}.json`)
    
    if (!response.ok) {
      console.warn(`Failed to load translation chunk: ${locale}/${chunk}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error loading translation chunk ${locale}/${chunk}:`, error)
    return null
  }
}

/**
 * Browser locale detection
 */
export const detectBrowserLocale = (
  supportedLocales: string[] = ['en', 'es', 'fr', 'de', 'ja', 'zh']
): string => {
  // Check navigator.languages first (most preferred)
  if (navigator.languages) {
    for (const lang of navigator.languages) {
      const locale = lang.split('-')[0]
      if (supportedLocales.includes(locale)) {
        return locale
      }
    }
  }
  
  // Fallback to navigator.language
  if (navigator.language) {
    const locale = navigator.language.split('-')[0]
    if (supportedLocales.includes(locale)) {
      return locale
    }
  }
  
  // Final fallback
  return 'en'
}

/**
 * Locale storage utilities
 */
export const localeStorage = {
  save: (locale: string) => {
    try {
      localStorage.setItem('preferred-locale', locale)
      document.documentElement.lang = locale
    } catch (error) {
      console.warn('Failed to save locale preference:', error)
    }
  },
  
  load: (): string | null => {
    try {
      return localStorage.getItem('preferred-locale')
    } catch (error) {
      console.warn('Failed to load locale preference:', error)
      return null
    }
  },
  
  clear: () => {
    try {
      localStorage.removeItem('preferred-locale')
    } catch (error) {
      console.warn('Failed to clear locale preference:', error)
    }
  }
}

/**
 * URL-based locale utilities (for locale-based routing)
 */
export const urlLocaleUtils = {
  extract: (pathname: string): { locale: string | null; cleanPath: string } => {
    const segments = pathname.split('/').filter(Boolean)
    const potentialLocale = segments[0]
    
    if (potentialLocale && potentialLocale.length === 2) {
      return {
        locale: potentialLocale,
        cleanPath: '/' + segments.slice(1).join('/')
      }
    }
    
    return { locale: null, cleanPath: pathname }
  },
  
  build: (path: string, locale: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${cleanPath}`
  }
}