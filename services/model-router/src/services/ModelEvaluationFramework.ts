import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { ModelMetadata, ModelRequest, ModelResponse } from '../types';
import { ModelRegistry } from './ModelRegistry';
import { Logger } from '../utils/logger';

export interface GoldenDatasetEntry {
  id: string;
  prompt: string;
  expectedOutput: string;
  metadata: {
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    agentType: string;
    tags: string[];
  };
  evaluationCriteria: {
    similarity: number; // Minimum similarity score required
    semanticMatch: boolean;
    factualAccuracy: boolean;
    brandConsistency: boolean;
  };
}

export interface EvaluationResult {
  entryId: string;
  modelId: string;
  score: number;
  passed: boolean;
  metrics: {
    similarity: number;
    semanticScore: number;
    factualScore: number;
    brandScore: number;
    latency: number;
    tokenUsage: number;
  };
  response: string;
  timestamp: Date;
}

export interface ModelComparison {
  modelA: string;
  modelB: string;
  testId: string;
  results: {
    modelA: EvaluationResult[];
    modelB: EvaluationResult[];
  };
  summary: {
    winnerModel: string;
    confidence: number;
    statisticalSignificance: boolean;
    pValue: number;
    effectSize: number;
  };
}

export interface DriftDetectionResult {
  modelId: string;
  timeFrame: string;
  driftDetected: boolean;
  driftScore: number;
  metrics: {
    qualityDrift: number;
    performanceDrift: number;
    outputDrift: number;
    costDrift: number;
  };
  recommendations: string[];
  threshold: number;
}

export class ModelEvaluationFramework extends EventEmitter {
  private registry: ModelRegistry;
  private logger: Logger;
  private goldenDatasets: Map<string, GoldenDatasetEntry[]> = new Map();
  private evaluationHistory: Map<string, EvaluationResult[]> = new Map();
  private runningTests: Map<string, ModelComparison> = new Map();
  private baselineMetrics: Map<string, any> = new Map();

  constructor(registry: ModelRegistry) {
    super();
    this.registry = registry;
    this.logger = new Logger('ModelEvaluation');
    this.initializeDefaultDatasets();
  }

  /**
   * Load or create golden dataset
   */
  async loadGoldenDataset(category: string, entries: GoldenDatasetEntry[]): Promise<void> {
    this.goldenDatasets.set(category, entries);
    this.logger.info(`Golden dataset loaded: ${category} (${entries.length} entries)`);
  }

  /**
   * Evaluate model against golden dataset
   */
  async evaluateModel(
    modelId: string, 
    datasetCategory: string,
    options: {
      sampleSize?: number;
      parallel?: boolean;
      includeDetails?: boolean;
    } = {}
  ): Promise<{
    modelId: string;
    category: string;
    overallScore: number;
    passRate: number;
    results: EvaluationResult[];
    summary: {
      total: number;
      passed: number;
      failed: number;
      averageLatency: number;
      totalCost: number;
    };
  }> {
    const dataset = this.goldenDatasets.get(datasetCategory);
    if (!dataset) {
      throw new Error(`Golden dataset not found: ${datasetCategory}`);
    }

    const model = await this.registry.getModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const { sampleSize = dataset.length, parallel = false } = options;
    const testEntries = this.sampleDataset(dataset, sampleSize);
    
    this.logger.info(`Starting evaluation: ${modelId} on ${datasetCategory} (${testEntries.length} entries)`);

    const results: EvaluationResult[] = [];
    
    if (parallel) {
      const promises = testEntries.map(entry => this.evaluateSingleEntry(model, entry));
      results.push(...await Promise.all(promises));
    } else {
      for (const entry of testEntries) {
        const result = await this.evaluateSingleEntry(model, entry);
        results.push(result);
      }
    }

    // Store results in history
    if (!this.evaluationHistory.has(modelId)) {
      this.evaluationHistory.set(modelId, []);
    }
    this.evaluationHistory.get(modelId)!.push(...results);

    // Calculate summary statistics
    const passed = results.filter(r => r.passed).length;
    const totalLatency = results.reduce((sum, r) => sum + r.metrics.latency, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.metrics.tokenUsage, 0);
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const evaluation = {
      modelId,
      category: datasetCategory,
      overallScore,
      passRate: (passed / results.length) * 100,
      results,
      summary: {
        total: results.length,
        passed,
        failed: results.length - passed,
        averageLatency: totalLatency / results.length,
        totalCost: totalTokens * 0.001 // Simplified cost calculation
      }
    };

    this.emit('evaluationCompleted', evaluation);
    return evaluation;
  }

