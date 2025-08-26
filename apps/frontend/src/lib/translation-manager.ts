import { SUPPORTED_LOCALES, SupportedLocale } from './i18n'
import { writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Translation management utilities for maintaining translations
 */

export interface TranslationValidationResult {
  valid: boolean
  errors: Array<{
    locale: SupportedLocale
    key: string
    issue: 'missing' | 'empty' | 'invalid_interpolation'
    message: string
  }>
  warnings: Array<{
    locale: SupportedLocale
    key: string
    issue: 'unused' | 'duplicate_value'
    message: string
  }>
}

export interface TranslationStats {
  totalKeys: number
  translatedKeys: Record<SupportedLocale, number>
  completionPercentage: Record<SupportedLocale, number>
  missingKeys: Record<SupportedLocale, string[]>
}

/**
 * Validate all translations for consistency and completeness
 */
export function validateTranslations(translations: any): TranslationValidationResult {
  const result: TranslationValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  }

  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]
  const baseLocale: SupportedLocale = 'en'
  const baseKeys = Object.keys(translations[baseLocale] || {})

  // Check each locale against base locale
  for (const locale of locales) {
    const localeTranslations = translations[locale] || {}
    
    // Check for missing keys
    for (const key of baseKeys) {
      if (!(key in localeTranslations)) {
        result.errors.push({
          locale,
          key,
          issue: 'missing',
          message: `Missing translation for key "${key}" in locale "${locale}"`
        })
        result.valid = false
      } else if (!localeTranslations[key] || localeTranslations[key].trim() === '') {
        result.errors.push({
          locale,
          key,
          issue: 'empty',
          message: `Empty translation for key "${key}" in locale "${locale}"`
        })
        result.valid = false
      } else {
        // Check for interpolation consistency
        const baseValue = translations[baseLocale][key]
        const localeValue = localeTranslations[key]
        
        const baseInterpolations = extractInterpolations(baseValue)
        const localeInterpolations = extractInterpolations(localeValue)
        
        if (!arraysEqual(baseInterpolations, localeInterpolations)) {
          result.errors.push({
            locale,
            key,
            issue: 'invalid_interpolation',
            message: `Interpolation mismatch for key "${key}" in locale "${locale}". Expected: ${baseInterpolations.join(', ')}, Found: ${localeInterpolations.join(', ')}`
          })
          result.valid = false
        }
      }
    }

    // Check for extra keys (warnings)
    const localeKeys = Object.keys(localeTranslations)
    for (const key of localeKeys) {
      if (!baseKeys.includes(key)) {
        result.warnings.push({
          locale,
          key,
          issue: 'unused',
          message: `Unused translation key "${key}" in locale "${locale}"`
        })
      }
    }
  }

  return result
}

/**
 * Extract interpolation variables from translation string
 */
function extractInterpolations(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1])
  }
  
  return matches.sort()
}

/**
 * Check if two arrays are equal
 */
function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index])
}

/**
 * Get translation statistics
 */
export function getTranslationStats(translations: any): TranslationStats {
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]
  const baseLocale: SupportedLocale = 'en'
  const baseKeys = Object.keys(translations[baseLocale] || {})
  const totalKeys = baseKeys.length

  const stats: TranslationStats = {
    totalKeys,
    translatedKeys: {} as Record<SupportedLocale, number>,
    completionPercentage: {} as Record<SupportedLocale, number>,
    missingKeys: {} as Record<SupportedLocale, string[]>
  }

  for (const locale of locales) {
    const localeTranslations = translations[locale] || {}
    const translatedKeys = baseKeys.filter(key => 
      key in localeTranslations && 
      localeTranslations[key] && 
      localeTranslations[key].trim() !== ''
    )
    
    const missingKeys = baseKeys.filter(key => 
      !(key in localeTranslations) || 
      !localeTranslations[key] || 
      localeTranslations[key].trim() === ''
    )

    stats.translatedKeys[locale] = translatedKeys.length
    stats.completionPercentage[locale] = totalKeys > 0 ? (translatedKeys.length / totalKeys) * 100 : 0
    stats.missingKeys[locale] = missingKeys
  }

  return stats
}

/**
 * Generate translation template for new keys
 */
export function generateTranslationTemplate(keys: string[]): Record<SupportedLocale, Record<string, string>> {
  const template: Record<SupportedLocale, Record<string, string>> = {} as any
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]

  for (const locale of locales) {
    template[locale] = {}
    for (const key of keys) {
      template[locale][key] = `[${key.toUpperCase()}]` // Placeholder
    }
  }

  return template
}

/**
 * Merge new translations into existing translations
 */
export function mergeTranslations(
  existing: any,
  newTranslations: any,
  overwrite: boolean = false
): any {
  const result = { ...existing }
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]

  for (const locale of locales) {
    if (!result[locale]) {
      result[locale] = {}
    }

    const existingLocale = result[locale]
    const newLocale = newTranslations[locale] || {}

    for (const [key, value] of Object.entries(newLocale)) {
      if (overwrite || !existingLocale[key]) {
        existingLocale[key] = value
      }
    }
  }

  return result
}

/**
 * Find unused translation keys
 */
