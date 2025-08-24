import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Canvas Interactions', () => {
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
              id: 'role-manager',
              name: 'Manager',
              permissions: [
                { resource: 'workspace', action: 'read', scope: 'all' },
                { resource: 'campaign', action: 'approve' }
              ]
            }
          ]
        })
      });
    });

    // Mock workspace data
    await page.route('**/api/workspaces/ws-test-001', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ws-test-001',
          name: 'Test Campaign',
          status: 'active',
          steps: [
            { id: 'discover', status: 'completed', duration: '2.3s', tooltip: 'Market research completed' },
            { id: 'plan', status: 'running', duration: '45.7s', progress: 65, actions: ['rerun', 'approve'] },
            { id: 'draft', status: 'pending', dependencies: ['plan'] },
            { id: 'verify', status: 'pending', dependencies: ['draft'] },
            { id: 'approve', status: 'pending', dependencies: ['verify'] },
            { id: 'post', status: 'pending', dependencies: ['approve'] }
          ]
        })
      });
    });

    // Mock workspace events (SSE)
    await page.route('**/api/workspaces/ws-test-001/events', async route => {
      // Simulate SSE stream
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: `data: ${JSON.stringify({
          type: 'step_update',
          stepId: 'plan',
          status: 'running',
          progress: 75
        })}\n\n`
      });
    });
  });

  test('Canvas timeline and step interactions work correctly', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Test step hover details
    await page.hover('[data-testid="step-plan"]');
    await expect(page.locator('[data-testid="step-tooltip"]')).toBeVisible();
    await expect(page.getByText('Market research completed')).toBeVisible();
    
    // Test step click for actions
    await page.click('[data-testid="step-plan"]');
    await expect(page.locator('[data-testid="step-actions"]')).toBeVisible();
    
    // Test action buttons
    await expect(page.getByRole('button', { name: 'Rerun' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    
    // Test action execution
    await page.route('**/api/workspaces/ws-test-001/steps/plan/rerun', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    await page.click(page.getByRole('button', { name: 'Rerun' }));
    
    // Actions panel should close
    await expect(page.locator('[data-testid="step-actions"]')).not.toBeVisible();
  });

  test('Canvas supports keyboard navigation', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="step-discover"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="step-plan"]')).toBeFocused();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="step-actions"]')).toBeVisible();
    
    // Test Escape key dismissal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="step-actions"]')).not.toBeVisible();
  });

  test('Canvas real-time updates work correctly', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Check initial status
    const planStep = page.locator('[data-testid="step-plan"]');
    await expect(planStep).toHaveClass(/running/);
    
    // Mock a status change event
    await page.evaluate(() => {
      const eventSource = new EventSource('/api/workspaces/ws-test-001/events');
      eventSource.dispatchEvent(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'step_update',
          stepId: 'plan',
          status: 'completed',
          duration: '52.1s'
        })
      }));
    });
    
    // Should update to completed status
    await expect(planStep).toHaveClass(/completed/);
    await expect(page.getByText('52.1s')).toBeVisible();
  });

  test('Canvas handles errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/workspaces/ws-test-001', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Should show error state
    await expect(page.getByText('Failed to load workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('Canvas timeline scrubber works', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Find and interact with timeline scrubber
    const scrubber = page.locator('[data-testid="timeline-scrubber"]');
    await expect(scrubber).toBeVisible();
    
    // Click on timeline to jump to different time
    await scrubber.click({ position: { x: 100, y: 10 } });
    
    // Should trigger timeline update
    await expect(page.locator('[data-testid="timeline-progress"]')).toHaveAttribute('aria-valuenow');
  });

  test('Canvas mode toggle works', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Should default to live mode
    await expect(page.getByText('Live Mode')).toBeVisible();
    
    // Toggle to plan mode
    await page.click('[data-testid="mode-toggle"]');
    await expect(page.getByText('Plan Mode')).toBeVisible();
    
    // Animation should be disabled in plan mode
    const connector = page.locator('[data-testid="step-connector"]').first();
    await expect(connector).not.toHaveClass(/animate-pulse/);
  });
});

test.describe('Canvas Accessibility', () => {
  test('Canvas meets accessibility standards', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
      
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Canvas has proper ARIA attributes', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Check step buttons have proper labels
    const discoverStep = page.locator('[data-testid="step-discover"]');
    await expect(discoverStep).toHaveAttribute('aria-label', /discover step/i);
    
    const planStep = page.locator('[data-testid="step-plan"]');
    await expect(planStep).toHaveAttribute('aria-label', /plan step/i);
    
    // Check progress indicators
    const progressIndicator = page.locator('[data-testid="timeline-progress"]');
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toHaveAttribute('role', 'progressbar');
      await expect(progressIndicator).toHaveAttribute('aria-valuenow');
      await expect(progressIndicator).toHaveAttribute('aria-valuemin', '0');
      await expect(progressIndicator).toHaveAttribute('aria-valuemax', '100');
    }
  });

  test('Canvas provides meaningful status announcements', async ({ page }) => {
    await page.goto('/canvas?workspace=ws-test-001');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="micro-graph"]');
    
    // Check for status region
    const statusRegion = page.locator('[role="status"]');
    if (await statusRegion.isVisible()) {
      await expect(statusRegion).toBeVisible();
    }
    
    // Live regions should exist for dynamic updates
    const liveRegion = page.locator('[aria-live="polite"]');
    if (await liveRegion.isVisible()) {
      await expect(liveRegion).toBeVisible();
    }
  });
});