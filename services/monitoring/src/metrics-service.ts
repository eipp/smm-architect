import express from 'express';
import promClient from 'prom-client';
import winston from 'winston';
import { checkDatabaseHealth } from '../shared/database/client';
import { VaultClient } from '../shared/vault-client';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Initialize Prometheus metrics
const register = new promClient.Registry();

// Add default Node.js metrics
promClient.collectDefaultMetrics({ register });

// Custom application metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'smm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'smm_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

const activeWorkspaces = new promClient.Gauge({
  name: 'smm_active_workspaces_total',
  help: 'Number of active workspaces',
  labelNames: ['tenant_id', 'environment']
});

const simulationDuration = new promClient.Histogram({
  name: 'smm_simulation_duration_seconds',
  help: 'Duration of Monte Carlo simulations',
  labelNames: ['workspace_id', 'iterations'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600]
});

const simulationReadinessScore = new promClient.Histogram({
  name: 'smm_simulation_readiness_score',
  help: 'Campaign readiness scores from simulations',
  labelNames: ['workspace_id', 'tenant_id'],
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
});

const agentExecutionDuration = new promClient.Histogram({
  name: 'smm_agent_execution_duration_seconds',
  help: 'Duration of agent executions',
  labelNames: ['agent_type', 'workspace_id', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1200]
});

const modelUsageCost = new promClient.Counter({
  name: 'smm_model_usage_cost_usd_total',
  help: 'Total cost of model usage in USD',
  labelNames: ['model_id', 'agent_type', 'workspace_id']
});

const vaultOperations = new promClient.Counter({
  name: 'smm_vault_operations_total',
  help: 'Total Vault operations',
  labelNames: ['operation', 'status']
});

const databaseConnections = new promClient.Gauge({
  name: 'smm_database_connections_active',
  help: 'Number of active database connections'
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'smm_database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

const auditBundleSignatures = new promClient.Counter({
  name: 'smm_audit_bundle_signatures_total',
  help: 'Total number of audit bundle signatures',
  labelNames: ['kms_provider', 'workspace_id', 'status']
});

const contentIngestionJobs = new promClient.Gauge({
  name: 'smm_content_ingestion_jobs_active',
  help: 'Number of active content ingestion jobs',
  labelNames: ['status', 'content_type']
});

const vectorOperations = new promClient.Counter({
  name: 'smm_vector_operations_total',
  help: 'Total vector database operations',
  labelNames: ['operation', 'provider', 'status']
});

const infrastructureResources = new promClient.Gauge({
  name: 'smm_infrastructure_resources_total',
  help: 'Number of infrastructure resources by type',
  labelNames: ['resource_type', 'provider', 'workspace_id']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeWorkspaces);
register.registerMetric(simulationDuration);
register.registerMetric(simulationReadinessScore);
register.registerMetric(agentExecutionDuration);
register.registerMetric(modelUsageCost);
register.registerMetric(vaultOperations);
register.registerMetric(databaseConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(auditBundleSignatures);
register.registerMetric(contentIngestionJobs);
register.registerMetric(vectorOperations);
register.registerMetric(infrastructureResources);

// Health check metrics
const serviceHealth = new promClient.Gauge({
  name: 'smm_service_health',
  help: 'Health status of services (1 = healthy, 0 = unhealthy)',
  labelNames: ['service', 'component']
});

register.registerMetric(serviceHealth);

// Express middleware for request metrics
export function createMetricsMiddleware(serviceName: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      
      httpRequestDuration
        .labels(req.method, route, res.statusCode.toString(), serviceName)
        .observe(duration);
      
      httpRequestTotal
        .labels(req.method, route, res.statusCode.toString(), serviceName)
        .inc();
    });
    
    next();
  };
}

// Metrics collection functions
export const metrics = {
  // Workspace metrics
  setActiveWorkspaces(tenantId: string, environment: string, count: number) {
    activeWorkspaces.labels(tenantId, environment).set(count);
  },

  // Simulation metrics
  recordSimulationDuration(workspaceId: string, iterations: number, duration: number) {
    simulationDuration.labels(workspaceId, iterations.toString()).observe(duration);
  },

  recordReadinessScore(workspaceId: string, tenantId: string, score: number) {
    simulationReadinessScore.labels(workspaceId, tenantId).observe(score);
  },

  // Agent metrics
  recordAgentExecution(agentType: string, workspaceId: string, status: string, duration: number) {
    agentExecutionDuration.labels(agentType, workspaceId, status).observe(duration);
  },

  recordModelUsage(modelId: string, agentType: string, workspaceId: string, cost: number) {
    modelUsageCost.labels(modelId, agentType, workspaceId).inc(cost);
  },

  // Vault metrics
  recordVaultOperation(operation: string, status: string) {
    vaultOperations.labels(operation, status).inc();
  },

  // Database metrics
  setDatabaseConnections(count: number) {
    databaseConnections.set(count);
  },

  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    databaseQueryDuration.labels(queryType, table).observe(duration);
  },

  // Audit metrics
  recordAuditSignature(kmsProvider: string, workspaceId: string, status: string) {
    auditBundleSignatures.labels(kmsProvider, workspaceId, status).inc();
  },

  // Content metrics
  setIngestionJobs(status: string, contentType: string, count: number) {
    contentIngestionJobs.labels(status, contentType).set(count);
  },

  recordVectorOperation(operation: string, provider: string, status: string) {
    vectorOperations.labels(operation, provider, status).inc();
  },

  // Infrastructure metrics
  setInfrastructureResources(resourceType: string, provider: string, workspaceId: string, count: number) {
    infrastructureResources.labels(resourceType, provider, workspaceId).set(count);
  },

  // Health metrics
  setServiceHealth(service: string, component: string, healthy: boolean) {
    serviceHealth.labels(service, component).set(healthy ? 1 : 0);
  }
};

