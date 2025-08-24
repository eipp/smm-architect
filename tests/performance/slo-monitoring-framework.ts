import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { join } from 'path';

interface SLODefinition {
  name: string;
  description: string;
  service: string;
  sli: {
    type: 'latency' | 'availability' | 'error_rate' | 'throughput' | 'quality';
    metric: string;
    aggregation: 'p50' | 'p95' | 'p99' | 'mean' | 'rate' | 'count';
    window: string; // e.g., '5m', '1h', '1d'
  };
  slo: {
    target: number;
    unit: string;
    operator: '<' | '>' | '<=' | '>=' | '=';
  };
  alerting: {
    burnRateThreshold: number;
    longWindow: string;
    shortWindow: string;
    severity: 'critical' | 'warning' | 'info';
  };
  errorBudget: {
    period: string; // e.g., '30d'
    budgetPercentage: number;
  };
}

interface SLOStatus {
  sloName: string;
  timestamp: string;
  currentValue: number;
  target: number;
  compliance: boolean;
  errorBudgetRemaining: number;
  burnRate: number;
  trend: 'improving' | 'stable' | 'degrading';
  alertStatus: 'ok' | 'warning' | 'critical';
}

interface SLOViolation {
  sloName: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  currentValue: number;
  target: number;
  violationDuration: number;
  impactDescription: string;
  recommendedActions: string[];
}

export class SLOMonitoringFramework {
  private readonly sloDefinitions: SLODefinition[];
  private readonly reportsDir: string;
  private sloHistory: Map<string, Array<{ timestamp: string; value: number }>> = new Map();

  constructor() {
    this.reportsDir = join(__dirname, '../../reports/slo');
    this.sloDefinitions = this.initializeSLODefinitions();
  }

