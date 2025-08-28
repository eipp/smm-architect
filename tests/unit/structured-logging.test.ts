import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StructuredLogger } from '../../services/shared/src/logging/structured-logger';

// Mock Sentry
const mockSentry = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn()
};

jest.mock('@sentry/node', () => mockSentry);

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let mockConsole: any;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      info: jest.fn()
    };
    
    // Replace global console
    global.console = mockConsole as any;
    
    logger = new StructuredLogger({
      serviceName: 'test-service',
      version: '1.0.0-test',
      environment: 'test',
      logLevel: 'debug',
      enableSentry: true,
      enablePiiMasking: true,
      enableCorrelationId: true
    });

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (logger) {
      logger.shutdown();
    }
  });

  describe('Basic Logging Functionality', () => {
    it('should log messages at different levels', () => {
      logger.debug('Debug message', { key: 'value' });
      logger.info('Info message', { key: 'value' });
      logger.warn('Warning message', { key: 'value' });
      logger.error('Error message', { key: 'value' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('Info message')
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message')
      );
    });

    it('should include service metadata in all log entries', () => {
      logger.info('Test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('"service":"test-service"')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('"version":"1.0.0-test"')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('"environment":"test"')
      );
    });

    it('should respect log level configuration', () => {
      const warnLogger = new StructuredLogger({
        serviceName: 'test-service',
        logLevel: 'warn'
      });

      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warning message');

      // Debug and info should not be logged
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning message')
      );

      warnLogger.shutdown();
    });

    it('should format structured data as JSON', () => {
      const structuredData = {
        userId: 'user123',
        action: 'login',
        timestamp: '2024-01-01T00:00:00Z'
      };

      logger.info('User action', structuredData);

      const logCall = mockConsole.info.mock.calls[0][0];
      const logObject = JSON.parse(logCall);
      
      expect(logObject.message).toBe('User action');
      expect(logObject.userId).toBe('user123');
      expect(logObject.action).toBe('login');
    });
  });

  describe('PII Masking', () => {
    it('should mask email addresses', () => {
      const dataWithEmail = {
        userEmail: 'user@example.com',
        contactInfo: 'Contact us at support@company.com'
      };

      logger.info('Processing user data', dataWithEmail);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[EMAIL_MASKED]');
      expect(logCall).not.toContain('user@example.com');
      expect(logCall).not.toContain('support@company.com');
    });

    it('should mask phone numbers', () => {
      const dataWithPhone = {
        phoneNumber: '+1-555-123-4567',
        alternateContact: 'Call (555) 987-6543 for support',
        intlPhone: '+44 20 7946 0958'
      };

      logger.info('Processing contact data', dataWithPhone);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[PHONE_MASKED]');
      expect(logCall).not.toContain('555-123-4567');
      expect(logCall).not.toContain('555) 987-6543');
      expect(logCall).not.toContain('20 7946 0958');
    });

    it('should mask API keys and secrets', () => {
      const dataWithSecrets = {
        apiKey: 'sk-1234567890abcdef1234567890abcdef',
        secret: 'secret_key_abcdef123456',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
        password: 'MySecretPassword123!',
        accessToken: 'ghp_1234567890abcdef1234567890abcdef12345678'
      };

      logger.info('API configuration', dataWithSecrets);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[SECRET_MASKED]');
      expect(logCall).not.toContain('sk-1234567890abcdef');
      expect(logCall).not.toContain('secret_key_abcdef123456');
      expect(logCall).not.toContain('MySecretPassword123!');
      expect(logCall).not.toContain('ghp_1234567890abcdef');
    });

    it('should mask credit card numbers', () => {
      const dataWithCreditCard = {
        cardNumber: '4532-1234-5678-9012',
        ccNumber: '4532123456789012',
        paymentMethod: 'Card ending in 9012'
      };

      logger.info('Processing payment', dataWithCreditCard);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[CREDIT_CARD_MASKED]');
      expect(logCall).not.toContain('4532-1234-5678-9012');
      expect(logCall).not.toContain('4532123456789012');
    });

    it('should mask social security numbers', () => {
      const dataWithSSN = {
        ssn: '123-45-6789',
        socialSecurity: '987654321',
        taxId: '12-3456789'
      };

      logger.info('Tax information', dataWithSSN);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[SSN_MASKED]');
      expect(logCall).not.toContain('123-45-6789');
      expect(logCall).not.toContain('987654321');
    });

    it('should handle nested objects with PII', () => {
      const nestedData = {
        user: {
          id: 'user123',
          profile: {
            email: 'user@example.com',
            phone: '+1-555-123-4567'
          }
        },
        settings: {
          apiKey: 'sk-1234567890abcdef'
        }
      };

      logger.info('Complex user data', nestedData);

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[EMAIL_MASKED]');
      expect(logCall).toContain('[PHONE_MASKED]');
      expect(logCall).toContain('[SECRET_MASKED]');
      expect(logCall).toContain('user123'); // Non-PII should remain
    });

    it('should allow disabling PII masking', () => {
      const unmaskedLogger = new StructuredLogger({
        serviceName: 'test-service',
        enablePiiMasking: false
      });

      unmaskedLogger.info('User data', { email: 'user@example.com' });

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('user@example.com');
      expect(logCall).not.toContain('[EMAIL_MASKED]');

      unmaskedLogger.shutdown();
    });
  });

  describe('Correlation ID Management', () => {
    it('should generate and include correlation IDs', () => {
      logger.info('Request started');
      logger.info('Processing data');

      const log1 = JSON.parse(mockConsole.info.mock.calls[0][0]);
      const log2 = JSON.parse(mockConsole.info.mock.calls[1][0]);

      expect(log1.correlationId).toBeDefined();
      expect(log2.correlationId).toBeDefined();
      expect(log1.correlationId).toBe(log2.correlationId);
    });

    it('should use provided correlation ID', () => {
      const customCorrelationId = 'custom-correlation-123';
      
      logger.setCorrelationId(customCorrelationId);
      logger.info('Custom correlation test');

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.correlationId).toBe(customCorrelationId);
    });

    it('should extract correlation ID from request headers', () => {
      const mockRequest = {
        headers: {
          'x-correlation-id': 'header-correlation-456'
        }
      };

      logger.setCorrelationIdFromRequest(mockRequest);
      logger.info('Header correlation test');

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.correlationId).toBe('header-correlation-456');
    });

    it('should support W3C trace context', () => {
      const mockRequest = {
        headers: {
          'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
        }
      };

      logger.setCorrelationIdFromRequest(mockRequest);
      logger.info('W3C trace test');

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(logCall.spanId).toBe('00f067aa0ba902b7');
    });

    it('should clear correlation ID', () => {
      logger.setCorrelationId('test-correlation');
      logger.info('With correlation');
      
      logger.clearCorrelationId();
      logger.info('Without correlation');

      const log1 = JSON.parse(mockConsole.info.mock.calls[0][0]);
      const log2 = JSON.parse(mockConsole.info.mock.calls[1][0]);

      expect(log1.correlationId).toBe('test-correlation');
      expect(log2.correlationId).toBeUndefined();
    });
  });

  describe('Sentry Integration', () => {
    it('should send errors to Sentry', () => {
      const error = new Error('Test error');
      const context = { userId: 'user123' };

      logger.error('Application error occurred', { error, ...context });

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: expect.any(Object),
          contexts: expect.any(Object)
        })
      );
    });

    it('should send warning messages to Sentry', () => {
      logger.warn('Performance degradation detected', { 
        responseTime: 5000,
        endpoint: '/api/models'
      });

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Performance degradation detected',
        'warning',
        expect.any(Object)
      );
    });

    it('should add breadcrumbs for info messages', () => {
      logger.info('User login attempt', { userId: 'user123' });

      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User login attempt',
        level: 'info',
        data: expect.objectContaining({
          userId: 'user123'
        }),
        timestamp: expect.any(Number)
      });
    });

    it('should set user context from logger data', () => {
      logger.setUserContext({
        id: 'user123',
        tenantId: 'tenant456',
        email: '[EMAIL_MASKED]'
      });

      logger.info('User action performed');

      expect(mockSentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        tenantId: 'tenant456',
        email: '[EMAIL_MASKED]'
      });
    });

    it('should apply correlation ID as Sentry tag', () => {
      logger.setCorrelationId('sentry-correlation-789');
      logger.error('Error with correlation', { error: new Error('Test') });

      expect(mockSentry.setTag).toHaveBeenCalledWith(
        'correlationId',
        'sentry-correlation-789'
      );
    });

    it('should handle Sentry errors gracefully', () => {
      mockSentry.captureException.mockImplementationOnce(() => {
        throw new Error('Sentry is down');
      });

      // Should not throw even if Sentry fails
      expect(() => {
        logger.error('Test error', { error: new Error('Original error') });
      }).not.toThrow();
    });

    it('should respect Sentry sampling configuration', () => {
      // Create logger with specific sampling rate
      const sampledLogger = new StructuredLogger({
        serviceName: 'test-service',
        enableSentry: true,
        sentrySampleRate: 0.1 // 10% sampling
      });

      // Mock Math.random to control sampling
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.5); // Above threshold

      sampledLogger.error('Sampled error', { error: new Error('Test') });

      // Should not capture due to sampling
      expect(mockSentry.captureException).not.toHaveBeenCalled();

      Math.random = originalRandom;
      sampledLogger.shutdown();
    });
  });

  describe('Audit Logging', () => {
    it('should create audit entries for sensitive operations', () => {
      logger.audit('user.login', {
        userId: 'user123',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.auditEvent).toBe('user.login');
      expect(logCall.userId).toBe('user123');
      expect(logCall.level).toBe('audit');
    });

    it('should mask PII in audit logs', () => {
      logger.audit('payment.processed', {
        userId: 'user123',
        cardNumber: '4532-1234-5678-9012',
        amount: 99.99
      });

      const logCall = mockConsole.info.mock.calls[0][0];
      expect(logCall).toContain('[CREDIT_CARD_MASKED]');
      expect(logCall).not.toContain('4532-1234-5678-9012');
      expect(logCall).toContain('user123'); // Non-PII preserved
      expect(logCall).toContain('99.99'); // Non-PII preserved
    });

    it('should include mandatory audit fields', () => {
      logger.audit('data.access', {
        resourceId: 'workspace123',
        action: 'read'
      });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.timestamp).toBeDefined();
      expect(logCall.service).toBe('test-service');
      expect(logCall.auditEvent).toBe('data.access');
      expect(logCall.correlationId).toBeDefined();
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      logger.performance('api.request', {
        endpoint: '/api/models/complete',
        method: 'POST',
        duration: 1250,
        statusCode: 200
      });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.performanceEvent).toBe('api.request');
      expect(logCall.duration).toBe(1250);
      expect(logCall.level).toBe('performance');
    });

    it('should calculate timing automatically', async () => {
      const timer = logger.startTimer('database.query');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 50));
      
      timer.end({ query: 'SELECT * FROM users', rowCount: 5 });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.performanceEvent).toBe('database.query');
      expect(logCall.duration).toBeGreaterThan(45); // Account for timing variance
      expect(logCall.query).toBe('SELECT * FROM users');
    });
  });

  describe('Context Management', () => {
    it('should maintain request context across operations', () => {
      logger.setContext({
        requestId: 'req123',
        tenantId: 'tenant456',
        userId: 'user789'
      });

      logger.info('First operation');
      logger.warn('Second operation');

      const log1 = JSON.parse(mockConsole.info.mock.calls[0][0]);
      const log2 = JSON.parse(mockConsole.warn.mock.calls[0][0]);

      expect(log1.requestId).toBe('req123');
      expect(log1.tenantId).toBe('tenant456');
      expect(log2.requestId).toBe('req123');
      expect(log2.tenantId).toBe('tenant456');
    });

    it('should clear context when needed', () => {
      logger.setContext({ sessionId: 'session123' });
      logger.info('With context');

      logger.clearContext();
      logger.info('Without context');

      const log1 = JSON.parse(mockConsole.info.mock.calls[0][0]);
      const log2 = JSON.parse(mockConsole.info.mock.calls[1][0]);

      expect(log1.sessionId).toBe('session123');
      expect(log2.sessionId).toBeUndefined();
    });

    it('should merge context with log data', () => {
      logger.setContext({ tenantId: 'tenant123' });
      logger.info('Operation completed', { operationId: 'op456' });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.tenantId).toBe('tenant123');
      expect(logCall.operationId).toBe('op456');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle circular references in log data', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        logger.info('Circular reference test', { data: circularObj });
      }).not.toThrow();

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle undefined and null values', () => {
      logger.info('Null test', {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        zero: 0
      });

      const logCall = JSON.parse(mockConsole.info.mock.calls[0][0]);
      expect(logCall.nullValue).toBeNull();
      expect(logCall.undefinedValue).toBeUndefined();
      expect(logCall.emptyString).toBe('');
      expect(logCall.zero).toBe(0);
    });

    it('should continue logging even if formatting fails', () => {
      const problematicData = {
        toString: () => { throw new Error('ToString failed'); }
      };

      expect(() => {
        logger.info('Problematic data', { data: problematicData });
      }).not.toThrow();

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('should handle very large log messages', () => {
      const largeMessage = 'x'.repeat(10000);
      const largeData = { largeField: 'y'.repeat(50000) };

      expect(() => {
        logger.info(largeMessage, largeData);
      }).not.toThrow();

      expect(mockConsole.info).toHaveBeenCalled();
    });
  });
});