import { SupportedLocale } from './i18n'

/**
 * Locale-aware formatting utilities
 */

// Currency configurations per locale
const CURRENCY_CONFIG: Record<SupportedLocale, { currency: string; locale: string }> = {
  en: { currency: 'USD', locale: 'en-US' },
  es: { currency: 'EUR', locale: 'es-ES' },
  fr: { currency: 'EUR', locale: 'fr-FR' },
  de: { currency: 'EUR', locale: 'de-DE' },
  ja: { currency: 'JPY', locale: 'ja-JP' },
  zh: { currency: 'CNY', locale: 'zh-CN' }
}

// Date format configurations
const DATE_CONFIG: Record<SupportedLocale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN'
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  locale: SupportedLocale = 'en',
  currency?: string
): string {
  const config = CURRENCY_CONFIG[locale]
  const targetCurrency = currency || config.currency
  
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: targetCurrency === 'JPY' ? 0 : 2,
    maximumFractionDigits: targetCurrency === 'JPY' ? 0 : 2
  }).format(amount)
}

/**
 * Format numbers based on locale
 */
export function formatNumber(
  number: number,
  locale: SupportedLocale = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const config = CURRENCY_CONFIG[locale]
  
  return new Intl.NumberFormat(config.locale, {
    notation: 'standard',
    maximumFractionDigits: 2,
    ...options
  }).format(number)
}

/**
 * Format percentages based on locale
 */
export function formatPercentage(
  value: number,
  locale: SupportedLocale = 'en',
  minimumFractionDigits: number = 1,
  maximumFractionDigits: number = 1
): string {
  const config = CURRENCY_CONFIG[locale]
  
  return new Intl.NumberFormat(config.locale, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value)
}

/**
 * Format dates based on locale
 */
export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const localeString = DATE_CONFIG[locale]
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return new Intl.DateTimeFormat(localeString, {
    ...defaultOptions,
    ...options
  }).format(dateObj)
}

/**
 * Format date and time based on locale
 */
export function formatDateTime(
  date: Date | string | number,
  locale: SupportedLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const localeString = DATE_CONFIG[locale]
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en'
  }
  
  return new Intl.DateTimeFormat(localeString, {
    ...defaultOptions,
    ...options
  }).format(dateObj)
}

/**
 * Format time based on locale
 */
export function formatTime(
  date: Date | string | number,
  locale: SupportedLocale = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const localeString = DATE_CONFIG[locale]
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en'
  }
  
  return new Intl.DateTimeFormat(localeString, {
    ...defaultOptions,
    ...options
  }).format(dateObj)
}

/**
 * Format relative time based on locale
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: SupportedLocale = 'en'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const localeString = DATE_CONFIG[locale]
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  
  const rtf = new Intl.RelativeTimeFormat(localeString, { numeric: 'auto' })
  
  // Convert milliseconds to different units
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (Math.abs(years) >= 1) {
    return rtf.format(-years, 'year')
  } else if (Math.abs(months) >= 1) {
    return rtf.format(-months, 'month')
  } else if (Math.abs(weeks) >= 1) {
    return rtf.format(-weeks, 'week')
  } else if (Math.abs(days) >= 1) {
    return rtf.format(-days, 'day')
  } else if (Math.abs(hours) >= 1) {
    return rtf.format(-hours, 'hour')
  } else if (Math.abs(minutes) >= 1) {
    return rtf.format(-minutes, 'minute')
  } else {
    return rtf.format(-seconds, 'second')
  }
}

/**
 * Format file sizes based on locale
 */
export function formatFileSize(
  bytes: number,
  locale: SupportedLocale = 'en',
  decimals: number = 2
): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
  
  return `${formatNumber(value, locale)} ${sizes[i]}`
}

/**
 * Get locale-specific collator for sorting
 */
export function getCollator(
  locale: SupportedLocale = 'en',
  options?: Intl.CollatorOptions
): Intl.Collator {
  const localeString = DATE_CONFIG[locale]
  
  return new Intl.Collator(localeString, {
    numeric: true,
    caseFirst: 'lower',
    ...options
  })
}

/**
 * Sort array of strings using locale-specific collation
 */
export function sortByLocale<T>(
  array: T[],
  getValue: (item: T) => string,
  locale: SupportedLocale = 'en',
  options?: Intl.CollatorOptions
): T[] {
  const collator = getCollator(locale, options)
  
  return [...array].sort((a, b) => 
    collator.compare(getValue(a), getValue(b))
  )
}

/**
 * Get list separator based on locale
 */
export function formatList(
  items: string[],
  locale: SupportedLocale = 'en',
  style: Intl.ListFormatStyle = 'long',
  type: Intl.ListFormatType = 'conjunction'
): string {
  const localeString = DATE_CONFIG[locale]
  
  return new Intl.ListFormat(localeString, {
    style,
    type
  }).format(items)
}

/**
 * Get plural rules for locale
 */
export function getPluralRule(
  count: number,
  locale: SupportedLocale = 'en'
): Intl.LDMLPluralRule {
  const localeString = DATE_CONFIG[locale]
  const pr = new Intl.PluralRules(localeString)
  
  return pr.select(count)
}

/**
 * Format plural based on count and locale
 */
export function formatPlural(
  count: number,
  singular: string,
  plural: string,
  locale: SupportedLocale = 'en'
): string {
  const rule = getPluralRule(count, locale)
  const text = rule === 'one' ? singular : plural
  
  return `${formatNumber(count, locale)} ${text}`
}

/**
 * Check if locale uses RTL direction
 */
export function isRTL(locale: SupportedLocale): boolean {
  const rtlLocales: string[] = ['ar', 'he', 'fa']
  return rtlLocales.includes(locale)
}

/**
 * Get text direction for locale
 */
export function getTextDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr'
}

/**
 * Get locale-specific decimal separator
 */
export function getDecimalSeparator(locale: SupportedLocale = 'en'): string {
  const config = CURRENCY_CONFIG[locale]
  const formatter = new Intl.NumberFormat(config.locale)
  const parts = formatter.formatToParts(1.1)
  const decimalPart = parts.find(part => part.type === 'decimal')
  
  return decimalPart?.value || '.'
}

/**
 * Get locale-specific thousand separator
 */
export function getThousandSeparator(locale: SupportedLocale = 'en'): string {
  const config = CURRENCY_CONFIG[locale]
  const formatter = new Intl.NumberFormat(config.locale)
  const parts = formatter.formatToParts(1000)
  const groupPart = parts.find(part => part.type === 'group')
  
  return groupPart?.value || ','
}

/**
 * Locale-aware string comparison
 */
export function compareStrings(
  a: string,
  b: string,
  locale: SupportedLocale = 'en',
  options?: Intl.CollatorOptions
): number {
  const collator = getCollator(locale, options)
  return collator.compare(a, b)
}

/**
 * Default export with all utilities
 */
export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatFileSize,
  formatList,
  formatPlural,
  getCollator,
  sortByLocale,
  getPluralRule,
  isRTL,
  getTextDirection,
  getDecimalSeparator,
  getThousandSeparator,
  compareStrings
}