  private initializeSLODefinitions(): SLODefinition[] {
    return [
      {
        name: 'model_router_latency_p95',
        description: 'Model Router API 95th percentile latency',
        service: 'model-router',
        sli: {
          type: 'latency',
          metric: 'model_router_request_duration_seconds',
          aggregation: 'p95',
          window: '5m'
        },
        slo: {
          target: 2.0,
          unit: 'seconds',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 2.0,
          longWindow: '1h',
          shortWindow: '5m',
          severity: 'critical'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 1.0 // 99% availability = 1% error budget
        }
      },
      {
        name: 'model_router_availability',
        description: 'Model Router service availability',
        service: 'model-router',
        sli: {
          type: 'availability',
          metric: 'model_router_requests_total',
          aggregation: 'rate',
          window: '5m'
        },
        slo: {
          target: 99.5,
          unit: 'percent',
          operator: '>='
        },
        alerting: {
          burnRateThreshold: 5.0,
          longWindow: '1h',
          shortWindow: '5m',
          severity: 'critical'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 0.5
        }
      },
      {
        name: 'model_router_error_rate',
        description: 'Model Router error rate',
        service: 'model-router',
        sli: {
          type: 'error_rate',
          metric: 'model_router_requests_total',
          aggregation: 'rate',
          window: '5m'
        },
        slo: {
          target: 1.0,
          unit: 'percent',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 3.0,
          longWindow: '30m',
          shortWindow: '5m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 1.0
        }
      },
      {
        name: 'toolhub_vector_search_latency',
        description: 'ToolHub vector search 95th percentile latency',
        service: 'toolhub',
        sli: {
          type: 'latency',
          metric: 'toolhub_vector_search_duration_seconds',
          aggregation: 'p95',
          window: '5m'
        },
        slo: {
          target: 0.3,
          unit: 'seconds',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 2.0,
          longWindow: '1h',
          shortWindow: '5m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 2.0
        }
      },
      {
        name: 'simulation_success_rate',
        description: 'Monte Carlo simulation success rate',
        service: 'simulation-engine',
        sli: {
          type: 'availability',
          metric: 'simulation_runs_total',
          aggregation: 'rate',
          window: '10m'
        },
        slo: {
          target: 95.0,
          unit: 'percent',
          operator: '>='
        },
        alerting: {
          burnRateThreshold: 3.0,
          longWindow: '2h',
          shortWindow: '10m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 5.0
        }
      },
      {
        name: 'n8n_workflow_execution_latency',
        description: 'n8n workflow execution 95th percentile latency',
        service: 'n8n-workflows',
        sli: {
          type: 'latency',
          metric: 'n8n_workflow_execution_duration_seconds',
          aggregation: 'p95',
          window: '5m'
        },
        slo: {
          target: 10.0,
          unit: 'seconds',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 2.0,
          longWindow: '1h',
          shortWindow: '5m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 5.0
        }
      },
      {
        name: 'agent_job_completion_time',
        description: 'Agent job completion 95th percentile time',
        service: 'agent-queue',
        sli: {
          type: 'latency',
          metric: 'agent_job_completion_duration_seconds',
          aggregation: 'p95',
          window: '10m'
        },
        slo: {
          target: 300.0,
          unit: 'seconds',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 2.0,
          longWindow: '2h',
          shortWindow: '10m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 5.0
        }
      },
      {
        name: 'workspace_creation_latency',
        description: 'Workspace creation 95th percentile latency',
        service: 'workspace-service',
        sli: {
          type: 'latency',
          metric: 'workspace_creation_duration_seconds',
          aggregation: 'p95',
          window: '5m'
        },
        slo: {
          target: 5.0,
          unit: 'seconds',
          operator: '<='
        },
        alerting: {
          burnRateThreshold: 2.0,
          longWindow: '1h',
          shortWindow: '5m',
          severity: 'warning'
        },
        errorBudget: {
          period: '30d',
          budgetPercentage: 2.0
        }
      }
    ];
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  // Simulate fetching current SLI value from monitoring system
  private async fetchCurrentSLIValue(slo: SLODefinition): Promise<number> {
    // In a real implementation, this would query Prometheus/monitoring system
    // For testing, we'll simulate realistic values with some variance
    
    const baseValues: Record<string, number> = {
      'model_router_latency_p95': 1.2,
      'model_router_availability': 99.8,
      'model_router_error_rate': 0.3,
      'toolhub_vector_search_latency': 0.15,
      'simulation_success_rate': 97.5,
      'n8n_workflow_execution_latency': 6.5,
      'agent_job_completion_time': 180.0,
      'workspace_creation_latency': 3.2
    };

    const baseValue = baseValues[slo.name] || 0;
    const variance = baseValue * 0.1; // 10% variance
    const randomVariance = (Math.random() - 0.5) * 2 * variance;
    
    return Math.max(0, baseValue + randomVariance);
  }

  private calculateErrorBudgetRemaining(slo: SLODefinition, currentValue: number): number {
    // Simplified error budget calculation
    if (slo.sli.type === 'availability') {
      const errorRate = 100 - currentValue;
      const maxErrorRate = 100 - slo.slo.target;
      return Math.max(0, (maxErrorRate - errorRate) / maxErrorRate * 100);
    } else if (slo.sli.type === 'error_rate') {
      const maxErrorRate = slo.slo.target;
      return Math.max(0, (maxErrorRate - currentValue) / maxErrorRate * 100);
    } else {
      // For latency SLOs, calculate based on violations
      const isViolating = this.evaluateSLOCompliance(slo, currentValue);
      return isViolating ? 0 : 100; // Simplified
    }
  }

  private calculateBurnRate(slo: SLODefinition, currentValue: number): number {
    // Calculate how fast we're consuming error budget
    const history = this.sloHistory.get(slo.name) || [];
    if (history.length < 2) return 0;

    const recentViolations = history.slice(-12).filter(h => !this.evaluateSLOCompliance(slo, h.value));
    const violationRate = recentViolations.length / history.slice(-12).length;
    
    return violationRate * 100; // Percentage burn rate
  }

  private evaluateSLOCompliance(slo: SLODefinition, currentValue: number): boolean {
    switch (slo.slo.operator) {
      case '<': return currentValue < slo.slo.target;
      case '<=': return currentValue <= slo.slo.target;
      case '>': return currentValue > slo.slo.target;
      case '>=': return currentValue >= slo.slo.target;
      case '=': return Math.abs(currentValue - slo.slo.target) < 0.001;
      default: return false;
    }
  }

  private determineTrend(slo: SLODefinition): 'improving' | 'stable' | 'degrading' {
    const history = this.sloHistory.get(slo.name) || [];
    if (history.length < 3) return 'stable';

    const recent = history.slice(-3).map(h => h.value);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = history.slice(-6, -3).map(h => h.value);
    const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;

    if (slo.sli.type === 'latency' || slo.sli.type === 'error_rate') {
      // Lower is better
      if (avgRecent < avgOlder * 0.95) return 'improving';
      if (avgRecent > avgOlder * 1.05) return 'degrading';
    } else {
      // Higher is better (availability, success rate)
      if (avgRecent > avgOlder * 1.01) return 'improving';
      if (avgRecent < avgOlder * 0.99) return 'degrading';
    }
    
    return 'stable';
  }

  async checkSLOCompliance(slo: SLODefinition): Promise<SLOStatus> {
    const currentValue = await this.fetchCurrentSLIValue(slo);
    const compliance = this.evaluateSLOCompliance(slo, currentValue);
    const errorBudgetRemaining = this.calculateErrorBudgetRemaining(slo, currentValue);
    const burnRate = this.calculateBurnRate(slo, currentValue);
    const trend = this.determineTrend(slo);

    // Update history
    const history = this.sloHistory.get(slo.name) || [];
    history.push({ timestamp: new Date().toISOString(), value: currentValue });
    if (history.length > 100) history.shift(); // Keep last 100 measurements
    this.sloHistory.set(slo.name, history);

    // Determine alert status
    let alertStatus: 'ok' | 'warning' | 'critical' = 'ok';
    if (!compliance && burnRate > slo.alerting.burnRateThreshold) {
      alertStatus = slo.alerting.severity === 'critical' ? 'critical' : 'warning';
    } else if (errorBudgetRemaining < 20) {
      alertStatus = 'warning';
    }

    return {
      sloName: slo.name,
      timestamp: new Date().toISOString(),
      currentValue: Math.round(currentValue * 1000) / 1000,
      target: slo.slo.target,
      compliance,
      errorBudgetRemaining: Math.round(errorBudgetRemaining * 100) / 100,
      burnRate: Math.round(burnRate * 100) / 100,
      trend,
      alertStatus
    };
  }

  async generateSLOViolation(slo: SLODefinition, status: SLOStatus): Promise<SLOViolation | null> {
    if (status.compliance) return null;

    const violationDuration = this.calculateViolationDuration(slo.name);
    
    const recommendedActions: string[] = [];
    
    // Generate context-specific recommendations
    if (slo.sli.type === 'latency') {
      recommendedActions.push('Check service resource utilization (CPU, memory)');
      recommendedActions.push('Review recent deployments for performance regressions');
      recommendedActions.push('Analyze slow query logs and database performance');
      if (status.trend === 'degrading') {
        recommendedActions.push('Consider horizontal scaling or caching improvements');
      }
    } else if (slo.sli.type === 'availability') {
      recommendedActions.push('Check for service outages or connectivity issues');
      recommendedActions.push('Review error logs for recurring failures');
      recommendedActions.push('Verify health check endpoints and dependencies');
    } else if (slo.sli.type === 'error_rate') {
      recommendedActions.push('Analyze error patterns and root causes');
      recommendedActions.push('Check for malformed requests or client issues');
      recommendedActions.push('Review circuit breaker and retry configurations');
    }

    if (status.errorBudgetRemaining < 10) {
      recommendedActions.push('⚠️ CRITICAL: Error budget nearly exhausted - consider feature freeze');
    }

    let impactDescription = `${slo.description} is violating SLO target`;
    if (violationDuration > 300) { // 5 minutes
      impactDescription += ` for ${Math.round(violationDuration / 60)} minutes`;
    }

    return {
      sloName: slo.name,
      timestamp: status.timestamp,
      severity: status.alertStatus === 'critical' ? 'critical' : 'warning',
      currentValue: status.currentValue,
      target: status.target,
      violationDuration,
      impactDescription,
      recommendedActions
    };
  }

  private calculateViolationDuration(sloName: string): number {
    const history = this.sloHistory.get(sloName) || [];
    const slo = this.sloDefinitions.find(s => s.name === sloName);
    if (!slo || history.length === 0) return 0;

    let violationStart: Date | null = null;
    const now = new Date();

    // Find the start of current violation period
    for (let i = history.length - 1; i >= 0; i--) {
      const isViolating = !this.evaluateSLOCompliance(slo, history[i].value);
      if (isViolating) {
        violationStart = new Date(history[i].timestamp);
      } else {
        break;
      }
    }

    return violationStart ? (now.getTime() - violationStart.getTime()) / 1000 : 0;
  }

  async generateSLOReport(): Promise<string> {
    const reportPath = join(this.reportsDir, `slo-report-${Date.now()}.json`);
    
    const allStatuses: SLOStatus[] = [];
    const violations: SLOViolation[] = [];

    for (const slo of this.sloDefinitions) {
      const status = await this.checkSLOCompliance(slo);
      allStatuses.push(status);

      const violation = await this.generateSLOViolation(slo, status);
      if (violation) {
        violations.push(violation);
      }
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSLOs: this.sloDefinitions.length,
        compliantSLOs: allStatuses.filter(s => s.compliance).length,
        violatingSLOs: allStatuses.filter(s => !s.compliance).length,
        criticalAlerts: allStatuses.filter(s => s.alertStatus === 'critical').length,
        warningAlerts: allStatuses.filter(s => s.alertStatus === 'warning').length,
        averageErrorBudgetRemaining: allStatuses.reduce((sum, s) => sum + s.errorBudgetRemaining, 0) / allStatuses.length
      },
      sloStatuses: allStatuses,
      violations,
      recommendations: this.generateOverallRecommendations(allStatuses, violations)
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return reportPath;
  }

  private generateOverallRecommendations(statuses: SLOStatus[], violations: SLOViolation[]): string[] {
    const recommendations: string[] = [];

    const criticalCount = statuses.filter(s => s.alertStatus === 'critical').length;
    const degradingCount = statuses.filter(s => s.trend === 'degrading').length;
    const lowBudgetCount = statuses.filter(s => s.errorBudgetRemaining < 20).length;

    if (criticalCount > 0) {
      recommendations.push(`🚨 ${criticalCount} critical SLO violations require immediate attention`);
    }

    if (degradingCount > 2) {
      recommendations.push(`⚠️ ${degradingCount} services show degrading performance trends`);
    }

    if (lowBudgetCount > 0) {
      recommendations.push(`💰 ${lowBudgetCount} services have low error budget remaining - consider reducing deployment frequency`);
    }

    const improvingCount = statuses.filter(s => s.trend === 'improving').length;
    if (improvingCount > degradingCount) {
      recommendations.push(`✅ Overall system performance is improving (${improvingCount} services trending up)`);
    }

    if (violations.length === 0) {
      recommendations.push('🎯 All SLOs are currently compliant - system is performing within expected bounds');
    }

    return recommendations;
  }
}

describe('SLO Monitoring & Compliance Framework', () => {
  let framework: SLOMonitoringFramework;
  const sloStatuses: SLOStatus[] = [];
  const violations: SLOViolation[] = [];

  beforeAll(async () => {
    framework = new SLOMonitoringFramework();
    await framework.initialize();
  });

  describe('Real-time SLO Monitoring', () => {
    it('should monitor Model Router latency SLO', async () => {
      const slo = framework['sloDefinitions'].find(s => s.name === 'model_router_latency_p95')!;
      const status = await framework.checkSLOCompliance(slo);
      
      sloStatuses.push(status);
      
      expect(status.sloName).toBe('model_router_latency_p95');
      expect(status.currentValue).toBeGreaterThan(0);
      expect(status.target).toBe(2.0);
      expect(status.errorBudgetRemaining).toBeGreaterThanOrEqual(0);
      expect(status.trend).toMatch(/improving|stable|degrading/);
      
      console.log(`Model Router P95 Latency: ${status.currentValue}s (target: ${status.target}s) - ${status.compliance ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
    }, 10000);

    it('should monitor Model Router availability SLO', async () => {
      const slo = framework['sloDefinitions'].find(s => s.name === 'model_router_availability')!;
      const status = await framework.checkSLOCompliance(slo);
      
      sloStatuses.push(status);
      
      expect(status.target).toBe(99.5);
      expect(status.currentValue).toBeGreaterThan(95); // Should be reasonably high
      
      console.log(`Model Router Availability: ${status.currentValue}% (target: ${status.target}%) - ${status.compliance ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
    }, 10000);

    it('should monitor ToolHub vector search latency SLO', async () => {
      const slo = framework['sloDefinitions'].find(s => s.name === 'toolhub_vector_search_latency')!;
      const status = await framework.checkSLOCompliance(slo);
      
      sloStatuses.push(status);
      
      expect(status.target).toBe(0.3);
      
      console.log(`ToolHub Vector Search P95: ${status.currentValue}s (target: ${status.target}s) - ${status.compliance ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
    }, 10000);

    it('should monitor simulation success rate SLO', async () => {
      const slo = framework['sloDefinitions'].find(s => s.name === 'simulation_success_rate')!;
      const status = await framework.checkSLOCompliance(slo);
      
      sloStatuses.push(status);
      
      expect(status.target).toBe(95.0);
      
      console.log(`Simulation Success Rate: ${status.currentValue}% (target: ${status.target}%) - ${status.compliance ? '✅ COMPLIANT' : '❌ VIOLATION'}`);
    }, 10000);

    it('should check all SLOs and generate violations report', async () => {
      // Check remaining SLOs
      const remainingSLOs = framework['sloDefinitions'].filter(slo => 
        !sloStatuses.some(status => status.sloName === slo.name)
      );

      for (const slo of remainingSLOs) {
        const status = await framework.checkSLOCompliance(slo);
        sloStatuses.push(status);

        const violation = await framework.generateSLOViolation(slo, status);
        if (violation) {
          violations.push(violation);
        }
      }

      // Verify we checked all SLOs
      expect(sloStatuses.length).toBe(framework['sloDefinitions'].length);
      
      // Log violations
      if (violations.length > 0) {
        console.log(`\n⚠️ SLO Violations Detected (${violations.length}):`);
        violations.forEach(v => {
          console.log(`  - ${v.sloName}: ${v.impactDescription}`);
          console.log(`    Recommended actions: ${v.recommendedActions.slice(0, 2).join(', ')}`);
        });
      } else {
        console.log('\n✅ All SLOs are compliant');
      }
    }, 30000);
  });

  describe('Error Budget Management', () => {
    it('should track error budget consumption', async () => {
      const errorBudgets = sloStatuses.map(status => ({
        slo: status.sloName,
        remaining: status.errorBudgetRemaining,
        burnRate: status.burnRate
      }));

      errorBudgets.forEach(budget => {
        expect(budget.remaining).toBeGreaterThanOrEqual(0);
        expect(budget.remaining).toBeLessThanOrEqual(100);
        expect(budget.burnRate).toBeGreaterThanOrEqual(0);
      });

      const lowBudgetSLOs = errorBudgets.filter(b => b.remaining < 20);
      if (lowBudgetSLOs.length > 0) {
        console.log(`\n💰 Low Error Budget Warning (${lowBudgetSLOs.length} SLOs):`);
        lowBudgetSLOs.forEach(slo => {
          console.log(`  - ${slo.slo}: ${slo.remaining.toFixed(1)}% remaining`);
        });
      }
    });

    it('should alert on high burn rates', async () => {
      const highBurnRateSLOs = sloStatuses.filter(status => status.burnRate > 10);
      
      highBurnRateSLOs.forEach(status => {
        console.log(`🔥 High burn rate detected: ${status.sloName} (${status.burnRate.toFixed(1)}%/h)`);
      });

      // High burn rates should trigger alerts
      const criticalBurnRates = sloStatuses.filter(status => status.burnRate > 50);
      expect(criticalBurnRates.length).toBe(0); // No critical burn rates in testing
    });
  });

  describe('Performance Trend Analysis', () => {
    it('should identify performance trends', async () => {
      const trends = {
        improving: sloStatuses.filter(s => s.trend === 'improving').length,
        stable: sloStatuses.filter(s => s.trend === 'stable').length,
        degrading: sloStatuses.filter(s => s.trend === 'degrading').length
      };

      console.log(`\n📈 Performance Trends:`);
      console.log(`  Improving: ${trends.improving}`);
      console.log(`  Stable: ${trends.stable}`);
      console.log(`  Degrading: ${trends.degrading}`);

      expect(trends.improving + trends.stable + trends.degrading).toBe(sloStatuses.length);
      
      // More improving/stable than degrading is good
      expect(trends.improving + trends.stable).toBeGreaterThan(trends.degrading);
    });
  });

  afterAll(async () => {
    // Generate final SLO report
    const reportPath = await framework.generateSLOReport();
    
    console.log(`\n📊 SLO Monitoring Summary:`);
    console.log(`  Total SLOs monitored: ${sloStatuses.length}`);
    console.log(`  Compliant SLOs: ${sloStatuses.filter(s => s.compliance).length}`);
    console.log(`  SLO violations: ${violations.length}`);
    console.log(`  Critical alerts: ${sloStatuses.filter(s => s.alertStatus === 'critical').length}`);
    console.log(`  Warning alerts: ${sloStatuses.filter(s => s.alertStatus === 'warning').length}`);
    console.log(`  Report generated: ${reportPath}`);
    
    // Overall health check
    const complianceRate = sloStatuses.filter(s => s.compliance).length / sloStatuses.length;
    expect(complianceRate).toBeGreaterThanOrEqual(0.8); // At least 80% SLO compliance
  });
});