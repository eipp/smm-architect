import { NextRequest, NextResponse } from 'next/server'
import { validateWorkspaceData } from '../validation'

// Mock workspace details with steps
const mockWorkspaceDetails = {
  'ws-tenant1-abc123': {
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
    steps: [
      { 
        id: 'discover', 
        status: 'completed', 
        duration: '2.3s',
        tooltip: 'Market research and competitor analysis completed',
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      },
      { 
        id: 'plan', 
        status: 'completed', 
        duration: '45.7s',
        tooltip: 'Content strategy and timeline created',
        completedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
      { 
        id: 'draft', 
        status: 'running', 
        duration: '32.1s',
        progress: 75,
        tooltip: 'Generating content variations',
        actions: ['fix', 'rerun', 'approve'],
        dependencies: ['plan'],
      },
      { 
        id: 'verify', 
        status: 'pending',
        tooltip: 'Waiting for content verification',
        dependencies: ['draft'],
      },
      { 
        id: 'approve', 
        status: 'pending',
        tooltip: 'Pending manager approval',
        dependencies: ['verify'],
      },
      { 
        id: 'post', 
        status: 'pending',
        tooltip: 'Ready for publishing',
        dependencies: ['approve'],
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100))
  
  const workspaceId = params.id
  const workspace = mockWorkspaceDetails[workspaceId]
  
  if (!workspace) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json(workspace)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))

  try {
    const workspaceId = params.id
    const workspace = mockWorkspaceDetails[workspaceId]

    if (!workspace) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { data, errors } = validateWorkspaceData(body, { partial: true })

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 400 })
    }

    const updatedWorkspace = {
      ...workspace,
      ...data,
      updatedAt: new Date().toISOString(),
    }

    mockWorkspaceDetails[workspaceId] = updatedWorkspace

    return NextResponse.json(updatedWorkspace)
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))
  
  const workspaceId = params.id
  const workspace = mockWorkspaceDetails[workspaceId]
  
  if (!workspace) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    )
  }
  
  delete mockWorkspaceDetails[workspaceId]
  
  return NextResponse.json({ success: true })
}