import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceData } from './validation'

// Mock data
const mockWorkspaces = [
  {
    id: 'ws-tenant1-abc123',
    name: 'Q4 Holiday Campaign',
    description: 'Cross-platform holiday marketing initiative',
    status: 'active',
    lastActivity: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    budget: { used: 2400, total: 5000, currency: 'USD' },
    channels: ['linkedin', 'twitter', 'facebook'],
    metrics: {
      postsScheduled: 24,
      engagement: 0.078,
      reach: 45000,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'ws-tenant1-def456',
    name: 'Product Launch 2024',
    description: 'New feature announcement campaign',
    status: 'planning',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    budget: { used: 800, total: 3000, currency: 'USD' },
    channels: ['linkedin', 'twitter'],
    metrics: {
      postsScheduled: 12,
      engagement: 0.065,
      reach: 28000,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'ws-tenant1-ghi789',
    name: 'Brand Awareness Drive',
    description: 'Ongoing brand visibility campaign',
    status: 'paused',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    budget: { used: 1200, total: 2500, currency: 'USD' },
    channels: ['facebook', 'instagram'],
    metrics: {
      postsScheduled: 8,
      engagement: 0.042,
      reach: 15000,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
]

export async function GET(request: NextRequest) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100))
  
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  
  let filteredWorkspaces = [...mockWorkspaces]
  
  // Apply filters
  if (status) {
    filteredWorkspaces = filteredWorkspaces.filter(w => w.status === status)
  }
  
  if (search) {
    filteredWorkspaces = filteredWorkspaces.filter(w => 
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase())
    )
  }
  
  // Apply pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedWorkspaces = filteredWorkspaces.slice(startIndex, endIndex)
  
  return NextResponse.json({
    workspaces: paginatedWorkspaces,
    pagination: {
      page,
      limit,
      total: filteredWorkspaces.length,
      totalPages: Math.ceil(filteredWorkspaces.length / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

  try {
    const body = await request.json()
    const { data, errors } = validateWorkspaceData(body)

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    const newWorkspace = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...data,
      status: 'planning',
      lastActivity: new Date().toISOString(),
      metrics: {
        postsScheduled: 0,
        engagement: 0,
        reach: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Add to mock data (in real app, this would save to database)
    mockWorkspaces.unshift(newWorkspace)

    return NextResponse.json(newWorkspace, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}