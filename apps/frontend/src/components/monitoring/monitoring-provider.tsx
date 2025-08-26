'use client'

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { MonitoringService, initializeMonitoring } from '@/lib/monitoring/monitoring-service'
import { ErrorBoundary } from '@/lib/monitoring/error-tracker'
import MonitoringDashboard from '@/components/monitoring/monitoring-dashboard'
import type { MonitoringConfig } from '@/types/monitoring'

interface MonitoringContextType {
  service: MonitoringService | null
  isInitialized: boolean
}

const MonitoringContext = createContext<MonitoringContextType>({
  service: null,
  isInitialized: false
})

export const useMonitoringContext = () => {
  const context = useContext(MonitoringContext)
  if (!context) {
    throw new Error('useMonitoringContext must be used within a MonitoringProvider')
  }
  return context
}

interface MonitoringProviderProps {
  children: ReactNode
  config?: Partial<MonitoringConfig>
  enableDashboard?: boolean
  enableErrorBoundary?: boolean
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({
  children,
  config,
  enableDashboard = process.env.NODE_ENV === 'development',
  enableErrorBoundary = true
}) => {
  const [service, setService] = React.useState<MonitoringService | null>(null)
  const [isInitialized, setIsInitialized] = React.useState(false)
  
  useEffect(() => {
    // Initialize monitoring service
    const monitoringService = initializeMonitoring(config)
    setService(monitoringService)
    setIsInitialized(true)
    
    // Set up global error handling
    const handleGlobalError = (error: ErrorEvent) => {
      if (monitoringService.isInitialized()) {
        monitoringService.trackError({
          id: `global_error_${Date.now()}`,
          message: error.message,
          name: 'GlobalError',
          stack: error.error?.stack,
          filename: error.filename,
          lineNumber: error.lineno,
          columnNumber: error.colno,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          sessionId: monitoringService.getSession()?.id || 'unknown',
          level: 'error',
          userAffected: true,
          criticalPath: false,
          metadata: {
            source: 'global_error_handler'
          }
        })
      }
    }
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (monitoringService.isInitialized()) {
        monitoringService.trackError({
          id: `unhandled_rejection_${Date.now()}`,
          message: event.reason?.message || 'Unhandled Promise Rejection',
          name: 'UnhandledPromiseRejection',
          stack: event.reason?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          sessionId: monitoringService.getSession()?.id || 'unknown',
          level: 'error',
          userAffected: true,
          criticalPath: false,
          metadata: {
            reason: event.reason,
            source: 'unhandled_rejection_handler'
          }
        })
      }
    }
    
    // Add event listeners
    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    // Track initial page load
    if (monitoringService.isInitialized()) {
      monitoringService.trackEvent('app_load', 'navigation', 'load', {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      })
    }
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      
      if (monitoringService.isInitialized()) {
        monitoringService.trackEvent('app_unload', 'navigation', 'unload', {
          sessionDuration: Date.now() - (monitoringService.getSession()?.startTime || 0),
          timestamp: Date.now()
        })
        
        // Flush any pending data
        monitoringService.flush()
      }
    }
  }, [config])
  
  const contextValue: MonitoringContextType = {
    service,
    isInitialized
  }
  
  const content = (
    <MonitoringContext.Provider value={contextValue}>
      {children}
      {enableDashboard && isInitialized && (
        <MonitoringDashboard embedded={false} />
      )}
    </MonitoringContext.Provider>
  )
  
  // Wrap with error boundary if enabled
  if (enableErrorBoundary && service) {
    return (
      <ErrorBoundary errorTracker={service}>
        {content}
      </ErrorBoundary>
    )
  }
  
  return content
}

// Higher-order component for class components
export const withMonitoringProvider = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config?: Partial<MonitoringConfig>
) => {
  const WithMonitoringComponent = (props: P) => (
    <MonitoringProvider config={config}>
      <WrappedComponent {...props} />
    </MonitoringProvider>
  )
  
  WithMonitoringComponent.displayName = `withMonitoringProvider(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithMonitoringComponent
}

// Development-only monitoring wrapper
export const DevMonitoringWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>
  }
  
  return (
    <MonitoringProvider
      enableDashboard={true}
      enableErrorBoundary={true}
      config={{
        debugMode: true,
        enableInDevelopment: true
      }}
    >
      {children}
    </MonitoringProvider>
  )
}

export default MonitoringProvider