import { 
  AnalyticsEvent, 
  UserSession, 
  PageView, 
  UserInteraction, 
  DeviceInfo, 
  MonitoringConfig 
} from '@/types/monitoring'

export class AnalyticsTracker {
  private config: MonitoringConfig
  private currentSession: UserSession | null = null
  private currentPageView: PageView | null = null
  private eventQueue: AnalyticsEvent[] = []
  private interactionQueue: UserInteraction[] = []
  private sessionTimer: NodeJS.Timeout | null = null
  private pageViewTimer: NodeJS.Timeout | null = null
  
  constructor(config: MonitoringConfig) {
    this.config = config
    this.initialize()
  }
  
  private initialize() {
    // Start session tracking
    this.startSession()
    
    // Set up page view tracking
    this.trackPageView()
    
    // Set up interaction tracking
    this.setupInteractionTracking()
    
    // Set up visibility tracking
    this.setupVisibilityTracking()
    
    // Set up periodic data sending
    this.setupPeriodicSending()
    
    // Set up beforeunload handling
    this.setupUnloadHandling()
  }
  
  private startSession() {
    if (!this.config.enableSessionTracking) return
    
    const deviceInfo = this.getDeviceInfo()
    
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: Date.now(),
      pageViews: [],
      interactions: [],
      totalLoadTime: 0,
      averagePageLoadTime: 0,
      errorCount: 0,
      device: deviceInfo
    }
    
    // Session timeout (30 minutes of inactivity)
    this.resetSessionTimer()
    
