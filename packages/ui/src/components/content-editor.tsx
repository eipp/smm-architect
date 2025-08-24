"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Label } from "./label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"
import { 
  Edit3, 
  Eye, 
  Settings, 
  Image, 
  Link, 
  Hash, 
  AtSign, 
  Save,
  Check,
  AlertCircle,
  X
} from "lucide-react"

export type Platform = 'linkedin' | 'twitter' | 'facebook' | 'instagram'

export interface CallToAction {
  type: 'link' | 'shop' | 'learn_more' | 'contact' | 'download'
  text: string
  url: string
  tracking?: {
    utm_source: string
    utm_medium: string
    utm_campaign: string
  }
}

export interface MediaAsset {
  id: string
  type: 'image' | 'video' | 'gif'
  url: string
  thumbnail?: string
  altText: string
  caption?: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
}

export interface PlatformContent {
  platform: Platform
  text?: string
  characterLimit: number
  hashtags?: string[]
  platformFields: Record<string, any>
  scheduling?: {
    publishAt?: Date
    timezone: string
    optimalTimes?: Date[]
  }
}

export interface StructuredContent {
  id: string
  type: 'post' | 'story' | 'video' | 'carousel'
  title: string
  baseContent: {
    text: string
    hashtags: string[]
    mentions: string[]
    cta?: CallToAction
  }
  platformVariants: Record<Platform, PlatformContent>
  attachments: MediaAsset[]
  accessibility: {
    altText: Record<string, string>
    captions?: string
    audioDescription?: string
  }
  metadata: {
    templateId?: string
    industry?: string
    audience?: string
    contentPillars?: string[]
  }
}

export interface ContentEditorProps {
  initialContent?: StructuredContent
  onSave: (content: StructuredContent) => void
  className?: string
}

const platformLimits: Record<Platform, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200
}

const platformIcons: Record<Platform, string> = {
  twitter: "𝕏",
  linkedin: "💼", 
  facebook: "📘",
  instagram: "📷"
}

const createEmptyContent = (): StructuredContent => ({
  id: `content-${Date.now()}`,
  type: 'post',
  title: '',
  baseContent: {
    text: '',
    hashtags: [],
    mentions: [],
  },
  platformVariants: {
    linkedin: {
      platform: 'linkedin',
      characterLimit: platformLimits.linkedin,
      platformFields: {}
    },
    twitter: {
      platform: 'twitter', 
      characterLimit: platformLimits.twitter,
      platformFields: {}
    },
    facebook: {
      platform: 'facebook',
      characterLimit: platformLimits.facebook,
      platformFields: {}
    },
    instagram: {
      platform: 'instagram',
      characterLimit: platformLimits.instagram,
      platformFields: {}
    }
  },
  attachments: [],
  accessibility: {
    altText: {}
  },
  metadata: {}
})

