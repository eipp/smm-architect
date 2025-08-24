"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { debounce, throttle } from '@smm-architect/ui'

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length
    )
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan)
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange])
  
  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  }
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const [elements, setElements] = useState<Element[]>([])
  const observer = useRef<IntersectionObserver | null>(null)
  
  useEffect(() => {
    if (observer.current) {
      observer.current.disconnect()
    }
    
    observer.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    })
    
    elements.forEach(element => {
      if (observer.current) {
        observer.current.observe(element)
      }
    })
    
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [elements, callback, options])
  
  const addElement = useCallback((element: Element | null) => {
    if (element && !elements.includes(element)) {
      setElements(prev => [...prev, element])
    }
  }, [elements])
  
  const removeElement = useCallback((element: Element) => {
    setElements(prev => prev.filter(el => el !== element))
  }, [])
  
  return { addElement, removeElement }
}

// Image lazy loading hook
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  
  const { addElement } = useIntersectionObserver(
    useCallback((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = new Image()
          img.onload = () => {
            setImageSrc(src)
            setIsLoaded(true)
          }
          img.onerror = () => {
            setIsError(true)
          }
          img.src = src
        }
      })
    }, [src])
  )
  
  useEffect(() => {
    if (imgRef.current) {
      addElement(imgRef.current)
    }
  }, [])
  
  return { imgRef, imageSrc, isLoaded, isError }
}

// Debounced search hook
export function useDebouncedSearch(
  searchFunction: (query: string) => Promise<any[]>,
  delay: number = 300
) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      setError(null)
      
      try {
        const searchResults = await searchFunction(searchQuery)
        setResults(searchResults)
      } catch (err) {
        setError(err as Error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, delay),
    [searchFunction, delay]
  )
  
  useEffect(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])
  
  return {
    query,
    setQuery,
    results,
    isLoading,
    error
  }
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const startTime = useRef(Date.now())
  const renderCount = useRef(0)
  
  useEffect(() => {
    renderCount.current += 1
    
    // Track mount time
    if (renderCount.current === 1) {
      const mountTime = Date.now() - startTime.current
      console.log(`${componentName} mounted in ${mountTime}ms`)
    }
    
    // Track excessive re-renders
    if (renderCount.current > 10) {
      console.warn(`${componentName} has re-rendered ${renderCount.current} times`)
    }
  })
  
  // Reset on unmount
  useEffect(() => {
    return () => {
      renderCount.current = 0
    }
  }, [])
  
  return { renderCount: renderCount.current }
}

// Memory usage hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null)
  
  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        setMemoryInfo((performance as any).memory)
      }
    }
    
    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000) // Update every 5 seconds
    
    return () => clearInterval(interval)
  }, [])
  
  return memoryInfo
}

// Bundle size monitoring
export function useBundleMonitor() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    jsSize: number
    cssSize: number
    imageSize: number
  }>({ totalSize: 0, jsSize: 0, cssSize: 0, imageSize: 0 })
  
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[]
        
        let totalSize = 0
        let jsSize = 0
        let cssSize = 0
        let imageSize = 0
        
        entries.forEach(entry => {
          const size = entry.transferSize || 0
          totalSize += size
          
          if (entry.name.includes('.js')) {
            jsSize += size
          } else if (entry.name.includes('.css')) {
            cssSize += size
          } else if (entry.name.match(/\\.(jpg|jpeg|png|gif|webp|svg)$/)) {
            imageSize += size
          }
        })
        
        setBundleInfo({ totalSize, jsSize, cssSize, imageSize })
      })
      
      observer.observe({ entryTypes: ['resource'] })
      
      return () => observer.disconnect()
    }
  }, [])
  
  return bundleInfo
}

// Efficient event listener hook
export function useEventListener<T extends keyof WindowEventMap>(
  eventType: T,
  handler: (event: WindowEventMap[T]) => void,
  element?: Element | Window | null,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler)
  
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])
  
  useEffect(() => {
    const targetElement = element ?? window
    if (!targetElement?.addEventListener) return
    
    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[T])
    }
    
    targetElement.addEventListener(eventType, eventListener, options)
    
    return () => {
      targetElement.removeEventListener(eventType, eventListener, options)
    }
  }, [eventType, element, options])
}

// Throttled resize hook
export function useThrottledResize(delay: number = 100) {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })
  
  useEffect(() => {
    const handleResize = throttle(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }, delay)
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [delay])
  
  return dimensions
}

// Optimized list rendering hook
export function useOptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  chunkSize = 50
}: {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string
  chunkSize?: number
}) {
  const [visibleCount, setVisibleCount] = useState(chunkSize)
  
  const visibleItems = useMemo(() => {
    return items.slice(0, visibleCount)
  }, [items, visibleCount])
  
  const hasMore = visibleCount < items.length
  
  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + chunkSize, items.length))
  }, [chunkSize, items.length])
  
  const renderedItems = useMemo(() => {
    return visibleItems.map((item, index) => (
      <div key={keyExtractor(item, index)}>
        {renderItem(item, index)}
      </div>
    ))
  }, [visibleItems, renderItem, keyExtractor])
  
  return {
    renderedItems,
    hasMore,
    loadMore,
    visibleCount
  }
}

// Preload hook for critical resources
export function usePreload(resources: Array<{ href: string; as: string; type?: string }>) {
  useEffect(() => {
    resources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.as
      if (resource.type) {
        link.type = resource.type
      }
      document.head.appendChild(link)
    })
    
    return () => {
      resources.forEach(resource => {
        const links = document.querySelectorAll(`link[rel=\"preload\"][href=\"${resource.href}\"]`)
        links.forEach(link => link.remove())
      })
    }
  }, [resources])
}"