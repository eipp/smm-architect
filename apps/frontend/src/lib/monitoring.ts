"use client"

interface MetricsCollector {
  trackPageView(page: string): void
  trackUserAction(action: string, metadata?: Record<string, any>): void
  trackError(error: Error, context?: Record<string, any>): void
  trackPerformance(metric: string, value: number): void
  trackBusinessMetric(metric: string, value: number, tags?: Record<string, string>): void
}

class FrontendMetrics implements MetricsCollector {
  private traceId: string
  private userId?: string
  private sessionId: string
  private pageLoadTime: number = Date.now()
  
  constructor() {
    this.traceId = this.generateTraceId()
    this.sessionId = this.generateSessionId()
    this.setupPerformanceObserver()
    this.setupErrorTracking()
    this.trackPageLoad()
  }
  
  trackPageView(page: string) {
    this.sendMetric('page_view', {
      page,
      timestamp: Date.now(),
      trace_id: this.traceId,
      session_id: this.sessionId,
      user_id: this.userId,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      url: window.location.href
    })
  }
  
  trackUserAction(action: string, metadata = {}) {
    this.sendMetric('user_action', {
      action,
      metadata,
      timestamp: Date.now(),
      trace_id: this.traceId,
      session_id: this.sessionId,
      user_id: this.userId,
      page: window.location.pathname
    })
  }
  
  trackError(error: Error, context = {}) {
    this.sendMetric('frontend_error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      trace_id: this.traceId,
      session_id: this.sessionId,
      user_id: this.userId,
      url: window.location.href,
      user_agent: navigator.userAgent
    })
  }
  
  trackPerformance(metric: string, value: number) {
    this.sendMetric('performance_metric', {
      metric,
      value,
      timestamp: Date.now(),
      trace_id: this.traceId,
      session_id: this.sessionId,
      url: window.location.pathname
    })
  }
  
  trackBusinessMetric(metric: string, value: number, tags = {}) {
    this.sendMetric('business_metric', {
      metric,
      value,
      tags,
      timestamp: Date.now(),
      trace_id: this.traceId,
      session_id: this.sessionId,
      user_id: this.userId
    })
  }
  
  setUserId(userId: string) {
    this.userId = userId
  }
  
  private setupPerformanceObserver() {
    // Core Web Vitals tracking
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformance('lcp', entry.startTime)
        })
      }).observe({ entryTypes: ['largest-contentful-paint'] })
      
      // First Input Delay
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const fid = (entry as any).processingStart - entry.startTime
          this.trackPerformance('fid', fid)
        })
      }).observe({ entryTypes: ['first-input'] })
      
      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let cls = 0
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value
          }
        })
        this.trackPerformance('cls', cls)
      }).observe({ entryTypes: ['layout-shift'] })
      
      // Navigation timing
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const navigation = entry as PerformanceNavigationTiming
          this.trackPerformance('ttfb', navigation.responseStart - navigation.requestStart)
          this.trackPerformance('dom_load', navigation.domContentLoadedEventEnd - navigation.navigationStart)
          this.trackPerformance('page_load', navigation.loadEventEnd - navigation.navigationStart)
        })
      }).observe({ entryTypes: ['navigation'] })
      
      // Resource timing for critical assets
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming
          if (resource.name.includes('.js') || resource.name.includes('.css')) {
            this.trackPerformance('resource_load', resource.responseEnd - resource.startTime)
          }
        })
      }).observe({ entryTypes: ['resource'] })
    }
  }
  
  private setupErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript_error'
      })
    })
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      })
    })
    
    // Network errors
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        if (!response.ok) {
          this.trackError(new Error(`HTTP ${response.status}: ${response.statusText}`), {
            type: 'network_error',
            url: args[0],
            status: response.status
          })
        }
        return response
      } catch (error) {
        this.trackError(error as Error, {
          type: 'network_error',
          url: args[0]
        })
        throw error
      }
    }
  }
  
  private trackPageLoad() {
    if (document.readyState === 'complete') {
      this.trackPerformance('initial_page_load', Date.now() - this.pageLoadTime)
    } else {
      window.addEventListener('load', () => {
        this.trackPerformance('initial_page_load', Date.now() - this.pageLoadTime)
      })
    }
  }
  
  private async sendMetric(type: string, data: any) {
    try {
      // Use navigator.sendBeacon for better reliability
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({ type, data })
        navigator.sendBeacon('/api/metrics', payload)
      } else {
        // Fallback to fetch
        await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data }),
          keepalive: true
        })
      }
    } catch (error) {
      console.warn('Failed to send metric:', error)
    }
  }
  
  private generateTraceId(): string {
    return `frontend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id')
    if (!sessionId) {
      const cryptoObj = globalThis.crypto as Crypto | undefined
      if (cryptoObj?.randomUUID) {
        sessionId = `session-${cryptoObj.randomUUID()}`
      } else if (cryptoObj?.getRandomValues) {
        const array = new Uint8Array(16)
        cryptoObj.getRandomValues(array)
        sessionId = `session-${Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')}`
      } else {
        throw new Error('Secure random number generation is not supported')
      }
      sessionStorage.setItem('session_id', sessionId)
    }
    return sessionId
  }
}

