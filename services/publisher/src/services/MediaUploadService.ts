import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { MediaUpload } from '../types';

export interface UploadOptions {
  workspaceId: string;
  uploadedBy: string;
  description?: string;
}

export interface MediaFilter {
  type?: string;
  limit: number;
  offset: number;
}

export interface MediaResult {
  files: MediaUpload[];
  total: number;
  hasMore: boolean;
}

export class MediaUploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnDomain?: string;

  constructor() {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.S3_BUCKET_NAME || 'smm-architect-media';
    this.cdnDomain = process.env.CDN_DOMAIN;
  }

  /**
   * Multer middleware for handling file uploads
   */
  get uploadMiddleware() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB limit
        files: 20, // Max 20 files per request
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|wmv|pdf|doc|docx|ppt|pptx)$/i;
        const allowedMimeTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-ms-wmv',
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        
        const fileExtension = allowedTypes.test(file.originalname.toLowerCase());
        const mimeType = allowedMimeTypes.includes(file.mimetype);
        
        if (fileExtension && mimeType) {
          return cb(null, true);
        } else {
          cb(new Error(`Invalid file type. Allowed: images, videos, PDF, Word, PowerPoint`));
        }
      },
    }).array('files', 20);
  }

  /**
   * Upload files to S3 and process them
   */
  async uploadFiles(files: Express.Multer.File[], options: UploadOptions): Promise<MediaUpload[]> {
    const uploadResults: MediaUpload[] = [];

    for (const file of files) {
      try {
        const mediaUpload = await this.uploadSingleFile(file, options);
        uploadResults.push(mediaUpload);
      } catch (error) {
        console.error(`Failed to upload file ${file.originalname}:`, error);
        throw new Error(`Upload failed for ${file.originalname}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return uploadResults;
  }

  /**
   * Upload a single file
   */
  private async uploadSingleFile(file: Express.Multer.File, options: UploadOptions): Promise<MediaUpload> {
    const fileId = uuidv4();
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = `${fileId}${fileExtension}`;
    const s3Key = `workspaces/${options.workspaceId}/media/${fileName}`;

    // Process image files
    let processedBuffer = file.buffer;
    let metadata: any = {};
    let thumbnailUrl: string | undefined;

    if (file.mimetype.startsWith('image/')) {
      const { processedImage, imageMetadata, thumbnail } = await this.processImage(file.buffer);
      processedBuffer = processedImage;
      metadata = imageMetadata;
      
      if (thumbnail) {
        thumbnailUrl = await this.uploadThumbnail(thumbnail, `thumbnails/${fileId}.jpg`, options.workspaceId);
      }
    } else if (file.mimetype.startsWith('video/')) {
      metadata = await this.getVideoMetadata(file.buffer);
      // Generate video thumbnail
      thumbnailUrl = await this.generateVideoThumbnail(file.buffer, fileId, options.workspaceId);
    }

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: processedBuffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        workspaceId: options.workspaceId,
        uploadedBy: options.uploadedBy,
        description: options.description || '',
      },
    });

    await this.s3Client.send(uploadCommand);

    // Generate URLs
    const url = await this.getSignedUrl(s3Key);
    const cdnUrl = this.cdnDomain ? `https://${this.cdnDomain}/${s3Key}` : url;

    const mediaUpload: MediaUpload = {
      id: fileId,
      workspaceId: options.workspaceId,
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: processedBuffer.length,
      url,
      cdnUrl,
      thumbnailUrl,
      metadata,
      uploadedAt: new Date(),
      uploadedBy: options.uploadedBy,
    };

    // Store in database
    await this.storeMediaUpload(mediaUpload);

    return mediaUpload;
  }

  /**
   * Process image files (resize, optimize, generate thumbnail)
   */
  private async processImage(buffer: Buffer): Promise<{
    processedImage: Buffer;
    imageMetadata: any;
    thumbnail: Buffer;
  }> {
    const image = sharp(buffer);
    const imageMetadata = await image.metadata();

    // Optimize image
    let processedImage = await image
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      processedImage,
      imageMetadata: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        format: imageMetadata.format,
      },
      thumbnail,
    };
  }

  /**
   * Get video metadata
   */
  private async getVideoMetadata(buffer: Buffer): Promise<any> {
    // This would typically use ffmpeg or similar
    // For now, return basic metadata
    return {
      duration: 0, // Would be extracted from video
      format: 'unknown',
      resolution: 'unknown',
    };
  }

  /**
   * Generate video thumbnail
   */
  private async generateVideoThumbnail(buffer: Buffer, fileId: string, workspaceId: string): Promise<string> {
    // This would typically use ffmpeg to extract a frame
    // For now, return a placeholder
    const thumbnailKey = `workspaces/${workspaceId}/thumbnails/${fileId}.jpg`;
    return this.cdnDomain ? `https://${this.cdnDomain}/${thumbnailKey}` : await this.getSignedUrl(thumbnailKey);
  }

  /**
   * Upload thumbnail to S3
   */
  private async uploadThumbnail(thumbnailBuffer: Buffer, thumbnailKey: string, workspaceId: string): Promise<string> {
    const s3Key = `workspaces/${workspaceId}/${thumbnailKey}`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    });

    await this.s3Client.send(uploadCommand);
    
    return this.cdnDomain ? `https://${this.cdnDomain}/${s3Key}` : await this.getSignedUrl(s3Key);
  }

  /**
   * Get signed URL for S3 object
   */
  private async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get media files for a workspace
   */
  async getWorkspaceMedia(workspaceId: string, filter: MediaFilter): Promise<MediaResult> {
    // This would query the database for media files
    // For now, return mock data
    const mockMedia: MediaUpload[] = [
      {
        id: 'media-1',
        workspaceId,
        originalName: 'example-image.jpg',
        fileName: 'media-1.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        url: 'https://example.com/media-1.jpg',
        cdnUrl: 'https://cdn.example.com/media-1.jpg',
        thumbnailUrl: 'https://cdn.example.com/thumbnails/media-1.jpg',
        metadata: { width: 1920, height: 1080, format: 'jpeg' },
        uploadedAt: new Date(Date.now() - 86400000), // 1 day ago
        uploadedBy: 'user-123',
      },
      {
        id: 'media-2',
        workspaceId,
        originalName: 'example-video.mp4',
        fileName: 'media-2.mp4',
        mimeType: 'video/mp4',
        size: 5120000,
        url: 'https://example.com/media-2.mp4',
        cdnUrl: 'https://cdn.example.com/media-2.mp4',
        thumbnailUrl: 'https://cdn.example.com/thumbnails/media-2.jpg',
        metadata: { duration: 60, format: 'mp4', resolution: '1920x1080' },
        uploadedAt: new Date(Date.now() - 43200000), // 12 hours ago
        uploadedBy: 'user-456',
      },
    ];

    // Apply filters
    let filteredMedia = mockMedia;
    if (filter.type) {
      filteredMedia = mockMedia.filter(media => {
        if (filter.type === 'image') return media.mimeType.startsWith('image/');
        if (filter.type === 'video') return media.mimeType.startsWith('video/');
        if (filter.type === 'document') return media.mimeType.startsWith('application/');
        return false;
      });
    }

    const total = filteredMedia.length;
    const paginatedMedia = filteredMedia.slice(filter.offset, filter.offset + filter.limit);
    const hasMore = filter.offset + filter.limit < total;

    return {
      files: paginatedMedia,
      total,
      hasMore,
    };
  }

  /**
   * Delete media file
   */
  async deleteMedia(mediaId: string, workspaceId: string): Promise<void> {
    // Get media info from database
    const media = await this.getMediaById(mediaId);
    if (!media || media.workspaceId !== workspaceId) {
      throw new Error('Media not found or access denied');
    }

    // Delete from S3
    const s3Key = `workspaces/${workspaceId}/media/${media.fileName}`;
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await this.s3Client.send(deleteCommand);

    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailKey = `workspaces/${workspaceId}/thumbnails/${mediaId}.jpg`;
      const deleteThumbnailCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
      });
      await this.s3Client.send(deleteThumbnailCommand);
    }

    // Remove from database
    await this.removeMediaFromDatabase(mediaId);
  }

  /**
   * Get media by ID
   */
  private async getMediaById(mediaId: string): Promise<MediaUpload | null> {
    // This would query the database
    // For now, return null
    return null;
  }

  /**
   * Store media upload in database
   */
  private async storeMediaUpload(media: MediaUpload): Promise<void> {
    // This would store in the database
    console.log('Storing media upload:', {
      id: media.id,
      workspaceId: media.workspaceId,
      fileName: media.fileName,
      mimeType: media.mimeType,
      size: media.size,
    });
  }

  /**
   * Remove media from database
   */
  private async removeMediaFromDatabase(mediaId: string): Promise<void> {
    // This would remove from the database
    console.log('Removing media from database:', mediaId);
  }

  /**
   * Generate optimized media URLs for specific platforms
   */
  async getOptimizedMediaUrl(mediaId: string, platform: string, format?: string): Promise<string> {
    const media = await this.getMediaById(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }

    // Platform-specific optimizations
    const optimizations = {
      linkedin: { width: 1200, height: 627, quality: 85 },
      twitter: { width: 1200, height: 675, quality: 85 },
      facebook: { width: 1200, height: 630, quality: 85 },
      instagram: { width: 1080, height: 1080, quality: 90 },
      tiktok: { width: 1080, height: 1920, quality: 90 },
    };

    const config = optimizations[platform as keyof typeof optimizations];
    if (!config) {
      return media.url; // Return original if no optimization config
    }

    // Generate optimized version (this would typically be cached)
    const optimizedKey = `workspaces/${media.workspaceId}/optimized/${platform}/${media.fileName}`;
    
    // Check if optimized version exists, if not create it
    // For now, return the CDN URL
    return media.cdnUrl || media.url;
  }

  /**
   * Validate file for platform requirements
   */
  validateFileForPlatform(file: Express.Multer.File, platform: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const platformLimits = {
      linkedin: { maxSize: 100 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'] },
      twitter: { maxSize: 512 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'] },
      facebook: { maxSize: 4 * 1024 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'] },
      instagram: { maxSize: 1 * 1024 * 1024 * 1024, allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'] },
      tiktok: { maxSize: 4 * 1024 * 1024 * 1024, allowedTypes: ['video/mp4'] },
    };

    const limits = platformLimits[platform as keyof typeof platformLimits];
    if (!limits) {
      errors.push(`Platform ${platform} not supported`);
      return { valid: false, errors };
    }

    if (file.size > limits.maxSize) {
      errors.push(`File size exceeds ${limits.maxSize} bytes for ${platform}`);
    }

    if (!limits.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed for ${platform}`);
    }

    return { valid: errors.length === 0, errors };
  }
}