// Health check service
export class HealthCheckService {
  private vaultClient: VaultClient;

  constructor() {
    this.vaultClient = new VaultClient();
  }

  async checkAllServices(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
      lastCheck: Date;
    }>;
  }> {
    const services: Record<string, any> = {};
    
    // Check database
    try {
      const dbHealth = await checkDatabaseHealth();
      services.database = {
        status: dbHealth.status,
        latency: dbHealth.latency,
        error: dbHealth.error,
        lastCheck: new Date()
      };
      metrics.setServiceHealth('smm-architect', 'database', dbHealth.status === 'healthy');
    } catch (error) {
      services.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      metrics.setServiceHealth('smm-architect', 'database', false);
    }

    // Check Vault
    try {
      const startTime = Date.now();
      const vaultHealth = await this.vaultClient.getHealth();
      const latency = Date.now() - startTime;
      
      // Also check if we can authenticate
      const isAuthenticated = await this.vaultClient.isAuthenticated();
      
      services.vault = {
        status: vaultHealth.initialized && vaultHealth.sealed === false && isAuthenticated ? 'healthy' : 'unhealthy',
        latency,
        lastCheck: new Date(),
        details: {
          initialized: vaultHealth.initialized,
          sealed: vaultHealth.sealed,
          standby: vaultHealth.standby,
          version: vaultHealth.version,
          authenticated: isAuthenticated
        }
      };
      metrics.setServiceHealth('smm-architect', 'vault', services.vault.status === 'healthy');
      
      // Record vault operation for metrics
      metrics.recordVaultOperation('health-check', services.vault.status === 'healthy' ? 'success' : 'failure');
      
    } catch (error) {
      services.vault = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
      metrics.setServiceHealth('smm-architect', 'vault', false);
      metrics.recordVaultOperation('health-check', 'failure');
    }

    // Check external services (simplified)
    const externalServices = ['toolhub', 'simulator', 'agents', 'audit', 'workspace-provisioning'];
    
    for (const service of externalServices) {
      try {
        const healthUrl = `http://${service}:${this.getServicePort(service)}/health`;
        const response = await fetch(healthUrl, { timeout: 5000 } as any);
        
        services[service] = {
          status: response.ok ? 'healthy' : 'unhealthy',
          lastCheck: new Date()
        };
        metrics.setServiceHealth('smm-architect', service, response.ok);
      } catch (error) {
        services[service] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Connection failed',
          lastCheck: new Date()
        };
        metrics.setServiceHealth('smm-architect', service, false);
      }
    }

    // Determine overall health
    const healthyCount = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalCount = Object.keys(services).length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      overall = 'healthy';
    } else if (healthyCount > totalCount / 2) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    return { overall, services };
  }

  private getServicePort(service: string): number {
    const ports = {
      'toolhub': 3001,
      'simulator': 3002,
      'agents': 3003,
      'audit': 3004,
      'workspace-provisioning': 3006
    };
    return ports[service as keyof typeof ports] || 3000;
  }
}

// Metrics collection server
export function createMetricsServer(): express.Application {
  const app = express();
  const healthCheck = new HealthCheckService();

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Failed to generate metrics', { error: error instanceof Error ? error.message : error });
      res.status(500).end('Failed to generate metrics');
    }
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const health = await healthCheck.checkAllServices();
      
      const statusCode = health.overall === 'healthy' ? 200 : 
                        health.overall === 'degraded' ? 503 : 500;
      
      res.status(statusCode).json({
        status: health.overall,
        timestamp: new Date().toISOString(),
        services: health.services
      });
    } catch (error) {
      logger.error('Health check failed', { error: error instanceof Error ? error.message : error });
      
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check service failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed service health endpoint
  app.get('/health/:service', async (req, res) => {
    try {
      const health = await healthCheck.checkAllServices();
      const service = req.params.service;
      
      if (!health.services[service]) {
        return res.status(404).json({ error: 'Service not found' });
      }
      
      res.json({
        service,
        ...health.services[service]
      });
    } catch (error) {
      logger.error('Service health check failed', { 
        service: req.params.service,
        error: error instanceof Error ? error.message : error 
      });
      
      res.status(500).json({
        error: 'Service health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  return app;
}

// Background metrics collection
export function startMetricsCollection() {
  const healthCheck = new HealthCheckService();
  
  // Collect health metrics every 30 seconds
  setInterval(async () => {
    try {
      await healthCheck.checkAllServices();
    } catch (error) {
      logger.warn('Background health check failed', {
        error: error instanceof Error ? error.message : error
      });
    }
  }, 30000);
  
  logger.info('Started background metrics collection');
}

export { register as metricsRegistry };
export default { metrics, createMetricsMiddleware, createMetricsServer, startMetricsCollection };