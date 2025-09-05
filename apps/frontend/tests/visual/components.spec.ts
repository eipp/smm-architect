import { test, expect } from '@playwright/test'

/**
 * Visual Regression Tests for Design System Components
 * Tests all component variants across different states and viewports
 */

// Design system component stories to test
const COMPONENT_STORIES = [
  // Core components
  'button--primary',
  'button--secondary', 
  'button--outline',
  'button--ghost',
  'button--danger',
  'button--success',
  'button--warning',
  'button--with-icons',
  'button--loading-states',
  'button--sizes',
  
  // Form components
  'input--default',
  'input--variants',
  'input--sizes',
  'input--with-icons',
  'input--validation-states',
  
  'textarea--default',
  'textarea--variants',
  'textarea--auto-resize',
  
  'search-input--default',
  'search-input--with-suggestions',
  
  // Layout components
  'card--default',
  'card--variants',
  'card--interactive',
  'card--sizes',
  'card--workspace',
  'card--decision',
  'ui-decisioncard--default',
  
  // Specialized components
  'timeline--default',
  'timeline--agent-orchestration',
  'timeline--with-parallel-steps',
  
  'simulation-dashboard--default',
  'simulation-dashboard--with-data',
  
  'workspace-creation-flow--step-1',
  'workspace-creation-flow--step-2', 
  'workspace-creation-flow--step-3',
  'workspace-creation-flow--step-4',
  
  'campaign-approval-flow--default',
  'campaign-approval-flow--with-nodes',
  
  'progressive-disclosure--basic',
  'progressive-disclosure--intermediate',
  'progressive-disclosure--advanced',
  
  'ai-assisted-features--default',
  'ai-assisted-features--with-suggestions',
  
  // Microinteractions
  'microinteractions--button-ripple',
  'microinteractions--success-celebration',
  'microinteractions--loading-states',
  
  'page-transitions--route-change',
  'page-transitions--modal-animation',
]

// Test each component story
COMPONENT_STORIES.forEach(story => {
  test.describe(`Component: ${story}`, () => {
    test('should match visual baseline', async ({ page }) => {
      // Navigate to the specific story
      await page.goto(`/story/${story}`)
      
      // Wait for the component to load
      await page.waitForLoadState('networkidle')
      
      // Wait for any animations to complete
      await page.waitForTimeout(500)
      
      // Take screenshot and compare
      await expect(page).toHaveScreenshot(`${story}.png`)
    })
    
    test('should match baseline in hover state', async ({ page }) => {
      await page.goto(`/story/${story}`)
      await page.waitForLoadState('networkidle')
      
      // Find interactive elements and hover
      const interactiveElements = page.locator('button, [role="button"], .cursor-pointer')
      const count = await interactiveElements.count()
      
      if (count > 0) {
        await interactiveElements.first().hover()
        await page.waitForTimeout(200)
        await expect(page).toHaveScreenshot(`${story}-hover.png`)
      }
    })
    
    test('should match baseline in focus state', async ({ page }) => {
      await page.goto(`/story/${story}`)
      await page.waitForLoadState('networkidle')
      
      // Find focusable elements
      const focusableElements = page.locator('button, input, textarea, [tabindex]:not([tabindex="-1"])')
      const count = await focusableElements.count()
      
      if (count > 0) {
        await focusableElements.first().focus()
        await page.waitForTimeout(200)
        await expect(page).toHaveScreenshot(`${story}-focus.png`)
      }
    })
  })
})

// Comprehensive page tests
test.describe('Design System Pages', () => {
  test('Storybook homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('storybook-homepage.png')
  })
  
  test('Design tokens documentation', async ({ page }) => {
    await page.goto('/story/design-tokens--colors')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('design-tokens-colors.png')
  })
  
  test('Typography scale', async ({ page }) => {
    await page.goto('/story/design-tokens--typography')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('design-tokens-typography.png')
  })
  
  test('Spacing system', async ({ page }) => {
    await page.goto('/story/design-tokens--spacing')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('design-tokens-spacing.png')
  })
})

