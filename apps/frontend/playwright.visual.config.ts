import { defineConfig, devices } from '@playwright/test'

/**
 * Visual Regression Testing Configuration
 * Tests design system components across multiple browsers and viewports
 */
export default defineConfig({
  testDir: './tests/visual',
  
  // Fail fast on CI
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'test-results/visual-report' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['github']
  ],
  
  // Global test configuration
  use: {
    // Base URL for testing
    baseURL: process.env.BASE_URL || 'http://localhost:6006', // Storybook URL
    
    // Screenshots for all tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Visual comparison settings
    visualComparisons: {
      threshold: 0.2, // 20% threshold for visual differences
      mode: 'strict', // Strict mode for pixel-perfect comparisons
    },
  },
  
  // Test timeout
  timeout: 30000,
  expect: {
    // Visual comparison timeout
    timeout: 10000,
    // Screenshots
    toHaveScreenshot: {
      threshold: 0.2,
      mode: 'strict',
      animations: 'disabled', // Disable animations for consistent screenshots
    },
    toMatchSnapshot: {
      threshold: 0.2,
      mode: 'strict',
    }
  },
  
  // Projects for different browsers and viewports
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },
    
    // Tablet viewports
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 }
      },
    },
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro landscape'],
        viewport: { width: 1366, height: 1024 }
      },
    },
    
    // Mobile viewports
    {
      name: 'mobile-large',
      use: {
        ...devices['iPhone 12 Pro'],
        viewport: { width: 390, height: 844 }
      },
    },
    {
      name: 'mobile-medium',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 }
      },
    },
    {
      name: 'mobile-small',
      use: {
        ...devices['Galaxy S8'],
        viewport: { width: 360, height: 740 }
      },
    },
    
    // Dark mode testing
    {
      name: 'dark-mode-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'User-Agent': 'Playwright Dark Mode Test'
        }
      },
    },
    
    // High DPI testing
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2
      },
    },
    
    // RTL testing
    {
      name: 'rtl-testing',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        locale: 'ar-SA', // Arabic locale for RTL testing
        extraHTTPHeaders: {
          'Accept-Language': 'ar'
        }
      },
    }
  ],
  
  // Web server configuration for Storybook
  webServer: {
    command: 'npm run storybook',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for Storybook to start
  },
  
  // Output directory
  outputDir: 'test-results/visual',
  
  // Test match patterns
  testMatch: [
    '**/visual/**/*.spec.ts',
    '**/visual/**/*.test.ts'
  ]
})