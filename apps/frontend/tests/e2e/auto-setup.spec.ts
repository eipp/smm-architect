import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Auto Setup Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user-test-001',
          email: 'test@example.com',
          name: 'Test User',
          roles: [
            {
              id: 'role-admin',
              name: 'Administrator',
              permissions: [
                { resource: 'workspace', action: 'create' },
                { resource: 'workspace', action: 'read', scope: 'all' }
              ]
            }
          ],
          tenantId: 'tenant-test-001'
        })
      });
    });
  });

  test('Auto Setup flow completes successfully', async ({ page }) => {
    await page.goto('/onboard');
    
    // Step 1: Basic workspace info
    await expect(page.getByRole('heading', { name: 'Create New Workspace' })).toBeVisible();
    
    await page.fill('[data-testid="workspace-name"]', 'Test Campaign');
    await page.selectOption('[data-testid="primary-channel"]', 'linkedin');
    await page.click('[data-testid="continue-button"]');
    
    // Step 2: OAuth connector setup
    await expect(page.getByText('Connect Your Accounts')).toBeVisible();
    
    // Mock OAuth flow completion
    await page.route('**/api/connectors/linkedin/callback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          status: 'connected', 
          accountId: 'test-account',
          accountName: 'Test LinkedIn Account'
        })
      });
    });
    
    await page.click('[data-testid="connect-linkedin"]');
    
    // Wait for connection success
    await expect(page.getByText('Connected')).toBeVisible();
    await page.click('[data-testid="continue-button"]');
    
    // Step 3: Review shadow run results
    await expect(page.getByText('Workspace Preview')).toBeVisible();
    await page.waitForSelector('[data-testid="readiness-score"]');
    
    const readinessScore = await page.textContent('[data-testid="readiness-score"]');
    expect(readinessScore).toContain('%');
    
    await page.click('[data-testid="complete-setup"]');
    
    // Verify navigation to canvas
    await expect(page).toHaveURL(/\/canvas/);
    await expect(page.getByTestId('micro-graph')).toBeVisible();
  });

  test('handles OAuth connection errors gracefully', async ({ page }) => {
    await page.goto('/onboard');
    
    // Fill basic info
    await page.fill('[data-testid="workspace-name"]', 'Test Campaign');
    await page.selectOption('[data-testid="primary-channel"]', 'linkedin');
    await page.click('[data-testid="continue-button"]');
    
    // Mock OAuth error
    await page.route('**/api/connectors/linkedin/callback', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'OAuth connection failed',
          message: 'Invalid credentials or permissions denied'
        })
      });
    });
    
    await page.click('[data-testid="connect-linkedin"]');
    
    // Should show error message
    await expect(page.getByText('Connection failed')).toBeVisible();
    await expect(page.getByText('Try again')).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/onboard');
    
    // Try to continue without filling required fields
    await page.click('[data-testid="continue-button"]');
    
    // Should show validation errors
    await expect(page.getByText('Workspace name is required')).toBeVisible();
    await expect(page.getByText('Please select a primary channel')).toBeVisible();
  });

  test('supports keyboard navigation', async ({ page }) => {
    await page.goto('/onboard');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="workspace-name"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="primary-channel"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="continue-button"]')).toBeFocused();
    
    // Should be able to submit with Enter
    await page.fill('[data-testid="workspace-name"]', 'Test Campaign');
    await page.selectOption('[data-testid="primary-channel"]', 'linkedin');
    await page.keyboard.press('Enter');
    
    // Should proceed to next step
    await expect(page.getByText('Connect Your Accounts')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('Auto Setup pages meet accessibility standards', async ({ page }) => {
    await page.goto('/onboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
      
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Auto Setup has proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/onboard');
    
    // Check form has proper labels
    await expect(page.getByRole('textbox', { name: /workspace name/i })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /primary channel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    
    // Check heading hierarchy
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Auto Setup supports screen reader navigation', async ({ page }) => {
    await page.goto('/onboard');
    
    // Check landmark regions
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check form structure
    const form = page.getByRole('form');
    await expect(form).toBeVisible();
    
    // All form inputs should have associated labels
    const inputs = await page.getByRole('textbox').all();
    for (const input of inputs) {
      const labelText = await input.getAttribute('aria-label') || 
                       await input.getAttribute('aria-labelledby');
      expect(labelText).toBeTruthy();
    }
  });
});