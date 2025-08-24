"use client"

import React, { useState, useEffect, useCallback } from 'react'
import useSWR, { SWRConfiguration } from 'swr'
import { useAPIClient } from './api'

// Real-time hooks for live data
export function useWorkspaceSteps(workspaceId: string) {
  const [steps, setSteps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!workspaceId) return

    // Server-Sent Events for real-time updates
    const eventSource = new EventSource(`/api/workspaces/${workspaceId}/events`)
    
    eventSource.onopen = () => {
      setIsLoading(false)
      setError(null)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data)
        setSteps(prev => updateStepStatus(prev, update))
      } catch (err) {
        console.error('Failed to parse SSE message:', err)
      }
    }
    
    eventSource.onerror = (err) => {
      setError(new Error('Connection lost. Retrying...'))
      setIsLoading(false)
    }
    
    return () => {
      eventSource.close()
    }
  }, [workspaceId])

  return { steps, isLoading, error }
}

function updateStepStatus(steps: any[], update: any) {
  return steps.map(step => 
    step.id === update.stepId 
      ? { ...step, ...update.changes }
      : step
  )
}

// Monitoring data hook
export function useMonitoringData() {
  const client = useAPIClient()
  
  const { data, error, isLoading } = useSWR(
    '/api/monitoring',
    () => client.get('/api/monitoring'),
    {
      refreshInterval: 10000, // Update every 10 seconds
      revalidateOnFocus: true
    }
  )
  
  return {
    metrics: data?.metrics || {},
    alerts: data?.alerts || { critical: [], warning: [] },
    slos: data?.slos || [],
    isLoading,
    error
  }
}

// Content versions hook
export function useContentVersions(contentId: string) {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    contentId ? `/api/content/${contentId}/versions` : null,
    () => client.get(`/api/content/${contentId}/versions`)
  )
  
  return {
    versions: data?.versions || [],
    currentVersion: data?.currentVersion || 1,
    isLoading: !data && !error,
    error,
    refresh: mutate
  }
}

// Personas hook
export function usePersonas() {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    '/api/personas',
    () => client.get('/api/personas')
  )
  
  const togglePersona = useCallback(async (personaId: string) => {
    await client.patch(`/api/personas/${personaId}/toggle`)
    mutate()
  }, [client, mutate])
  
  return {
    personas: data?.personas || [],
    isLoading: !data && !error,
    error,
    togglePersona,
    refresh: mutate
  }
}

// SSO providers hook
export function useSSOProviders() {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    '/api/auth/sso/providers',
    () => client.get('/api/auth/sso/providers')
  )
  
  return {
    ssoProviders: data?.providers || [],
    isLoading: !data && !error,
    error,
    refresh: mutate
  }
}

// SCIM configuration hook
export function useSCIMConfig() {
  const client = useAPIClient()
  
  const { data, error } = useSWR(
    '/api/auth/scim/config',
    () => client.get('/api/auth/scim/config')
  )
  
  return {
    scimConfig: data?.config || {},
    webhookUrl: data?.webhookUrl || '',
    isLoading: !data && !error,
    error
  }
}

// Tenant data hook
export function useTenantData() {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    '/api/tenant',
    () => client.get('/api/tenant')
  )
  
  return {
    members: data?.members || [],
    roles: data?.roles || [],
    invitations: data?.invitations || [],
    isLoading: !data && !error,
    error,
    refresh: mutate
  }
}

// Scheduled posts hook  
export function useScheduledPosts() {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    '/api/posts/scheduled',
    () => client.get('/api/posts/scheduled'),
    {
      refreshInterval: 30000 // Update every 30 seconds
    }
  )
  
  return {
    scheduledPosts: data?.posts || [],
    isLoading: !data && !error,
    error,
    refresh: mutate
  }
}

// Support tickets hook
export function useSupportTickets() {
  const client = useAPIClient()
  
  const { data, error, mutate } = useSWR(
    '/api/support/tickets',
    () => client.get('/api/support/tickets')
  )
  
  return {
    tickets: data?.tickets || [],
    isLoading: !data && !error,
    error,
    refresh: mutate
  }
}

// Playwright status hook
export function usePlaywrightStatus() {
  const client = useAPIClient()
  
  const { data, error } = useSWR(
    '/api/playwright/status',
    () => client.get('/api/playwright/status'),
    {
      refreshInterval: 5000 // Update every 5 seconds
    }
  )
  
  return {
    workers: data?.workers || { active: 0, total: 0 },
    jobs: data?.jobs || { queued: 0, failed: 0, items: [] },
    isLoading: !data && !error,
    error
  }
}

// Prefetch utilities
export function prefetchWorkspace(workspaceId: string) {
  const client = useAPIClient()
  return client.get(`/api/workspaces/${workspaceId}`)
}

export function prefetchWorkspaces() {
  const client = useAPIClient()
  return client.get('/api/workspaces')
}

// WebSocket hook for real-time updates
export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING)
  
  useEffect(() => {
    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      setReadyState(WebSocket.OPEN)
      setSocket(ws)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
      } catch (err) {
        setLastMessage({ raw: event.data })
      }
    }
    
    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED)
      setSocket(null)
    }
    
    ws.onerror = () => {
      setReadyState(WebSocket.CLOSED)
    }
    
    return () => {
      ws.close()
    }
  }, [url])
  
  const sendMessage = useCallback((message: any) => {
    if (socket && readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }, [socket, readyState])
  
  return {
    socket,
    lastMessage,
    readyState,
    sendMessage
  }
}