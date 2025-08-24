import crypto from 'crypto';
import { StorageProvider } from '../types';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Storage Service for secure audit bundle storage
 * Supports S3, Google Cloud Storage, and local file system
 */
export class StorageService implements StorageProvider {
  private provider: 's3' | 'gcs' | 'local';
  private config: any;
  private encryptionKey?: Buffer;

  constructor(provider: 's3' | 'gcs' | 'local', config: any = {}) {
    this.provider = provider;
    this.config = config;
    
    // Initialize encryption key if encryption is enabled
    if (config.encryptionEnabled) {
      this.encryptionKey = config.encryptionKey || crypto.randomBytes(32);
    }
  }

  /**
   * Store audit bundle data
   */
  async store(bundleId: string, data: Buffer): Promise<string> {
    let processedData = data;

    // Compress data if enabled
    if (this.config.compressionEnabled) {
      processedData = await gzip(processedData);
    }

    // Encrypt data if enabled
    if (this.config.encryptionEnabled && this.encryptionKey) {
      processedData = this.encrypt(processedData);
    }

    switch (this.provider) {
      case 's3':
        return this.storeToS3(bundleId, processedData);
      case 'gcs':
        return this.storeToGCS(bundleId, processedData);
      case 'local':
        return this.storeToLocal(bundleId, processedData);
      default:
        throw new Error(`Unsupported storage provider: ${this.provider}`);
    }
  }

  /**
   * Retrieve audit bundle data
   */
  async retrieve(bundleId: string): Promise<Buffer> {
    let data: Buffer;

    switch (this.provider) {
      case 's3':
        data = await this.retrieveFromS3(bundleId);
        break;
      case 'gcs':
        data = await this.retrieveFromGCS(bundleId);
        break;
      case 'local':
        data = await this.retrieveFromLocal(bundleId);
        break;
      default:
        throw new Error(`Unsupported storage provider: ${this.provider}`);
    }

    // Decrypt data if encrypted
    if (this.config.encryptionEnabled && this.encryptionKey) {
      data = this.decrypt(data);
    }

    // Decompress data if compressed
    if (this.config.compressionEnabled) {
      data = await gunzip(data);
    }

    return data;
  }

  /**
   * Delete audit bundle
   */
  async delete(bundleId: string): Promise<void> {
    switch (this.provider) {
      case 's3':
        return this.deleteFromS3(bundleId);
      case 'gcs':
        return this.deleteFromGCS(bundleId);
      case 'local':
        return this.deleteFromLocal(bundleId);
      default:
        throw new Error(`Unsupported storage provider: ${this.provider}`);
    }
  }

