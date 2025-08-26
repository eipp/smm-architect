export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  inp?: number // Interaction to Next Paint
  ttfb?: number // Time to First Byte
  
  // Navigation Timing
  navigationStart?: number
  domContentLoaded?: number
  loadComplete?: number
  
  // Resource Timing
  resourceLoadTime?: number
  totalPageSize?: number
  
  // Custom Metrics
  timeToInteractive?: number
  renderTime?: number
  hydrationTime?: number
  
  // User Experience
  pageLoadTime?: number
  routeChangeTime?: number
  
  // Context
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId: string
}

export interface ErrorReport {
  id: string
  message: string
  stack?: string
  name: string
  filename?: string
  lineNumber?: number
  columnNumber?: number
  
  // Context
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId: string
  
  // Additional Data
  metadata?: Record<string, any>
  breadcrumbs?: Breadcrumb[]
  tags?: Record<string, string>
  level: 'error' | 'warning' | 'info' | 'debug'
  
  // User Impact
  userAffected: boolean
  criticalPath: boolean
}

export interface Breadcrumb {
  id: string
  timestamp: number
  message: string
  category: 'navigation' | 'user' | 'network' | 'console' | 'dom'
  level: 'error' | 'warning' | 'info' | 'debug'
  data?: Record<string, any>
}

export interface UserSession {
  id: string
  userId?: string
  startTime: number
  endTime?: number
  duration?: number
  
  // Page Views
  pageViews: PageView[]
  
  // User Interactions
  interactions: UserInteraction[]
  
  // Performance
  totalLoadTime: number
  averagePageLoadTime: number
  
  // Errors
  errorCount: number
  lastError?: ErrorReport
  
  // Device Info
  device: DeviceInfo
  
  // Exit Info
  exitType?: 'navigation' | 'close' | 'refresh' | 'timeout'
  exitUrl?: string
}

export interface PageView {
  id: string
  url: string
  title: string
  timestamp: number
  duration?: number
  referrer?: string
  exitType?: 'navigation' | 'close' | 'refresh'
  
  // Performance for this page
  metrics?: PerformanceMetrics
  
  // User behavior
  scrollDepth?: number
  timeOnPage?: number
  interactions?: UserInteraction[]
}

export interface UserInteraction {
  id: string
  type: 'click' | 'scroll' | 'keyboard' | 'form' | 'navigation'
  target?: string
  timestamp: number
  data?: Record<string, any>
  
  // Performance impact
  responseTime?: number
  successful: boolean
}

export interface DeviceInfo {
  userAgent: string
  screen: {
    width: number
    height: number
    pixelRatio: number
  }
  viewport: {
    width: number
    height: number
  }
  memory?: number
  connection?: {
    effectiveType: string
    downlink?: number
    rtt?: number
  }
  platform: string
  language: string
  timezone: string
}

export interface MonitoringConfig {
  // API Configuration
  apiEndpoint: string
  apiKey: string
  
  // Sampling
  performanceSampleRate: number // 0-1
  errorSampleRate: number // 0-1
  sessionSampleRate: number // 0-1
  
  // Features
  enablePerformanceMonitoring: boolean
  enableErrorTracking: boolean
  enableSessionTracking: boolean
  enableUserInteractionTracking: boolean
  
  // Thresholds
  performanceThresholds: {
    fcp: number
    lcp: number
    fid: number
    cls: number
    ttfb: number
  }
  
  // Privacy
  enableUserTracking: boolean
  anonymizeIPs: boolean
  respectDoNotTrack: boolean
  
  // Development
  enableInDevelopment: boolean
  debugMode: boolean
}

export interface AnalyticsEvent {
  id: string
  name: string
  category: string
  action: string
  label?: string
  value?: number
  
  // Context
  url: string
  timestamp: number
  userId?: string
  sessionId: string
  
  // Custom Properties
  properties?: Record<string, any>
  
  // Attribution
  source?: string
  medium?: string
  campaign?: string
}

export interface FeatureUsage {
  featureName: string
  usageCount: number
  lastUsed: number
  totalTime: number
  averageSessionTime: number
  uniqueUsers: number
  
  // Engagement
  adoptionRate: number
  retentionRate: number
  satisfactionScore?: number
}

export interface BusinessMetrics {
  // Conversion Funnel
  funnelSteps: FunnelStep[]
  
  // Revenue Tracking
  revenueEvents: RevenueEvent[]
  
  // User Journey
  userJourneys: UserJourney[]
  
  // A/B Testing
  experiments: Experiment[]
}

export interface FunnelStep {
  id: string
  name: string
  order: number
  completions: number
  dropoffs: number
  conversionRate: number
  averageTime: number
}

export interface RevenueEvent {
  id: string
  type: 'purchase' | 'subscription' | 'upgrade' | 'refund'
  amount: number
  currency: string
  timestamp: number
  userId?: string
  sessionId: string
  metadata?: Record<string, any>
}

export interface UserJourney {
  id: string
  userId?: string
  sessionId: string
  steps: JourneyStep[]
  startTime: number
  endTime?: number
  completed: boolean
  goalAchieved: boolean
}

export interface JourneyStep {
  id: string
  name: string
  url: string
  timestamp: number
  duration: number
  interactions: number
  successful: boolean
}

export interface Experiment {
  id: string
  name: string
  variant: string
  userId?: string
  sessionId: string
  startTime: number
  endTime?: number
  goalAchieved: boolean
  conversionValue?: number
}

// Utility Types
export type MetricValue = number | undefined
export type MetricName = keyof PerformanceMetrics
export type EventCallback = (event: AnalyticsEvent) => void
export type ErrorCallback = (error: ErrorReport) => void
export type PerformanceCallback = (metrics: PerformanceMetrics) => void

// Configuration Types
export interface MonitoringProvider {
  name: string
  initialize: (config: MonitoringConfig) => void
  trackError: (error: ErrorReport) => void
  trackPerformance: (metrics: PerformanceMetrics) => void
  trackEvent: (event: AnalyticsEvent) => void
  trackPageView: (pageView: PageView) => void
  setUser: (userId: string, metadata?: Record<string, any>) => void
  flush: () => Promise<void>
}