  /**
   * Run A/B test comparing two models
   */
  async runABTest(
    modelAId: string,
    modelBId: string,
    datasetCategory: string,
    options: {
      sampleSize?: number;
      confidenceLevel?: number;
      minimumEffectSize?: number;
    } = {}
  ): Promise<ModelComparison> {
    const testId = `ab-test-${Date.now()}`;
    const { sampleSize = 100, confidenceLevel = 0.95, minimumEffectSize = 0.1 } = options;

    this.logger.info(`Starting A/B test: ${modelAId} vs ${modelBId} (${testId})`);

    // Run evaluations for both models
    const [resultA, resultB] = await Promise.all([
      this.evaluateModel(modelAId, datasetCategory, { sampleSize }),
      this.evaluateModel(modelBId, datasetCategory, { sampleSize })
    ]);

    // Statistical analysis
    const statsAnalysis = this.performStatisticalAnalysis(
      resultA.results,
      resultB.results,
      confidenceLevel,
      minimumEffectSize
    );

    const comparison: ModelComparison = {
      modelA: modelAId,
      modelB: modelBId,
      testId,
      results: {
        modelA: resultA.results,
        modelB: resultB.results
      },
      summary: {
        winnerModel: statsAnalysis.winner,
        confidence: statsAnalysis.confidence,
        statisticalSignificance: statsAnalysis.significant,
        pValue: statsAnalysis.pValue,
        effectSize: statsAnalysis.effectSize
      }
    };

    this.runningTests.set(testId, comparison);
    this.emit('abTestCompleted', comparison);
    return comparison;
  }

