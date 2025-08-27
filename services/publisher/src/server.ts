import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import Queue from 'bull';
import { createClient } from 'redis';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/error-handler';
import { publisherRoutes } from './routes';
import * as Sentry from '@sentry/node';
import * as SentryProfiling from '@sentry/profiling-node';

// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      SentryProfiling.nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// Setup global error handlers
setupGlobalErrorHandlers();

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json()
    }),
    new winston.transports.File({ 
      filename: 'logs/publisher-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/publisher.log' 
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 8081;

// Health check dependencies
let redisClient: any;
let publishQueue: Queue.Queue;
let server: any;

// Initialize Redis client
async function initializeRedis() {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD,
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Connected to Redis');
    });

    await redisClient.connect();
    
    // Initialize Bull queue for job processing
    publishQueue = new Queue('publish queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });

    publishQueue.on('ready', () => {
      logger.info('Publish queue is ready');
    });

    publishQueue.on('error', (error: Error) => {
      logger.error('Publish queue error:', error);
    });

  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please try again later.',
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      contentLength: res.get('Content-Length'),
    });
  });
  
  next();
});

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  const healthChecks = {
    server: 'healthy',
    redis: 'unknown',
    queue: 'unknown',
    database: 'unknown',
  };

  let overallStatus = 'healthy';

  // Check Redis health
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      healthChecks.redis = 'healthy';
    } else {
      healthChecks.redis = 'disconnected';
      overallStatus = 'degraded';
    }
  } catch (error) {
    healthChecks.redis = 'unhealthy';
    overallStatus = 'degraded';
    logger.warn('Redis health check failed', { error: error instanceof Error ? error.message : error });
  }

  // Check queue health
  try {
    if (publishQueue) {
      const waiting = await publishQueue.getWaiting();
      const active = await publishQueue.getActive();
      healthChecks.queue = 'healthy';
      (healthChecks as any).queueStats = {
        waiting: waiting.length,
        active: active.length,
      };
    } else {
      healthChecks.queue = 'not_initialized';
      overallStatus = 'degraded';
    }
  } catch (error) {
    healthChecks.queue = 'unhealthy';
    overallStatus = 'degraded';
    logger.warn('Queue health check failed', { error: error instanceof Error ? error.message : error });
  }

  // Database health check would go here
  // For now, assume healthy
  healthChecks.database = 'healthy';

  const httpStatus = overallStatus === 'healthy' ? 200 : 503;

  res.status(httpStatus).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    service: 'publisher-service',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: healthChecks,
  });
});

// Readiness probe endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    if (!redisClient || !redisClient.isOpen) {
      res.status(503).json({
        ready: false,
        message: 'Redis not ready',
      });
      return;
    }

    if (!publishQueue) {
      res.status(503).json({
        ready: false,
        message: 'Publish queue not ready',
      });
      return;
    }

    res.json({
      ready: true,
      message: 'Service is ready to accept requests',
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: 'Service not ready',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Liveness probe endpoint
app.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  // This would typically expose Prometheus metrics
  // For now, return basic metrics
  const metrics = {
    nodejs_version: process.version,
    nodejs_uptime_seconds: process.uptime(),
    nodejs_memory_usage_bytes: process.memoryUsage(),
    http_requests_total: 0, // Would be tracked
    http_request_duration_seconds: {}, // Would be tracked
  };

  res.set('Content-Type', 'text/plain');
  res.send(`# HELP nodejs_uptime_seconds Node.js uptime in seconds
# TYPE nodejs_uptime_seconds gauge
nodejs_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}
nodejs_memory_usage_bytes{type="external"} ${process.memoryUsage().external}
`);
});

// Authentication middleware for API routes
app.use('/api', authMiddleware);

// API routes
app.use('/api/publish', publisherRoutes);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async (err: Error | null) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }

    try {
      // Close queue connections
      if (publishQueue) {
        await publishQueue.close();
        logger.info('Publish queue closed');
      }

      // Close Redis connection
      if (redisClient && redisClient.isOpen) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }

      // Close Sentry
      if (process.env.SENTRY_DSN) {
        await Sentry.close(2000);
        logger.info('Sentry closed');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Initialize services and start server
async function startServer() {
  try {
    // Initialize Redis and queue
    await initializeRedis();
    
    // Start HTTP server
    server = app.listen(PORT, () => {
      logger.info(`Publisher Service started on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        logLevel: logger.level,
        corsOrigins: process.env.ALLOWED_ORIGINS,
        redisHost: process.env.REDIS_HOST,
        sentryEnabled: !!process.env.SENTRY_DSN,
      });
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export default app;

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}