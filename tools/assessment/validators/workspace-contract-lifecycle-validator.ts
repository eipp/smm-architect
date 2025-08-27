/**
 * SMM Architect Workspace Contract Lifecycle Validator
 * 
 * Validates end-to-end workspace operations, approval workflows, and contract processing
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
  Priority,
  WorkspaceScopingValidation
} from '../core/types.js';
import { IValidator } from '../core/orchestrator.js';
import { SMMAssessmentConfigManager } from '../core/config.js';

export class WorkspaceContractLifecycleValidator implements IValidator {
  public readonly name = 'workspace-contract-lifecycle';
  public readonly category = AssessmentCategory.WORKSPACE_LIFECYCLE;
  public readonly criticalityLevel = CriticalityLevel.HIGH;

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
    
    console.log('🏢 Validating Workspace Contract Lifecycle...');
    
    const findings: AssessmentFinding[] = [];
    const recommendations: Recommendation[] = [];
    
    try {
      const workspaceValidation = await this.validateWorkspaceLifecycle();
      this.analyzeWorkspaceResults(workspaceValidation, findings, recommendations);
      
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
      console.error('❌ Workspace contract lifecycle validation failed:', error);
      
      findings.push({
        type: FindingType.WORKSPACE_CONTRACT_INVALID,
        severity: FindingSeverity.CRITICAL,
        title: 'Workspace contract lifecycle validation failed',
        description: `Failed to validate workspace contract lifecycle: ${error instanceof Error ? error.message : String(error)}`,
        evidence: [error instanceof Error ? error.stack || error.message : String(error)],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix workspace contract lifecycle implementation',
          priority: 'immediate',
          estimatedEffort: '2-4 days',
          dependencies: ['Workspace service', 'Approval workflow service'],
          implementationGuide: 'Check workspace creation, approval, and contract processing workflows'
        }],
        affectedComponents: ['workspace-service', 'approval-workflow']
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

  private async validateWorkspaceLifecycle(): Promise<WorkspaceScopingValidation> {
    console.log('🔍 Testing workspace lifecycle components...');
    
    // 1. Validate contract validation
    const contractValidation = await this.validateContractProcessing();
    
    // 2. Test approval workflows
    const approvalWorkflows = await this.testApprovalWorkflows();
    
    // 3. Validate cost management
    const costManagement = await this.validateCostManagement();
    
    // 4. Test policy enforcement
    const policyEnforcement = await this.testPolicyEnforcement();
    
    return {
      contractValidation,
      approvalWorkflows,
      costManagement,
      policyEnforcement
    };
  }

  private async validateContractProcessing(): Promise<boolean> {
    console.log('📄 Validating contract processing...');
    
    try {
      // Test contract creation and validation
      const workspaceServiceUrl = process.env['WORKSPACE_SERVICE_URL'] || 'http://localhost:8006';
      
      // Create test contract
      const testContract = {
        id: `contract-test-${Date.now()}`,
        tenantId: this.testTenantId,
        workspaceName: 'Test Workspace',
        billingInfo: {
          plan: 'enterprise',
          billingCycle: 'monthly'
        },
        terms: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: true
        }
      };
      
      const response = await this.makeRequest(`${workspaceServiceUrl}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testContract),
        timeout: 10000
      });
      
      return response.ok;
    } catch (error) {
      console.error('Contract processing validation error:', error);
      return false;
    }
  }

  private async testApprovalWorkflows(): Promise<boolean> {
    console.log('✅ Testing approval workflows...');
    
    try {
      // Test approval workflow service
      const approvalServiceUrl = process.env['APPROVAL_SERVICE_URL'] || 'http://localhost:8007';
      
      // Create test approval request
      const testApproval = {
        id: `approval-test-${Date.now()}`,
        tenantId: this.testTenantId,
        resourceType: 'workspace',
        resourceId: 'test-workspace',
        requester: 'test-user',
        approvers: ['admin-user'],
        action: 'create'
      };
      
      const response = await this.makeRequest(`${approvalServiceUrl}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testApproval),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      // Test approval processing
      const approvalData = await response.json();
      const approvalId = approvalData.id;
      
      const approveResponse = await this.makeRequest(`${approvalServiceUrl}/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'admin-user', comment: 'Approved for testing' }),
        timeout: 10000
      });
      
      return approveResponse.ok;
    } catch (error) {
      console.error('Approval workflow validation error:', error);
      return false;
    }
  }

  private async validateCostManagement(): Promise<boolean> {
    console.log('💰 Validating cost management...');
    
    try {
      // Test cost management service
      const costServiceUrl = process.env['COST_SERVICE_URL'] || 'http://localhost:8008';
      
      // Test cost calculation
      const testCalculation = {
        id: `cost-test-${Date.now()}`,
        tenantId: this.testTenantId,
        workspaceId: 'test-workspace',
        resources: [
          { type: 'agent', count: 5, unitCost: 10 },
          { type: 'campaign', count: 2, unitCost: 50 }
        ],
        period: 'monthly'
      };
      
      const response = await this.makeRequest(`${costServiceUrl}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCalculation),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      const costData = await response.json();
      // Validate cost calculation result
      return costData.totalCost > 0;
    } catch (error) {
      console.error('Cost management validation error:', error);
      return false;
    }
  }

  private async testPolicyEnforcement(): Promise<boolean> {
    console.log('👮 Testing policy enforcement...');
    
    try {
      // Test policy service
      const policyServiceUrl = process.env['POLICY_SERVICE_URL'] || 'http://localhost:8009';
      
      // Test policy evaluation
      const testPolicyCheck = {
        id: `policy-test-${Date.now()}`,
        tenantId: this.testTenantId,
        action: 'create_workspace',
        resource: 'workspace',
        context: {
          userRole: 'admin',
          planType: 'enterprise'
        }
      };
      
      const response = await this.makeRequest(`${policyServiceUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPolicyCheck),
        timeout: 10000
      });
      
      if (!response.ok) return false;
      
      const policyResult = await response.json();
      return policyResult.allowed === true;
    } catch (error) {
      console.error('Policy enforcement validation error:', error);
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

  private analyzeWorkspaceResults(
    validation: WorkspaceScopingValidation,
    findings: AssessmentFinding[],
    recommendations: Recommendation[]
  ): void {
    // Analyze contract validation
    if (!validation.contractValidation) {
      findings.push({
        type: FindingType.WORKSPACE_CONTRACT_INVALID,
        severity: FindingSeverity.HIGH,
        title: 'Workspace contract processing failed',
        description: 'Workspace contract creation and validation is not working properly',
        evidence: ['Contract processing endpoint returned error'],
        impact: ProductionImpact.FINANCIAL_LOSS,
        remediation: [{
          action: 'Fix contract processing workflows',
          priority: 'high',
          estimatedEffort: '3-5 days',
          dependencies: ['Workspace service', 'Billing service'],
          implementationGuide: 'Review contract creation and validation logic in workspace service'
        }],
        affectedComponents: ['workspace-service', 'billing-service']
      });
    }

    // Analyze approval workflows
    if (!validation.approvalWorkflows) {
      findings.push({
        type: FindingType.WORKSPACE_CONTRACT_INVALID,
        severity: FindingSeverity.HIGH,
        title: 'Approval workflows not functioning',
        description: 'Workspace approval workflows are not processing correctly',
        evidence: ['Approval workflow endpoint returned error'],
        impact: ProductionImpact.USER_EXPERIENCE_IMPACT,
        remediation: [{
          action: 'Fix approval workflow implementation',
          priority: 'high',
          estimatedEffort: '2-4 days',
          dependencies: ['Approval service'],
          implementationGuide: 'Review approval workflow processing and notification mechanisms'
        }],
        affectedComponents: ['approval-service']
      });
    }

    // Analyze cost management
    if (!validation.costManagement) {
      findings.push({
        type: FindingType.COST_CALCULATION_INACCURATE,
        severity: FindingSeverity.HIGH,
        title: 'Cost management validation failed',
        description: 'Workspace cost calculation is not working properly',
        evidence: ['Cost calculation endpoint returned error or invalid result'],
        impact: ProductionImpact.FINANCIAL_LOSS,
        remediation: [{
          action: 'Fix cost calculation implementation',
          priority: 'high',
          estimatedEffort: '2-3 days',
          dependencies: ['Cost service'],
          implementationGuide: 'Review cost calculation formulas and resource pricing logic'
        }],
        affectedComponents: ['cost-service']
      });
    }

    // Analyze policy enforcement
    if (!validation.policyEnforcement) {
      findings.push({
        type: FindingType.SECURITY_VULNERABILITY,
        severity: FindingSeverity.HIGH,
        title: 'Policy enforcement not working',
        description: 'Workspace policy enforcement is not functioning correctly',
        evidence: ['Policy evaluation endpoint returned error or denied valid request'],
        impact: ProductionImpact.SECURITY_VULNERABILITY,
        remediation: [{
          action: 'Fix policy enforcement implementation',
          priority: 'high',
          estimatedEffort: '2-3 days',
          dependencies: ['Policy service'],
          implementationGuide: 'Review policy evaluation rules and enforcement mechanisms'
        }],
        affectedComponents: ['policy-service']
      });
    }

    // Generate recommendations based on findings
    if (findings.length > 0) {
      recommendations.push({
        type: RecommendationType.PROCESS_IMPROVEMENT,
        priority: Priority.P1,
        title: 'Strengthen workspace contract lifecycle implementation',
        description: 'Implement robust workspace creation, approval, and contract processing workflows',
        businessImpact: 'Critical for customer onboarding and billing accuracy',
        technicalSteps: [
          'Implement comprehensive contract validation',
          'Strengthen approval workflow processing',
          'Ensure accurate cost calculation',
          'Enforce workspace policies consistently'
        ],
        riskMitigation: 'Prevents billing errors, security violations, and customer onboarding failures'
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