    if (this.config.debugMode) {
      console.log('Analytics session started:', this.currentSession.id)
    }
  }
  
  private resetSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
    }
    
    // 30 minutes session timeout
    this.sessionTimer = setTimeout(() => {
      this.endSession('timeout')
      this.startSession()
    }, 30 * 60 * 1000)
  }
  
  private endSession(exitType: 'navigation' | 'close' | 'refresh' | 'timeout') {
    if (!this.currentSession) return
    
    this.currentSession.endTime = Date.now()
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime
    this.currentSession.exitType = exitType
    this.currentSession.exitUrl = window.location.href
    
    // Calculate averages
    if (this.currentSession.pageViews.length > 0) {
      const totalPageTime = this.currentSession.pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0)
      this.currentSession.averagePageLoadTime = totalPageTime / this.currentSession.pageViews.length
    }
    
    // Send session data
    this.sendSessionData(this.currentSession)
    
    if (this.config.debugMode) {
      console.log('Analytics session ended:', this.currentSession.id, exitType)
    }
  }
  
  private trackPageView() {
    const startTime = Date.now()
    
    // End previous page view
    if (this.currentPageView) {
      this.currentPageView.duration = startTime - this.currentPageView.timestamp
      this.currentPageView.exitType = 'navigation'
      
      if (this.currentSession) {
        this.currentSession.pageViews.push(this.currentPageView)
      }
    }
    
    // Start new page view
    this.currentPageView = {
      id: this.generatePageViewId(),
      url: window.location.href,
      title: document.title,
      timestamp: startTime,
      referrer: document.referrer,
      interactions: []
    }
    
    // Track scroll depth
    this.setupScrollTracking()
    
    // Reset page view timer
    if (this.pageViewTimer) {
      clearInterval(this.pageViewTimer)
    }
    
    this.pageViewTimer = setInterval(() => {
      if (this.currentPageView) {
        this.currentPageView.timeOnPage = Date.now() - this.currentPageView.timestamp
      }
    }, 1000)
    
    if (this.config.debugMode) {
      console.log('Page view tracked:', this.currentPageView.url)
    }
  }
  
  private setupScrollTracking() {
    let maxScrollDepth = 0
    let scrollTimer: NodeJS.Timeout
    
    const updateScrollDepth = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      const scrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100)
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth
        
        if (this.currentPageView) {
          this.currentPageView.scrollDepth = maxScrollDepth
        }
      }
    }
    
    const onScroll = () => {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(updateScrollDepth, 100)
    }
    
    window.addEventListener('scroll', onScroll, { passive: true })
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimer)
    })
  }
  
  private setupInteractionTracking() {
    if (!this.config.enableUserInteractionTracking) return
    
    // Click tracking
    document.addEventListener('click', (event) => {
      this.trackInteraction('click', event)
    })
    
    // Form interactions
    document.addEventListener('submit', (event) => {
      this.trackInteraction('form', event)
    })
    
    // Keyboard interactions
    document.addEventListener('keydown', (event) => {
      // Only track meaningful keyboard interactions
      if (event.key === 'Enter' || event.key === 'Escape' || event.key === 'Tab') {
        this.trackInteraction('keyboard', event)
      }
    })
    
    // Reset session timer on any interaction
    document.addEventListener('click', () => this.resetSessionTimer())
    document.addEventListener('keydown', () => this.resetSessionTimer())
    document.addEventListener('scroll', () => this.resetSessionTimer())
  }
  
  private trackInteraction(type: UserInteraction['type'], event: Event) {
    const interaction: UserInteraction = {
      id: this.generateInteractionId(),
      type,
      timestamp: Date.now(),
      successful: true
    }
    
    // Add specific data based on interaction type
    if (type === 'click' && event.target) {
      const target = event.target as Element
      interaction.target = this.getElementSelector(target)
      interaction.data = {
        tagName: target.tagName,
        id: target.id,
        className: target.className,
        textContent: target.textContent?.slice(0, 100)
      }
    }
    
    if (type === 'form' && event.target) {
      const form = event.target as HTMLFormElement
      interaction.target = form.action || window.location.href
      interaction.data = {
        action: form.action,
        method: form.method,
        formId: form.id,
        formName: form.name
      }
    }
    
    if (type === 'keyboard' && event instanceof KeyboardEvent) {
      interaction.data = {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey
      }
    }
    
    // Add to current page view
    if (this.currentPageView) {
      this.currentPageView.interactions = this.currentPageView.interactions || []
      this.currentPageView.interactions.push(interaction)
    }
    
    // Add to current session
    if (this.currentSession) {
      this.currentSession.interactions.push(interaction)
    }
    
    // Add to queue
    this.interactionQueue.push(interaction)
    
    if (this.config.debugMode) {
      console.log('Interaction tracked:', type, interaction.target)
    }
  }
  
  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Page became hidden, end current page view
        if (this.currentPageView) {
          this.currentPageView.duration = Date.now() - this.currentPageView.timestamp
          this.currentPageView.exitType = 'navigation'
        }
        
        // Send queued data
        this.flushQueues()
      } else {
        // Page became visible, could be returning from background
        this.resetSessionTimer()
      }
    })
  }
  
  private setupPeriodicSending() {
    // Send queued data every 30 seconds
    setInterval(() => {
      this.flushQueues()
    }, 30000)
  }
  
  private setupUnloadHandling() {
    window.addEventListener('beforeunload', () => {
      this.endSession('close')
      this.flushQueues(true) // Synchronous send on unload
    })
    
    // For SPA navigation
    window.addEventListener('popstate', () => {
      this.trackPageView()
    })
  }
  
  public trackEvent(name: string, category: string, action: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name,
      category,
      action,
      url: window.location.href,
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || 'unknown',
      properties
    }
    
    // Add user ID if available
    const userId = this.getUserId()
    if (userId) {
      event.userId = userId
    }
    
    this.eventQueue.push(event)
    
    if (this.config.debugMode) {
      console.log('Event tracked:', name, category, action, properties)
    }
    
    // Send immediately for critical events
    if (category === 'error' || category === 'conversion') {
      this.flushQueues()
    }
  }
  
  public trackConversion(eventName: string, value?: number, currency?: string) {
    this.trackEvent(eventName, 'conversion', 'complete', {
      value,
      currency: currency || 'USD',
      conversionTime: Date.now()
    })
  }
  
  public trackFeatureUsage(featureName: string, action: string = 'use') {
    this.trackEvent(`feature_${featureName}`, 'feature', action, {
      featureName,
      timestamp: Date.now()
    })
  }
  
  public trackPerformance(metricName: string, value: number, unit: string = 'ms') {
    this.trackEvent(`performance_${metricName}`, 'performance', 'measure', {
      metricName,
      value,
      unit,
      url: window.location.href
    })
  }
  
  public setUserId(userId: string, metadata?: Record<string, any>) {
    // Store user ID for session
    if (this.currentSession) {
      this.currentSession.userId = userId
    }
    
    // Store in localStorage for persistence
    localStorage.setItem('analytics_user_id', userId)
    
    if (metadata) {
      localStorage.setItem('analytics_user_metadata', JSON.stringify(metadata))
    }
    
    this.trackEvent('user_identified', 'user', 'identify', {
      userId,
      ...metadata
    })
  }
  
  public clearUser() {
    if (this.currentSession) {
      this.currentSession.userId = undefined
    }
    
    localStorage.removeItem('analytics_user_id')
    localStorage.removeItem('analytics_user_metadata')
    
    this.trackEvent('user_logout', 'user', 'logout')
  }
  
  private getUserId(): string | undefined {
    if (this.currentSession?.userId) {
      return this.currentSession.userId
    }
    
    return localStorage.getItem('analytics_user_id') || undefined
  }
  
  private getDeviceInfo(): DeviceInfo {
    const screen = window.screen
    const navigator = window.navigator
    
    return {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio || 1
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: (navigator as any).deviceMemory,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : undefined,
      platform: navigator.platform,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }
  
  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c).slice(0, 2)
      return `.${classes.join('.')}`
    }
    
    return element.tagName.toLowerCase()
  }
  
  private flushQueues(synchronous: boolean = false) {
    const data = {
      events: [...this.eventQueue],
      interactions: [...this.interactionQueue],
      session: this.currentSession,
      timestamp: Date.now()
    }
    
    if (data.events.length > 0 || data.interactions.length > 0) {
      this.sendAnalyticsData(data, synchronous)
      
      // Clear queues
      this.eventQueue = []
      this.interactionQueue = []
    }
  }
  
  private async sendAnalyticsData(data: any, synchronous: boolean = false) {
    if (!this.config.apiEndpoint) return
    
    const payload = {
      ...data,
      apiKey: this.config.apiKey,
      timestamp: Date.now()
    }
    
    try {
      if (synchronous && 'sendBeacon' in navigator) {
        // Use sendBeacon for synchronous sending on page unload
        navigator.sendBeacon(
          `${this.config.apiEndpoint}/analytics`,
          JSON.stringify(payload)
        )
      } else {
        // Regular fetch for async sending
        await fetch(`${this.config.apiEndpoint}/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
      
      if (this.config.debugMode) {
        console.log('Analytics data sent:', payload)
      }
    } catch (error) {
      console.error('Failed to send analytics data:', error)
    }
  }
  
  private async sendSessionData(session: UserSession) {
    if (!this.config.apiEndpoint) return
    
    try {
      await fetch(`${this.config.apiEndpoint}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session,
          apiKey: this.config.apiKey,
          timestamp: Date.now()
        })
      })
      
      if (this.config.debugMode) {
        console.log('Session data sent:', session.id)
      }
    } catch (error) {
      console.error('Failed to send session data:', error)
    }
  }
  
  public getSession(): UserSession | null {
    return this.currentSession
  }
  
  public getCurrentPageView(): PageView | null {
    return this.currentPageView
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generatePageViewId(): string {
    return `pageview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  public destroy() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer)
    }
    
    if (this.pageViewTimer) {
      clearInterval(this.pageViewTimer)
    }
    
    this.endSession('close')
    this.flushQueues(true)
  }
}

// Utility functions for specific tracking needs
export const trackButtonClick = (buttonName: string, context?: string) => {
  // Would use global analytics instance
  console.log('Button click tracked:', buttonName, context)
}

export const trackFormSubmission = (formName: string, success: boolean, errors?: string[]) => {
  // Would use global analytics instance
  console.log('Form submission tracked:', formName, success, errors)
}

export const trackFeatureFlag = (flagName: string, variant: string) => {
  // Would use global analytics instance
  console.log('Feature flag tracked:', flagName, variant)
}

export const trackSearchQuery = (query: string, resultCount: number) => {
  // Would use global analytics instance
  console.log('Search query tracked:', query, resultCount)
}