import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { TestWorkspaceManager } from '../utils/test-workspace-manager';
import { AgentExecutor } from '../../services/smm-architect/src/agents/agent-executor';
import { 
  ResearchAgent,
  PlannerAgent, 
  CreativeAgent,
  AutomationAgent,
  LegalAgent,
  PublisherAgent
} from '../../services/smm-architect/src/agents';
import { AgentOutputValidator } from '../utils/agent-output-validator';
import { 
  AgentBlueprint,
  AgentTestSuite,
  AgentOutputMetrics 
} from '../types/agent-testing';

describe('Agent Blueprint Testing Framework', () => {
  let workspaceManager: TestWorkspaceManager;
  let agentExecutor: AgentExecutor;
  let outputValidator: AgentOutputValidator;
  let testWorkspaces: Map<string, string> = new Map();

  beforeAll(async () => {
    workspaceManager = new TestWorkspaceManager();
    agentExecutor = new AgentExecutor();
    outputValidator = new AgentOutputValidator();
    
    // Create isolated test workspaces for each agent type
    const agentTypes = ['research', 'planner', 'creative', 'automation', 'legal', 'publisher'];
    
    for (const agentType of agentTypes) {
      const workspaceId = await workspaceManager.createIsolatedWorkspace({
        name: `${agentType}-agent-test-workspace`,
        agentType,
        testData: true,
        isolation: 'complete'
      });
      testWorkspaces.set(agentType, workspaceId);
    }
  });

  afterAll(async () => {
    // Cleanup all test workspaces
    for (const workspaceId of testWorkspaces.values()) {
      await workspaceManager.destroyWorkspace(workspaceId);
    }
  });

  beforeEach(async () => {
    // Reset workspace state before each test
    for (const [agentType, workspaceId] of testWorkspaces) {
      await workspaceManager.resetWorkspaceState(workspaceId);
    }
  });

  describe('Research Agent Blueprint Testing', () => {
    let researchAgent: ResearchAgent;
    let workspaceId: string;

    beforeEach(() => {
      researchAgent = new ResearchAgent();
      workspaceId = testWorkspaces.get('research')!;
    });

    it('should execute market research blueprint successfully', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'research',
        version: 'v1.0.0',
        name: 'market-research-blueprint',
        description: 'Comprehensive market research for B2B SaaS',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            industry: { type: 'string' },
            timeframe: { type: 'string' },
            sources: { type: 'array', items: { type: 'string' } }
          },
          required: ['topic', 'industry']
        },
        outputSchema: {
          type: 'object',
          properties: {
            insights: { type: 'array' },
            sources: { type: 'array' },
            summary: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 }
          },
          required: ['insights', 'sources', 'summary', 'confidence']
        },
        qualityThresholds: {
          minInsights: 5,
          minSources: 3,
          minConfidence: 0.7,
          maxExecutionTime: 30000
        }
      };

      const input = {
        topic: 'AI marketing automation trends',
        industry: 'technology',
        timeframe: 'last-6-months',
        sources: ['industry-reports', 'expert-analysis', 'competitor-research']
      };

      const startTime = Date.now();
      const result = await agentExecutor.executeAgent(
        researchAgent,
        blueprint,
        input,
        { workspaceId }
      );
      const executionTime = Date.now() - startTime;

      // Validate execution
      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(blueprint.qualityThresholds.maxExecutionTime);

      // Validate output schema
      const validation = await outputValidator.validateOutput(
        result.output,
        blueprint.outputSchema
      );
      expect(validation.valid).toBe(true);

      // Validate quality thresholds
      expect(result.output.insights).toHaveLength(
        expect.toBeGreaterThanOrEqual(blueprint.qualityThresholds.minInsights)
      );
      expect(result.output.sources).toHaveLength(
        expect.toBeGreaterThanOrEqual(blueprint.qualityThresholds.minSources)
      );
      expect(result.output.confidence).toBeGreaterThanOrEqual(
        blueprint.qualityThresholds.minConfidence
      );

      // Validate content quality
      expect(result.output.summary).toBeTruthy();
      expect(result.output.summary.length).toBeGreaterThan(100);
      
      // Check insights quality
      result.output.insights.forEach((insight: any) => {
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('relevance');
        expect(insight.relevance).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should handle competitor analysis blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'research',
        name: 'competitor-analysis-blueprint',
        inputSchema: {
          type: 'object',
          properties: {
            competitors: { type: 'array', items: { type: 'string' } },
            analysisAreas: { type: 'array', items: { type: 'string' } },
            platforms: { type: 'array', items: { type: 'string' } }
          },
          required: ['competitors', 'analysisAreas']
        },
        outputSchema: {
          type: 'object',
          properties: {
            competitorProfiles: { type: 'array' },
            marketPositioning: { type: 'object' },
            opportunities: { type: 'array' },
            threats: { type: 'array' }
          }
        },
        qualityThresholds: {
          minCompetitors: 3,
          minOpportunities: 2,
          minThreatsSolutions: 2
        }
      };

      const input = {
        competitors: ['HubSpot', 'Marketo', 'Pardot'],
        analysisAreas: ['pricing', 'features', 'market-share', 'customer-sentiment'],
        platforms: ['linkedin', 'twitter', 'company-websites']
      };

      const result = await agentExecutor.executeAgent(
        researchAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.competitorProfiles).toHaveLength(3);
      expect(result.output.opportunities.length).toBeGreaterThanOrEqual(2);
      expect(result.output.threats.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Planner Agent Blueprint Testing', () => {
    let plannerAgent: PlannerAgent;
    let workspaceId: string;

    beforeEach(() => {
      plannerAgent = new PlannerAgent();
      workspaceId = testWorkspaces.get('planner')!;
    });

    it('should execute campaign planning blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'planner',
        name: 'campaign-planning-blueprint',
        inputSchema: {
          type: 'object',
          properties: {
            objectives: { type: 'array' },
            budget: { type: 'object' },
            timeline: { type: 'string' },
            targetAudience: { type: 'object' },
            channels: { type: 'array' }
          },
          required: ['objectives', 'budget', 'timeline']
        },
        outputSchema: {
          type: 'object',
          properties: {
            campaignPlan: { type: 'object' },
            phases: { type: 'array' },
            budgetAllocation: { type: 'object' },
            timeline: { type: 'object' },
            kpis: { type: 'array' }
          }
        },
        qualityThresholds: {
          minPhases: 2,
          budgetEfficiency: 0.85,
          timelineRealism: 0.8
        }
      };

      const input = {
        objectives: [
          { type: 'lead-generation', target: 500, unit: 'qualified-leads' },
          { type: 'brand-awareness', target: 10000, unit: 'impressions' }
        ],
        budget: {
          total: 50000,
          currency: 'USD',
          timeframe: 'quarterly'
        },
        timeline: '12-weeks',
        targetAudience: {
          personas: ['marketing-director', 'cmo'],
          industries: ['technology', 'saas'],
          companySize: ['mid-market', 'enterprise']
        },
        channels: ['linkedin', 'google-ads', 'content-marketing']
      };

      const result = await agentExecutor.executeAgent(
        plannerAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      
      // Validate campaign structure
      expect(result.output.phases.length).toBeGreaterThanOrEqual(2);
      expect(result.output.budgetAllocation).toBeDefined();
      expect(result.output.kpis).toBeDefined();
      
      // Validate budget allocation
      const totalAllocated = Object.values(result.output.budgetAllocation as Record<string, number>)
        .reduce((sum, amount) => sum + amount, 0);
      expect(totalAllocated).toBeLessThanOrEqual(input.budget.total);
      
      // Validate timeline realism
      expect(result.output.timeline.duration).toBeDefined();
      expect(result.output.timeline.milestones).toBeDefined();
    });

    it('should handle resource allocation blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'planner',
        name: 'resource-allocation-blueprint',
        qualityThresholds: {
          resourceUtilization: 0.9,
          skillsMatching: 0.8
        }
      };

      const input = {
        resources: {
          team: ['content-creator', 'designer', 'strategist'],
          tools: ['design-software', 'analytics-platform'],
          budget: 25000
        },
        requirements: {
          contentPieces: 50,
          designAssets: 20,
          campaigns: 3
        }
      };

      const result = await agentExecutor.executeAgent(
        plannerAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.resourcePlan).toBeDefined();
      expect(result.output.utilization).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Creative Agent Blueprint Testing', () => {
    let creativeAgent: CreativeAgent;
    let workspaceId: string;

    beforeEach(() => {
      creativeAgent = new CreativeAgent();
      workspaceId = testWorkspaces.get('creative')!;
    });

    it('should execute content creation blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'creative',
        name: 'content-creation-blueprint',
        inputSchema: {
          type: 'object',
          properties: {
            contentType: { type: 'string', enum: ['linkedin-post', 'blog-article', 'email'] },
            topic: { type: 'string' },
            brandVoice: { type: 'string' },
            targetAudience: { type: 'string' },
            constraints: { type: 'object' }
          }
        },
        outputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            metadata: { type: 'object' },
            variations: { type: 'array' },
            qualityScore: { type: 'number' }
          }
        },
        qualityThresholds: {
          minQualityScore: 0.8,
          brandAlignment: 0.85,
          engagementPotential: 0.75
        }
      };

      const input = {
        contentType: 'linkedin-post',
        topic: 'AI marketing automation benefits',
        brandVoice: 'professional-authoritative',
        targetAudience: 'marketing-executives',
        constraints: {
          maxLength: 3000,
          includeHashtags: true,
          callToAction: true
        }
      };

      const result = await agentExecutor.executeAgent(
        creativeAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.content).toBeTruthy();
      expect(result.output.content.length).toBeLessThanOrEqual(3000);
      expect(result.output.qualityScore).toBeGreaterThanOrEqual(0.8);
      
      // Check for required elements
      expect(result.output.content).toMatch(/#\w+/); // Contains hashtags
      expect(result.output.metadata.callToActionPresent).toBe(true);
      expect(result.output.metadata.brandAlignment).toBeGreaterThanOrEqual(0.85);
    });

    it('should handle multi-platform content blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'creative',
        name: 'multi-platform-content-blueprint',
        qualityThresholds: {
          platformOptimization: 0.8,
          contentConsistency: 0.85
        }
      };

      const input = {
        baseTopic: 'Product launch announcement',
        platforms: ['linkedin', 'twitter', 'instagram', 'facebook'],
        brandGuidelines: {
          voice: 'enthusiastic-professional',
          colors: ['#1a1a1a', '#ff6b35'],
          fonts: ['Helvetica', 'Arial']
        }
      };

      const result = await agentExecutor.executeAgent(
        creativeAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.platformVariations).toHaveLength(4);
      
      // Each platform should have optimized content
      result.output.platformVariations.forEach((variation: any) => {
        expect(variation.platform).toBeTruthy();
        expect(variation.content).toBeTruthy();
        expect(variation.optimizationScore).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Automation Agent Blueprint Testing', () => {
    let automationAgent: AutomationAgent;
    let workspaceId: string;

    beforeEach(() => {
      automationAgent = new AutomationAgent();
      workspaceId = testWorkspaces.get('automation')!;
    });

    it('should execute workflow automation blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'automation',
        name: 'workflow-automation-blueprint',
        qualityThresholds: {
          workflowEfficiency: 0.85,
          errorHandling: 0.9,
          scalability: 0.8
        }
      };

      const input = {
        workflowType: 'content-publishing',
        triggers: ['time-based', 'event-based'],
        actions: ['content-generation', 'platform-publishing', 'analytics-tracking'],
        conditions: ['quality-check', 'approval-required'],
        schedule: {
          frequency: 'daily',
          time: '09:00',
          timezone: 'America/New_York'
        }
      };

      const result = await agentExecutor.executeAgent(
        automationAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.workflowDefinition).toBeDefined();
      expect(result.output.automationRules).toBeDefined();
      expect(result.output.errorHandling).toBeDefined();
      expect(result.output.efficiency).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Legal Agent Blueprint Testing', () => {
    let legalAgent: LegalAgent;
    let workspaceId: string;

    beforeEach(() => {
      legalAgent = new LegalAgent();
      workspaceId = testWorkspaces.get('legal')!;
    });

    it('should execute compliance review blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'legal',
        name: 'compliance-review-blueprint',
        qualityThresholds: {
          riskDetectionAccuracy: 0.95,
          complianceCoverage: 0.9,
          recommendationQuality: 0.85
        }
      };

      const input = {
        contentToReview: 'Our AI platform guarantees 300% ROI increase for all customers. Used by Fortune 500 companies.',
        jurisdiction: 'US',
        regulations: ['FTC', 'CAN-SPAM', 'GDPR'],
        contentType: 'marketing-material'
      };

      const result = await agentExecutor.executeAgent(
        legalAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.complianceAssessment).toBeDefined();
      expect(result.output.riskLevel).toBeDefined();
      expect(result.output.violations).toBeDefined();
      expect(result.output.recommendations).toBeDefined();
      
      // Should detect unsubstantiated claims
      expect(result.output.violations.length).toBeGreaterThan(0);
      expect(result.output.riskLevel).toBe('high');
    });
  });

  describe('Publisher Agent Blueprint Testing', () => {
    let publisherAgent: PublisherAgent;
    let workspaceId: string;

    beforeEach(() => {
      publisherAgent = new PublisherAgent();
      workspaceId = testWorkspaces.get('publisher')!;
    });

    it('should execute publishing optimization blueprint', async () => {
      const blueprint: AgentBlueprint = {
        agentType: 'publisher',
        name: 'publishing-optimization-blueprint',
        qualityThresholds: {
          schedulingOptimization: 0.85,
          platformCompliance: 0.95,
          audienceTargeting: 0.8
        }
      };

      const input = {
        content: {
          text: 'Exciting news! Our AI platform is now available for beta testing.',
          media: [],
          hashtags: ['#AI', '#Beta', '#Innovation']
        },
        platforms: ['linkedin', 'twitter'],
        targetAudience: {
          demographics: ['tech-professionals'],
          interests: ['ai', 'automation']
        },
        schedule: {
          optimizeForEngagement: true,
          timezone: 'America/New_York'
        }
      };

      const result = await agentExecutor.executeAgent(
        publisherAgent,
        blueprint,
        input,
        { workspaceId }
      );

      expect(result.success).toBe(true);
      expect(result.output.publishingPlan).toBeDefined();
      expect(result.output.schedulingOptimization).toBeGreaterThanOrEqual(0.85);
      expect(result.output.platformCompliance).toBeGreaterThanOrEqual(0.95);
      expect(result.output.estimatedReach).toBeDefined();
    });
  });

  describe('Cross-Agent Integration Testing', () => {
    it('should coordinate multi-agent workflow', async () => {
      const researchWorkspace = testWorkspaces.get('research')!;
      const creativeWorkspace = testWorkspaces.get('creative')!;
      const publisherWorkspace = testWorkspaces.get('publisher')!;

      // Step 1: Research
      const researchResult = await agentExecutor.executeAgent(
        new ResearchAgent(),
        { agentType: 'research', name: 'market-research' },
        { topic: 'AI trends', industry: 'technology' },
        { workspaceId: researchWorkspace }
      );

      // Step 2: Creative (using research insights)
      const creativeResult = await agentExecutor.executeAgent(
        new CreativeAgent(),
        { agentType: 'creative', name: 'content-creation' },
        { 
          topic: researchResult.output.insights[0].title,
          research: researchResult.output.summary,
          contentType: 'linkedin-post'
        },
        { workspaceId: creativeWorkspace }
      );

      // Step 3: Publisher (using created content)
      const publisherResult = await agentExecutor.executeAgent(
        new PublisherAgent(),
        { agentType: 'publisher', name: 'publishing-optimization' },
        {
          content: creativeResult.output.content,
          platforms: ['linkedin'],
          schedule: { optimizeForEngagement: true }
        },
        { workspaceId: publisherWorkspace }
      );

      expect(researchResult.success).toBe(true);
      expect(creativeResult.success).toBe(true);
      expect(publisherResult.success).toBe(true);
      
      // Verify data flow between agents
      expect(creativeResult.output.content).toContain(
        researchResult.output.insights[0].title.split(' ')[0]
      );
    });
  });

  describe('Agent Performance Benchmarking', () => {
    it('should meet performance SLOs for all agents', async () => {
      const performanceTests = [
        { agent: 'research', maxTime: 30000, blueprint: 'market-research' },
        { agent: 'planner', maxTime: 20000, blueprint: 'campaign-planning' },
        { agent: 'creative', maxTime: 15000, blueprint: 'content-creation' },
        { agent: 'automation', maxTime: 10000, blueprint: 'workflow-automation' },
        { agent: 'legal', maxTime: 5000, blueprint: 'compliance-review' },
        { agent: 'publisher', maxTime: 5000, blueprint: 'publishing-optimization' }
      ];

      for (const test of performanceTests) {
        const workspaceId = testWorkspaces.get(test.agent)!;
        
        const startTime = Date.now();
        const result = await agentExecutor.executeAgent(
          new (eval(`${test.agent.charAt(0).toUpperCase() + test.agent.slice(1)}Agent`))(),
          { agentType: test.agent, name: test.blueprint },
          { topic: 'performance test' },
          { workspaceId }
        );
        const duration = Date.now() - startTime;

        expect(result.success).toBe(true);
        expect(duration).toBeLessThan(test.maxTime);
        
        console.log(`${test.agent} agent: ${duration}ms (SLO: ${test.maxTime}ms)`);
      }
    });
  });
});