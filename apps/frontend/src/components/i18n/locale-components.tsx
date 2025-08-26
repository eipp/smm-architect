'use client'

import React from 'react'
import { useTranslation, SupportedLocale, SUPPORTED_LOCALES } from '@/lib/i18n'
import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime, 
  formatNumber, 
  formatPercentage,
  getLocaleInfo,
  pluralize
} from '@/lib/i18n-utils'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Enhanced locale selector with flag icons and native names
 */
export const LocaleSelector: React.FC<{
  variant?: 'dropdown' | 'grid' | 'minimal'
  showFlags?: boolean
  showNativeNames?: boolean
  className?: string
}> = ({ 
  variant = 'dropdown', 
  showFlags = true, 
  showNativeNames = true,
  className = ''
}) => {
  const { locale, setLocale, isLoading } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  
  if (variant === 'minimal') {
    return (
      <select 
        value={locale} 
        onChange={(e) => setLocale(e.target.value as SupportedLocale)}
        disabled={isLoading}
        className={`p-2 border border-border rounded-md bg-background text-foreground ${className}`}
      >
        {Object.entries(SUPPORTED_LOCALES).map(([code, name]) => {
          const info = getLocaleInfo(code as SupportedLocale)
          return (
            <option key={code} value={code}>
              {showFlags && `${info.flag} `}{showNativeNames ? info.nativeName : name}
            </option>
          )
        })}
      </select>
    )
  }
  
  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${className}`}>
        {Object.entries(SUPPORTED_LOCALES).map(([code, name]) => {
          const info = getLocaleInfo(code as SupportedLocale)
          const isSelected = locale === code
          
          return (
            <Button
              key={code}
              variant={isSelected ? 'default' : 'outline'}
              size=\"sm\"
              onClick={() => setLocale(code as SupportedLocale)}
              disabled={isLoading}
              className=\"justify-start h-12\"
            >
              <div className=\"flex items-center gap-2\">
                {showFlags && <span className=\"text-lg\">{info.flag}</span>}
                <div className=\"text-left\">
                  <div className=\"text-sm font-medium\">
                    {showNativeNames ? info.nativeName : name}
                  </div>
                  <div className=\"text-xs text-muted-foreground\">{code.toUpperCase()}</div>
                </div>
                {isSelected && <Check className=\"h-4 w-4 ml-auto\" />}
              </div>
            </Button>
          )
        })}
      </div>
    )
  }
  
  // Dropdown variant
  const currentInfo = getLocaleInfo(locale as SupportedLocale)
  
  return (
    <div className={`relative ${className}`}>
      <Button
        variant=\"outline\"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className=\"justify-between min-w-[140px]\"
      >
        <div className=\"flex items-center gap-2\">
          {showFlags && <span>{currentInfo.flag}</span>}
          <span>{showNativeNames ? currentInfo.nativeName : SUPPORTED_LOCALES[locale as SupportedLocale]}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpen && (
        <>
          <div 
            className=\"fixed inset-0 z-10\" 
            onClick={() => setIsOpen(false)}
          />
          <Card className=\"absolute top-full left-0 mt-1 w-full z-20 shadow-lg\">
            <CardContent className=\"p-1\">
              {Object.entries(SUPPORTED_LOCALES).map(([code, name]) => {
                const info = getLocaleInfo(code as SupportedLocale)
                const isSelected = locale === code
                
                return (
                  <Button
                    key={code}
                    variant=\"ghost\"
                    size=\"sm\"
                    onClick={() => {
                      setLocale(code as SupportedLocale)
                      setIsOpen(false)
                    }}
                    className={`w-full justify-start h-10 ${isSelected ? 'bg-muted' : ''}`}
                  >
                    <div className=\"flex items-center gap-2 w-full\">
                      {showFlags && <span>{info.flag}</span>}
                      <span className=\"flex-1 text-left\">
                        {showNativeNames ? info.nativeName : name}
                      </span>
                      {isSelected && <Check className=\"h-4 w-4\" />}
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * Formatted currency component
 */
export const FormattedCurrency: React.FC<{
  amount: number
  currency?: string
  locale?: SupportedLocale
  className?: string
}> = ({ amount, currency, locale: propLocale, className }) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  
  const formatted = formatCurrency(amount, actualLocale, currency)
  
  return <span className={className}>{formatted}</span>
}

/**
 * Formatted number component
 */
export const FormattedNumber: React.FC<{
  value: number
  options?: Intl.NumberFormatOptions
  locale?: SupportedLocale
  className?: string
}> = ({ value, options, locale: propLocale, className }) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  
  const formatted = formatNumber(value, actualLocale, options)
  
  return <span className={className}>{formatted}</span>
}

/**
 * Formatted percentage component
 */
export const FormattedPercentage: React.FC<{
  value: number
  decimals?: number
  locale?: SupportedLocale
  className?: string
}> = ({ value, decimals, locale: propLocale, className }) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  
  const formatted = formatPercentage(value, actualLocale, decimals)
  
  return <span className={className}>{formatted}</span>
}

/**
 * Formatted date component
 */
export const FormattedDate: React.FC<{
  date: Date | string
  options?: Intl.DateTimeFormatOptions
  locale?: SupportedLocale
  className?: string
}> = ({ date, options, locale: propLocale, className }) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatted = formatDate(dateObj, actualLocale, options)
  
  return <span className={className}>{formatted}</span>
}

/**
 * Relative time component (e.g., \"2 hours ago\")
 */
export const RelativeTime: React.FC<{
  date: Date | string
  baseDate?: Date
  locale?: SupportedLocale
  className?: string
  updateInterval?: number // in milliseconds
}> = ({ date, baseDate, locale: propLocale, className, updateInterval = 60000 }) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  const [, setTick] = React.useState(0)
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Auto-update relative time
  React.useEffect(() => {
    if (!updateInterval) return
    
    const interval = setInterval(() => {
      setTick(tick => tick + 1)
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [updateInterval])
  
  const formatted = formatRelativeTime(dateObj, actualLocale, baseDate)
  
  return <span className={className}>{formatted}</span>
}

/**
 * Pluralization component
 */
export const Plural: React.FC<{
  count: number
  zero?: React.ReactNode
  one: React.ReactNode
  two?: React.ReactNode
  few?: React.ReactNode
  many?: React.ReactNode
  other: React.ReactNode
  showCount?: boolean
  locale?: SupportedLocale
  className?: string
}> = ({ 
  count, 
  zero, 
  one, 
  two, 
  few, 
  many, 
  other, 
  showCount = true, 
  locale: propLocale, 
  className 
}) => {
  const { locale } = useTranslation()
  const actualLocale = propLocale || (locale as SupportedLocale)
  
  const rules = {
    zero: zero || other,
    one,
    two: two || other,
    few: few || other,
    many: many || other,
    other
  }
  
  const selected = pluralize(actualLocale, count, {
    zero: 'zero',
    one: 'one',
    two: 'two',
    few: 'few',
    many: 'many',
    other: 'other'
  }) as keyof typeof rules
  
  const content = rules[selected]
  
  return (
    <span className={className}>
      {showCount && <>{formatNumber(count, actualLocale)} </>}
      {content}
    </span>
  )
}

/**
 * Translation component with interpolation
 */
export const Trans: React.FC<{
  i18nKey: string
  values?: Record<string, React.ReactNode>
  components?: Record<string, React.ComponentType<any>>
  fallback?: React.ReactNode
  className?: string
}> = ({ i18nKey, values = {}, components = {}, fallback, className }) => {
  const { t } = useTranslation()
  
  let text = t(i18nKey as any) || (fallback ? String(fallback) : i18nKey)
  
  // Simple interpolation with React components
  if (values && Object.keys(values).length > 0) {
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\\\s*${key}\\\\s*}}`, 'g')
      text = text.replace(regex, String(value))
    })
  }
  
  // Component interpolation (simplified)
  if (components && Object.keys(components).length > 0) {
    // In a full implementation, this would parse and replace component tags
    // For now, just render the text
  }
  
  return <span className={className}>{text}</span>
}

