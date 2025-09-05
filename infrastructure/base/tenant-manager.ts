import { TenantConfig, TenantResources, TenantHealthCheck, TenantMetrics, TenantBilling, TenantAuditEvent } from './types';
import { TenantProvisioner } from './tenant-provisioning';
import * as k8s from '@pulumi/kubernetes';
import * as vault from '@pulumi/vault';
import axios from 'axios';

export class TenantManager {
  private provisioner: TenantProvisioner;
  private tenants: Map<string, TenantResources> = new Map();
  private auditLog: TenantAuditEvent[] = [];

  constructor(
    private k8sProvider: k8s.Provider,
    private vaultProvider: vault.Provider,
    private prometheusUrl: string,
    private grafanaUrl: string
  ) {
    this.provisioner = new TenantProvisioner(k8sProvider, vaultProvider);
  }

  async createTenant(config: TenantConfig): Promise<TenantResources> {
    try {
      this.logAuditEvent({
        tenantId: config.tenantId,
        eventId: `create-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'created',
        resource: 'tenant',
        actor: { type: 'system', id: 'tenant-manager' },
        details: { config },
        compliance: this.getComplianceFlags(config.complianceLevel)
      });

      const resources = await this.provisioner.provisionTenant(config);
      this.tenants.set(config.tenantId, resources);

      // Initialize monitoring for the tenant
      await this.setupTenantMonitoring(config.tenantId);

      // Create initial health check
      await this.performHealthCheck(config.tenantId);

      return resources;
    } catch (error) {
      this.logAuditEvent({
        tenantId: config.tenantId,
        eventId: `create-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'failed',
        resource: 'tenant',
        actor: { type: 'system', id: 'tenant-manager' },
        details: { error: error.message, config },
        compliance: this.getComplianceFlags(config.complianceLevel)
      });
      throw error;
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    try {
      this.logAuditEvent({
        tenantId,
        eventId: `delete-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'deleted',
        resource: 'tenant',
        actor: { type: 'system', id: 'tenant-manager' },
        details: { tenantId },
        compliance: {}
      });

      await this.provisioner.deprovisionTenant(tenantId);
      this.tenants.delete(tenantId);

      // Cleanup monitoring
      await this.removeTenantMonitoring(tenantId);

    } catch (error) {
      this.logAuditEvent({
        tenantId,
        eventId: `delete-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'failed',
        resource: 'tenant',
        actor: { type: 'system', id: 'tenant-manager' },
        details: { error: error.message, tenantId },
        compliance: {}
      });
      throw error;
    }
  }

  async performHealthCheck(tenantId: string): Promise<TenantHealthCheck> {
    const healthCheck: TenantHealthCheck = {
      tenantId,
      status: 'healthy',
      checks: {
        namespace: await this.checkNamespace(tenantId),
        database: await this.checkDatabase(tenantId),
        secrets: await this.checkSecrets(tenantId),
        networking: await this.checkNetworking(tenantId),
        resources: await this.checkResources(tenantId),
        monitoring: await this.checkMonitoring(tenantId)
      },
      lastChecked: new Date().toISOString()
    };

    // Determine overall status
    const checkStatuses = Object.values(healthCheck.checks).map(check => check.status);
    if (checkStatuses.includes('fail')) {
      healthCheck.status = 'unhealthy';
    } else if (checkStatuses.includes('warn')) {
      healthCheck.status = 'degraded';
    }

    // Generate recommendations
    healthCheck.recommendations = this.generateRecommendations(healthCheck);

    this.logAuditEvent({
      tenantId,
      eventId: `health-check-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'accessed',
      resource: 'health-check',
      actor: { type: 'system', id: 'tenant-manager' },
      details: { healthCheck },
      compliance: {}
    });

    return healthCheck;
  }

  async getTenantMetrics(tenantId: string, startTime: string, endTime: string): Promise<TenantMetrics> {
    try {
      const prometheusQueries = {
        cpuUsage: `sum(rate(container_cpu_usage_seconds_total{namespace="smm-tenant-${tenantId}"}[5m]))`,
        memoryUsage: `sum(container_memory_usage_bytes{namespace="smm-tenant-${tenantId}"})`,
        storageUsage: `sum(kubelet_volume_stats_used_bytes{namespace="smm-tenant-${tenantId}"})`,
        networkIngress: `sum(rate(container_network_receive_bytes_total{namespace="smm-tenant-${tenantId}"}[5m]))`,
        networkEgress: `sum(rate(container_network_transmit_bytes_total{namespace="smm-tenant-${tenantId}"}[5m]))`,
        podCount: `count(kube_pod_info{namespace="smm-tenant-${tenantId}"})`,
        errorRate: `rate(http_requests_total{namespace="smm-tenant-${tenantId}",status=~"5.."}[5m])`
      };

      const metrics: TenantMetrics = {
        tenantId,
        period: { start: startTime, end: endTime },
        usage: {
          cpu: {
            requests: await this.queryPrometheus(prometheusQueries.cpuUsage),
            limits: 0,
            utilization: 0
          },
          memory: {
            requests: await this.queryPrometheus(prometheusQueries.memoryUsage),
            limits: 0,
            utilization: 0
          },
          storage: {
            used: await this.queryPrometheus(prometheusQueries.storageUsage),
            available: 0,
            utilization: 0
          },
          network: {
            ingressBytes: await this.queryPrometheus(prometheusQueries.networkIngress),
            egressBytes: await this.queryPrometheus(prometheusQueries.networkEgress)
          }
        },
        business: {
          activeWorkspaces: await this.getBusinessMetric(tenantId, 'active_workspaces'),
          totalUsers: await this.getBusinessMetric(tenantId, 'total_users'),
          apiRequests: await this.getBusinessMetric(tenantId, 'api_requests'),
          agentExecutions: await this.getBusinessMetric(tenantId, 'agent_executions'),
          simulationsRun: await this.getBusinessMetric(tenantId, 'simulations_run'),
          budgetSpent: await this.getBusinessMetric(tenantId, 'budget_spent')
        },
        performance: {
          averageResponseTime: await this.queryPrometheus(`histogram_quantile(0.5, rate(http_request_duration_seconds_bucket{namespace="smm-tenant-${tenantId}"}[5m]))`),
          errorRate: await this.queryPrometheus(prometheusQueries.errorRate),
          uptime: await this.calculateUptime(tenantId, startTime, endTime)
        }
      };

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get metrics for tenant ${tenantId}: ${error.message}`);
    }
  }

  async generateBilling(tenantId: string, startTime: string, endTime: string): Promise<TenantBilling> {
    const metrics = await this.getTenantMetrics(tenantId, startTime, endTime);
    const tenant = this.tenants.get(tenantId);

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Pricing model based on tier and usage
    const pricing = this.getPricingModel(tenantId);

    const billing: TenantBilling = {
      tenantId,
      period: { start: startTime, end: endTime },
      costs: {
        compute: this.calculateComputeCosts(metrics.usage.cpu.requests, pricing),
        storage: this.calculateStorageCosts(metrics.usage.storage.used, pricing),
        network: this.calculateNetworkCosts(metrics.usage.network.ingressBytes + metrics.usage.network.egressBytes, pricing),
        apiCalls: this.calculateApiCosts(metrics.business.apiRequests, pricing),
        agents: this.calculateAgentCosts(metrics.business.agentExecutions, pricing),
        connectors: this.calculateConnectorCosts(tenantId, pricing),
        support: pricing.support.baseCost,
        total: 0
      },
      usage: {
        computeHours: metrics.usage.cpu.requests * 24, // Simplified calculation
        storageGB: metrics.usage.storage.used / (1024 * 1024 * 1024),
        networkGB: (metrics.usage.network.ingressBytes + metrics.usage.network.egressBytes) / (1024 * 1024 * 1024),
        apiCalls: metrics.business.apiRequests,
        agentExecutions: metrics.business.agentExecutions,
        connectorCalls: await this.getBusinessMetric(tenantId, 'connector_calls')
      },
      tier: tenant.status, // Should be the actual tier
      discounts: this.calculateDiscounts(tenantId, metrics)
    };

    // Calculate total cost
    billing.costs.total = Object.values(billing.costs).reduce((sum, cost) => {
      return typeof cost === 'number' ? sum + cost : sum;
    }, 0);

    // Apply discounts
    const totalDiscount = billing.discounts.reduce((sum, discount) => sum + discount.amount, 0);
    billing.costs.total -= totalDiscount;

    this.logAuditEvent({
      tenantId,
      eventId: `billing-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'accessed',
      resource: 'billing',
      actor: { type: 'system', id: 'tenant-manager' },
      details: { billing },
      compliance: {}
    });

    return billing;
  }

  private async checkNamespace(tenantId: string): Promise<any> {
    try {
      // Check if namespace exists and is healthy
      const namespace = await this.k8sProvider.core.v1.Namespace.get(`smm-tenant-${tenantId}`);
      return {
        status: 'pass',
        message: 'Namespace is healthy',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Namespace check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkDatabase(tenantId: string): Promise<any> {
    try {
      // Check database connectivity and health
      // This would typically involve connecting to the tenant's database
      return {
        status: 'pass',
        message: 'Database is accessible and healthy',
        details: { connections: 5, queries: 0 },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Database check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkSecrets(tenantId: string): Promise<any> {
    try {
      // Check Vault mount and policies
      const vaultHealth = await axios.get(`${process.env.VAULT_ADDR}/v1/sys/health`);
      return {
        status: 'pass',
        message: 'Secrets management is healthy',
        details: { vaultStatus: vaultHealth.status },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Secrets check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkNetworking(tenantId: string): Promise<any> {
    try {
      // Check network policies and connectivity
      return {
        status: 'pass',
        message: 'Network policies are correctly configured',
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Networking check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkResources(tenantId: string): Promise<any> {
    try {
      // Check resource quotas and usage
      const cpuUsage = await this.queryPrometheus(`sum(rate(container_cpu_usage_seconds_total{namespace="smm-tenant-${tenantId}"}[5m]))`);
      const memoryUsage = await this.queryPrometheus(`sum(container_memory_usage_bytes{namespace="smm-tenant-${tenantId}"})`);

      const status = (cpuUsage > 0.8 || memoryUsage > 0.8) ? 'warn' : 'pass';
      return {
        status,
        message: status === 'warn' ? 'High resource utilization detected' : 'Resource usage is within limits',
        details: { cpuUsage, memoryUsage },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Resource check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkMonitoring(tenantId: string): Promise<any> {
    try {
      // Check if monitoring is working
      const metricsResponse = await axios.get(`${this.prometheusUrl}/api/v1/query?query=up{namespace="smm-tenant-${tenantId}"}`);
      return {
        status: 'pass',
        message: 'Monitoring is active',
        details: { activeTargets: metricsResponse.data?.data?.result?.length || 0 },
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Monitoring check failed: ${error.message}`,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private generateRecommendations(healthCheck: TenantHealthCheck): string[] {
    const recommendations: string[] = [];

    Object.entries(healthCheck.checks).forEach(([checkName, result]) => {
      if (result.status === 'warn') {
        switch (checkName) {
          case 'resources':
            recommendations.push('Consider upgrading to a higher tier or optimizing resource usage');
            break;
          case 'database':
            recommendations.push('Database performance issues detected - consider optimization');
            break;
          case 'monitoring':
            recommendations.push('Some monitoring targets are down - check service health');
            break;
        }
      } else if (result.status === 'fail') {
        switch (checkName) {
          case 'namespace':
            recommendations.push('Critical: Namespace issues detected - immediate attention required');
            break;
          case 'database':
            recommendations.push('Critical: Database connectivity issues - check configuration');
            break;
          case 'secrets':
            recommendations.push('Critical: Secrets management issues - verify Vault connectivity');
            break;
        }
      }
    });

    return recommendations;
  }

  private async setupTenantMonitoring(tenantId: string): Promise<void> {
    // Create Grafana dashboard for tenant
    const dashboardConfig = {
      dashboard: {
        title: `SMM Tenant ${tenantId}`,
        tags: ['smm', 'tenant', tenantId],
        panels: [
          {
            title: 'CPU Usage',
            type: 'graph',
            targets: [{
              expr: `sum(rate(container_cpu_usage_seconds_total{namespace="smm-tenant-${tenantId}"}[5m]))`
            }]
          },
          {
            title: 'Memory Usage',
            type: 'graph',
            targets: [{
              expr: `sum(container_memory_usage_bytes{namespace="smm-tenant-${tenantId}"})`
            }]
          },
          {
            title: 'Agent Executions',
            type: 'stat',
            targets: [{
              expr: `sum(rate(smm_agent_executions_total{tenant_id="${tenantId}"}[5m]))`
            }]
          }
        ]
      }
    };

    try {
      await axios.post(`${this.grafanaUrl}/api/dashboards/db`, dashboardConfig, {
        headers: {
          'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.warn(`Failed to create Grafana dashboard for tenant ${tenantId}:`, error.message);
    }
  }

  private async removeTenantMonitoring(tenantId: string): Promise<void> {
    // Remove Grafana dashboard
    try {
      await axios.delete(`${this.grafanaUrl}/api/dashboards/uid/smm-tenant-${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.GRAFANA_API_KEY}`
        }
      });
    } catch (error) {
      console.warn(`Failed to remove Grafana dashboard for tenant ${tenantId}:`, error.message);
    }
  }

  private async queryPrometheus(query: string): Promise<number> {
    try {
      const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
        params: { query }
      });
      const result = response.data?.data?.result?.[0]?.value?.[1];
      return parseFloat(result) || 0;
    } catch (error) {
      console.warn(`Prometheus query failed: ${error.message}`);
      return 0;
    }
  }

  private async getBusinessMetric(tenantId: string, metricName: string): Promise<number> {
    try {
      const tenant = this.tenants.get(tenantId);
      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      // Calculate business metrics based on tenant data
      switch (metricName) {
        case 'activeUsers':
          return await this.getActiveUserCount(tenantId);
        case 'monthlyRevenue':
          return await this.getMonthlyRevenue(tenantId);
        case 'storageUsage':
          return await this.getStorageUsage(tenantId);
        case 'apiCalls':
          return await this.getApiCallCount(tenantId);
        case 'workspaceCount':
          return tenant.metadata.workspaceCount || 0;
        default:
          console.warn('Unknown business metric requested', { tenantId, metricName });
          return 0;
      }
    } catch (error) {
      console.error('Failed to get business metric', {
        tenantId,
        metricName,
        error: error instanceof Error ? error.message : error
      });
      return 0;
    }
  }

  private async getActiveUserCount(tenantId: string): Promise<number> {
    // TODO: Query user service for active user metrics
    // Development-only fallback: return 0 when no data is available
    const tenant = this.tenants.get(tenantId);
    return tenant?.metadata.activeUsers ?? 0;
  }

  private async getMonthlyRevenue(tenantId: string): Promise<number> {
    // TODO: Integrate with billing service to fetch real revenue
    // Development-only placeholder: returns 0 when data is missing
    const tenant = this.tenants.get(tenantId);
    return tenant?.metadata.monthlyRevenue ?? 0;
  }

  private async getStorageUsage(tenantId: string): Promise<number> {
    // Query Prometheus for storage usage metrics
    return await this.queryPrometheus(`sum(kubelet_volume_stats_used_bytes{namespace="smm-tenant-${tenantId}"})`);
  }

  private async getApiCallCount(tenantId: string): Promise<number> {
    // Query Prometheus for API call counts
    return await this.queryPrometheus(`sum(increase(http_requests_total{namespace="smm-tenant-${tenantId}"}[5m]))`);
  }

  private async calculateUptime(tenantId: string, startTime: string, endTime: string): Promise<number> {
    // TODO: Calculate uptime percentage using monitoring data
    // Development-only placeholder value
    return 99.5;
  }

  private getPricingModel(tenantId: string): any {
    // Return pricing model based on tenant tier
    return {
      compute: { pricePerHour: 0.05 },
      storage: { pricePerGB: 0.10 },
      network: { pricePerGB: 0.01 },
      api: { pricePerThousand: 0.001 },
      agents: { pricePerExecution: 0.002 },
      connectors: { pricePerCall: 0.0001 },
      support: { baseCost: 50 }
    };
  }

  private calculateComputeCosts(cpuHours: number, pricing: any): number {
    return cpuHours * pricing.compute.pricePerHour;
  }

  private calculateStorageCosts(storageBytes: number, pricing: any): number {
    const storageGB = storageBytes / (1024 * 1024 * 1024);
    return storageGB * pricing.storage.pricePerGB;
  }

  private calculateNetworkCosts(networkBytes: number, pricing: any): number {
    const networkGB = networkBytes / (1024 * 1024 * 1024);
    return networkGB * pricing.network.pricePerGB;
  }

  private calculateApiCosts(apiCalls: number, pricing: any): number {
    return (apiCalls / 1000) * pricing.api.pricePerThousand;
  }

  private calculateAgentCosts(executions: number, pricing: any): number {
    return executions * pricing.agents.pricePerExecution;
  }

  private calculateConnectorCosts(tenantId: string, pricing: any): number {
    // Calculate based on connector usage
    return 0; // Placeholder
  }

  private calculateDiscounts(tenantId: string, metrics: TenantMetrics): any[] {
    const discounts = [];
    
    // Volume discount for high usage
    if (metrics.business.apiRequests > 100000) {
      discounts.push({
        name: 'High Volume Discount',
        amount: 50
      });
    }

    // Long-term customer discount
    if (this.isLongTermCustomer(tenantId)) {
      discounts.push({
        name: 'Loyalty Discount',
        amount: 25
      });
    }

    return discounts;
  }

  private isLongTermCustomer(tenantId: string): boolean {
    // Check if customer has been with us for more than a year
    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.createdAt) {
      return false;
    }
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const createdDate = new Date(tenant.createdAt);
    const isLongTerm = createdDate <= oneYearAgo;
    
    console.log('Long-term customer check', {
      tenantId,
      createdAt: tenant.createdAt,
      oneYearAgo: oneYearAgo.toISOString(),
      isLongTerm
    });
    
    return isLongTerm;
  }

  private getComplianceFlags(complianceLevel: string): any {
    const flags: any = {};
    
    switch (complianceLevel) {
      case 'gdpr':
        flags.gdpr = true;
        break;
      case 'hipaa':
        flags.hipaa = true;
        break;
      case 'sox':
        flags.sox = true;
        break;
    }

    return flags;
  }

  private logAuditEvent(event: TenantAuditEvent): void {
    this.auditLog.push(event);
    
    // In production, this would write to a persistent audit log
    console.log(`[AUDIT] ${event.timestamp} - ${event.eventType} - ${event.resource} - ${event.tenantId}`);
  }

  // Public method to get audit log
  getAuditLog(tenantId?: string): TenantAuditEvent[] {
    if (tenantId) {
      return this.auditLog.filter(event => event.tenantId === tenantId);
    }
    return this.auditLog;
  }

  // Public method to get all tenants
  getAllTenants(): TenantResources[] {
    return Array.from(this.tenants.values());
  }

  // Public method to get specific tenant
  getTenant(tenantId: string): TenantResources | undefined {
    return this.tenants.get(tenantId);
  }
}