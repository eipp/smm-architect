import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AuditBundleAssembler } from './services/audit-bundle-assembler';
import { KMSManager } from './kms/kms-manager';
import { StorageService } from './services/storage-service';
import {
  BundleAssemblyRequest,
  BundleVerificationRequest,
  AuditBundleConfig
} from './types';

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration
const config: AuditBundleConfig = {
  kms: {
    provider: (process.env.KMS_PROVIDER as any) || 'local',
    config: {
      keyId: process.env.KMS_KEY_ID || 'default-signing-key',
      region: process.env.AWS_REGION || 'us-east-1'
    }
  },
  storage: {
    provider: (process.env.STORAGE_PROVIDER as any) || 'local',
    config: {
      bucket: process.env.STORAGE_BUCKET || 'audit-bundles',
      basePath: process.env.STORAGE_BASE_PATH || './audit-bundles',
      compressionEnabled: process.env.COMPRESSION_ENABLED === 'true',
      encryptionEnabled: process.env.ENCRYPTION_ENABLED === 'true'
    }
  },
  retention: {
    defaultRetentionDays: parseInt(process.env.RETENTION_DAYS || '365'),
    archiveAfterDays: parseInt(process.env.ARCHIVE_AFTER_DAYS || '90'),
    deleteAfterDays: parseInt(process.env.DELETE_AFTER_DAYS || '2555') // 7 years
  },
  signing: {
    defaultKeyId: process.env.DEFAULT_KEY_ID || 'workspace-signing-key-v1',
    requireMultipleSignatures: process.env.REQUIRE_MULTIPLE_SIGNATURES === 'true',
    allowedSigners: process.env.ALLOWED_SIGNERS?.split(',') || ['system']
  },
  compression: {
    enabled: process.env.COMPRESSION_ENABLED === 'true',
    algorithm: 'gzip',
    level: parseInt(process.env.COMPRESSION_LEVEL || '6')
  },
  encryption: {
    enabled: process.env.ENCRYPTION_ENABLED === 'true',
    algorithm: 'aes-256-gcm',
    keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '90')
  }
};

// Initialize services
const kmsManager = new KMSManager({
  provider: config.kms.provider,
  config: config.kms.config
});
const storageService = new StorageService(config.storage.provider, config.storage.config);
const assembler = new AuditBundleAssembler(kmsManager, storageService, config);

// Authentication middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // In production, validate JWT token against Vault or your auth service
  if (token === 'invalid') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Add user context to request
  (req as any).user = {
    id: 'user-123',
    email: 'user@example.com',
    roles: ['audit_user']
  };
  
  next();
};

// Apply authentication to all routes except health check
app.use(['/bundles', '/verify', '/keys'], authenticate);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      kms: config.kms.provider,
      storage: config.storage.provider
    }
  });
});

// Create audit bundle
app.post('/bundles', async (req: express.Request, res: express.Response) => {
  try {
    const request: BundleAssemblyRequest = req.body;
    
    // Validate request
    if (!request.workspaceId || !request.bundleType || !request.title) {
      return res.status(400).json({
        error: 'Missing required fields: workspaceId, bundleType, title'
      });
    }
    
    // Add user context
    const user = (req as any).user;
    const assemblyResult = await assembler.assembleBundle({
      ...request,
      metadata: {
        ...request.metadata,
        createdBy: user.id,
        createdByEmail: user.email
      }
    });
    
    res.status(201).json(assemblyResult);
    
  } catch (error) {
    console.error('Bundle assembly failed:', error);
    res.status(500).json({
      error: 'Failed to assemble audit bundle',
      details: error.message
    });
  }
});

// Get audit bundle
app.get('/bundles/:bundleId', async (req: express.Request, res: express.Response) => {
  try {
    const { bundleId } = req.params;
    const includeEvidence = req.query.includeEvidence === 'true';
    
    const bundle = await assembler.getBundle(bundleId, includeEvidence);
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    res.json(bundle);
    
  } catch (error) {
    console.error('Bundle retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to retrieve audit bundle',
      details: error.message
    });
  }
});

