export interface ContentBlock {
  id: string
  type: 'text' | 'heading' | 'paragraph' | 'list' | 'quote' | 'code' | 'image' | 'video' | 'embed' | 'divider' | 'table' | 'button' | 'social-media'
  content: any
  metadata?: Record<string, any>
  platforms?: PlatformVariant[]
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface PlatformVariant {
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'web'
  content: any
  settings: PlatformSettings
  isEnabled: boolean
  optimizations?: PlatformOptimization[]
}

export interface PlatformSettings {
  characterLimit?: number
  imageSpecs?: ImageSpecs
  videoSpecs?: VideoSpecs
  hashtagLimit?: number
  mentionLimit?: number
  linkSupport?: boolean
  emojiSupport?: boolean
  formatting?: FormattingOptions
}

export interface ImageSpecs {
  maxWidth: number
  maxHeight: number
  aspectRatio?: string
  maxFileSize: number // bytes
  formats: string[]
}

export interface VideoSpecs {
  maxDuration: number // seconds
  maxFileSize: number // bytes
  formats: string[]
  dimensions?: {
    width: number
    height: number
  }
}

export interface FormattingOptions {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  links?: boolean
  lists?: boolean
  headings?: boolean
  quotes?: boolean
  code?: boolean
}

export interface PlatformOptimization {
  type: 'hashtag_suggestion' | 'mention_suggestion' | 'timing_optimization' | 'engagement_boost'
  suggestion: string
  impact: 'low' | 'medium' | 'high'
  automated?: boolean
}

export interface MediaAsset {
  id: string
  name: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  thumbnailUrl?: string
  size: number
  dimensions?: {
    width: number
    height: number
  }
  duration?: number // for video/audio
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
  tags: string[]
  alt?: string
  caption?: string
  metadata: MediaMetadata
}

export interface MediaMetadata {
  exif?: Record<string, any>
  colorPalette?: string[]
  faces?: FaceDetection[]
  objects?: ObjectDetection[]
  text?: string[] // OCR results
  sentiment?: 'positive' | 'negative' | 'neutral'
  appropriateContent?: boolean
  brandCompliance?: boolean
}

export interface FaceDetection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface ObjectDetection {
  label: string
  confidence: number
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface ContentTemplate {
  id: string
  name: string
  description: string
  category: string
  blocks: ContentBlock[]
  platforms: string[]
  tags: string[]
  isPublic: boolean
  createdBy: string
  createdAt: Date
  usageCount: number
  rating: number
}

export interface EditorState {
  blocks: ContentBlock[]
  selectedBlockId?: string
  isEditing: boolean
  hasUnsavedChanges: boolean
  version: number
  lastSaved?: Date
  collaborators: EditorCollaborator[]
  mode: 'wysiwyg' | 'markdown' | 'code'
  platform?: string // Current platform view
}

export interface EditorCollaborator {
  id: string
  name: string
  avatar?: string
  cursor?: {
    blockId: string
    position: number
  }
  selection?: {
    blockId: string
    start: number
    end: number
  }
  isActive: boolean
  lastSeen: Date
}

export interface EditorCommand {
  type: 'insert' | 'delete' | 'format' | 'move' | 'replace'
  blockId?: string
  position?: number
  data?: any
  metadata?: Record<string, any>
}

export interface ContentValidation {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ContentSuggestion[]
}

export interface ValidationError {
  blockId: string
  type: 'character_limit' | 'format_not_supported' | 'missing_required' | 'invalid_content'
  message: string
  platform?: string
}

export interface ValidationWarning {
  blockId: string
  type: 'performance' | 'accessibility' | 'engagement' | 'compliance'
  message: string
  suggestion?: string
  platform?: string
}

export interface ContentSuggestion {
  blockId: string
  type: 'hashtag' | 'mention' | 'emoji' | 'timing' | 'format' | 'media'
  suggestion: string
  reason: string
  confidence: number
  platform?: string
}

export interface EditorTools {
  formatting: FormattingTool[]
  insertion: InsertionTool[]
  media: MediaTool[]
  platform: PlatformTool[]
}

export interface FormattingTool {
  id: string
  name: string
  icon: string
  shortcut?: string
  command: string
  isActive?: boolean
  isDisabled?: boolean
}

export interface InsertionTool {
  id: string
  name: string
  icon: string
  blockType: ContentBlock['type']
  template?: Partial<ContentBlock>
}

export interface MediaTool {
  id: string
  name: string
  icon: string
  acceptedTypes: string[]
  maxSize: number
  features: string[]
}

export interface PlatformTool {
  id: string
  platform: string
  name: string
  icon: string
  settings: PlatformSettings
  isEnabled: boolean
}

// Text formatting types
export interface TextFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontFamily?: string
  link?: {
    url: string
    text: string
    openInNewTab: boolean
  }
}

export interface TextSelection {
  start: number
  end: number
  text: string
  blockId: string
}

// Table types
export interface TableData {
  rows: TableRow[]
  columns: TableColumn[]
  settings: TableSettings
}

export interface TableRow {
  id: string
  cells: TableCell[]
}

export interface TableCell {
  id: string
  content: string
  format?: TextFormat
  colSpan?: number
  rowSpan?: number
}

export interface TableColumn {
  id: string
  width?: number
  alignment: 'left' | 'center' | 'right'
}

export interface TableSettings {
  hasHeader: boolean
  hasFooter: boolean
  bordered: boolean
  striped: boolean
  compact: boolean
}

// List types
export interface ListData {
  type: 'ordered' | 'unordered' | 'checklist'
  items: ListItem[]
  settings: ListSettings
}

export interface ListItem {
  id: string
  content: string
  format?: TextFormat
  checked?: boolean // for checklist
  indent: number
  children?: ListItem[]
}

export interface ListSettings {
  style?: string // bullet style for unordered, number style for ordered
  startNumber?: number // for ordered lists
  tight?: boolean // spacing between items
}

// Button types
export interface ButtonData {
  text: string
  url: string
  style: 'primary' | 'secondary' | 'outline' | 'text'
  size: 'small' | 'medium' | 'large'
  alignment: 'left' | 'center' | 'right'
  openInNewTab: boolean
  tracking?: {
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
  }
}

// Social media specific types
export interface SocialMediaData {
  platform: string
  embedCode?: string
  url?: string
  preview?: {
    title: string
    description: string
    image: string
    author: string
  }
}

// Export/Import types
export interface ExportOptions {
  format: 'html' | 'markdown' | 'json' | 'pdf' | 'docx'
  platforms: string[]
  includeMetadata: boolean
  includeMedia: boolean
  template?: string
}

export interface ImportOptions {
  format: 'html' | 'markdown' | 'json' | 'docx'
  preserveFormatting: boolean
  extractMedia: boolean
  platform?: string
}

// Auto-save and version control
export interface AutoSaveConfig {
  enabled: boolean
  interval: number // seconds
  maxVersions: number
  compressOldVersions: boolean
}

export interface ContentVersion {
  id: string
  number: number
  content: ContentBlock[]
  createdBy: string
  createdAt: Date
  description?: string
  size: number
  isAutoSave: boolean
}