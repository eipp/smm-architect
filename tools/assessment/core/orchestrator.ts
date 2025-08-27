/**
 * SMM Architect Production Readiness Assessment Orchestrator
 * 
 * This is the main orchestrator that coordinates all validation processes
 * for comprehensive production readiness assessment of the SMM Architect platform.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  SMMProductionAssessmentConfig,
  AssessmentResult,
  AssessmentCategory,
  AssessmentStatus,
  CriticalityLevel,
  ProductionReadinessReport,
  ExecutiveSummary,
  TechnicalSummary,
  RecommendationsSummary,
  RiskAnalysis,
  ActionPlan,
  Priority,
  AssessmentFinding,
  FindingSeverity,
  ProductionImpact
} from './types.js';

// Import implemented validators
import { AgentOrchestrationValidator } from '../validators/agent-orchestration-validator.js';
import { MultiTenantSecurityValidator } from '../validators/multi-tenant-security-validator.js';
import { CampaignSimulationValidator } from '../validators/campaign-simulation-validator.js';
import { ExternalIntegrationValidator } from '../validators/external-integration-validator.js';
import { ComplianceFrameworkValidator } from '../validators/compliance-framework-validator.js';
import { WorkspaceContractLifecycleValidator } from '../validators/workspace-contract-lifecycle-validator.js';
import { ProductionDataFlowValidator } from '../validators/production-data-flow-validator.js';
import { MonitoringAlertingValidator } from '../validators/monitoring-alerting-validator.js';
import { RiskAnalysisEngine } from '../engines/risk-analysis-engine.js';

export interface IValidator {
  name: string;
  category: AssessmentCategory;
  criticalityLevel: CriticalityLevel;
  validate(config: SMMProductionAssessmentConfig): Promise<AssessmentResult>;
}

export class SMMProductionAssessmentOrchestrator {
  private validators: IValidator[] = [];
  private config: SMMProductionAssessmentConfig;
  private riskEngine: RiskAnalysisEngine;

  constructor(config: SMMProductionAssessmentConfig) {
    this.config = config;
    this.riskEngine = new RiskAnalysisEngine();
    this.initializeValidators();
  }

  private initializeValidators(): void {
    // Initialize implemented validators
    this.validators = [
      new AgentOrchestrationValidator(),
      new MultiTenantSecurityValidator(),
      new CampaignSimulationValidator(),
      new ExternalIntegrationValidator(),
      new ComplianceFrameworkValidator(),
      new WorkspaceContractLifecycleValidator(),
      new ProductionDataFlowValidator(),
      new MonitoringAlertingValidator()
    ];

    // Filter validators based on assessment level
    if (this.config.assessmentLevel === 'basic') {
      this.validators = this.validators.filter(v => 
        v.criticalityLevel === CriticalityLevel.BLOCKER || 
        v.criticalityLevel === CriticalityLevel.CRITICAL
      );
    }

    // Skip non-critical validators if configured
    if (this.config.skipNonCritical) {
      this.validators = this.validators.filter(v => 
        v.criticalityLevel === CriticalityLevel.BLOCKER || 
        v.criticalityLevel === CriticalityLevel.CRITICAL ||
        v.criticalityLevel === CriticalityLevel.HIGH
      );
    }
  }

  /**
   * Run comprehensive production readiness assessment
   */
  public async runAssessment(): Promise<ProductionReadinessReport> {
    console.log('🚀 Starting SMM Architect Production Readiness Assessment...');
    
    const startTime = Date.now();
    const assessmentId = `smm-assessment-${Date.now()}`;
    
    try {
      // Run all validators
      const validationResults = await this.runValidators();
      
      // Generate comprehensive report
      const report = await this.generateReport(assessmentId, validationResults);
      
      // Save reports if configured
      if (this.config.generateReports) {
        await this.saveReports(report);
      }
      
      const endTime = Date.now();
      console.log(`✅ Assessment completed in ${(endTime - startTime) / 1000}s`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Assessment failed:', error);
      throw error;
    }
  }

  /**
   * Run all validators in parallel or sequential mode
   */
  private async runValidators(): Promise<AssessmentResult[]> {
    console.log(`📊 Running ${this.validators.length} validators...`);
    
    const results: AssessmentResult[] = [];
    
    if (this.config.parallelExecution) {
      // Run all validators in parallel for faster execution
      const promises = this.validators.map(validator => 
        this.runSingleValidator(validator)
      );
      
      const parallelResults = await Promise.allSettled(promises);
      
      parallelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const validator = this.validators[index];
          if (validator) {
            console.error(`❌ Validator ${validator.name} failed:`, result.reason);
            results.push(this.createFailedValidationResult(validator, result.reason));
          } else {
            console.error(`❌ Unknown validator at index ${index} failed:`, result.reason);
            results.push(this.createFailedValidationResult({
              name: 'unknown',
              category: AssessmentCategory.AGENT_ORCHESTRATION,
              criticalityLevel: CriticalityLevel.INFO,
              validate: async () => { throw new Error('Unknown validator'); }
            } as IValidator, result.reason));
          }
        }
      });
    } else {
      // Run validators sequentially for better debugging
      for (const validator of this.validators) {
        try {
          const result = await this.runSingleValidator(validator);
          results.push(result);
        } catch (error) {
          console.error(`❌ Validator ${validator.name} failed:`, error);
          results.push(this.createFailedValidationResult(validator, error));
        }
      }
    }
    
    return results;
  }

  /**
   * Run a single validator with error handling and timing
   */
  private async runSingleValidator(validator: IValidator): Promise<AssessmentResult> {
    const startTime = Date.now();
    console.log(`🔍 Running ${validator.name}...`);
    
    try {
      const result = await validator.validate(this.config);
      const endTime = Date.now();
      
      console.log(`${this.getStatusEmoji(result.status)} ${validator.name}: ${result.status.toUpperCase()} (${result.score}/100) in ${endTime - startTime}ms`);
      
      return {
        ...result,
        executionTime: endTime - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ ${validator.name} failed after ${endTime - startTime}ms:`, error);
      throw error;
    }
  }

  /**
   * Create a failed validation result for error cases
   */
  private createFailedValidationResult(validator: IValidator, error: any): AssessmentResult {
    return {
      validatorName: validator.name,
      category: validator.category,
      status: AssessmentStatus.CRITICAL_FAIL,
      score: 0,
      criticalityLevel: validator.criticalityLevel,
      findings: [{
        type: 'VALIDATION_ERROR' as any,
        severity: FindingSeverity.CRITICAL,
        title: `${validator.name} execution failed`,
        description: `Validator failed to execute: ${error?.message || error}`,
        evidence: [error?.stack || String(error)],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix validator implementation or configuration',
          priority: 'immediate' as const,
          estimatedEffort: '1-2 hours',
          dependencies: [],
          implementationGuide: 'Check validator logs and fix underlying issues'
        }],
        affectedComponents: [validator.category]
      }],
      recommendations: [],
      executionTime: 0,
      timestamp: new Date()
    };
  }

  /**
   * Generate comprehensive production readiness report
   */
  private async generateReport(assessmentId: string, results: AssessmentResult[]): Promise<ProductionReadinessReport> {
    console.log('📋 Generating comprehensive report...');
    
    // Calculate overall scores
    const overallScore = this.calculateOverallScore(results);
    const categoryScores = this.calculateCategoryScores(results);
    
    // Identify critical blockers
    const criticalBlockers = this.identifyCriticalBlockers(results);
    
    // Determine production readiness
    const productionReady = this.assessProductionReadiness(results, criticalBlockers);
    
    // Generate summaries
    const executiveSummary = this.generateExecutiveSummary(results, productionReady, overallScore);
    const technicalSummary = this.generateTechnicalSummary(results);
    const recommendationsSummary = this.generateRecommendationsSummary(results);
    
    // Perform risk analysis
    const riskAnalysis = await this.riskEngine.analyzeRisks(results, this.config);
    
    // Generate action plan
    const nextSteps = this.generateActionPlan(results, criticalBlockers);
    
    return {
      assessmentId,
      projectName: 'SMM Architect',
      assessmentDate: new Date(),
      overallScore,
      productionReady,
      criticalBlockers,
      categoryScores,
      validationResults: results,
      executiveSummary,
      technicalSummary,
      recommendationsSummary,
      riskAnalysis,
      nextSteps
    };
  }

  /**
   * Calculate overall assessment score
   */
  private calculateOverallScore(results: AssessmentResult[]): number {
    if (results.length === 0) return 0;
    
    // Weight scores by criticality level
    const weights = {
      [CriticalityLevel.BLOCKER]: 5,
      [CriticalityLevel.CRITICAL]: 4,
      [CriticalityLevel.HIGH]: 3,
      [CriticalityLevel.MEDIUM]: 2,
      [CriticalityLevel.LOW]: 1,
      [CriticalityLevel.INFO]: 0.5
    };
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    results.forEach(result => {
      const weight = weights[result.criticalityLevel];
      totalWeightedScore += result.score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }

  /**
   * Calculate scores by category
   */
  private calculateCategoryScores(results: AssessmentResult[]): Record<AssessmentCategory, number> {
    const categoryScores: Record<AssessmentCategory, number> = {} as any;
    
    Object.values(AssessmentCategory).forEach(category => {
      const categoryResults = results.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        const avgScore = categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length;
        categoryScores[category] = Math.round(avgScore);
      } else {
        categoryScores[category] = 0;
      }
    });
    
    return categoryScores;
  }

  /**
   * Identify critical production blockers
   */
  private identifyCriticalBlockers(results: AssessmentResult[]): AssessmentFinding[] {
    const blockers: AssessmentFinding[] = [];
    
    results.forEach(result => {
      if (result.status === AssessmentStatus.CRITICAL_FAIL || 
          result.criticalityLevel === CriticalityLevel.BLOCKER) {
        blockers.push(...result.findings.filter(f => 
          f.severity === FindingSeverity.CRITICAL
        ));
      }
    });
    
    return blockers;
  }

  /**
   * Assess overall production readiness
   */
  private assessProductionReadiness(results: AssessmentResult[], criticalBlockers: AssessmentFinding[]): boolean {
    // Check for any blocker-level failures
    const hasBlockers = results.some(r => 
      r.criticalityLevel === CriticalityLevel.BLOCKER && 
      (r.status === AssessmentStatus.FAIL || r.status === AssessmentStatus.CRITICAL_FAIL)
    );
    
    // Check for critical failures
    const hasCriticalFailures = criticalBlockers.length > 0;
    
    // Check overall score threshold
    const overallScore = this.calculateOverallScore(results);
    const scoreThreshold = this.config.environment === 'production' ? 85 : 75;
    
    return !hasBlockers && !hasCriticalFailures && overallScore >= scoreThreshold;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(results: AssessmentResult[], productionReady: boolean, overallScore: number): ExecutiveSummary {
    const criticalFindings = results.flatMap(r => r.findings)
      .filter(f => f.severity === FindingSeverity.CRITICAL)
      .slice(0, 5); // Top 5 critical findings
    
    const readinessStatus = productionReady ? 'ready' : 
      (overallScore >= 70 ? 'conditional' : 'not-ready');
    
    const timeToProduction = productionReady ? 'Ready now' :
      (overallScore >= 80 ? '1-2 weeks' : 
       overallScore >= 60 ? '1-2 months' : '3+ months');
    
    return {
      readinessStatus,
      keyFindings: criticalFindings.map(f => f.title),
      businessRisks: criticalFindings.map(f => this.mapImpactToBusinessRisk(f.impact)),
      recommendedActions: results.flatMap(r => r.recommendations)
        .filter(rec => rec.priority === Priority.P0 || rec.priority === Priority.P1)
        .slice(0, 5)
        .map(rec => rec.title),
      timeToProduction,
      confidenceLevel: this.calculateConfidenceLevel(results)
    };
  }

  /**
   * Generate technical summary
   */
  private generateTechnicalSummary(results: AssessmentResult[]): TechnicalSummary {
    const categories = Object.values(AssessmentCategory);
    const categoryScores = this.calculateCategoryScores(results);
    
    return {
      architectureReadiness: Math.round((
        categoryScores[AssessmentCategory.AGENT_ORCHESTRATION] +
        categoryScores[AssessmentCategory.EXTERNAL_INTEGRATIONS] +
        categoryScores[AssessmentCategory.WORKSPACE_LIFECYCLE]
      ) / 3),
      securityPosture: Math.round((
        categoryScores[AssessmentCategory.MULTI_TENANT_SECURITY] +
        categoryScores[AssessmentCategory.COMPLIANCE_FRAMEWORK]
      ) / 2),
      performanceMetrics: Math.round((
        categoryScores[AssessmentCategory.CAMPAIGN_SIMULATION] +
        categoryScores[AssessmentCategory.DATA_FLOW_VALIDATION]
      ) / 2),
      integrationHealth: categoryScores[AssessmentCategory.EXTERNAL_INTEGRATIONS],
      codeQuality: this.calculateCodeQualityScore(results),
      testCoverage: this.calculateTestCoverageScore(results)
    };
  }

  /**
   * Generate recommendations summary
   */
  private generateRecommendationsSummary(results: AssessmentResult[]): RecommendationsSummary {
    const allRecommendations = results.flatMap(r => r.recommendations);
    
    return {
      immediateActions: allRecommendations.filter(rec => rec.priority === Priority.P0),
      shortTermImprovements: allRecommendations.filter(rec => rec.priority === Priority.P1),
      longTermEnhancements: allRecommendations.filter(rec => 
        rec.priority === Priority.P2 || rec.priority === Priority.P3
      ),
      totalEstimatedEffort: this.calculateTotalEffort(allRecommendations)
    };
  }

  /**
   * Generate action plan based on findings
   */
  private generateActionPlan(results: AssessmentResult[], criticalBlockers: AssessmentFinding[]): ActionPlan[] {
    const phases: ActionPlan[] = [];
    
    // Phase 1: Critical blockers
    if (criticalBlockers.length > 0) {
      phases.push({
        phase: 'Phase 1: Critical Production Blockers',
        timeline: '1-2 weeks',
        actions: criticalBlockers.map(blocker => ({
          task: blocker.title,
          owner: 'Development Team',
          priority: Priority.P0,
          estimatedDuration: blocker.remediation[0]?.estimatedEffort || '1 week',
          prerequisites: blocker.remediation[0]?.dependencies || [],
          deliverables: [`Resolve: ${blocker.description}`]
        })),
        dependencies: [],
        successCriteria: ['All critical blockers resolved', 'Production deployment possible']
      });
    }
    
    // Phase 2: High priority improvements
    const highPriorityRecommendations = results.flatMap(r => r.recommendations)
      .filter(rec => rec.priority === Priority.P1);
    
    if (highPriorityRecommendations.length > 0) {
      phases.push({
        phase: 'Phase 2: High Priority Improvements',
        timeline: '2-4 weeks',
        actions: highPriorityRecommendations.map(rec => ({
          task: rec.title,
          owner: 'Engineering Team',
          priority: rec.priority,
          estimatedDuration: '1-2 weeks',
          prerequisites: [],
          deliverables: rec.technicalSteps
        })),
        dependencies: phases.length > 0 ? ['Phase 1'] : [],
        successCriteria: ['System stability improved', 'Performance optimized']
      });
    }
    
    return phases;
  }

  /**
   * Save assessment reports to disk
   */
  private async saveReports(report: ProductionReadinessReport): Promise<void> {
    const outputDir = this.config.outputDirectory;
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save main report
    const reportPath = join(outputDir, `assessment-report-${report.assessmentId}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Save executive summary
    const execSummaryPath = join(outputDir, `executive-summary-${report.assessmentId}.json`);
    await fs.writeFile(execSummaryPath, JSON.stringify(report.executiveSummary, null, 2));
    
    // Save detailed findings
    const findingsPath = join(outputDir, `detailed-findings-${report.assessmentId}.json`);
    const allFindings = report.validationResults.flatMap(r => r.findings);
    await fs.writeFile(findingsPath, JSON.stringify(allFindings, null, 2));
    
    console.log(`📁 Reports saved to ${outputDir}`);
  }

  // Helper methods
  private getStatusEmoji(status: AssessmentStatus): string {
    switch (status) {
      case AssessmentStatus.PASS: return '✅';
      case AssessmentStatus.WARNING: return '⚠️';
      case AssessmentStatus.FAIL: return '❌';
      case AssessmentStatus.CRITICAL_FAIL: return '🚨';
      case AssessmentStatus.NOT_APPLICABLE: return '➖';
      case AssessmentStatus.MANUAL_REVIEW_REQUIRED: return '👀';
      default: return '❓';
    }
  }

  private mapImpactToBusinessRisk(impact: ProductionImpact): string {
    switch (impact) {
      case ProductionImpact.SYSTEM_FAILURE: return 'System downtime and service unavailability';
      case ProductionImpact.DATA_BREACH: return 'Data security breach and privacy violations';
      case ProductionImpact.CAMPAIGN_FAILURE: return 'Marketing campaign execution failures';
      case ProductionImpact.COMPLIANCE_VIOLATION: return 'Regulatory compliance violations';
      case ProductionImpact.FINANCIAL_LOSS: return 'Direct financial losses and budget overruns';
      case ProductionImpact.REPUTATION_DAMAGE: return 'Brand reputation and customer trust damage';
      default: return 'Operational disruption';
    }
  }

  private calculateConfidenceLevel(results: AssessmentResult[]): number {
    // Base confidence on execution success rate and assessment completeness
    const successfulValidations = results.filter(r => 
      r.status !== AssessmentStatus.CRITICAL_FAIL
    ).length;
    
    const completionRate = results.length > 0 ? successfulValidations / results.length : 0;
    const baseConfidence = completionRate * 100;
    
    // Adjust based on criticality coverage
    const criticalValidations = results.filter(r => 
      r.criticalityLevel === CriticalityLevel.BLOCKER || 
      r.criticalityLevel === CriticalityLevel.CRITICAL
    ).length;
    
    const confidenceAdjustment = criticalValidations >= 5 ? 0 : -10;
    
    return Math.max(0, Math.min(100, Math.round(baseConfidence + confidenceAdjustment)));
  }

  private calculateCodeQualityScore(results: AssessmentResult[]): number {
    // Extract code quality metrics from various validators
    const codeQualityFindings = results.flatMap(r => r.findings)
      .filter(f => f.title.toLowerCase().includes('code') || 
                   f.title.toLowerCase().includes('implementation'));
    
    const totalFindings = codeQualityFindings.length;
    const criticalFindings = codeQualityFindings.filter(f => 
      f.severity === FindingSeverity.CRITICAL || 
      f.severity === FindingSeverity.HIGH
    ).length;
    
    if (totalFindings === 0) return 85; // Default good score if no specific issues
    
    return Math.max(0, Math.round(85 - (criticalFindings / totalFindings) * 50));
  }

  private calculateTestCoverageScore(results: AssessmentResult[]): number {
    // Look for test-related findings
    const testFindings = results.flatMap(r => r.findings)
      .filter(f => f.title.toLowerCase().includes('test') || 
                   f.title.toLowerCase().includes('coverage'));
    
    // Default to reasonable score if no specific test issues found
    return testFindings.length === 0 ? 75 : 
           Math.max(0, 75 - testFindings.length * 10);
  }

  private calculateTotalEffort(recommendations: any[]): string {
    // Simple effort estimation based on recommendation count and priority
    const p0Count = recommendations.filter(r => r.priority === Priority.P0).length;
    const p1Count = recommendations.filter(r => r.priority === Priority.P1).length;
    const p2Count = recommendations.filter(r => r.priority === Priority.P2).length;
    
    const totalWeeks = p0Count * 2 + p1Count * 1 + p2Count * 0.5;
    
    if (totalWeeks < 1) return 'Less than 1 week';
    if (totalWeeks < 4) return `${Math.ceil(totalWeeks)} weeks`;
    if (totalWeeks < 12) return `${Math.ceil(totalWeeks / 4)} months`;
    return `${Math.ceil(totalWeeks / 12)} quarters`;
  }
}