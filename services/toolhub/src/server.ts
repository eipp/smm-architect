import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import './config/sentry'; // Initialize Sentry
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { ingestRoutes } from './routes/ingest';
import { vectorRoutes } from './routes/vector';
import { simulateRoutes } from './routes/simulate';
import { renderRoutes } from './routes/render';
import { oauthRoutes } from './routes/oauth';
import { socialPostingRoutes } from './routes/social-posting';
import { dsrRoutes } from './routes/dsr';
// Mock implementations for development
class VaultClient {
  constructor(config: any) {}
  async getHealth() { return { initialized: true, sealed: false }; }
  async isAuthenticated() { return true; }
}

function checkDatabaseHealth() {
  return Promise.resolve({ status: 'healthy' });
}

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/toolhub.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Vault client for health checks
const vaultClient = new VaultClient({
  address: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN
});

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
  message: {
    code: 'RATE_LIMITED',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  const healthChecks = {
    database: 'unknown',
    vectorDb: 'unknown',
    vault: 'unknown'
  };

  // Check database health
  try {
    const dbHealth = await checkDatabaseHealth();
    healthChecks.database = dbHealth.status;
  } catch (error) {
    healthChecks.database = 'unhealthy';
    logger.warn('Database health check failed', { error: error instanceof Error ? error.message : error });
  }

  // Check Vault health
  try {
    const vaultHealth = await vaultClient.getHealth();
    const isAuthenticated = await vaultClient.isAuthenticated();
    healthChecks.vault = vaultHealth.initialized && !vaultHealth.sealed && isAuthenticated ? 'healthy' : 'unhealthy';
  } catch (error) {
    healthChecks.vault = 'unhealthy';
    logger.warn('Vault health check failed', { error: error instanceof Error ? error.message : error });
  }

  // Vector DB health check (simplified)
  try {
    // For now, assume healthy if we can reach this point
    // In production, would check actual vector database connection
    healthChecks.vectorDb = 'healthy';
  } catch (error) {
    healthChecks.vectorDb = 'unhealthy';
  }

  const overallStatus = Object.values(healthChecks).every(status => status === 'healthy') ? 'healthy' : 'degraded';

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    checks: healthChecks
  });
});

// Apply authentication middleware to all routes except health
app.use('/api', authMiddleware);

// API routes
app.use('/api/ingest', ingestRoutes);
app.use('/api/vector', vectorRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/render', renderRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/social', socialPostingRoutes);
app.use('/api/dsr', dsrRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`ToolHub service started on port ${PORT}`);
  logger.info('Environment:', {
    nodeEnv: process.env.NODE_ENV,
    logLevel: logger.level,
    corsOrigins: process.env.ALLOWED_ORIGINS
  });
});

export default app;