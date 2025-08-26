import { PerformanceMonitor } from './performance'
import { ErrorTracker } from './error-tracker'
import { AnalyticsTracker } from './analytics'
import { 
  MonitoringConfig, 
  MonitoringProvider, 
  PerformanceMetrics, 
  ErrorReport, 
  AnalyticsEvent,
  PageView 
} from '@/types/monitoring'

export class MonitoringService implements MonitoringProvider {
  name = 'SMM Architect Monitoring'
  
  private config: MonitoringConfig
  private performanceMonitor: PerformanceMonitor | null = null
  private errorTracker: ErrorTracker | null = null
  private analyticsTracker: AnalyticsTracker | null = null
  private initialized = false
  
  constructor() {
    this.config = this.getDefaultConfig()
  }
  
  private getDefaultConfig(): MonitoringConfig {
    return {
      apiEndpoint: process.env.NEXT_PUBLIC_MONITORING_API || '',
      apiKey: process.env.NEXT_PUBLIC_MONITORING_API_KEY || '',
      
      // Sampling rates
      performanceSampleRate: parseFloat(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || '1.0'),
      errorSampleRate: parseFloat(process.env.NEXT_PUBLIC_ERROR_SAMPLE_RATE || '1.0'),
      sessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SESSION_SAMPLE_RATE || '0.1'),
      
      // Feature flags
      enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING !== 'false',
      enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
      enableSessionTracking: process.env.NEXT_PUBLIC_ENABLE_SESSION_TRACKING !== 'false',
      enableUserInteractionTracking: process.env.NEXT_PUBLIC_ENABLE_INTERACTION_TRACKING !== 'false',
      
      // Performance thresholds (in milliseconds)
      performanceThresholds: {
        fcp: parseFloat(process.env.NEXT_PUBLIC_FCP_THRESHOLD || '2000'),
        lcp: parseFloat(process.env.NEXT_PUBLIC_LCP_THRESHOLD || '4000'),
        fid: parseFloat(process.env.NEXT_PUBLIC_FID_THRESHOLD || '300'),
        cls: parseFloat(process.env.NEXT_PUBLIC_CLS_THRESHOLD || '0.25'),
        ttfb: parseFloat(process.env.NEXT_PUBLIC_TTFB_THRESHOLD || '1000')
      },
      
      // Privacy settings
      enableUserTracking: process.env.NEXT_PUBLIC_ENABLE_USER_TRACKING !== 'false',
      anonymizeIPs: process.env.NEXT_PUBLIC_ANONYMIZE_IPS === 'true',
      respectDoNotTrack: process.env.NEXT_PUBLIC_RESPECT_DNT === 'true',
      
      // Development settings
      enableInDevelopment: process.env.NODE_ENV === 'development',
      debugMode: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_MONITORING === 'true'
    }
  }
  
  public initialize(customConfig?: Partial<MonitoringConfig>) {
    if (this.initialized) {
      console.warn('Monitoring service already initialized')
      return
    }
    
    // Merge custom config
    if (customConfig) {
      this.config = { ...this.config, ...customConfig }
    }
    
    // Check if monitoring should be enabled
    if (!this.shouldInitialize()) {
      console.log('Monitoring disabled')
      return
    }
    
    this.initializeComponents()
    this.setupGlobalErrorHandling()
    this.setupPerformanceObservation()
    this.setupBeforeUnloadHandling()
    
    this.initialized = true
    
    if (this.config.debugMode) {
      console.log('Monitoring service initialized with config:', this.config)
    }
    
    // Track initialization
    this.trackEvent('monitoring_initialized', 'system', 'init', {
      timestamp: Date.now(),
      config: this.config
    })
  }
  
  private shouldInitialize(): boolean {
    // Don't initialize in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !this.config.enableInDevelopment) {
      return false
    }
    
    // Respect Do Not Track
    if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
      return false
    }
    
    // Check if required config is present
    if (!this.config.apiEndpoint && !this.config.debugMode) {
      console.warn('Monitoring API endpoint not configured')
      return false
    }
    
    return true
  }
  
  private initializeComponents() {
    // Initialize performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor = new PerformanceMonitor(this.config)
      this.performanceMonitor.onMetrics((metrics) => {
        this.handlePerformanceMetrics(metrics)
      })
    }
    
    // Initialize error tracking
    if (this.config.enableErrorTracking) {
      this.errorTracker = new ErrorTracker(this.config)
      this.errorTracker.onError((error) => {
        this.handleError(error)
      })
    }
    
    // Initialize analytics tracking
    if (this.config.enableSessionTracking) {
      this.analyticsTracker = new AnalyticsTracker(this.config)
    }
  }
  
  private setupGlobalErrorHandling() {
    // Additional global error handling beyond the ErrorTracker
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', 'error', 'unhandled', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    })
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', 'error', 'unhandled', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      })
    })
  }
  
  private setupPerformanceObservation() {
    if (!this.performanceMonitor) return
    
    // Listen for performance alerts
    window.addEventListener('performance-alert', ((event: CustomEvent) => {
      this.trackEvent('performance_alert', 'performance', 'threshold_exceeded', {
        metric: event.detail.metric,
        value: event.detail.value,
        threshold: event.detail.threshold
      })
    }) as EventListener)
    
    // Track Core Web Vitals specifically
    this.trackCoreWebVitals()
  }
  
  private async trackCoreWebVitals() {
    try {
      // Import web-vitals library if available
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')
      
      getCLS((metric) => {
        this.trackPerformanceMetric('CLS', metric.value, 'score')
      })
      
      getFID((metric) => {
        this.trackPerformanceMetric('FID', metric.value, 'ms')
      })
      
      getFCP((metric) => {
        this.trackPerformanceMetric('FCP', metric.value, 'ms')
      })
      
      getLCP((metric) => {
        this.trackPerformanceMetric('LCP', metric.value, 'ms')
      })
      
      getTTFB((metric) => {
        this.trackPerformanceMetric('TTFB', metric.value, 'ms')
      })
    } catch (error) {
      // web-vitals library not available, fall back to custom implementation
      if (this.config.debugMode) {
        console.log('web-vitals library not available, using custom implementation')
      }
    }
  }
  
  private setupBeforeUnloadHandling() {
    window.addEventListener('beforeunload', () => {
      this.flush()
    })
  }
  
  private handlePerformanceMetrics(metrics: PerformanceMetrics) {
    // Send performance data to backend
    this.sendData('performance', metrics)
    
    // Track as analytics events
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && key !== 'timestamp') {
        this.trackPerformanceMetric(key, value, 'ms')
      }
    })
  }
  
  private handleError(error: ErrorReport) {
    // Send error data to backend
    this.sendData('error', error)
    
    // Track as analytics event
    this.trackEvent('error_captured', 'error', error.level, {
      errorId: error.id,
      message: error.message,
      name: error.name,
      critical: error.criticalPath,
      userAffected: error.userAffected
    })
  }
  
  private async sendData(type: string, data: any) {
    if (!this.config.apiEndpoint) return
    
    try {
      const response = await fetch(`${this.config.apiEndpoint}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          ...data,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      if (this.config.debugMode) {
        console.log(`${type} data sent successfully:`, data)
      }
    } catch (error) {
      console.error(`Failed to send ${type} data:`, error)
    }
  }
  
  // Public API methods implementing MonitoringProvider interface
  
  public trackError(error: ErrorReport) {
    this.errorTracker?.captureError(new Error(error.message), 'manual', error.metadata)
  }
  
  public trackPerformance(metrics: PerformanceMetrics) {
    this.handlePerformanceMetrics(metrics)
  }
  
  public trackEvent(name: string, category: string, action: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      action,
      url: window.location.href,
      timestamp: Date.now(),
      sessionId: this.analyticsTracker?.getSession()?.id || 'unknown',
      properties
    }
    
    // Add user ID if available
    const userId = this.getCurrentUserId()
    if (userId) {
      event.userId = userId
    }
    
    this.analyticsTracker?.trackEvent(name, category, action, properties)
    
    if (this.config.debugMode) {
      console.log('Event tracked:', event)
    }
  }
  
  public trackPageView(pageView: PageView) {
    this.sendData('pageview', pageView)
  }
  
  public setUser(userId: string, metadata?: Record<string, any>) {
    this.errorTracker?.setUser(userId, metadata)
    this.analyticsTracker?.setUserId(userId, metadata)
    
    this.trackEvent('user_identified', 'user', 'identify', {
      userId,
      ...metadata
    })
  }
  
  public async flush(): Promise<void> {
    // Flush all pending data
    const promises: Promise<void>[] = []
    
    if (this.analyticsTracker) {
      // Analytics tracker handles its own flushing
      promises.push(Promise.resolve())
    }
    
    // Wait for all flushes to complete
    await Promise.all(promises)
  }
  
  // Additional utility methods
  
  public trackPerformanceMetric(name: string, value: number, unit: string = 'ms') {
    this.trackEvent(`performance_${name.toLowerCase()}`, 'performance', 'measure', {
      metric: name,
      value,
      unit,
      timestamp: Date.now()
    })
  }
  
  public trackUserAction(action: string, context?: string, metadata?: Record<string, any>) {
    this.trackEvent(`user_${action}`, 'user', action, {
      context,
      ...metadata
    })
  }
  
  public trackBusinessMetric(metric: string, value: number, metadata?: Record<string, any>) {
    this.trackEvent(`business_${metric}`, 'business', 'measure', {
      metric,
      value,
      ...metadata
    })
  }
  
  public trackFeatureUsage(feature: string, action: string = 'use', metadata?: Record<string, any>) {
    this.trackEvent(`feature_${feature}`, 'feature', action, {
      feature,
      ...metadata
    })
  }
  
  public startTimer(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.trackPerformanceMetric(name, duration, 'ms')
    }
  }
  
  public measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const stopTimer = this.startTimer(name)
    
    return fn().finally(() => {
      stopTimer()
    })
  }
  
  public measureSync<T>(name: string, fn: () => T): T {
    const stopTimer = this.startTimer(name)
    
    try {
      return fn()
    } finally {
      stopTimer()
    }
  }
  
  // Configuration and state methods
  
  public updateConfig(updates: Partial<MonitoringConfig>) {
    this.config = { ...this.config, ...updates }
    
    if (this.config.debugMode) {
      console.log('Monitoring config updated:', updates)
    }
  }
  
  public getConfig(): MonitoringConfig {
    return { ...this.config }
  }
  
  public isInitialized(): boolean {
    return this.initialized
  }
  
  public getSession() {
    return this.analyticsTracker?.getSession()
  }
  
  public getCurrentPageView() {
    return this.analyticsTracker?.getCurrentPageView()
  }
  
  private getCurrentUserId(): string | undefined {
    return this.getSession()?.userId
  }
  
  // Performance monitoring helpers
  
  public reportLongTask(duration: number, name?: string) {
    this.trackPerformanceMetric(name || 'long_task', duration, 'ms')
    
    if (duration > 50) { // Long task threshold
      this.trackEvent('long_task_detected', 'performance', 'long_task', {
        duration,
        name,
        threshold: 50
      })
    }
  }
  
  public reportMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      
      this.trackEvent('memory_usage', 'performance', 'measure', {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      })
    }
  }
  
  public destroy() {
    this.performanceMonitor?.destroy()
    this.errorTracker?.destroy()
    this.analyticsTracker?.destroy()
    
    this.initialized = false
    
    if (this.config.debugMode) {
      console.log('Monitoring service destroyed')
    }
  }
}

// Global instance
let globalMonitoringService: MonitoringService | null = null

export const getMonitoringService = (): MonitoringService => {
  if (!globalMonitoringService) {
    globalMonitoringService = new MonitoringService()
  }
  return globalMonitoringService
}

export const initializeMonitoring = (config?: Partial<MonitoringConfig>) => {
  const service = getMonitoringService()
  service.initialize(config)
  return service
}

// Utility exports for common use cases
export const trackEvent = (name: string, category: string, action: string, properties?: Record<string, any>) => {
  getMonitoringService().trackEvent(name, category, action, properties)
}

export const trackError = (error: Error, context?: string, metadata?: Record<string, any>) => {
  getMonitoringService().trackError({
    id: `error_${Date.now()}`,
    message: error.message,
    name: error.name,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    sessionId: getMonitoringService().getSession()?.id || 'unknown',
    level: 'error',
    userAffected: true,
    criticalPath: false,
    metadata: { context, ...metadata }
  })
}

export const trackPerformance = (name: string, value: number, unit: string = 'ms') => {
  getMonitoringService().trackPerformanceMetric(name, value, unit)
}

export const measureTime = <T>(name: string, fn: () => T): T => {
  return getMonitoringService().measureSync(name, fn)
}

export const measureTimeAsync = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  return getMonitoringService().measureAsync(name, fn)
}