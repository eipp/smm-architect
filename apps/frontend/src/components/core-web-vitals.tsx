"use client"

import { useEffect, useState } from "react"
import { getCLS, getFID, getFCP, getLCP, getTTFB, type Metric } from "web-vitals"

interface VitalsData {
  cls: number | null
  fid: number | null
  fcp: number | null
  lcp: number | null
  ttfb: number | null
}

interface VitalsThresholds {
  cls: { good: number; needsImprovement: number }
  fid: { good: number; needsImprovement: number }
  fcp: { good: number; needsImprovement: number }
  lcp: { good: number; needsImprovement: number }
  ttfb: { good: number; needsImprovement: number }
}

// Web Vitals thresholds (in milliseconds, except CLS which is a score)
const VITALS_THRESHOLDS: VitalsThresholds = {
  cls: { good: 0.1, needsImprovement: 0.25 },
  fid: { good: 100, needsImprovement: 300 },
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  ttfb: { good: 800, needsImprovement: 1800 }
}

// Target values based on design system requirements
const TARGET_VALUES = {
  lcp: 1200, // LCP < 1.2s
  cls: 0.02,  // CLS < 0.02
  fid: 100,   // FID < 100ms
  fcp: 1500,  // FCP < 1.5s
  ttfb: 600   // TTFB < 600ms
}

function getScoreStatus(metric: keyof VitalsData, value: number): 'good' | 'needsImprovement' | 'poor' {
  const threshold = VITALS_THRESHOLDS[metric]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needsImprovement'
  return 'poor'
}

function getScoreColor(status: 'good' | 'needsImprovement' | 'poor'): string {
  switch (status) {
    case 'good': return 'text-success-600 bg-success-100'
    case 'needsImprovement': return 'text-warning-600 bg-warning-100'
    case 'poor': return 'text-error-600 bg-error-100'
  }
}

function formatValue(metric: keyof VitalsData, value: number): string {
  if (metric === 'cls') {
    return value.toFixed(3)
  }
  return `${Math.round(value)}ms`
}

