import React from 'react'
import { 
  ErrorReport, 
  Breadcrumb, 
  MonitoringConfig, 
  ErrorCallback 
} from '@/types/monitoring'

export class ErrorTracker {
  private config: MonitoringConfig
  private callbacks: ErrorCallback[] = []
  private breadcrumbs: Breadcrumb[] = []
  private maxBreadcrumbs = 100
  private sessionId: string
  
  constructor(config: MonitoringConfig) {
    this.config = config
    this.sessionId = this.generateSessionId()
    this.initialize()
  }
  
  private initialize() {
    if (!this.config.enableErrorTracking) return
    
    // Global error handler
    this.setupGlobalErrorHandler()
    
    // Unhandled promise rejection handler
    this.setupUnhandledRejectionHandler()
    
    // Console error interception
    this.setupConsoleErrorInterception()
    
    // Network error tracking
    this.setupNetworkErrorTracking()
    
    // Automatic breadcrumb collection
    this.setupAutomaticBreadcrumbs()
  }
  
  private setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      const error: ErrorReport = {
        id: this.generateErrorId(),
        message: event.message,
        stack: event.error?.stack,
        name: event.error?.name || 'Error',
        filename: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        breadcrumbs: [...this.breadcrumbs],
        level: 'error',
        userAffected: true,
        criticalPath: this.isCriticalPath()
      }
      
