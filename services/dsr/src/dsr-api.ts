/**
 * Data Subject Rights (DSR) API Endpoints
 * 
 * REST API for handling GDPR/CCPA data subject rights requests:
 * - POST /dsr/export - Generate data export (Right to Access)
 * - POST /dsr/delete - Process deletion request (Right to Erasure)
 * - POST /dsr/rectify - Process rectification request (Right to Rectification)
 * - GET /dsr/status/:requestId - Check request status
 */

import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { DataSubjectRightsService, DSRRequest } from './data-subject-rights-service';
import { getPrismaClient } from '../../shared/database/client';
import { VaultClient } from '../../shared/vault-client';
import winston from 'winston';
import crypto from 'crypto';
import { promisify } from 'util';
import { pipeline } from 'stream';
import archiver from 'archiver';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'dsr-api.log' })
  ]
});

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for DSR endpoints (stricter limits)
const dsrRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 DSR requests per 15 minutes per IP
  message: {
    error: 'Too many DSR requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Initialize services
const prisma = getPrismaClient();
const vaultClient = new VaultClient({
  address: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

const dsrService = new DataSubjectRightsService(prisma, vaultClient);

// Request storage (in production, use Redis or database)
const requestStore = new Map<string, DSRRequest & { status: string; result?: any }>();

/**
 * POST /dsr/export
 * Generate data export for data subject (Right to Access - GDPR Article 15)
 */
app.post('/dsr/export',
  dsrRateLimit,
  [
    body('userId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('tenantId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('userEmail').isEmail().normalizeEmail(),
    body('requestedBy').isString().isLength({ min: 1, max: 255 }).trim(),
    body('verificationToken').optional().isString().isLength({ min: 32, max: 512 }),
    body('reason').optional().isString().isLength({ max: 1000 }).trim()
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, tenantId, userEmail, requestedBy, verificationToken, reason } = req.body;
      const requestId = `export_${crypto.randomUUID()}`;

      logger.info('DSR export request received', {
        requestId,
        userId,
        tenantId,
        userEmail,
        requestedBy,
        ip: req.ip
      });

      // Verify user identity (in production, implement proper verification)
      if (verificationToken) {
        const isValidToken = await verifyUserToken(userId, verificationToken);
        if (!isValidToken) {
          return res.status(403).json({
            error: 'Invalid verification token'
          });
        }
      }

      // Store request
      const dsrRequest: DSRRequest = {
        requestId,
        requestType: 'access',
        userId,
        tenantId,
        userEmail,
        requestedBy,
        requestedAt: new Date().toISOString(),
        reason,
        verificationToken
      };

      requestStore.set(requestId, { 
        ...dsrRequest, 
        status: 'processing' 
      });

      // Process export asynchronously
      processExportRequest(requestId, dsrRequest).catch(error => {
        logger.error('Export processing failed', { requestId, error });
        const stored = requestStore.get(requestId);
        if (stored) {
          stored.status = 'failed';
          stored.result = { error: error.message };
        }
      });

      return res.status(202).json({
        requestId,
        status: 'accepted',
        message: 'Export request accepted for processing',
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        statusUrl: `/dsr/status/${requestId}`
      });

    } catch (error) {
      logger.error('DSR export endpoint error', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip
      });

      return res.status(500).json({
        error: 'Internal server error processing export request'
      });
    }
  }
);

/**
 * POST /dsr/delete
 * Process deletion request (Right to Erasure - GDPR Article 17)
 */
app.post('/dsr/delete',
  dsrRateLimit,
  [
    body('userId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('tenantId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('userEmail').isEmail().normalizeEmail(),
    body('requestedBy').isString().isLength({ min: 1, max: 255 }).trim(),
    body('scope').optional().isIn(['user', 'tenant', 'workspace']),
    body('retentionOverride').optional().isBoolean(),
    body('verificationToken').isString().isLength({ min: 32, max: 512 }),
    body('reason').isString().isLength({ min: 10, max: 1000 }).trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        userId, 
        tenantId, 
        userEmail, 
        requestedBy, 
        scope = 'user', 
        retentionOverride = false,
        verificationToken,
        reason 
      } = req.body;
      
      const requestId = `delete_${crypto.randomUUID()}`;

      logger.info('DSR deletion request received', {
        requestId,
        userId,
        tenantId,
        userEmail,
        requestedBy,
        scope,
        ip: req.ip
      });

      // Verify user identity (CRITICAL for deletion requests)
      const isValidToken = await verifyUserToken(userId, verificationToken);
      if (!isValidToken) {
        return res.status(403).json({
          error: 'Invalid verification token. Deletion request denied.'
        });
      }

      // Additional security check for tenant/workspace scope deletions
      if (scope !== 'user') {
        const hasAdminPermission = await verifyAdminPermission(requestedBy, tenantId);
        if (!hasAdminPermission) {
          return res.status(403).json({
            error: 'Insufficient permissions for scope-level deletion'
          });
        }
      }

      const dsrRequest: DSRRequest = {
        requestId,
        requestType: 'deletion',
        userId,
        tenantId,
        userEmail,
        requestedBy,
        requestedAt: new Date().toISOString(),
        reason,
        verificationToken,
        retentionOverride
      };

      requestStore.set(requestId, { 
        ...dsrRequest, 
        status: 'processing' 
      });

      // Process deletion asynchronously
      processDeletionRequest(requestId, dsrRequest, { 
        scope, 
        retentionOverride, 
        requestedBy, 
        reason 
      }).catch(error => {
        logger.error('Deletion processing failed', { requestId, error });
        const stored = requestStore.get(requestId);
        if (stored) {
          stored.status = 'failed';
          stored.result = { error: error.message };
        }
      });

      return res.status(202).json({
        requestId,
        status: 'accepted',
        message: 'Deletion request accepted for processing',
        estimatedCompletion: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
        statusUrl: `/dsr/status/${requestId}`,
        warning: 'This action is irreversible. All data will be permanently deleted.'
      });

    } catch (error) {
      logger.error('DSR deletion endpoint error', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip
      });

      return res.status(500).json({
        error: 'Internal server error processing deletion request'
      });
    }
  }
);

