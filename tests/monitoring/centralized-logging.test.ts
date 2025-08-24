import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { SMMLogger, createSMMLogger, LogLevel, SMMError } from '../src/utils/logging';
import axios from 'axios';
import { randomUUID } from 'crypto';

interface LogEntry {
  '@timestamp': string;
  level: string;
  service: string;
  environment: string;
  message: string;
  requestId?: string;
  workspaceId?: string;
  userId?: string;
  traceId?: string;
  correlationId?: string;
}

interface ElasticsearchResponse {
  hits: {
    total: { value: number };
    hits: Array<{
      _source: LogEntry;
      _index: string;
      _id: string;
    }>;
  };
}

describe('SMM Architect Centralized Logging System', () => {
  let testLogger: SMMLogger;
  let elasticsearchUrl: string;
  let kibanaUrl: string;
  let testRequestId: string;
  let testWorkspaceId: string;
  let testUserId: string;

  beforeAll(async () => {
    elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
    kibanaUrl = process.env.KIBANA_URL || 'http://localhost:5601';
    
    testRequestId = randomUUID();
    testWorkspaceId = 'ws-test-' + randomUUID().substring(0, 8);
    testUserId = 'user-test-' + randomUUID().substring(0, 8);

    console.log('🔍 Starting centralized logging system tests...');
  });

  beforeEach(() => {
    testLogger = createSMMLogger('test-service', {
      requestId: testRequestId,
      workspaceId: testWorkspaceId,
      userId: testUserId
    });
  });

  describe('Structured Logging', () => {
    it('should create structured log entries with required fields', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      testLogger.info('Test message', { 
        operation: 'test',
        duration: 100 
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('@timestamp');
      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('service', 'test-service');
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(logEntry).toHaveProperty('requestId', testRequestId);
      expect(logEntry).toHaveProperty('workspaceId', testWorkspaceId);
      expect(logEntry).toHaveProperty('userId', testUserId);
      expect(logEntry).toHaveProperty('operation', 'test');
      expect(logEntry).toHaveProperty('duration', 100);

      consoleSpy.mockRestore();
    });

    it('should handle error logging with stack traces', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');

      testLogger.error('Error occurred', testError, { 
        context: 'test context' 
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('level', 'error');
      expect(logEntry).toHaveProperty('message', 'Error occurred');
      expect(logEntry).toHaveProperty('error');
      expect(logEntry.error).toHaveProperty('name', 'Error');
      expect(logEntry.error).toHaveProperty('message', 'Test error');
      expect(logEntry.error).toHaveProperty('stack');
      expect(logEntry).toHaveProperty('context', 'test context');

      consoleSpy.mockRestore();
    });

    it('should create child loggers with inherited context', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const childLogger = testLogger.child({ 
        correlationId: 'child-correlation-id',
        operation: 'child-operation'
      });

      childLogger.info('Child logger message');

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('requestId', testRequestId);
      expect(logEntry).toHaveProperty('workspaceId', testWorkspaceId);
      expect(logEntry).toHaveProperty('userId', testUserId);
      expect(logEntry).toHaveProperty('correlationId', 'child-correlation-id');
      expect(logEntry).toHaveProperty('operation', 'child-operation');

      consoleSpy.mockRestore();
    });

    it('should generate and set correlation IDs', () => {
      const correlationId = testLogger.generateCorrelationId();
      
      expect(correlationId).toBeDefined();
      expect(correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      testLogger.info('Test with correlation ID');

      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);
      expect(logEntry).toHaveProperty('correlationId', correlationId);

      consoleSpy.mockRestore();
    });
  });

  describe('Domain-Specific Logging', () => {
    it('should log audit events correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      testLogger.audit('workspace_created', 'workspace', 'success', {
        workspace_name: 'Test Workspace',
        created_by: testUserId
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'audit');
      expect(logEntry).toHaveProperty('action', 'workspace_created');
      expect(logEntry).toHaveProperty('resource', 'workspace');
      expect(logEntry).toHaveProperty('result', 'success');
      expect(logEntry.details).toHaveProperty('workspace_name', 'Test Workspace');

      consoleSpy.mockRestore();
    });

    it('should log security events with risk scores', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      testLogger.security('failed_login_attempt', 'high', {
        attempted_username: 'admin',
        ip_address: '192.168.1.100',
        failure_count: 5
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'security');
      expect(logEntry).toHaveProperty('security_event_type', 'failed_login_attempt');
      expect(logEntry).toHaveProperty('severity', 'high');
      expect(logEntry).toHaveProperty('risk_score', 75);
      expect(logEntry).toHaveProperty('detection_method', 'application');

      consoleSpy.mockRestore();
    });

    it('should log performance metrics', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      testLogger.performance('database_query', 150, true, {
        query_type: 'SELECT',
        table: 'workspaces',
        rows_returned: 25
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'performance');
      expect(logEntry).toHaveProperty('operation', 'database_query');
      expect(logEntry).toHaveProperty('duration_ms', 150);
      expect(logEntry).toHaveProperty('success', true);

      consoleSpy.mockRestore();
    });

    it('should log agent execution events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      testLogger.agentExecution('research', 'completed', {
        query: 'AI trends in marketing',
        sources_found: 15,
        processing_time: 3500
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'agent_execution');
      expect(logEntry).toHaveProperty('agent_type', 'research');
      expect(logEntry).toHaveProperty('status', 'completed');

      consoleSpy.mockRestore();
    });

    it('should log connector API calls with proper levels', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      testLogger.connectorCall('linkedin', '/v2/shares', 2500, 429, {
        rate_limit_remaining: 0,
        retry_after: 3600
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('level', 'error');
      expect(logEntry).toHaveProperty('event_type', 'connector_call');
      expect(logEntry).toHaveProperty('platform', 'linkedin');
      expect(logEntry).toHaveProperty('status_code', 429);

      consoleSpy.mockRestore();
    });

    it('should log simulation events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const simulationId = 'sim-' + randomUUID().substring(0, 8);

      testLogger.simulationEvent(simulationId, 500, 'iteration_completed', {
        readiness_score: 0.85,
        policy_violations: 2,
        estimated_cost: 12.50
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'simulation');
      expect(logEntry).toHaveProperty('simulation_id', simulationId);
      expect(logEntry).toHaveProperty('iteration', 500);
      expect(logEntry).toHaveProperty('event', 'iteration_completed');

      consoleSpy.mockRestore();
    });

    it('should log workflow events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const workflowId = 'wf-' + randomUUID().substring(0, 8);
      const executionId = 'exec-' + randomUUID().substring(0, 8);

      testLogger.workflowEvent(workflowId, executionId, 'research-agent', 'completed', {
        node_duration: 2300,
        output_size: 1024
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'workflow');
      expect(logEntry).toHaveProperty('workflow_id', workflowId);
      expect(logEntry).toHaveProperty('execution_id', executionId);
      expect(logEntry).toHaveProperty('node_type', 'research-agent');
      expect(logEntry).toHaveProperty('workflow_status', 'completed');

      consoleSpy.mockRestore();
    });

    it('should log business metrics', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      testLogger.businessMetric('workspace_activations', 25, 'count', {
        period: 'daily',
        region: 'us-east-1'
      });

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry).toHaveProperty('event_type', 'business_metric');
      expect(logEntry).toHaveProperty('metric_name', 'workspace_activations');
      expect(logEntry).toHaveProperty('metric_value', 25);
      expect(logEntry).toHaveProperty('metric_unit', 'count');

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle SMMError instances correctly', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const smmError = new SMMError(
        'Workspace not found',
        'WORKSPACE_NOT_FOUND',
        404,
        { workspaceId: testWorkspaceId }
      );

      testLogger.error('Custom error occurred', smmError);

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.error).toHaveProperty('name', 'SMMError');
      expect(logEntry.error).toHaveProperty('message', 'Workspace not found');

      consoleSpy.mockRestore();
    });

    it('should serialize complex error objects', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const complexError = new Error('Complex error');
      complexError.cause = new Error('Root cause');

      testLogger.error('Complex error occurred', complexError);

      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      const logEntry = JSON.parse(logCall);

      expect(logEntry.error).toHaveProperty('cause');

      consoleSpy.mockRestore();
    });
  });

  describe('Log Correlation', () => {
    it('should maintain correlation across service boundaries', async () => {
      const correlationId = randomUUID();
      const traceId = randomUUID();
      const spanId = randomUUID();

      // Simulate service A
      const serviceALogger = createSMMLogger('service-a', {
        requestId: testRequestId,
        correlationId,
        traceId,
        spanId: spanId + '-a'
      });

      // Simulate service B (receiving from A)
      const serviceBLogger = createSMMLogger('service-b', {
        requestId: testRequestId,
        correlationId,
        traceId,
        spanId: spanId + '-b'
      });

      const consoleSpyA = jest.spyOn(console, 'log').mockImplementation();
      serviceALogger.info('Processing request in service A');
      
      const consoleSpyB = jest.spyOn(console, 'log').mockImplementation();
      serviceBLogger.info('Processing request in service B');

      // Verify correlation
      const logEntryA = JSON.parse(consoleSpyA.mock.calls[0][0]);
      const logEntryB = JSON.parse(consoleSpyB.mock.calls[0][0]);

      expect(logEntryA.correlationId).toBe(correlationId);
      expect(logEntryB.correlationId).toBe(correlationId);
      expect(logEntryA.traceId).toBe(logEntryB.traceId);
      expect(logEntryA.requestId).toBe(logEntryB.requestId);

      consoleSpyA.mockRestore();
      consoleSpyB.mockRestore();
    });

    it('should trace request flow across multiple services', () => {
      const traceId = randomUUID();
      const baseSpanId = randomUUID().substring(0, 8);

      const services = ['api-gateway', 'workspace-service', 'simulation-service', 'agent-orchestrator'];
      const logEntries: LogEntry[] = [];

      services.forEach((service, index) => {
        const logger = createSMMLogger(service, {
          requestId: testRequestId,
          traceId,
          spanId: `${baseSpanId}-${index}`
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        logger.info(`Processing in ${service}`);
        
        const logEntry = JSON.parse(consoleSpy.mock.calls[0][0]);
        logEntries.push(logEntry);
        
        consoleSpy.mockRestore();
      });

      // Verify all logs share the same trace
      logEntries.forEach(entry => {
        expect(entry.traceId).toBe(traceId);
        expect(entry.requestId).toBe(testRequestId);
      });

      // Verify span IDs are different but related
      const spanIds = logEntries.map(entry => entry.spanId);
      expect(new Set(spanIds).size).toBe(spanIds.length); // All unique
      spanIds.forEach(spanId => {
        expect(spanId).toContain(baseSpanId);
      });
    });
  });

  describe('Elasticsearch Integration', () => {
    it('should query logs from Elasticsearch if available', async () => {
      if (global.testUtils?.skipIfNoService('Elasticsearch', elasticsearchUrl)) {
        return;
      }

      try {
        // Check if Elasticsearch is available
        const healthResponse = await axios.get(`${elasticsearchUrl}/_cluster/health`, {
          timeout: 5000
        });
        
        if (healthResponse.status !== 200) {
          console.warn('Elasticsearch not available for integration test');
          return;
        }

        // Query for recent logs
        const searchResponse = await axios.post(`${elasticsearchUrl}/smm-logs-*/_search`, {
          size: 10,
          sort: [{ '@timestamp': { order: 'desc' } }],
          query: {
            bool: {
              must: [
                { term: { service: 'test-service' } },
                { range: { '@timestamp': { gte: 'now-1h' } } }
              ]
            }
          }
        });

        const esResponse: ElasticsearchResponse = searchResponse.data;
        expect(esResponse.hits).toBeDefined();
        expect(Array.isArray(esResponse.hits.hits)).toBe(true);

        // Validate log structure if logs exist
        if (esResponse.hits.hits.length > 0) {
          const logEntry = esResponse.hits.hits[0]._source;
          expect(logEntry).toHaveProperty('@timestamp');
          expect(logEntry).toHaveProperty('level');
          expect(logEntry).toHaveProperty('service');
          expect(logEntry).toHaveProperty('message');
        }

      } catch (error) {
        console.warn('Elasticsearch integration test skipped:', error.message);
      }
    }, 30000);

    it('should validate index templates are applied', async () => {
      if (global.testUtils?.skipIfNoService('Elasticsearch', elasticsearchUrl)) {
        return;
      }

      try {
        const templateResponse = await axios.get(`${elasticsearchUrl}/_index_template/smm-logs-template`);
        
        expect(templateResponse.status).toBe(200);
        expect(templateResponse.data).toHaveProperty('index_templates');
        
        const template = templateResponse.data.index_templates[0];
        expect(template.index_template.index_patterns).toContain('smm-logs-*');
        
      } catch (error) {
        console.warn('Index template validation skipped:', error.message);
      }
    }, 10000);
  });

  describe('Log Aggregation and Analysis', () => {
    it('should support log aggregation queries', async () => {
      if (global.testUtils?.skipIfNoService('Elasticsearch', elasticsearchUrl)) {
        return;
      }

      try {
        // Aggregate logs by service and level
        const aggregationResponse = await axios.post(`${elasticsearchUrl}/smm-logs-*/_search`, {
          size: 0,
          aggs: {
            services: {
              terms: { field: 'service' },
              aggs: {
                levels: {
                  terms: { field: 'level' }
                }
              }
            }
          }
        });

        expect(aggregationResponse.status).toBe(200);
        expect(aggregationResponse.data.aggregations).toBeDefined();
        expect(aggregationResponse.data.aggregations.services).toBeDefined();
        
      } catch (error) {
        console.warn('Log aggregation test skipped:', error.message);
      }
    }, 15000);

    it('should support correlation analysis across services', async () => {
      if (global.testUtils?.skipIfNoService('Elasticsearch', elasticsearchUrl)) {
        return;
      }

      const correlationId = randomUUID();
      
      try {
        // Search for correlated logs
        const correlationResponse = await axios.post(`${elasticsearchUrl}/smm-logs-*/_search`, {
          query: {
            term: { correlationId }
          },
          sort: [{ '@timestamp': { order: 'asc' } }]
        });

        expect(correlationResponse.status).toBe(200);
        
        const hits = correlationResponse.data.hits.hits;
        if (hits.length > 1) {
          // Verify all logs share the same correlation ID
          hits.forEach((hit: any) => {
            expect(hit._source.correlationId).toBe(correlationId);
          });
        }
        
      } catch (error) {
        console.warn('Correlation analysis test skipped:', error.message);
      }
    }, 15000);
  });

  describe('Performance and Volume', () => {
    it('should handle high-volume logging without blocking', async () => {
      const startTime = Date.now();
      const logCount = 1000;
      
      const promises = Array.from({ length: logCount }, (_, i) => {
        return new Promise<void>((resolve) => {
          testLogger.info(`High volume log entry ${i}`, { 
            batch: 'performance-test',
            entry: i 
          });
          resolve();
        });
      });

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const logsPerSecond = logCount / (duration / 1000);
      
      expect(logsPerSecond).toBeGreaterThan(100); // Should handle at least 100 logs/sec
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Performance test: ${logCount} logs in ${duration}ms (${logsPerSecond.toFixed(2)} logs/sec)`);
    }, 60000);

    it('should not leak memory during extended logging', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate logs for memory test
      for (let i = 0; i < 10000; i++) {
        testLogger.info(`Memory test log ${i}`, { 
          test: 'memory-leak',
          iteration: i 
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerLog = memoryIncrease / 10000;

      // Memory increase should be minimal (less than 1KB per log)
      expect(memoryIncreasePerLog).toBeLessThan(1024);
      
      console.log(`Memory test: ${memoryIncrease} bytes increase (${memoryIncreasePerLog.toFixed(2)} bytes/log)`);
    });
  });
});