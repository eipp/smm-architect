"use client"

import React, { useState, useEffect } from 'react'
import useSWR, { SWRConfiguration, mutate } from 'swr'
import { useAuth } from './auth'

export class APIError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

interface APIClientConfig {
  baseURL: string
  timeout: number
  retries: number
}

const defaultConfig: APIClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  timeout: 30000,
  retries: 3,
}

class APIClient {
  private config: APIClientConfig

  constructor(config: Partial<APIClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const { timeout = this.config.timeout, ...requestOptions } = options
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${this.config.baseURL}${endpoint}`, {
        ...requestOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-ID': this.generateTraceId(),
          ...requestOptions.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails
        try {
          errorDetails = await response.json()
        } catch {
          errorDetails = await response.text()
        }
        throw new APIError(response.status, errorDetails.message || 'Request failed', errorDetails)
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return response.json()
      }
      
      return response.text() as T
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof APIError) {
        throw error
      }
      
      if (error.name === 'AbortError') {
        throw new APIError(408, 'Request timeout')
      }
      
      throw new APIError(0, error.message || 'Network error')
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  private generateTraceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `frontend-${crypto.randomUUID()}`
    }
    const array = new Uint8Array(16)
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(array)
      return `frontend-${Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')}`
    }
    throw new Error('Crypto API not available for trace ID generation')
  }
}

// Authenticated API client
export class AuthenticatedAPIClient extends APIClient {
  constructor(
    private getToken: () => string | null,
    config: Partial<APIClientConfig> = {}
  ) {
    super(config)
  }

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    
    return super.request<T>(endpoint, {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })
  }
}

// Global API client instance
export const apiClient = new APIClient()

// Hook for authenticated API client
export function useAPIClient() {
  const { token } = useAuth()
  
  const authenticatedClient = new AuthenticatedAPIClient(
    () => token,
    defaultConfig
  )
  
  return authenticatedClient
}

// SWR data fetching hooks
interface UseDataOptions extends SWRConfiguration {
  deps?: any[]
}

export function useWorkspaces(options: UseDataOptions = {}) {
  const client = useAPIClient()
  
  const { data, error, mutate, isLoading } = useSWR(
    '/api/workspaces',
    () => client.get('/api/workspaces'),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      ...options,
    }
  )
  
  return {
    workspaces: data?.workspaces || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useWorkspace(workspaceId: string, options: UseDataOptions = {}) {
  const client = useAPIClient()
  
  const { data, error, mutate, isLoading } = useSWR(
    workspaceId ? `/api/workspaces/${workspaceId}` : null,
    () => client.get(`/api/workspaces/${workspaceId}`),
    {
      refreshInterval: 5000, // Poll every 5 seconds for live updates
      ...options,
    }
  )
  
  return {
    workspace: data,
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useWorkspaceSteps(workspaceId: string) {
  const client = useAPIClient()
  
  const { data, error, mutate, isLoading } = useSWR(
    workspaceId ? `/api/workspaces/${workspaceId}/steps` : null,
    () => client.get(`/api/workspaces/${workspaceId}/steps`),
    {
      refreshInterval: 2000, // Poll every 2 seconds for step updates
      revalidateOnFocus: true,
    }
  )
  
  return {
    steps: data?.steps || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useConnectors(options: UseDataOptions = {}) {
  const client = useAPIClient()
  
  const { data, error, mutate, isLoading } = useSWR(
    '/api/connectors',
    () => client.get('/api/connectors'),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
      ...options,
    }
  )
  
  return {
    connectors: data?.connectors || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

export function useMonitoringData(options: UseDataOptions = {}) {
  const client = useAPIClient()
  
  const { data, error, mutate, isLoading } = useSWR(
    '/api/monitoring',
    () => client.get('/api/monitoring'),
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true,
      ...options,
    }
  )
  
  return {
    monitoring: data,
    isLoading,
    error,
    refresh: mutate,
  }
}

// Real-time data hooks with SSE
export function useWorkspaceEvents(workspaceId: string) {
  const [events, setEvents] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    if (!workspaceId) return
    
    const eventSource = new EventSource(`/api/workspaces/${workspaceId}/events`)
    
    eventSource.onopen = () => {
      setIsConnected(true)
    }
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setEvents(prev => [data, ...prev.slice(0, 99)]) // Keep last 100 events
      
      // Revalidate related SWR caches
      if (data.type === 'step_update') {
        mutate(`/api/workspaces/${workspaceId}/steps`)
      }
    }
    
    eventSource.onerror = () => {
      setIsConnected(false)
    }
    
    eventSource.onclose = () => {
      setIsConnected(false)
    }
    
    return () => {
      eventSource.close()
    }
  }, [workspaceId])
  
  return {
    events,
    isConnected,
  }
}

// Prefetch utilities
export function prefetchWorkspace(workspaceId: string) {
  const client = new APIClient()
  return mutate(
    `/api/workspaces/${workspaceId}`,
    client.get(`/api/workspaces/${workspaceId}`)
  )
}

export function prefetchWorkspaces() {
  const client = new APIClient()
  return mutate('/api/workspaces', client.get('/api/workspaces'))
}

// Mutation helpers
export async function createWorkspace(data: any) {
  const client = new APIClient()
  const result = await client.post('/api/workspaces', data)
  
  // Revalidate workspaces list
  mutate('/api/workspaces')
  
  return result
}

export async function updateWorkspace(workspaceId: string, data: any) {
  const client = new APIClient()
  const result = await client.patch(`/api/workspaces/${workspaceId}`, data)
  
  // Revalidate specific workspace and list
  mutate(`/api/workspaces/${workspaceId}`)
  mutate('/api/workspaces')
  
  return result
}

export async function deleteWorkspace(workspaceId: string) {
  const client = new APIClient()
  const result = await client.delete(`/api/workspaces/${workspaceId}`)
  
  // Revalidate workspaces list
  mutate('/api/workspaces')
  
  return result
}

export async function executeStepAction(
  workspaceId: string, 
  stepId: string, 
  action: string
) {
  const client = new APIClient()
  const result = await client.post(
    `/api/workspaces/${workspaceId}/steps/${stepId}/actions/${action}`
  )
  
  // Revalidate steps
  mutate(`/api/workspaces/${workspaceId}/steps`)
  
  return result
}

// Error boundary hook
export function useAPIError() {
  const [error, setError] = useState<APIError | null>(null)
  
  const handleError = (error: any) => {
    if (error instanceof APIError) {
      setError(error)
    } else {
      setError(new APIError(0, error.message || 'Unknown error'))
    }
  }
  
  const clearError = () => setError(null)
  
  return {
    error,
    handleError,
    clearError,
  }
}

export type { APIClientConfig, UseDataOptions }