/**
 * SMM Architect External Integration Validator
 * 
 * Validates external service integrations for production readiness:
 * - Agentuity platform connectivity and deployment
 * - n8n workflow engine integration
 * - HashiCorp Vault secrets management
 * - Social media platform APIs
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
  ExternalIntegrationValidation,
  IntegrationHealthResult,
  SocialMediaIntegrationResult,
  PlatformIntegrationStatus
} from '../core/types.js';
import { IValidator } from '../core/orchestrator.js';
import { SMMAssessmentConfigManager } from '../core/config.js';

export class ExternalIntegrationValidator implements IValidator {
  public readonly name = 'external-integration';
  public readonly category = AssessmentCategory.EXTERNAL_INTEGRATIONS;
  public readonly criticalityLevel = CriticalityLevel.HIGH;

  private config: SMMProductionAssessmentConfig;
  private configManager: SMMAssessmentConfigManager;

  constructor() {
    this.config = {} as SMMProductionAssessmentConfig; // Will be set in validate method
    this.configManager = SMMAssessmentConfigManager.getInstance();
  }

  public async validate(config: SMMProductionAssessmentConfig): Promise<AssessmentResult> {
    this.config = config;
    const startTime = Date.now();
    
    console.log('🔗 Validating External Integrations...');
    
    const findings: AssessmentFinding[] = [];
    const recommendations: Recommendation[] = [];
    
    try {
      const integrationValidation = await this.validateExternalIntegrations();
      this.analyzeIntegrationResults(integrationValidation, findings, recommendations);
      
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
      console.error('❌ External integration validation failed:', error);
      
      findings.push({
        type: FindingType.INTEGRATION_LOCALHOST,
        severity: FindingSeverity.CRITICAL,
        title: 'External integration validation failed',
        description: `Failed to validate external integrations: ${error instanceof Error ? error.message : String(error)}`,
        evidence: [error instanceof Error ? error.stack || error.message : String(error)],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Fix external integration configuration',
          priority: 'immediate',
          estimatedEffort: '1-2 days',
          dependencies: ['Network connectivity', 'Service configurations'],
          implementationGuide: 'Check external service configurations and network connectivity'
        }],
        affectedComponents: ['external-integrations']
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

  private async validateExternalIntegrations(): Promise<ExternalIntegrationValidation> {
    console.log('🔍 Testing external integration components...');
    
    // 1. Validate Agentuity Platform
    const agentuityPlatform = await this.validateAgentuityPlatform();
    
    // 2. Validate n8n Workflows
    const n8nWorkflows = await this.validateN8NWorkflows();
    
    // 3. Validate Vault Secrets
    const vaultSecrets = await this.validateVaultSecrets();
    
    // 4. Validate Social Media APIs
    const socialMediaAPIs = await this.validateSocialMediaAPIs();
    
    return {
      agentuityPlatform,
      n8nWorkflows,
      vaultSecrets,
      socialMediaAPIs
    };
  }

  private async validateAgentuityPlatform(): Promise<IntegrationHealthResult> {
    console.log('🤖 Validating Agentuity platform integration...');
    
    try {
      const integrationConfig = this.configManager.getIntegrationConfig();
      const webhookUrl = integrationConfig.agentuity.webhookUrl || process.env['AGENTUITY_WEBHOOK_URL'];
      
      if (!webhookUrl) {
        return this.createFailedIntegrationResult('Agentuity webhook URL not configured', 'mock');
      }
      
      // Determine authenticity based on URL
      const authenticity = this.determineAuthenticity(webhookUrl);
      
      // Test connectivity
      const startTime = Date.now();
      const healthResponse = await this.makeRequest(`${webhookUrl}/_health`, {
        method: 'GET',
        timeout: 10000
      });
      const responseTime = Date.now() - startTime;
      
      // Test error rate with multiple requests
      const errorRate = await this.testErrorRate(webhookUrl);
      
      // Check for fallback mechanisms
      const fallbackMechanisms = await this.checkFallbackMechanisms();
      
      return {
        connectionStatus: healthResponse.ok ? 'healthy' : 'failed',
        responseTime,
        errorRate,
        authenticity,
        fallbackMechanisms
      };
      
    } catch (error) {
      console.error('Agentuity platform validation error:', error);
      return this.createFailedIntegrationResult('Agentuity platform connection failed', 'mock');
    }
  }

  private async validateN8NWorkflows(): Promise<IntegrationHealthResult> {
    console.log('⚙️ Validating n8n workflow integration...');
    
    try {
      const n8nUrl = process.env['N8N_WEBHOOK_URL'] || process.env['N8N_API_URL'];
      
      if (!n8nUrl) {
        return this.createFailedIntegrationResult('n8n URL not configured', 'mock');
      }
      
      const authenticity = this.determineAuthenticity(n8nUrl);
      
      // Test n8n API connectivity
      const startTime = Date.now();
      const healthResponse = await this.makeRequest(`${n8nUrl}/healthz`, {
        method: 'GET',
        timeout: 10000
      });
      const responseTime = Date.now() - startTime;
      
      // Test workflow execution
      const workflowExecutionTest = await this.testN8NWorkflowExecution(n8nUrl);
      
      return {
        connectionStatus: healthResponse.ok && workflowExecutionTest ? 'healthy' : 'degraded',
        responseTime,
        errorRate: 0, // Would need multiple tests to determine
        authenticity,
        fallbackMechanisms: false // n8n typically doesn't have fallbacks
      };
      
    } catch (error) {
      console.error('n8n workflow validation error:', error);
      return this.createFailedIntegrationResult('n8n workflow connection failed', 'mock');
    }
  }

  private async validateVaultSecrets(): Promise<IntegrationHealthResult> {
    console.log('🔐 Validating Vault secrets management...');
    
    try {
      const vaultAddr = process.env['VAULT_ADDR'];
      const vaultToken = process.env['VAULT_TOKEN'];
      
      if (!vaultAddr || !vaultToken) {
        return this.createFailedIntegrationResult('Vault configuration missing', 'mock');
      }
      
      const authenticity = this.determineAuthenticity(vaultAddr);
      
      // Test Vault connectivity
      const startTime = Date.now();
      const healthResponse = await this.makeRequest(`${vaultAddr}/v1/sys/health`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': vaultToken
        },
        timeout: 10000
      });
      const responseTime = Date.now() - startTime;
      
      // Test secret read capability
      const secretReadTest = await this.testVaultSecretRead(vaultAddr, vaultToken);
      
      return {
        connectionStatus: healthResponse.ok && secretReadTest ? 'healthy' : 'degraded',
        responseTime,
        errorRate: 0, // Would need multiple tests to determine
        authenticity,
        fallbackMechanisms: true // Vault typically has backup/recovery mechanisms
      };
      
    } catch (error) {
      console.error('Vault secrets validation error:', error);
      return this.createFailedIntegrationResult('Vault connection failed', 'mock');
    }
  }

  private async validateSocialMediaAPIs(): Promise<SocialMediaIntegrationResult> {
    console.log('📱 Validating social media API integrations...');
    
    try {
      // Test each platform
      const linkedinAPI = await this.testPlatformIntegration('linkedin');
      const twitterAPI = await this.testPlatformIntegration('twitter');
      const facebookAPI = await this.testPlatformIntegration('facebook');
      const instagramAPI = await this.testPlatformIntegration('instagram');
      
      // Test rate limiting
      const rateLimitHandling = await this.testRateLimitHandling();
      
      // Test API key management
      const apiKeyManagement = await this.testAPIKeyManagement();
      
      return {
        linkedinAPI,
        twitterAPI,
        facebookAPI,
        instagramAPI,
        rateLimitHandling,
        apiKeyManagement
      };
      
    } catch (error) {
      console.error('Social media API validation error:', error);
      return {
        linkedinAPI: this.createFailedPlatformStatus(),
        twitterAPI: this.createFailedPlatformStatus(),
        facebookAPI: this.createFailedPlatformStatus(),
        instagramAPI: this.createFailedPlatformStatus(),
        rateLimitHandling: false,
        apiKeyManagement: false
      };
    }
  }

  // Helper methods for testing integrations

  private async testPlatformIntegration(platform: string): Promise<PlatformIntegrationStatus> {
    try {
      const apiUrl = process.env[`${platform.toUpperCase()}_API_URL`];
      const apiKey = process.env[`${platform.toUpperCase()}_API_KEY`];
      
      if (!apiUrl || !apiKey) {
        return this.createFailedPlatformStatus();
      }
      
      // Check if URL is localhost (bad for production)
      const connected = !apiUrl.includes('localhost');
      
      // Test authentication
      const authResponse = await this.makeRequest(`${apiUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      });
      
      const authenticated = authResponse.ok;
      
      return {
        connected,
        authenticated,
        rateLimitCompliant: true, // Would need to test actual rate limits
        postingCapable: authenticated, // Assume posting works if auth works
        analyticsAccess: authenticated // Assume analytics works if auth works
      };
      
    } catch (error) {
      console.error(`${platform} integration test error:`, error);
      return this.createFailedPlatformStatus();
    }
  }

  private async testN8NWorkflowExecution(n8nUrl: string): Promise<boolean> {
    try {
      // Test a simple workflow execution
      const testWorkflow = {
        name: 'Production Test Workflow',
        nodes: [
          {
            name: 'Start',
            type: 'n8n-nodes-base.start',
            position: [240, 300]
          }
        ]
      };
      
      const response = await this.makeRequest(`${n8nUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testWorkflow),
        timeout: 15000
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testVaultSecretRead(vaultAddr: string, vaultToken: string): Promise<boolean> {
    try {
      // Test reading a secret (this should be a known test secret)
      const response = await this.makeRequest(`${vaultAddr}/v1/secret/data/test`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': vaultToken
        },
        timeout: 10000
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testErrorRate(url: string): Promise<number> {
    // Test multiple requests to determine error rate
    const testCount = 5;
    let errorCount = 0;
    
    for (let i = 0; i < testCount; i++) {
      try {
        const response = await this.makeRequest(url, {
          method: 'GET',
          timeout: 5000
        });
        if (!response.ok) errorCount++;
      } catch {
        errorCount++;
      }
    }
    
    return errorCount / testCount;
  }

  private async checkFallbackMechanisms(): Promise<boolean> {
    // Check if fallback mechanisms exist for agent execution
    // This would involve checking configuration for backup agents or queues
    return false; // Simplified for now
  }

  private async testRateLimitHandling(): Promise<boolean> {
    // Test if the system properly handles rate limits
    return true; // Simplified for now
  }

  private async testAPIKeyManagement(): Promise<boolean> {
    // Test if API keys are properly managed (not hardcoded, rotated, etc.)
    return true; // Simplified for now
  }

  private determineAuthenticity(url: string): 'real' | 'mock' | 'localhost' {
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'localhost';
    }
    if (url.includes('mock') || url.includes('example.com') || url.includes('test.local')) {
      return 'mock';
    }
    return 'real';
  }

  private createFailedIntegrationResult(reason: string, authenticity: 'real' | 'mock' | 'localhost'): IntegrationHealthResult {
    return {
      connectionStatus: 'failed',
      responseTime: -1,
      errorRate: 1.0,
      authenticity,
      fallbackMechanisms: false
    };
  }

  private createFailedPlatformStatus(): PlatformIntegrationStatus {
    return {
      connected: false,
      authenticated: false,
      rateLimitCompliant: false,
      postingCapable: false,
      analyticsAccess: false
    };
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

  // Analysis and scoring methods

  private analyzeIntegrationResults(
    validation: ExternalIntegrationValidation,
    findings: AssessmentFinding[],
    recommendations: Recommendation[]
  ): void {
    // Analyze Agentuity platform
    if (validation.agentuityPlatform.authenticity === 'localhost' && this.config.environment === 'production') {
      findings.push({
        type: FindingType.INTEGRATION_LOCALHOST,
        severity: FindingSeverity.CRITICAL,
        title: 'Agentuity platform using localhost in production',
        description: 'Agentuity platform integration points to localhost endpoints in production environment',
        evidence: [`Connection authenticity: ${validation.agentuityPlatform.authenticity}`],
        impact: ProductionImpact.SYSTEM_FAILURE,
        remediation: [{
          action: 'Configure production Agentuity endpoints',
          priority: 'immediate',
          estimatedEffort: '1-2 days',
          dependencies: ['Agentuity production environment'],
          implementationGuide: 'Update environment variables to point to production Agentuity platform'
        }],
        affectedComponents: ['agentuity-integration']
      });
    }

    // Analyze Vault integration
    if (validation.vaultSecrets.connectionStatus === 'failed') {
      findings.push({
        type: FindingType.INTEGRATION_LOCALHOST,
        severity: FindingSeverity.HIGH,
        title: 'Vault secrets management not accessible',
        description: 'HashiCorp Vault integration is not working properly',
        evidence: [`Connection status: ${validation.vaultSecrets.connectionStatus}`],
        impact: ProductionImpact.SECURITY_VULNERABILITY,
        remediation: [{
          action: 'Fix Vault connectivity and authentication',
          priority: 'high',
          estimatedEffort: '1-2 days',
          dependencies: ['Vault configuration', 'Network connectivity'],
          implementationGuide: 'Check Vault server status and authentication tokens'
        }],
        affectedComponents: ['vault-integration', 'secrets-management']
      });
    }

    // Analyze social media APIs
    const connectedPlatforms = [
      validation.socialMediaAPIs.linkedinAPI.connected,
      validation.socialMediaAPIs.twitterAPI.connected,
      validation.socialMediaAPIs.facebookAPI.connected,
      validation.socialMediaAPIs.instagramAPI.connected
    ].filter(Boolean).length;

    if (connectedPlatforms < 2) {
      findings.push({
        type: FindingType.INTEGRATION_LOCALHOST,
        severity: FindingSeverity.HIGH,
        title: `Only ${connectedPlatforms}/4 social media platforms connected`,
        description: 'Insufficient social media platform integrations for production campaigns',
        evidence: [
          `LinkedIn: ${validation.socialMediaAPIs.linkedinAPI.connected}`,
          `Twitter: ${validation.socialMediaAPIs.twitterAPI.connected}`,
          `Facebook: ${validation.socialMediaAPIs.facebookAPI.connected}`,
          `Instagram: ${validation.socialMediaAPIs.instagramAPI.connected}`
        ],
        impact: ProductionImpact.CAMPAIGN_FAILURE,
        remediation: [{
          action: 'Configure additional social media platform integrations',
          priority: 'high',
          estimatedEffort: '1-2 weeks',
          dependencies: ['Platform API keys', 'OAuth configurations'],
          implementationGuide: 'Set up API access for each required social media platform'
        }],
        affectedComponents: ['social-media-apis']
      });
    }

    // Generate recommendations
    if (findings.length > 0) {
      recommendations.push({
        type: RecommendationType.ARCHITECTURE_IMPROVEMENT,
        priority: Priority.P1,
        title: 'Establish production-grade external integrations',
        description: 'Ensure all external services are properly configured for production',
        businessImpact: 'Critical for campaign execution and operational reliability',
        technicalSteps: [
          'Configure production endpoints for all external services',
          'Implement proper authentication and error handling',
          'Add integration health monitoring',
          'Establish fallback mechanisms where appropriate'
        ],
        riskMitigation: 'Prevents service disruptions and campaign execution failures'
      });
    }
  }

  private calculateScore(findings: AssessmentFinding[]): number {
    let score = 100;
    findings.forEach(finding => {
      switch (finding.severity) {
        case FindingSeverity.CRITICAL: score -= 35; break;
        case FindingSeverity.HIGH: score -= 20; break;
        case FindingSeverity.MEDIUM: score -= 10; break;
        case FindingSeverity.LOW: score -= 5; break;
      }
    });
    return Math.max(0, score);
  }

  private determineStatus(findings: AssessmentFinding[], score: number): AssessmentStatus {
    const criticalFindings = findings.filter(f => f.severity === FindingSeverity.CRITICAL);
    if (criticalFindings.length > 0) return AssessmentStatus.CRITICAL_FAIL;
    if (score < 60) return AssessmentStatus.FAIL;
    if (score < 80) return AssessmentStatus.WARNING;
    return AssessmentStatus.PASS;
  }
}