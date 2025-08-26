module.exports = async () => {
  // Set timezone to UTC for consistent date testing
  process.env.TZ = 'UTC'
  
  // Set Node environment
  process.env.NODE_ENV = 'test'
  
  // Mock environment variables for testing
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
  process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn'
  
  // Disable console warnings for tests
  process.env.SUPPRESS_NO_CONFIG_WARNING = 'true'
  
  console.log('🧪 Jest global setup completed')
}