export function findUnusedKeys(
  translations: any,
  sourceCodePattern: RegExp = /['"`]([a-zA-Z0-9_.]+)['"`]/g
): string[] {
  const baseLocale: SupportedLocale = 'en'
  const allKeys = Object.keys(translations[baseLocale] || {})
  
  // This is a simplified version - in a real implementation,
  // you would scan the actual source files
  const usedKeys = new Set<string>()
  
  // Simulate finding keys in source code
  // In practice, you'd read and scan actual files
  const mockSourceCode = `
    t('common.loading')
    t('nav.dashboard')
    t('auth.login.title')
  `
  
  let match
  while ((match = sourceCodePattern.exec(mockSourceCode)) !== null) {
    const key = match[1]
    if (allKeys.includes(key)) {
      usedKeys.add(key)
    }
  }
  
  return allKeys.filter(key => !usedKeys.has(key))
}

/**
 * Sort translation keys alphabetically
 */
export function sortTranslationKeys(translations: any): any {
  const result: any = {}
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]

  for (const locale of locales) {
    const localeTranslations = translations[locale] || {}
    const sortedKeys = Object.keys(localeTranslations).sort()
    
    result[locale] = {}
    for (const key of sortedKeys) {
      result[locale][key] = localeTranslations[key]
    }
  }

  return result
}

/**
 * Export translations to JSON files
 */
export function exportTranslations(
  translations: any,
  outputDir: string = './public/locales'
): void {
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]

  for (const locale of locales) {
    const localeTranslations = translations[locale] || {}
    const filePath = join(outputDir, `${locale}.json`)
    
    try {
      writeFileSync(
        filePath,
        JSON.stringify(localeTranslations, null, 2),
        'utf8'
      )
      console.log(`Exported translations for ${locale} to ${filePath}`)
    } catch (error) {
      console.error(`Failed to export translations for ${locale}:`, error)
    }
  }
}

/**
 * Import translations from JSON files
 */
export function importTranslations(
  inputDir: string = './public/locales'
): any {
  const translations: any = {}
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]

  for (const locale of locales) {
    const filePath = join(inputDir, `${locale}.json`)
    
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      translations[locale] = JSON.parse(fileContent)
      console.log(`Imported translations for ${locale} from ${filePath}`)
    } catch (error) {
      console.warn(`Failed to import translations for ${locale}:`, error)
      translations[locale] = {}
    }
  }

  return translations
}

/**
 * Generate translation report
 */
export function generateTranslationReport(translations: any): string {
  const validation = validateTranslations(translations)
  const stats = getTranslationStats(translations)
  
  let report = '# Translation Report\n\n'
  
  // Statistics
  report += '## Translation Statistics\n\n'
  report += `Total keys: ${stats.totalKeys}\n\n`
  report += '| Locale | Translated | Completion % | Missing Keys |\n'
  report += '|--------|------------|--------------|-------------|\n'
  
  const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]
  for (const locale of locales) {
    const translated = stats.translatedKeys[locale] || 0
    const completion = Math.round(stats.completionPercentage[locale] || 0)
    const missing = stats.missingKeys[locale]?.length || 0
    
    report += `| ${locale} | ${translated} | ${completion}% | ${missing} |\n`
  }
  
  // Validation Results
  if (!validation.valid) {
    report += '\n## Validation Errors\n\n'
    for (const error of validation.errors) {
      report += `- **${error.locale}**: ${error.message}\n`
    }
  }
  
  if (validation.warnings.length > 0) {
    report += '\n## Warnings\n\n'
    for (const warning of validation.warnings) {
      report += `- **${warning.locale}**: ${warning.message}\n`
    }
  }
  
  return report
}

/**
 * CLI utility functions for translation management
 */
export const translationCLI = {
  validate: (translationsPath: string) => {
    try {
      const translations = require(translationsPath)
      const result = validateTranslations(translations)
      
      if (result.valid) {
        console.log('✅ All translations are valid!')
      } else {
        console.error('❌ Translation validation failed:')
        result.errors.forEach(error => {
          console.error(`  - ${error.locale}: ${error.message}`)
        })
      }
      
      if (result.warnings.length > 0) {
        console.warn('⚠️  Warnings:')
        result.warnings.forEach(warning => {
          console.warn(`  - ${warning.locale}: ${warning.message}`)
        })
      }
      
      return result.valid
    } catch (error) {
      console.error('Failed to validate translations:', error)
      return false
    }
  },

  stats: (translationsPath: string) => {
    try {
      const translations = require(translationsPath)
      const stats = getTranslationStats(translations)
      
      console.log('\n📊 Translation Statistics')
      console.log(`Total keys: ${stats.totalKeys}\n`)
      
      const locales = Object.keys(SUPPORTED_LOCALES) as SupportedLocale[]
      for (const locale of locales) {
        const completion = Math.round(stats.completionPercentage[locale] || 0)
        const missing = stats.missingKeys[locale]?.length || 0
        
        console.log(`${locale}: ${completion}% complete (${missing} missing)`)
      }
    } catch (error) {
      console.error('Failed to get translation stats:', error)
    }
  },

  export: (translationsPath: string, outputDir?: string) => {
    try {
      const translations = require(translationsPath)
      exportTranslations(translations, outputDir)
      console.log('✅ Translations exported successfully!')
    } catch (error) {
      console.error('Failed to export translations:', error)
    }
  }
}

export default {
  validateTranslations,
  getTranslationStats,
  generateTranslationTemplate,
  mergeTranslations,
  findUnusedKeys,
  sortTranslationKeys,
  exportTranslations,
  importTranslations,
  generateTranslationReport,
  translationCLI
}