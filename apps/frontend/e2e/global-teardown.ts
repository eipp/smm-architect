import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...')
  
  // Perform any global cleanup here
  // For example, clean up test data, close services, etc.
  
  console.log('✅ Playwright global teardown completed')
}

export default globalTeardown