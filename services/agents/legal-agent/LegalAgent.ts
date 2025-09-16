/**
 * Legal Agent
 * Handles compliance validation, regulatory checks, and legal content review
 */

import { AgentInterface, AgentCapability, AgentMetadata } from '../src/interfaces/AgentInterface';
import { ComplianceViolation, ComplianceResult, RegulationResult, DisclaimerResult } from '../src/types/LegalTypes';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import type { PrismaClient } from '../../shared/database/generated/client';

export interface LegalConfig {
  enabledRegions: string[];
  defaultRegion: string;
  strictMode: boolean;
  autoBlockingEnabled: boolean;
  complianceThreshold: number;
  regulationCheckTimeout: number;
}

export interface Content {
  id: string;
  text: string;
  images?: string[];
  videos?: string[];
  links?: string[];
  metadata: {
    platform: string;
    audience: string;
    contentType: string;
    scheduledTime?: Date;
    campaignId?: string;
    workspaceId: string;
  };
}

export interface ContentContext {
  platform: string;
  audience: string;
  region: string;
  industry: string;
  contentType: string;
  isPromotional: boolean;
  hasPersonalData: boolean;
  targetAge?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  region: string;
  regulation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'privacy' | 'advertising' | 'accessibility' | 'content' | 'disclosure';
  pattern?: RegExp;
  keywords?: string[];
  validator: (content: Content, context: ContentContext) => Promise<ComplianceViolation[]>;
}



export interface RegulationDatabase {
  gdpr: {
    dataProcessing: string[];
    consentRequirements: string[];
    rightsDisclosures: string[];
  };
  ccpa: {
    dataCollection: string[];
    optOutRequirements: string[];
    disclosureRequirements: string[];
  };
  coppa: {
    ageVerification: string[];
    parentalConsent: string[];
    dataMinimization: string[];
  };
  ada: {
    accessibilityRequirements: string[];
    altTextRequirements: string[];
    contrastRequirements: string[];
  };
}

export class LegalAgent implements AgentInterface {
  public readonly metadata: AgentMetadata = {
    name: 'LegalAgent',
    version: '1.0.0',
    description: 'Handles compliance validation and regulatory checks',
    capabilities: [
      AgentCapability.CONTENT_ANALYSIS,
      AgentCapability.COMPLIANCE_VALIDATION,
      AgentCapability.REGULATORY_CHECKING,
      AgentCapability.DISCLAIMER_GENERATION
    ],
    dependencies: ['ComplianceDatabase', 'RegulationService', 'PolicyEngine']
  };

  private config: LegalConfig;
  private logger: Logger;
  private eventEmitter: EventEmitter;
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private regulationDb: RegulationDatabase = {} as RegulationDatabase;
  private initialized: boolean = false;
  private db: PrismaClient;

