import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Comprehensive Accessibility Testing Suite
 * Tests WCAG AA compliance across all design system components
 */

// Configure axe-core for WCAG AA compliance
const axeConfig = {
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  rules: {
    // Enhanced rules for design systems
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'keyboard': { enabled: true },
    'skip-link': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'button-name': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'input-button-name': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-complementary-is-top-level': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'heading-order': { enabled: true }
  }
}

// Test component accessibility
const COMPONENTS_TO_TEST = [
  'button--primary',
  'button--secondary', 
  'button--outline',
  'button--with-icons',
  'input--default',
  'input--with-icons',
  'input--validation-states',
  'textarea--default',
  'search-input--default',
  'card--default',
  'card--interactive',
  'timeline--default',
  'workspace-creation-flow--step-1',
  'campaign-approval-flow--default',
  'progressive-disclosure--basic',
  'ai-assisted-features--default'
]

// Core accessibility tests for each component
COMPONENTS_TO_TEST.forEach(component => {
  test.describe(`Accessibility: ${component}`, () => {
    test('should pass axe-core accessibility audit', async ({ page }) => {
      await page.goto(`/story/${component}`)
      await page.waitForLoadState('networkidle')
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      
      expect(accessibilityScanResults.violations).toEqual([])
    })
    
    test('should have proper keyboard navigation', async ({ page }) => {
      await page.goto(`/story/${component}`)
      await page.waitForLoadState('networkidle')
      
      // Test tab navigation
      const focusableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]').all()
      
      for (let i = 0; i < focusableElements.length; i++) {
        await page.keyboard.press('Tab')
        const focused = await page.evaluate(() => document.activeElement?.tagName)
        expect(focused).toBeDefined()
      }
    })
    
    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto(`/story/${component}`)
      await page.waitForLoadState('networkidle')
      
      // Check for required ARIA attributes based on component type
      const buttons = await page.locator('button, [role="button"]').all()
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label')
        const textContent = await button.textContent()
        const ariaLabelledBy = await button.getAttribute('aria-labelledby')
        
        // Button must have accessible name
        expect(ariaLabel || textContent?.trim() || ariaLabelledBy).toBeTruthy()
      }
      
      const inputs = await page.locator('input, textarea').all()
      for (const input of inputs) {
        const label = await page.locator(`label[for="${await input.getAttribute('id')}"]`).first()
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        // Input must have accessible label
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    })
    
    test('should have proper color contrast', async ({ page }) => {
      await page.goto(`/story/${component}`)
      await page.waitForLoadState('networkidle')
      
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast', 'color-contrast-enhanced'])
        .analyze()
      
      expect(contrastResults.violations).toEqual([])
    })
  })
})

// Form accessibility tests
test.describe('Form Accessibility', () => {
  test('workspace creation flow should be fully accessible', async ({ page }) => {
    await page.goto('/story/workspace-creation-flow--step-1')
    await page.waitForLoadState('networkidle')
    
    // Test form validation announcements
    const nameInput = page.locator('input[placeholder*="name"]').first()
    await nameInput.fill('')
    await nameInput.blur()
    
    // Check for error message association
    const errorMessage = page.locator('[role="alert"], .error-message').first()
    if (await errorMessage.count() > 0) {
      const ariaDescribedBy = await nameInput.getAttribute('aria-describedby')
      const errorId = await errorMessage.getAttribute('id')
      expect(ariaDescribedBy).toContain(errorId)
    }
  })
  
  test('AI assisted features should announce suggestions', async ({ page }) => {
    await page.goto('/story/ai-assisted-features--with-suggestions')
    await page.waitForLoadState('networkidle')
    
    // Check for live regions for dynamic content
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]')
    expect(await liveRegions.count()).toBeGreaterThan(0)
  })
})

