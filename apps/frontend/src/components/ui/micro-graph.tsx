"use client"

import * as React from "react"
import { Play, Pause, Square, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { Button } from "./button"
import { Badge } from "./badge"
import { Card, CardContent } from "./card"

export interface GraphNode {
  id: string
  label: string
  type: 'start' | 'process' | 'decision' | 'end' | 'human' | 'ai' | 'system'
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting'
  position: { x: number; y: number }
  data?: Record<string, any>
  outputs?: Array<{
    id: string
    label: string
    targetNodeId: string
    condition?: string
  }>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  condition?: string
  animated?: boolean
}

interface MicroGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  activeNode?: string
  executionPath?: string[]
  interactive?: boolean
  showControls?: boolean
  onNodeClick?: (node: GraphNode) => void
  onEdgeClick?: (edge: GraphEdge) => void
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onReset?: () => void
  className?: string
}

const MicroGraph = React.forwardRef<HTMLDivElement, MicroGraphProps>(
  ({
    nodes,
    edges,
    activeNode,
    executionPath = [],
    interactive = false,
    showControls = false,
    onNodeClick,
    onEdgeClick,
    onPlay,
    onPause,
    onStop,
    onReset,
    className
  }, ref) => {
    const [scale, setScale] = React.useState(1)
    const [pan, setPan] = React.useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
    const svgRef = React.useRef<SVGSVGElement>(null)

    const getNodeColor = (node: GraphNode) => {
      if (activeNode === node.id) {
        return "hsl(var(--primary))"
      }
      
      switch (node.status) {
        case 'running':
          return "hsl(var(--primary))"
        case 'completed':
          return "hsl(142 76% 36%)" // green
        case 'failed':
          return "hsl(var(--destructive))"
        case 'waiting':
          return "hsl(var(--warning))"
        default:
          return "hsl(var(--muted))"
      }
    }

    const getNodeShape = (type: GraphNode['type']) => {
      switch (type) {
        case 'start':
        case 'end':
          return 'circle'
        case 'decision':
          return 'diamond'
        case 'human':
          return 'hexagon'
        default:
          return 'rectangle'
      }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      if (!interactive) return
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !interactive) return
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleZoomIn = () => {
      setScale(prev => Math.min(prev * 1.2, 3))
    }

    const handleZoomOut = () => {
      setScale(prev => Math.max(prev / 1.2, 0.3))
    }

    const handleReset = () => {
      setScale(1)
      setPan({ x: 0, y: 0 })
      onReset?.()
    }

    const renderNode = (node: GraphNode) => {
      const shape = getNodeShape(node.type)
      const color = getNodeColor(node)
      const isExecuted = executionPath.includes(node.id)
      
      const nodeElement = (() => {
        switch (shape) {
          case 'circle':
            return (
              <circle
                cx={node.position.x}
                cy={node.position.y}
                r="20"
                fill={color}
                stroke={isExecuted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isExecuted ? "3" : "2"}
                className={cn(
                  "transition-all duration-300",
                  interactive && "cursor-pointer hover:stroke-primary hover:stroke-[3px]",
                  node.status === 'running' && "animate-pulse"
                )}
                onClick={() => interactive && onNodeClick?.(node)}
              />
            )
          
          case 'diamond':
            const size = 25
            const points = [
              [node.position.x, node.position.y - size],
              [node.position.x + size, node.position.y],
              [node.position.x, node.position.y + size],
              [node.position.x - size, node.position.y]
            ].map(([x, y]) => `${x},${y}`).join(' ')
            
            return (
              <polygon
                points={points}
                fill={color}
                stroke={isExecuted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isExecuted ? "3" : "2"}
                className={cn(
                  "transition-all duration-300",
                  interactive && "cursor-pointer hover:stroke-primary hover:stroke-[3px]",
                  node.status === 'running' && "animate-pulse"
                )}
                onClick={() => interactive && onNodeClick?.(node)}
              />
            )
          
          case 'hexagon':
            const hexSize = 22
            const hexPoints = []
            for (let i = 0; i < 6; i++) {
              const angle = (i * Math.PI) / 3
              const x = node.position.x + hexSize * Math.cos(angle)
              const y = node.position.y + hexSize * Math.sin(angle)
              hexPoints.push(`${x},${y}`)
            }
            
            return (
              <polygon
                points={hexPoints.join(' ')}
                fill={color}
                stroke={isExecuted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isExecuted ? "3" : "2"}
                className={cn(
                  "transition-all duration-300",
                  interactive && "cursor-pointer hover:stroke-primary hover:stroke-[3px]",
                  node.status === 'running' && "animate-pulse"
                )}
                onClick={() => interactive && onNodeClick?.(node)}
              />
            )
          
          default:
            return (
              <rect
                x={node.position.x - 25}
                y={node.position.y - 15}
                width="50"
                height="30"
                rx="5"
                fill={color}
                stroke={isExecuted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                strokeWidth={isExecuted ? "3" : "2"}
                className={cn(
                  "transition-all duration-300",
                  interactive && "cursor-pointer hover:stroke-primary hover:stroke-[3px]",
                  node.status === 'running' && "animate-pulse"
                )}
                onClick={() => interactive && onNodeClick?.(node)}
              />
            )
        }
      })()

      return (
        <g key={node.id}>
          {nodeElement}
          <text
            x={node.position.x}
            y={node.position.y + 5}
            textAnchor="middle"
            className="text-xs font-medium fill-white pointer-events-none"
            style={{ fontSize: '10px' }}
          >
            {node.label.length > 8 ? `${node.label.slice(0, 6)}...` : node.label}
          </text>
          {node.status === 'running' && (
            <circle
              cx={node.position.x + 20}
              cy={node.position.y - 20}
              r="4"
              fill="hsl(var(--primary))"
              className="animate-ping"
            />
          )}
        </g>
      )
    }

    const renderEdge = (edge: GraphEdge) => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      if (!sourceNode || !targetNode) return null

      const isExecuted = executionPath.includes(edge.source) && executionPath.includes(edge.target)
      const isAnimated = edge.animated || isExecuted

      // Calculate arrow position
      const dx = targetNode.position.x - sourceNode.position.x
      const dy = targetNode.position.y - sourceNode.position.y
      const angle = Math.atan2(dy, dx)
      const length = Math.sqrt(dx * dx + dy * dy)
      
      // Offset for node boundaries
      const sourceOffset = 25
      const targetOffset = 25
      
      const startX = sourceNode.position.x + (sourceOffset * Math.cos(angle))
      const startY = sourceNode.position.y + (sourceOffset * Math.sin(angle))
      const endX = targetNode.position.x - (targetOffset * Math.cos(angle))
      const endY = targetNode.position.y - (targetOffset * Math.sin(angle))

      return (
        <g key={edge.id}>
          <defs>
            <marker
              id={`arrowhead-${edge.id}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={isExecuted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
              />
            </marker>
          </defs>
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={isExecuted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
            strokeWidth={isExecuted ? "3" : "2"}
            markerEnd={`url(#arrowhead-${edge.id})`}
            className={cn(
              "transition-all duration-300",
              interactive && "cursor-pointer hover:stroke-primary",
              isAnimated && "animate-pulse"
            )}
            onClick={() => interactive && onEdgeClick?.(edge)}
          />
          {edge.label && (
            <text
              x={(startX + endX) / 2}
              y={(startY + endY) / 2 - 5}
              textAnchor="middle"
              className="text-xs fill-muted-foreground pointer-events-none"
              style={{ fontSize: '9px' }}
            >
              {edge.label}
            </text>
          )}
        </g>
      )
    }

    return (
      <Card ref={ref} className={cn("relative overflow-hidden", className)}>
        {showControls && (
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            <Button size="sm" variant="outline" onClick={onPlay}>
              <Play className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={onPause}>
              <Pause className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={onStop}>
              <Square className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-3 w-3" />
          </Button>
        </div>

        <CardContent className="p-0 h-64 overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
              {edges.map(renderEdge)}
              {nodes.map(renderNode)}
            </g>
          </svg>
        </CardContent>

        {activeNode && (
          <div className="absolute bottom-2 left-2 right-2 z-10">
            <Card className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {nodes.find(n => n.id === activeNode)?.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {nodes.find(n => n.id === activeNode)?.type}
                  </div>
                </div>
                <Badge variant="outline">
                  {nodes.find(n => n.id === activeNode)?.status}
                </Badge>
              </div>
            </Card>
          </div>
        )}
      </Card>
    )
  }
)

MicroGraph.displayName = "MicroGraph"

export { MicroGraph, type GraphNode, type GraphEdge }