      this.reportError(error)
    })
  }
  
  private setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      const error: ErrorReport = {
        id: this.generateErrorId(),
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        name: 'UnhandledPromiseRejection',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        breadcrumbs: [...this.breadcrumbs],
        level: 'error',
        userAffected: true,
        criticalPath: this.isCriticalPath(),
        metadata: {
          reason: event.reason,
          promise: event.promise
        }
      }
      
      this.reportError(error)
    })
  }
  
  private setupConsoleErrorInterception() {
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn
    
    console.error = (...args) => {
      this.addBreadcrumb({
        id: this.generateBreadcrumbId(),
        timestamp: Date.now(),
        message: args.join(' '),
        category: 'console',
        level: 'error'
      })
      
      // Report as error if it's an Error object
      const errorArg = args.find(arg => arg instanceof Error)
      if (errorArg) {
        this.captureError(errorArg, 'console')
      }
      
      originalConsoleError.apply(console, args)
    }
    
    console.warn = (...args) => {
      this.addBreadcrumb({
        id: this.generateBreadcrumbId(),
        timestamp: Date.now(),
        message: args.join(' '),
        category: 'console',
        level: 'warning'
      })
      
      originalConsoleWarn.apply(console, args)
    }
  }
  
  private setupNetworkErrorTracking() {
    // XMLHttpRequest error tracking
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._errorTracker = {
        method,
        url: url.toString(),
        startTime: Date.now()
      }
      
      return originalXHROpen.apply(this, [method, url, ...args])
    }
    
    XMLHttpRequest.prototype.send = function(body?: any) {
      const tracker = this._errorTracker
      
      this.addEventListener('error', () => {
        if (tracker) {
          const error: ErrorReport = {
            id: this.generateErrorId(),
            message: `Network request failed: ${tracker.method} ${tracker.url}`,
            name: 'NetworkError',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            breadcrumbs: [...this.breadcrumbs],
            level: 'error',
            userAffected: true,
            criticalPath: this.isCriticalPath(),
            metadata: {
              requestMethod: tracker.method,
              requestUrl: tracker.url,
              requestBody: body,
              duration: Date.now() - tracker.startTime
            }
          }
          
          this.reportError(error)
        }
      }.bind(this))
      
      this.addEventListener('load', () => {
        if (tracker && this.status >= 400) {
          const error: ErrorReport = {
            id: this.generateErrorId(),
            message: `HTTP ${this.status} error: ${tracker.method} ${tracker.url}`,
            name: 'HTTPError',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            breadcrumbs: [...this.breadcrumbs],
            level: this.status >= 500 ? 'error' : 'warning',
            userAffected: true,
            criticalPath: this.isCriticalPath(),
            metadata: {
              requestMethod: tracker.method,
              requestUrl: tracker.url,
              requestBody: body,
              responseStatus: this.status,
              responseText: this.responseText,
              duration: Date.now() - tracker.startTime
            }
          }
          
          this.reportError(error)
        }
      }.bind(this))
      
      return originalXHRSend.apply(this, [body])
    }.bind(this)
    
    // Fetch API error tracking
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = Date.now()
      const url = args[0].toString()
      const options = args[1] || {}
      
      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          const error: ErrorReport = {
            id: this.generateErrorId(),
            message: `Fetch ${response.status} error: ${url}`,
            name: 'FetchError',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            breadcrumbs: [...this.breadcrumbs],
            level: response.status >= 500 ? 'error' : 'warning',
            userAffected: true,
            criticalPath: this.isCriticalPath(),
            metadata: {
              requestUrl: url,
              requestOptions: options,
              responseStatus: response.status,
              responseHeaders: Object.fromEntries(response.headers.entries()),
              duration: Date.now() - startTime
            }
          }
          
          this.reportError(error)
        }
        
        return response
      } catch (fetchError) {
        const error: ErrorReport = {
          id: this.generateErrorId(),
          message: `Fetch network error: ${url}`,
          name: 'FetchNetworkError',
          stack: (fetchError as Error).stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          sessionId: this.sessionId,
          breadcrumbs: [...this.breadcrumbs],
          level: 'error',
          userAffected: true,
          criticalPath: this.isCriticalPath(),
          metadata: {
            requestUrl: url,
            requestOptions: options,
            duration: Date.now() - startTime,
            originalError: fetchError
          }
        }
        
        this.reportError(error)
        throw fetchError
      }
    }
  }
  
  private setupAutomaticBreadcrumbs() {
    // Navigation breadcrumbs
    window.addEventListener('popstate', () => {
      this.addBreadcrumb({
        id: this.generateBreadcrumbId(),
        timestamp: Date.now(),
        message: `Navigation to ${window.location.href}`,
        category: 'navigation',
        level: 'info',
        data: {
          from: document.referrer,
          to: window.location.href
        }
      })
    })
    
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as Element
      if (target) {
        this.addBreadcrumb({
          id: this.generateBreadcrumbId(),
          timestamp: Date.now(),
          message: `Clicked ${target.tagName}${target.id ? `#${target.id}` : ''}${target.className ? `.${target.className.split(' ')[0]}` : ''}`,
          category: 'user',
          level: 'info',
          data: {
            tagName: target.tagName,
            id: target.id,
            className: target.className,
            textContent: target.textContent?.slice(0, 100)
          }
        })
      }
    })
    
    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      this.addBreadcrumb({
        id: this.generateBreadcrumbId(),
        timestamp: Date.now(),
        message: `Form submitted: ${form.action || window.location.href}`,
        category: 'user',
        level: 'info',
        data: {
          action: form.action,
          method: form.method,
          formData: new FormData(form)
        }
      })
    })
    
    // DOM mutations (limited)
    if ('MutationObserver' in window) {
      const observer = new MutationObserver((mutations) => {
        const significantMutations = mutations.filter(mutation => 
          mutation.type === 'childList' && 
          mutation.addedNodes.length > 0 &&
          Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE &&
            (node as Element).tagName !== 'SCRIPT'
          )
        )
        
        if (significantMutations.length > 0) {
          this.addBreadcrumb({
            id: this.generateBreadcrumbId(),
            timestamp: Date.now(),
            message: `DOM modified: ${significantMutations.length} significant changes`,
            category: 'dom',
            level: 'debug',
            data: {
              mutationCount: significantMutations.length
            }
          })
        }
      })
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
    }
  }
  
  private addBreadcrumb(breadcrumb: Breadcrumb) {
    this.breadcrumbs.push(breadcrumb)
    
    // Keep only the latest breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs)
    }
  }
  
  public captureError(error: Error, context?: string, metadata?: Record<string, any>) {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      level: 'error',
      userAffected: true,
      criticalPath: this.isCriticalPath(),
      metadata: {
        context,
        ...metadata
      }
    }
    
    this.reportError(errorReport)
  }
  
  public captureMessage(message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info', metadata?: Record<string, any>) {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      message,
      name: 'CustomMessage',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs],
      level,
      userAffected: false,
      criticalPath: false,
      metadata
    }
    
    this.reportError(errorReport)
  }
  
  private reportError(error: ErrorReport) {
    // Apply sampling
    if (Math.random() > this.config.errorSampleRate) {
      return
    }
    
    // Add tags
    error.tags = {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      ...error.tags
    }
    
    if (this.config.debugMode) {
      console.group('Error Report')
      console.error('Error:', error.message)
      console.log('Stack:', error.stack)
      console.log('Breadcrumbs:', error.breadcrumbs)
      console.log('Metadata:', error.metadata)
      console.groupEnd()
    }
    
    // Trigger callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(error)
      } catch (e) {
        console.error('Error in error callback:', e)
      }
    })
  }
  
  private isCriticalPath(): boolean {
    // Define critical paths based on URL patterns
    const criticalPaths = [
      '/auth/',
      '/payment/',
      '/checkout/',
      '/dashboard/',
      '/api/'
    ]
    
    return criticalPaths.some(path => window.location.pathname.includes(path))
  }
  
  public onError(callback: ErrorCallback) {
    this.callbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }
  
  public setUser(userId: string, metadata?: Record<string, any>) {
    this.addBreadcrumb({
      id: this.generateBreadcrumbId(),
      timestamp: Date.now(),
      message: `User identified: ${userId}`,
      category: 'user',
      level: 'info',
      data: metadata
    })
  }
  
  public setContext(key: string, value: any) {
    this.addBreadcrumb({
      id: this.generateBreadcrumbId(),
      timestamp: Date.now(),
      message: `Context set: ${key}`,
      category: 'user',
      level: 'debug',
      data: { [key]: value }
    })
  }
  
  public addTag(key: string, value: string) {
    // Tags will be added to subsequent error reports
    // Store in session/local storage or in-memory
  }
  
  public getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs]
  }
  
  public clearBreadcrumbs() {
    this.breadcrumbs = []
  }
  
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateBreadcrumbId(): string {
    return `breadcrumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    this.callbacks = []
    this.breadcrumbs = []
  }
}

// Error boundary for React components
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; errorTracker?: ErrorTracker },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(_: Error) {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    if (this.props.errorTracker) {
      this.props.errorTracker.captureError(error, 'React Error Boundary', {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      })
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  Something went wrong
                </h3>
                <div className="mt-2 text-sm text-gray-500">
                  <p>We've been notified about this issue and are working to fix it.</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => window.location.reload()}
                  >
                    Reload page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}

// Utility functions
export const captureException = (error: Error, context?: string) => {
  // This would use the global error tracker instance
  console.error('Exception captured:', error, context)
}

export const captureMessage = (message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info') => {
  // This would use the global error tracker instance
  console.log('Message captured:', message, level)
}