/**
 * POST /dsr/rectify
 * Process rectification request (Right to Rectification - GDPR Article 16)
 */
app.post('/dsr/rectify',
  dsrRateLimit,
  [
    body('userId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('tenantId').isString().isLength({ min: 1, max: 255 }).trim(),
    body('userEmail').isEmail().normalizeEmail(),
    body('requestedBy').isString().isLength({ min: 1, max: 255 }).trim(),
    body('corrections').isObject(),
    body('verificationToken').isString().isLength({ min: 32, max: 512 }),
    body('reason').optional().isString().isLength({ max: 1000 }).trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId, tenantId, userEmail, requestedBy, corrections, verificationToken, reason } = req.body;
      const requestId = `rectify_${crypto.randomUUID()}`;

      logger.info('DSR rectification request received', {
        requestId,
        userId,
        tenantId,
        userEmail,
        requestedBy,
        correctionFields: Object.keys(corrections),
        ip: req.ip
      });

      // Verify user identity
      const isValidToken = await verifyUserToken(userId, verificationToken);
      if (!isValidToken) {
        return res.status(403).json({
          error: 'Invalid verification token'
        });
      }

      const dsrRequest: DSRRequest = {
        requestId,
        requestType: 'rectification',
        userId,
        tenantId,
        userEmail,
        requestedBy,
        requestedAt: new Date().toISOString(),
        reason,
        verificationToken
      };

      requestStore.set(requestId, { 
        ...dsrRequest, 
        status: 'processing' 
      });

      // Process rectification asynchronously
      processRectificationRequest(requestId, dsrRequest, corrections).catch(error => {
        logger.error('Rectification processing failed', { requestId, error });
        const stored = requestStore.get(requestId);
        if (stored) {
          stored.status = 'failed';
          stored.result = { error: error.message };
        }
      });

      return res.status(202).json({
        requestId,
        status: 'accepted',
        message: 'Rectification request accepted for processing',
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        statusUrl: `/dsr/status/${requestId}`
      });

    } catch (error) {
      logger.error('DSR rectification endpoint error', {
        error: error instanceof Error ? error.message : error,
        ip: req.ip
      });

      return res.status(500).json({
        error: 'Internal server error processing rectification request'
      });
    }
  }
);

/**
 * GET /dsr/status/:requestId
 * Check the status of a DSR request
 */
app.get('/dsr/status/:requestId',
  [
    param('requestId').isString().matches(/^(export|delete|rectify)_[a-f0-9-]{36}$/)
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid request ID format'
        });
      }

      const { requestId } = req.params;
      const stored = requestStore.get(requestId);

      if (!stored) {
        return res.status(404).json({
          error: 'Request not found'
        });
      }

      const response: any = {
        requestId,
        requestType: stored.requestType,
        status: stored.status,
        requestedAt: stored.requestedAt,
        lastUpdated: new Date().toISOString()
      };

      // Add result details based on status
      if (stored.status === 'completed' && stored.result) {
        if (stored.requestType === 'access') {
          response.downloadUrl = `/dsr/download/${requestId}`;
          response.dataSize = stored.result.metadata?.exportSize;
          response.recordCount = stored.result.metadata?.totalRecords;
        } else if (stored.requestType === 'deletion') {
          response.recordsDeleted = stored.result.subsystemResults?.reduce(
            (sum: number, r: any) => sum + r.recordsDeleted, 0
          );
          response.deletionReport = stored.result.integrityHash;
        } else if (stored.requestType === 'rectification') {
          response.recordsUpdated = stored.result.recordsUpdated;
        }
      } else if (stored.status === 'failed' && stored.result?.error) {
        response.error = stored.result.error;
      }

      return res.json(response);

    } catch (error) {
      logger.error('DSR status endpoint error', {
        error: error instanceof Error ? error.message : error,
        requestId: req.params.requestId
      });

      return res.status(500).json({
        error: 'Internal server error checking request status'
      });
    }
  }
);

