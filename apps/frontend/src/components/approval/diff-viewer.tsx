"use client"

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Settings,
  MessageCircle,
  Plus,
  Minus,
  RotateCcw
} from 'lucide-react'
import { DiffChunk, DiffLine, DiffOptions, WorkflowComment } from '@/types/approval'

interface DiffViewerProps {
  oldContent: any
  newContent: any
  oldVersion?: string
  newVersion?: string
  comments?: WorkflowComment[]
  onCommentAdd?: (lineNumber: number, content: string) => void
  onCommentReply?: (commentId: string, content: string) => void
  className?: string
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  oldVersion = 'Previous',
  newVersion = 'Current', 
  comments = [],
  onCommentAdd,
  onCommentReply,
  className
}) => {
  const [options, setOptions] = useState<DiffOptions>({
    showLineNumbers: true,
    showInlineChanges: true,
    contextLines: 3,
    wordWrap: false,
    theme: 'light'
  })
  
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side')
  const [showComments, setShowComments] = useState(true)
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set())
  const [newCommentLine, setNewCommentLine] = useState<number | null>(null)
  const [commentText, setCommentText] = useState('')

  // Generate diff chunks from content comparison
  const diffChunks = useMemo((): DiffChunk[] => {
    return generateDiff(oldContent, newContent, options.contextLines)
  }, [oldContent, newContent, options.contextLines])

  const toggleChunk = (chunkIndex: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev)
      if (next.has(chunkIndex)) {
        next.delete(chunkIndex)
      } else {
        next.add(chunkIndex)
      }
      return next
    })
  }

  const handleAddComment = async (lineNumber: number) => {
    if (!commentText.trim()) return
    
    await onCommentAdd?.(lineNumber, commentText)
    setCommentText('')
    setNewCommentLine(null)
  }

  const getLineComments = (lineNumber: number) => {
    return comments.filter(comment => comment.lineNumber === lineNumber)
  }

  const renderLineNumber = (number?: number) => {
    if (!options.showLineNumbers || number === undefined) return null
    
    return (
      <span className="inline-block w-12 text-right pr-2 text-xs text-muted-foreground select-none">
        {number}
      </span>
    )
  }

  const renderLine = (line: DiffLine, chunkIndex: number, lineIndex: number) => {
    const lineComments = getLineComments(line.newNumber || line.oldNumber || 0)
    const hasComments = lineComments.length > 0
    const globalLineNumber = line.newNumber || line.oldNumber || 0

    return (
      <div key={`${chunkIndex}-${lineIndex}`} className="group">
        <div 
          className={cn(
            "flex items-center hover:bg-muted/50 relative",
            line.type === 'added' && "bg-green-50 border-l-2 border-green-500",
            line.type === 'removed' && "bg-red-50 border-l-2 border-red-500",
            line.highlight && "bg-yellow-100",
            hasComments && "border-l-2 border-blue-500"
          )}
        >
          {/* Line numbers */}
          <div className="flex shrink-0">
            {viewMode === 'side-by-side' ? (
              <>
                {renderLineNumber(line.oldNumber)}
                {renderLineNumber(line.newNumber)}
              </>
            ) : (
              renderLineNumber(line.newNumber || line.oldNumber)
            )}
          </div>

          {/* Change indicator */}
          <span className="w-6 text-center shrink-0 text-xs">
            {line.type === 'added' && <Plus className="h-3 w-3 text-green-600 mx-auto" />}
            {line.type === 'removed' && <Minus className="h-3 w-3 text-red-600 mx-auto" />}
          </span>

          {/* Line content */}
          <pre className={cn(
            "flex-1 text-sm font-mono px-2 py-1 overflow-x-auto",
            !options.wordWrap && "whitespace-nowrap"
          )}>
            <code>{line.content}</code>
          </pre>

          {/* Comment indicator and add button */}
          <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasComments && (
              <Badge variant="secondary" className="text-xs">
                {lineComments.length}
              </Badge>
            )}
            {onCommentAdd && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setNewCommentLine(globalLineNumber)}
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Inline comments */}
        {showComments && hasComments && (
          <div className="ml-20 border-l-2 border-blue-200 pl-4 py-2 bg-blue-50/50">
            {lineComments.map(comment => (
              <div key={comment.id} className="mb-3 last:mb-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{comment.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                      {comment.type !== 'comment' && (
                        <Badge variant="outline" className="text-xs">
                          {comment.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{comment.content}</p>
                    
                    {comment.replies.length > 0 && (
                      <div className="mt-2 pl-4 border-l border-border space-y-2">
                        {comment.replies.map(reply => (
                          <div key={reply.id}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{reply.author.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(reply.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs mt-1"
                      onClick={() => {/* Handle reply */}}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New comment form */}
        {newCommentLine === globalLineNumber && (
          <div className="ml-20 border-l-2 border-primary pl-4 py-2 bg-primary/5">
            <div className="space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 text-sm border border-border rounded resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAddComment(globalLineNumber)}
                  disabled={!commentText.trim()}
                >
                  Comment
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setNewCommentLine(null)
                    setCommentText('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderChunk = (chunk: DiffChunk, chunkIndex: number) => {
    const isExpanded = expandedChunks.has(chunkIndex)
    const addedLines = chunk.lines.filter(line => line.type === 'added').length
    const removedLines = chunk.lines.filter(line => line.type === 'removed').length

    return (
      <div key={chunkIndex} className="border border-border rounded-lg mb-4">
        {/* Chunk header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleChunk(chunkIndex)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            
            <span className="text-sm font-mono">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            {addedLines > 0 && (
              <span className="text-green-600">+{addedLines}</span>
            )}
            {removedLines > 0 && (
              <span className="text-red-600">-{removedLines}</span>
            )}
          </div>
        </div>

        {/* Chunk content */}
        {isExpanded && (
          <div className="divide-y divide-border">
            {chunk.lines.map((line, lineIndex) => renderLine(line, chunkIndex, lineIndex))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Comparing {oldVersion} → {newVersion}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowComments(!showComments)}
            >
              {showComments ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
              Comments
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewMode(viewMode === 'side-by-side' ? 'unified' : 'side-by-side')}
            >
              {viewMode === 'side-by-side' ? 'Unified' : 'Side by Side'}
            </Button>
            
            <Button size="sm" variant="outline">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{diffChunks.length} changed sections</span>
          <span>{comments.length} comments</span>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {diffChunks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No differences found between versions
              </div>
            ) : (
              diffChunks.map((chunk, index) => renderChunk(chunk, index))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Utility function to generate diff chunks (simplified implementation)
function generateDiff(oldContent: any, newContent: any, contextLines: number): DiffChunk[] {
  // This is a simplified diff implementation
  // In a real application, you'd use a proper diff library like diff or jsdiff
  
  const oldLines = JSON.stringify(oldContent, null, 2).split('\n')
  const newLines = JSON.stringify(newContent, null, 2).split('\n')
  
  const chunks: DiffChunk[] = []
  let currentChunk: DiffChunk | null = null
  
  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]
    
    let lineType: 'unchanged' | 'added' | 'removed' | 'modified' = 'unchanged'
    
    if (oldLine === undefined) {
      lineType = 'added'
    } else if (newLine === undefined) {
      lineType = 'removed'
    } else if (oldLine !== newLine) {
      lineType = 'modified'
    }
    
    if (lineType !== 'unchanged') {
      if (!currentChunk) {
        currentChunk = {
          type: 'modified',
          oldStart: Math.max(0, i - contextLines),
          newStart: Math.max(0, i - contextLines),
          oldLines: 0,
          newLines: 0,
          lines: []
        }
        
        // Add context lines before the change
        for (let j = Math.max(0, i - contextLines); j < i; j++) {
          if (oldLines[j] !== undefined) {
            currentChunk.lines.push({
              type: 'unchanged',
              oldNumber: j + 1,
              newNumber: j + 1,
              content: oldLines[j]
            })
            currentChunk.oldLines!++
            currentChunk.newLines!++
          }
        }
      }
      
      if (lineType === 'added') {
        currentChunk.lines.push({
          type: 'added',
          newNumber: i + 1,
          content: newLine
        })
        currentChunk.newLines!++
      } else if (lineType === 'removed') {
        currentChunk.lines.push({
          type: 'removed',
          oldNumber: i + 1,
          content: oldLine
        })
        currentChunk.oldLines!++
      } else {
        // Modified line - show as removed + added
        currentChunk.lines.push({
          type: 'removed',
          oldNumber: i + 1,
          content: oldLine
        })
        currentChunk.lines.push({
          type: 'added',
          newNumber: i + 1,
          content: newLine
        })
        currentChunk.oldLines!++
        currentChunk.newLines!++
      }
    } else if (currentChunk) {
      // Add context lines after the change
      currentChunk.lines.push({
        type: 'unchanged',
        oldNumber: i + 1,
        newNumber: i + 1,
        content: oldLine
      })
      currentChunk.oldLines!++
      currentChunk.newLines!++
      
      // Check if we've added enough context lines
      const lastChangeIndex = currentChunk.lines.findLastIndex(line => line.type !== 'unchanged')
      const contextAfterChange = currentChunk.lines.length - lastChangeIndex - 1
      
      if (contextAfterChange >= contextLines) {
        chunks.push(currentChunk)
        currentChunk = null
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}

export default DiffViewer