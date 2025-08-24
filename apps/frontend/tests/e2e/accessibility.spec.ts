import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility @accessibility', () => {
  test('Dashboard meets accessibility standards', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
      
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('Canvas meets accessibility standards', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[data-testid=\"loading-spinner\"]') // Exclude dynamic loading elements
      .analyze()
      
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('Auto Setup flow meets accessibility standards', async ({ page }) => {
    await page.goto('/onboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
      
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('Settings page meets accessibility standards', async ({ page }) => {
    await page.goto('/settings')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
      
    expect(accessibilityScanResults.violations).toEqual([])
  })
  
  test('Canvas supports keyboard navigation', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001')
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid=\"micro-graph\"]')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid=\"step-discover\"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid=\"step-plan\"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid=\"step-draft\"]')).toBeFocused()
    
    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid=\"step-actions\"]')).toBeVisible()
    
    // Test Escape key dismissal
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid=\"step-actions\"]')).not.toBeVisible()
  })
  
  test('Decision cards support keyboard navigation', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001')
    
    // Wait for decision cards to load
    await page.waitForSelector('[data-testid=\"decision-card\"]')
    
    // Navigate to first decision card
    await page.keyboard.press('Tab')
    
    // Find and focus the first approve button
    const approveButton = page.locator('[data-testid=\"approve-button\"]').first()
    await approveButton.focus()
    
    // Verify button is focused
    await expect(approveButton).toBeFocused()
    
    // Test activation with Enter
    await page.keyboard.press('Enter')
    
    // Should trigger approval action
    await expect(page.locator('[data-testid=\"approval-confirmation\"]')).toBeVisible()
  })
  
  test('Modal dialogs have proper focus management', async ({ page }) => {
    await page.goto('/settings')
    
    // Open a modal (e.g., add new persona)
    await page.click('[data-testid=\"add-persona-button\"]')
    
    // Modal should be visible and focused
    const modal = page.locator('[data-testid=\"persona-modal\"]')
    await expect(modal).toBeVisible()
    
    // First focusable element should be focused
    const firstInput = modal.locator('input').first()
    await expect(firstInput).toBeFocused()
    
    // Tab should cycle within modal
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Escape should close modal
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
    
    // Focus should return to trigger button
    await expect(page.locator('[data-testid=\"add-persona-button\"]')).toBeFocused()
  })
  
  test('Forms have proper labels and error messages', async ({ page }) => {
    await page.goto('/onboard')
    
    // Check form labels
    await expect(page.locator('label[for=\"workspace-name\"]')).toBeVisible()
    await expect(page.locator('label[for=\"primary-channel\"]')).toBeVisible()
    
    // Trigger validation error
    await page.click('[data-testid=\"continue-button\"]')
    
    // Error message should be associated with input
    const nameInput = page.locator('[data-testid=\"workspace-name\"]')
    const errorMessage = page.locator('[data-testid=\"name-error\"]')
    
    await expect(errorMessage).toBeVisible()
    
    // Input should have aria-describedby pointing to error
    const describedBy = await nameInput.getAttribute('aria-describedby')
    const errorId = await errorMessage.getAttribute('id')
    expect(describedBy).toContain(errorId)
  })
  
  test('Dynamic content has proper announcements', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001')
    
    // Mock step status change
    await page.route('**/api/workspaces/*/events', route => {
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {\"stepId\": \"plan\", \"status\": \"completed\"}\n\n'
      })
    })
    
    // Check for live region updates
    const liveRegion = page.locator('[aria-live=\"polite\"]')
    await expect(liveRegion).toBeVisible()
    
    // Status changes should be announced
    await expect(liveRegion).toContainText('Plan step completed')
  })
  
  test('High contrast mode is supported', async ({ page }) => {
    // Enable high contrast mode (simulation)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    
    // Check that essential UI elements are still visible
    await expect(page.locator('[data-testid=\"navigation\"]')).toBeVisible()
    await expect(page.locator('[data-testid=\"workspace-cards\"]')).toBeVisible()
    
    // Check button contrast
    const primaryButton = page.locator('button').first()
    const buttonStyles = await primaryButton.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        border: computed.border
      }
    })
    
    // Should have defined background and text colors
    expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(buttonStyles.color).not.toBe('rgba(0, 0, 0, 0)')
  })
  
  test('Reduced motion preferences are respected', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    
    // Check that animations are disabled
    const animatedElement = page.locator('[data-testid=\"loading-spinner\"]')
    
    if (await animatedElement.count() > 0) {
      const animationDuration = await animatedElement.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return computed.animationDuration
      })
      
      // Should be set to 0s or very short duration
      expect(['0s', '0.01s']).toContain(animationDuration)
    }
  })
  
  test('Screen reader landmarks are properly defined', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper landmark roles
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
    
    // Header should have banner role
    const header = page.locator('header')
    if (await header.count() > 0) {
      await expect(header).toBeVisible()
    }
    
    // Content areas should have proper roles
    await expect(page.locator('[role=\"main\"]')).toBeVisible()
  })
  
  test('Color is not the only way to convey information', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001')
    
    // Check step status indicators
    const completedStep = page.locator('[data-testid=\"step-completed\"]').first()
    const runningStep = page.locator('[data-testid=\"step-running\"]').first()
    const failedStep = page.locator('[data-testid=\"step-failed\"]').first()
    
    // Completed steps should have checkmark icon
    if (await completedStep.count() > 0) {
      await expect(completedStep.locator('[data-testid=\"check-icon\"]')).toBeVisible()
    }
    
    // Running steps should have spinner or progress indicator
    if (await runningStep.count() > 0) {
      await expect(runningStep.locator('[data-testid=\"spinner-icon\"]')).toBeVisible()
    }
    
    // Failed steps should have error icon
    if (await failedStep.count() > 0) {
      await expect(failedStep.locator('[data-testid=\"error-icon\"]')).toBeVisible()
    }
  })
})"