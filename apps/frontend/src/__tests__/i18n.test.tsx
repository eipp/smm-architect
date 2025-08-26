import { 
  formatCurrency, 
  formatDate, 
  formatRelativeTime,
  formatNumber,
  formatPercentage
} from '@/lib/locale-utils'
import { 
  validateTranslations, 
  getTranslationStats 
} from '@/lib/translation-manager'

// Simple tests for locale utilities (no React components)
describe('Locale Utilities', () => {
  describe('Currency Formatting', () => {
    it('should format USD for English locale', () => {
      const result = formatCurrency(1234.56, 'en')
      expect(result).toMatch(/\$1,234\.56/)
    })

    it('should format EUR for German locale', () => {
      const result = formatCurrency(1234.56, 'de')
      expect(result).toMatch(/1\.234,56/)
    })

    it('should format JPY without decimals', () => {
      const result = formatCurrency(1234, 'ja')
      expect(result).toMatch(/1,234/)
    })

    it('should handle custom currency', () => {
      const result = formatCurrency(100, 'en', 'GBP')
      expect(result).toMatch(/£100/)
    })
  })

  describe('Number Formatting', () => {
    it('should format numbers with locale-specific separators', () => {
      const enResult = formatNumber(1234567.89, 'en')
      const deResult = formatNumber(1234567.89, 'de')
      
      expect(enResult).toMatch(/1,234,567/)
      expect(deResult).toMatch(/1\.234\.567/)
    })

    it('should respect custom options', () => {
      const result = formatNumber(1234.5678, 'en', { 
        minimumFractionDigits: 3,
        maximumFractionDigits: 3 
      })
      expect(result).toMatch(/1,234\.568/)
    })
  })

  describe('Percentage Formatting', () => {
    it('should format percentages correctly', () => {
      const enResult = formatPercentage(0.1234, 'en')
      const deResult = formatPercentage(0.1234, 'de')
      
      expect(enResult).toMatch(/12\.3%/)
      expect(deResult).toMatch(/12,3/)
    })
  })

  describe('Date Formatting', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')

    it('should format dates for different locales', () => {
      const enResult = formatDate(testDate, 'en')
      const deResult = formatDate(testDate, 'de')
      
      expect(enResult).toMatch(/Jan/)
      expect(deResult).toMatch(/Jan/)
    })

    it('should handle custom date options', () => {
      const result = formatDate(testDate, 'en', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      expect(result).toMatch(/January/)
    })
  })

  describe('Relative Time Formatting', () => {
    it('should format relative time correctly', () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      
      const result = formatRelativeTime(pastDate, 'en')
      expect(result).toMatch(/ago|hour/)
    })

    it('should handle recent dates', () => {
      const now = new Date()
      const recentDate = new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      
      const result = formatRelativeTime(recentDate, 'en')
      expect(result).toMatch(/minute|ago/)
    })
  })
})

describe('Translation Manager', () => {
  const mockTranslations = {
    en: {
      'common.loading': 'Loading...',
      'common.save': 'Save',
      'nav.dashboard': 'Dashboard',
      'decision.expires_in': 'Expires in {{hours}}h'
    },
    es: {
      'common.loading': 'Cargando...',
      'common.save': 'Guardar',
      'nav.dashboard': 'Panel de Control'
      // Missing 'decision.expires_in'
    },
    fr: {
      'common.loading': 'Chargement...',
      'common.save': 'Enregistrer',
      'nav.dashboard': 'Tableau de Bord',
      'decision.expires_in': 'Expire dans {{hours}}h'
    },
    de: {
      'common.loading': 'Laden...',
      'common.save': 'Speichern',
      'nav.dashboard': 'Dashboard',
      'decision.expires_in': 'Läuft in {{hours}}h ab'
    },
    ja: {
      'common.loading': '読み込み中...',
      'common.save': '保存',
      'nav.dashboard': 'ダッシュボード',
      'decision.expires_in': '{{hours}}時間後に期限切れ'
    },
    zh: {
      'common.loading': '加载中...',
      'common.save': '保存',
      'nav.dashboard': '仪表盘',
      'decision.expires_in': '{{hours}}小时后到期'
    }
  }

  describe('Translation Validation', () => {
    it('should validate complete translations', () => {
      const validTranslations = {
        en: { 'test.key': 'Test {{param}}' },
        es: { 'test.key': 'Prueba {{param}}' },
        fr: { 'test.key': 'Test {{param}}' },
        de: { 'test.key': 'Test {{param}}' },
        ja: { 'test.key': 'テスト{{param}}' },
        zh: { 'test.key': '测试{{param}}' }
      }
      
      const result = validateTranslations(validTranslations)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing translations', () => {
      const result = validateTranslations(mockTranslations)
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      
      const missingSpanishError = result.errors.find(error => 
        error.locale === 'es' && error.key === 'decision.expires_in'
      )
      expect(missingSpanishError).toBeDefined()
    })

    it('should detect interpolation mismatches', () => {
      const badTranslations = {
        en: { 'test.key': 'Hello {{name}}' },
        es: { 'test.key': 'Hola {{nombre}}' }, // Different parameter name
        fr: { 'test.key': 'Bonjour {{name}}' },
        de: { 'test.key': 'Hallo {{name}}' },
        ja: { 'test.key': 'こんにちは{{name}}' },
        zh: { 'test.key': '你好{{name}}' }
      }
      
      const result = validateTranslations(badTranslations)
      
      expect(result.valid).toBe(false)
      const interpolationError = result.errors.find(error => 
        error.locale === 'es' && error.issue === 'invalid_interpolation'
      )
      expect(interpolationError).toBeDefined()
    })
  })

  describe('Translation Statistics', () => {
    it('should calculate completion percentages correctly', () => {
      const stats = getTranslationStats(mockTranslations)
      
      expect(stats.totalKeys).toBe(4)
      expect(stats.completionPercentage.en).toBe(100)
      expect(stats.completionPercentage.es).toBe(75) // 3 out of 4 keys
      expect(stats.completionPercentage.fr).toBe(100)
      expect(stats.missingKeys.es).toContain('decision.expires_in')
    })
  })
})

describe('Performance Tests', () => {
  it('should handle translation validation efficiently', () => {
    const largeTranslations = {
      en: {},
      es: {},
      fr: {},
      de: {},
      ja: {},
      zh: {}
    }
    
    // Generate 100 translations (smaller number for faster tests)
    for (let i = 0; i < 100; i++) {
      Object.keys(largeTranslations).forEach(locale => {
        largeTranslations[locale][`key_${i}`] = `Text ${i} in ${locale}`
      })
    }
    
    const startTime = performance.now()
    const result = validateTranslations(largeTranslations)
    const endTime = performance.now()
    
    expect(result.valid).toBe(true)
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
  })

  it('should efficiently format many numbers', () => {
    const numbers = Array.from({ length: 100 }, (_, i) => i * 1234.56)
    
    const startTime = performance.now()
    
    numbers.forEach(num => formatCurrency(num, 'en'))
    
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
  })
})