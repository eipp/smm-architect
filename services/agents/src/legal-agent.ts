import { EventEmitter } from 'events';
import { AIModelProvider } from '../../model-router/src/services/AIModelProvider';

export interface ComplianceRule {
  id: string;
  name: string;
  type: 'FTC' | 'GDPR' | 'CCPA' | 'platform' | 'industry' | 'custom';
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  applicable: {
    platforms: string[];
    industries: string[];
    regions: string[];
  };
  checkFunction?: (content: string, context?: any) => boolean;
}

export interface LegalReviewRequest {
  workspaceId: string;
  content: string;
  contentType: 'post' | 'article' | 'caption' | 'ad' | 'campaign';
  platform: string;
  industry?: string;
  region?: string;
  hasSponsorship?: boolean;
  includesHealthClaims?: boolean;
  includesFinancialAdvice?: boolean;
}

export interface ComplianceIssue {
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location: {
    text: string;
    startIndex: number;
    endIndex: number;
  };
  suggestion: string;
  required: boolean;
}

export interface LegalReviewResult {
  id: string;
  workspaceId: string;
  content: string;
  overallCompliance: 'pass' | 'warning' | 'fail';
  complianceScore: number;
  issues: ComplianceIssue[];
  approvedContent?: string;
  disclaimers: string[];
  requiredActions: string[];
  reviewedAt: Date;
  reviewerId: string;
}

export class LegalAgent extends EventEmitter {
  private aiProvider: AIModelProvider;
  private complianceRules: Map<string, ComplianceRule> = new Map();

  constructor() {
    super();
    this.aiProvider = new AIModelProvider();
    this.initializeComplianceRules();
  }

