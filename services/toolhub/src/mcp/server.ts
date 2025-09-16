import * as Sentry from '@sentry/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Resource, Tool } from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';
import sentryConfig from '../config/sentry.js';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/mcp-server.log' })
  ]
});

const SENSITIVE_FIELDS = ['authorization', 'apikey', 'api_key', 'password', 'token', 'secret'];

function scrubSensitiveData(data: unknown): void {
  if (!data || typeof data !== 'object') {
    return;
  }
  for (const key of Object.keys(data as Record<string, any>)) {
    const value = (data as Record<string, any>)[key];
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      (data as Record<string, any>)[key] = '[Filtered]';
    } else if (typeof value === 'object') {
      scrubSensitiveData(value);
    }
  }
}

if (sentryConfig.enabled && sentryConfig.dsn) {
  Sentry.init({
    ...sentryConfig,
    beforeSend(event) {
      scrubSensitiveData(event.request?.headers);
      scrubSensitiveData(event.request?.data);
      scrubSensitiveData(event.extra);
      scrubSensitiveData(event.user);
      scrubSensitiveData(event.contexts);

      if (event.breadcrumbs) {
        for (const breadcrumb of event.breadcrumbs) {
          scrubSensitiveData(breadcrumb.data);
        }
      }

      return event;
    },
  });
}

/**
 * Enhanced MCP Server with Sentry monitoring for SMM Architect ToolHub
 * Provides tools for content analysis, vector search, and agent orchestration
 */
export class SMMArchitectMCPServer {
  private server: Server;
  private isInitialized = false;

