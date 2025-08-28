/**
 * Legal Types
 * Type definitions for compliance validation and legal processing
 */

export interface ComplianceViolation {
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'privacy' | 'advertising' | 'accessibility' | 'content' | 'disclosure';
  message: string;
  suggestion?: string;
  location?: {
    start: number;
    end: number;
    context: string;
  };
  autoFixable: boolean;
  blockingIssue: boolean;
}

export interface ComplianceResult {
  contentId: string;
  status: 'compliant' | 'needs_review' | 'non_compliant';
  score: number;
  violations: ComplianceViolation[];
  recommendations: string[];
  processingTime: number;
  checkedAt: Date;
  applicableRegulations: string[];
  metadata: Record<string, any>;
}

export interface RegulationResult {
  region: string;
  contentType: string;
  applicableRegulations: string[];
  requirements: string[];
  lastUpdated: Date;
  complianceLevel: 'strict' | 'moderate' | 'basic';
  metadata: Record<string, any>;
}

export interface DisclaimerResult {
  disclaimer: string;
  isRequired: boolean;
  components: string[];
  generatedAt: Date;
  context: any;
  metadata: Record<string, any>;
}

export interface LegalRule {
  id: string;
  name: string;
  description: string;
  region: string;
  regulation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'privacy' | 'advertising' | 'accessibility' | 'content' | 'disclosure';
  enabled: boolean;
  lastUpdated: Date;
}

export interface ComplianceCheck {
  id: string;
  contentId: string;
  workspaceId: string;
  rules: LegalRule[];
  result: ComplianceResult;
  performedAt: Date;
  performedBy: string;
}

