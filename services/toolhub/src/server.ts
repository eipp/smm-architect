import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { ingestRoutes } from './routes/ingest';
import { vectorRoutes } from './routes/vector';
import { simulateRoutes } from './routes/simulate';
import { renderRoutes } from './routes/render';
import { oauthRoutes } from './routes/oauth';

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
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    checks: {
      database: 'healthy', // TODO: Implement actual health checks
      vectorDb: 'healthy',
      vault: 'healthy'
    }
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