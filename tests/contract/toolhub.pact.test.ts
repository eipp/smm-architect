import { describe, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Pact, Matchers } from '@pact-foundation/pact';
import path from 'path';
import { ToolHubClient } from '../../services/smm-architect/src/clients/toolhub-client';

const { like, eachLike, term, somethingLike } = Matchers;

describe('ToolHub API Contract Tests', () => {
  let pact: Pact;
  let toolHubClient: ToolHubClient;

  beforeAll(async () => {
    pact = new Pact({
      consumer: 'smm-architect',
      provider: 'toolhub',
      port: 1234,
      log: path.resolve(process.cwd(), 'logs', 'pact.log'),
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'INFO',
      spec: 3
    });

    await pact.setup();
    
    // Initialize ToolHub client pointing to mock server
    toolHubClient = new ToolHubClient({
      baseUrl: 'http://localhost:1234',
      apiKey: 'test-vault-token',
      timeout: 5000
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

  describe('Vector Search Endpoint', () => {
    it('should return search results for valid query', async () => {
      await pact.addInteraction({
        state: 'vector database has indexed content for workspace ws-test-001',
        uponReceiving: 'a vector search request with valid parameters',
        withRequest: {
          method: 'POST',
          path: '/vector/search',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            query: 'brand voice guidelines',
            topK: 10
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            results: eachLike({
              sourceId: like('src-brand-guide-001'),
              score: like(0.92),
              content: like('Our brand voice is professional yet approachable...'),
              metadata: like({
                title: 'Brand Voice Guidelines',
                author: 'Marketing Team',
                source: 'brand-guidelines.pdf'
              }),
              spanStart: like(0),
              spanEnd: like(256)
            }),
            totalFound: like(15),
            queryTime: like(0.045)
          }
        }
      });

      const response = await toolHubClient.vectorSearch({
        workspaceId: 'ws-test-001',
        query: 'brand voice guidelines',
        topK: 10
      });

      expect(response.results).toBeDefined();
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results[0]).toHaveProperty('sourceId');
      expect(response.results[0]).toHaveProperty('score');
      expect(response.results[0]).toHaveProperty('content');
      expect(response.queryTime).toBeDefined();
    });

    it('should handle search with filters', async () => {
      await pact.addInteraction({
        state: 'vector database has content with various source types',
        uponReceiving: 'a vector search request with filters',
        withRequest: {
          method: 'POST',
          path: '/vector/search',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            query: 'marketing strategy',
            topK: 5,
            filters: {
              sourceTypes: ['pdf', 'webpage'],
              dateRange: {
                from: '2024-01-01T00:00:00Z',
                to: '2024-12-31T23:59:59Z'
              }
            }
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            results: eachLike({
              sourceId: like('src-strategy-doc-001'),
              score: like(0.87),
              content: like('Our 2024 marketing strategy focuses on...'),
              metadata: like({
                sourceType: 'pdf',
                publishedAt: '2024-01-15T10:00:00Z'
              })
            }),
            totalFound: like(8),
            queryTime: like(0.052)
          }
        }
      });

      const response = await toolHubClient.vectorSearch({
        workspaceId: 'ws-test-001',
        query: 'marketing strategy',
        topK: 5,
        filters: {
          sourceTypes: ['pdf', 'webpage'],
          dateRange: {
            from: '2024-01-01T00:00:00Z',
            to: '2024-12-31T23:59:59Z'
          }
        }
      });

      expect(response.results).toBeDefined();
      expect(response.totalFound).toBeDefined();
    });

    it('should return empty results for no matches', async () => {
      await pact.addInteraction({
        state: 'vector database has no matching content',
        uponReceiving: 'a vector search request with no matching content',
        withRequest: {
          method: 'POST',
          path: '/vector/search',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            query: 'nonexistent topic xyz123',
            topK: 10
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            results: [],
            totalFound: 0,
            queryTime: like(0.023)
          }
        }
      });

      const response = await toolHubClient.vectorSearch({
        workspaceId: 'ws-test-001',
        query: 'nonexistent topic xyz123',
        topK: 10
      });

      expect(response.results).toEqual([]);
      expect(response.totalFound).toBe(0);
    });

    it('should handle rate limiting with 429 status', async () => {
      await pact.addInteraction({
        state: 'rate limit has been exceeded for workspace',
        uponReceiving: 'a vector search request when rate limited',
        withRequest: {
          method: 'POST',
          path: '/vector/search',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            query: 'any query',
            topK: 10
          }
        },
        willRespondWith: {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60'
          },
          body: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Try again in 60 seconds.',
            traceId: like('req-12345')
          }
        }
      });

      await expect(
        toolHubClient.vectorSearch({
          workspaceId: 'ws-test-001',
          query: 'any query',
          topK: 10
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Simulation Endpoint', () => {
    it('should execute workflow simulation successfully', async () => {
      await pact.addInteraction({
        state: 'workspace has valid configuration for simulation',
        uponReceiving: 'a simulation request with valid workflow',
        withRequest: {
          method: 'POST',
          path: '/simulate',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            workflowJson: {
              nodes: [
                {
                  id: 'research-node',
                  type: 'research-agent',
                  config: { topic: 'AI trends' }
                },
                {
                  id: 'creative-node',
                  type: 'creative-agent',
                  config: { format: 'linkedin-post' }
                }
              ]
            },
            dryRun: true,
            iterations: 1000,
            randomSeed: 42
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            simulationId: like('sim-12345'),
            readinessScore: like(0.847),
            policyPassPct: like(0.923),
            citationCoverage: like(0.834),
            duplicationRisk: like(0.156),
            costEstimateUSD: like(1247.32),
            traces: eachLike({
              nodeId: like('research-node'),
              status: like('ok'),
              durationMs: like(1234),
              message: like('Research completed successfully'),
              metadata: like({
                sourcesFound: 15,
                qualityScore: 0.89
              })
            }),
            confidence: {
              interval: {
                lower: like(0.832),
                upper: like(0.862)
              },
              level: like(0.95)
            }
          }
        }
      });

      const response = await toolHubClient.simulate({
        workspaceId: 'ws-test-001',
        workflowJson: {
          nodes: [
            {
              id: 'research-node',
              type: 'research-agent',
              config: { topic: 'AI trends' }
            },
            {
              id: 'creative-node',
              type: 'creative-agent',
              config: { format: 'linkedin-post' }
            }
          ]
        },
        dryRun: true,
        iterations: 1000,
        randomSeed: 42
      });

      expect(response.simulationId).toBeDefined();
      expect(response.readinessScore).toBeGreaterThanOrEqual(0);
      expect(response.readinessScore).toBeLessThanOrEqual(1);
      expect(response.traces).toBeDefined();
      expect(response.confidence).toBeDefined();
    });

    it('should handle simulation timeout', async () => {
      await pact.addInteraction({
        state: 'simulation will exceed timeout threshold',
        uponReceiving: 'a simulation request that times out',
        withRequest: {
          method: 'POST',
          path: '/simulate',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            workflowJson: {
              nodes: [
                {
                  id: 'slow-node',
                  type: 'research-agent',
                  config: { topic: 'very complex research' }
                }
              ]
            },
            iterations: 10000 // Very high iteration count
          }
        },
        willRespondWith: {
          status: 408,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            code: 'SIMULATION_TIMEOUT',
            message: 'Simulation exceeded maximum execution time',
            traceId: like('req-timeout-123')
          }
        }
      });

      await expect(
        toolHubClient.simulate({
          workspaceId: 'ws-test-001',
          workflowJson: {
            nodes: [
              {
                id: 'slow-node',
                type: 'research-agent',
                config: { topic: 'very complex research' }
              }
            ]
          },
          iterations: 10000
        })
      ).rejects.toThrow('Simulation exceeded maximum execution time');
    });
  });

  describe('Content Ingestion Endpoint', () => {
    it('should ingest URL source successfully', async () => {
      await pact.addInteraction({
        state: 'URL is accessible and contains valid content',
        uponReceiving: 'a content ingestion request for URL',
        withRequest: {
          method: 'POST',
          path: '/ingest/source',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            sourceType: 'url',
            url: 'https://icblabs.com/about',
            metadata: {
              title: 'About ICB Labs'
            }
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            sourceId: like('src-icblabs-about-001'),
            status: 'ingested',
            extractedFacts: like(47),
            processingTime: like(2.34)
          }
        }
      });

      const response = await toolHubClient.ingestSource({
        workspaceId: 'ws-test-001',
        sourceType: 'url',
        url: 'https://icblabs.com/about',
        metadata: {
          title: 'About ICB Labs'
        }
      });

      expect(response.sourceId).toBeDefined();
      expect(response.status).toBe('ingested');
      expect(response.extractedFacts).toBeGreaterThan(0);
    });

    it('should handle ingestion of invalid URL', async () => {
      await pact.addInteraction({
        state: 'URL is not accessible or invalid',
        uponReceiving: 'a content ingestion request for invalid URL',
        withRequest: {
          method: 'POST',
          path: '/ingest/source',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            sourceType: 'url',
            url: 'https://invalid-domain-xyz123.com/nonexistent'
          }
        },
        willRespondWith: {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            code: 'INVALID_URL',
            message: 'Unable to fetch content from the provided URL',
            details: {
              url: 'https://invalid-domain-xyz123.com/nonexistent',
              error: 'DNS resolution failed'
            },
            traceId: like('req-error-456')
          }
        }
      });

      await expect(
        toolHubClient.ingestSource({
          workspaceId: 'ws-test-001',
          sourceType: 'url',
          url: 'https://invalid-domain-xyz123.com/nonexistent'
        })
      ).rejects.toThrow('Unable to fetch content from the provided URL');
    });
  });

  describe('OAuth Integration Endpoint', () => {
    it('should initiate OAuth flow for LinkedIn', async () => {
      await pact.addInteraction({
        state: 'OAuth provider (LinkedIn) is available',
        uponReceiving: 'an OAuth initiation request for LinkedIn',
        withRequest: {
          method: 'POST',
          path: '/oauth/connect',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-vault-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            provider: 'linkedin',
            redirectUri: 'https://app.smmarchitect.com/oauth/callback',
            scopes: ['r_liteprofile', 'w_member_social']
          }
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            authUrl: term({
              generate: 'https://www.linkedin.com/oauth/v2/authorization?client_id=12345&response_type=code&scope=r_liteprofile%20w_member_social&state=abc123&redirect_uri=https%3A%2F%2Fapp.smmarchitect.com%2Foauth%2Fcallback',
              matcher: 'https://www\\.linkedin\\.com/oauth/v2/authorization\\?.*'
            }),
            state: like('abc123def456'),
            expiresAt: like('2024-01-15T11:00:00Z')
          }
        }
      });

      const response = await toolHubClient.initiateOAuth({
        workspaceId: 'ws-test-001',
        provider: 'linkedin',
        redirectUri: 'https://app.smmarchitect.com/oauth/callback',
        scopes: ['r_liteprofile', 'w_member_social']
      });

      expect(response.authUrl).toMatch(/^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization/);
      expect(response.state).toBeDefined();
      expect(response.expiresAt).toBeDefined();
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      await pact.addInteraction({
        state: 'all services are healthy',
        uponReceiving: 'a health check request',
        withRequest: {
          method: 'GET',
          path: '/health'
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            status: 'healthy',
            timestamp: term({
              generate: '2024-01-15T10:30:00.000Z',
              matcher: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z'
            }),
            version: like('v1.0.0'),
            checks: {
              database: 'healthy',
              vectorDb: 'healthy',
              vault: 'healthy'
            }
          }
        }
      });

      const response = await toolHubClient.healthCheck();

      expect(response.status).toBe('healthy');
      expect(response.checks.database).toBe('healthy');
      expect(response.checks.vectorDb).toBe('healthy');
      expect(response.checks.vault).toBe('healthy');
    });

    it('should return degraded status when some services are down', async () => {
      await pact.addInteraction({
        state: 'vector database is unavailable but other services are healthy',
        uponReceiving: 'a health check request when vector DB is down',
        withRequest: {
          method: 'GET',
          path: '/health'
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            status: 'degraded',
            timestamp: like('2024-01-15T10:30:00.000Z'),
            version: like('v1.0.0'),
            checks: {
              database: 'healthy',
              vectorDb: 'unhealthy',
              vault: 'healthy'
            }
          }
        }
      });

      const response = await toolHubClient.healthCheck();

      expect(response.status).toBe('degraded');
      expect(response.checks.vectorDb).toBe('unhealthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      await pact.addInteraction({
        state: 'request has invalid authentication token',
        uponReceiving: 'a request with invalid token',
        withRequest: {
          method: 'POST',
          path: '/vector/search',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid-token'
          },
          body: {
            workspaceId: 'ws-test-001',
            query: 'test query'
          }
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            traceId: like('req-unauth-789')
          }
        }
      });

      const invalidClient = new ToolHubClient({
        baseUrl: 'http://localhost:1234',
        apiKey: 'invalid-token',
        timeout: 5000
      });

      await expect(
        invalidClient.vectorSearch({
          workspaceId: 'ws-test-001',
          query: 'test query'
        })
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});