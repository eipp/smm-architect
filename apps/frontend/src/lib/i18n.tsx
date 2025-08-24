"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext } from 'react'

// Translation key types for type safety
interface TranslationKeys {
  // Canvas & Workflow
  'canvas.step.discover': string
  'canvas.step.plan': string
  'canvas.step.draft': string
  'canvas.step.verify': string
  'canvas.step.approve': string
  'canvas.step.post': string
  'canvas.action.fix': string
  'canvas.action.rerun': string
  'canvas.action.approve': string
  'canvas.action.rollback': string
  'canvas.status.running': string
  'canvas.status.completed': string
  'canvas.status.failed': string
  'canvas.status.pending': string
  
  // Decision Cards
  'decision.risk.low': string
  'decision.risk.medium': string
  'decision.risk.high': string
  'decision.action.approve': string
  'decision.action.request_edits': string
  'decision.action.escalate': string
  'decision.readiness_score': string
  'decision.estimated_cost': string
  'decision.policy_compliance': string
  'decision.citation_coverage': string
  'decision.expires_in': string
  'decision.expired': string
  
  // Auto Setup Flow
  'onboard.welcome.title': string
  'onboard.welcome.subtitle': string
  'onboard.workspace.name_label': string
  'onboard.workspace.name_placeholder': string
  'onboard.workspace.channel_label': string
  'onboard.oauth.connect_button': string
  'onboard.oauth.connection_success': string
  'onboard.oauth.connection_failed': string
  'onboard.shadow_run.title': string
  'onboard.shadow_run.description': string
  'onboard.complete.button': string
  
  // Settings & Admin
  'settings.personas.title': string
  'settings.personas.add_new': string
  'settings.personas.edit': string
  'settings.personas.delete': string
  'settings.budget.weekly_cap': string
  'settings.budget.hard_cap': string
  'settings.budget.current_usage': string
  'settings.policy.title': string
  'settings.policy.compliance_required': string
  'settings.emergency.pause_all': string
  'settings.emergency.resume_all': string
  
  // Navigation
  'nav.dashboard': string
  'nav.auto_setup': string
  'nav.canvas': string
  'nav.chat': string
  'nav.calendar': string
  'nav.connectors': string
  'nav.settings': string
  'nav.audit': string
  
  // Authentication
  'auth.login.title': string
  'auth.login.email_label': string
  'auth.login.password_label': string
  'auth.login.submit_button': string
  'auth.login.forgot_password': string
  'auth.logout.button': string
  'auth.permissions.insufficient': string
  
  // Common UI
  'common.loading': string
  'common.error': string
  'common.retry': string
  'common.cancel': string
  'common.save': string
  'common.edit': string
  'common.delete': string
  'common.confirm': string
  'common.back': string
  'common.next': string
  'common.continue': string
  'common.close': string
  'common.search': string
  'common.filter': string
  
  // Time & Dates
  'time.now': string
  'time.minutes_ago': string
  'time.hours_ago': string
  'time.days_ago': string
  'time.yesterday': string
  'time.today': string
  'time.tomorrow': string
  
  // Validation
  'validation.required': string
  'validation.email_invalid': string
  'validation.password_weak': string
  'validation.name_too_short': string
  'validation.budget_invalid': string
  
  // Notifications
  'notification.success': string
  'notification.error': string
  'notification.warning': string
  'notification.info': string
  'notification.workspace_created': string
  'notification.campaign_approved': string
  'notification.budget_exceeded': string
}

type TranslationFunction = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string