/**
 * Locale-aware loading indicator
 */
export const LocaleLoadingIndicator: React.FC<{
  className?: string
}> = ({ className }) => {
  const { t, isLoading } = useTranslation()
  
  if (!isLoading) return null
  
  return (
    <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
      <Globe className=\"h-4 w-4 animate-spin\" />
      <span className=\"text-sm\">{t('common.loading')}</span>
    </div>
  )
}

/**
 * Direction-aware container
 */
export const DirectionContainer: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  const { locale } = useTranslation()
  const direction = getLocaleInfo(locale as SupportedLocale).direction
  
  return (
    <div 
      dir={direction} 
      className={`${direction === 'rtl' ? 'rtl' : 'ltr'} ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Locale debug panel (development only)
 */
export const LocaleDebugPanel: React.FC = () => {
  const { locale, t } = useTranslation()
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  const info = getLocaleInfo(locale as SupportedLocale)
  
  return (
    <Card className=\"fixed bottom-4 right-4 z-50 max-w-sm\">
      <CardContent className=\"p-4\">
        <h3 className=\"font-semibold mb-2 flex items-center gap-2\">
          <Globe className=\"h-4 w-4\" />
          Locale Debug
        </h3>
        <div className=\"space-y-1 text-sm\">
          <div><strong>Current:</strong> {info.flag} {info.nativeName} ({locale})</div>
          <div><strong>Direction:</strong> {info.direction}</div>
          <div><strong>Date Format:</strong> {info.dateFormat}</div>
          <div><strong>Time Format:</strong> {info.timeFormat}</div>
          <div><strong>Sample:</strong> {t('common.loading')}</div>
        </div>
      </CardContent>
    </Card>
  )
}"