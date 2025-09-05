import { 
  PerformanceMetrics, 
  MonitoringConfig, 
  PerformanceCallback 
} from '@/types/monitoring'

export class PerformanceMonitor {
  private config: MonitoringConfig
  private callbacks: PerformanceCallback[] = []
  private metrics: Partial<PerformanceMetrics> = {}
  private observer: PerformanceObserver | null = null
  private navigationObserver: PerformanceObserver | null = null
  
  constructor(config: MonitoringConfig) {
    this.config = config
    this.initialize()
  }
  
  private initialize() {
    if (!this.config.enablePerformanceMonitoring) return
    
    // Initialize immediately available metrics
    this.collectInitialMetrics()
    
    // Set up performance observers
    this.setupPerformanceObserver()
    this.setupNavigationObserver()
    
    // Set up Core Web Vitals
    this.setupCoreWebVitals()
    
    // Listen for page visibility changes
    this.setupVisibilityListener()
    
    // Set up periodic reporting
    this.setupPeriodicReporting()
  }
  
  private collectInitialMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    if (navigation) {
      this.metrics = {
        ...this.metrics,
        navigationStart: navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        ttfb: navigation.responseStart - navigation.requestStart,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.generateSessionId()
      }
    }
  }
  
  private setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return
    
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry)
        }
      })
      
      // Observe paint, layout shift, and first input
      this.observer.observe({ 
        entryTypes: ['paint', 'layout-shift', 'first-input', 'largest-contentful-paint'] 
      })
    } catch (e) {
      console.warn('PerformanceObserver not supported:', e)
    }
  }
  
  private setupNavigationObserver() {
    if (!('PerformanceObserver' in window)) return
    
    try {
      this.navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.processNavigationEntry(entry as PerformanceNavigationTiming)
          }
        }
      })
      
      this.navigationObserver.observe({ entryTypes: ['navigation'] })
    } catch (e) {
      console.warn('Navigation PerformanceObserver not supported:', e)
    }
  }
  
  private setupCoreWebVitals() {
    // FCP - First Contentful Paint
    this.observePaintMetrics()
    
    // LCP - Largest Contentful Paint
    this.observeLCP()
    
    // FID - First Input Delay (deprecated, replaced by INP)
    this.observeFID()
    
    // INP - Interaction to Next Paint
    this.observeINP()
    
    // CLS - Cumulative Layout Shift
    this.observeCLS()
  }
  
  private observePaintMetrics() {
    const paintEntries = performance.getEntriesByType('paint')
    
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        this.metrics.fcp = entry.startTime
        this.checkThreshold('fcp', entry.startTime)
      }
    }
  }
  
  private observeLCP() {
    if (!('PerformanceObserver' in window)) return
    
    let lcpValue = 0
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      
      if (lastEntry) {
        lcpValue = lastEntry.startTime
        this.metrics.lcp = lcpValue
        this.checkThreshold('lcp', lcpValue)
      }
    })
    
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      
      // Stop observing when page is backgrounded
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          observer.disconnect()
          if (lcpValue > 0) {
            this.reportMetric('lcp', lcpValue)
          }
        }
      })
    } catch (e) {
      console.warn('LCP observer not supported:', e)
    }
  }
  
  private observeFID() {
    if (!('PerformanceObserver' in window)) return
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'first-input') {
          const fid = entry.processingStart - entry.startTime
          this.metrics.fid = fid
          this.checkThreshold('fid', fid)
          this.reportMetric('fid', fid)
          observer.disconnect()
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      console.warn('FID observer not supported:', e)
    }
  }
  
  private observeINP() {
    // INP is complex to implement, this is a simplified version
    let interactions: number[] = []
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'event') {
          const duration = entry.duration || 0
          interactions.push(duration)
          
          // Calculate 98th percentile of all interactions
          if (interactions.length >= 50) {
            const sorted = interactions.sort((a, b) => a - b)
            const p98Index = Math.floor(sorted.length * 0.98)
            const inp = sorted[p98Index]
            
            this.metrics.inp = inp
            this.reportMetric('inp', inp)
          }
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['event'] })
    } catch (e) {
      console.warn('INP observer not supported:', e)
    }
  }
  
  private observeCLS() {
    if (!('PerformanceObserver' in window)) return
    
    let clsValue = 0
    let sessionValue = 0
    let sessionEntries: PerformanceEntry[] = []
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          sessionValue += (entry as any).value
          sessionEntries.push(entry)
          
          // Session window logic (simplified)
          if (sessionValue > clsValue) {
            clsValue = sessionValue
            this.metrics.cls = clsValue
            this.checkThreshold('cls', clsValue)
          }
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['layout-shift'] })
      
      // Report CLS when page is backgrounded
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && clsValue > 0) {
          this.reportMetric('cls', clsValue)
        }
      })
    } catch (e) {
      console.warn('CLS observer not supported:', e)
    }
  }
  
  private processPerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.fcp = entry.startTime
        }
        break
        
      case 'largest-contentful-paint':
        this.metrics.lcp = entry.startTime
        break
        
      case 'first-input':
        this.metrics.fid = (entry as any).processingStart - entry.startTime
        break
        
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.metrics.cls = (this.metrics.cls || 0) + (entry as any).value
        }
        break
    }
  }
  
  private processNavigationEntry(entry: PerformanceNavigationTiming) {
    this.metrics = {
      ...this.metrics,
      navigationStart: entry.navigationStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
      loadComplete: entry.loadEventEnd - entry.navigationStart,
      ttfb: entry.responseStart - entry.requestStart,
      pageLoadTime: entry.loadEventEnd - entry.navigationStart
    }
  }
  
  private checkThreshold(metric: keyof PerformanceMetrics, value: number) {
    const thresholds = this.config.performanceThresholds
    const threshold = thresholds[metric as keyof typeof thresholds]
    
    if (threshold && value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric}: ${value}ms (threshold: ${threshold}ms)`)
      
      // Trigger performance alert
      this.triggerPerformanceAlert(metric, value, threshold)
    }
  }
  
  private triggerPerformanceAlert(metric: string, value: number, threshold: number) {
    // Custom event for performance alerts
    window.dispatchEvent(new CustomEvent('performance-alert', {
      detail: { metric, value, threshold }
    }))
  }
  
  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportAllMetrics()
      }
    })
    
    // Also report on page unload
    window.addEventListener('beforeunload', () => {
      this.reportAllMetrics()
    })
  }
  
  private setupPeriodicReporting() {
    // Report metrics every 30 seconds
    setInterval(() => {
      this.reportAllMetrics()
    }, 30000)
  }
  
  private reportMetric(name: string, value: number) {
    if (this.config.debugMode) {
      console.log(`Performance metric ${name}:`, value)
    }
    
    // Trigger callbacks
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.metrics, [name]: value } as PerformanceMetrics)
      } catch (e) {
        console.error('Error in performance callback:', e)
      }
    })
  }
  
  private reportAllMetrics() {
    if (Object.keys(this.metrics).length > 0) {
      this.callbacks.forEach(callback => {
        try {
          callback(this.metrics as PerformanceMetrics)
        } catch (e) {
          console.error('Error in performance callback:', e)
        }
      })
    }
  }
  
  public onMetrics(callback: PerformanceCallback) {
    this.callbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }
  
  public getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics }
  }
  
  public markCustomMetric(name: string, value?: number) {
    const timestamp = value || performance.now()
    
    // Add to custom metrics
    ;(this.metrics as any)[name] = timestamp
    
    this.reportMetric(name, timestamp)
  }
  
  public measureUserTiming(name: string, startMark?: string) {
    try {
      if (startMark) {
        performance.measure(name, startMark)
      } else {
        performance.mark(name)
      }
      
      const measures = performance.getEntriesByName(name, 'measure')
      if (measures.length > 0) {
        const measure = measures[measures.length - 1]
        this.markCustomMetric(name, measure.duration)
      }
    } catch (e) {
      console.warn('User timing not supported:', e)
    }
  }
  
  public measurePageInteractivity() {
    // Time to Interactive approximation
    const entries = performance.getEntriesByType('navigation')
    if (entries.length > 0) {
      const nav = entries[0] as PerformanceNavigationTiming
      const tti = nav.domContentLoadedEventEnd - nav.navigationStart
      this.metrics.timeToInteractive = tti
      this.reportMetric('timeToInteractive', tti)
    }
  }
  
  private generateSessionId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined
    if (cryptoObj?.randomUUID) {
      return `session_${cryptoObj.randomUUID()}`
    }
    if (cryptoObj?.getRandomValues) {
      const array = new Uint8Array(16)
      cryptoObj.getRandomValues(array)
      return `session_${Array.from(array, b => b.toString(16).padStart(2, '0')).join('')}`
    }
    throw new Error('Secure random number generation is not supported')
  }
  
  public destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
    if (this.navigationObserver) {
      this.navigationObserver.disconnect()
    }
    
    this.callbacks = []
  }
}

// Utility functions for performance monitoring
export const measureAsyncOperation = async <T>(
  name: string,
  operation: () => Promise<T>,
  monitor?: PerformanceMonitor
): Promise<T> => {
  const startTime = performance.now()
  
  try {
    const result = await operation()
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (monitor) {
      monitor.markCustomMetric(`async_${name}`, duration)
    }
    
    return result
  } catch (error) {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (monitor) {
      monitor.markCustomMetric(`async_${name}_error`, duration)
    }
    
    throw error
  }
}

export const measureRender = (componentName: string, monitor?: PerformanceMonitor) => {
  const startTime = performance.now()
  
  return () => {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (monitor) {
      monitor.markCustomMetric(`render_${componentName}`, duration)
    }
  }
}

// Core Web Vitals helpers
export const getCoreWebVitals = (): Promise<PerformanceMetrics> => {
  return new Promise((resolve) => {
    const metrics: Partial<PerformanceMetrics> = {}
    let metricsCount = 0
    const expectedMetrics = 5 // FCP, LCP, FID/INP, CLS, TTFB
    
    const checkComplete = () => {
      metricsCount++
      if (metricsCount >= expectedMetrics) {
        resolve(metrics as PerformanceMetrics)
      }
    }
    
    // Get FCP
    const paintEntries = performance.getEntriesByType('paint')
    for (const entry of paintEntries) {
      if (entry.name === 'first-contentful-paint') {
        metrics.fcp = entry.startTime
        checkComplete()
        break
      }
    }
    
    // Get other metrics through observers
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          metrics.lcp = entry.startTime
          checkComplete()
        }
        
        if (entry.entryType === 'first-input') {
          metrics.fid = (entry as any).processingStart - entry.startTime
          checkComplete()
        }
        
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          metrics.cls = (metrics.cls || 0) + (entry as any).value
        }
      }
    })
    
    try {
      observer.observe({ 
        entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] 
      })
      
      // Get TTFB from navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart
        checkComplete()
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect()
        resolve(metrics as PerformanceMetrics)
      }, 10000)
    } catch (e) {
      console.warn('Performance observers not supported:', e)
      resolve(metrics as PerformanceMetrics)
    }
  })
}