# Frontend Monitoring System

This comprehensive monitoring system provides Real User Monitoring (RUM), error tracking, performance metrics, and analytics for the SMM Architect frontend application.

## Features

### 🚀 Performance Monitoring
- **Core Web Vitals**: FCP, LCP, FID, CLS, INP, TTFB
- **Navigation Timing**: Page load times, DOM events
- **Custom Metrics**: Component render times, API call durations
- **Long Task Detection**: Identifies performance bottlenecks
- **Memory Usage Tracking**: JavaScript heap monitoring

### 🐛 Error Tracking
- **JavaScript Errors**: Automatic capture with stack traces
- **Promise Rejections**: Unhandled rejection tracking
- **Network Errors**: Failed API calls and resource loading
- **Console Errors**: Intercepted console.error calls
- **Breadcrumbs**: User interaction history leading to errors
- **Context Preservation**: URL, user agent, session data

### 📊 Analytics & User Tracking
- **Session Management**: User sessions with duration tracking
- **Page Views**: Route changes and navigation tracking
- **User Interactions**: Clicks, form submissions, keyboard events
- **Feature Usage**: Track specific feature adoption
- **Business Metrics**: Conversions, revenue, goals
- **A/B Testing**: Experiment exposure and goal tracking

### 🎯 Real-Time Monitoring
- **Live Dashboard**: Development-time monitoring interface
- **Performance Alerts**: Threshold-based notifications
- **Automatic Reporting**: Periodic data transmission
- **Offline Support**: Queue data when offline
- **Privacy Controls**: Respect Do Not Track settings

## Architecture

```
src/
├── types/monitoring.ts              # TypeScript interfaces
├── lib/monitoring/
│   ├── performance.ts               # Core Web Vitals & performance
│   ├── error-tracker.ts             # Error capture & reporting
│   ├── analytics.ts                 # User behavior tracking
│   └── monitoring-service.ts        # Main service integration
├── hooks/use-monitoring.ts          # React hooks
└── components/monitoring/
    ├── monitoring-provider.tsx      # Context provider
    └── monitoring-dashboard.tsx     # Development dashboard
```

## Quick Start

### 1. Basic Setup

```tsx
// app/layout.tsx
import { MonitoringProvider } from '@/components/monitoring/monitoring-provider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <MonitoringProvider
          config={{
            apiEndpoint: process.env.NEXT_PUBLIC_MONITORING_API,
            apiKey: process.env.NEXT_PUBLIC_MONITORING_KEY,
            enablePerformanceMonitoring: true,
            enableErrorTracking: true,
            enableSessionTracking: true
          }}
        >
          {children}
        </MonitoringProvider>
      </body>
    </html>
  )
}
```

### 2. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_MONITORING_API=https://api.monitoring.example.com
NEXT_PUBLIC_MONITORING_API_KEY=your_api_key_here
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
NEXT_PUBLIC_ENABLE_ERROR_TRACKING=true
NEXT_PUBLIC_ENABLE_SESSION_TRACKING=true
NEXT_PUBLIC_DEBUG_MONITORING=true
```

### 3. Basic Usage in Components

```tsx
import { useMonitoring, usePerformanceTracking, useInteractionTracking } from '@/hooks/use-monitoring'

function MyComponent() {
  const { trackInteraction } = usePerformanceTracking('MyComponent')
  const { trackClick } = useInteractionTracking()
  
  const handleButtonClick = () => {
    trackClick('submit_button', { section: 'header' })
    trackInteraction('form_submit')
    // Your business logic
  }
  
  return (
    <button onClick={handleButtonClick}>
      Submit
    </button>
  )
}
```

## Advanced Usage

### Custom Performance Tracking

```tsx
import { measureTimeAsync, trackPerformance } from '@/lib/monitoring/monitoring-service'

// Measure async operations
const result = await measureTimeAsync('api_call_users', async () => {
  return await fetch('/api/users')
})

// Manual performance tracking
const startTime = performance.now()
// ... your operation
trackPerformance('custom_operation', performance.now() - startTime)
```

### Error Tracking

```tsx
import { useErrorTracking } from '@/hooks/use-monitoring'

function MyComponent() {
  const { captureError, wrapAsync } = useErrorTracking()
  
  const handleAsyncOperation = wrapAsync(async () => {
    // This will automatically capture any errors
    return await riskyOperation()
  }, 'async_operation_context')
  
  const handleManualError = () => {
    try {
      riskyOperation()
    } catch (error) {
      captureError(error, 'manual_error_context', {
        userId: user.id,
        customData: 'additional_info'
      })
    }
  }
}
```

### Business Metrics

```tsx
import { useBusinessTracking } from '@/hooks/use-monitoring'