// Translation context
interface I18nContextValue {
  locale: string
  setLocale: (locale: string) => void
  t: TranslationFunction
  isLoading: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

// Supported locales
export const SUPPORTED_LOCALES = {
  en: 'English',
  es: 'Español', 
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文'
} as const

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES

// Translation storage
const translations: Record<SupportedLocale, Partial<TranslationKeys>> = {
  en: {
    // Canvas & Workflow
    'canvas.step.discover': 'Discover',
    'canvas.step.plan': 'Plan',
    'canvas.step.draft': 'Draft',
    'canvas.step.verify': 'Verify',
    'canvas.step.approve': 'Approve',
    'canvas.step.post': 'Post',
    'canvas.action.fix': 'Fix',
    'canvas.action.rerun': 'Rerun',
    'canvas.action.approve': 'Approve',
    'canvas.action.rollback': 'Rollback',
    'canvas.status.running': 'Running',
    'canvas.status.completed': 'Completed',
    'canvas.status.failed': 'Failed',
    'canvas.status.pending': 'Pending',
    
    // Decision Cards
    'decision.risk.low': 'Low Risk',
    'decision.risk.medium': 'Medium Risk',
    'decision.risk.high': 'High Risk',
    'decision.action.approve': 'Approve',
    'decision.action.request_edits': 'Request Edits',
    'decision.action.escalate': 'Escalate',
    'decision.readiness_score': 'Readiness Score',
    'decision.estimated_cost': 'Estimated Cost',
    'decision.policy_compliance': 'Policy Compliance',
    'decision.citation_coverage': 'Citation Coverage',
    'decision.expires_in': 'Expires in {{hours}}h',
    'decision.expired': 'Expired',
    
    // Auto Setup
    'onboard.welcome.title': 'Welcome to SMM Architect',
    'onboard.welcome.subtitle': 'Set up your first workspace in minutes',
    'onboard.workspace.name_label': 'Workspace Name',
    'onboard.workspace.name_placeholder': 'Enter workspace name...',
    'onboard.workspace.channel_label': 'Primary Channel',
    'onboard.oauth.connect_button': 'Connect {{platform}}',
    'onboard.oauth.connection_success': 'Successfully connected to {{platform}}',
    'onboard.oauth.connection_failed': 'Failed to connect to {{platform}}',
    'onboard.shadow_run.title': 'Shadow Run Results',
    'onboard.shadow_run.description': 'Preview of your workspace performance',
    'onboard.complete.button': 'Complete Setup',
    
    // Settings
    'settings.personas.title': 'Brand Personas',
    'settings.personas.add_new': 'Add New Persona',
    'settings.personas.edit': 'Edit Persona',
    'settings.personas.delete': 'Delete Persona',
    'settings.budget.weekly_cap': 'Weekly Budget Cap',
    'settings.budget.hard_cap': 'Hard Limit',
    'settings.budget.current_usage': 'Current Usage: {{amount}}',
    'settings.policy.title': 'Policy Configuration',
    'settings.policy.compliance_required': 'Compliance Required',
    'settings.emergency.pause_all': 'Emergency Pause All',
    'settings.emergency.resume_all': 'Resume All',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.auto_setup': 'Auto Setup',
    'nav.canvas': 'Canvas',
    'nav.chat': 'Chat',
    'nav.calendar': 'Calendar',
    'nav.connectors': 'Connectors',
    'nav.settings': 'Settings',
    'nav.audit': 'Audit',
    
    // Common UI
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.continue': 'Continue',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    
    // Validation
    'validation.required': 'This field is required',
    'validation.email_invalid': 'Please enter a valid email address',
    'validation.password_weak': 'Password must be at least 8 characters',
    'validation.name_too_short': 'Name must be at least 3 characters',
    'validation.budget_invalid': 'Please enter a valid budget amount'
  },
  es: {
    'canvas.step.discover': 'Descubrir',
    'canvas.step.plan': 'Planificar',
    'canvas.step.draft': 'Borrador',
    'canvas.step.verify': 'Verificar',
    'canvas.step.approve': 'Aprobar',
    'canvas.step.post': 'Publicar',
    'decision.risk.low': 'Riesgo Bajo',
    'decision.risk.medium': 'Riesgo Medio',
    'decision.risk.high': 'Riesgo Alto',
    'nav.dashboard': 'Panel de Control',
    'nav.settings': 'Configuración',
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar'
  },
  fr: {
    'canvas.step.discover': 'Découvrir',
    'canvas.step.plan': 'Planifier', 
    'canvas.step.draft': 'Brouillon',
    'canvas.step.verify': 'Vérifier',
    'canvas.step.approve': 'Approuver',
    'canvas.step.post': 'Publier',
    'decision.risk.low': 'Risque Faible',
    'decision.risk.medium': 'Risque Moyen',
    'decision.risk.high': 'Risque Élevé',
    'nav.dashboard': 'Tableau de Bord',
    'nav.settings': 'Paramètres',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler'
  },
  de: {
    'canvas.step.discover': 'Entdecken',
    'canvas.step.plan': 'Planen',
    'canvas.step.draft': 'Entwurf',
    'canvas.step.verify': 'Verifizieren',
    'canvas.step.approve': 'Genehmigen',
    'canvas.step.post': 'Veröffentlichen',
    'decision.risk.low': 'Geringes Risiko',
    'decision.risk.medium': 'Mittleres Risiko',
    'decision.risk.high': 'Hohes Risiko',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Einstellungen',
    'common.loading': 'Laden...',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen'
  },
  ja: {
    'canvas.step.discover': '発見',
    'canvas.step.plan': '計画',
    'canvas.step.draft': '下書き',
    'canvas.step.verify': '検証',
    'canvas.step.approve': '承認',
    'canvas.step.post': '投稿',
    'decision.risk.low': '低リスク',
    'decision.risk.medium': '中リスク',
    'decision.risk.high': '高リスク',
    'nav.dashboard': 'ダッシュボード',
    'nav.settings': '設定',
    'common.loading': '読み込み中...',
    'common.save': '保存',
    'common.cancel': 'キャンセル'
  },
  zh: {
    'canvas.step.discover': '发现',
    'canvas.step.plan': '计划',
    'canvas.step.draft': '草稿',
    'canvas.step.verify': '验证',
    'canvas.step.approve': '批准',
    'canvas.step.post': '发布',
    'decision.risk.low': '低风险',
    'decision.risk.medium': '中等风险',
    'decision.risk.high': '高风险',
    'nav.dashboard': '仪表板',
    'nav.settings': '设置',
    'common.loading': '加载中...',
    'common.save': '保存',
    'common.cancel': '取消'
  }
}

// I18n Provider
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<SupportedLocale>('en')
  const [isLoading, setIsLoading] = useState(false)
  