// List audit bundles
app.get('/bundles', async (req: express.Request, res: express.Response) => {
  try {
    const {
      workspaceId,
      bundleType,
      limit = '50',
      offset = '0',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const bundles = await assembler.listBundles({
      workspaceId: workspaceId as string,
      bundleType: bundleType as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    
    res.json(bundles);
    
  } catch (error) {
    console.error('Bundle listing failed:', error);
    res.status(500).json({
      error: 'Failed to list audit bundles',
      details: error.message
    });
  }
});

// Verify audit bundle
app.post('/verify', async (req: express.Request, res: express.Response) => {
  try {
    const request: BundleVerificationRequest = req.body;
    
    if (!request.bundleId) {
      return res.status(400).json({ error: 'bundleId is required' });
    }
    
    const user = (req as any).user;
    const verification = await assembler.verifyBundle(request.bundleId, {
      verifySignatures: request.verifySignatures !== false,
      verifyIntegrity: request.verifyIntegrity !== false,
      verifyCompliance: request.verifyCompliance !== false,
      verifiedBy: user.id
    });
    
    res.json(verification);
    
  } catch (error) {
    console.error('Bundle verification failed:', error);
    res.status(500).json({
      error: 'Failed to verify audit bundle',
      details: error.message
    });
  }
});

// GET endpoint for bundle verification (for easy testing)
app.get('/bundles/:bundleId/verify', async (req: express.Request, res: express.Response) => {
  try {
    const { bundleId } = req.params;
    const {
      verifySignatures = 'true',
      verifyIntegrity = 'true', 
      verifyCompliance = 'true'
    } = req.query;
    
    const user = (req as any).user;
    const verification = await assembler.verifyBundle(bundleId, {
      verifySignatures: verifySignatures === 'true',
      verifyIntegrity: verifyIntegrity === 'true',
      verifyCompliance: verifyCompliance === 'true',
      verifiedBy: user.id
    });
    
    res.json({
      bundleId,
      verified: verification.isValid,
      verificationResults: verification.verificationResults,
      verifiedAt: verification.verifiedAt,
      verifiedBy: verification.verifiedBy,
      kmsProvider: kmsManager.getProvider()
    });
    
  } catch (error) {
    console.error('Bundle verification failed:', error);
    res.status(500).json({
      error: 'Failed to verify audit bundle',
      details: error.message
    });
  }
});

// Delete audit bundle
app.delete('/bundles/:bundleId', async (req: express.Request, res: express.Response) => {
  try {
    const { bundleId } = req.params;
    const user = (req as any).user;
    
    // Check user permissions for deletion
    if (!user.roles.includes('audit_admin')) {
      return res.status(403).json({ error: 'Insufficient permissions for bundle deletion' });
    }
    
    await assembler.deleteBundle(bundleId);
    
    res.status(204).send();
    
  } catch (error) {
    console.error('Bundle deletion failed:', error);
    res.status(500).json({
      error: 'Failed to delete audit bundle',
      details: error.message
    });
  }
});

// Key management endpoints
app.get('/keys', async (req: express.Request, res: express.Response) => {
  try {
    const keys = await kmsManager.listKeys();
    res.json({ keys });
  } catch (error) {
    console.error('Key listing failed:', error);
    res.status(500).json({
      error: 'Failed to list keys',
      details: error.message
    });
  }
});

app.post('/keys', async (req: express.Request, res: express.Response) => {
  try {
    const { alias } = req.body;
    
    if (!alias) {
      return res.status(400).json({ error: 'Key alias is required' });
    }
    
    const user = (req as any).user;
    if (!user.roles.includes('audit_admin')) {
      return res.status(403).json({ error: 'Insufficient permissions for key creation' });
    }
    
    const keyId = await kmsManager.createKey(alias);
    
    res.status(201).json({ keyId, alias });
    
  } catch (error) {
    console.error('Key creation failed:', error);
    res.status(500).json({
      error: 'Failed to create key',
      details: error.message
    });
  }
});

app.get('/keys/:keyId/metadata', async (req: express.Request, res: express.Response) => {
  try {
    const { keyId } = req.params;
    const metadata = await kmsManager.getKeyMetadata(keyId);
    res.json(metadata);
  } catch (error) {
    console.error('Key metadata retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to get key metadata',
      details: error.message
    });
  }
});

// Storage statistics endpoint
app.get('/storage/stats', async (req: express.Request, res: express.Response) => {
  try {
    const user = (req as any).user;
    if (!user.roles.includes('audit_admin')) {
      return res.status(403).json({ error: 'Insufficient permissions for storage stats' });
    }
    
    const stats = await storageService.getStorageStats();
    res.json(stats);
  } catch (error) {
    console.error('Storage stats retrieval failed:', error);
    res.status(500).json({
      error: 'Failed to get storage statistics',
      details: error.message
    });
  }
});

// Archive old bundles endpoint
app.post('/storage/archive', async (req: express.Request, res: express.Response) => {
  try {
    const { retentionDays } = req.body;
    const user = (req as any).user;
    
    if (!user.roles.includes('audit_admin')) {
      return res.status(403).json({ error: 'Insufficient permissions for archiving' });
    }
    
    const days = retentionDays || config.retention.archiveAfterDays;
    const result = await storageService.archiveOldBundles(days);
    
    res.json(result);
  } catch (error) {
    console.error('Bundle archiving failed:', error);
    res.status(500).json({
      error: 'Failed to archive bundles',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🔐 Audit Service running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 KMS Provider: ${config.kms.provider}`);
  console.log(`💾 Storage Provider: ${config.storage.provider}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;