  /**
   * Detect model drift
   */
  async detectDrift(
    modelId: string,
    timeFrameHours: number = 24,
    threshold: number = 0.1
  ): Promise<DriftDetectionResult> {
    const model = await this.registry.getModel(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const cutoffTime = new Date(Date.now() - (timeFrameHours * 60 * 60 * 1000));
    const recentResults = this.evaluationHistory.get(modelId)?.filter(
      r => r.timestamp >= cutoffTime
    ) || [];

    if (recentResults.length < 10) {
      this.logger.warn(`Insufficient data for drift detection: ${modelId} (${recentResults.length} results)`);
    }

    // Get baseline metrics
    const baseline = this.baselineMetrics.get(modelId) || this.calculateBaseline(modelId);
    
    // Calculate current metrics
    const currentMetrics = this.calculateMetrics(recentResults);
    
    // Calculate drift scores
    const qualityDrift = Math.abs(currentMetrics.averageScore - baseline.averageScore) / baseline.averageScore;
    const performanceDrift = Math.abs(currentMetrics.averageLatency - baseline.averageLatency) / baseline.averageLatency;
    const outputDrift = this.calculateOutputDrift(recentResults, baseline.outputPatterns);
    const costDrift = Math.abs(currentMetrics.averageCost - baseline.averageCost) / baseline.averageCost;

    const overallDriftScore = (qualityDrift + performanceDrift + outputDrift + costDrift) / 4;
    const driftDetected = overallDriftScore > threshold;

    const recommendations = [];
    if (qualityDrift > threshold) {
      recommendations.push('Quality degradation detected - review model training data');
    }
    if (performanceDrift > threshold) {
      recommendations.push('Performance degradation detected - check model infrastructure');
    }
    if (outputDrift > threshold) {
      recommendations.push('Output pattern drift detected - validate model behavior');
    }
    if (costDrift > threshold) {
      recommendations.push('Cost drift detected - review token usage patterns');
    }

    const driftResult: DriftDetectionResult = {
      modelId,
      timeFrame: `${timeFrameHours}h`,
      driftDetected,
      driftScore: overallDriftScore,
      metrics: {
        qualityDrift,
        performanceDrift,
        outputDrift,
        costDrift
      },
      recommendations,
      threshold
    };

    if (driftDetected) {
      this.emit('driftDetected', driftResult);
      this.logger.warn(`Model drift detected: ${modelId} (score: ${overallDriftScore.toFixed(3)})`);
    }

    return driftResult;
  }

  /**
   * Continuous monitoring for all active models
   */
  async startContinuousMonitoring(intervalMinutes: number = 60): Promise<void> {
    this.logger.info(`Starting continuous drift monitoring (interval: ${intervalMinutes}m)`);
    
    setInterval(async () => {
      try {
        const activeModels = await this.registry.getModelsByCriteria({ status: 'active' });
        
        for (const model of activeModels) {
          try {
            await this.detectDrift(model.id);
          } catch (error) {
            this.logger.error(`Drift detection failed for model ${model.id}`, error as Error);
          }
        }
      } catch (error) {
        this.logger.error('Continuous monitoring error', error as Error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Benchmark model performance
   */
  async benchmarkModel(
    modelId: string,
    benchmarkSuite: string = 'standard'
  ): Promise<{
    modelId: string;
    suite: string;
    scores: Record<string, number>;
    ranking: number;
    recommendations: string[];
  }> {
    const benchmarkDatasets = this.getBenchmarkDatasets(benchmarkSuite);
    const scores: Record<string, number> = {};

    for (const [category, dataset] of Object.entries(benchmarkDatasets)) {
      const result = await this.evaluateModel(modelId, category, { sampleSize: 50 });
      scores[category] = result.overallScore;
    }

    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    const ranking = await this.calculateModelRanking(modelId, overallScore);
    const recommendations = this.generateBenchmarkRecommendations(scores);

    return {
      modelId,
      suite: benchmarkSuite,
      scores,
      ranking,
      recommendations
    };
  }

  /**
   * Generate evaluation report
   */
  async generateEvaluationReport(
    modelId: string,
    timeFrameHours: number = 168 // 1 week
  ): Promise<{
    modelId: string;
    timeFrame: string;
    summary: any;
    trends: any;
    recommendations: string[];
  }> {
    const cutoffTime = new Date(Date.now() - (timeFrameHours * 60 * 60 * 1000));
    const results = this.evaluationHistory.get(modelId)?.filter(
      r => r.timestamp >= cutoffTime
    ) || [];

    const summary = this.calculateMetrics(results);
    const trends = this.calculateTrends(results);
    const recommendations = this.generateRecommendations(summary, trends);

    return {
      modelId,
      timeFrame: `${timeFrameHours}h`,
      summary,
      trends,
      recommendations
    };
  }

  /**
   * Private helper methods
   */

  private async evaluateSingleEntry(
    model: ModelMetadata,
    entry: GoldenDatasetEntry
  ): Promise<EvaluationResult> {
    const startTime = Date.now();

    try {
      // Create mock request (in real implementation, would call actual model)
      const mockResponse = await this.callModel(model, entry.prompt);
      const latency = Date.now() - startTime;

      // Evaluate response against criteria
      const similarity = this.calculateSimilarity(mockResponse.content, entry.expectedOutput);
      const semanticScore = this.calculateSemanticScore(mockResponse.content, entry.expectedOutput);
      const factualScore = entry.evaluationCriteria.factualAccuracy ? 
        this.calculateFactualAccuracy(mockResponse.content, entry.expectedOutput) : 1.0;
      const brandScore = entry.evaluationCriteria.brandConsistency ?
        this.calculateBrandConsistency(mockResponse.content) : 1.0;

      const overallScore = (similarity + semanticScore + factualScore + brandScore) / 4;
      const passed = overallScore >= entry.evaluationCriteria.similarity;

      return {
        entryId: entry.id,
        modelId: model.id,
        score: overallScore,
        passed,
        metrics: {
          similarity,
          semanticScore,
          factualScore,
          brandScore,
          latency,
          tokenUsage: mockResponse.usage.totalTokens
        },
        response: mockResponse.content,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        entryId: entry.id,
        modelId: model.id,
        score: 0,
        passed: false,
        metrics: {
          similarity: 0,
          semanticScore: 0,
          factualScore: 0,
          brandScore: 0,
          latency: Date.now() - startTime,
          tokenUsage: 0
        },
        response: `Error: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private async callModel(model: ModelMetadata, prompt: string): Promise<any> {
    // Mock implementation - in real system would call actual model API
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    const responseLength = Math.floor(Math.random() * 200 + 50);
    const content = `Generated response for: ${prompt.substring(0, 50)}...`.padEnd(responseLength, ' ');
    
    return {
      content,
      usage: {
        promptTokens: Math.floor(prompt.length / 4),
        completionTokens: Math.floor(content.length / 4),
        totalTokens: Math.floor((prompt.length + content.length) / 4)
      }
    };
  }

  private calculateSimilarity(response: string, expected: string): number {
    // Simple similarity calculation (would use more sophisticated metrics in production)
    const responseWords = response.toLowerCase().split(/\s+/);
    const expectedWords = expected.toLowerCase().split(/\s+/);
    const commonWords = responseWords.filter(word => expectedWords.includes(word));
    return commonWords.length / Math.max(responseWords.length, expectedWords.length);
  }

  private calculateSemanticScore(response: string, expected: string): number {
    // Mock semantic similarity (would use embedding-based similarity in production)
    return Math.random() * 0.3 + 0.7; // Between 0.7 and 1.0
  }

  private calculateFactualAccuracy(response: string, expected: string): number {
    // Mock factual accuracy check
    return Math.random() * 0.2 + 0.8; // Between 0.8 and 1.0
  }

  private calculateBrandConsistency(response: string): number {
    // Mock brand consistency check
    return Math.random() * 0.15 + 0.85; // Between 0.85 and 1.0
  }

  private sampleDataset(dataset: GoldenDatasetEntry[], sampleSize: number): GoldenDatasetEntry[] {
    if (sampleSize >= dataset.length) {
      return [...dataset];
    }
    
    // Random sampling
    const shuffled = [...dataset].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, sampleSize);
  }

  private performStatisticalAnalysis(
    resultsA: EvaluationResult[],
    resultsB: EvaluationResult[],
    confidenceLevel: number,
    minimumEffectSize: number
  ) {
    const scoresA = resultsA.map(r => r.score);
    const scoresB = resultsB.map(r => r.score);
    
    const meanA = scoresA.reduce((sum, score) => sum + score, 0) / scoresA.length;
    const meanB = scoresB.reduce((sum, score) => sum + score, 0) / scoresB.length;
    
    // Simplified statistical test (would use proper t-test in production)
    const pooledStd = Math.sqrt(
      (this.variance(scoresA) + this.variance(scoresB)) / 2
    );
    const effectSize = Math.abs(meanA - meanB) / pooledStd;
    const pValue = this.calculatePValue(scoresA, scoresB);
    
    const significant = pValue < (1 - confidenceLevel) && effectSize >= minimumEffectSize;
    const winner = meanA > meanB ? 'modelA' : 'modelB';
    const confidence = Math.max(0, Math.min(1, 1 - pValue));

    return {
      winner,
      confidence,
      significant,
      pValue,
      effectSize
    };
  }

  private variance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
  }

  private calculatePValue(scoresA: number[], scoresB: number[]): number {
    // Simplified p-value calculation (would use proper statistical test)
    return Math.random() * 0.1; // Mock p-value between 0 and 0.1
  }

  private calculateBaseline(modelId: string): any {
    const allResults = this.evaluationHistory.get(modelId) || [];
    if (allResults.length === 0) {
      return {
        averageScore: 0.5,
        averageLatency: 1000,
        averageCost: 0.01,
        outputPatterns: {}
      };
    }

    return this.calculateMetrics(allResults.slice(0, Math.min(100, allResults.length)));
  }

  private calculateMetrics(results: EvaluationResult[]): any {
    if (results.length === 0) {
      return {
        averageScore: 0,
        averageLatency: 0,
        averageCost: 0,
        passRate: 0,
        outputPatterns: {}
      };
    }

    return {
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      averageLatency: results.reduce((sum, r) => sum + r.metrics.latency, 0) / results.length,
      averageCost: results.reduce((sum, r) => sum + r.metrics.tokenUsage * 0.001, 0) / results.length,
      passRate: results.filter(r => r.passed).length / results.length,
      outputPatterns: this.extractOutputPatterns(results)
    };
  }

  private calculateOutputDrift(results: EvaluationResult[], baselinePatterns: any): number {
    const currentPatterns = this.extractOutputPatterns(results);
    // Simplified drift calculation (would use more sophisticated pattern analysis)
    return Math.random() * 0.1; // Mock drift score
  }

  private extractOutputPatterns(results: EvaluationResult[]): any {
    // Extract patterns from model outputs (simplified)
    const lengths = results.map(r => r.response.length);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    
    return {
      averageLength: avgLength,
      lengthVariance: this.variance(lengths),
      commonWords: this.extractCommonWords(results.map(r => r.response))
    };
  }

  private extractCommonWords(responses: string[]): string[] {
    const wordCounts: Record<string, number> = {};
    responses.forEach(response => {
      const words = response.toLowerCase().split(/\s+/);
      words.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });

    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private calculateTrends(results: EvaluationResult[]): any {
    // Calculate trends over time (simplified)
    const timeGroups = this.groupByTimeWindow(results, 24); // 24 hour windows
    const trendData = timeGroups.map(group => ({
      timestamp: group.timestamp,
      averageScore: group.results.reduce((sum: number, r: any) => sum + r.score, 0) / group.results.length,
      count: group.results.length
    }));

    return {
      scoretrend: this.calculateTrendDirection(trendData.map(d => d.averageScore)),
      volumeTrend: this.calculateTrendDirection(trendData.map(d => d.count)),
      data: trendData
    };
  }

  private groupByTimeWindow(results: EvaluationResult[], windowHours: number): any[] {
    const windows: Record<string, EvaluationResult[]> = {};
    
    results.forEach(result => {
      const windowStart = new Date(Math.floor(result.timestamp.getTime() / (windowHours * 60 * 60 * 1000)) * windowHours * 60 * 60 * 1000);
      const key = windowStart.toISOString();
      
      if (!windows[key]) {
        windows[key] = [];
      }
      windows[key].push(result);
    });

    return Object.entries(windows).map(([timestamp, windowResults]) => ({
      timestamp,
      results: windowResults
    }));
  }

  private calculateTrendDirection(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private generateRecommendations(summary: any, trends: any): string[] {
    const recommendations: string[] = [];
    
    if (summary.passRate < 0.8) {
      recommendations.push('Pass rate below 80% - consider model retraining or parameter tuning');
    }
    
    if (summary.averageLatency > 5000) {
      recommendations.push('High latency detected - optimize model inference or infrastructure');
    }
    
    if (trends.scoretrend === 'decreasing') {
      recommendations.push('Quality trend declining - investigate recent changes');
    }
    
    if (trends.volumeTrend === 'increasing') {
      recommendations.push('Request volume increasing - consider scaling infrastructure');
    }

    return recommendations;
  }

  private getBenchmarkDatasets(suite: string): Record<string, any> {
    // Return predefined benchmark datasets
    return {
      'reasoning': {},
      'creativity': {},
      'factual-accuracy': {},
      'safety': {}
    };
  }

  private async calculateModelRanking(modelId: string, score: number): Promise<number> {
    // Calculate ranking among all models (simplified)
    return Math.floor(Math.random() * 10) + 1; // Mock ranking 1-10
  }

  private generateBenchmarkRecommendations(scores: Record<string, number>): string[] {
    const recommendations: string[] = [];
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score < 0.7) {
        recommendations.push(`Low performance in ${category} - consider specialized training`);
      }
    });

    return recommendations;
  }

  private initializeDefaultDatasets(): void {
    // Initialize with sample golden datasets
    const creativityDataset: GoldenDatasetEntry[] = [
      {
        id: 'creativity-001',
        prompt: 'Create a compelling marketing message for a new eco-friendly product',
        expectedOutput: 'Join the green revolution with our innovative eco-friendly solution...',
        metadata: {
          category: 'creativity',
          difficulty: 'medium',
          agentType: 'creative',
          tags: ['marketing', 'eco-friendly']
        },
        evaluationCriteria: {
          similarity: 0.7,
          semanticMatch: true,
          factualAccuracy: true,
          brandConsistency: true
        }
      }
    ];

    this.loadGoldenDataset('creativity', creativityDataset);
    this.logger.info('Default golden datasets initialized');
  }
}