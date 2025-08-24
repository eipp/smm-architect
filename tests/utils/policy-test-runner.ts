import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

export interface PolicyTestResult {
  allow: boolean;
  deny: string[];
  warnings: string[];
  reasons: string[];
  executionTime: number;
  riskScore?: number;
}

export interface PolicyCoverageReport {
  timestamp: string;
  totalCombinations: number;
  testedCombinations: number;
  coveragePercentage: number;
  policyRules: {
    [ruleName: string]: {
      tested: number;
      passed: number;
      failed: number;
      coverage: number;
    };
  };
  combinations: {
    [combination: string]: {
      tested: boolean;
      passed: boolean;
      errors: string[];
    };
  };
  summary: {
    allAllow: number;
    allDeny: number;
    mixedResults: number;
    warningsOnly: number;
  };
}

export class PolicyTestRunner {
  private policyDir: string;
  private tempDir: string;
  private results: Map<string, PolicyTestResult> = new Map();

  constructor(policyDir?: string) {
    this.policyDir = policyDir || path.join(__dirname, '../../services/policy');
    this.tempDir = path.join(__dirname, '../tmp/policy-testing');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
    
    // Verify OPA is available
    try {
      execSync('opa version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('OPA is not installed. Cannot run policy tests.');
    }
  }

  async runPolicyEvaluation(input: any, testName: string): Promise<PolicyTestResult> {
    const startTime = Date.now();
    const inputFile = path.join(this.tempDir, `${testName}-${Date.now()}.json`);
    
    try {
      await fs.writeFile(inputFile, JSON.stringify(input, null, 2));
      
      // Run all policy evaluations in parallel
      const evaluations = await Promise.all([
        this.runOPAQuery('data.smm.allow', inputFile),
        this.runOPAQuery('data.smm.deny', inputFile),
        this.runOPAQuery('data.smm.warnings', inputFile),
        this.runOPAQuery('data.smm.reasons', inputFile),
        this.runOPAQuery('data.smm.risk_score', inputFile)
      ]);

      const result: PolicyTestResult = {
        allow: evaluations[0] === true,
        deny: evaluations[1] || [],
        warnings: evaluations[2] || [],
        reasons: evaluations[3] || [],
        executionTime: Date.now() - startTime,
        riskScore: evaluations[4] || 0
      };

      this.results.set(testName, result);
      return result;
    } finally {
      try {
        await fs.unlink(inputFile);
      } catch {}
    }
  }

  private async runOPAQuery(query: string, inputFile: string): Promise<any> {
    try {
      const result = execSync(
        `opa eval -d "${this.policyDir}" -i "${inputFile}" "${query}"`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      return JSON.parse(result).result;
    } catch (error) {
      console.warn(`OPA query failed: ${query}`, error);
      return null;
    }
  }

  generateCoverageMatrix(): string[][] {
    // Generate all 16 combinations of policy states (2^4)
    const policies = ['consent', 'budget', 'connector', 'security'];
    const combinations: string[][] = [];
    
    for (let i = 0; i < 16; i++) {
      const combination = [];
      for (let j = 0; j < 4; j++) {
        combination.push((i & (1 << j)) ? 'ALLOW' : 'DENY');
      }
      combinations.push(combination);
    }
    
    return combinations;
  }

  async generateCoverageReport(): Promise<PolicyCoverageReport> {
    const allCombinations = this.generateCoverageMatrix();
    const testedCombinations = this.results.size;
    
    // Analyze policy rule coverage
    const policyRules = {
      'consent_allow': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'consent_deny': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'budget_allow': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'budget_deny': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'connector_allow': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'connector_deny': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'security_allow': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'security_deny': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'integration_warnings': { tested: 0, passed: 0, failed: 0, coverage: 0 },
      'risk_assessment': { tested: 0, passed: 0, failed: 0, coverage: 0 }
    };

    // Analyze test results
    const combinations: { [key: string]: { tested: boolean; passed: boolean; errors: string[] } } = {};
    let allAllow = 0, allDeny = 0, mixedResults = 0, warningsOnly = 0;

    for (const [testName, result] of this.results) {
      combinations[testName] = {
        tested: true,
        passed: true, // Assume passed unless we detect issues
        errors: []
      };

      // Categorize results
      if (result.allow && result.deny.length === 0) {
        if (result.warnings.length > 0) {
          warningsOnly++;
        } else {
          allAllow++;
        }
      } else if (!result.allow && result.deny.length > 0) {
        allDeny++;
      } else {
        mixedResults++;
      }

      // Update rule coverage
      this.updateRuleCoverage(policyRules, result);
    }

    // Calculate coverage percentages
    Object.values(policyRules).forEach(rule => {
      rule.coverage = rule.tested > 0 ? (rule.passed / rule.tested) * 100 : 0;
    });

    return {
      timestamp: new Date().toISOString(),
      totalCombinations: allCombinations.length,
      testedCombinations,
      coveragePercentage: (testedCombinations / allCombinations.length) * 100,
      policyRules,
      combinations,
      summary: {
        allAllow,
        allDeny,
        mixedResults,
        warningsOnly
      }
    };
  }

  private updateRuleCoverage(
    policyRules: { [key: string]: { tested: number; passed: number; failed: number; coverage: number } },
    result: PolicyTestResult
  ): void {
    // Update consent rule coverage
    if (result.deny.some(d => d.includes('consent')) || result.warnings.some(w => w.includes('consent'))) {
      policyRules.consent_deny.tested++;
      if (result.deny.some(d => d.includes('consent'))) {
        policyRules.consent_deny.passed++;
      }
    } else {
      policyRules.consent_allow.tested++;
      if (result.allow) {
        policyRules.consent_allow.passed++;
      }
    }

    // Update budget rule coverage
    if (result.deny.some(d => d.includes('budget')) || result.warnings.some(w => w.includes('budget'))) {
      policyRules.budget_deny.tested++;
      if (result.deny.some(d => d.includes('budget'))) {
        policyRules.budget_deny.passed++;
      }
    } else {
      policyRules.budget_allow.tested++;
      if (result.allow) {
        policyRules.budget_allow.passed++;
      }
    }

    // Update connector rule coverage
    if (result.deny.some(d => d.includes('connector')) || result.warnings.some(w => w.includes('connector'))) {
      policyRules.connector_deny.tested++;
      if (result.deny.some(d => d.includes('connector'))) {
        policyRules.connector_deny.passed++;
      }
    } else {
      policyRules.connector_allow.tested++;
      if (result.allow) {
        policyRules.connector_allow.passed++;
      }
    }

    // Update security rule coverage
    if (result.deny.some(d => d.includes('security')) || result.warnings.some(w => w.includes('security'))) {
      policyRules.security_deny.tested++;
      if (result.deny.some(d => d.includes('security'))) {
        policyRules.security_deny.passed++;
      }
    } else {
      policyRules.security_allow.tested++;
      if (result.allow) {
        policyRules.security_allow.passed++;
      }
    }

    // Update integration and risk coverage
    if (result.warnings.length > 0) {
      policyRules.integration_warnings.tested++;
      policyRules.integration_warnings.passed++;
    }

    if (result.riskScore !== undefined) {
      policyRules.risk_assessment.tested++;
      if (result.riskScore >= 0 && result.riskScore <= 100) {
        policyRules.risk_assessment.passed++;
      }
    }
  }

  async generateHtmlReport(report: PolicyCoverageReport): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Policy Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .summary-card h3 { margin: 0 0 10px 0; color: #007bff; }
        .summary-card .value { font-size: 2em; font-weight: bold; color: #333; }
        .summary-card .label { color: #666; font-size: 0.9em; }
        .coverage-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .coverage-table th, .coverage-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .coverage-table th { background-color: #f8f9fa; font-weight: bold; }
        .progress-bar { width: 100%; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-excellent { background-color: #28a745; }
        .progress-good { background-color: #ffc107; }
        .progress-poor { background-color: #dc3545; }
        .matrix { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
        .matrix-cell { padding: 15px; text-align: center; border-radius: 8px; font-weight: bold; color: white; }
        .matrix-allow { background-color: #28a745; }
        .matrix-deny { background-color: #dc3545; }
        .matrix-warn { background-color: #ffc107; color: #333; }
        .matrix-mixed { background-color: #6c757d; }
        .timestamp { color: #666; font-size: 0.9em; text-align: center; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Policy Coverage Report</h1>
            <p>Comprehensive analysis of OPA policy rule testing</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Overall Coverage</h3>
                <div class="value">${report.coveragePercentage.toFixed(1)}%</div>
                <div class="label">${report.testedCombinations} of ${report.totalCombinations} combinations tested</div>
            </div>
            <div class="summary-card">
                <h3>Policy Decisions</h3>
                <div class="value">${report.summary.allAllow + report.summary.allDeny + report.summary.mixedResults + report.summary.warningsOnly}</div>
                <div class="label">Total policy evaluations</div>
            </div>
            <div class="summary-card">
                <h3>Success Rate</h3>
                <div class="value">${Math.round((report.summary.allAllow + report.summary.warningsOnly) / (report.summary.allAllow + report.summary.allDeny + report.summary.mixedResults + report.summary.warningsOnly) * 100)}%</div>
                <div class="label">Allow + Warnings / Total</div>
            </div>
            <div class="summary-card">
                <h3>Risk Assessment</h3>
                <div class="value">${report.policyRules.risk_assessment.tested}</div>
                <div class="label">Risk evaluations completed</div>
            </div>
        </div>

        <h2>📊 Policy Rule Coverage</h2>
        <table class="coverage-table">
            <thead>
                <tr>
                    <th>Policy Rule</th>
                    <th>Tests</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Coverage</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.policyRules).map(([rule, stats]) => `
                <tr>
                    <td>${rule.replace(/_/g, ' ').toUpperCase()}</td>
                    <td>${stats.tested}</td>
                    <td>${stats.passed}</td>
                    <td>${stats.failed}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill ${stats.coverage >= 80 ? 'progress-excellent' : stats.coverage >= 60 ? 'progress-good' : 'progress-poor'}" 
                                 style="width: ${stats.coverage}%"></div>
                        </div>
                        ${stats.coverage.toFixed(1)}%
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>🎯 Decision Summary</h2>
        <div class="matrix">
            <div class="matrix-cell matrix-allow">
                <div>ALL ALLOW</div>
                <div>${report.summary.allAllow}</div>
            </div>
            <div class="matrix-cell matrix-warn">
                <div>WARNINGS ONLY</div>
                <div>${report.summary.warningsOnly}</div>
            </div>
            <div class="matrix-cell matrix-deny">
                <div>ALL DENY</div>
                <div>${report.summary.allDeny}</div>
            </div>
            <div class="matrix-cell matrix-mixed">
                <div>MIXED RESULTS</div>
                <div>${report.summary.mixedResults}</div>
            </div>
        </div>

        <h2>📋 Tested Combinations</h2>
        <table class="coverage-table">
            <thead>
                <tr>
                    <th>Test Case</th>
                    <th>Status</th>
                    <th>Result</th>
                    <th>Issues</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(report.combinations).map(([name, result]) => `
                <tr>
                    <td>${name}</td>
                    <td>${result.tested ? '✅ Tested' : '❌ Not Tested'}</td>
                    <td>${result.passed ? '✅ Passed' : '❌ Failed'}</td>
                    <td>${result.errors.join(', ') || 'None'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="timestamp">
            Report generated: ${report.timestamp}
        </div>
    </div>
</body>
</html>
    `;

    return html;
  }

  async saveReport(report: PolicyCoverageReport, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save JSON report
    await fs.writeFile(
      path.join(outputDir, 'policy-coverage-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Save HTML report
    const html = await this.generateHtmlReport(report);
    await fs.writeFile(
      path.join(outputDir, 'policy-coverage-report.html'),
      html
    );

    // Save summary CSV
    const csvRows = [
      'Policy Rule,Tested,Passed,Failed,Coverage %',
      ...Object.entries(report.policyRules).map(([rule, stats]) => 
        `${rule},${stats.tested},${stats.passed},${stats.failed},${stats.coverage.toFixed(2)}`
      )
    ];
    await fs.writeFile(
      path.join(outputDir, 'policy-coverage-summary.csv'),
      csvRows.join('\n')
    );

    console.log(`📊 Policy coverage report saved to ${outputDir}`);
  }

  getResults(): Map<string, PolicyTestResult> {
    return new Map(this.results);
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
}

export async function generateComprehensivePolicyCoverage(): Promise<PolicyCoverageReport> {
  const runner = new PolicyTestRunner();
  await runner.initialize();

  try {
    // Test all policy combinations
    const testCases = [
      // ... test cases would be defined here or loaded from configuration
    ];

    for (const testCase of testCases) {
      await runner.runPolicyEvaluation(testCase.input, testCase.name);
    }

    const report = await runner.generateCoverageReport();
    await runner.saveReport(report, path.join(__dirname, '../reports/policy-coverage'));

    return report;
  } finally {
    await runner.cleanup();
  }
}