  constructor(config: LegalConfig, logger: Logger, dbClient?: PrismaClient) {
    this.config = config;
    this.logger = logger;
    this.eventEmitter = new EventEmitter();
    if (dbClient) {
      this.db = dbClient;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: getPrismaClient } = require('../../shared/database/client');
        this.db = getPrismaClient();
      } catch {
        this.logger.warn('Database client not available; using empty mock');
        this.db = { complianceCheck: { findMany: async () => [] } } as unknown as PrismaClient;
      }
    }
    this.initializeRegulationDatabase();
  }

  /**
   * Initialize the legal agent
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Legal Agent');

      // Load compliance rules
      await this.loadComplianceRules();

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      this.logger.info('Legal Agent initialized successfully', {
        rulesLoaded: this.complianceRules.size,
        enabledRegions: this.config.enabledRegions
      });

    } catch (error) {
      this.logger.error('Failed to initialize Legal Agent', {
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Validate content compliance
   */
  async validateCompliance(content: Content, context?: Partial<ContentContext>): Promise<ComplianceResult> {
    if (!this.initialized) {
      throw new Error('Legal Agent not initialized');
    }

    const startTime = Date.now();
    const fullContext = this.buildContentContext(content, context);

    this.logger.info('Starting compliance validation', {
      contentId: content.id,
      platform: fullContext.platform,
      region: fullContext.region
    });

    try {
      const violations: ComplianceViolation[] = [];
      const applicableRules = this.getApplicableRules(fullContext);

      // Run compliance checks
      for (const rule of applicableRules) {
        try {
          const ruleViolations = await rule.validator(content, fullContext);
          violations.push(...ruleViolations);
        } catch (error) {
          this.logger.warn('Compliance rule check failed', {
            ruleId: rule.id,
            error: error instanceof Error ? error.message : error
          });
        }
      }

      // Calculate compliance score
      const score = this.calculateComplianceScore(violations);
      const isCompliant = score >= this.config.complianceThreshold;
      const hasBlockingIssues = violations.some(v => v.blockingIssue);

      // Determine final status
      let status: 'compliant' | 'needs_review' | 'non_compliant';
      if (hasBlockingIssues) {
        status = 'non_compliant';
      } else if (!isCompliant) {
        status = 'needs_review';
      } else {
        status = 'compliant';
      }

      const result: ComplianceResult = {
        contentId: content.id,
        status,
        score,
        violations,
        recommendations: this.generateRecommendations(violations),
        processingTime: Date.now() - startTime,
        checkedAt: new Date(),
        applicableRegulations: applicableRules.map(r => r.regulation),
        metadata: {
          rulesChecked: applicableRules.length,
          region: fullContext.region,
          strictMode: this.config.strictMode
        }
      };

      this.eventEmitter.emit('compliance_check_completed', result);

      this.logger.info('Compliance validation completed', {
        contentId: content.id,
        status,
        score,
        violationsFound: violations.length,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      this.logger.error('Compliance validation failed', {
        contentId: content.id,
        error: error instanceof Error ? error.message : error
      });

      return {
        contentId: content.id,
        status: 'non_compliant',
        score: 0,
        violations: [{
          ruleId: 'system_error',
          severity: 'critical',
          category: 'content',
          message: 'Compliance validation system error',
          autoFixable: false,
          blockingIssue: true
        }],
        recommendations: ['Please contact support'],
        processingTime: Date.now() - startTime,
        checkedAt: new Date(),
        applicableRegulations: [],
        metadata: { error: error instanceof Error ? error.message : error }
      };
    }
  }

  /**
   * Check regulations for specific region and content type
   */
  async checkRegulations(region: string, contentType: string): Promise<RegulationResult> {
    this.logger.info('Checking regulations', { region, contentType });

    try {
      const applicableRegulations = this.getRegulationsForRegion(region, contentType);
      const requirements = this.getRequirementsForContentType(contentType, region);

      return {
        region,
        contentType,
        applicableRegulations,
        requirements,
        lastUpdated: new Date(),
        complianceLevel: this.determineComplianceLevel(region),
        metadata: {
          totalRegulations: applicableRegulations.length,
          totalRequirements: requirements.length
        }
      };

    } catch (error) {
      this.logger.error('Regulation check failed', {
        region,
        contentType,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Generate disclaimer for content
   */
  async generateDisclaimer(context: ContentContext): Promise<DisclaimerResult> {
    this.logger.info('Generating disclaimer', {
      platform: context.platform,
      region: context.region,
      contentType: context.contentType
    });

    try {
      const disclaimerComponents: string[] = [];

      // Add platform-specific disclaimers
      if (context.isPromotional) {
        disclaimerComponents.push(this.getPromotionalDisclaimer(context));
      }

      // Add privacy disclaimers
      if (context.hasPersonalData) {
        disclaimerComponents.push(this.getPrivacyDisclaimer(context));
      }

      // Add region-specific disclaimers
      disclaimerComponents.push(...this.getRegionalDisclaimers(context));

      // Add age-specific disclaimers
      if (context.targetAge) {
        disclaimerComponents.push(this.getAgeDisclaimer(context));
      }

      const disclaimer = disclaimerComponents.join('\n\n');
      const isRequired = this.isDisclaimerRequired(context);

      return {
        disclaimer,
        isRequired,
        components: disclaimerComponents,
        generatedAt: new Date(),
        context,
        metadata: {
          componentCount: disclaimerComponents.length,
          characterCount: disclaimer.length
        }
      };

    } catch (error) {
      this.logger.error('Disclaimer generation failed', {
        context,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  /**
   * Get compliance summary for workspace
   */
  async getComplianceSummary(workspaceId: string): Promise<{
    overallScore: number;
    totalChecks: number;
    compliantContent: number;
    nonCompliantContent: number;
    pendingReview: number;
    commonViolations: Array<{ rule: string; count: number }>;
    regionBreakdown: Record<string, number>;
  }> {
    try {
      const checks = await this.db.complianceCheck.findMany({
        where: { workspaceId },
        select: {
          status: true,
          score: true,
          region: true,
          violations: { select: { ruleId: true } }
        }
      });

      const totalChecks = checks.length;
      const compliantContent = checks.filter(c => c.status === 'compliant').length;
      const nonCompliantContent = checks.filter(c => c.status === 'non_compliant').length;
      const pendingReview = checks.filter(c => c.status === 'needs_review').length;

      const violationCounts: Record<string, number> = {};
      const regionScores: Record<string, { total: number; count: number }> = {};
      let scoreSum = 0;

      for (const check of checks) {
        scoreSum += check.score;

        const region = check.region || 'unknown';
        if (!regionScores[region]) {
          regionScores[region] = { total: 0, count: 0 };
        }
        regionScores[region].total += check.score;
        regionScores[region].count += 1;

        if (Array.isArray(check.violations)) {
          for (const violation of check.violations) {
            violationCounts[violation.ruleId] = (violationCounts[violation.ruleId] || 0) + 1;
          }
        }
      }

      const overallScore = totalChecks > 0 ? Math.round(scoreSum / totalChecks) : 0;

      const commonViolations = Object.entries(violationCounts)
        .map(([rule, count]) => ({ rule, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const regionBreakdown: Record<string, number> = {};
      for (const [region, { total, count }] of Object.entries(regionScores)) {
        regionBreakdown[region] = Math.round(total / count);
      }

      return {
        overallScore,
        totalChecks,
        compliantContent,
        nonCompliantContent,
        pendingReview,
        commonViolations,
        regionBreakdown
      };
    } catch (error) {
      this.logger.error('Failed to get compliance summary', {
        workspaceId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error('Could not retrieve compliance summary');
    }
  }

  // Private helper methods

  private async loadComplianceRules(): Promise<void> {
    const rules: ComplianceRule[] = [
      // GDPR Rules
      {
        id: 'gdpr_data_processing_disclosure',
        name: 'GDPR Data Processing Disclosure',
        description: 'Content must disclose data processing when collecting personal data',
        region: 'EU',
        regulation: 'GDPR',
        severity: 'high',
        category: 'privacy',
        keywords: ['email', 'phone', 'address', 'personal data', 'subscribe'],
        validator: this.validateGdprDataProcessing.bind(this)
      },
      
      // Promotional Content Rules
      {
        id: 'promotional_disclosure',
        name: 'Promotional Content Disclosure',
        description: 'Promotional content must be clearly disclosed',
        region: 'ALL',
        regulation: 'FTC',
        severity: 'medium',
        category: 'advertising',
        keywords: ['sponsored', 'ad', 'advertisement', 'promotion', 'affiliate'],
        validator: this.validatePromotionalDisclosure.bind(this)
      },

      // Accessibility Rules
      {
        id: 'alt_text_required',
        name: 'Alt Text Required',
        description: 'Images must have descriptive alt text',
        region: 'ALL',
        regulation: 'ADA',
        severity: 'medium',
        category: 'accessibility',
        validator: this.validateAltText.bind(this)
      },

      // COPPA Rules
      {
        id: 'coppa_age_verification',
        name: 'COPPA Age Verification',
        description: 'Content targeting children must comply with COPPA',
        region: 'US',
        regulation: 'COPPA',
        severity: 'critical',
        category: 'privacy',
        validator: this.validateCoppaCompliance.bind(this)
      }
    ];

    for (const rule of rules) {
      this.complianceRules.set(rule.id, rule);
    }
  }

  private buildContentContext(content: Content, context?: Partial<ContentContext>): ContentContext {
    return {
      platform: context?.platform || content.metadata.platform,
      audience: context?.audience || content.metadata.audience,
      region: context?.region || this.config.defaultRegion,
      industry: context?.industry || 'general',
      contentType: context?.contentType || content.metadata.contentType,
      isPromotional: context?.isPromotional || this.detectPromotionalContent(content),
      hasPersonalData: context?.hasPersonalData || this.detectPersonalData(content),
      targetAge: context?.targetAge
    };
  }

  private getApplicableRules(context: ContentContext): ComplianceRule[] {
    return Array.from(this.complianceRules.values()).filter(rule => 
      rule.region === 'ALL' || 
      rule.region === context.region ||
      this.config.enabledRegions.includes(rule.region)
    );
  }

  private calculateComplianceScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const severityWeights = { low: 1, medium: 3, high: 5, critical: 10 };
    const totalPenalty = violations.reduce((sum, violation) => 
      sum + severityWeights[violation.severity], 0
    );

    return Math.max(0, 100 - totalPenalty);
  }

  private generateRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];

    // Add specific recommendations based on violations
    for (const violation of violations) {
      if (violation.suggestion) {
        recommendations.push(violation.suggestion);
      }
    }

    // Add general recommendations
    if (violations.some(v => v.category === 'privacy')) {
      recommendations.push('Review privacy policy and data collection practices');
    }

    if (violations.some(v => v.category === 'advertising')) {
      recommendations.push('Ensure all promotional content is properly disclosed');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private async validateGdprDataProcessing(content: Content, context: ContentContext): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const text = content.text.toLowerCase();

    // Check for data collection without proper disclosure
    const dataCollectionKeywords = ['email', 'phone', 'address', 'subscribe', 'sign up'];
    const privacyKeywords = ['privacy policy', 'data processing', 'gdpr', 'consent'];

    const hasDataCollection = dataCollectionKeywords.some(keyword => text.includes(keyword));
    const hasPrivacyDisclosure = privacyKeywords.some(keyword => text.includes(keyword));

    if (hasDataCollection && !hasPrivacyDisclosure) {
      violations.push({
        ruleId: 'gdpr_data_processing_disclosure',
        severity: 'high',
        category: 'privacy',
        message: 'Content collects personal data but lacks GDPR compliance disclosure',
        suggestion: 'Add privacy policy link and data processing disclosure',
        autoFixable: false,
        blockingIssue: context.region === 'EU'
      });
    }

    return violations;
  }

  private async validatePromotionalDisclosure(content: Content, context: ContentContext): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const text = content.text.toLowerCase();

    if (context.isPromotional) {
      const disclosureKeywords = ['#ad', '#sponsored', '#promotion', 'advertisement', 'paid partnership'];
      const hasDisclosure = disclosureKeywords.some(keyword => text.includes(keyword));

      if (!hasDisclosure) {
        violations.push({
          ruleId: 'promotional_disclosure',
          severity: 'medium',
          category: 'advertising',
          message: 'Promotional content lacks proper disclosure',
          suggestion: 'Add #ad, #sponsored, or similar disclosure',
          autoFixable: true,
          blockingIssue: false
        });
      }
    }

    return violations;
  }

  private async validateAltText(content: Content, context: ContentContext): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    if (content.images && content.images.length > 0) {
      // In a real implementation, you would check if images have alt text
      // For now, we'll assume they don't have alt text
      violations.push({
        ruleId: 'alt_text_required',
        severity: 'medium',
        category: 'accessibility',
        message: 'Images in content lack descriptive alt text',
        suggestion: 'Add descriptive alt text to all images for accessibility',
        autoFixable: false,
        blockingIssue: false
      });
    }

    return violations;
  }

  private async validateCoppaCompliance(content: Content, context: ContentContext): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    if (context.targetAge && parseInt(context.targetAge) < 13) {
      const text = content.text.toLowerCase();
      const dataCollectionKeywords = ['email', 'phone', 'address', 'name', 'birthday'];
      const hasDataCollection = dataCollectionKeywords.some(keyword => text.includes(keyword));

      if (hasDataCollection) {
        violations.push({
          ruleId: 'coppa_age_verification',
          severity: 'critical',
          category: 'privacy',
          message: 'Content targeting children under 13 cannot collect personal data without parental consent',
          suggestion: 'Remove data collection or implement parental consent mechanism',
          autoFixable: false,
          blockingIssue: true
        });
      }
    }

    return violations;
  }

  private detectPromotionalContent(content: Content): boolean {
    const promotionalKeywords = ['buy', 'purchase', 'sale', 'discount', 'offer', 'deal', 'promo'];
    const text = content.text.toLowerCase();
    return promotionalKeywords.some(keyword => text.includes(keyword));
  }

  private detectPersonalData(content: Content): boolean {
    const personalDataKeywords = ['email', 'phone', 'address', 'name', 'birthday', 'subscribe'];
    const text = content.text.toLowerCase();
    return personalDataKeywords.some(keyword => text.includes(keyword));
  }

  private getRegulationsForRegion(region: string, contentType: string): string[] {
    const regulationMap: Record<string, string[]> = {
      'US': ['FTC', 'COPPA', 'CAN-SPAM', 'ADA'],
      'EU': ['GDPR', 'DSA', 'DMA', 'ePrivacy'],
      'UK': ['UK GDPR', 'ASA', 'DPA'],
      'CA': ['PIPEDA', 'CASL', 'Privacy Act']
    };

    return regulationMap[region] || [];
  }

  private getRequirementsForContentType(contentType: string, region: string): string[] {
    // Simplified implementation
    const requirements: string[] = [];

    if (contentType === 'promotional') {
      requirements.push('Clear disclosure of promotional nature');
      requirements.push('Honest and non-misleading claims');
    }

    if (region === 'EU') {
      requirements.push('GDPR compliance for data processing');
      requirements.push('Cookie consent if applicable');
    }

    return requirements;
  }

  private determineComplianceLevel(region: string): 'strict' | 'moderate' | 'basic' {
    const strictRegions = ['EU', 'CA'];
    const moderateRegions = ['US', 'UK', 'AU'];

    if (strictRegions.includes(region)) return 'strict';
    if (moderateRegions.includes(region)) return 'moderate';
    return 'basic';
  }

  private getPromotionalDisclaimer(context: ContentContext): string {
    return `This content is promotional. ${context.platform === 'instagram' ? '#ad #sponsored' : 'Advertisement'}`;
  }

  private getPrivacyDisclaimer(context: ContentContext): string {
    return `We collect and process personal data in accordance with our Privacy Policy. By providing your information, you consent to our data processing practices.`;
  }

  private getRegionalDisclaimers(context: ContentContext): string[] {
    const disclaimers: string[] = [];

    if (context.region === 'EU') {
      disclaimers.push('This content complies with GDPR requirements for data protection and privacy.');
    }

    if (context.region === 'CA') {
      disclaimers.push('This content follows Canadian privacy legislation (PIPEDA).');
    }

    return disclaimers;
  }

  private getAgeDisclaimer(context: ContentContext): string {
    const age = parseInt(context.targetAge || '18');
    
    if (age < 13) {
      return 'Parental supervision required. No personal information will be collected from children under 13.';
    } else if (age < 18) {
      return 'Content appropriate for teens. Parental guidance recommended.';
    }

    return '';
  }

  private isDisclaimerRequired(context: ContentContext): boolean {
    return context.isPromotional || context.hasPersonalData || context.region === 'EU';
  }

  private initializeRegulationDatabase(): void {
    this.regulationDb = {
      gdpr: {
        dataProcessing: [
          'Lawful basis for processing must be established',
          'Data subjects must be informed of processing purposes',
          'Consent must be freely given and specific'
        ],
        consentRequirements: [
          'Clear and plain language',
          'Separate consent for different purposes',
          'Easy withdrawal mechanism'
        ],
        rightsDisclosures: [
          'Right to access personal data',
          'Right to rectification',
          'Right to erasure',
          'Right to data portability'
        ]
      },
      ccpa: {
        dataCollection: [
          'Notice at or before collection',
          'Categories of personal information',
          'Sources of personal information'
        ],
        optOutRequirements: [
          'Do Not Sell My Personal Information link',
          'Opt-out process description',
          'Non-discrimination notice'
        ],
        disclosureRequirements: [
          'Categories of personal information disclosed',
          'Business purposes for disclosure',
          'Categories of third parties'
        ]
      },
      coppa: {
        ageVerification: [
          'Age verification mechanism required',
          'Parental consent before data collection',
          'Limited data collection from children'
        ],
        parentalConsent: [
          'Verifiable parental consent',
          'Notice to parents',
          'Parent access to child data'
        ],
        dataMinimization: [
          'Collect only necessary information',
          'Limited data retention',
          'Secure data handling'
        ]
      },
      ada: {
        accessibilityRequirements: [
          'Screen reader compatibility',
          'Keyboard navigation support',
          'Color contrast compliance'
        ],
        altTextRequirements: [
          'Descriptive alternative text for images',
          'Video captions and transcripts',
          'Audio descriptions for video content'
        ],
        contrastRequirements: [
          'Minimum 4.5:1 contrast ratio for normal text',
          'Minimum 3:1 contrast ratio for large text',
          'Non-text elements must meet contrast requirements'
        ]
      }
    };
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('compliance_check_completed', (result) => {
      this.logger.debug('Compliance check completed', {
        contentId: result.contentId,
        status: result.status,
        score: result.score
      });
    });
  }
}

export default LegalAgent;