import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

// Supported locales
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh'

// RTL languages
const RTL_LOCALES: Locale[] = ['ar'] // Arabic (if added later)

// Locale configuration
interface LocaleConfig {
  code: Locale
  name: string
  nativeName: string
  flag: string
  dateFormat: string
  numberFormat: Intl.NumberFormatOptions
  currency: string
  rtl: boolean
}

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'USD',
    rtl: false
  },
  es: {
    code: 'es', 
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'EUR',
    rtl: false
  },
  fr: {
    code: 'fr',
    name: 'French', 
    nativeName: 'Français',
    flag: '🇫🇷',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'EUR',
    rtl: false
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch', 
    flag: '🇩🇪',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'EUR',
    rtl: false
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dateFormat: 'yyyy/MM/dd',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'JPY',
    rtl: false
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳', 
    dateFormat: 'yyyy/MM/dd',
    numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
    currency: 'CNY',
    rtl: false
  }
}

// Translation namespace type
export interface Translations {
  // Common
  common: {
    loading: string
    error: string
    success: string
    cancel: string
    save: string
    delete: string
    edit: string
    create: string
    confirm: string
    yes: string
    no: string
    continue: string
    back: string
    next: string
    previous: string
    submit: string
    close: string
    search: string
    filter: string
    sort: string
    actions: string
    settings: string
    help: string
    logout: string
    login: string
    register: string
  }
  
  // Navigation
  navigation: {
    dashboard: string
    workspaces: string
    campaigns: string
    analytics: string
    settings: string
    documentation: string
    support: string
  }
  
  // Workspace Creation Flow
  workspace: {
    create: string
    title: string
    description: string
    goals: string
    industry: string
    audience: string
    agents: string
    policies: string
    review: string
    createWorkspace: string
    defineGoals: string
    configureAgents: string
    setPolicies: string
    reviewCreate: string
    campaignGoals: string
    targetAudience: string
    agentName: string
    primaryRole: string
    objectives: string
    autonomyLevel: string
    budgetLimit: string
    monthlyBudget: string
    contentApproval: string
    postingFrequency: string
    complianceLevel: string
    readiness: string
    overallReadiness: string
  }
  
  // Campaign Approval Flow
  campaign: {
    approval: string
    workflow: string
    readinessSummary: string
    policyCompliance: string
    compliant: string
    reviewNeeded: string
    issuesFound: string
    approve: string
    reject: string
    modify: string
    finalize: string
    pending: string
    contentPreview: string
    readinessAssessment: string
    metadata: string
  }
  
  // AI Assisted Features
  ai: {
    suggestions: string
    apply: string
    dismiss: string
    confident: string
    costOptimization: string
    smartInsights: string
    optimalPosting: string
    visualContent: string
    mobileAudience: string
    createOptimized: string
    complianceHint: string
    optimizationSuggestion: string
  }
  
  // Progressive Disclosure
  disclosure: {
    basic: string
    intermediate: string
    advanced: string
    essentialSettings: string
    additionalOptions: string
    fullControl: string
    configurationLevel: string
    agentConfiguration: string
    autonomyControl: string
    advancedConfiguration: string
    learningMode: string
    safetyFilters: string
    performanceMetrics: string
    needHelp: string
  }
  
  // Performance & Monitoring
  performance: {
    coreWebVitals: string
    measuring: string
    currentCost: string
    optimizedCost: string
    target: string
    metrics: string
    toggle: string
    navigationTiming: string
    resourceLoading: string
    longTask: string
    bundleAnalysis: string
  }
  
  // Form Validation
  validation: {
    required: string
    invalidEmail: string
    passwordTooShort: string
    passwordMismatch: string
    invalidUrl: string
    invalidNumber: string
    maxLength: string
    minLength: string
    budgetExceeded: string
    descriptionTooShort: string
  }
  
  // Error Messages
  errors: {
    networkError: string
    serverError: string
    notFound: string
    unauthorized: string
    forbidden: string
    validationFailed: string
    unknownError: string
    tryAgain: string
  }
  
  // Time & Dates
  time: {
    now: string
    today: string
    yesterday: string
    tomorrow: string
    thisWeek: string
    lastWeek: string
    thisMonth: string
    lastMonth: string
    second: string
    minute: string
    hour: string
    day: string
    week: string
    month: string
    year: string
    ago: string
    in: string
  }
  
  // Numbers & Currency
  numbers: {
    thousand: string
    million: string
    billion: string
    currency: string
    percentage: string
    perMonth: string
    perYear: string
    save: string
    cost: string
    budget: string
    revenue: string
    profit: string
  }
}