  // Get locale from URL or localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as SupportedLocale
    if (savedLocale && savedLocale in SUPPORTED_LOCALES) {
      setLocaleState(savedLocale)
    } else {
      // Detect browser locale
      const browserLocale = navigator.language.split('-')[0] as SupportedLocale
      if (browserLocale in SUPPORTED_LOCALES) {
        setLocaleState(browserLocale)
      }
    }
  }, [])
  
  const setLocale = async (newLocale: SupportedLocale) => {
    setIsLoading(true)
    
    try {
      // Save to localStorage
      localStorage.setItem('locale', newLocale)
      setLocaleState(newLocale)
      
      // Update HTML lang attribute
      document.documentElement.lang = newLocale
      
      // You could also update the URL if using locale-based routing
      // router.push(`/${newLocale}${router.asPath}`)
    } catch (error) {
      console.error('Failed to set locale:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const t: TranslationFunction = (key, params = {}) => {
    const translation = translations[locale][key] || translations.en[key] || key
    
    // Simple parameter substitution
    return Object.entries(params).reduce(
      (str, [param, value]) => str.replace(new RegExp(`{{${param}}}`, 'g'), String(value)),
      translation
    )
  }
  
  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    isLoading
  }
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// Translation hook
export function useTranslation(): { t: TranslationFunction; locale: string; setLocale: (locale: SupportedLocale) => void; isLoading: boolean } {
  const context = useContext(I18nContext)
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  
  return context
}

// Locale selector component
export function LocaleSelector() {
  const { locale, setLocale, isLoading } = useTranslation()
  
  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as SupportedLocale)}
      disabled={isLoading}
      className="p-2 border rounded"
    >
      {Object.entries(SUPPORTED_LOCALES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  )
}

// Utility functions for formatting
export const formatters = {
  currency: (amount: number, locale: string = 'en-US', currency: string = 'USD') => {
    const formatters: Record<string, Intl.NumberFormat> = {
      'en': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'es': new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
      'fr': new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
      'de': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
      'ja': new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
      'zh': new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
    }
    
    const formatter = formatters[locale] || formatters['en']
    return formatter.format(amount)
  },
  
  dateTime: (date: Date, locale: string = 'en-US') => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  },
  
  relativeTime: (date: Date, locale: string = 'en-US') => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    
    if (diff < 60000) { // Less than 1 minute
      return rtf.format(-Math.floor(diff / 1000), 'second')
    } else if (diff < 3600000) { // Less than 1 hour
      return rtf.format(-Math.floor(diff / 60000), 'minute')
    } else if (diff < 86400000) { // Less than 1 day
      return rtf.format(-Math.floor(diff / 3600000), 'hour')
    } else {
      return rtf.format(-Math.floor(diff / 86400000), 'day')
    }
  },
  
  percentage: (value: number, locale: string = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value)
  }
}

// Type-safe translation helper for components
export function createTranslation<T extends Partial<TranslationKeys>>(translations: T) {
  return translations
}