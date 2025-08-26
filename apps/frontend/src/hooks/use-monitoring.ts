'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getMonitoringService, trackEvent, trackPerformance } from './monitoring-service'
import type { MonitoringConfig } from '@/types/monitoring'

/**
 * Main hook for monitoring integration
 */
export const useMonitoring = (config?: Partial<MonitoringConfig>) => {
  const service = useMemo(() => getMonitoringService(), [])
  
  useEffect(() => {
    if (config) {
      service.updateConfig(config)
    }
  }, [service, config])
  
  return service
}

/**
 * Hook for tracking page views automatically
 */
export const usePageTracking = (options?: {
  trackPageViews?: boolean
  trackRouteChanges?: boolean
}) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const service = useMonitoring()
  
  const { trackPageViews = true, trackRouteChanges = true } = options || {}
  
  useEffect(() => {
    if (!trackPageViews) return
    
    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    
    trackEvent('page_view', 'navigation', 'view', {
      path: pathname,
      url,
      title: document.title,
      referrer: document.referrer
    })
    
    if (trackRouteChanges) {
      trackEvent('route_change', 'navigation', 'change', {
        from: document.referrer,
        to: url,
        path: pathname
      })
    }
  }, [pathname, searchParams, trackPageViews, trackRouteChanges])
  
  return { pathname, searchParams }
}

/**
 * Hook for tracking component performance
 */
export const usePerformanceTracking = (componentName: string) => {
  const renderStartTime = useRef<number>()
  const mountTime = useRef<number>()
  
  // Track render start
  renderStartTime.current = performance.now()
  
  // Track mount time
  useEffect(() => {
    mountTime.current = performance.now()
    const renderTime = mountTime.current - (renderStartTime.current || 0)
    
    trackPerformance(`component_render_${componentName}`, renderTime, 'ms')
    trackEvent('component_mounted', 'performance', 'mount', {
      component: componentName,
      renderTime,
      timestamp: Date.now()
    })
    
    return () => {
      // Track unmount
      trackEvent('component_unmounted', 'performance', 'unmount', {
        component: componentName,
        mountDuration: performance.now() - (mountTime.current || 0),
        timestamp: Date.now()
      })
    }
  }, [componentName])
  
  const trackInteraction = useCallback((action: string, metadata?: Record<string, any>) => {
    trackEvent(`component_interaction_${componentName}`, 'interaction', action, {
      component: componentName,
      ...metadata
    })
  }, [componentName])
  
  const measureOperation = useCallback(<T>(operationName: string, fn: () => T): T => {
    const startTime = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - startTime
      
      trackPerformance(`${componentName}_${operationName}`, duration, 'ms')
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      trackPerformance(`${componentName}_${operationName}_error`, duration, 'ms')
      trackEvent('component_operation_error', 'error', 'operation_failed', {
        component: componentName,
        operation: operationName,
        error: (error as Error).message,
        duration
      })
      
      throw error
    }
  }, [componentName])
  
  const measureAsyncOperation = useCallback(async <T>(operationName: string, fn: () => Promise<T>): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - startTime
      
      trackPerformance(`${componentName}_${operationName}`, duration, 'ms')
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      trackPerformance(`${componentName}_${operationName}_error`, duration, 'ms')
      trackEvent('component_async_operation_error', 'error', 'async_operation_failed', {
        component: componentName,
        operation: operationName,
        error: (error as Error).message,
        duration
      })
      
      throw error
    }
  }, [componentName])
  
  return {
    trackInteraction,
    measureOperation,
    measureAsyncOperation
  }
}

/**
 * Hook for tracking user interactions
 */