// Business-specific metrics
class BusinessMetrics {
  constructor(private metrics: FrontendMetrics) {}
  
  trackWorkspaceCreated(workspaceType: string, setupTime: number) {
    this.metrics.trackBusinessMetric('workspace_created', 1, {
      workspace_type: workspaceType
    })
    this.metrics.trackPerformance('workspace_setup_time', setupTime)
  }
  
  trackCampaignApproval(campaignType: string, decisionTime: number) {
    this.metrics.trackBusinessMetric('campaign_approved', 1, {
      campaign_type: campaignType
    })
    this.metrics.trackPerformance('approval_decision_time', decisionTime)
  }
  
  trackCanvasInteraction(action: string, stepId: string) {
    this.metrics.trackUserAction('canvas_interaction', {
      action,
      step_id: stepId
    })
  }
  
  trackConnectorStatus(platform: string, status: 'connected' | 'failed' | 'disconnected') {
    this.metrics.trackBusinessMetric('connector_status_change', 1, {
      platform,
      status
    })
  }
  
  trackBudgetUtilization(workspaceId: string, utilization: number) {
    this.metrics.trackBusinessMetric('budget_utilization', utilization, {
      workspace_id: workspaceId
    })
  }
  
  trackPolicyViolation(policyType: string, severity: 'low' | 'medium' | 'high') {
    this.metrics.trackBusinessMetric('policy_violation', 1, {
      policy_type: policyType,
      severity
    })
  }
}

// Performance budget monitoring
class PerformanceBudget {
  private budgets = {
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 600, // 600ms
    bundleSize: 250000, // 250KB
    imageSize: 100000   // 100KB
  }
  
  constructor(private metrics: FrontendMetrics) {
    this.monitorBundles()
  }
  
  checkBudget(metric: string, value: number): boolean {
    const budget = this.budgets[metric as keyof typeof this.budgets]
    if (budget && value > budget) {
      this.metrics.trackError(new Error(`Performance budget exceeded: ${metric}`), {
        metric,
        value,
        budget,
        type: 'performance_budget_violation'
      })
      return false
    }
    return true
  }
  
  private monitorBundles() {
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming
          if (resource.name.includes('.js')) {
            this.checkBudget('bundleSize', resource.transferSize || 0)
          }
          if (resource.name.match(/\\.(jpg|jpeg|png|gif|webp)$/)) {
            this.checkBudget('imageSize', resource.transferSize || 0)
          }
        })
      }).observe({ entryTypes: ['resource'] })
    }
  }
}

// Global metrics instances
export const metrics = new FrontendMetrics()
export const businessMetrics = new BusinessMetrics(metrics)
export const performanceBudget = new PerformanceBudget(metrics)

// React hook for component-level metrics
export function useMetrics() {
  const trackComponentMount = (componentName: string) => {
    metrics.trackUserAction('component_mount', { component: componentName })
  }
  
  const trackComponentError = (componentName: string, error: Error) => {
    metrics.trackError(error, { component: componentName, type: 'component_error' })
  }
  
  const trackComponentInteraction = (componentName: string, interaction: string) => {
    metrics.trackUserAction('component_interaction', { 
      component: componentName, 
      interaction 
    })
  }
  
  return {
    trackComponentMount,
    trackComponentError,
    trackComponentInteraction
  }
}"