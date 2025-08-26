"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Eye, 
  Users, 
  Zap, 
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Gauge
} from 'lucide-react'
import { useMonitoring } from '@/hooks/use-monitoring'
import { cn } from '@/lib/cn'

interface MetricCard {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  status?: 'good' | 'warning' | 'error'
  description?: string
}

interface PerformanceMetric {
  name: string
  value: number
  threshold: number
  status: 'good' | 'warning' | 'error'
  unit: string
}

interface ErrorItem {
  id: string
  message: string
  timestamp: number
  level: 'error' | 'warning' | 'info'
  count: number
}

interface SessionData {
  totalSessions: number
  activeSessions: number
  averageSessionDuration: number
  bounceRate: number
  pageViews: number
}

export const MonitoringDashboard: React.FC<{
  className?: string
  embedded?: boolean
}> = ({ className, embedded = false }) => {
  const service = useMonitoring()
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([])
  const [errors, setErrors] = useState<ErrorItem[]>([])
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [isVisible, setIsVisible] = useState(embedded)
  
  // Mock data for development
  useEffect(() => {
    // Simulate real-time metrics
    const interval = setInterval(() => {
      updateMockData()
    }, 5000)
    
    // Initial load
    updateMockData()
    
    return () => clearInterval(interval)
  }, [])
  
  const updateMockData = () => {
    // Core Web Vitals
    setPerformanceMetrics([
      {
        name: 'FCP',
        value: Math.random() * 3000 + 1000,
        threshold: 2500,
        status: Math.random() > 0.7 ? 'warning' : 'good',
        unit: 'ms'
      },
      {
        name: 'LCP',
        value: Math.random() * 5000 + 2000,
        threshold: 4000,
        status: Math.random() > 0.8 ? 'error' : 'good',
        unit: 'ms'
      },
      {
        name: 'FID',
        value: Math.random() * 200 + 50,
        threshold: 300,
        status: 'good',
        unit: 'ms'
      },
      {
        name: 'CLS',
        value: Math.random() * 0.3,
        threshold: 0.25,
        status: Math.random() > 0.6 ? 'warning' : 'good',
        unit: 'score'
      },
      {
        name: 'TTFB',
        value: Math.random() * 1000 + 500,
        threshold: 1000,
        status: 'good',
        unit: 'ms'
      }
    ])
    
    // General metrics
    setMetrics([
      {
        title: 'Page Load Time',
        value: (Math.random() * 2000 + 1000).toFixed(0),
        unit: 'ms',
        trend: Math.random() > 0.5 ? 'up' : 'down',
        status: 'good'
      },
      {
        title: 'Active Users',
        value: Math.floor(Math.random() * 1000 + 100),
        trend: 'up',
        status: 'good'
      },
      {
        title: 'Error Rate',
        value: (Math.random() * 5).toFixed(2),
        unit: '%',
        trend: 'down',
        status: 'good'
      },
      {
        title: 'API Response Time',
        value: (Math.random() * 500 + 200).toFixed(0),
        unit: 'ms',
        trend: 'stable',
        status: 'warning'
      }
    ])
    
    // Recent errors
    setErrors([
      {
        id: '1',
        message: 'TypeError: Cannot read property of undefined',
        timestamp: Date.now() - Math.random() * 3600000,
        level: 'error',
        count: Math.floor(Math.random() * 10 + 1)
      },
      {
        id: '2',
        message: 'Network request failed',
        timestamp: Date.now() - Math.random() * 7200000,
        level: 'warning',
        count: Math.floor(Math.random() * 5 + 1)
      },
      {
        id: '3',
        message: 'Slow component render detected',
        timestamp: Date.now() - Math.random() * 1800000,
        level: 'warning',
        count: Math.floor(Math.random() * 15 + 1)
      }
    ])
    
    // Session data
    setSessionData({
      totalSessions: Math.floor(Math.random() * 5000 + 1000),
      activeSessions: Math.floor(Math.random() * 200 + 50),
      averageSessionDuration: Math.random() * 300 + 180,
      bounceRate: Math.random() * 50 + 25,
      pageViews: Math.floor(Math.random() * 10000 + 2000)
    })
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }
  
  if (!embedded && !isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Activity className="h-4 w-4 mr-2" />
        Monitoring
      </Button>
    )
  }
  
  return (
    <div className={cn(
      embedded ? '' : 'fixed inset-4 z-50 bg-background border rounded-lg shadow-xl',
      className
    )}>
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Monitoring Dashboard</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            ×
          </Button>
        </div>
      )}
      
      <div className={cn(
        embedded ? '' : 'h-[calc(100vh-8rem)] overflow-hidden',
        'p-4'
      )}>
        <Tabs defaultValue="overview" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {metrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          {metric.value}
                          {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">{metric.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {metric.trend && getTrendIcon(metric.trend)}
                        {metric.status && (
                          <Badge className={getStatusColor(metric.status)}>
                            {metric.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {sessionData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Session Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Active Sessions</span>
                      <span className="font-medium">{sessionData.activeSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Sessions</span>
                      <span className="font-medium">{sessionData.totalSessions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. Duration</span>
                      <span className="font-medium">{formatDuration(sessionData.averageSessionDuration)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bounce Rate</span>
                      <span className="font-medium">{sessionData.bounceRate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Page Views
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {sessionData.pageViews.toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total page views today
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="performance" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Core Web Vitals
                  </CardTitle>
                  <CardDescription>
                    Key performance metrics for user experience
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {performanceMetrics.map((metric) => {
                      const percentage = Math.min((metric.value / metric.threshold) * 100, 100)
                      const isGood = metric.status === 'good'
                      
                      return (
                        <div key={metric.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metric.name}</span>
                              <Badge className={getStatusColor(metric.status)}>
                                {metric.status}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {metric.value.toFixed(metric.unit === 'score' ? 3 : 0)}{metric.unit}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <Progress 
                              value={percentage} 
                              className={cn(
                                "h-2",
                                isGood ? "text-green-600" : "text-red-600"
                              )}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>0</span>
                              <span>Threshold: {metric.threshold}{metric.unit}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="errors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Errors
                </CardTitle>
                <CardDescription>
                  Latest errors and warnings from your application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {errors.map((error) => (
                      <div key={error.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="mt-1">
                          {error.level === 'error' ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {error.message}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(error.timestamp)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Count: {error.count}
                            </Badge>
                            <Badge 
                              className={cn(
                                "text-xs",
                                error.level === 'error' 
                                  ? "text-red-600 bg-red-100" 
                                  : "text-yellow-600 bg-yellow-100"
                              )}
                            >
                              {error.level}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Event Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Page Views</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">User Interactions</span>
                      <span className="font-medium">856</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Form Submissions</span>
                      <span className="font-medium">43</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Feature Usage</span>
                      <span className="font-medium">167</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Performance Timing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Component Renders</span>
                      <span className="font-medium">45ms avg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Calls</span>
                      <span className="font-medium">234ms avg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Database Queries</span>
                      <span className="font-medium">12ms avg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cache Hits</span>
                      <span className="font-medium">89.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default MonitoringDashboard