/**
 * GET /dsr/download/:requestId
 * Download exported data (for completed export requests)
 */
app.get('/dsr/download/:requestId',
  [
    param('requestId').isString().matches(/^export_[a-f0-9-]{36}$/)
  ],
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const stored = requestStore.get(requestId);

      if (!stored || stored.requestType !== 'access' || stored.status !== 'completed') {
        return res.status(404).json({
          error: 'Export data not available'
        });
      }

      const exportData = stored.result;
      if (!exportData) {
        return res.status(404).json({
          error: 'Export data not found'
        });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="data-export-${requestId}.zip"`);

      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err) => {
        logger.error('Archive creation error', { requestId, error: err });
        res.status(500).json({ error: 'Failed to create export archive' });
      });

      archive.pipe(res);

      // Add data files to archive
      archive.append(JSON.stringify(exportData, null, 2), { name: 'personal-data.json' });
      archive.append(JSON.stringify(exportData.metadata, null, 2), { name: 'export-metadata.json' });
      
      // Add audit information
      const auditInfo = {
        exportId: exportData.exportId,
        generatedAt: exportData.generatedAt,
        requestId,
        integrityHash: exportData.metadata.integrityHash
      };
      archive.append(JSON.stringify(auditInfo, null, 2), { name: 'audit-info.json' });

      await archive.finalize();

      logger.info('Data export downloaded', {
        requestId,
        userId: stored.userId,
        ip: req.ip
      });

    } catch (error) {
      logger.error('DSR download endpoint error', {
        error: error instanceof Error ? error.message : error,
        requestId: req.params.requestId
      });

      return res.status(500).json({
        error: 'Internal server error downloading export'
      });
    }
  }
);

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: any) => {
  logger.error('Unhandled DSR API error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error'
  });
});

// Background processing functions
async function processExportRequest(requestId: string, dsrRequest: DSRRequest): Promise<void> {
  try {
    logger.info('Processing export request', { requestId });
    
    const exportData = await dsrService.generateDataExport(
      dsrRequest.userId,
      dsrRequest.tenantId
    );

    const stored = requestStore.get(requestId);
    if (stored) {
      stored.status = 'completed';
      stored.result = exportData;
    }

    logger.info('Export request completed', { 
      requestId, 
      totalRecords: exportData.metadata.totalRecords 
    });

  } catch (error) {
    logger.error('Export request processing failed', { requestId, error });
    throw error;
  }
}

async function processDeletionRequest(
  requestId: string, 
  dsrRequest: DSRRequest, 
  options: any
): Promise<void> {
  try {
    logger.info('Processing deletion request', { requestId });
    
    const deletionReport = await dsrService.processErasureRequest(
      requestId,
      dsrRequest.userId,
      dsrRequest.tenantId,
      options
    );

    const stored = requestStore.get(requestId);
    if (stored) {
      stored.status = 'completed';
      stored.result = deletionReport;
    }

    logger.info('Deletion request completed', { 
      requestId, 
      recordsDeleted: deletionReport.subsystemResults.reduce(
        (sum, r) => sum + r.recordsDeleted, 0
      )
    });

  } catch (error) {
    logger.error('Deletion request processing failed', { requestId, error });
    throw error;
  }
}

async function processRectificationRequest(
  requestId: string, 
  dsrRequest: DSRRequest, 
  corrections: any
): Promise<void> {
  try {
    logger.info('Processing rectification request', { requestId });
    
    const result = await dsrService.processRectificationRequest(
      dsrRequest.userId,
      dsrRequest.tenantId,
      corrections
    );

    const stored = requestStore.get(requestId);
    if (stored) {
      stored.status = 'completed';
      stored.result = result;
    }

    logger.info('Rectification request completed', { 
      requestId, 
      recordsUpdated: result.recordsUpdated 
    });

  } catch (error) {
    logger.error('Rectification request processing failed', { requestId, error });
    throw error;
  }
}

// Helper functions
async function verifyUserToken(userId: string, token: string): Promise<boolean> {
  try {
    // Mock verification - in production, verify against secure token store
    const expectedToken = crypto.createHash('sha256')
      .update(`${userId}:${process.env.DSR_SECRET || 'dev-secret'}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch (error) {
    logger.error('Token verification failed', { userId, error });
    return false;
  }
}

async function verifyAdminPermission(requestedBy: string, tenantId: string): Promise<boolean> {
  try {
    // Mock admin verification - in production, check against user permissions
    return true; // Placeholder
  } catch (error) {
    logger.error('Admin permission verification failed', { requestedBy, tenantId, error });
    return false;
  }
}

export default app;