const ContentEditor = React.forwardRef<HTMLDivElement, ContentEditorProps>(
  ({ initialContent, onSave, className }, ref) => {
    const [content, setContent] = React.useState<StructuredContent>(
      initialContent || createEmptyContent()
    )
    const [activeTab, setActiveTab] = React.useState<'editor' | 'preview' | 'variants'>('editor')
    const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>('linkedin')
    const [isDirty, setIsDirty] = React.useState(false)

    const updateContent = React.useCallback((updates: Partial<StructuredContent>) => {
      setContent(prev => ({ ...prev, ...updates }))
      setIsDirty(true)
    }, [])

    const handleSave = React.useCallback(() => {
      onSave(content)
      setIsDirty(false)
    }, [content, onSave])

    const validateContent = React.useCallback(() => {
      const errors: string[] = []
      
      if (!content.title.trim()) {
        errors.push('Title is required')
      }
      
      if (!content.baseContent.text.trim()) {
        errors.push('Content text is required')
      }

      return errors
    }, [content])

    const errors = validateContent()
    const isValid = errors.length === 0

    return (
      <div ref={ref} className={cn("structured-editor h-full flex flex-col", className)}>
        {/* Editor Header */}
        <div className="editor-header border-b p-4 bg-background">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4 items-center">
              <h2 className="text-xl font-semibold">{content.title || 'Untitled Post'}</h2>
              <Badge variant="outline">{content.type}</Badge>
              {isDirty && <Badge variant="warning">Unsaved</Badge>}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => validateContent()}
                disabled={!isDirty}
              >
                {isValid ? <Check className="mr-2 h-4 w-4" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                Validate
              </Button>
              <Button onClick={handleSave} disabled={!isDirty || !isValid}>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as any)} className="mt-4">
            <TabsList>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Platform Variants
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="editor-body flex-1 overflow-auto">
          <TabsContent value="editor" className="h-full p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Main Editor */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Post Title</Label>
                  <Input
                    id="title"
                    value={content.title}
                    onChange={(e) => updateContent({ title: e.target.value })}
                    placeholder="Enter post title..."
                    className={!content.title.trim() ? 'border-destructive' : ''}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <div className="relative">
                    <textarea
                      id="content"
                      value={content.baseContent.text}
                      onChange={(e) => updateContent({
                        baseContent: { ...content.baseContent, text: e.target.value }
                      })}
                      placeholder="Write your content here..."
                      className={cn(
                        "w-full min-h-[200px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring",
                        !content.baseContent.text.trim() ? 'border-destructive' : 'border-input'
                      )}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {content.baseContent.text.length} characters
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <HashtagInput
                    value={content.baseContent.hashtags}
                    onChange={(hashtags) => updateContent({
                      baseContent: { ...content.baseContent, hashtags }
                    })}
                  />
                  <MentionInput
                    value={content.baseContent.mentions}
                    onChange={(mentions) => updateContent({
                      baseContent: { ...content.baseContent, mentions }
                    })}
                  />
                </div>
                
                <CTAEditor
                  cta={content.baseContent.cta}
                  onChange={(cta) => updateContent({
                    baseContent: { ...content.baseContent, cta }
                  })}
                />
              </div>
              
              {/* Media & Metadata */}
              <div className="space-y-6">
                <MediaAttachments
                  attachments={content.attachments}
                  onChange={(attachments) => updateContent({ attachments })}
                />
                
                <AccessibilityFields
                  accessibility={content.accessibility}
                  attachments={content.attachments}
                  onChange={(accessibility) => updateContent({ accessibility })}
                />
                
                <ContentMetadata
                  metadata={content.metadata}
                  onChange={(metadata) => updateContent({ metadata })}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="h-full p-6">
            <PlatformPreview
              content={content}
              platform={selectedPlatform}
              onPlatformChange={setSelectedPlatform}
            />
          </TabsContent>
          
          <TabsContent value="variants" className="h-full p-6">
            <PlatformVariantsEditor
              content={content}
              onChange={(updates) => updateContent(updates)}
            />
          </TabsContent>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="border-t bg-destructive/10 p-4">
            <h4 className="font-medium text-destructive mb-2">Validation Errors:</h4>
            <ul className="list-disc list-inside text-sm text-destructive space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
)
ContentEditor.displayName = "ContentEditor"