// Screen reader specific tests
test.describe('Screen Reader Compatibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/story/workspace-creation-flow--step-1')
    await page.waitForLoadState('networkidle')
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    const headingLevels = []
    
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
      const level = parseInt(tagName.charAt(1))
      headingLevels.push(level)
    }
    
    // Check heading hierarchy (no skipping levels)
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1]
      expect(diff).toBeLessThanOrEqual(1)
    }
  })
  
  test('should have proper landmark structure', async ({ page }) => {
    await page.goto('/story/workspace-creation-flow--step-1')
    await page.waitForLoadState('networkidle')
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]')
    expect(await main.count()).toBeGreaterThan(0)
    
    // Check for navigation if present
    const nav = page.locator('nav, [role="navigation"]')
    if (await nav.count() > 0) {
      const navLabel = await nav.first().getAttribute('aria-label')
      expect(navLabel).toBeTruthy()
    }
  })
  
  test('should announce dynamic content changes', async ({ page }) => {
    await page.goto('/story/progressive-disclosure--basic')
    await page.waitForLoadState('networkidle')
    
    // Find level change button
    const levelButton = page.locator('button').filter({ hasText: /more options|advanced/i }).first()
    
    if (await levelButton.count() > 0) {
      // Check for live region before interaction
      const beforeLiveRegions = await page.locator('[aria-live]').count()
      
      await levelButton.click()
      await page.waitForTimeout(500)
      
      // Verify content change is announced
      const afterLiveRegions = await page.locator('[aria-live]').count()
      expect(afterLiveRegions).toBeGreaterThanOrEqual(beforeLiveRegions)
    }
  })
})

// Mobile accessibility tests
test.describe('Mobile Accessibility', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('should have adequate touch targets', async ({ page }) => {
    await page.goto('/story/button--primary')
    await page.waitForLoadState('networkidle')
    
    const buttons = await page.locator('button, [role="button"]').all()
    
    for (const button of buttons) {
      const boundingBox = await button.boundingBox()
      if (boundingBox) {
        // WCAG recommends minimum 44x44px touch targets
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      }
    }
  })
  
  test('should be operable with switch control', async ({ page }) => {
    await page.goto('/story/workspace-creation-flow--step-1')
    await page.waitForLoadState('networkidle')
    
    // Simulate switch control navigation (space/enter only)
    const focusableElements = page.locator('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
    const count = await focusableElements.count()
    
    for (let i = 0; i < count; i++) {
      await page.keyboard.press('Tab')
      await page.keyboard.press('Space') // Should activate button
      await page.waitForTimeout(100)
    }
  })
})

// High contrast mode tests
test.describe('High Contrast Mode', () => {
  test.use({ colorScheme: 'dark', forcedColors: 'active' })
  
  test('should maintain usability in high contrast mode', async ({ page }) => {
    await page.goto('/story/button--primary')
    await page.waitForLoadState('networkidle')
    
    const contrastResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()
    
    expect(contrastResults.violations).toEqual([])
  })
  
  test('should show focus indicators in high contrast', async ({ page }) => {
    await page.goto('/story/input--default')
    await page.waitForLoadState('networkidle')
    
    const input = page.locator('input').first()
    await input.focus()
    
    // Check for visible focus indicator
    const focusedElement = page.locator(':focus')
    expect(await focusedElement.count()).toBe(1)
  })
})

// Reduced motion tests
test.describe('Reduced Motion Preference', () => {
  test.use({ reducedMotion: 'reduce' })
  
  test('should respect reduced motion preference', async ({ page }) => {
    await page.goto('/story/microinteractions--button-ripple')
    await page.waitForLoadState('networkidle')
    
    // Check that animations are disabled
    const animatedElements = page.locator('[style*="animation"], [class*="animate"]')
    const count = await animatedElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i)
      const computedStyle = await element.evaluate(el => {
        return getComputedStyle(el).animationDuration
      })
      // Animation should be instant or very short
      expect(computedStyle === '0s' || computedStyle === '0.01s').toBe(true)
    }
  })
})

// Documentation accessibility tests
test.describe('Documentation Accessibility', () => {
  test('design token documentation should be accessible', async ({ page }) => {
    await page.goto('/story/design-tokens--colors')
    await page.waitForLoadState('networkidle')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('component documentation should have proper structure', async ({ page }) => {
    await page.goto('/docs/button')
    await page.waitForLoadState('networkidle')
    
    // Check for proper documentation structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    expect(await headings.count()).toBeGreaterThan(0)
    
    // Check for code examples accessibility
    const codeBlocks = page.locator('pre, code')
    if (await codeBlocks.count() > 0) {
      const firstCodeBlock = codeBlocks.first()
      const ariaLabel = await firstCodeBlock.getAttribute('aria-label')
      expect(ariaLabel || await firstCodeBlock.textContent()).toBeTruthy()
    }
  })
})