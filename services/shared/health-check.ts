import { Request, Response } from 'express';
import Redis from 'ioredis';
import { Pool } from 'pg';

export interface HealthCheckConfig {
  serviceName: string;
  version: string;
  dependencies: {
    postgres?: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
    redis?: {
      host: string;
      port: number;
      password?: string;
    };
    externalApis?: {
      name: string;
      url: string;
      timeout: number;
    }[];
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: {
    name: string;
    version: string;
    uptime: number;
  };
  dependencies: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      error?: string;
    };
  };
}

export class HealthCheckService {
  private config: HealthCheckConfig;
  private startTime: number;
  private pgPool?: Pool;
  private redisClient?: Redis;

  constructor(config: HealthCheckConfig) {
    this.config = config;
    this.startTime = Date.now();
    
    // Initialize database connections if configured
    if (config.dependencies.postgres) {
      this.pgPool = new Pool({
        host: config.dependencies.postgres.host,
        port: config.dependencies.postgres.port,
        database: config.dependencies.postgres.database,
        user: config.dependencies.postgres.user,
        password: config.dependencies.postgres.password,
        max: 1, // Only one connection for health checks
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    if (config.dependencies.redis) {
      this.redisClient = new Redis({
        host: config.dependencies.redis.host,
        port: config.dependencies.redis.port,
        password: config.dependencies.redis.password,
        connectTimeout: 10000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
    }
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: {
        name: this.config.serviceName,
        version: this.config.version,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      },
      dependencies: {},
    };

    // Check PostgreSQL
    if (this.pgPool) {
      try {
        const start = Date.now();
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        
        result.dependencies.postgres = {
          status: 'healthy',
          responseTime: Date.now() - start,
        };
      } catch (error) {
        result.dependencies.postgres = {
          status: 'unhealthy',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        result.status = 'degraded';
      }
    }

    // Check Redis
    if (this.redisClient) {
      try {
        const start = Date.now();
        await this.redisClient.ping();
        
        result.dependencies.redis = {
          status: 'healthy',
          responseTime: Date.now() - start,
        };
      } catch (error) {
        result.dependencies.redis = {
          status: 'unhealthy',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        result.status = 'degraded';
      }
    }

    // Check external APIs
    if (this.config.dependencies.externalApis) {
      for (const api of this.config.dependencies.externalApis) {
        try {
          const start = Date.now();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), api.timeout);
          
          const response = await fetch(api.url, {
            method: 'HEAD',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          result.dependencies[api.name] = {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime: Date.now() - start,
            error: response.ok ? undefined : `HTTP ${response.status}`,
          };
          
          if (!response.ok) {
            result.status = 'degraded';
          }
        } catch (error) {
          result.dependencies[api.name] = {
            status: 'unhealthy',
            responseTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
          result.status = 'degraded';
        }
      }
    }

    // Determine overall status
    const unhealthyDeps = Object.values(result.dependencies).filter(
      dep => dep.status === 'unhealthy'
    );
    
    if (unhealthyDeps.length > 0) {
      // If more than half of dependencies are unhealthy, mark as unhealthy
      if (unhealthyDeps.length > Object.keys(result.dependencies).length / 2) {
        result.status = 'unhealthy';
      } else {
        result.status = 'degraded';
      }
    }

    return result;
  }

  async checkReadiness(): Promise<{ ready: boolean; reason?: string }> {
    try {
      const health = await this.checkHealth();
      
      // Service is ready if it's healthy or degraded (but not unhealthy)
      const ready = health.status !== 'unhealthy';
      
      return {
        ready,
        reason: ready ? undefined : 'Service dependencies are unhealthy',
      };
    } catch (error) {
      return {
        ready: false,
        reason: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  healthHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.checkHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: {
          name: this.config.serviceName,
          version: this.config.version,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
        },
        dependencies: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  readinessHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const readiness = await this.checkReadiness();
      
      if (readiness.ready) {
        res.status(200).json({ ready: true });
      } else {
        res.status(503).json({ ready: false, reason: readiness.reason });
      }
    } catch (error) {
      res.status(503).json({
        ready: false,
        reason: error instanceof Error ? error.message : 'Readiness check failed',
      });
    }
  };

  livenessHandler = async (req: Request, res: Response): Promise<void> => {
    // Liveness check is simple - just check if the service is running
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    });
  };

  async shutdown(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.redisClient) {
      this.redisClient.disconnect();
    }
  }
}

// Express middleware factory
export function createHealthCheckMiddleware(config: HealthCheckConfig) {
  const healthCheck = new HealthCheckService(config);
  
  return {
    healthCheck,
    routes: {
      health: healthCheck.healthHandler,
      ready: healthCheck.readinessHandler,
      live: healthCheck.livenessHandler,
    },
  };
}