export const useInteractionTracking = () => {
  const trackClick = useCallback((elementName: string, metadata?: Record<string, any>) => {
    trackEvent('user_click', 'interaction', 'click', {
      element: elementName,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackFormSubmit = useCallback((formName: string, success: boolean, errors?: string[]) => {
    trackEvent('form_submit', 'interaction', success ? 'submit_success' : 'submit_error', {
      form: formName,
      success,
      errors,
      timestamp: Date.now()
    })
  }, [])
  
  const trackSearch = useCallback((query: string, resultCount?: number, filters?: Record<string, any>) => {
    trackEvent('search', 'interaction', 'search', {
      query,
      resultCount,
      filters,
      timestamp: Date.now()
    })
  }, [])
  
  const trackFeatureUsage = useCallback((featureName: string, action: string = 'use', metadata?: Record<string, any>) => {
    trackEvent(`feature_${featureName}`, 'feature', action, {
      feature: featureName,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  return {
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackFeatureUsage
  }
}

/**
 * Hook for tracking business metrics and conversions
 */
export const useBusinessTracking = () => {
  const trackConversion = useCallback((eventName: string, value?: number, currency?: string, metadata?: Record<string, any>) => {
    trackEvent(eventName, 'conversion', 'complete', {
      value,
      currency: currency || 'USD',
      conversionTime: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackRevenue = useCallback((amount: number, currency: string = 'USD', source?: string, metadata?: Record<string, any>) => {
    trackEvent('revenue', 'business', 'revenue_generated', {
      amount,
      currency,
      source,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackUserAction = useCallback((action: string, context?: string, metadata?: Record<string, any>) => {
    trackEvent(`user_action_${action}`, 'user', action, {
      context,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackGoal = useCallback((goalName: string, value?: number, metadata?: Record<string, any>) => {
    trackEvent(`goal_${goalName}`, 'goal', 'achieved', {
      goal: goalName,
      value,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  return {
    trackConversion,
    trackRevenue,
    trackUserAction,
    trackGoal
  }
}

/**
 * Hook for tracking errors and exceptions
 */
export const useErrorTracking = () => {
  const service = useMonitoring()
  
  const captureError = useCallback((error: Error, context?: string, metadata?: Record<string, any>) => {
    service.trackError({
      id: `error_${Date.now()}`,
      message: error.message,
      name: error.name,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: service.getSession()?.id || 'unknown',
      level: 'error',
      userAffected: true,
      criticalPath: false,
      metadata: { context, ...metadata }
    })
  }, [service])
  
  const captureMessage = useCallback((message: string, level: 'error' | 'warning' | 'info' | 'debug' = 'info', metadata?: Record<string, any>) => {
    trackEvent('custom_message', 'message', level, {
      message,
      level,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  const wrapAsync = useCallback(<T>(fn: () => Promise<T>, context?: string): Promise<T> => {
    return fn().catch((error) => {
      captureError(error as Error, context)
      throw error
    })
  }, [captureError])
  
  const wrapSync = useCallback(<T>(fn: () => T, context?: string): T => {
    try {
      return fn()
    } catch (error) {
      captureError(error as Error, context)
      throw error
    }
  }, [captureError])
  
  return {
    captureError,
    captureMessage,
    wrapAsync,
    wrapSync
  }
}

/**
 * Hook for A/B testing and feature flags
 */
export const useExperimentTracking = () => {
  const trackExperiment = useCallback((experimentName: string, variant: string, metadata?: Record<string, any>) => {
    trackEvent(`experiment_${experimentName}`, 'experiment', 'exposed', {
      experiment: experimentName,
      variant,
      exposureTime: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackExperimentGoal = useCallback((experimentName: string, variant: string, goalName: string, value?: number, metadata?: Record<string, any>) => {
    trackEvent(`experiment_goal_${experimentName}`, 'experiment', 'goal_achieved', {
      experiment: experimentName,
      variant,
      goal: goalName,
      value,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  const trackFeatureFlag = useCallback((flagName: string, enabled: boolean, variant?: string, metadata?: Record<string, any>) => {
    trackEvent(`feature_flag_${flagName}`, 'feature_flag', enabled ? 'enabled' : 'disabled', {
      flag: flagName,
      enabled,
      variant,
      timestamp: Date.now(),
      ...metadata
    })
  }, [])
  
  return {
    trackExperiment,
    trackExperimentGoal,
    trackFeatureFlag
  }
}

/**
 * Hook for real-time monitoring
 */
export const useRealTimeMonitoring = () => {
  const service = useMonitoring()
  
  useEffect(() => {
    // Report memory usage periodically
    const memoryInterval = setInterval(() => {
      service.reportMemoryUsage()
    }, 60000) // Every minute
    
    // Set up Long Task observer
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          service.reportLongTask(entry.duration, entry.name)
        }
      })
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        console.warn('Long task observer not supported:', e)
      }
      
      return () => {
        clearInterval(memoryInterval)
        longTaskObserver.disconnect()
      }
    }
    
    return () => {
      clearInterval(memoryInterval)
    }
  }, [service])
  
  const reportCustomMetric = useCallback((name: string, value: number, unit: string = 'ms') => {
    trackPerformance(name, value, unit)
  }, [])
  
  return {
    reportCustomMetric
  }
}

/**
 * Hook for session management
 */
export const useSessionTracking = () => {
  const service = useMonitoring()
  
  const setUser = useCallback((userId: string, metadata?: Record<string, any>) => {
    service.setUser(userId, metadata)
  }, [service])
  
  const clearUser = useCallback(() => {
    // Implementation would depend on how user clearing is handled
    trackEvent('user_logout', 'user', 'logout')
  }, [])
  
  const getSession = useCallback(() => {
    return service.getSession()
  }, [service])
  
  const getCurrentPageView = useCallback(() => {
    return service.getCurrentPageView()
  }, [service])
  
  return {
    setUser,
    clearUser,
    getSession,
    getCurrentPageView
  }
}

/**
 * Higher-order component for automatic component tracking
 */
export const withMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const MonitoredComponent = (props: P) => {
    const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'
    const { measureOperation } = usePerformanceTracking(displayName)
    
    return measureOperation('render', () => <WrappedComponent {...props} />)
  }
  
  MonitoredComponent.displayName = `withMonitoring(${componentName || WrappedComponent.displayName || WrappedComponent.name})`
  
  return MonitoredComponent
}