// Accessibility-focused visual tests
test.describe('Accessibility Visual Tests', () => {
  test('High contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' })
    
    await page.goto('/story/button--primary')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('button-high-contrast.png')
  })
  
  test('Reduced motion preference', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/story/microinteractions--button-ripple')
    await page.waitForLoadState('networkidle')
    
    // Trigger animation
    await page.click('button')
    await page.waitForTimeout(500)
    
    await expect(page).toHaveScreenshot('button-reduced-motion.png')
  })
  
  test('Focus indicators', async ({ page }) => {
    await page.goto('/story/button--primary')
    await page.waitForLoadState('networkidle')
    
    // Tab through focusable elements
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    
    await expect(page).toHaveScreenshot('button-focus-indicator.png')
  })
})

// Theme and variant tests
test.describe('Theme Variations', () => {
  const themes = ['light', 'dark']
  const criticalComponents = [
    'button--primary',
    'card--default',
    'input--default',
    'workspace-creation-flow--step-1'
  ]
  
  themes.forEach(theme => {
    criticalComponents.forEach(component => {
      test(`${component} in ${theme} theme`, async ({ page }) => {
        // Set theme
        if (theme === 'dark') {
          await page.emulateMedia({ colorScheme: 'dark' })
        }
        
        await page.goto(`/story/${component}`)
        await page.waitForLoadState('networkidle')
        
        // Add theme class to body if needed
        if (theme === 'dark') {
          await page.addStyleTag({
            content: 'body { background: #1a1a1a; }'
          })
        }
        
        await expect(page).toHaveScreenshot(`${component}-${theme}.png`)
      })
    })
  })
})

// Mobile-specific tests
test.describe('Mobile Interactions', () => {
  test.use({ viewport: { width: 375, height: 667 } })
  
  test('Touch interactions', async ({ page }) => {
    await page.goto('/story/button--primary')
    await page.waitForLoadState('networkidle')
    
    // Simulate touch
    await page.touchscreen.tap(100, 100)
    await page.waitForTimeout(300)
    
    await expect(page).toHaveScreenshot('button-touch-interaction-mobile.png')
  })
  
  test('Mobile workspace creation flow', async ({ page }) => {
    await page.goto('/story/workspace-creation-flow--step-1')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('workspace-flow-mobile.png')
  })
})

// Performance-related visual tests
test.describe('Performance Visual Tests', () => {
  test('Loading states', async ({ page }) => {
    await page.goto('/story/button--loading-states')
    await page.waitForLoadState('networkidle')
    
    // Trigger loading state
    await page.click('[data-testid="loading-button"]')
    await page.waitForTimeout(100) // Capture during loading
    
    await expect(page).toHaveScreenshot('button-loading-state.png')
  })
  
  test('Skeleton loading screens', async ({ page }) => {
    await page.goto('/story/skeleton--dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('skeleton-dashboard.png')
  })
  
  test('Progressive disclosure states', async ({ page }) => {
    await page.goto('/story/progressive-disclosure--basic')
    await page.waitForLoadState('networkidle')
    
    // Test each disclosure level
    const levels = ['basic', 'intermediate', 'advanced']
    
    for (const level of levels) {
      await page.click(`[data-level="${level}"]`)
      await page.waitForTimeout(300)
      await expect(page).toHaveScreenshot(`progressive-disclosure-${level}.png`)
    }
  })
})

// Error state visual tests
test.describe('Error State Visual Tests', () => {
  test('Form validation errors', async ({ page }) => {
    await page.goto('/story/input--validation-states')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('input-validation-errors.png')
  })
  
  test('Empty states', async ({ page }) => {
    await page.goto('/story/empty-state--no-data')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('empty-state-no-data.png')
  })
})