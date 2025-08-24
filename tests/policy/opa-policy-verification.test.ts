import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface OPATestCase {
  name: string;
  input: any;
  expectedResult: {
    allow: boolean;
    deny?: string[];
    warnings?: string[];
    reasons?: string[];
  };
  description: string;
}

interface PolicyTestSuite {
  policyName: string;
  policyPath: string;
  testCases: OPATestCase[];
}

describe('OPA Policy Verification Framework', () => {
  let policyDir: string;
  let tempDir: string;

  beforeAll(async () => {
    // Setup test environment
    policyDir = path.join(__dirname, '../../services/policy');
    tempDir = path.join(__dirname, '../tmp/opa-tests');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    // Verify OPA is available
    try {
      execSync('opa version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('OPA is not installed or not in PATH. Install OPA to run policy tests.');
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  const runOPAEval = async (policyPath: string, input: any, query: string = 'data.smm.allow'): Promise<any> => {
    const inputFile = path.join(tempDir, `input-${Date.now()}-${Math.random()}.json`);
    
    try {
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
      const result = execSync(
        `opa eval -d "${policyPath}" -i "${inputFile}" "${query}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const output = JSON.parse(result);
      return output.result;
    } finally {
      try {
        await fs.unlink(inputFile);
      } catch {}
    }
  };

  const runOPATest = async (policyPath: string, input: any): Promise<{
    allow: boolean;
    deny: string[];
    warnings: string[];
    reasons: string[];
  }> => {
    const results = await Promise.all([
      runOPAEval(policyPath, input, 'data.smm.allow'),
      runOPAEval(policyPath, input, 'data.smm.deny'),
      runOPAEval(policyPath, input, 'data.smm.warnings'),
      runOPAEval(policyPath, input, 'data.smm.reasons')
    ]);

    return {
      allow: results[0] === true,
      deny: Array.isArray(results[1]) ? results[1] : [],
      warnings: Array.isArray(results[2]) ? results[2] : [],
      reasons: Array.isArray(results[3]) ? results[3] : []
    };
  };

  describe('Consent Policy Verification', () => {
    const consentTestSuite: PolicyTestSuite = {
      policyName: 'consent_policies',
      policyPath: path.join(policyDir, 'consent_rules.rego'),
      testCases: [
        {
          name: 'Valid voice likeness consent',
          description: 'Should allow workflow with valid voice likeness consent',
          input: {
            workspace: {
              workspaceId: 'ws-test-001',
              consentRecords: [
                {
                  consentId: 'voice-consent-001',
                  type: 'voice_likeness',
                  grantedBy: 'user-123',
                  grantedAt: '2024-01-01T00:00:00Z',
                  expiresAt: '2025-01-01T00:00:00Z'
                }
              ]
            },
            workflow: [
              {
                type: 'creative',
                config: {
                  uses_synthetic_voice: true,
                  voice_model: 'user-123-voice-v1'
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: []
          }
        },
        {
          name: 'Missing voice consent',
          description: 'Should deny workflow requiring voice consent when none provided',
          input: {
            workspace: {
              workspaceId: 'ws-test-002',
              consentRecords: []
            },
            workflow: [
              {
                type: 'creative',
                config: {
                  uses_synthetic_voice: true,
                  voice_model: 'user-456-voice-v1'
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['missing_voice_consent'],
            warnings: []
          }
        },
        {
          name: 'Expired voice consent',
          description: 'Should deny workflow with expired voice consent',
          input: {
            workspace: {
              workspaceId: 'ws-test-003',
              consentRecords: [
                {
                  consentId: 'voice-consent-expired',
                  type: 'voice_likeness',
                  grantedBy: 'user-789',
                  grantedAt: '2023-01-01T00:00:00Z',
                  expiresAt: '2024-01-01T00:00:00Z' // Expired
                }
              ]
            },
            workflow: [
              {
                type: 'creative',
                config: {
                  uses_synthetic_voice: true,
                  voice_model: 'user-789-voice-v1'
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['expired_voice_consent'],
            warnings: []
          }
        },
        {
          name: 'Valid UGC license',
          description: 'Should allow workflow with valid UGC license',
          input: {
            workspace: {
              workspaceId: 'ws-test-004',
              consentRecords: [
                {
                  consentId: 'ugc-license-001',
                  type: 'ugc_license',
                  grantedBy: 'user-123',
                  grantedAt: '2024-01-01T00:00:00Z',
                  expiresAt: '2025-01-01T00:00:00Z'
                }
              ]
            },
            workflow: [
              {
                type: 'creative',
                config: {
                  requires_ugc: true,
                  ugc_sources: ['user_posts', 'user_images']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: []
          }
        },
        {
          name: 'Near-expiring consent warning',
          description: 'Should warn when consent expires within 30 days',
          input: {
            workspace: {
              workspaceId: 'ws-test-005',
              consentRecords: [
                {
                  consentId: 'voice-consent-near-expiry',
                  type: 'voice_likeness',
                  grantedBy: 'user-123',
                  grantedAt: '2024-01-01T00:00:00Z',
                  expiresAt: '2024-07-10T00:00:00Z' // Expires in 25 days
                }
              ]
            },
            workflow: [
              {
                type: 'creative',
                config: {
                  uses_synthetic_voice: true
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: ['consent_expiring_soon']
          }
        }
      ]
    };

    consentTestSuite.testCases.forEach(testCase => {
      it(testCase.name, async () => {
        const result = await runOPATest(consentTestSuite.policyPath, testCase.input);
        
        expect(result.allow).toBe(testCase.expectedResult.allow);
        
        if (testCase.expectedResult.deny) {
          expect(result.deny).toEqual(expect.arrayContaining(testCase.expectedResult.deny));
        }
        
        if (testCase.expectedResult.warnings) {
          expect(result.warnings).toEqual(expect.arrayContaining(testCase.expectedResult.warnings));
        }
      }, 30000);
    });
  });

  describe('Budget Policy Verification', () => {
    const budgetTestSuite: PolicyTestSuite = {
      policyName: 'budget_policies',
      policyPath: path.join(policyDir, 'budget_rules.rego'),
      testCases: [
        {
          name: 'Within weekly budget cap',
          description: 'Should allow workflow within weekly budget limits',
          input: {
            workspace: {
              workspaceId: 'ws-budget-001',
              budget: {
                currency: 'USD',
                weeklyCap: 1000,
                hardCap: 5000
              }
            },
            workflow: [
              {
                type: 'creative',
                estimatedCost: 250
              },
              {
                type: 'publish',
                estimatedCost: 150
              }
            ],
            currentSpend: {
              thisWeek: 300,
              total: 1200
            },
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: []
          }
        },
        {
          name: 'Exceeds weekly budget cap',
          description: 'Should deny workflow that exceeds weekly budget',
          input: {
            workspace: {
              workspaceId: 'ws-budget-002',
              budget: {
                currency: 'USD',
                weeklyCap: 1000,
                hardCap: 5000
              }
            },
            workflow: [
              {
                type: 'creative',
                estimatedCost: 800
              }
            ],
            currentSpend: {
              thisWeek: 850,
              total: 2100
            },
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['weekly_budget_exceeded'],
            warnings: []
          }
        },
        {
          name: 'Exceeds hard cap',
          description: 'Should deny workflow that exceeds hard budget cap',
          input: {
            workspace: {
              workspaceId: 'ws-budget-003',
              budget: {
                currency: 'USD',
                weeklyCap: 1000,
                hardCap: 5000
              }
            },
            workflow: [
              {
                type: 'creative',
                estimatedCost: 500
              }
            ],
            currentSpend: {
              thisWeek: 200,
              total: 4800
            },
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['hard_budget_exceeded'],
            warnings: []
          }
        },
        {
          name: 'Budget warning threshold',
          description: 'Should warn when approaching budget limits',
          input: {
            workspace: {
              workspaceId: 'ws-budget-004',
              budget: {
                currency: 'USD',
                weeklyCap: 1000,
                hardCap: 5000
              }
            },
            workflow: [
              {
                type: 'creative',
                estimatedCost: 100
              }
            ],
            currentSpend: {
              thisWeek: 850, // 85% of weekly cap after workflow
              total: 2400   // 48% of hard cap
            },
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: ['approaching_weekly_limit']
          }
        },
        {
          name: 'Multi-currency validation',
          description: 'Should handle different currencies appropriately',
          input: {
            workspace: {
              workspaceId: 'ws-budget-005',
              budget: {
                currency: 'EUR',
                weeklyCap: 900,
                hardCap: 4500
              }
            },
            workflow: [
              {
                type: 'creative',
                estimatedCost: 200,
                currency: 'EUR'
              }
            ],
            currentSpend: {
              thisWeek: 400,
              total: 1800,
              currency: 'EUR'
            },
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: []
          }
        }
      ]
    };

    budgetTestSuite.testCases.forEach(testCase => {
      it(testCase.name, async () => {
        const result = await runOPATest(budgetTestSuite.policyPath, testCase.input);
        
        expect(result.allow).toBe(testCase.expectedResult.allow);
        
        if (testCase.expectedResult.deny) {
          expect(result.deny).toEqual(expect.arrayContaining(testCase.expectedResult.deny));
        }
        
        if (testCase.expectedResult.warnings) {
          expect(result.warnings).toEqual(expect.arrayContaining(testCase.expectedResult.warnings));
        }
      }, 30000);
    });
  });

  describe('Connector Policy Verification', () => {
    const connectorTestSuite: PolicyTestSuite = {
      policyName: 'connector_policies',
      policyPath: path.join(policyDir, 'connector_rules.rego'),
      testCases: [
        {
          name: 'All required connectors available',
          description: 'Should allow workflow when all required connectors are connected',
          input: {
            workspace: {
              workspaceId: 'ws-connector-001',
              primaryChannels: ['linkedin', 'x'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-001',
                  status: 'connected',
                  lastHealthCheck: '2024-06-15T09:30:00Z',
                  healthStatus: 'healthy'
                },
                {
                  platform: 'x',
                  connectorId: 'conn-x-001',
                  status: 'connected',
                  lastHealthCheck: '2024-06-15T09:30:00Z',
                  healthStatus: 'healthy'
                }
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin', 'x']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: []
          }
        },
        {
          name: 'Missing required connector',
          description: 'Should deny workflow when required connector is missing',
          input: {
            workspace: {
              workspaceId: 'ws-connector-002',
              primaryChannels: ['linkedin', 'x'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-002',
                  status: 'connected',
                  lastHealthCheck: '2024-06-15T09:30:00Z',
                  healthStatus: 'healthy'
                }
                // Missing X connector
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin', 'x']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['missing_connector_x'],
            warnings: []
          }
        },
        {
          name: 'Degraded connector warning',
          description: 'Should warn when connector is degraded but allow workflow',
          input: {
            workspace: {
              workspaceId: 'ws-connector-003',
              primaryChannels: ['linkedin'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-003',
                  status: 'connected',
                  lastHealthCheck: '2024-06-15T09:30:00Z',
                  healthStatus: 'degraded',
                  degradationReason: 'rate_limited'
                }
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: ['connector_degraded_linkedin']
          }
        },
        {
          name: 'Revoked connector access',
          description: 'Should deny workflow when connector access is revoked',
          input: {
            workspace: {
              workspaceId: 'ws-connector-004',
              primaryChannels: ['linkedin'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-004',
                  status: 'revoked',
                  lastHealthCheck: '2024-06-15T08:00:00Z',
                  healthStatus: 'unhealthy',
                  revokedAt: '2024-06-15T08:15:00Z',
                  revokedReason: 'user_action'
                }
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: false,
            deny: ['connector_revoked_linkedin'],
            warnings: []
          }
        },
        {
          name: 'Stale health check warning',
          description: 'Should warn when connector health check is stale',
          input: {
            workspace: {
              workspaceId: 'ws-connector-005',
              primaryChannels: ['linkedin'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-005',
                  status: 'connected',
                  lastHealthCheck: '2024-06-14T10:00:00Z', // 24 hours ago
                  healthStatus: 'healthy'
                }
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin']
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: ['stale_health_check_linkedin']
          }
        },
        {
          name: 'Fallback channel availability',
          description: 'Should handle fallback channels when primary is unavailable',
          input: {
            workspace: {
              workspaceId: 'ws-connector-006',
              primaryChannels: ['linkedin', 'x'],
              fallbackChannels: ['instagram'],
              connectors: [
                {
                  platform: 'linkedin',
                  connectorId: 'conn-li-006',
                  status: 'connected',
                  healthStatus: 'healthy'
                },
                {
                  platform: 'x',
                  connectorId: 'conn-x-006',
                  status: 'error',
                  healthStatus: 'unhealthy'
                },
                {
                  platform: 'instagram',
                  connectorId: 'conn-ig-006',
                  status: 'connected',
                  healthStatus: 'healthy'
                }
              ]
            },
            workflow: [
              {
                type: 'publish',
                config: {
                  channels: ['linkedin', 'x'],
                  allowFallback: true
                }
              }
            ],
            timestamp: '2024-06-15T10:00:00Z'
          },
          expectedResult: {
            allow: true,
            deny: [],
            warnings: ['using_fallback_channel_instagram']
          }
        }
      ]
    };

    connectorTestSuite.testCases.forEach(testCase => {
      it(testCase.name, async () => {
        const result = await runOPATest(connectorTestSuite.policyPath, testCase.input);
        
        expect(result.allow).toBe(testCase.expectedResult.allow);
        
        if (testCase.expectedResult.deny) {
          expect(result.deny).toEqual(expect.arrayContaining(testCase.expectedResult.deny));
        }
        
        if (testCase.expectedResult.warnings) {
          expect(result.warnings).toEqual(expect.arrayContaining(testCase.expectedResult.warnings));
        }
      }, 30000);
    });
  });

  describe('Cross-Policy Integration Tests', () => {
    it('should handle multiple policy violations simultaneously', async () => {
      const complexInput = {
        workspace: {
          workspaceId: 'ws-complex-001',
          budget: {
            currency: 'USD',
            weeklyCap: 1000,
            hardCap: 5000
          },
          primaryChannels: ['linkedin', 'x'],
          connectors: [
            {
              platform: 'linkedin',
              status: 'revoked'
            }
            // Missing X connector
          ],
          consentRecords: [
            {
              type: 'voice_likeness',
              expiresAt: '2024-01-01T00:00:00Z' // Expired
            }
          ]
        },
        workflow: [
          {
            type: 'creative',
            config: {
              uses_synthetic_voice: true
            },
            estimatedCost: 1200 // Exceeds weekly cap
          }
        ],
        currentSpend: {
          thisWeek: 800,
          total: 2000
        },
        timestamp: '2024-06-15T10:00:00Z'
      };

      const mainPolicyPath = path.join(policyDir, 'main_rules.rego');
      const result = await runOPATest(mainPolicyPath, complexInput);

      expect(result.allow).toBe(false);
      expect(result.deny).toEqual(expect.arrayContaining([
        'weekly_budget_exceeded',
        'connector_revoked_linkedin',
        'missing_connector_x',
        'expired_voice_consent'
      ]));
    }, 45000);

    it('should prioritize security violations over other policies', async () => {
      const securityViolationInput = {
        workspace: {
          workspaceId: 'ws-security-001',
          securityLevel: 'high',
          dataClassification: 'confidential'
        },
        workflow: [
          {
            type: 'publish',
            config: {
              includeCustomerData: true,
              publicVisibility: true // Security violation
            }
          }
        ],
        timestamp: '2024-06-15T10:00:00Z'
      };

      const mainPolicyPath = path.join(policyDir, 'main_rules.rego');
      const result = await runOPATest(mainPolicyPath, securityViolationInput);

      expect(result.allow).toBe(false);
      expect(result.deny).toContain('security_violation_public_confidential_data');
    }, 30000);
  });

  describe('Policy Performance Tests', () => {
    it('should evaluate policies within acceptable time limits', async () => {
      const largeInput = {
        workspace: {
          workspaceId: 'ws-perf-001',
          connectors: Array.from({ length: 50 }, (_, i) => ({
            platform: `platform-${i}`,
            status: 'connected',
            healthStatus: 'healthy'
          })),
          consentRecords: Array.from({ length: 100 }, (_, i) => ({
            consentId: `consent-${i}`,
            type: i % 2 === 0 ? 'voice_likeness' : 'ugc_license',
            grantedAt: '2024-01-01T00:00:00Z',
            expiresAt: '2025-01-01T00:00:00Z'
          }))
        },
        workflow: Array.from({ length: 20 }, (_, i) => ({
          type: 'creative',
          config: {
            uses_synthetic_voice: i % 3 === 0,
            requires_ugc: i % 4 === 0
          }
        })),
        timestamp: '2024-06-15T10:00:00Z'
      };

      const startTime = Date.now();
      const mainPolicyPath = path.join(policyDir, 'main_rules.rego');
      const result = await runOPATest(mainPolicyPath, largeInput);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result).toBeDefined();
      expect(typeof result.allow).toBe('boolean');
    }, 10000);
  });
});