  async reviewContent(request: LegalReviewRequest): Promise<LegalReviewResult> {
    try {
      // Get applicable rules
      const applicableRules = this.getApplicableRules(request);
      
      // Run compliance checks
      const issues = await this.runComplianceChecks(request.content, applicableRules, request);
      
      // Generate approved content if needed
      const approvedContent = await this.generateApprovedContent(request, issues);
      
      // Generate required disclaimers
      const disclaimers = this.generateDisclaimers(request, issues);
      
      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(issues);
      
      const result: LegalReviewResult = {
        id: `legal_${Date.now()}`,
        workspaceId: request.workspaceId,
        content: request.content,
        overallCompliance: this.determineOverallCompliance(issues),
        complianceScore,
        issues,
        approvedContent,
        disclaimers,
        requiredActions: this.generateRequiredActions(issues),
        reviewedAt: new Date(),
        reviewerId: 'legal-agent-v1'
      };

      this.emit('legalReviewCompleted', result);
      return result;

    } catch (error) {
      console.error('Legal review failed:', error);
      throw new Error(`Legal review failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getApplicableRules(request: LegalReviewRequest): ComplianceRule[] {
    const applicable: ComplianceRule[] = [];
    
    for (const rule of this.complianceRules.values()) {
      // Check platform applicability
      if (rule.applicable.platforms.length > 0 && !rule.applicable.platforms.includes(request.platform)) {
        continue;
      }
      
      // Check industry applicability
      if (request.industry && rule.applicable.industries.length > 0 && !rule.applicable.industries.includes(request.industry)) {
        continue;
      }
      
      // Check region applicability
      if (request.region && rule.applicable.regions.length > 0 && !rule.applicable.regions.includes(request.region)) {
        continue;
      }
      
      applicable.push(rule);
    }
    
    return applicable;
  }

  private async runComplianceChecks(content: string, rules: ComplianceRule[], request: LegalReviewRequest): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];
    
    for (const rule of rules) {
      const ruleIssues = await this.checkRule(content, rule, request);
      issues.push(...ruleIssues);
    }
    
    return issues;
  }

  private async checkRule(content: string, rule: ComplianceRule, request: LegalReviewRequest): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];
    
    // Use custom check function if available
    if (rule.checkFunction) {
      const passed = rule.checkFunction(content, request);
      if (!passed) {
        issues.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: rule.description,
          location: { text: content, startIndex: 0, endIndex: content.length },
          suggestion: await this.generateSuggestion(content, rule),
          required: rule.severity === 'critical' || rule.severity === 'high'
        });
      }
    } else {
      // Use AI-powered compliance checking
      const aiIssues = await this.aiComplianceCheck(content, rule, request);
      issues.push(...aiIssues);
    }
    
    return issues;
  }

  private async aiComplianceCheck(content: string, rule: ComplianceRule, request: LegalReviewRequest): Promise<ComplianceIssue[]> {
    const prompt = `Analyze this content for compliance with ${rule.name}:
    
    Rule: ${rule.description}
    Content: "${content}"
    Platform: ${request.platform}
    Type: ${request.contentType}
    
    Identify any violations and provide specific suggestions for compliance.`;

    try {
      const response = await this.aiProvider.generateContent({
        workspaceId: request.workspaceId,
        agentType: 'legal',
        contentType: 'description',
        platform: 'multi',
        prompt,
        preferences: { model: 'gpt-4', temperature: 0.1 }
      });

      // Parse AI response for issues
      return this.parseAIComplianceResponse(response.content, rule);
    } catch (error) {
      console.warn(`AI compliance check failed for rule ${rule.id}:`, error);
      return [];
    }
  }

  private parseAIComplianceResponse(response: string, rule: ComplianceRule): ComplianceIssue[] {
    // Simplified parsing - in production would use structured AI output
    if (response.toLowerCase().includes('violation') || response.toLowerCase().includes('issue')) {
      return [{
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        description: response.substring(0, 200),
        location: { text: '', startIndex: 0, endIndex: 0 },
        suggestion: response.substring(200, 400) || 'Please review and modify content for compliance',
        required: rule.severity === 'critical'
      }];
    }
    return [];
  }

  private async generateApprovedContent(request: LegalReviewRequest, issues: ComplianceIssue[]): Promise<string | undefined> {
    if (issues.length === 0) return undefined;
    
    const criticalIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'high');
    if (criticalIssues.length === 0) return undefined;

    const prompt = `Rewrite this content to fix compliance issues:
    
    Original: "${request.content}"
    Issues: ${criticalIssues.map(i => i.description).join('; ')}
    
    Maintain the original message while ensuring full compliance.`;

    try {
      const response = await this.aiProvider.generateContent({
        workspaceId: request.workspaceId,
        agentType: 'legal',
        contentType: request.contentType === 'ad' ? 'caption' : request.contentType === 'campaign' ? 'post' : request.contentType as any,
        platform: request.platform === 'x' ? 'twitter' : request.platform as any,
        prompt,
        preferences: { model: 'gpt-4', temperature: 0.3 }
      });

      return response.content;
    } catch (error) {
      console.warn('Failed to generate approved content:', error);
      return undefined;
    }
  }

  private generateDisclaimers(request: LegalReviewRequest, issues: ComplianceIssue[]): string[] {
    const disclaimers: string[] = [];
    
    if (request.hasSponsorship) {
      disclaimers.push('#ad #sponsored - This is a paid partnership');
    }
    
    if (request.includesHealthClaims) {
      disclaimers.push('This content is for informational purposes only and should not be considered medical advice.');
    }
    
    if (request.includesFinancialAdvice) {
      disclaimers.push('This is not financial advice. Please consult with a qualified financial advisor.');
    }
    
    // Add platform-specific disclaimers
    if (request.platform === 'linkedin' && request.contentType === 'ad') {
      disclaimers.push('Professional networking content - LinkedIn Terms apply');
    }
    
    return disclaimers;
  }

  private generateRequiredActions(issues: ComplianceIssue[]): string[] {
    const actions = new Set<string>();
    
    issues.forEach(issue => {
      if (issue.required) {
        actions.add(issue.suggestion);
      }
    });
    
    return Array.from(actions);
  }

  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  private determineOverallCompliance(issues: ComplianceIssue[]): 'pass' | 'warning' | 'fail' {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length > 0) return 'fail';
    if (highIssues.length > 0) return 'warning';
    return 'pass';
  }

  private async generateSuggestion(content: string, rule: ComplianceRule): Promise<string> {
    return `Please review content for compliance with ${rule.name}: ${rule.description}`;
  }

  private initializeComplianceRules(): void {
    const rules: ComplianceRule[] = [
      {
        id: 'ftc-sponsorship',
        name: 'FTC Sponsorship Disclosure',
        type: 'FTC',
        description: 'Sponsored content must include clear disclosure',
        severity: 'critical',
        applicable: { platforms: [], industries: [], regions: ['US'] },
        checkFunction: (content: string, context?: any) => {
          if (!context?.hasSponsorship) return true;
          const disclosures = ['#ad', '#sponsored', '#partnership', 'sponsored by', 'paid partnership'];
          return disclosures.some(d => content.toLowerCase().includes(d.toLowerCase()));
        }
      },
      {
        id: 'health-claims',
        name: 'Health Claims Regulation',
        type: 'industry',
        description: 'Health-related claims must include appropriate disclaimers',
        severity: 'high',
        applicable: { platforms: [], industries: ['healthcare', 'fitness', 'nutrition'], regions: [] },
        checkFunction: (content: string, context?: any) => {
          if (!context?.includesHealthClaims) return true;
          const healthTerms = ['cure', 'treat', 'prevent', 'diagnose', 'medical'];
          const hasHealthTerms = healthTerms.some(term => content.toLowerCase().includes(term));
          if (!hasHealthTerms) return true;
          return content.includes('not medical advice') || content.includes('consult your doctor');
        }
      },
      {
        id: 'financial-advice',
        name: 'Financial Advice Disclaimer',
        type: 'industry',
        description: 'Financial advice content must include appropriate disclaimers',
        severity: 'high',
        applicable: { platforms: [], industries: ['finance', 'investment'], regions: [] },
        checkFunction: (content: string, context?: any) => {
          if (!context?.includesFinancialAdvice) return true;
          const financialTerms = ['invest', 'trading', 'stocks', 'crypto', 'financial advice'];
          const hasFinancialTerms = financialTerms.some(term => content.toLowerCase().includes(term));
          if (!hasFinancialTerms) return true;
          return content.includes('not financial advice') || content.includes('consult a financial advisor');
        }
      },
      {
        id: 'gdpr-data-collection',
        name: 'GDPR Data Collection Notice',
        type: 'GDPR',
        description: 'Data collection must be disclosed and consented to',
        severity: 'critical',
        applicable: { platforms: [], industries: [], regions: ['EU'] }
      },
      {
        id: 'platform-violence',
        name: 'No Violence or Hate Speech',
        type: 'platform',
        description: 'Content must not contain violence, hate speech, or harmful content',
        severity: 'critical',
        applicable: { platforms: [], industries: [], regions: [] },
        checkFunction: (content: string) => {
          const harmfulTerms = ['violence', 'hate', 'harm', 'kill', 'die'];
          return !harmfulTerms.some(term => content.toLowerCase().includes(term));
        }
      }
    ];

    rules.forEach(rule => this.complianceRules.set(rule.id, rule));
  }

  // Public methods for rule management
  addComplianceRule(rule: ComplianceRule): void {
    this.complianceRules.set(rule.id, rule);
  }

  removeComplianceRule(ruleId: string): void {
    this.complianceRules.delete(ruleId);
  }

  getComplianceRules(): ComplianceRule[] {
    return Array.from(this.complianceRules.values());
  }
}