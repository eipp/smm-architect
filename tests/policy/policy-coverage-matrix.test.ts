import { describe, it, expect, beforeAll } from '@jest/globals';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

interface PolicyCombination {
  name: string;
  description: string;
  input: any;
  expectedAllow: boolean;
  expectedDeny: string[];
  expectedWarnings: string[];
  policyRules: {
    consent: boolean;
    budget: boolean;
    connector: boolean;
    security: boolean;
  };
}

interface CoverageMatrix {
  [key: string]: PolicyCombination[];
}

describe('Policy Coverage Matrix - All Combinations', () => {
  let policyDir: string;
  let tempDir: string;

  beforeAll(async () => {
    policyDir = path.join(__dirname, '../../services/policy');
    tempDir = path.join(__dirname, '../tmp/coverage-tests');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    // Verify OPA is available
    try {
      execSync('opa version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('OPA is not installed. Install OPA to run policy coverage tests.');
    }
  });

  const runPolicyTest = async (input: any): Promise<{
    allow: boolean;
    deny: string[];
    warnings: string[];
    reasons: string[];
  }> => {
    const inputFile = path.join(tempDir, `coverage-input-${Date.now()}-${Math.random()}.json`);
    const mainPolicyPath = path.join(policyDir, 'main_rules.rego');
    
    try {
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
      const [allowResult, denyResult, warningsResult, reasonsResult] = await Promise.all([
        execSync(`opa eval -d "${policyDir}" -i "${inputFile}" "data.smm.allow"`, { encoding: 'utf-8', stdio: 'pipe' }),
        execSync(`opa eval -d "${policyDir}" -i "${inputFile}" "data.smm.deny"`, { encoding: 'utf-8', stdio: 'pipe' }),
        execSync(`opa eval -d "${policyDir}" -i "${inputFile}" "data.smm.warnings"`, { encoding: 'utf-8', stdio: 'pipe' }),
        execSync(`opa eval -d "${policyDir}" -i "${inputFile}" "data.smm.reasons"`, { encoding: 'utf-8', stdio: 'pipe' })
      ]);

      return {
        allow: JSON.parse(allowResult).result === true,
        deny: JSON.parse(denyResult).result || [],
        warnings: JSON.parse(warningsResult).result || [],
        reasons: JSON.parse(reasonsResult).result || []
      };
    } finally {
      try {
        await fs.unlink(inputFile);
      } catch {}
    }
  };

  // Define base test scenarios for each policy dimension
  const baseWorkspace = {
    workspaceId: 'ws-coverage-test',
    tenantId: 'coverage-tenant',
    securityLevel: 'standard',
    dataClassification: 'internal',
    region: 'US'
  };

  const baseWorkflow = [
    {
      type: 'creative',
      estimatedCost: 200
    }
  ];

  const baseContext = {
    currentSpend: { thisWeek: 300, total: 1200 },
    timestamp: '2024-06-15T10:00:00Z'
  };

  // Policy Coverage Matrix - All 16 combinations (2^4)
  const coverageMatrix: CoverageMatrix = {
    'all_allow': [
      {
        name: 'All policies allow (TTTT)',
        description: 'Perfect scenario - all policies should allow',
        policyRules: { consent: true, budget: true, connector: true, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: baseWorkflow,
          ...baseContext
        },
        expectedAllow: true,
        expectedDeny: [],
        expectedWarnings: []
      }
    ],

    'consent_deny': [
      {
        name: 'Consent denies, others allow (FTTT)',
        description: 'Missing voice consent should deny while others allow',
        policyRules: { consent: false, budget: true, connector: true, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: { uses_synthetic_voice: true },
              estimatedCost: 200
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['missing_voice_consent'],
        expectedWarnings: []
      }
    ],

    'budget_deny': [
      {
        name: 'Budget denies, others allow (TFTT)',
        description: 'Exceeding budget should deny while others allow',
        policyRules: { consent: true, budget: false, connector: true, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              estimatedCost: 800  // Would exceed weekly cap
            }
          ],
          currentSpend: { thisWeek: 900, total: 2000 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: ['weekly_budget_exceeded'],
        expectedWarnings: []
      }
    ],

    'connector_deny': [
      {
        name: 'Connector denies, others allow (TTFT)',
        description: 'Missing/revoked connector should deny while others allow',
        policyRules: { consent: true, budget: true, connector: false, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin', 'x'],
            connectors: [{
              platform: 'linkedin',
              status: 'revoked',
              healthStatus: 'unhealthy',
              lastHealthCheck: '2024-06-15T08:00:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'publish',
              config: { channels: ['linkedin', 'x'] },
              estimatedCost: 150
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['connector_revoked_linkedin', 'missing_connector_x'],
        expectedWarnings: []
      }
    ],

    'security_deny': [
      {
        name: 'Security denies, others allow (TTTF)',
        description: 'Security violation should deny while others allow',
        policyRules: { consent: true, budget: true, connector: true, security: false },
        input: {
          workspace: {
            ...baseWorkspace,
            securityLevel: 'high',
            dataClassification: 'confidential',
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'publish',
              config: {
                includeCustomerData: true,
                publicVisibility: true  // Security violation
              },
              estimatedCost: 200
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['security_violation_public_confidential_data'],
        expectedWarnings: []
      }
    ],

    'consent_budget_deny': [
      {
        name: 'Consent & Budget deny (FFTT)',
        description: 'Both consent and budget violations',
        policyRules: { consent: false, budget: false, connector: true, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 500, hardCap: 2000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: { uses_synthetic_voice: true },
              estimatedCost: 400  // Would exceed budget
            }
          ],
          currentSpend: { thisWeek: 450, total: 1800 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: ['missing_voice_consent', 'weekly_budget_exceeded'],
        expectedWarnings: []
      }
    ],

    'consent_connector_deny': [
      {
        name: 'Consent & Connector deny (FTFT)',
        description: 'Both consent and connector violations',
        policyRules: { consent: false, budget: true, connector: false, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [],  // No connectors
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: { requires_ugc: true },
              estimatedCost: 200
            },
            {
              type: 'publish',
              config: { channels: ['linkedin'] },
              estimatedCost: 100
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['missing_ugc_license', 'missing_connector_linkedin'],
        expectedWarnings: []
      }
    ],

    'consent_security_deny': [
      {
        name: 'Consent & Security deny (FTTF)',
        description: 'Both consent and security violations',
        policyRules: { consent: false, budget: true, connector: true, security: false },
        input: {
          workspace: {
            ...baseWorkspace,
            securityLevel: 'critical',
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: {
                uses_synthetic_voice: true,
                riskyOperation: true
              },
              estimatedCost: 200
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['missing_voice_consent', 'security_breach_risk'],
        expectedWarnings: []
      }
    ],

    'budget_connector_deny': [
      {
        name: 'Budget & Connector deny (TFFT)',
        description: 'Both budget and connector violations',
        policyRules: { consent: true, budget: false, connector: false, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 600, hardCap: 3000 },
            primaryChannels: ['linkedin', 'x'],
            connectors: [{
              platform: 'linkedin',
              status: 'error',
              healthStatus: 'unhealthy',
              lastHealthCheck: '2024-06-15T08:00:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'publish',
              config: { channels: ['linkedin', 'x'] },
              estimatedCost: 500
            }
          ],
          currentSpend: { thisWeek: 550, total: 2800 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: ['weekly_budget_exceeded', 'missing_connector_x'],
        expectedWarnings: []
      }
    ],

    'budget_security_deny': [
      {
        name: 'Budget & Security deny (TFRF)',
        description: 'Both budget and security violations',
        policyRules: { consent: true, budget: false, connector: true, security: false },
        input: {
          workspace: {
            ...baseWorkspace,
            region: 'EU',
            budget: { currency: 'USD', weeklyCap: 400, hardCap: 2000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy',
              lastHealthCheck: '2024-06-15T09:30:00Z'
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: { processesPII: true },
              estimatedCost: 300
            }
          ],
          currentSpend: { thisWeek: 350, total: 1900 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: ['weekly_budget_exceeded', 'regulatory_violation_gdpr'],
        expectedWarnings: []
      }
    ],

    'connector_security_deny': [
      {
        name: 'Connector & Security deny (TTFF)',
        description: 'Both connector and security violations',
        policyRules: { consent: true, budget: true, connector: false, security: false },
        input: {
          workspace: {
            ...baseWorkspace,
            dataClassification: 'confidential',
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'degraded',
              lastHealthCheck: '2024-06-14T10:00:00Z'  // Stale health check
            }],
            consentRecords: []
          },
          workflow: [
            {
              type: 'publish',
              config: {
                channels: ['linkedin'],
                includeCustomerData: true,
                publicVisibility: true
              },
              estimatedCost: 200
            }
          ],
          ...baseContext
        },
        expectedAllow: false,
        expectedDeny: ['data_classification_violation'],
        expectedWarnings: ['connector_degraded_linkedin', 'stale_health_check_linkedin']
      }
    ],

    'triple_deny': [
      {
        name: 'Consent, Budget & Connector deny (FFFT)',
        description: 'Three policy violations simultaneously',
        policyRules: { consent: false, budget: false, connector: false, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 300, hardCap: 1500 },
            primaryChannels: ['linkedin', 'x'],
            connectors: [],
            consentRecords: [
              {
                type: 'voice_likeness',
                grantedBy: 'user-123',
                grantedAt: '2023-01-01T00:00:00Z',
                expiresAt: '2024-01-01T00:00:00Z'  // Expired
              }
            ]
          },
          workflow: [
            {
              type: 'creative',
              config: { uses_synthetic_voice: true },
              estimatedCost: 400
            },
            {
              type: 'publish',
              config: { channels: ['linkedin', 'x'] },
              estimatedCost: 200
            }
          ],
          currentSpend: { thisWeek: 250, total: 1400 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: [
          'expired_voice_consent',
          'weekly_budget_exceeded',
          'missing_connector_linkedin',
          'missing_connector_x'
        ],
        expectedWarnings: []
      }
    ],

    'all_deny': [
      {
        name: 'All policies deny (FFFF)',
        description: 'Worst case scenario - all policies should deny',
        policyRules: { consent: false, budget: false, connector: false, security: false },
        input: {
          workspace: {
            ...baseWorkspace,
            securityLevel: 'critical',
            dataClassification: 'confidential',
            region: 'EU',
            budget: { currency: 'USD', weeklyCap: 200, hardCap: 1000 },
            primaryChannels: ['linkedin', 'x'],
            connectors: [
              {
                platform: 'linkedin',
                status: 'revoked',
                healthStatus: 'unhealthy',
                revokedAt: '2024-06-15T08:00:00Z'
              }
            ],
            consentRecords: []
          },
          workflow: [
            {
              type: 'creative',
              config: {
                uses_synthetic_voice: true,
                requires_ugc: true,
                processesPII: true,
                riskyOperation: true
              },
              estimatedCost: 500
            },
            {
              type: 'publish',
              config: {
                channels: ['linkedin', 'x'],
                includeCustomerData: true,
                publicVisibility: true
              },
              estimatedCost: 300
            }
          ],
          currentSpend: { thisWeek: 180, total: 950 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: false,
        expectedDeny: [
          'missing_voice_consent',
          'missing_ugc_license',
          'weekly_budget_exceeded',
          'hard_budget_exceeded',
          'connector_revoked_linkedin',
          'missing_connector_x',
          'security_violation_public_confidential_data',
          'regulatory_violation_gdpr',
          'security_breach_risk'
        ],
        expectedWarnings: []
      }
    ],

    'warning_scenarios': [
      {
        name: 'Multiple warnings with allow',
        description: 'Should allow but generate multiple warnings',
        policyRules: { consent: true, budget: true, connector: true, security: true },
        input: {
          workspace: {
            ...baseWorkspace,
            budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
            primaryChannels: ['linkedin'],
            connectors: [{
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'degraded',
              lastHealthCheck: '2024-06-15T09:30:00Z',
              tokenExpiresAt: '2024-06-20T10:00:00Z'  // Expires in 5 days
            }],
            consentRecords: [
              {
                type: 'voice_likeness',
                grantedBy: 'user-123',
                grantedAt: '2024-01-01T00:00:00Z',
                expiresAt: '2024-07-01T00:00:00Z'  // Expires in 16 days
              }
            ]
          },
          workflow: [
            {
              type: 'creative',
              config: {
                uses_synthetic_voice: true,
                callsExternalAPIs: true
              },
              estimatedCost: 700  // 70% of weekly budget
            }
          ],
          currentSpend: { thisWeek: 200, total: 2400 },
          timestamp: '2024-06-15T10:00:00Z'
        },
        expectedAllow: true,
        expectedDeny: [],
        expectedWarnings: [
          'approaching_weekly_limit',
          'high_cost_workflow',
          'connector_degraded_linkedin',
          'token_expiring_linkedin',
          'consent_expiring_soon',
          'external_api_calls'
        ]
      }
    ]
  };

  // Generate tests for each combination in the coverage matrix
  Object.entries(coverageMatrix).forEach(([category, combinations]) => {
    describe(`Policy Coverage: ${category.replace(/_/g, ' ').toUpperCase()}`, () => {
      combinations.forEach(combination => {
        it(combination.name, async () => {
          const result = await runPolicyTest(combination.input);
          
          // Verify the main decision
          expect(result.allow).toBe(combination.expectedAllow);
          
          // Verify expected denials
          if (combination.expectedDeny.length > 0) {
            expect(result.deny).toEqual(expect.arrayContaining(combination.expectedDeny));
          }
          
          // Verify expected warnings
          if (combination.expectedWarnings.length > 0) {
            expect(result.warnings).toEqual(expect.arrayContaining(combination.expectedWarnings));
          }
          
          // Log result for debugging
          console.log(`${combination.name}: allow=${result.allow}, deny=${result.deny.length}, warnings=${result.warnings.length}`);
        }, 30000);
      });
    });
  });

  describe('Policy Interaction Analysis', () => {
    it('should handle policy priority correctly', async () => {
      // Security violations should override other allows
      const securityOverrideInput = {
        workspace: {
          ...baseWorkspace,
          securityLevel: 'critical',
          budget: { currency: 'USD', weeklyCap: 1000, hardCap: 5000 },
          primaryChannels: ['linkedin'],
          connectors: [{
            platform: 'linkedin',
            status: 'connected',
            healthStatus: 'healthy'
          }],
          consentRecords: [{
            type: 'voice_likeness',
            grantedBy: 'user-123',
            grantedAt: '2024-01-01T00:00:00Z',
            expiresAt: '2025-01-01T00:00:00Z'
          }]
        },
        workflow: [{
          type: 'creative',
          config: {
            uses_synthetic_voice: true,
            riskyOperation: true  // Security violation
          },
          estimatedCost: 100
        }],
        ...baseContext
      };

      const result = await runPolicyTest(securityOverrideInput);
      expect(result.allow).toBe(false);
      expect(result.deny).toContain('security_breach_risk');
    }, 30000);

    it('should calculate risk score appropriately', async () => {
      const highRiskInput = {
        workspace: {
          ...baseWorkspace,
          securityLevel: 'high',
          budget: { currency: 'USD', weeklyCap: 500, hardCap: 2500 },
          primaryChannels: ['linkedin', 'x', 'instagram'],
          connectors: [
            {
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'degraded'
            },
            {
              platform: 'x',
              status: 'connected',
              healthStatus: 'degraded'
            },
            {
              platform: 'instagram',
              status: 'connected',
              healthStatus: 'healthy'
            }
          ],
          consentRecords: []
        },
        workflow: [
          {
            type: 'creative',
            config: {
              uses_synthetic_voice: true,
              requires_ugc: true,
              callsExternalAPIs: true
            },
            estimatedCost: 200
          },
          {
            type: 'publish',
            config: { channels: ['linkedin', 'x', 'instagram'] },
            estimatedCost: 150
          }
        ],
        currentSpend: { thisWeek: 400, total: 2000 },
        timestamp: '2024-06-15T10:00:00Z'
      };

      const riskResult = await runPolicyTest(highRiskInput);
      
      // Should deny due to missing consents and budget concerns
      expect(riskResult.allow).toBe(false);
      expect(riskResult.deny).toEqual(expect.arrayContaining([
        'missing_voice_consent',
        'missing_ugc_license',
        'weekly_budget_exceeded'
      ]));
      expect(riskResult.warnings).toEqual(expect.arrayContaining([
        'connector_degraded_linkedin',
        'connector_degraded_x'
      ]));
    }, 45000);
  });

  describe('Edge Case Policy Combinations', () => {
    it('should handle empty workspace configuration', async () => {
      const emptyWorkspaceInput = {
        workspace: {
          workspaceId: 'ws-empty',
          tenantId: 'empty-tenant'
        },
        workflow: [],
        timestamp: '2024-06-15T10:00:00Z'
      };

      const result = await runPolicyTest(emptyWorkspaceInput);
      
      // Should allow empty workflow with minimal workspace
      expect(result.allow).toBe(true);
    }, 30000);

    it('should handle complex nested policy interactions', async () => {
      const complexInput = {
        workspace: {
          ...baseWorkspace,
          budget: { currency: 'USD', weeklyCap: 2000, hardCap: 10000 },
          primaryChannels: ['linkedin', 'x'],
          fallbackChannels: ['instagram'],
          connectors: [
            {
              platform: 'linkedin',
              status: 'connected',
              healthStatus: 'healthy'
            },
            {
              platform: 'x',
              status: 'error',
              healthStatus: 'unhealthy'
            },
            {
              platform: 'instagram',
              status: 'connected',
              healthStatus: 'healthy'
            }
          ],
          consentRecords: [
            {
              type: 'voice_likeness',
              grantedBy: 'user-123',
              grantedAt: '2024-01-01T00:00:00Z',
              expiresAt: '2025-01-01T00:00:00Z'
            },
            {
              type: 'ugc_license',
              grantedBy: 'user-456',
              grantedAt: '2024-01-01T00:00:00Z',
              expiresAt: '2025-01-01T00:00:00Z'
            }
          ]
        },
        workflow: [
          {
            type: 'research',
            estimatedCost: 100
          },
          {
            type: 'creative',
            config: {
              uses_synthetic_voice: true,
              requires_ugc: true
            },
            estimatedCost: 300
          },
          {
            type: 'publish',
            config: {
              channels: ['linkedin', 'x'],
              allowFallback: true
            },
            estimatedCost: 250
          }
        ],
        currentSpend: { thisWeek: 800, total: 4000 },
        timestamp: '2024-06-15T10:00:00Z'
      };

      const result = await runPolicyTest(complexInput);
      
      // Should allow with fallback warnings
      expect(result.allow).toBe(true);
      expect(result.warnings).toEqual(expect.arrayContaining([
        'using_fallback_channel_instagram'
      ]));
    }, 45000);
  });
});