// Helper Components
const HashtagInput: React.FC<{
  value: string[]
  onChange: (hashtags: string[]) => void
}> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = React.useState('')

  const addHashtag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim().replace(/^#/, '')])
      setInputValue('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Hash className="h-4 w-4" />
        Hashtags
      </Label>
      <div className="flex space-x-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter hashtag..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addHashtag()
            }
          }}
        />
        <Button type="button" onClick={addHashtag} size="sm">Add</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            #{tag}
            <button
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const MentionInput: React.FC<{
  value: string[]
  onChange: (mentions: string[]) => void
}> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = React.useState('')

  const addMention = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim().replace(/^@/, '')])
      setInputValue('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <AtSign className="h-4 w-4" />
        Mentions
      </Label>
      <div className="flex space-x-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter mention..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addMention()
            }
          }}
        />
        <Button type="button" onClick={addMention} size="sm">Add</Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {value.map((mention, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            @{mention}
            <button
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const CTAEditor: React.FC<{
  cta?: CallToAction
  onChange: (cta?: CallToAction) => void
}> = ({ cta, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Link className="h-4 w-4" />
          Call to Action
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cta ? (
          <>
            <div className="space-y-2">
              <Label>CTA Text</Label>
              <Input
                value={cta.text}
                onChange={(e) => onChange({ ...cta, text: e.target.value })}
                placeholder="Learn More"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={cta.url}
                onChange={(e) => onChange({ ...cta, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <Button variant="outline" onClick={() => onChange(undefined)}>
              Remove CTA
            </Button>
          </>
        ) : (
          <Button onClick={() => onChange({ type: 'link', text: '', url: '' })}>
            Add Call to Action
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

const MediaAttachments: React.FC<{
  attachments: MediaAsset[]
  onChange: (attachments: MediaAsset[]) => void
}> = ({ attachments, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Image className="h-4 w-4" />
          Media Attachments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attachments.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {attachments.map((asset) => (
              <div key={asset.id} className="relative">
                <img
                  src={asset.thumbnail || asset.url}
                  alt={asset.altText}
                  className="w-full h-24 object-cover rounded border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => onChange(attachments.filter(a => a.id !== asset.id))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Drag & drop images or click to upload</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const AccessibilityFields: React.FC<{
  accessibility: StructuredContent['accessibility']
  attachments: MediaAsset[]
  onChange: (accessibility: StructuredContent['accessibility']) => void
}> = ({ accessibility, attachments, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accessibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {attachments.map((asset) => (
          <div key={asset.id} className="space-y-2">
            <Label>Alt text for {asset.type}</Label>
            <Input
              value={accessibility.altText[asset.id] || ''}
              onChange={(e) => onChange({
                ...accessibility,
                altText: { ...accessibility.altText, [asset.id]: e.target.value }
              })}
              placeholder="Describe this image for screen readers..."
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const ContentMetadata: React.FC<{
  metadata: StructuredContent['metadata']
  onChange: (metadata: StructuredContent['metadata']) => void
}> = ({ metadata, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Industry</Label>
          <Input
            value={metadata.industry || ''}
            onChange={(e) => onChange({ ...metadata, industry: e.target.value })}
            placeholder="Technology, Marketing..."
          />
        </div>
        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Input
            value={metadata.audience || ''}
            onChange={(e) => onChange({ ...metadata, audience: e.target.value })}
            placeholder="B2B decision makers..."
          />
        </div>
      </CardContent>
    </Card>
  )
}

const PlatformPreview: React.FC<{
  content: StructuredContent
  platform: Platform
  onPlatformChange: (platform: Platform) => void
}> = ({ content, platform, onPlatformChange }) => {
  const platformContent = content.platformVariants[platform]
  const displayText = platformContent.text || content.baseContent.text
  const characterCount = displayText.length
  const limit = platformContent.characterLimit
  const isOverLimit = characterCount > limit

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Platform Preview</h3>
        <div className="flex space-x-2">
          {Object.keys(content.platformVariants).map((p) => (
            <Button
              key={p}
              variant={platform === p ? "default" : "outline"}
              size="sm"
              onClick={() => onPlatformChange(p as Platform)}
            >
              {platformIcons[p as Platform]} {p}
            </Button>
          ))}
        </div>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
              SA
            </div>
            <div>
              <div className="font-semibold">SMM Architect</div>
              <div className="text-xs text-muted-foreground">Just now</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="whitespace-pre-wrap">{displayText}</p>
          
          {content.baseContent.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {content.baseContent.hashtags.map((tag) => (
                <span key={tag} className="text-primary text-sm">#{tag}</span>
              ))}
            </div>
          )}

          {content.attachments.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {content.attachments.slice(0, 4).map((asset) => (
                <img
                  key={asset.id}
                  src={asset.thumbnail || asset.url}
                  alt={asset.altText}
                  className="w-full h-24 object-cover rounded"
                />
              ))}
            </div>
          )}

          {content.baseContent.cta && (
            <Button variant="outline" size="sm" className="w-fit">
              {content.baseContent.cta.text}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between items-center text-sm">
        <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
          {characterCount} / {limit} characters
        </span>
        {isOverLimit && (
          <Badge variant="destructive">Over limit by {characterCount - limit}</Badge>
        )}
      </div>
    </div>
  )
}

const PlatformVariantsEditor: React.FC<{
  content: StructuredContent
  onChange: (updates: Partial<StructuredContent>) => void
}> = ({ content, onChange }) => {
  const updatePlatformVariant = (platform: Platform, updates: Partial<PlatformContent>) => {
    onChange({
      platformVariants: {
        ...content.platformVariants,
        [platform]: { ...content.platformVariants[platform], ...updates }
      }
    })
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Platform-Specific Content</h3>
      
      <div className="grid gap-6">
        {Object.entries(content.platformVariants).map(([platform, variant]) => (
          <Card key={platform}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {platformIcons[platform as Platform]} {platform}
                <Badge variant="outline">{variant.characterLimit} chars</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Platform-specific text (optional)</Label>
                <textarea
                  value={variant.text || ''}
                  onChange={(e) => updatePlatformVariant(platform as Platform, { text: e.target.value })}
                  placeholder={`Leave empty to use base content...`}
                  className="w-full min-h-[100px] p-3 border rounded-md resize-none"
                />
                <div className="text-xs text-muted-foreground">
                  {(variant.text || content.baseContent.text).length} / {variant.characterLimit} characters
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Platform-specific hashtags</Label>
                <Input
                  value={variant.hashtags?.join(', ') || ''}
                  onChange={(e) => updatePlatformVariant(platform as Platform, {
                    hashtags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  })}
                  placeholder="Optional platform-specific hashtags..."
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { ContentEditor, type StructuredContent, type Platform, type MediaAsset, type CallToAction }