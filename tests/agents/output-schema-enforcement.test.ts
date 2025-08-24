import { describe, it, expect, beforeAll } from '@jest/globals';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AgentOutputValidator } from '../utils/agent-output-validator';
import { QualityThresholdEnforcer } from '../utils/quality-threshold-enforcer';
import { 
  AgentOutputSchema,
  QualityThresholds,
  ValidationResult,
  AgentType
} from '../types/agent-validation';

describe('Agent Output Schema Enforcement', () => {
  let ajv: Ajv;
  let outputValidator: AgentOutputValidator;
  let qualityEnforcer: QualityThresholdEnforcer;

  beforeAll(() => {
    ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    outputValidator = new AgentOutputValidator(ajv);
    qualityEnforcer = new QualityThresholdEnforcer();
  });

  describe('Research Agent Output Validation', () => {
    const researchOutputSchema: AgentOutputSchema = {
      type: 'object',
      properties: {
        insights: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 10, maxLength: 200 },
              description: { type: 'string', minLength: 50, maxLength: 1000 },
              relevanceScore: { type: 'number', minimum: 0, maximum: 1 },
              sourceCredibility: { type: 'number', minimum: 0, maximum: 1 },
              keyPoints: {
                type: 'array',
                minItems: 2,
                items: { type: 'string', minLength: 20 }
              }
            },
            required: ['title', 'description', 'relevanceScore', 'sourceCredibility', 'keyPoints']
          }
        },
        sources: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              url: { type: 'string', format: 'uri' },
              credibilityScore: { type: 'number', minimum: 0, maximum: 1 },
              publicationDate: { type: 'string', format: 'date-time' },
              relevanceToQuery: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['id', 'title', 'url', 'credibilityScore', 'relevanceToQuery']
          }
        },
        summary: { 
          type: 'string', 
          minLength: 200, 
          maxLength: 2000 
        },
        confidence: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1 
        },
        citationCoverage: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1 
        },
        executionMetadata: {
          type: 'object',
          properties: {
            queryProcessingTime: { type: 'number', minimum: 0 },
            sourcesAnalyzed: { type: 'number', minimum: 0 },
            dataQualityScore: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['queryProcessingTime', 'sourcesAnalyzed', 'dataQualityScore']
        }
      },
      required: ['insights', 'sources', 'summary', 'confidence', 'citationCoverage', 'executionMetadata']
    };

    const researchQualityThresholds: QualityThresholds = {
      confidence: 0.7,
      citationCoverage: 0.8,
      averageSourceCredibility: 0.75,
      insightRelevance: 0.8,
      executionTime: 30000,
      dataQualityScore: 0.8
    };

    it('should validate compliant research agent output', () => {
      const validOutput = {
        insights: [
          {
            title: 'AI Marketing Automation Adoption Accelerating',
            description: 'Companies are rapidly adopting AI-powered marketing automation tools to improve personalization and efficiency. The market has grown 45% year-over-year.',
            relevanceScore: 0.92,
            sourceCredibility: 0.88,
            keyPoints: [
              '45% year-over-year market growth in AI marketing tools',
              'Personalization accuracy improved by 3.2x with AI implementation'
            ]
          },
          {
            title: 'ROI Improvements from AI Implementation',
            description: 'Organizations implementing AI marketing tools report average ROI improvements of 25-40% within the first year of deployment.',
            relevanceScore: 0.89,
            sourceCredibility: 0.91,
            keyPoints: [
              'Average ROI improvement of 25-40% in first year',
              'Customer acquisition costs reduced by 15-30%'
            ]
          },
          {
            title: 'Integration Challenges Remain Primary Barrier',
            description: 'While adoption is growing, 67% of companies cite integration with existing systems as the primary challenge in AI marketing implementation.',
            relevanceScore: 0.85,
            sourceCredibility: 0.82,
            keyPoints: [
              '67% of companies face integration challenges',
              'Legacy system compatibility is most cited barrier'
            ]
          }
        ],
        sources: [
          {
            id: 'src-001',
            title: 'State of AI Marketing 2024 Report',
            url: 'https://example.com/ai-marketing-report-2024',
            credibilityScore: 0.92,
            publicationDate: '2024-01-10T10:00:00Z',
            relevanceToQuery: 0.95
          },
          {
            id: 'src-002',
            title: 'Marketing Technology Trends Analysis',
            url: 'https://example.com/martech-trends-analysis',
            credibilityScore: 0.87,
            publicationDate: '2024-01-08T14:30:00Z',
            relevanceToQuery: 0.88
          },
          {
            id: 'src-003',
            title: 'Enterprise AI Adoption Survey Results',
            url: 'https://example.com/enterprise-ai-survey',
            credibilityScore: 0.90,
            publicationDate: '2024-01-05T09:15:00Z',
            relevanceToQuery: 0.82
          }
        ],
        summary: 'The AI marketing automation landscape is experiencing rapid growth with 45% year-over-year expansion. Organizations are seeing significant ROI improvements of 25-40% within the first year of implementation, primarily through enhanced personalization and efficiency gains. However, integration challenges with existing systems remain the primary barrier to adoption, affecting 67% of companies attempting implementation.',
        confidence: 0.85,
        citationCoverage: 0.89,
        executionMetadata: {
          queryProcessingTime: 12500,
          sourcesAnalyzed: 47,
          dataQualityScore: 0.87
        }
      };

      const validation = outputValidator.validateSchema(validOutput, researchOutputSchema);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeNull();

      const qualityCheck = qualityEnforcer.enforceThresholds(validOutput, researchQualityThresholds);
      expect(qualityCheck.passed).toBe(true);
      expect(qualityCheck.violations).toHaveLength(0);
    });

    it('should reject research output with insufficient insights', () => {
      const invalidOutput = {
        insights: [
          {
            title: 'Short title',
            description: 'Too short description',
            relevanceScore: 0.5,
            sourceCredibility: 0.6,
            keyPoints: ['One point only']
          }
        ],
        sources: [],
        summary: 'Too short',
        confidence: 0.3,
        citationCoverage: 0.2,
        executionMetadata: {
          queryProcessingTime: 50000,
          sourcesAnalyzed: 2,
          dataQualityScore: 0.4
        }
      };

      const validation = outputValidator.validateSchema(invalidOutput, researchOutputSchema);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          instancePath: '/insights',
          keyword: 'minItems'
        })
      );

      const qualityCheck = qualityEnforcer.enforceThresholds(invalidOutput, researchQualityThresholds);
      expect(qualityCheck.passed).toBe(false);
      expect(qualityCheck.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Creative Agent Output Validation', () => {
    const creativeOutputSchema: AgentOutputSchema = {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          minLength: 50,
          maxLength: 5000
        },
        metadata: {
          type: 'object',
          properties: {
            wordCount: { type: 'number', minimum: 10 },
            readabilityScore: { type: 'number', minimum: 0, maximum: 1 },
            sentimentScore: { type: 'number', minimum: -1, maximum: 1 },
            brandAlignment: { type: 'number', minimum: 0, maximum: 1 },
            engagementPotential: { type: 'number', minimum: 0, maximum: 1 },
            callToActionPresent: { type: 'boolean' },
            hashtagsIncluded: { type: 'boolean' },
            targetAudienceAlignment: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: [
            'wordCount', 'readabilityScore', 'sentimentScore', 
            'brandAlignment', 'engagementPotential', 'callToActionPresent'
          ]
        },
        variations: {
          type: 'array',
          minItems: 0,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              content: { type: 'string', minLength: 50 },
              purpose: { type: 'string' },
              qualityScore: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['content', 'purpose', 'qualityScore']
          }
        },
        qualityScore: { 
          type: 'number', 
          minimum: 0, 
          maximum: 1 
        },
        platformOptimization: {
          type: 'object',
          properties: {
            platform: { type: 'string' },
            optimizationScore: { type: 'number', minimum: 0, maximum: 1 },
            characterLimit: { type: 'number', minimum: 0 },
            platformSpecificElements: { type: 'array', items: { type: 'string' } }
          },
          required: ['platform', 'optimizationScore']
        }
      },
      required: ['content', 'metadata', 'qualityScore', 'platformOptimization']
    };

    const creativeQualityThresholds: QualityThresholds = {
      qualityScore: 0.8,
      brandAlignment: 0.85,
      engagementPotential: 0.75,
      readabilityScore: 0.7,
      platformOptimization: 0.8
    };

    it('should validate high-quality creative content', () => {
      const validOutput = {
        content: '🚀 AI is transforming marketing at unprecedented speed. Our latest analysis shows 73% of B2B marketers now leverage AI for personalization, yet most are only scratching the surface. The game-changers we\'re seeing: • Real-time content adaptation (3.2x engagement boost) • Predictive customer journey mapping • Automated A/B testing at scale. What\'s your biggest AI marketing challenge? Let\'s discuss! #AIMarketing #MarTech #B2BMarketing',
        metadata: {
          wordCount: 67,
          readabilityScore: 0.78,
          sentimentScore: 0.65,
          brandAlignment: 0.92,
          engagementPotential: 0.88,
          callToActionPresent: true,
          hashtagsIncluded: true,
          targetAudienceAlignment: 0.89
        },
        variations: [
          {
            content: 'Shorter version: AI marketing is evolving fast. 73% of B2B marketers use AI for personalization. Key trends: real-time adaptation, predictive mapping, automated testing. What challenges do you face? #AIMarketing',
            purpose: 'twitter-optimized',
            qualityScore: 0.82
          }
        ],
        qualityScore: 0.89,
        platformOptimization: {
          platform: 'linkedin',
          optimizationScore: 0.91,
          characterLimit: 3000,
          platformSpecificElements: ['professional-tone', 'question-engagement', 'industry-hashtags']
        }
      };

      const validation = outputValidator.validateSchema(validOutput, creativeOutputSchema);
      expect(validation.valid).toBe(true);

      const qualityCheck = qualityEnforcer.enforceThresholds(validOutput, creativeQualityThresholds);
      expect(qualityCheck.passed).toBe(true);
    });

    it('should reject low-quality creative content', () => {
      const invalidOutput = {
        content: 'Bad content',
        metadata: {
          wordCount: 2,
          readabilityScore: 0.3,
          sentimentScore: -0.8,
          brandAlignment: 0.2,
          engagementPotential: 0.1,
          callToActionPresent: false
        },
        qualityScore: 0.2,
        platformOptimization: {
          platform: 'linkedin',
          optimizationScore: 0.1
        }
      };

      const validation = outputValidator.validateSchema(invalidOutput, creativeOutputSchema);
      expect(validation.valid).toBe(false);

      const qualityCheck = qualityEnforcer.enforceThresholds(invalidOutput, creativeQualityThresholds);
      expect(qualityCheck.passed).toBe(false);
      expect(qualityCheck.violations).toContainEqual(
        expect.objectContaining({
          metric: 'qualityScore',
          threshold: 0.8,
          actual: 0.2
        })
      );
    });
  });

  describe('Legal Agent Output Validation', () => {
    const legalOutputSchema: AgentOutputSchema = {
      type: 'object',
      properties: {
        complianceAssessment: {
          type: 'object',
          properties: {
            overallRisk: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'critical'] 
            },
            riskScore: { type: 'number', minimum: 0, maximum: 1 },
            violations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  regulation: { type: 'string' },
                  description: { type: 'string', minLength: 20 },
                  severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                  recommendation: { type: 'string', minLength: 30 },
                  compliance: { type: 'boolean' }
                },
                required: ['type', 'regulation', 'description', 'severity', 'recommendation', 'compliance']
              }
            },
            suggestedRevisions: {
              type: 'array',
              items: { type: 'string', minLength: 20 }
            }
          },
          required: ['overallRisk', 'riskScore', 'violations', 'suggestedRevisions']
        },
        regulatoryCompliance: {
          type: 'object',
          properties: {
            applicableRegulations: { type: 'array', items: { type: 'string' } },
            complianceStatus: { type: 'object' },
            requiredDisclosures: { type: 'array', items: { type: 'string' } }
          },
          required: ['applicableRegulations', 'complianceStatus']
        },
        analysisMetadata: {
          type: 'object',
          properties: {
            analysisCompleteness: { type: 'number', minimum: 0, maximum: 1 },
            confidenceLevel: { type: 'number', minimum: 0, maximum: 1 },
            reviewTime: { type: 'number', minimum: 0 }
          },
          required: ['analysisCompleteness', 'confidenceLevel', 'reviewTime']
        }
      },
      required: ['complianceAssessment', 'regulatoryCompliance', 'analysisMetadata']
    };

    const legalQualityThresholds: QualityThresholds = {
      riskDetectionAccuracy: 0.95,
      analysisCompleteness: 0.9,
      confidenceLevel: 0.85,
      reviewTime: 10000
    };

    it('should validate thorough legal compliance analysis', () => {
      const validOutput = {
        complianceAssessment: {
          overallRisk: 'high',
          riskScore: 0.8,
          violations: [
            {
              type: 'unsubstantiated-claims',
              regulation: 'FTC-Section-5',
              description: 'The claim of "300% ROI guarantee" cannot be substantiated with provided evidence',
              severity: 'high',
              recommendation: 'Remove guarantee language or provide substantiation studies',
              compliance: false
            },
            {
              type: 'false-endorsement',
              regulation: 'FTC-endorsement-guidelines',
              description: 'Implies endorsement by Fortune 500 companies without explicit permission',
              severity: 'high',
              recommendation: 'Remove specific company references or obtain proper endorsement agreements',
              compliance: false
            }
          ],
          suggestedRevisions: [
            'Replace "guarantees 300% ROI" with "may improve ROI by up to 300%" with disclaimers',
            'Change "Used by Fortune 500 companies" to "Trusted by leading enterprises"',
            'Add disclaimer: "Results may vary based on implementation and market conditions"'
          ]
        },
        regulatoryCompliance: {
          applicableRegulations: ['FTC-Section-5', 'FTC-endorsement-guidelines', 'CAN-SPAM'],
          complianceStatus: {
            'FTC-Section-5': false,
            'FTC-endorsement-guidelines': false,
            'CAN-SPAM': true
          },
          requiredDisclosures: [
            'Individual results may vary',
            'Not all customers will achieve stated results'
          ]
        },
        analysisMetadata: {
          analysisCompleteness: 0.95,
          confidenceLevel: 0.92,
          reviewTime: 4500
        }
      };

      const validation = outputValidator.validateSchema(validOutput, legalOutputSchema);
      expect(validation.valid).toBe(true);

      const qualityCheck = qualityEnforcer.enforceThresholds(validOutput, legalQualityThresholds);
      expect(qualityCheck.passed).toBe(true);
    });
  });

  describe('Cross-Agent Output Consistency', () => {
    it('should maintain consistency across agent output formats', () => {
      const agentOutputs = [
        { agentType: 'research', requiredFields: ['insights', 'sources', 'confidence'] },
        { agentType: 'creative', requiredFields: ['content', 'metadata', 'qualityScore'] },
        { agentType: 'legal', requiredFields: ['complianceAssessment', 'analysisMetadata'] },
        { agentType: 'planner', requiredFields: ['campaignPlan', 'budgetAllocation'] },
        { agentType: 'publisher', requiredFields: ['publishingPlan', 'optimizationMetrics'] }
      ];

      // All agents should have executionMetadata
      agentOutputs.forEach(agent => {
        expect(agent.requiredFields).toContain(expect.stringMatching(/(metadata|plan|assessment)/));
      });

      // All agents should have quality/confidence measures
      agentOutputs.forEach(agent => {
        const hasQualityField = agent.requiredFields.some(field => 
          field.includes('quality') || field.includes('confidence') || field.includes('score')
        );
        expect(hasQualityField).toBe(true);
      });
    });

    it('should enforce minimum execution metadata across all agents', () => {
      const baseExecutionMetadata = {
        type: 'object',
        properties: {
          executionTime: { type: 'number', minimum: 0 },
          agentVersion: { type: 'string' },
          modelVersion: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          workspaceId: { type: 'string' }
        },
        required: ['executionTime', 'agentVersion', 'timestamp', 'workspaceId']
      };

      const sampleMetadata = {
        executionTime: 5000,
        agentVersion: 'v1.2.0',
        modelVersion: 'gpt-4-turbo',
        timestamp: '2024-01-15T10:30:00Z',
        workspaceId: 'ws-test-001'
      };

      const validation = outputValidator.validateSchema(sampleMetadata, baseExecutionMetadata);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Real-time Quality Enforcement', () => {
    it('should block agent outputs that fail quality thresholds', async () => {
      const lowQualityOutput = {
        content: 'Low quality content',
        metadata: {
          qualityScore: 0.3,
          brandAlignment: 0.2,
          engagementPotential: 0.1
        }
      };

      const thresholds = {
        qualityScore: 0.8,
        brandAlignment: 0.85,
        engagementPotential: 0.75
      };

      const enforcement = qualityEnforcer.enforceRealtime(lowQualityOutput, thresholds);
      
      expect(enforcement.allowed).toBe(false);
      expect(enforcement.violations.length).toBeGreaterThan(0);
      expect(enforcement.requiredActions).toContain('regenerate');
    });

    it('should allow high-quality outputs to proceed', async () => {
      const highQualityOutput = {
        content: 'High quality, engaging content that aligns perfectly with brand voice and targets the right audience effectively.',
        metadata: {
          qualityScore: 0.92,
          brandAlignment: 0.89,
          engagementPotential: 0.87
        }
      };

      const thresholds = {
        qualityScore: 0.8,
        brandAlignment: 0.85,
        engagementPotential: 0.75
      };

      const enforcement = qualityEnforcer.enforceRealtime(highQualityOutput, thresholds);
      
      expect(enforcement.allowed).toBe(true);
      expect(enforcement.violations).toHaveLength(0);
    });
  });
});