function CheckoutComponent() {
  const { trackConversion, trackRevenue } = useBusinessTracking()
  
  const handlePurchase = (amount: number) => {
    trackConversion('purchase_completed', amount, 'USD', {
      productId: product.id,
      category: product.category
    })
    
    trackRevenue(amount, 'USD', 'direct_sale', {
      paymentMethod: 'credit_card'
    })
  }
}
```

### A/B Testing

```tsx
import { useExperimentTracking } from '@/hooks/use-monitoring'

function FeatureComponent() {
  const { trackExperiment, trackExperimentGoal } = useExperimentTracking()
  
  useEffect(() => {
    // Track experiment exposure
    trackExperiment('button_color_test', 'red_variant')
  }, [])
  
  const handleGoalAchievement = () => {
    trackExperimentGoal('button_color_test', 'red_variant', 'click_through', 1)
  }
}
```

## Configuration

### Monitoring Config

```typescript
interface MonitoringConfig {
  // API Configuration
  apiEndpoint: string
  apiKey: string
  
  // Sampling (0-1)
  performanceSampleRate: number
  errorSampleRate: number
  sessionSampleRate: number
  
  // Features
  enablePerformanceMonitoring: boolean
  enableErrorTracking: boolean
  enableSessionTracking: boolean
  enableUserInteractionTracking: boolean
  
  // Performance Thresholds (ms)
  performanceThresholds: {
    fcp: number    // First Contentful Paint
    lcp: number    // Largest Contentful Paint
    fid: number    // First Input Delay
    cls: number    // Cumulative Layout Shift
    ttfb: number   // Time to First Byte
  }
  
  // Privacy
  enableUserTracking: boolean
  anonymizeIPs: boolean
  respectDoNotTrack: boolean
  
  // Development
  enableInDevelopment: boolean
  debugMode: boolean
}
```

### Default Thresholds

- **FCP**: 2000ms (good), 4000ms (poor)
- **LCP**: 2500ms (good), 4000ms (poor)
- **FID**: 100ms (good), 300ms (poor)
- **CLS**: 0.1 (good), 0.25 (poor)
- **TTFB**: 800ms (good), 1800ms (poor)

## Development Dashboard

The monitoring dashboard is automatically enabled in development mode and provides:

- **Real-time Metrics**: Live performance data
- **Error Console**: Recent errors with stack traces
- **Session Information**: Current user session details
- **Analytics Overview**: Event tracking summary
- **Performance Graphs**: Visual representation of Core Web Vitals

### Access Dashboard

- Automatically appears in development mode
- Click the floating "Monitoring" button to open
- Navigate between Overview, Performance, Errors, and Analytics tabs

## Data Collection

### Performance Data

```typescript
interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number     // First Contentful Paint
  lcp?: number     // Largest Contentful Paint
  fid?: number     // First Input Delay
  cls?: number     // Cumulative Layout Shift
  inp?: number     // Interaction to Next Paint
  ttfb?: number    // Time to First Byte
  
  // Navigation Timing
  navigationStart?: number
  domContentLoaded?: number
  loadComplete?: number
  
  // Custom Metrics
  timeToInteractive?: number
  renderTime?: number
  hydrationTime?: number
}
```

### Error Data

```typescript
interface ErrorReport {
  id: string
  message: string
  stack?: string
  name: string
  filename?: string
  lineNumber?: number
  columnNumber?: number
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId: string
  breadcrumbs?: Breadcrumb[]
  metadata?: Record<string, any>
  level: 'error' | 'warning' | 'info' | 'debug'
  userAffected: boolean
  criticalPath: boolean
}
```

### Analytics Events

```typescript
interface AnalyticsEvent {
  id: string
  name: string
  category: string
  action: string
  label?: string
  value?: number
  url: string
  timestamp: number
  userId?: string
  sessionId: string
  properties?: Record<string, any>
}
```

## Privacy & GDPR Compliance

### Privacy Controls

- **Respect Do Not Track**: Automatically disabled when DNT=1
- **IP Anonymization**: Optional IP address anonymization
- **User Consent**: Integration with consent management
- **Data Minimization**: Configurable data collection scope
- **Retention Policies**: Automatic data expiration

### Opt-out Support

```tsx
// Allow users to opt out
const monitoring = useMonitoring()