  constructor() {
    // Initialize MCP Server with Sentry configuration
    this.server = new Server(
      {
        name: 'smm-architect-toolhub',
        version: process.env.npm_package_version || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupSentryIntegration();
    this.setupTools();
    this.setupResources();
    this.setupErrorHandling();
  }

  /**
   * Configure Sentry monitoring for MCP server operations
   */
  private setupSentryIntegration(): void {
    // Wrap server methods with Sentry monitoring
    const originalSetRequestHandler = this.server.setRequestHandler.bind(this.server);
    
    this.server.setRequestHandler = (schema: any, handler: any) => {
      const wrappedHandler = async (request: any) => {
        return Sentry.startSpan({
          op: 'mcp.request',
          name: `MCP ${schema.method || 'unknown'}`,
        }, async (span) => {
          if (span) {
            span.setAttribute('mcp.method', schema.method || 'unknown');
            span.setAttribute('mcp.server', 'smm-architect-toolhub');
            span.setAttribute('service.name', 'toolhub');
            span.setAttribute('service.component', 'mcp-server');
          }

          try {
            const startTime = Date.now();
            const result = await handler(request);
            
            const duration = Date.now() - startTime;
            if (span) {
              span.setAttribute('mcp.duration_ms', duration);
            }
            if (span) {
              span.setAttribute('mcp.status', 'success');
            }
            
            return result;
          } catch (error) {
            if (span) {
              span.setAttribute('mcp.status', 'error');
            }
            if (span) {
              span.setAttribute('mcp.error', error instanceof Error ? error.message : String(error));
            }
            
            Sentry.captureException(error, {
              tags: {
                component: 'mcp-server',
                method: schema.method || 'unknown'
              }
            });
            
            throw error;
          }
        });
      };

      return originalSetRequestHandler(schema, wrappedHandler);
    };
  }

  /**
   * Setup MCP tools for SMM Architect platform
   */
  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'content_analyze',
          description: 'Analyze content for brand compliance, sentiment, and engagement potential',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Content to analyze'
              },
              platform: {
                type: 'string',
                enum: ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'],
                description: 'Target social media platform'
              },
              brandContext: {
                type: 'object',
                description: 'Brand context and guidelines',
                properties: {
                  industry: { type: 'string' },
                  tone: { type: 'string' },
                  guidelines: { type: 'array', items: { type: 'string' } }
                }
              }
            },
            required: ['content', 'platform']
          }
        },
        {
          name: 'vector_search',
          description: 'Search content using vector similarity for research and inspiration',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              category: {
                type: 'string',
                enum: ['posts', 'campaigns', 'templates', 'research'],
                description: 'Content category to search'
              },
              limit: {
                type: 'number',
                default: 10,
                description: 'Maximum number of results'
              },
              filters: {
                type: 'object',
                description: 'Additional filters for search',
                properties: {
                  platform: { type: 'string' },
                  dateRange: { type: 'string' },
                  engagement: { type: 'string' }
                }
              }
            },
            required: ['query', 'category']
          }
        },
        {
          name: 'agent_orchestrate',
          description: 'Orchestrate multi-agent workflow for content creation and analysis',
          inputSchema: {
            type: 'object',
            properties: {
              workflow: {
                type: 'string',
                enum: ['content_creation', 'campaign_analysis', 'brand_monitoring', 'competitor_research'],
                description: 'Type of workflow to execute'
              },
              agents: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['research-agent', 'creative-agent', 'legal-agent', 'analytics-agent']
                },
                description: 'Agents to include in workflow'
              },
              parameters: {
                type: 'object',
                description: 'Workflow parameters and context'
              }
            },
            required: ['workflow', 'agents']
          }
        },
        {
          name: 'workspace_simulate',
          description: 'Simulate workspace provisioning and deployment scenarios',
          inputSchema: {
            type: 'object',
            properties: {
              workspaceId: {
                type: 'string',
                description: 'Workspace identifier'
              },
              scenario: {
                type: 'string',
                enum: ['deployment', 'scaling', 'failover', 'performance'],
                description: 'Simulation scenario'
              },
              iterations: {
                type: 'number',
                default: 100,
                description: 'Number of simulation iterations'
              },
              dryRun: {
                type: 'boolean',
                default: true,
                description: 'Whether to run in dry-run mode'
              }
            },
            required: ['workspaceId', 'scenario']
          }
        }
      ];

      return { tools };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'content_analyze':
          return this.handleContentAnalyze(args);
        case 'vector_search':
          return this.handleVectorSearch(args);
        case 'agent_orchestrate':
          return this.handleAgentOrchestrate(args);
        case 'workspace_simulate':
          return this.handleWorkspaceSimulate(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Setup MCP resources for content and configuration access
   */
  private setupResources(): void {
    // Resource endpoints will be implemented based on specific requirements
    // This provides a foundation for resource management
  }

  /**
   * Setup comprehensive error handling with Sentry integration
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error('MCP Server error:', error);
      
      Sentry.captureException(error, {
        tags: {
          component: 'mcp-server',
          service: 'toolhub'
        }
      });
    };

    // Handle process errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception in MCP server:', error);
      Sentry.captureException(error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection in MCP server:', reason);
      Sentry.captureException(new Error(`Unhandled rejection: ${reason}`));
    });
  }

  /**
   * Handle content analysis tool requests
   */
  private async handleContentAnalyze(args: any) {
    return Sentry.startSpan({
      op: 'mcp.tool.content_analyze',
      name: 'Content Analysis',
    }, async (span) => {
      if (span) {
        span.setAttribute('tool.name', 'content_analyze');
      }
      if (span) {
        span.setAttribute('content.platform', args.platform);
      }
      if (span) {
        span.setAttribute('content.length', args.content?.length || 0);
      }

      try {
        // Mock implementation - replace with actual content analysis logic
        const analysis = {
          sentiment: 'positive',
          engagement_score: 8.5,
          brand_compliance: true,
          suggestions: [
            'Consider adding more visual elements',
            'Optimize for platform-specific hashtags'
          ],
          platform_optimized: args.platform === 'instagram' || args.platform === 'tiktok'
        };

        if (span) {
          span.setAttribute('analysis.sentiment', analysis.sentiment);
        }
        if (span) {
          span.setAttribute('analysis.engagement_score', analysis.engagement_score);
        }
        if (span) {
          span.setAttribute('analysis.brand_compliance', analysis.brand_compliance);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Content Analysis Results:\n${JSON.stringify(analysis, null, 2)}`
            }
          ]
        };
      } catch (error) {
        if (span) {
          span.setAttribute('tool.error', error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  /**
   * Handle vector search tool requests
   */
  private async handleVectorSearch(args: any) {
    return Sentry.startSpan({
      op: 'mcp.tool.vector_search',
      name: 'Vector Search',
    }, async (span) => {
      if (span) {
        span.setAttribute('tool.name', 'vector_search');
      }
      if (span) {
        span.setAttribute('search.query', args.query);
      }
      if (span) {
        span.setAttribute('search.category', args.category);
      }
      if (span) {
        if (span) {
        span.setAttribute('search.limit', args.limit || 10);
      }
      }

      try {
        // Mock implementation - replace with actual vector search logic
        const results = [
          {
            id: '1',
            content: 'Sample content that matches your query',
            similarity: 0.95,
            metadata: {
              platform: args.filters?.platform || 'instagram',
              engagement: 'high',
              date: '2024-01-15'
            }
          },
          {
            id: '2',
            content: 'Another relevant piece of content',
            similarity: 0.87,
            metadata: {
              platform: args.filters?.platform || 'facebook',
              engagement: 'medium',
              date: '2024-01-10'
            }
          }
        ];

        if (span) {
          span.setAttribute('search.results_count', results.length);
        }
        if (span) {
          span.setAttribute('search.top_similarity', results[0]?.similarity || 0);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Vector Search Results:\n${JSON.stringify(results, null, 2)}`
            }
          ]
        };
      } catch (error) {
        if (span) {
          span.setAttribute('tool.error', error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  /**
   * Handle agent orchestration tool requests
   */
  private async handleAgentOrchestrate(args: any) {
    return Sentry.startSpan({
      op: 'mcp.tool.agent_orchestrate',
      name: 'Agent Orchestration',
    }, async (span) => {
      if (span) {
        span.setAttribute('tool.name', 'agent_orchestrate');
      }
      if (span) {
        span.setAttribute('workflow.type', args.workflow);
      }
      if (span) {
        span.setAttribute('workflow.agents_count', args.agents?.length || 0);
      }

      try {
        // Mock implementation - replace with actual agent orchestration logic
        const orchestrationResult = {
          workflow_id: `workflow_${Date.now()}`,
          status: 'completed',
          agents_executed: args.agents,
          results: args.agents.map((agent: string) => ({
            agent,
            status: 'success',
            output: `${agent} completed successfully`,
            duration_ms: Math.floor(Math.random() * 1000) + 500
          })),
          total_duration_ms: Math.floor(Math.random() * 5000) + 2000
        };

        if (span) {
          span.setAttribute('workflow.status', orchestrationResult.status);
        }
        if (span) {
          span.setAttribute('workflow.duration_ms', orchestrationResult.total_duration_ms);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Agent Orchestration Results:\n${JSON.stringify(orchestrationResult, null, 2)}`
            }
          ]
        };
      } catch (error) {
        if (span) {
          span.setAttribute('tool.error', error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  /**
   * Handle workspace simulation tool requests
   */
  private async handleWorkspaceSimulate(args: any) {
    return Sentry.startSpan({
      op: 'mcp.tool.workspace_simulate',
      name: 'Workspace Simulation',
    }, async (span) => {
      if (span) {
        span.setAttribute('tool.name', 'workspace_simulate');
      }
      if (span) {
        span.setAttribute('simulation.workspace_id', args.workspaceId);
      }
      if (span) {
        span.setAttribute('simulation.scenario', args.scenario);
      }
      if (span) {
        span.setAttribute('simulation.iterations', args.iterations || 100);
      }
      if (span) {
        span.setAttribute('simulation.dry_run', args.dryRun !== false);
      }

      try {
        // Mock implementation - replace with actual workspace simulation logic
        const simulationResult = {
          workspace_id: args.workspaceId,
          scenario: args.scenario,
          iterations: args.iterations || 100,
          dry_run: args.dryRun !== false,
          results: {
            success_rate: 0.95,
            average_response_time: 150,
            error_rate: 0.05,
            resource_utilization: {
              cpu: 65,
              memory: 78,
              network: 45
            }
          },
          recommendations: [
            'Consider increasing memory allocation for better performance',
            'Add more monitoring for network latency'
          ]
        };

        if (span) {
          span.setAttribute('simulation.success_rate', simulationResult.results.success_rate);
        }
        if (span) {
          span.setAttribute('simulation.avg_response_time', simulationResult.results.average_response_time);
        }

        return {
          content: [
            {
              type: 'text',
              text: `Workspace Simulation Results:\n${JSON.stringify(simulationResult, null, 2)}`
            }
          ]
        };
      } catch (error) {
        if (span) {
          span.setAttribute('tool.error', error instanceof Error ? error.message : String(error));
        }
        throw error;
      }
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('MCP Server is already initialized');
    }

    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isInitialized = true;
      
      logger.info('SMM Architect MCP Server started successfully', {
        serverName: 'smm-architect-toolhub',
        version: process.env.npm_package_version || '1.0.0',
        sentryEnabled: true
      });

      // Log server startup to Sentry
      Sentry.captureMessage('MCP Server started', {
        level: 'info',
        extra: {
          server: 'smm-architect-toolhub',
          version: process.env.npm_package_version || '1.0.0'
        }
      });

    } catch (error) {
      logger.error('Failed to start MCP Server:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.server.close();
      this.isInitialized = false;
      
      logger.info('SMM Architect MCP Server stopped');
      Sentry.captureMessage('MCP Server stopped', 'info');
      
    } catch (error) {
      logger.error('Error stopping MCP Server:', error);
      Sentry.captureException(error);
      throw error;
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.isInitialized;
  }
}

// Export wrapped server instance for easy integration
export function createSentryWrappedMCPServer(): SMMArchitectMCPServer {
  return new SMMArchitectMCPServer();
}

export default SMMArchitectMCPServer;