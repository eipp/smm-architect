import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load and display the homepage correctly', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/SMM Architect/)
    
    // Check for main navigation
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    
    // Check for main content area
    const main = page.locator('main')
    await expect(main).toBeVisible()
  })

  test('should have no accessibility violations', async ({ page }) => {
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check that content is still visible and properly arranged
    const main = page.locator('main')
    await expect(main).toBeVisible()
    
    // Check that navigation adapts to mobile
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    // Check that focus is visible on interactive elements
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test that all interactive elements are reachable by keyboard
    let tabCount = 0
    const maxTabs = 20 // Prevent infinite loop
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab')
      tabCount++
      
      const currentFocused = page.locator(':focus')
      if (await currentFocused.count() === 0) {
        break
      }
    }
    
    expect(tabCount).toBeGreaterThan(0)
  })

  test('should load critical resources successfully', async ({ page }) => {
    const responses: any[] = []
    
    // Collect all network responses
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      })
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Check that no critical resources failed to load
    const failedResponses = responses.filter(response => 
      response.status >= 400 && 
      (response.contentType?.includes('javascript') || 
       response.contentType?.includes('css') ||
       response.url.includes('.js') ||
       response.url.includes('.css'))
    )
    
    expect(failedResponses).toHaveLength(0)
  })

  test('should have reasonable performance metrics', async ({ page }) => {
    // Navigate and wait for load
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return {
        // Core Web Vitals approximation
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        // First paint (if available)
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      }
    })
    
    // Assert reasonable load times (adjust thresholds as needed)
    expect(metrics.loadTime).toBeLessThan(5000) // 5 seconds
    expect(metrics.domContentLoaded).toBeLessThan(3000) // 3 seconds
    
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(2000) // 2 seconds
    }
  })

  test('should handle errors gracefully', async ({ page }) => {
    const errors: any[] = []
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message)
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Filter out known acceptable errors (add patterns as needed)
    const significantErrors = errors.filter(error => 
      !error.includes('404') && // Allow 404s for optional resources
      !error.includes('favicon') && // Allow favicon errors
      !error.toLowerCase().includes('warning') // Filter out warnings
    )
    
    expect(significantErrors).toHaveLength(0)
  })
})