const handleOptOut = () => {
  monitoring.updateConfig({
    enableUserTracking: false,
    enableSessionTracking: false
  })
}
```

## Performance Considerations

### Sampling

Use sampling rates to reduce data volume:

```typescript
{
  performanceSampleRate: 0.1,  // 10% of page loads
  errorSampleRate: 1.0,        // All errors
  sessionSampleRate: 0.05      // 5% of sessions
}
```

### Batching

- Events are automatically batched and sent every 30 seconds
- Critical events (errors, conversions) are sent immediately
- `sendBeacon` is used for reliable data transmission on page unload

### Bundle Size Impact

- Core monitoring: ~15KB gzipped
- Optional features can be disabled to reduce size
- Dynamic imports for non-critical features

## Integration Examples

### Next.js Integration

```tsx
// pages/_app.tsx or app/layout.tsx
import { MonitoringProvider } from '@/components/monitoring/monitoring-provider'

export default function App({ children }) {
  return (
    <MonitoringProvider
      config={{
        apiEndpoint: process.env.NEXT_PUBLIC_MONITORING_API,
        debugMode: process.env.NODE_ENV === 'development'
      }}
      enableDashboard={process.env.NODE_ENV === 'development'}
      enableErrorBoundary={true}
    >
      {children}
    </MonitoringProvider>
  )
}
```

### API Route Monitoring

```typescript
// pages/api/users.ts or app/api/users/route.ts
import { measureTimeAsync } from '@/lib/monitoring/monitoring-service'

export async function GET() {
  return measureTimeAsync('api_users_get', async () => {
    // Your API logic
    return new Response(JSON.stringify(users))
  })
}
```

## Best Practices

### 1. Component Tracking

```tsx
// Use the performance tracking hook
function ExpensiveComponent() {
  const { measureOperation } = usePerformanceTracking('ExpensiveComponent')
  
  const processData = (data) => {
    return measureOperation('process_data', () => {
      // Expensive operation
      return transformData(data)
    })
  }
}
```

### 2. Error Context

```tsx
// Provide rich error context
const { captureError } = useErrorTracking()

try {
  await apiCall()
} catch (error) {
  captureError(error, 'api_call_failed', {
    endpoint: '/api/users',
    userId: user.id,
    retryCount: attempts,
    requestId: requestId
  })
}
```

### 3. Business Metrics

```tsx
// Track business-relevant events
const { trackConversion, trackFeatureUsage } = useBusinessTracking()

const handleSignup = async (userData) => {
  await createUser(userData)
  
  trackConversion('user_signup', undefined, undefined, {
    source: 'organic',
    plan: userData.plan
  })
  
  trackFeatureUsage('user_registration', 'complete')
}
```

### 4. Performance Budgets

Set performance budgets and get alerts:

```typescript
{
  performanceThresholds: {
    fcp: 1500,    // Strict FCP budget
    lcp: 2500,    // Strict LCP budget
    fid: 100,     // Strict FID budget
    cls: 0.1,     // Strict CLS budget
    ttfb: 800     // Strict TTFB budget
  }
}
```

## Troubleshooting

### Common Issues

1. **Monitoring not initializing**
   - Check environment variables
   - Verify API endpoint accessibility
   - Enable debug mode for detailed logs

2. **Missing performance data**
   - Ensure performance observers are supported
   - Check sampling rates
   - Verify feature flags

3. **High data volume**
   - Reduce sampling rates
   - Filter out noisy events
   - Implement data retention policies

### Debug Mode

Enable debug mode for detailed logging:

```typescript
{
  debugMode: true,
  enableInDevelopment: true
}
```

This will log all monitoring activities to the browser console.

## API Endpoints

The monitoring system expects these API endpoints:

- `POST /api/monitoring/performance` - Performance metrics
- `POST /api/monitoring/errors` - Error reports
- `POST /api/monitoring/analytics` - Analytics events
- `POST /api/monitoring/sessions` - Session data

### Example Backend Integration

```typescript
// Express.js example
app.post('/api/monitoring/performance', (req, res) => {
  const metrics = req.body
  
  // Process performance metrics
  await savePerformanceMetrics(metrics)
  
  res.status(200).json({ success: true })
})
```

## Contributing

When adding new monitoring features:

1. Update TypeScript interfaces in `types/monitoring.ts`
2. Add appropriate hooks in `hooks/use-monitoring.ts`
3. Update the dashboard if needed
4. Add tests for new functionality
5. Update this documentation

## License

This monitoring system is part of the SMM Architect project and follows the same license terms.