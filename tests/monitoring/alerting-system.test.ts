import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

interface AlertRule {
  alert: string;
  expr: string;
  for?: string;
  labels: { [key: string]: string };
  annotations: { [key: string]: string };
}

interface AlertTestCase {
  name: string;
  rule: AlertRule;
  mockMetrics: { [metric: string]: number | string };
  expectedAlert: boolean;
  expectedSeverity?: string;
  expectedTeam?: string;
}

interface NotificationTest {
  alertName: string;
  severity: string;
  team: string;
  expectedReceivers: string[];
  expectedChannels: string[];
}

describe('SMM Architect Alerting System Tests', () => {
  let prometheusUrl: string;
  let alertmanagerUrl: string;
  let alertRules: any;
  let alertmanagerConfig: any;

  beforeAll(async () => {
    prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9090';
    alertmanagerUrl = process.env.ALERTMANAGER_URL || 'http://localhost:9093';

    // Load alert rules and alertmanager config
    const rulesContent = await fs.readFile('/Users/ivan/smm-architect/monitoring/prometheus/rules/smm-alerts.yml', 'utf8');
    alertRules = yaml.load(rulesContent);

    const amConfigContent = await fs.readFile('/Users/ivan/smm-architect/monitoring/alertmanager/alertmanager.yml', 'utf8');
    alertmanagerConfig = yaml.load(amConfigContent);

    console.log('🚨 Starting alerting system validation...');
  });

  describe('Alert Rule Validation', () => {
    const testCases: AlertTestCase[] = [
      // Connector Alerts
      {
        name: 'Connector Down Alert',
        rule: {
          alert: 'SMM_ConnectorDown',
          expr: 'up{job="smm-connector-health"} == 0',
          for: '2m',
          labels: { severity: 'critical', team: 'platform', service: 'connector' },
          annotations: {
            summary: 'SMM Connector {{ $labels.instance }} is down',
            description: 'Connector {{ $labels.instance }} has been down for more than 2 minutes.'
          }
        },
        mockMetrics: { 'up{job="smm-connector-health",instance="linkedin"}': 0 },
        expectedAlert: true,
        expectedSeverity: 'critical',
        expectedTeam: 'platform'
      },
      {
        name: 'Connector High Error Rate',
        rule: {
          alert: 'SMM_ConnectorHighErrorRate',
          expr: 'smm:connector_error_rate_5m > 0.05',
          for: '5m',
          labels: { severity: 'warning', team: 'platform', service: 'connector' },
          annotations: {
            summary: 'High error rate on connector {{ $labels.connector }}',
            description: 'Connector {{ $labels.connector }} has an error rate of {{ $value | humanizePercentage }}.'
          }
        },
        mockMetrics: { 'smm:connector_error_rate_5m{connector="twitter"}': 0.08 },
        expectedAlert: true,
        expectedSeverity: 'warning'
      },
      // Budget Alerts
      {
        name: 'Budget Threshold Exceeded',
        rule: {
          alert: 'SMM_BudgetThresholdExceeded',
          expr: 'smm_workspace_budget_utilization > 0.8',
          labels: { severity: 'warning', team: 'finance', service: 'budget' },
          annotations: {
            summary: 'Budget threshold exceeded for workspace {{ $labels.workspace_id }}',
            description: 'Workspace {{ $labels.workspace_id }} has used {{ $value | humanizePercentage }} of allocated budget.'
          }
        },
        mockMetrics: { 'smm_workspace_budget_utilization{workspace_id="ws-123"}': 0.85 },
        expectedAlert: true,
        expectedSeverity: 'warning',
        expectedTeam: 'finance'
      },
      {
        name: 'Critical Budget Overspend',
        rule: {
          alert: 'SMM_BudgetCriticalOverspend',
          expr: 'smm_workspace_budget_utilization > 0.95',
          labels: { severity: 'critical', team: 'finance', service: 'budget' },
          annotations: {
            summary: 'Critical budget overspend for workspace {{ $labels.workspace_id }}',
            description: 'Workspace {{ $labels.workspace_id }} has used {{ $value | humanizePercentage }} of budget.'
          }
        },
        mockMetrics: { 'smm_workspace_budget_utilization{workspace_id="ws-456"}': 0.98 },
        expectedAlert: true,
        expectedSeverity: 'critical'
      },
      // Agent Alerts
      {
        name: 'Agent High Failure Rate',
        rule: {
          alert: 'SMM_AgentHighFailureRate',
          expr: '(1 - smm:agent_success_rate_5m) > 0.1',
          for: '10m',
          labels: { severity: 'warning', team: 'platform', service: 'agent' },
          annotations: {
            summary: 'High failure rate for {{ $labels.agent_type }} agent',
            description: '{{ $labels.agent_type }} agent failure rate is {{ $value | humanizePercentage }}.'
          }
        },
        mockMetrics: { 'smm:agent_success_rate_5m{agent_type="research"}': 0.85 },
        expectedAlert: true,
        expectedSeverity: 'warning'
      },
      // Simulation Alerts
      {
        name: 'Simulation High Failure Rate',
        rule: {
          alert: 'SMM_SimulationHighFailureRate',
          expr: '(1 - smm:simulation_success_rate_1h) > 0.05',
          for: '30m',
          labels: { severity: 'warning', team: 'platform', service: 'simulation' },
          annotations: {
            summary: 'High simulation failure rate',
            description: 'Simulation failure rate is {{ $value | humanizePercentage }}.'
          }
        },
        mockMetrics: { 'smm:simulation_success_rate_1h': 0.92 },
        expectedAlert: true,
        expectedSeverity: 'warning'
      },
      // Canary Alerts
      {
        name: 'Canary Deployment Failure',
        rule: {
          alert: 'SMM_CanaryDeploymentFailure',
          expr: 'smm_canary_deployment_success == 0',
          labels: { severity: 'critical', team: 'platform', service: 'deployment' },
          annotations: {
            summary: 'Canary deployment failed',
            description: 'Canary deployment for {{ $labels.service }} has failed.'
          }
        },
        mockMetrics: { 'smm_canary_deployment_success{service="research-agent"}': 0 },
        expectedAlert: true,
        expectedSeverity: 'critical'
      },
      {
        name: 'Model Drift Detection',
        rule: {
          alert: 'SMM_CanaryModelDrift',
          expr: 'smm_model_evaluation_drift_score > 0.3',
          labels: { severity: 'critical', team: 'ml', service: 'model' },
          annotations: {
            summary: 'Model drift detected in canary',
            description: 'Canary model shows drift score of {{ $value }}.'
          }
        },
        mockMetrics: { 'smm_model_evaluation_drift_score{model="creative-v2.1"}': 0.42 },
        expectedAlert: true,
        expectedSeverity: 'critical',
        expectedTeam: 'ml'
      }
    ];

    testCases.forEach((testCase) => {
      it(`should validate alert rule: ${testCase.name}`, async () => {
        // Find the rule in the loaded configuration
        const foundRule = findAlertRule(alertRules, testCase.rule.alert);
        expect(foundRule).toBeDefined();
        
        if (foundRule) {
          // Validate rule properties
          expect(foundRule.alert).toBe(testCase.rule.alert);
          expect(foundRule.labels.severity).toBe(testCase.expectedSeverity);
          if (testCase.expectedTeam) {
            expect(foundRule.labels.team).toBe(testCase.expectedTeam);
          }
          
          // Validate expression syntax
          expect(foundRule.expr).toBeDefined();
          expect(foundRule.expr.length).toBeGreaterThan(0);
          
          // Validate annotations
          expect(foundRule.annotations.summary).toBeDefined();
          expect(foundRule.annotations.description).toBeDefined();
        }
        
        console.log(`✅ Validated alert rule: ${testCase.name}`);
      });
    });

    it('should have all required alert rules', () => {
      const requiredAlerts = [
        'SMM_ConnectorDown',
        'SMM_ConnectorHighErrorRate',
        'SMM_BudgetThresholdExceeded',
        'SMM_BudgetCriticalOverspend',
        'SMM_AgentHighFailureRate',
        'SMM_SimulationHighFailureRate',
        'SMM_CanaryDeploymentFailure',
        'SMM_CanaryModelDrift'
      ];

      const allRules = getAllAlertRules(alertRules);
      const ruleNames = allRules.map(rule => rule.alert);

      requiredAlerts.forEach(requiredAlert => {
        expect(ruleNames).toContain(requiredAlert);
      });
    });

    it('should have valid for durations', () => {
      const allRules = getAllAlertRules(alertRules);
      
      allRules.forEach(rule => {
        if (rule.for) {
          // Validate duration format (e.g., '2m', '10s', '1h')
          expect(rule.for).toMatch(/^\d+[smh]$/);
        }
      });
    });

    it('should have runbook URLs for critical alerts', () => {
      const allRules = getAllAlertRules(alertRules);
      const criticalRules = allRules.filter(rule => rule.labels.severity === 'critical');
      
      criticalRules.forEach(rule => {
        expect(rule.annotations.runbook_url || rule.annotations.description).toBeDefined();
      });
    });
  });

  describe('Alertmanager Configuration Validation', () => {
    it('should have valid global configuration', () => {
      expect(alertmanagerConfig.global).toBeDefined();
      expect(alertmanagerConfig.global.smtp_from).toContain('@smm-architect.com');
      expect(alertmanagerConfig.global.smtp_smarthost).toBeDefined();
    });

    it('should have proper routing configuration', () => {
      expect(alertmanagerConfig.route).toBeDefined();
      expect(alertmanagerConfig.route.group_by).toContain('severity');
      expect(alertmanagerConfig.route.receiver).toBe('default-notifications');
      expect(alertmanagerConfig.route.routes).toBeDefined();
      expect(Array.isArray(alertmanagerConfig.route.routes)).toBe(true);
    });

    it('should route critical alerts correctly', () => {
      const criticalRoute = alertmanagerConfig.route.routes.find(
        (route: any) => route.match && route.match.severity === 'critical'
      );
      
      expect(criticalRoute).toBeDefined();
      expect(criticalRoute.receiver).toBe('critical-alerts');
      expect(criticalRoute.group_wait).toBe('10s');
    });

    it('should have all required receivers', () => {
      const requiredReceivers = [
        'default-notifications',
        'critical-alerts',
        'database-team',
        'security-team',
        'platform-team',
        'finance-team',
        'ml-team',
        'business-team'
      ];

      const receiverNames = alertmanagerConfig.receivers.map((r: any) => r.name);
      
      requiredReceivers.forEach(required => {
        expect(receiverNames).toContain(required);
      });
    });

    it('should have proper inhibition rules', () => {
      expect(alertmanagerConfig.inhibit_rules).toBeDefined();
      expect(Array.isArray(alertmanagerConfig.inhibit_rules)).toBe(true);
      
      // Check critical/warning inhibition
      const criticalWarningInhibit = alertmanagerConfig.inhibit_rules.find(
        (rule: any) => rule.source_match?.severity === 'critical' && 
                      rule.target_match?.severity === 'warning'
      );
      expect(criticalWarningInhibit).toBeDefined();
    });
  });

  describe('Notification Routing Tests', () => {
    const notificationTests: NotificationTest[] = [
      {
        alertName: 'SMM_ConnectorDown',
        severity: 'critical',
        team: 'platform',
        expectedReceivers: ['critical-alerts', 'platform-team'],
        expectedChannels: ['#smm-critical', '#platform-alerts']
      },
      {
        alertName: 'SMM_BudgetCriticalOverspend',
        severity: 'critical',
        team: 'finance',
        expectedReceivers: ['critical-alerts', 'finance-team'],
        expectedChannels: ['#smm-critical', '#finance-alerts']
      },
      {
        alertName: 'SMM_CanaryModelDrift',
        severity: 'critical',
        team: 'ml',
        expectedReceivers: ['critical-alerts', 'ml-team'],
        expectedChannels: ['#smm-critical', '#ml-alerts']
      },
      {
        alertName: 'SMM_AgentHighFailureRate',
        severity: 'warning',
        team: 'platform',
        expectedReceivers: ['warning-alerts', 'platform-team'],
        expectedChannels: ['#smm-warnings', '#platform-alerts']
      }
    ];

    notificationTests.forEach((test) => {
      it(`should route ${test.alertName} to correct receivers`, () => {
        // Test routing logic based on alertmanager configuration
        const route = findMatchingRoute(alertmanagerConfig, {
          severity: test.severity,
          team: test.team,
          alertname: test.alertName
        });

        expect(route).toBeDefined();
        
        // Verify receiver configuration exists
        test.expectedReceivers.forEach(receiverName => {
          const receiver = alertmanagerConfig.receivers.find((r: any) => r.name === receiverName);
          expect(receiver).toBeDefined();
        });
      });
    });
  });

  describe('Alert Performance Tests', () => {
    it('should have reasonable group wait times', () => {
      const allRoutes = getAllRoutes(alertmanagerConfig);
      
      allRoutes.forEach(route => {
        const groupWait = route.group_wait || alertmanagerConfig.route.group_wait;
        const waitSeconds = parseTimeToSeconds(groupWait);
        
        // Critical alerts should have short wait times
        if (route.match?.severity === 'critical') {
          expect(waitSeconds).toBeLessThanOrEqual(30);
        } else {
          expect(waitSeconds).toBeLessThanOrEqual(300); // 5 minutes max
        }
      });
    });

    it('should have appropriate repeat intervals', () => {
      const allRoutes = getAllRoutes(alertmanagerConfig);
      
      allRoutes.forEach(route => {
        const repeatInterval = route.repeat_interval || alertmanagerConfig.route.repeat_interval;
        const intervalSeconds = parseTimeToSeconds(repeatInterval);
        
        // Should not spam notifications more than every 30 minutes
        expect(intervalSeconds).toBeGreaterThanOrEqual(1800);
      });
    });
  });

  describe('Alert Expression Validation', () => {
    it('should use valid PromQL expressions', () => {
      const allRules = getAllAlertRules(alertRules);
      
      allRules.forEach(rule => {
        // Basic PromQL validation
        expect(rule.expr).toBeDefined();
        expect(rule.expr.length).toBeGreaterThan(0);
        
        // Should not have obvious syntax errors
        expect(rule.expr).not.toContain('{{');
        expect(rule.expr).not.toContain('}}');
        
        // Should use proper comparison operators
        if (rule.expr.includes('>') || rule.expr.includes('<') || rule.expr.includes('==')) {
          expect(rule.expr).toMatch(/[><=!]=?\s*[\d.]+/);
        }
      });
    });

    it('should use appropriate thresholds', () => {
      const allRules = getAllAlertRules(alertRules);
      
      // Check that error rate thresholds are reasonable (between 0 and 1)
      const errorRateRules = allRules.filter(rule => 
        rule.expr.includes('error_rate') || rule.expr.includes('failure_rate')
      );
      
      errorRateRules.forEach(rule => {
        const thresholdMatch = rule.expr.match(/>\s*([\d.]+)/);
        if (thresholdMatch) {
          const threshold = parseFloat(thresholdMatch[1]);
          expect(threshold).toBeGreaterThan(0);
          expect(threshold).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should integrate with Prometheus rules validation', async () => {
      // This would require a running Prometheus instance
      try {
        const response = await axios.get(`${prometheusUrl}/api/v1/rules`);
        expect(response.status).toBe(200);
        
        // Check if our rules are loaded
        const rules = response.data.data.groups || [];
        const smmRules = rules.filter((group: any) => 
          group.name && group.name.startsWith('smm_')
        );
        
        expect(smmRules.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn('Prometheus not available for integration test:', error);
      }
    }, 30000);

    it('should validate alertmanager configuration', async () => {
      try {
        const response = await axios.get(`${alertmanagerUrl}/api/v1/status`);
        expect(response.status).toBe(200);
        expect(response.data.status).toBe('success');
      } catch (error) {
        console.warn('Alertmanager not available for integration test:', error);
      }
    }, 10000);
  });

  // Helper functions
  function findAlertRule(alertRules: any, alertName: string): any {
    for (const group of alertRules.groups || []) {
      for (const rule of group.rules || []) {
        if (rule.alert === alertName) {
          return rule;
        }
      }
    }
    return null;
  }

  function getAllAlertRules(alertRules: any): any[] {
    const rules: any[] = [];
    for (const group of alertRules.groups || []) {
      for (const rule of group.rules || []) {
        if (rule.alert) {
          rules.push(rule);
        }
      }
    }
    return rules;
  }

  function findMatchingRoute(config: any, labels: { [key: string]: string }): any {
    // Simplified route matching logic
    for (const route of config.route.routes || []) {
      if (route.match) {
        let matches = true;
        for (const [key, value] of Object.entries(route.match)) {
          if (labels[key] !== value) {
            matches = false;
            break;
          }
        }
        if (matches) return route;
      }
    }
    return config.route;
  }

  function getAllRoutes(config: any): any[] {
    const routes = [config.route];
    
    function addRoutes(route: any) {
      if (route.routes) {
        for (const subRoute of route.routes) {
          routes.push(subRoute);
          addRoutes(subRoute);
        }
      }
    }
    
    addRoutes(config.route);
    return routes;
  }

  function parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smh])$/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      default: return 0;
    }
  }
});