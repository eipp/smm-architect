"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Track error with monitoring service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
    
    this.setState({ errorInfo })
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} />
    }
    
    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="error-boundary-fallback p-6 bg-destructive/10 border border-destructive rounded-lg max-w-2xl mx-auto mt-8">
    <h2 className="text-lg font-semibold text-destructive mb-2">Something went wrong</h2>
    <p className="text-sm text-muted-foreground mb-4">
      An unexpected error occurred. The development team has been notified.
    </p>
    
    {process.env.NODE_ENV === 'development' && (
      <details className="text-xs mb-4">
        <summary className="cursor-pointer text-muted-foreground">Error details</summary>
        <pre className="mt-2 p-2 bg-muted rounded overflow-auto text-xs">
          {error.message}
          {error.stack && (
            <>
              {'\n\nStack trace:\n'}
              {error.stack}
            </>
          )}
        </pre>
      </details>
    )}
    
    <div className="flex space-x-2">
      <Button 
        onClick={() => window.location.reload()} 
        variant="default"
      >
        Reload page
      </Button>
      <Button 
        onClick={() => window.history.back()} 
        variant="outline"
      >
        Go back
      </Button>
    </div>
  </div>
)

export { ErrorBoundary, DefaultErrorFallback }