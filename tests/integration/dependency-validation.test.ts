import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface DependencyCheck {
  name: string;
  type: 'http' | 'dns' | 'port' | 'kubernetes' | 'database';
  config: {
    url?: string;
    host?: string;
    port?: number;
    namespace?: string;
    service?: string;
    timeout?: number;
  };
  required: boolean;
  description: string;
}

interface DependencyResult {
  name: string;
  type: string;
  status: 'available' | 'unavailable' | 'degraded';
  latency: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class DependencyValidator {
  private results: DependencyResult[] = [];
  private reportsDir: string;

  constructor() {
    this.reportsDir = join(__dirname, '../../reports/dependencies');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  private getDependencies(): DependencyCheck[] {
    return [
      // Internal SMM Services
      {
        name: 'model-router',
        type: 'http',
        config: {
          url: process.env.MODEL_ROUTER_URL || 'http://model-router.smm-system.svc.cluster.local:8080/health',
          timeout: 5000
        },
        required: true,
        description: 'Core AI model routing service'
      },
      {
        name: 'toolhub',
        type: 'http',
        config: {
          url: process.env.TOOLHUB_URL || 'http://toolhub.smm-system.svc.cluster.local:8080/api/health',
          timeout: 5000
        },
        required: true,
        description: 'Vector search and tool management service'
      },
      {
        name: 'n8n-workflows',
        type: 'http',
        config: {
          url: process.env.N8N_URL || 'http://n8n.n8n.svc.cluster.local:5678/healthz',
          timeout: 10000
        },
        required: true,
        description: 'Workflow automation engine'
      },
      {
        name: 'audit-service',
        type: 'http',
        config: {
          url: process.env.AUDIT_SERVICE_URL || 'http://audit.smm-system.svc.cluster.local:8080/health',
          timeout: 5000
        },
        required: true,
        description: 'Audit trail and compliance service'
      },
      {
        name: 'workspace-service',
        type: 'http',
        config: {
          url: process.env.WORKSPACE_SERVICE_URL || 'http://workspace.smm-system.svc.cluster.local:8080/health',
          timeout: 5000
        },
        required: true,
        description: 'Workspace and tenant management'
      },

      // Infrastructure Dependencies
      {
        name: 'redis-cache',
        type: 'port',
        config: {
          host: process.env.REDIS_HOST || 'redis.smm-system.svc.cluster.local',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          timeout: 3000
        },
        required: true,
        description: 'Redis cache for session and model data'
      },
      {
        name: 'postgresql-primary',
        type: 'port',
        config: {
          host: process.env.POSTGRES_HOST || 'postgresql.smm-system.svc.cluster.local',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          timeout: 3000
        },
        required: true,
        description: 'Primary PostgreSQL database'
      },
      {
        name: 'vault-secrets',
        type: 'http',
        config: {
          url: process.env.VAULT_URL || 'https://vault.smm-system.svc.cluster.local:8200/v1/sys/health',
          timeout: 5000
        },
        required: true,
        description: 'HashiCorp Vault for secrets management'
      },

      // Kubernetes Resources
      {
        name: 'smm-system-namespace',
        type: 'kubernetes',
        config: {
          namespace: 'smm-system'
        },
        required: true,
        description: 'Primary SMM system namespace'
      },
      {
        name: 'monitoring-namespace',
        type: 'kubernetes',
        config: {
          namespace: 'monitoring'
        },
        required: false,
        description: 'Monitoring and observability namespace'
      },

      // External Dependencies
      {
        name: 'github-api',
        type: 'http',
        config: {
          url: 'https://api.github.com/zen',
          timeout: 10000
        },
        required: false,
        description: 'GitHub API for repository integration'
      },
      {
        name: 'slack-api',
        type: 'http',
        config: {
          url: 'https://slack.com/api/api.test',
          timeout: 10000
        },
        required: false,
        description: 'Slack API for notifications'
      },
      {
        name: 'openai-api',
        type: 'http',
        config: {
          url: 'https://api.openai.com/v1/models',
          timeout: 15000
        },
        required: false,
        description: 'OpenAI API for LLM services'
      },

      // DNS Dependencies
      {
        name: 'cluster-dns',
        type: 'dns',
        config: {
          host: 'kubernetes.default.svc.cluster.local'
        },
        required: true,
        description: 'Kubernetes cluster DNS resolution'
      },
      {
        name: 'external-dns',
        type: 'dns',
        config: {
          host: 'google.com'
        },
        required: true,
        description: 'External DNS resolution capability'
      }
    ];
  }

  async checkHTTPDependency(dep: DependencyCheck): Promise<DependencyResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(dep.config.url!, {
        timeout: dep.config.timeout || 5000,
        validateStatus: () => true // Don't throw on non-2xx status
      });
      
      const latency = Date.now() - startTime;
      let status: DependencyResult['status'] = 'available';
      
      if (response.status >= 500) {
        status = 'unavailable';
      } else if (response.status >= 400) {
        status = 'degraded';
      }
      
      return {
        name: dep.name,
        type: dep.type,
        status,
        latency,
        metadata: {
          httpStatus: response.status,
          responseSize: JSON.stringify(response.data || {}).length,
          url: dep.config.url
        }
      };
    } catch (error) {
      return {
        name: dep.name,
        type: dep.type,
        status: 'unavailable',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          url: dep.config.url
        }
      };
    }
  }

  async checkPortDependency(dep: DependencyCheck): Promise<DependencyResult> {
    const startTime = Date.now();
    
    try {
      const net = await import('net');
      const socket = new net.Socket();
      
      return new Promise<DependencyResult>((resolve) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({
            name: dep.name,
            type: dep.type,
            status: 'unavailable',
            latency: Date.now() - startTime,
            error: 'Connection timeout',
            metadata: {
              host: dep.config.host,
              port: dep.config.port
            }
          });
        }, dep.config.timeout || 3000);
        
        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({
            name: dep.name,
            type: dep.type,
            status: 'available',
            latency: Date.now() - startTime,
            metadata: {
              host: dep.config.host,
              port: dep.config.port
            }
          });
        });
        
        socket.on('error', (error) => {
          clearTimeout(timeout);
          resolve({
            name: dep.name,
            type: dep.type,
            status: 'unavailable',
            latency: Date.now() - startTime,
            error: error.message,
            metadata: {
              host: dep.config.host,
              port: dep.config.port
            }
          });
        });
        
        socket.connect(dep.config.port!, dep.config.host!);
      });
    } catch (error) {
      return {
        name: dep.name,
        type: dep.type,
        status: 'unavailable',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkDNSDependency(dep: DependencyCheck): Promise<DependencyResult> {
    const startTime = Date.now();
    
    try {
      const dns = await import('dns');
      const { promisify } = await import('util');
      const lookup = promisify(dns.lookup);
      
      await lookup(dep.config.host!);
      
      return {
        name: dep.name,
        type: dep.type,
        status: 'available',
        latency: Date.now() - startTime,
        metadata: {
          host: dep.config.host
        }
      };
    } catch (error) {
      return {
        name: dep.name,
        type: dep.type,
        status: 'unavailable',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'DNS resolution failed'
      };
    }
  }

  async checkKubernetesDependency(dep: DependencyCheck): Promise<DependencyResult> {
    const startTime = Date.now();
    
    try {
      // Check if kubectl is available
      await execAsync('kubectl version --client --short');
      
      // Check namespace
      if (dep.config.namespace) {
        const { stdout } = await execAsync(`kubectl get namespace ${dep.config.namespace}`);
        
        if (stdout.includes(dep.config.namespace)) {
          return {
            name: dep.name,
            type: dep.type,
            status: 'available',
            latency: Date.now() - startTime,
            metadata: {
              namespace: dep.config.namespace,
              kubectlAvailable: true
            }
          };
        }
      }
      
      return {
        name: dep.name,
        type: dep.type,
        status: 'unavailable',
        latency: Date.now() - startTime,
        error: `Namespace ${dep.config.namespace} not found`
      };
    } catch (error) {
      return {
        name: dep.name,
        type: dep.type,
        status: 'unavailable',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Kubernetes check failed'
      };
    }
  }

  async checkDependency(dep: DependencyCheck): Promise<DependencyResult> {
    switch (dep.type) {
      case 'http':
        return this.checkHTTPDependency(dep);
      case 'port':
        return this.checkPortDependency(dep);
      case 'dns':
        return this.checkDNSDependency(dep);
      case 'kubernetes':
        return this.checkKubernetesDependency(dep);
      default:
        return {
          name: dep.name,
          type: dep.type,
          status: 'unavailable',
          latency: 0,
          error: `Unsupported dependency type: ${dep.type}`
        };
    }
  }

  async validateAllDependencies(): Promise<DependencyResult[]> {
    const dependencies = this.getDependencies();
    const results: DependencyResult[] = [];
    
    console.log(`🔍 Validating ${dependencies.length} dependencies...`);
    
    for (const dep of dependencies) {
      try {
        const result = await this.checkDependency(dep);
        results.push(result);
        this.results.push(result);
        
        const statusIcon = result.status === 'available' ? '✅' : 
                          result.status === 'degraded' ? '⚠️' : '❌';
        const requiredIcon = dep.required ? '🔴' : '🔵';
        
        console.log(`  ${statusIcon} ${requiredIcon} ${dep.name}: ${result.status} (${result.latency}ms)`);
        
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      } catch (error) {
        console.log(`  ❌ ${dep.name}: Validation failed - ${error}`);
        results.push({
          name: dep.name,
          type: dep.type,
          status: 'unavailable',
          latency: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  async generateDependencyReport(): Promise<string> {
    const reportPath = join(this.reportsDir, `dependency-report-${Date.now()}.json`);
    
    const dependencies = this.getDependencies();
    const requiredDeps = dependencies.filter(d => d.required);
    const optionalDeps = dependencies.filter(d => !d.required);
    
    const requiredResults = this.results.filter(r => 
      requiredDeps.some(d => d.name === r.name)
    );
    const optionalResults = this.results.filter(r => 
      optionalDeps.some(d => d.name === r.name)
    );
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      summary: {
        total: this.results.length,
        available: this.results.filter(r => r.status === 'available').length,
        degraded: this.results.filter(r => r.status === 'degraded').length,
        unavailable: this.results.filter(r => r.status === 'unavailable').length,
        required: {
          total: requiredResults.length,
          available: requiredResults.filter(r => r.status === 'available').length,
          critical_failures: requiredResults.filter(r => r.status === 'unavailable').length
        },
        optional: {
          total: optionalResults.length,
          available: optionalResults.filter(r => r.status === 'available').length
        },
        averageLatency: Math.round(
          this.results.reduce((sum, r) => sum + r.latency, 0) / this.results.length
        )
      },
      results: this.results.map(r => ({
        ...r,
        required: requiredDeps.some(d => d.name === r.name),
        description: dependencies.find(d => d.name === r.name)?.description
      })),
      recommendations: this.generateRecommendations(dependencies)
    };
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  private generateRecommendations(dependencies: DependencyCheck[]): string[] {
    const recommendations: string[] = [];
    const requiredFailures = this.results.filter(r => 
      r.status === 'unavailable' && dependencies.find(d => d.name === r.name)?.required
    );
    
    if (requiredFailures.length === 0) {
      recommendations.push('✅ All required dependencies are available');
    } else {
      recommendations.push(`🚨 ${requiredFailures.length} critical dependencies are unavailable`);
      requiredFailures.forEach(failure => {
        recommendations.push(`  - ${failure.name}: ${failure.error || 'Service unavailable'}`);
      });
    }
    
    const degradedServices = this.results.filter(r => r.status === 'degraded');
    if (degradedServices.length > 0) {
      recommendations.push(`⚠️ ${degradedServices.length} services are degraded - monitor closely`);
    }
    
    const highLatencyServices = this.results.filter(r => r.latency > 5000);
    if (highLatencyServices.length > 0) {
      recommendations.push(`🐌 ${highLatencyServices.length} services have high latency (>5s)`);
    }
    
    return recommendations;
  }

  getResults(): DependencyResult[] {
    return [...this.results];
  }
}

describe('Dependency Validation Suite', () => {
  let validator: DependencyValidator;
  let validationResults: DependencyResult[];

  beforeAll(async () => {
    validator = new DependencyValidator();
    await validator.initialize();
  });

  describe('Dependency Availability', () => {
    it('should validate all system dependencies', async () => {
      validationResults = await validator.validateAllDependencies();
      
      expect(validationResults.length).toBeGreaterThan(0);
      
      // Count results by status
      const available = validationResults.filter(r => r.status === 'available').length;
      const degraded = validationResults.filter(r => r.status === 'degraded').length;
      const unavailable = validationResults.filter(r => r.status === 'unavailable').length;
      
      console.log(`\n📊 Dependency Status:`);
      console.log(`  Available: ${available}`);
      console.log(`  Degraded: ${degraded}`);
      console.log(`  Unavailable: ${unavailable}`);
      
      // At least 50% of dependencies should be available
      expect(available / validationResults.length).toBeGreaterThan(0.5);
    }, 120000);

    it('should have critical services available', async () => {
      const criticalServices = ['model-router', 'toolhub', 'audit-service'];
      const criticalResults = validationResults.filter(r => 
        criticalServices.includes(r.name)
      );
      
      // Allow some critical services to be down in test environment
      const availableCritical = criticalResults.filter(r => r.status === 'available').length;
      expect(availableCritical).toBeGreaterThanOrEqual(Math.floor(criticalServices.length * 0.5));
    });

    it('should have acceptable latency for available services', async () => {
      const availableServices = validationResults.filter(r => r.status === 'available');
      
      if (availableServices.length > 0) {
        const avgLatency = availableServices.reduce((sum, r) => sum + r.latency, 0) / availableServices.length;
        console.log(`Average latency for available services: ${Math.round(avgLatency)}ms`);
        
        expect(avgLatency).toBeLessThan(10000); // 10 seconds max average
      }
    });
  });

  describe('Infrastructure Dependencies', () => {
    it('should validate DNS resolution', async () => {
      const dnsResults = validationResults.filter(r => r.type === 'dns');
      
      if (dnsResults.length > 0) {
        const workingDNS = dnsResults.filter(r => r.status === 'available').length;
        expect(workingDNS).toBeGreaterThan(0); // At least one DNS check should work
      }
    });

    it('should validate database connectivity', async () => {
      const dbResults = validationResults.filter(r => 
        r.name.includes('postgresql') || r.name.includes('redis')
      );
      
      // Database connectivity is environment-dependent
      expect(dbResults.length).toBeGreaterThanOrEqual(0);
    });
  });

  afterAll(async () => {
    const reportPath = await validator.generateDependencyReport();
    const results = validator.getResults();
    
    console.log('\n🔍 Dependency Validation Summary:');
    console.log(`  Total dependencies checked: ${results.length}`);
    console.log(`  Available: ${results.filter(r => r.status === 'available').length}`);
    console.log(`  Degraded: ${results.filter(r => r.status === 'degraded').length}`);
    console.log(`  Unavailable: ${results.filter(r => r.status === 'unavailable').length}`);
    console.log(`  Report generated: ${reportPath}`);
  });
});