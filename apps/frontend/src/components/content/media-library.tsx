"use client"

import React, { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Upload, 
  Image, 
  Video, 
  File, 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Trash2, 
  Edit, 
  Tag, 
  Calendar,
  User,
  FileType,
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MoreHorizontal,
  FolderPlus,
  Folder,
  Star,
  Copy,
  ExternalLink
} from 'lucide-react'
import { MediaAsset } from '@/types/content-editor'

interface MediaLibraryProps {
  assets?: MediaAsset[]
  onAssetSelect?: (asset: MediaAsset) => void
  onAssetUpload?: (files: File[]) => void
  onAssetDelete?: (assetId: string) => void
  onAssetUpdate?: (assetId: string, updates: Partial<MediaAsset>) => void
  allowMultiSelect?: boolean
  acceptedTypes?: string[]
  maxFileSize?: number // in bytes
  viewMode?: 'grid' | 'list'
  className?: string
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  assets = [],
  onAssetSelect,
  onAssetUpload,
  onAssetDelete,
  onAssetUpdate,
  allowMultiSelect = false,
  acceptedTypes = ['image/*', 'video/*', 'audio/*'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  viewMode: initialViewMode = 'grid',
  className
}) => {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [showFilters, setShowFilters] = useState(false)
  const [editingAsset, setEditingAsset] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Get all unique tags from assets
  const allTags = Array.from(new Set(assets.flatMap(asset => asset.tags)))

  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!asset.name.toLowerCase().includes(query) && 
            !asset.tags.some(tag => tag.toLowerCase().includes(query))) {
          return false
        }
      }

      // Tag filter
      if (selectedTags.size > 0) {
        if (!asset.tags.some(tag => selectedTags.has(tag))) {
          return false
        }
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

  const handleAssetSelect = useCallback((asset: MediaAsset) => {
    if (allowMultiSelect) {
      setSelectedAssets(prev => {
        const newSet = new Set(prev)
        if (newSet.has(asset.id)) {
          newSet.delete(asset.id)
        } else {
          newSet.add(asset.id)
        }
        return newSet
      })
    } else {
      onAssetSelect?.(asset)
    }
  }, [allowMultiSelect, onAssetSelect])

  const handleFileUpload = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Validate files
    const validFiles = fileArray.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${formatFileSize(maxFileSize)}.`)
        return false
      }
      
      if (!acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0]
          return file.type.startsWith(category)
        }
        return file.type === type
      })) {
        alert(`File ${file.name} is not an accepted file type.`)
        return false
      }
      
      return true
    })

    if (validFiles.length > 0) {
      onAssetUpload?.(validFiles)
    }
  }, [maxFileSize, acceptedTypes, onAssetUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  const getAssetIcon = (asset: MediaAsset) => {
    switch (asset.type) {
      case 'image':
        return <Image className="h-4 w-4" />
      case 'video':
        return <Video className="h-4 w-4" />
      case 'audio':
        return <Volume2 className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const renderAssetGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredAssets.map(asset => (
        <Card
          key={asset.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selectedAssets.has(asset.id) && "ring-2 ring-primary"
          )}
          onClick={() => handleAssetSelect(asset)}
        >
          <CardContent className="p-2">
            <div className="aspect-square relative mb-2 overflow-hidden rounded">
              {asset.type === 'image' ? (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.alt || asset.name}
                  className="w-full h-full object-cover"
                />
              ) : asset.type === 'video' ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  {getAssetIcon(asset)}
                </div>
              )}
              
              {/* Asset type badge */}
              <Badge className="absolute top-1 right-1 text-xs">
                {asset.type}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium truncate" title={asset.name}>
                {asset.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(asset.size)}
              </p>
              {asset.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {asset.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {asset.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{asset.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderAssetList = () => (
    <div className="space-y-2">
      {filteredAssets.map(asset => (
        <Card
          key={asset.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-sm",
            selectedAssets.has(asset.id) && "ring-2 ring-primary"
          )}
          onClick={() => handleAssetSelect(asset)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Thumbnail */}
              <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded">
                {asset.type === 'image' ? (
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.alt || asset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    {getAssetIcon(asset)}
                  </div>
                )}
              </div>
              
              {/* Asset info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate">{asset.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {asset.type}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(asset.size)}</span>
                  {asset.dimensions && (
                    <span>{asset.dimensions.width} × {asset.dimensions.height}</span>
                  )}
                  <span>{new Date(asset.uploadedAt).toLocaleDateString()}</span>
                </div>
                
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Download className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderUploadArea = () => (
    <Card 
      ref={dropZoneRef}
      className="border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <CardContent className="p-8">
        <div className="text-center space-y-4">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Upload Media</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click to browse
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span>Accepted: {acceptedTypes.join(', ')}</span>
            <span>•</span>
            <span>Max size: {formatFileSize(maxFileSize)}</span>
          </div>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleFileUpload(e.target.files)
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Media Library</h2>
          <p className="text-sm text-muted-foreground">
            {filteredAssets.length} of {assets.length} assets
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-')
              setSortBy(field as any)
              setSortOrder(order as any)
            }}
            className="px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-desc">Largest first</option>
            <option value="size-asc">Smallest first</option>
          </select>
        </div>

        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={selectedTags.has(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTags(prev => {
                            const newSet = new Set(prev)
                            if (newSet.has(tag)) {
                              newSet.delete(tag)
                            } else {
                              newSet.add(tag)
                            }
                            return newSet
                          })
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {(selectedTags.size > 0 || searchQuery) && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedTags(new Set())
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Area */}
      {renderUploadArea()}

      {/* Assets Grid/List */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileType className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No assets found</h3>
            <p className="text-muted-foreground">
              {assets.length === 0 
                ? "Upload your first media file to get started"
                : "Try adjusting your search or filter criteria"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          {viewMode === 'grid' ? renderAssetGrid() : renderAssetList()}
        </div>
      )}

      {/* Selection Summary */}
      {selectedAssets.size > 0 && allowMultiSelect && (
        <Card className="border-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedAssets.size} asset{selectedAssets.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy URLs
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedAssets(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MediaLibrary