/**
 * SMM Architect Production Data Flow Validator
 * 
 * Validates real-time data processing, cost calculation accuracy, and budget enforcement
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

export class ProductionDataFlowValidator implements IValidator {
  public readonly name = 'production-data-flow';
  public readonly category = AssessmentCategory.DATA_FLOW_VALIDATION;
  public readonly criticalityLevel = CriticalityLevel.CRITICAL;

  private config: SMMProductionAssessmentConfig;
  private configManager: SMMAssessmentConfigManager;
  private testTenantId: string;

  constructor() {
    this.config = {} as SMMProductionAssessmentConfig; // Will be set in validate method
    this.configManager = SMMAssessmentConfigManager.getInstance();
    this.testTenantId = `assessment-tenant-${Date.now()}`;
  }

  public async validate(config: SMMProductionAssessmentConfig): Promise<AssessmentResult> {
    this.config = config;
    const startTime = Date.now();
    
    console.log('📊 Validating Production Data Flow...');
    
    const findings: AssessmentFinding[] = [];
    const recommendations: Recommendation[] = [];
    
    try {
      // Validate data flow components
      const dataFlowValidation = await this.validateDataFlow();
      this.analyzeDataFlowResults(dataFlowValidation, findings, recommendations);
      
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
      console.error('❌ Production data flow validation failed:', error);
      
      findings.push({
        type: FindingType.COST_CALCULATION_INACCURATE,
        severity: FindingSeverity.CRITICAL,
        title: 'Production data flow validation failed',
        description: `Failed to validate production data flow: ${error instanceof Error ? error.message : String(error)}`,
        evidence: [error instanceof Error ? error.stack || error.message : String(error)],
        impact: ProductionImpact.FINANCIAL_LOSS,
        remediation: [{
          action: 'Fix production data flow implementation',
          priority: 'immediate',
          estimatedEffort: '2-4 days',
          dependencies: ['Data processing service', 'Cost calculation service'],
          implementationGuide: 'Check real-time data processing pipelines and cost calculation accuracy'
        }],
        affectedComponents: ['data-processing-service', 'cost-calculation-service']
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

  private async validateDataFlow(): Promise<any> {
    console.log('🔍 Testing production data flow components...');
    
    // 1. Validate real-time data processing
    const realTimeProcessing = await this.validateRealTimeDataProcessing();
    
    // 2. Test cost calculation accuracy
    const costCalculationAccuracy = await this.testCostCalculationAccuracy();
    
    // 3. Validate budget enforcement
    const budgetEnforcement = await this.validateBudgetEnforcement();
    
    // 4. Test data lineage tracking
    const dataLineageTracking = await this.testDataLineageTracking();
    
    return {
      realTimeProcessing,
      costCalculationAccuracy,
      budgetEnforcement,
      dataLineageTracking
    };
  }

  private async validateRealTimeDataProcessing(): Promise<boolean> {
    console.log('⚡ Validating real-time data processing...');
    
    try {
      // Test data processing service
      const dataProcessingUrl = process.env['DATA_PROCESSING_SERVICE_URL'] || 'http://localhost:8010';
      
      // Create test data processing job
      const testDataJob = {
        id: `data-job-test-${Date.now()}`,
        tenantId: this.testTenantId,
        source: 'social_media_api',
        destination: 'analytics_database',
        transformation: 'campaign_metrics',
        priority: 'high'
      };
      
      const response = await this.makeRequest(`${dataProcessingUrl}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testDataJob),
        timeout: 15000
      });
      
      if (!response.ok) return false;
      
      const jobData = await response.json();
      const jobId = jobData.id;
      
      // Wait for job completion and check status
      const maxRetries = 10;
      let retries = 0;
      
      while (retries < maxRetries) {
        const statusResponse = await this.makeRequest(`${dataProcessingUrl}/jobs/${jobId}`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'completed') {
            return statusData.processedRecords > 0;
          } else if (statusData.status === 'failed') {
            return false;
          }
        }
        
        retries++;
        await this.sleep(1000); // Wait 1 second before retry
      }
      
      return false; // Job didn't complete in time
    } catch (error) {
      console.error('Real-time data processing validation error:', error);
      return false;
    }
  }

  private async testCostCalculationAccuracy(): Promise<boolean> {
    console.log('🧮 Testing cost calculation accuracy...');
    
    try {
      // Test cost calculation service
      const costServiceUrl = process.env['COST_SERVICE_URL'] || 'http://localhost:8008';
      
      // Create test cost calculation with known values
      const testData = {
        id: `cost-calc-test-${Date.now()}`,
        tenantId: this.testTenantId,
        resources: [
          { type: 'agent_hour', count: 10, unitCost: 0.5 },
          { type: 'api_call', count: 1000, unitCost: 0.01 },
          { type: 'storage_gb', count: 50, unitCost: 0.1 }
        ],
        period: 'monthly',
        expectedTotal: 20.0 // 10*0.5 + 1000*0.01 + 50*0.1 = 5 + 10 + 5 = 20
      };
      
      const response = await this.makeRequest(`${costServiceUrl}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      const result = await response.json();
      
      // Check if calculated total matches expected total (with small tolerance for floating point)
      const tolerance = 0.01;
      return Math.abs(result.totalCost - testData.expectedTotal) < tolerance;
    } catch (error) {
      console.error('Cost calculation accuracy validation error:', error);
      return false;
    }
  }

  private async validateBudgetEnforcement(): Promise<boolean> {
    console.log('💸 Validating budget enforcement...');
    
    try {
      // Test budget service
      const budgetServiceUrl = process.env['BUDGET_SERVICE_URL'] || 'http://localhost:8011';
      
      // Set up test budget
      const testBudget = {
        id: `budget-test-${Date.now()}`,
        tenantId: this.testTenantId,
        monthlyLimit: 1000.0,
        alertThresholds: [70, 80, 90]
      };
      
      // Create budget
      const createResponse = await this.makeRequest(`${budgetServiceUrl}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBudget),
        timeout: 10000
      });
      
      if (!createResponse.ok) return false;
      
      // Test budget enforcement with operation that exceeds limit
      const testOperation = {
        id: `operation-test-${Date.now()}`,
        tenantId: this.testTenantId,
        cost: 1500.0, // Exceeds the $1000 monthly limit
        description: 'Test operation exceeding budget'
      };
      
      const operationResponse = await this.makeRequest(`${budgetServiceUrl}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOperation),
        timeout: 10000
      });
      
      if (!operationResponse.ok) return false;
      
      const result = await operationResponse.json();
      
      // Should be denied due to budget exceeded
      return result.allowed === false && result.reason === 'budget_exceeded';
    } catch (error) {
      console.error('Budget enforcement validation error:', error);
      return false;
    }
  }

  private async testDataLineageTracking(): Promise<boolean> {
    console.log('🔗 Testing data lineage tracking...');
    
    try {
      // Test data lineage service
      const lineageServiceUrl = process.env['LINEAGE_SERVICE_URL'] || 'http://localhost:8012';
      
      // Create test lineage record
      const testLineage = {
        id: `lineage-test-${Date.now()}`,
        tenantId: this.testTenantId,
        source: 'social_media_api',
        destination: 'analytics_database',
        transformation: 'metrics_aggregation',
        timestamp: new Date().toISOString(),
        metadata: {
          campaignId: 'test-campaign',
          agentId: 'test-agent'
        }
      };
      
      const response = await this.makeRequest(`${lineageServiceUrl}/lineage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLineage),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      const lineageData = await response.json();
      const lineageId = lineageData.id;
      
      // Verify lineage tracking
      const verifyResponse = await this.makeRequest(`${lineageServiceUrl}/lineage/${lineageId}`, {
        method: 'GET',
        timeout: 5000
      });
      
      return verifyResponse.ok;
    } catch (error) {
      console.error('Data lineage tracking validation error:', error);
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private analyzeDataFlowResults(
    validation: any,
    findings: AssessmentFinding[],
    recommendations: Recommendation[]
  ): void {
    // Analyze real-time data processing
    if (!validation.realTimeProcessing) {
      findings.push({
        type: FindingType.PERFORMANCE_DEGRADATION,
        severity: FindingSeverity.HIGH,
        title: 'Real-time data processing not working',
        description: 'Real-time data processing pipelines are not functioning correctly',
        evidence: ['Data processing jobs failing or not completing'],
        impact: ProductionImpact.PERFORMANCE_DEGRADATION,
        remediation: [{
          action: 'Fix real-time data processing pipelines',
          priority: 'high',
          estimatedEffort: '3-5 days',
          dependencies: ['Data processing service'],
          implementationGuide: 'Review data processing job execution and error handling'
        }],
        affectedComponents: ['data-processing-service']
      });
    }

    // Analyze cost calculation accuracy
    if (!validation.costCalculationAccuracy) {
      findings.push({
        type: FindingType.COST_CALCULATION_INACCURATE,
        severity: FindingSeverity.CRITICAL,
        title: 'Cost calculation accuracy issues',
        description: 'Cost calculations are producing inaccurate results',
        evidence: ['Calculated costs do not match expected values'],
        impact: ProductionImpact.FINANCIAL_LOSS,
        remediation: [{
          action: 'Fix cost calculation formulas',
          priority: 'immediate',
          estimatedEffort: '2-3 days',
          dependencies: ['Cost calculation service'],
          implementationGuide: 'Review cost calculation logic and unit pricing'
        }],
        affectedComponents: ['cost-calculation-service']
      });
    }

    // Analyze budget enforcement
    if (!validation.budgetEnforcement) {
      findings.push({
        type: FindingType.COST_CALCULATION_INACCURATE,
        severity: FindingSeverity.CRITICAL,
        title: 'Budget enforcement not working',
        description: 'Budget limits are not being properly enforced',
        evidence: ['Budget exceeded operations not being blocked'],
        impact: ProductionImpact.FINANCIAL_LOSS,
        remediation: [{
          action: 'Fix budget enforcement mechanisms',
          priority: 'immediate',
          estimatedEffort: '2-3 days',
          dependencies: ['Budget service'],
          implementationGuide: 'Review budget checking logic and enforcement policies'
        }],
        affectedComponents: ['budget-service']
      });
    }

    // Analyze data lineage tracking
    if (!validation.dataLineageTracking) {
      findings.push({
        type: FindingType.MONITORING_GAPS,
        severity: FindingSeverity.MEDIUM,
        title: 'Data lineage tracking not working',
        description: 'Data lineage tracking is not properly recording data flow',
        evidence: ['Lineage records not being created or retrieved'],
        impact: ProductionImpact.USER_EXPERIENCE_IMPACT,
        remediation: [{
          action: 'Fix data lineage tracking implementation',
          priority: 'medium',
          estimatedEffort: '2-3 days',
          dependencies: ['Lineage service'],
          implementationGuide: 'Review lineage record creation and retrieval mechanisms'
        }],
        affectedComponents: ['lineage-service']
      });
    }

    // Generate recommendations based on findings
    if (findings.length > 0) {
      recommendations.push({
        type: RecommendationType.PERFORMANCE_OPTIMIZATION,
        priority: Priority.P0,
        title: 'Strengthen production data flow implementation',
        description: 'Implement robust real-time data processing, accurate cost calculation, and effective budget enforcement',
        businessImpact: 'Critical for financial accuracy and resource management',
        technicalSteps: [
          'Optimize real-time data processing pipelines',
          'Verify cost calculation accuracy with comprehensive testing',
          'Strengthen budget enforcement mechanisms',
          'Implement complete data lineage tracking'
        ],
        riskMitigation: 'Prevents financial losses, resource overruns, and data flow issues'
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