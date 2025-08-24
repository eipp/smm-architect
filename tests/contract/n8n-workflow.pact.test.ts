import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Pact, Matchers } from '@pact-foundation/pact';
import path from 'path';
import { N8nWorkflowClient } from '../../services/smm-architect/src/clients/n8n-client';

const { like, eachLike, term, somethingLike } = Matchers;

describe('N8n Workflow API Contract Tests', () => {
  let pact: Pact;
  let n8nClient: N8nWorkflowClient;

  beforeAll(async () => {
    pact = new Pact({
      consumer: 'smm-architect',
      provider: 'n8n-workflow-engine',
      port: 1235,
      log: path.resolve(process.cwd(), 'logs', 'n8n-pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
      spec: 3
    });

    await pact.setup();
    
    n8nClient = new N8nWorkflowClient({
      baseUrl: 'http://localhost:1235',
      apiKey: 'test-n8n-api-key',
      timeout: 30000
    });
  });

  afterAll(async () => {
    await pact.finalize();
  });

  beforeEach(async () => {
    await pact.removeInteractions();
  });

  afterEach(async () => {
    await pact.verify();
  });

  describe('Workflow Execution', () => {
    it('should execute campaign workflow successfully', async () => {
      await pact.addInteraction({
        state: 'n8n has campaign workflow template loaded',
        uponReceiving: 'a workflow execution request for campaign automation',
        withRequest: {
          method: 'POST',
          path: '/api/v1/workflows/executions',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-n8n-api-key'
          },
          body: {
            workflowId: 'campaign-execution-001',
            data: {
              workspaceId: 'ws-test-001',
              campaignConfig: {
                type: 'lead-generation',
                channels: ['linkedin', 'x'],
                budget: {
                  currency: 'USD',
                  dailyCap: 100
                },
                targeting: {
                  industries: ['technology', 'marketing'],
                  jobTitles: ['CEO', 'CMO', 'VP Marketing']
                }
              },
              contentSpecs: {
                postFormat: 'professional',
                includeMedia: true,
                callToAction: 'Learn more'
              }
            },
            runMode: 'trigger'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            executionId: like('exec-12345-abcde'),
            status: 'running',
            startedAt: like('2024-01-15T10:30:00.000Z'),
            workflowId: 'campaign-execution-001',
            data: {
              resultData: {
                runData: {}
              },
              startData: {
                destinationNode: like('start-node'),
                runNodeFilter: like(['research-agent', 'creative-agent', 'publisher-agent'])
              }
            },
            mode: 'trigger'
          }
        }
      });

      const response = await n8nClient.executeWorkflow({
        workflowId: 'campaign-execution-001',
        data: {
          workspaceId: 'ws-test-001',
          campaignConfig: {
            type: 'lead-generation',
            channels: ['linkedin', 'x'],
            budget: {
              currency: 'USD',
              dailyCap: 100
            },
            targeting: {
              industries: ['technology', 'marketing'],
              jobTitles: ['CEO', 'CMO', 'VP Marketing']
            }
          },
          contentSpecs: {
            postFormat: 'professional',
            includeMedia: true,
            callToAction: 'Learn more'
          }
        },
        runMode: 'trigger'
      });

      expect(response.executionId).toBeDefined();
      expect(response.status).toBe('running');
      expect(response.workflowId).toBe('campaign-execution-001');
      expect(response.startedAt).toBeDefined();
    });

    it('should check workflow execution status', async () => {
      await pact.addInteraction({
        state: 'workflow execution is in progress',
        uponReceiving: 'a request to check execution status',
        withRequest: {
          method: 'GET',
          path: '/api/v1/executions/exec-12345-abcde',
          headers: {
            'X-N8N-API-KEY': 'test-n8n-api-key'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            executionId: 'exec-12345-abcde',
            status: 'success',
            finished: true,
            stoppedAt: like('2024-01-15T10:35:42.000Z'),
            startedAt: like('2024-01-15T10:30:00.000Z'),
            workflowData: {
              nodes: eachLike({
                name: like('Research Agent'),
                type: like('n8n-nodes-smmarchitect.researchAgent'),
                parameters: like({
                  topic: 'AI marketing trends',
                  sources: ['industry-reports', 'competitor-analysis']
                }),
                position: like([250, 300])
              })
            },
            data: {
              resultData: {
                runData: {
                  'Research Agent': eachLike({
                    hints: like([]),
                    startTime: like(1705316200000),
                    executionTime: like(2341),
                    data: {
                      main: eachLike({
                        json: {
                          researchResults: like({
                            topic: 'AI marketing trends',
                            insights: eachLike({
                              title: like('AI transforms personalization'),
                              source: like('MarketingLand'),
                              relevanceScore: like(0.89),
                              publishedAt: like('2024-01-10T14:30:00Z')
                            }),
                            totalSources: like(15),
                            confidenceScore: like(0.92)
                          })
                        }
                      })
                    }
                  }),
                  'Creative Agent': eachLike({
                    hints: like([]),
                    startTime: like(1705316202341),
                    executionTime: like(1876),
                    data: {
                      main: eachLike({
                        json: {
                          generatedContent: like({
                            platform: 'linkedin',
                            content: like('🚀 AI is revolutionizing marketing personalization...'),
                            hashtags: like(['#AIMarketing', '#Personalization', '#MarTech']),
                            mediaAssets: like([
                              {
                                type: 'image',
                                url: 'https://assets.smmarchitect.com/generated/img-001.png',
                                altText: 'AI marketing visualization'
                              }
                            ]),
                            qualityScore: like(0.87),
                            brandAlignment: like(0.94)
                          })
                        }
                      })
                    }
                  }),
                  'Publisher Agent': eachLike({
                    hints: like([]),
                    startTime: like(1705316204217),
                    executionTime: like(987),
                    data: {
                      main: eachLike({
                        json: {
                          publishResults: like({
                            platform: 'linkedin',
                            postId: like('urn:li:activity:7123456789'),
                            publishedAt: like('2024-01-15T10:35:30Z'),
                            status: 'published',
                            reach: like({
                              estimated: 2500,
                              confidence: 0.78
                            }),
                            url: like('https://linkedin.com/feed/update/urn:li:activity:7123456789')
                          })
                        }
                      })
                    }
                  })
                }
              }
            }
          }
        }
      });

      const response = await n8nClient.getExecutionStatus('exec-12345-abcde');

      expect(response.executionId).toBe('exec-12345-abcde');
      expect(response.status).toBe('success');
      expect(response.finished).toBe(true);
      expect(response.data.resultData.runData).toBeDefined();
      
      // Verify agent outputs
      const runData = response.data.resultData.runData;
      expect(runData['Research Agent']).toBeDefined();
      expect(runData['Creative Agent']).toBeDefined();
      expect(runData['Publisher Agent']).toBeDefined();
    });

    it('should handle workflow execution failure', async () => {
      await pact.addInteraction({
        state: 'workflow execution has failed due to configuration error',
        uponReceiving: 'a request to check failed execution status',
        withRequest: {
          method: 'GET',
          path: '/api/v1/executions/exec-failed-001',
          headers: {
            'X-N8N-API-KEY': 'test-n8n-api-key'
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            executionId: 'exec-failed-001',
            status: 'error',
            finished: true,
            stoppedAt: like('2024-01-15T10:32:15.000Z'),
            startedAt: like('2024-01-15T10:30:00.000Z'),
            data: {
              resultData: {
                error: {
                  message: like('Research Agent failed: API rate limit exceeded'),
                  name: like('WorkflowExecutionError'),
                  node: {
                    name: 'Research Agent',
                    type: 'n8n-nodes-smmarchitect.researchAgent'
                  },
                  timestamp: like('2024-01-15T10:32:15.000Z'),
                  stack: like('WorkflowExecutionError: Research Agent failed...')
                },
                runData: {
                  'Research Agent': eachLike({
                    error: {
                      message: like('API rate limit exceeded'),
                      timestamp: like('2024-01-15T10:32:15.000Z'),
                      httpCode: like('429')
                    }
                  })
                }
              }
            }
          }
        }
      });

      const response = await n8nClient.getExecutionStatus('exec-failed-001');

      expect(response.status).toBe('error');
      expect(response.finished).toBe(true);
      expect(response.data.resultData.error).toBeDefined();
      expect(response.data.resultData.error.message).toContain('rate limit exceeded');
    });
  });

  describe('Workflow Management', () => {
    it('should create new workflow from template', async () => {
      await pact.addInteraction({
        state: 'workflow template is available for creation',
        uponReceiving: 'a request to create workflow from template',
        withRequest: {
          method: 'POST',
          path: '/api/v1/workflows',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-n8n-api-key'
          },
          body: {
            name: 'ICB Labs Campaign Workflow',
            templateId: 'template-campaign-automation',
            workspaceId: 'ws-icblabs-001',
            settings: {
              timezone: 'America/New_York',
              saveDataErrorExecution: 'all',
              saveDataSuccessExecution: 'all'
            },
            parameters: {
              brandVoice: 'professional-technical',
              targetAudience: 'B2B-executives',
              contentFrequency: 'daily',
              primaryChannel: 'linkedin'
            }
          }
        },
        willRespondWith: {
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            workflowId: like('wf-icblabs-campaign-001'),
            name: 'ICB Labs Campaign Workflow',
            active: false,
            createdAt: like('2024-01-15T10:30:00.000Z'),
            updatedAt: like('2024-01-15T10:30:00.000Z'),
            nodes: eachLike({
              id: like('research-node-001'),
              name: like('Research Agent'),
              type: like('n8n-nodes-smmarchitect.researchAgent'),
              position: like([250, 300]),
              parameters: like({
                workspaceId: 'ws-icblabs-001',
                topic: '{{ $json.campaignConfig.topic }}',
                brandVoice: 'professional-technical'
              })
            }),
            connections: like({
              'Research Agent': {
                main: eachLike([
                  {
                    node: 'Creative Agent',
                    type: 'main',
                    index: 0
                  }
                ])
              }
            }),
            settings: {
              timezone: 'America/New_York',
              saveDataErrorExecution: 'all',
              saveDataSuccessExecution: 'all'
            }
          }
        }
      });

      const response = await n8nClient.createWorkflow({
        name: 'ICB Labs Campaign Workflow',
        templateId: 'template-campaign-automation',
        workspaceId: 'ws-icblabs-001',
        settings: {
          timezone: 'America/New_York',
          saveDataErrorExecution: 'all',
          saveDataSuccessExecution: 'all'
        },
        parameters: {
          brandVoice: 'professional-technical',
          targetAudience: 'B2B-executives',
          contentFrequency: 'daily',
          primaryChannel: 'linkedin'
        }
      });

      expect(response.workflowId).toBeDefined();
      expect(response.name).toBe('ICB Labs Campaign Workflow');
      expect(response.active).toBe(false);
      expect(response.nodes).toBeDefined();
      expect(response.connections).toBeDefined();
    });

    it('should activate workflow for scheduled execution', async () => {
      await pact.addInteraction({
        state: 'workflow exists and is inactive',
        uponReceiving: 'a request to activate workflow',
        withRequest: {
          method: 'PATCH',
          path: '/api/v1/workflows/wf-icblabs-campaign-001/activate',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-n8n-api-key'
          },
          body: {
            active: true,
            schedule: {
              cronExpression: '0 9 * * 1-5', // Weekdays at 9 AM
              timezone: 'America/New_York'
            }
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            workflowId: 'wf-icblabs-campaign-001',
            active: true,
            schedule: {
              cronExpression: '0 9 * * 1-5',
              timezone: 'America/New_York',
              nextExecutionTime: like('2024-01-16T14:00:00.000Z')
            },
            updatedAt: like('2024-01-15T10:30:00.000Z')
          }
        }
      });

      const response = await n8nClient.activateWorkflow('wf-icblabs-campaign-001', {
        active: true,
        schedule: {
          cronExpression: '0 9 * * 1-5',
          timezone: 'America/New_York'
        }
      });

      expect(response.workflowId).toBe('wf-icblabs-campaign-001');
      expect(response.active).toBe(true);
      expect(response.schedule.nextExecutionTime).toBeDefined();
    });
  });

  describe('Webhook Integration', () => {
    it('should handle webhook trigger for workflow execution', async () => {
      await pact.addInteraction({
        state: 'workflow is configured with webhook trigger',
        uponReceiving: 'a webhook trigger request',
        withRequest: {
          method: 'POST',
          path: '/webhook/campaign-trigger/ws-icblabs-001',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SMM-Architect/1.0'
          },
          body: {
            triggerType: 'scheduled',
            workspaceId: 'ws-icblabs-001',
            campaignId: 'camp-daily-ai-insights',
            payload: {
              topic: 'AI marketing automation trends',
              urgency: 'normal',
              targetAudience: 'marketing-professionals',
              scheduledTime: '2024-01-15T14:00:00Z'
            }
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            received: true,
            executionId: like('exec-webhook-001'),
            workflowId: like('wf-icblabs-campaign-001'),
            triggeredAt: like('2024-01-15T14:00:00.000Z'),
            status: 'triggered'
          }
        }
      });

      const response = await n8nClient.triggerWorkflowWebhook(
        'campaign-trigger',
        'ws-icblabs-001',
        {
          triggerType: 'scheduled',
          workspaceId: 'ws-icblabs-001',
          campaignId: 'camp-daily-ai-insights',
          payload: {
            topic: 'AI marketing automation trends',
            urgency: 'normal',
            targetAudience: 'marketing-professionals',
            scheduledTime: '2024-01-15T14:00:00Z'
          }
        }
      );

      expect(response.received).toBe(true);
      expect(response.executionId).toBeDefined();
      expect(response.status).toBe('triggered');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid workflow ID', async () => {
      await pact.addInteraction({
        state: 'workflow does not exist',
        uponReceiving: 'a request for non-existent workflow',
        withRequest: {
          method: 'GET',
          path: '/api/v1/workflows/non-existent-workflow',
          headers: {
            'X-N8N-API-KEY': 'test-n8n-api-key'
          }
        },
        willRespondWith: {
          status: 404,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow with ID "non-existent-workflow" not found',
            timestamp: like('2024-01-15T10:30:00.000Z')
          }
        }
      });

      await expect(
        n8nClient.getWorkflow('non-existent-workflow')
      ).rejects.toThrow('Workflow with ID "non-existent-workflow" not found');
    });

    it('should handle rate limiting', async () => {
      await pact.addInteraction({
        state: 'API rate limit has been exceeded',
        uponReceiving: 'a request when rate limit is exceeded',
        withRequest: {
          method: 'POST',
          path: '/api/v1/workflows/executions',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-n8n-api-key'
          },
          body: like({
            workflowId: 'wf-test-001'
          })
        },
        willRespondWith: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '300'
          },
          body: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many workflow executions. Please try again in 5 minutes.',
            retryAfter: 300,
            timestamp: like('2024-01-15T10:30:00.000Z')
          }
        }
      });

      await expect(
        n8nClient.executeWorkflow({
          workflowId: 'wf-test-001',
          data: {},
          runMode: 'trigger'
        })
      ).rejects.toThrow('Too many workflow executions');
    });

    it('should handle invalid API key', async () => {
      await pact.addInteraction({
        state: 'API key is invalid or expired',
        uponReceiving: 'a request with invalid API key',
        withRequest: {
          method: 'GET',
          path: '/api/v1/workflows',
          headers: {
            'X-N8N-API-KEY': 'invalid-api-key'
          }
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            code: 'UNAUTHORIZED',
            message: 'Invalid API key provided',
            timestamp: like('2024-01-15T10:30:00.000Z')
          }
        }
      });

      const invalidClient = new N8nWorkflowClient({
        baseUrl: 'http://localhost:1235',
        apiKey: 'invalid-api-key',
        timeout: 30000
      });

      await expect(
        invalidClient.getWorkflows()
      ).rejects.toThrow('Invalid API key provided');
    });
  });
});