export function CoreWebVitals() {
  const [vitals, setVitals] = useState<VitalsData>({
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development or if explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('smm-show-web-vitals') === 'true'
    setIsVisible(shouldShow)

    if (!shouldShow) return

    function onMetric(metric: Metric) {
      setVitals(prev => ({
        ...prev,
        [metric.name.toLowerCase()]: metric.value
      }))

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        // Example: send to your analytics service
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', metric.name, {
            event_category: 'Web Vitals',
            event_label: metric.id,
            value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
            non_interaction: true,
          })
        }
      }
    }

    // Measure Core Web Vitals
    getCLS(onMetric)
    getFID(onMetric)
    getFCP(onMetric)
    getLCP(onMetric)
    getTTFB(onMetric)

    // Keyboard shortcut to toggle visibility
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === 'v' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        setIsVisible(prev => !prev)
        localStorage.setItem('smm-show-web-vitals', (!isVisible).toString())
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isVisible])

  if (!isVisible) return null

  const metricsWithData = Object.entries(vitals).filter(([_, value]) => value !== null)

  if (metricsWithData.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg p-3">
        <div className="text-xs text-neutral-600">📊 Measuring Web Vitals...</div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-neutral-200 rounded-lg shadow-lg p-4 min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-neutral-900">📊 Core Web Vitals</div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-neutral-400 hover:text-neutral-600 text-xs"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        {metricsWithData.map(([metric, value]) => {
          if (value === null) return null
          
          const metricKey = metric as keyof VitalsData
          const status = getScoreStatus(metricKey, value)
          const target = TARGET_VALUES[metricKey]
          const isTargetMet = metricKey === 'cls' ? value <= target : value <= target
          
          return (
            <div key={metric} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-700 uppercase">
                  {metric}
                </span>
                {isTargetMet && (
                  <span className="text-xs text-success-600">✓</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">
                  Target: {metricKey === 'cls' ? target.toFixed(3) : `${target}ms`}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${getScoreColor(status)}`}>
                  {formatValue(metricKey, value)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-3 pt-2 border-t border-neutral-200">
        <div className="text-xs text-neutral-500">
          Press ⌘⇧V to toggle • {metricsWithData.length}/5 metrics
        </div>
      </div>
    </div>
  )
}

// Performance observer for more detailed metrics
export function PerformanceObserver() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    // Observer for navigation timing
    const navObserver = new window.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          console.group('📊 Navigation Timing')
          console.log('DNS Lookup:', navEntry.domainLookupEnd - navEntry.domainLookupStart, 'ms')
          console.log('TCP Connection:', navEntry.connectEnd - navEntry.connectStart, 'ms')
          console.log('TLS Handshake:', navEntry.secureConnectionStart ? navEntry.connectEnd - navEntry.secureConnectionStart : 0, 'ms')
          console.log('Request + Response:', navEntry.responseEnd - navEntry.requestStart, 'ms')
          console.log('DOM Processing:', navEntry.domContentLoadedEventEnd - navEntry.responseEnd, 'ms')
          console.log('Resource Loading:', navEntry.loadEventEnd - navEntry.domContentLoadedEventEnd, 'ms')
          console.groupEnd()
        }
      }
    })

    // Observer for resource timing
    const resourceObserver = new window.PerformanceObserver((list) => {
      const entries = list.getEntries()
      const largeResources = entries
        .filter(entry => entry.transferSize > 100000) // > 100KB
        .sort((a, b) => b.transferSize - a.transferSize)

      if (largeResources.length > 0) {
        console.group('📦 Large Resources (>100KB)')
        largeResources.forEach(resource => {
          console.log(
            `${Math.round(resource.transferSize / 1024)}KB`,
            resource.name.split('/').pop(),
            `${Math.round(resource.duration)}ms`
          )
        })
        console.groupEnd()
      }
    })

    // Observer for long tasks
    const longTaskObserver = new window.PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(
            '🐌 Long Task detected:',
            `${Math.round(entry.duration)}ms`,
            'at',
            new Date(entry.startTime + performance.timeOrigin).toISOString()
          )
        }
      }
    })

    // Start observing
    try {
      navObserver.observe({ entryTypes: ['navigation'] })
      resourceObserver.observe({ entryTypes: ['resource'] })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('Performance observation not supported:', error)
    }

    return () => {
      navObserver.disconnect()
      resourceObserver.disconnect()
      longTaskObserver.disconnect()
    }
  }, [])

  return null
}

// Bundle size analyzer component
export function BundleAnalyzer() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    let analysisTimeout: NodeJS.Timeout

    function analyzeBundles() {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      
      Promise.all([
        ...scripts.map(script => 
          fetch((script as HTMLScriptElement).src, { method: 'HEAD' })
            .then(res => ({
              name: (script as HTMLScriptElement).src.split('/').pop() || 'unknown',
              size: parseInt(res.headers.get('content-length') || '0'),
              type: 'script'
            }))
            .catch(() => ({ name: 'error', size: 0, type: 'script' }))
        ),
        ...stylesheets.map(link =>
          fetch((link as HTMLLinkElement).href, { method: 'HEAD' })
            .then(res => ({
              name: (link as HTMLLinkElement).href.split('/').pop() || 'unknown',
              size: parseInt(res.headers.get('content-length') || '0'),
              type: 'stylesheet'
            }))
            .catch(() => ({ name: 'error', size: 0, type: 'stylesheet' }))
        )
      ]).then(results => {
        const totalSize = results.reduce((sum, item) => sum + item.size, 0)
        const largeAssets = results
          .filter(item => item.size > 50000) // > 50KB
          .sort((a, b) => b.size - a.size)

        if (largeAssets.length > 0) {
          console.group(`📦 Bundle Analysis (Total: ${Math.round(totalSize / 1024)}KB)`)
          largeAssets.forEach(asset => {
            console.log(
              `${Math.round(asset.size / 1024)}KB`,
              asset.name,
              `(${asset.type})`
            )
          })
          console.groupEnd()
        }
      })
    }

    // Analyze after page load
    analysisTimeout = setTimeout(analyzeBundles, 2000)

    return () => clearTimeout(analysisTimeout)
  }, [])

  return null
}

// Main export combining all performance monitoring
export default function PerformanceMonitoring() {
  return (
    <>
      <CoreWebVitals />
      <PerformanceObserver />
      <BundleAnalyzer />
    </>
  )
}