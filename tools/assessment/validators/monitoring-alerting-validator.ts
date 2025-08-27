/**
 * SMM Architect Monitoring & Alerting Validator
 * 
 * Validates production monitoring, SLO compliance, and incident response capabilities
 * for production readiness.
 */

import { 
  SMMProductionAssessmentConfig,
  AssessmentResult,
  AssessmentCategory,
  AssessmentStatus,
  CriticalityLevel,
  AssessmentFinding,
  FindingSeverity,
  FindingType,
  ProductionImpact,
  Recommendation,
  RecommendationType,
  Priority
} from '../core/types.js';
import { IValidator } from '../core/orchestrator.js';
import { SMMAssessmentConfigManager } from '../core/config.js';

export class MonitoringAlertingValidator implements IValidator {
  public readonly name = 'monitoring-alerting';
  public readonly category = AssessmentCategory.MONITORING_ALERTING;
  public readonly criticalityLevel = CriticalityLevel.BLOCKER;

  private config: SMMProductionAssessmentConfig;
  private configManager: SMMAssessmentConfigManager;

  constructor() {
    this.config = {} as SMMProductionAssessmentConfig; // Will be set in validate method
    this.configManager = SMMAssessmentConfigManager.getInstance();
  }

  public async validate(config: SMMProductionAssessmentConfig): Promise<AssessmentResult> {
    this.config = config;
    const startTime = Date.now();
    
    console.log('📈 Validating Monitoring & Alerting...');
    
    const findings: AssessmentFinding[] = [];
    const recommendations: Recommendation[] = [];
    
    try {
      const monitoringValidation = await this.validateMonitoringCapabilities();
      this.analyzeMonitoringResults(monitoringValidation, findings, recommendations);
      
      const score = this.calculateScore(findings);
      const status = this.determineStatus(findings, score);
      
      return {
        validatorName: this.name,
        category: this.category,
        status,
        score,
        criticalityLevel: this.criticalityLevel,
        findings,
        recommendations,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('❌ Monitoring & alerting validation failed:', error);
      
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.CRITICAL,
        title: 'Monitoring & alerting validation failed',
        description: `Failed to validate monitoring & alerting: ${error instanceof Error ? error.message : String(error)}`,
        evidence: [error instanceof Error ? error.stack || error.message : String(error)],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix monitoring & alerting implementation',
          priority: 'immediate',
          estimatedEffort: '2-4 days',
          dependencies: ['Monitoring service', 'Alerting service'],
          implementationGuide: 'Check monitoring metric collection, alert rule configuration, and incident response workflows'
        }],
        affectedComponents: ['monitoring-service', 'alerting-service']
      });
      
      return {
        validatorName: this.name,
        category: this.category,
        status: AssessmentStatus.CRITICAL_FAIL,
        score: 0,
        criticalityLevel: this.criticalityLevel,
        findings,
        recommendations: [],
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  private async validateMonitoringCapabilities(): Promise<any> {
    console.log('🔍 Testing monitoring & alerting components...');
    
    // 1. Validate metric collection
    const metricCollection = await this.validateMetricCollection();
    
    // 2. Test SLO compliance monitoring
    const sloCompliance = await this.testSLOCompliance();
    
    // 3. Validate alert rule configuration
    const alertConfiguration = await this.validateAlertConfiguration();
    
    // 4. Test incident response capabilities
    const incidentResponse = await this.testIncidentResponse();
    
    return {
      metricCollection,
      sloCompliance,
      alertConfiguration,
      incidentResponse
    };
  }

  private async validateMetricCollection(): Promise<boolean> {
    console.log('📊 Validating metric collection...');
    
    try {
      // Test metrics service
      const metricsServiceUrl = process.env['METRICS_SERVICE_URL'] || 'http://localhost:8013';
      
      // Send test metrics
      const testMetrics = {
        timestamp: new Date().toISOString(),
        tenantId: 'test-tenant',
        serviceName: 'assessment-test',
        metrics: [
          { name: 'response_time', value: 150, unit: 'ms' },
          { name: 'error_rate', value: 0.01, unit: 'percentage' },
          { name: 'throughput', value: 100, unit: 'requests/sec' }
        ]
      };
      
      const response = await this.makeRequest(`${metricsServiceUrl}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMetrics),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      // Verify metrics were stored by querying them back
      const queryResponse = await this.makeRequest(
        `${metricsServiceUrl}/query?service=assessment-test&metric=response_time&limit=1`, 
        { method: 'GET', timeout: 5000 }
      );
      
      return queryResponse.ok;
    } catch (error) {
      console.error('Metric collection validation error:', error);
      return false;
    }
  }

  private async testSLOCompliance(): Promise<boolean> {
    console.log('🎯 Testing SLO compliance monitoring...');
    
    try {
      // Test SLO service
      const sloServiceUrl = process.env['SLO_SERVICE_URL'] || 'http://localhost:8014';
      
      // Define test SLO
      const testSLO = {
        id: `slo-test-${Date.now()}`,
        tenantId: 'test-tenant',
        name: 'API Response Time SLO',
        service: 'api-service',
        objective: 'response_time',
        target: 200, // 200ms target
        threshold: 500, // 500ms threshold
        period: '30d', // 30 day rolling window
        warningThreshold: 0.95, // Alert if < 95% compliant
        errorThreshold: 0.90 // Critical alert if < 90% compliant
      };
      
      // Create SLO
      const createResponse = await this.makeRequest(`${sloServiceUrl}/slos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSLO),
        timeout: 10000
      });
      
      if (!createResponse.ok) return false;
      
      // Test SLO evaluation
      const sloData = await createResponse.json();
      const sloId = sloData.id;
      
      const evaluationResponse = await this.makeRequest(`${sloServiceUrl}/slos/${sloId}/evaluate`, {
        method: 'GET',
        timeout: 10000
      });
      
      return evaluationResponse.ok;
    } catch (error) {
      console.error('SLO compliance validation error:', error);
      return false;
    }
  }

  private async validateAlertConfiguration(): Promise<boolean> {
    console.log('🔔 Validating alert configuration...');
    
    try {
      // Test alerting service
      const alertingServiceUrl = process.env['ALERTING_SERVICE_URL'] || 'http://localhost:8015';
      
      // Define test alert rule
      const testAlertRule = {
        id: `alert-rule-test-${Date.now()}`,
        tenantId: 'test-tenant',
        name: 'High Error Rate Alert',
        condition: 'error_rate > 0.05',
        severity: 'high',
        notificationChannels: ['slack', 'email'],
        cooldownPeriod: 300, // 5 minutes
        enabled: true
      };
      
      // Create alert rule
      const response = await this.makeRequest(`${alertingServiceUrl}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testAlertRule),
        timeout: 10000
      });
      
      return response.ok;
    } catch (error) {
      console.error('Alert configuration validation error:', error);
      return false;
    }
  }

  private async testIncidentResponse(): Promise<boolean> {
    console.log('🚒 Testing incident response capabilities...');
    
    try {
      // Test incident management service
      const incidentServiceUrl = process.env['INCIDENT_SERVICE_URL'] || 'http://localhost:8016';
      
      // Create test incident
      const testIncident = {
        id: `incident-test-${Date.now()}`,
        tenantId: 'test-tenant',
        title: 'Test Incident for Validation',
        description: 'This is a test incident created during validation',
        severity: 'high',
        status: 'open',
        assignees: ['oncall-engineer'],
        service: 'api-service'
      };
      
      // Create incident
      const createResponse = await this.makeRequest(`${incidentServiceUrl}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testIncident),
        timeout: 10000
      });
      
      if (!createResponse.ok) return false;
      
      const incidentData = await createResponse.json();
      const incidentId = incidentData.id;
      
      // Test incident update
      const updateResponse = await this.makeRequest(`${incidentServiceUrl}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'acknowledged', acknowledgedBy: 'assessment-system' }),
        timeout: 10000
      });
      
      return updateResponse.ok;
    } catch (error) {
      console.error('Incident response validation error:', error);
      return false;
    }
  }

  private async makeRequest(url: string, options: any): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private analyzeMonitoringResults(
    validation: any,
    findings: AssessmentFinding[],
    recommendations: Recommendation[]
  ): void {
    // Analyze metric collection
    if (!validation.metricCollection) {
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.CRITICAL,
        title: 'Metric collection not working',
        description: 'System metrics are not being properly collected and stored',
        evidence: ['Metrics endpoint returning errors or not storing data'],
        impact: ProductionImpact.PERFORMANCE_DEGRADATION,
        remediation: [{
          action: 'Fix metric collection pipelines',
          priority: 'immediate',
          estimatedEffort: '2-3 days',
          dependencies: ['Metrics service'],
          implementationGuide: 'Review metric collection agents and storage configuration'
        }],
        affectedComponents: ['metrics-service']
      });
    }

    // Analyze SLO compliance
    if (!validation.sloCompliance) {
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.HIGH,
        title: 'SLO compliance monitoring not working',
        description: 'Service Level Objectives are not being properly monitored',
        evidence: ['SLO evaluation failing or returning errors'],
        impact: ProductionImpact.USER_EXPERIENCE_IMPACT,
        remediation: [{
          action: 'Fix SLO monitoring implementation',
          priority: 'high',
          estimatedEffort: '2-3 days',
          dependencies: ['SLO service'],
          implementationGuide: 'Review SLO calculation logic and compliance tracking'
        }],
        affectedComponents: ['slo-service']
      });
    }

    // Analyze alert configuration
    if (!validation.alertConfiguration) {
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.CRITICAL,
        title: 'Alert configuration not working',
        description: 'Alert rules are not being properly configured or evaluated',
        evidence: ['Alert rule creation failing'],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix alert rule configuration',
          priority: 'immediate',
          estimatedEffort: '1-2 days',
          dependencies: ['Alerting service'],
          implementationGuide: 'Review alert rule syntax and validation logic'
        }],
        affectedComponents: ['alerting-service']
      });
    }

    // Analyze incident response
    if (!validation.incidentResponse) {
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.HIGH,
        title: 'Incident response capabilities not working',
        description: 'Incident management workflows are not functioning correctly',
        evidence: ['Incident creation or update failing'],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix incident response workflows',
          priority: 'high',
          estimatedEffort: '2-3 days',
          dependencies: ['Incident service'],
          implementationGuide: 'Review incident creation, update, and notification mechanisms'
        }],
        affectedComponents: ['incident-service']
      });
    }

    // Generate recommendations based on findings
    if (findings.length > 0) {
      recommendations.push({
        type: RecommendationType.MONITORING_ENHANCEMENT,
        priority: Priority.P0,
        title: 'Strengthen monitoring & alerting implementation',
        description: 'Implement comprehensive monitoring, SLO compliance tracking, and incident response capabilities',
        businessImpact: 'Critical for system reliability and rapid issue detection',
        technicalSteps: [
          'Ensure complete metric collection from all services',
          'Implement SLO monitoring for all critical services',
          'Configure comprehensive alert rules with proper escalation',
          'Establish robust incident response workflows'
        ],
        riskMitigation: 'Prevents undetected outages and slow incident response'
      });
    }
  }

  private calculateScore(findings: AssessmentFinding[]): number {
    let score = 100;
    
    findings.forEach(finding => {
      switch (finding.severity) {
        case FindingSeverity.CRITICAL:
          score -= 40;
          break;
        case FindingSeverity.HIGH:
          score -= 25;
          break;
        case FindingSeverity.MEDIUM:
          score -= 15;
          break;
        case FindingSeverity.LOW:
          score -= 5;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  private determineStatus(findings: AssessmentFinding[], score: number): AssessmentStatus {
    const criticalFindings = findings.filter(f => f.severity === FindingSeverity.CRITICAL);
    
    if (criticalFindings.length > 0) {
      return AssessmentStatus.CRITICAL_FAIL;
    }
    
    if (score < 60) {
      return AssessmentStatus.FAIL;
    }
    
    if (score < 80) {
      return AssessmentStatus.WARNING;
    }
    
    return AssessmentStatus.PASS;
  }
}