  /**
   * Check if bundle exists
   */
  async exists(bundleId: string): Promise<boolean> {
    try {
      switch (this.provider) {
        case 's3':
          return this.existsInS3(bundleId);
        case 'gcs':
          return this.existsInGCS(bundleId);
        case 'local':
          return this.existsInLocal(bundleId);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * List stored bundles
   */
  async list(prefix?: string): Promise<string[]> {
    switch (this.provider) {
      case 's3':
        return this.listFromS3(prefix);
      case 'gcs':
        return this.listFromGCS(prefix);
      case 'local':
        return this.listFromLocal(prefix);
      default:
        throw new Error(`Unsupported storage provider: ${this.provider}`);
    }
  }

  // S3 Implementation
  private async storeToS3(bundleId: string, data: Buffer): Promise<string> {
    // Mock implementation - in production, use AWS SDK
    const key = this.generateS3Key(bundleId);
    
    // Simulate S3 upload
    console.log(`Mock S3 upload: ${key}, size: ${data.length} bytes`);
    
    return `s3://${this.config.bucket}/${key}`;
  }

  private async retrieveFromS3(bundleId: string): Promise<Buffer> {
    // Mock implementation - in production, use AWS SDK
    const mockData = Buffer.from(`Mock S3 data for ${bundleId}`);
    return mockData;
  }

  private async deleteFromS3(bundleId: string): Promise<void> {
    const key = this.generateS3Key(bundleId);
    console.log(`Mock S3 delete: ${key}`);
  }

  private async existsInS3(bundleId: string): Promise<boolean> {
    // Mock implementation
    return true;
  }

  private async listFromS3(prefix?: string): Promise<string[]> {
    // Mock implementation
    return [`bundle-1`, `bundle-2`, `bundle-3`];
  }

  private generateS3Key(bundleId: string): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `audit-bundles/${date}/${bundleId}.json.gz`;
  }

  // Google Cloud Storage Implementation
  private async storeToGCS(bundleId: string, data: Buffer): Promise<string> {
    // Mock implementation - in production, use Google Cloud Storage client
    const filename = this.generateGCSFilename(bundleId);
    
    console.log(`Mock GCS upload: ${filename}, size: ${data.length} bytes`);
    
    return `gs://${this.config.bucket}/${filename}`;
  }

  private async retrieveFromGCS(bundleId: string): Promise<Buffer> {
    const mockData = Buffer.from(`Mock GCS data for ${bundleId}`);
    return mockData;
  }

  private async deleteFromGCS(bundleId: string): Promise<void> {
    const filename = this.generateGCSFilename(bundleId);
    console.log(`Mock GCS delete: ${filename}`);
  }

  private async existsInGCS(bundleId: string): Promise<boolean> {
    return true;
  }

  private async listFromGCS(prefix?: string): Promise<string[]> {
    return [`bundle-1`, `bundle-2`, `bundle-3`];
  }

  private generateGCSFilename(bundleId: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `audit-bundles/${date}/${bundleId}.json.gz`;
  }

  // Local File System Implementation
  private async storeToLocal(bundleId: string, data: Buffer): Promise<string> {
    const filename = this.generateLocalPath(bundleId);
    const directory = path.dirname(filename);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(filename, data);
    
    return filename;
  }

  private async retrieveFromLocal(bundleId: string): Promise<Buffer> {
    const filename = this.generateLocalPath(bundleId);
    return await fs.readFile(filename);
  }

  private async deleteFromLocal(bundleId: string): Promise<void> {
    const filename = this.generateLocalPath(bundleId);
    await fs.unlink(filename);
  }

  private async existsInLocal(bundleId: string): Promise<boolean> {
    try {
      const filename = this.generateLocalPath(bundleId);
      await fs.access(filename);
      return true;
    } catch {
      return false;
    }
  }

  private async listFromLocal(prefix?: string): Promise<string[]> {
    const baseDir = this.config.basePath || './audit-bundles';
    
    try {
      const files = await this.listFilesRecursively(baseDir);
      const bundleIds = files
        .filter(file => file.endsWith('.json.gz'))
        .map(file => path.basename(file, '.json.gz'))
        .filter(id => !prefix || id.startsWith(prefix));
      
      return bundleIds;
    } catch {
      return [];
    }
  }

  private async listFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  private generateLocalPath(bundleId: string): string {
    const baseDir = this.config.basePath || './audit-bundles';
    const date = new Date().toISOString().split('T')[0];
    return path.join(baseDir, date, `${bundleId}.json.gz`);
  }

  // Encryption/Decryption utilities
  private encrypt(data: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Prepend IV and auth tag to encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decrypt(encryptedData: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not available');
    }

    const algorithm = 'aes-256-gcm';
    const iv = encryptedData.subarray(0, 16);
    const authTag = encryptedData.subarray(16, 32);
    const encrypted = encryptedData.subarray(32);
    
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalBundles: number;
    totalSizeBytes: number;
    oldestBundle: string | null;
    newestBundle: string | null;
  }> {
    const bundles = await this.list();
    
    let totalSizeBytes = 0;
    let oldestBundle: string | null = null;
    let newestBundle: string | null = null;
    
    // In a real implementation, we'd calculate actual sizes
    totalSizeBytes = bundles.length * 50000; // Mock: ~50KB per bundle
    
    if (bundles.length > 0) {
      oldestBundle = bundles[0];
      newestBundle = bundles[bundles.length - 1];
    }
    
    return {
      totalBundles: bundles.length,
      totalSizeBytes,
      oldestBundle,
      newestBundle
    };
  }

  /**
   * Archive old bundles based on retention policy
   */
  async archiveOldBundles(retentionDays: number): Promise<{
    archived: number;
    errors: string[];
  }> {
    const allBundles = await this.list();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    let archived = 0;
    const errors: string[] = [];
    
    for (const bundleId of allBundles) {
      try {
        // Parse date from bundle ID (assuming format includes timestamp)
        const bundleDate = this.extractDateFromBundleId(bundleId);
        
        if (bundleDate && bundleDate < cutoffDate) {
          // In a real implementation, move to archive storage instead of deleting
          await this.delete(bundleId);
          archived++;
        }
      } catch (error) {
        errors.push(`Failed to archive ${bundleId}: ${error.message}`);
      }
    }
    
    return { archived, errors };
  }

  private extractDateFromBundleId(bundleId: string): Date | null {
    // Attempt to extract timestamp from bundle ID
    const timestampMatch = bundleId.match(/(\d{13,})/); // Look for timestamp
    if (timestampMatch) {
      return new Date(parseInt(timestampMatch[1]));
    }
    return null;
  }
}