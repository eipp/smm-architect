import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Cleanup test environment
  console.log('Cleaning up test environment...');
  
  // You could cleanup test data here
  // or stop mock servers
  
  console.log('Test environment cleanup complete');
}

export default globalTeardown;