import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')
  
  // Start browser for setup tasks
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'
    console.log(`🌐 Checking if app is ready at ${baseURL}`)
    
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    
    // Perform any global authentication or setup here
    // For example, create test users, set up test data, etc.
    
    console.log('✅ Application is ready for testing')
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error)
    throw error
  } finally {
    await browser.close()
  }
  
  console.log('🎯 Playwright global setup completed')
}

export default globalSetup