"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Link,
  Image,
  Video,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Save,
  Eye,
  Smartphone,
  Monitor,
  Settings,
  Plus,
  Trash2,
  GripVertical,
  MoreHorizontal
} from 'lucide-react'
import { 
  ContentBlock, 
  EditorState, 
  TextFormat, 
  PlatformVariant,
  MediaAsset,
  EditorTools
} from '@/types/content-editor'

interface ContentEditorProps {
  initialContent?: ContentBlock[]
  platforms?: string[]
  onSave?: (content: ContentBlock[]) => void
  onAutoSave?: (content: ContentBlock[]) => void
  autoSaveInterval?: number
  readOnly?: boolean
  collaborativeMode?: boolean
  className?: string
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  initialContent = [],
  platforms = ['web', 'facebook', 'instagram', 'twitter', 'linkedin'],
  onSave,
  onAutoSave,
  autoSaveInterval = 30000,
  readOnly = false,
  collaborativeMode = false,
  className
}) => {
  const [editorState, setEditorState] = useState<EditorState>({
    blocks: initialContent,
    selectedBlockId: undefined,
    isEditing: false,
    hasUnsavedChanges: false,
    version: 1,
    collaborators: [],
    mode: 'wysiwyg',
    platform: 'web'
  })

  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0])
  const [showToolbar, setShowToolbar] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  
  const editorRef = useRef<HTMLDivElement>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout>()

  // Auto-save functionality
  useEffect(() => {
    if (editorState.hasUnsavedChanges && onAutoSave) {
      autoSaveTimerRef.current = setTimeout(() => {
        onAutoSave(editorState.blocks)
        setEditorState(prev => ({ 
          ...prev, 
          hasUnsavedChanges: false, 
          lastSaved: new Date() 
        }))
      }, autoSaveInterval)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [editorState.hasUnsavedChanges, editorState.blocks, onAutoSave, autoSaveInterval])

  const addBlock = useCallback((type: ContentBlock['type'], position?: number) => {
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: getDefaultContentForType(type),
      order: position ?? editorState.blocks.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      platforms: platforms.map(platform => ({
        platform: platform as any,
        content: getDefaultContentForType(type),
        settings: getDefaultPlatformSettings(platform),
        isEnabled: true
      }))
    }

    setEditorState(prev => ({
      ...prev,
      blocks: position !== undefined 
        ? [...prev.blocks.slice(0, position), newBlock, ...prev.blocks.slice(position)]
        : [...prev.blocks, newBlock],
      selectedBlockId: newBlock.id,
      hasUnsavedChanges: true
    }))
  }, [editorState.blocks, platforms])

  const updateBlock = useCallback((blockId: string, updates: Partial<ContentBlock>) => {
    setEditorState(prev => ({
      ...prev,
      blocks: prev.blocks.map(block => 
        block.id === blockId 
          ? { ...block, ...updates, updatedAt: new Date() }
          : block
      ),
      hasUnsavedChanges: true
    }))
  }, [])

  const deleteBlock = useCallback((blockId: string) => {
    setEditorState(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== blockId),
      selectedBlockId: prev.selectedBlockId === blockId ? undefined : prev.selectedBlockId,
      hasUnsavedChanges: true
    }))
  }, [])

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setEditorState(prev => {
      const blocks = [...prev.blocks]
      const currentIndex = blocks.findIndex(block => block.id === blockId)
      
      if (currentIndex === -1) return prev
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      if (newIndex < 0 || newIndex >= blocks.length) return prev
      
      [blocks[currentIndex], blocks[newIndex]] = [blocks[newIndex], blocks[currentIndex]]
      
      return {
        ...prev,
        blocks,
        hasUnsavedChanges: true
      }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!onSave) return
    
    setIsLoading(true)
    try {
      await onSave(editorState.blocks)
      setEditorState(prev => ({ 
        ...prev, 
        hasUnsavedChanges: false, 
        lastSaved: new Date() 
      }))
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [editorState.blocks, onSave])

  const renderToolbar = () => (
    <div className="flex items-center justify-between p-3 border-b bg-muted/50">
      <div className="flex items-center gap-2">
        {/* Text formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={Bold} onClick={() => {}} tooltip="Bold" />
          <ToolbarButton icon={Italic} onClick={() => {}} tooltip="Italic" />
          <ToolbarButton icon={Underline} onClick={() => {}} tooltip="Underline" />
          <ToolbarButton icon={Strikethrough} onClick={() => {}} tooltip="Strikethrough" />
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Alignment */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={AlignLeft} onClick={() => {}} tooltip="Align Left" />
          <ToolbarButton icon={AlignCenter} onClick={() => {}} tooltip="Align Center" />
          <ToolbarButton icon={AlignRight} onClick={() => {}} tooltip="Align Right" />
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Lists and formatting */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={List} onClick={() => addBlock('list')} tooltip="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => addBlock('list')} tooltip="Numbered List" />
          <ToolbarButton icon={Quote} onClick={() => addBlock('quote')} tooltip="Quote" />
          <ToolbarButton icon={Code} onClick={() => addBlock('code')} tooltip="Code Block" />
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Media */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={Image} onClick={() => addBlock('image')} tooltip="Insert Image" />
          <ToolbarButton icon={Video} onClick={() => addBlock('video')} tooltip="Insert Video" />
          <ToolbarButton icon={Link} onClick={() => {}} tooltip="Insert Link" />
          <ToolbarButton icon={Table} onClick={() => addBlock('table')} tooltip="Insert Table" />
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* History */}
        <div className="flex items-center gap-1">
          <ToolbarButton icon={Undo} onClick={() => {}} tooltip="Undo" />
          <ToolbarButton icon={Redo} onClick={() => {}} tooltip="Redo" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Platform selector */}
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          className="text-sm border border-border rounded px-2 py-1"
        >
          {platforms.map(platform => (
            <option key={platform} value={platform}>
              {platform.charAt(0).toUpperCase() + platform.slice(1)}
            </option>
          ))}
        </select>
        
        {/* View mode toggle */}
        <div className="flex border border-border rounded">
          <Button
            size="sm"
            variant={viewMode === 'edit' ? 'default' : 'ghost'}
            onClick={() => setViewMode('edit')}
            className="rounded-r-none"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            onClick={() => setViewMode('preview')}
            className="rounded-l-none"
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
        </div>
        
        {/* Save button */}
        <Button onClick={handleSave} disabled={!editorState.hasUnsavedChanges || isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )

  const renderBlock = (block: ContentBlock, index: number) => {
    const isSelected = block.id === editorState.selectedBlockId
    const platformVariant = block.platforms?.find(p => p.platform === selectedPlatform)
    
    return (
      <div
        key={block.id}
        className={cn(
          "group relative border border-transparent rounded-lg transition-colors",
          isSelected && "border-primary bg-primary/5",
          !readOnly && "hover:border-border"
        )}
        onClick={() => setEditorState(prev => ({ ...prev, selectedBlockId: block.id }))}
      >
        {/* Block controls */}
        {!readOnly && (
          <div className="absolute left-0 top-0 transform -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-1 mr-2">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <GripVertical className="h-3 w-3" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  // Show block menu
                }}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Block content */}
        <div className="p-4">
          {renderBlockContent(block, platformVariant)}
        </div>

        {/* Block actions */}
        {!readOnly && isSelected && (
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                deleteBlock(block.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Add block button */}
        {!readOnly && (
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 rounded-full bg-background"
              onClick={(e) => {
                e.stopPropagation()
                // Show add block menu
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const renderBlockContent = (block: ContentBlock, platformVariant?: PlatformVariant) => {
    const content = platformVariant?.content ?? block.content

    switch (block.type) {
      case 'text':
      case 'paragraph':
        return (
          <div
            contentEditable={!readOnly}
            suppressContentEditableWarning
            className="outline-none focus:ring-1 focus:ring-primary rounded p-2 min-h-[2rem]"
            onBlur={(e) => {
              updateBlock(block.id, { content: e.currentTarget.innerHTML })
            }}
            dangerouslySetInnerHTML={{ __html: content || 'Start typing...' }}
          />
        )

      case 'heading':
        const level = content?.level || 1
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
        return (
          <HeadingTag
            contentEditable={!readOnly}
            suppressContentEditableWarning
            className={cn(
              "outline-none focus:ring-1 focus:ring-primary rounded p-2 font-bold",
              level === 1 && "text-3xl",
              level === 2 && "text-2xl",
              level === 3 && "text-xl",
              level === 4 && "text-lg",
              level === 5 && "text-base",
              level === 6 && "text-sm"
            )}
            onBlur={(e) => {
              updateBlock(block.id, { 
                content: { ...content, text: e.currentTarget.textContent }
              })
            }}
          >
            {content?.text || `Heading ${level}`}
          </HeadingTag>
        )

      case 'image':
        return (
          <div className="space-y-2">
            {content?.url ? (
              <img
                src={content.url}
                alt={content.alt || ''}
                className="max-w-full h-auto rounded border"
              />
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload image</p>
              </div>
            )}
            {!readOnly && (
              <Input
                placeholder="Alt text (optional)"
                value={content?.alt || ''}
                onChange={(e) => {
                  updateBlock(block.id, {
                    content: { ...content, alt: e.target.value }
                  })
                }}
              />
            )}
          </div>
        )

      case 'list':
        const isOrdered = content?.type === 'ordered'
        const ListTag = isOrdered ? 'ol' : 'ul'
        return (
          <ListTag className={cn("space-y-1", isOrdered && "list-decimal list-inside", !isOrdered && "list-disc list-inside")}>
            {(content?.items || []).map((item: any, index: number) => (
              <li key={index} className="outline-none focus:ring-1 focus:ring-primary rounded p-1">
                {item.content || `List item ${index + 1}`}
              </li>
            ))}
            {!readOnly && (
              <li className="text-muted-foreground italic">Click to add item...</li>
            )}
          </ListTag>
        )

      case 'quote':
        return (
          <blockquote
            contentEditable={!readOnly}
            suppressContentEditableWarning
            className="border-l-4 border-primary pl-4 italic outline-none focus:ring-1 focus:ring-primary rounded p-2"
            onBlur={(e) => {
              updateBlock(block.id, { content: e.currentTarget.textContent })
            }}
          >
            {content || 'Enter your quote here...'}
          </blockquote>
        )

      case 'code':
        return (
          <pre
            contentEditable={!readOnly}
            suppressContentEditableWarning
            className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto outline-none focus:ring-1 focus:ring-primary"
            onBlur={(e) => {
              updateBlock(block.id, { content: e.currentTarget.textContent })
            }}
          >
            {content || '// Enter your code here...'}
          </pre>
        )

      case 'divider':
        return <Separator className="my-4" />

      default:
        return (
          <div className="text-muted-foreground italic">
            Unsupported block type: {block.type}
          </div>
        )
    }
  }

  if (viewMode === 'preview') {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Preview - {selectedPlatform}</CardTitle>
            <Button variant="outline" onClick={() => setViewMode('edit')}>
              Back to Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editorState.blocks.map((block, index) => (
              <div key={block.id}>
                {renderBlockContent(block, block.platforms?.find(p => p.platform === selectedPlatform))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showToolbar && renderToolbar()}
      
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div 
            ref={editorRef}
            className="p-4 space-y-4 min-h-full"
            onClick={() => setEditorState(prev => ({ ...prev, selectedBlockId: undefined }))}
          >
            {editorState.blocks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Type className="h-8 w-8 mx-auto mb-2" />
                <p>Start writing your content...</p>
                {!readOnly && (
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => addBlock('paragraph')}
                  >
                    Add your first block
                  </Button>
                )}
              </div>
            ) : (
              editorState.blocks.map((block, index) => renderBlock(block, index))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Status bar */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{editorState.blocks.length} blocks</span>
          {editorState.lastSaved && (
            <span>Last saved: {editorState.lastSaved.toLocaleTimeString()}</span>
          )}
          {editorState.hasUnsavedChanges && (
            <Badge variant="outline" className="text-xs">
              Unsaved changes
            </Badge>
          )}
        </div>
        
        {collaborativeMode && (
          <div className="flex items-center gap-2">
            {editorState.collaborators.map(collaborator => (
              <div key={collaborator.id} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs">{collaborator.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper component for toolbar buttons
const ToolbarButton: React.FC<{
  icon: React.ElementType
  onClick: () => void
  tooltip: string
  isActive?: boolean
}> = ({ icon: Icon, onClick, tooltip, isActive }) => (
  <Button
    size="sm"
    variant={isActive ? 'default' : 'ghost'}
    className="h-8 w-8 p-0"
    onClick={onClick}
    title={tooltip}
  >
    <Icon className="h-3 w-3" />
  </Button>
)

// Helper functions
function getDefaultContentForType(type: ContentBlock['type']) {
  switch (type) {
    case 'heading':
      return { level: 1, text: '' }
    case 'list':
      return { type: 'unordered', items: [] }
    case 'image':
      return { url: '', alt: '' }
    case 'video':
      return { url: '', title: '' }
    case 'table':
      return { rows: [], columns: [] }
    default:
      return ''
  }
}

function getDefaultPlatformSettings(platform: string) {
  const settings: Record<string, any> = {
    web: {
      characterLimit: undefined,
      formatting: {
        bold: true,
        italic: true,
        underline: true,
        links: true,
        lists: true,
        headings: true,
        quotes: true,
        code: true
      }
    },
    twitter: {
      characterLimit: 280,
      hashtagLimit: 2,
      formatting: {
        bold: false,
        italic: false,
        links: true,
        lists: false
      }
    },
    facebook: {
      characterLimit: 63206,
      formatting: {
        bold: true,
        italic: true,
        links: true,
        lists: true
      }
    },
    instagram: {
      characterLimit: 2200,
      hashtagLimit: 30,
      formatting: {
        bold: false,
        italic: false,
        links: false
      }
    },
    linkedin: {
      characterLimit: 3000,
      formatting: {
        bold: true,
        italic: true,
        links: true,
        lists: true
      }
    }
  }

  return settings[platform] || settings.web
}

export default ContentEditor