// I18n Context
interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  formatDate: (date: Date) => string
  formatNumber: (num: number) => string
  formatCurrency: (amount: number) => string
  formatRelativeTime: (date: Date) => string
  isRTL: boolean
  localeConfig: LocaleConfig
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Translation function with parameter interpolation
function createTranslationFunction(translations: Translations, locale: Locale) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.')
    let value: any = translations
    
    for (const k of keys) {
      value = value?.[k]
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation missing for key: ${key} in locale: ${locale}`)
      return key
    }
    
    // Interpolate parameters
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match
      })
    }
    
    return value
  }
}

// Date formatting
function formatDate(date: Date, locale: Locale): string {
  const config = LOCALE_CONFIG[locale]
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

// Number formatting
function formatNumber(num: number, locale: Locale): string {
  const config = LOCALE_CONFIG[locale]
  return new Intl.NumberFormat(locale, config.numberFormat).format(num)
}

// Currency formatting  
function formatCurrency(amount: number, locale: Locale): string {
  const config = LOCALE_CONFIG[locale]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.currency
  }).format(amount)
}

// Relative time formatting
function formatRelativeTime(date: Date, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = date.getTime() - new Date().getTime()
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24))
  
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diff / (1000 * 60 * 60))
    if (Math.abs(diffHours) < 1) {
      const diffMinutes = Math.round(diff / (1000 * 60))
      return rtf.format(diffMinutes, 'minute')
    }
    return rtf.format(diffHours, 'hour')
  }
  
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day')
  }
  
  if (Math.abs(diffDays) < 30) {
    const diffWeeks = Math.round(diffDays / 7)
    return rtf.format(diffWeeks, 'week')
  }
  
  const diffMonths = Math.round(diffDays / 30)
  return rtf.format(diffMonths, 'month')
}

// Load translations dynamically
async function loadTranslations(locale: Locale): Promise<Translations> {
  try {
    const module = await import(`./locales/${locale}.json`)
    return module.default
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}, falling back to English`)
    const fallback = await import('./locales/en.json')
    return fallback.default
  }
}

// I18n Provider Component
interface I18nProviderProps {
  children: ReactNode
  defaultLocale?: Locale
}

export function I18nProvider({ children, defaultLocale = 'en' }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)
  const [translations, setTranslations] = useState<Translations | null>(null)

  // Load translations when locale changes
  useEffect(() => {
    loadTranslations(locale).then(setTranslations)
  }, [locale])

  // Set document direction for RTL
  useEffect(() => {
    const isRTL = RTL_LOCALES.includes(locale)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])

  // Persist locale preference
  useEffect(() => {
    localStorage.setItem('smm-locale', locale)
  }, [locale])

  // Load saved locale on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('smm-locale') as Locale
    if (savedLocale && Object.keys(LOCALE_CONFIG).includes(savedLocale)) {
      setLocale(savedLocale)
    }
  }, [])

  if (!translations) {
    return <div>Loading translations...</div>
  }

  const localeConfig = LOCALE_CONFIG[locale]
  const isRTL = RTL_LOCALES.includes(locale)

  const contextValue: I18nContextType = {
    locale,
    setLocale,
    t: createTranslationFunction(translations, locale),
    formatDate: (date: Date) => formatDate(date, locale),
    formatNumber: (num: number) => formatNumber(num, locale),
    formatCurrency: (amount: number) => formatCurrency(amount, locale),
    formatRelativeTime: (date: Date) => formatRelativeTime(date, locale),
    isRTL,
    localeConfig
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook to use i18n
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Locale Selector Component
export function LocaleSelector() {
  const { locale, setLocale } = useI18n()

  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="px-3 py-1 border border-neutral-300 rounded-md text-sm"
    >
      {Object.values(LOCALE_CONFIG).map((config) => (
        <option key={config.code} value={config.code}>
          {config.flag} {config.nativeName}
        </option>
      ))}
    </select>
  )
}

// Utility function for translations outside components
export function createI18nUtils(locale: Locale, translations: Translations) {
  return {
    t: createTranslationFunction(translations, locale),
    formatDate: (date: Date) => formatDate(date, locale),
    formatNumber: (num: number) => formatNumber(num, locale),
    formatCurrency: (amount: number) => formatCurrency(amount, locale),
    formatRelativeTime: (date: Date) => formatRelativeTime(date, locale),
    isRTL: RTL_LOCALES.includes(locale),
    localeConfig: LOCALE_CONFIG[locale]
  }
}

export default I18nProvider