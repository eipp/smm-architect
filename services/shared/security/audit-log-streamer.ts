/**
 * Audit Log Streaming Service
 * 
 * Provides comprehensive audit logging with streaming capabilities for SIEM integration.
 * Supports multiple output formats and destinations including Elasticsearch, Splunk,
 * syslog, and custom webhooks.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { Logging } from '@google-cloud/logging';
import { logger } from '../utils/logger';

export interface AuditEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  actor: {
    user_id?: string;
    tenant_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
  };
  target: {
    resource_type: string;
    resource_id?: string;
    endpoint?: string;
    method?: string;
  };
  action: string;
  outcome: 'success' | 'failure' | 'unknown';
  details: Record<string, any>;
  metadata: {
    service: string;
    version: string;
    environment: string;
    correlation_id?: string;
  };
}

export interface SIEMConfig {
  enabled: boolean;
  destinations: SIEMDestination[];
  buffer_size: number;
  flush_interval_ms: number;
  retry_attempts: number;
  retry_delay_ms: number;
}

export interface SIEMDestination {
  name: string;
  type: 'elasticsearch' | 'splunk' | 'syslog' | 'webhook' | 'aws_cloudwatch' | 'gcp_logging';
  enabled: boolean;
  config: Record<string, any>;
  filters?: {
    min_severity?: 'low' | 'medium' | 'high' | 'critical';
    event_types?: string[];
    exclude_event_types?: string[];
  };
}

class AuditLogStreamer extends EventEmitter {
  private config: SIEMConfig;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private destinations: Map<string, SIEMDestination> = new Map();
  private deadLetterQueue: Map<string, AuditEvent[]> = new Map();

  constructor(config: SIEMConfig) {
    super();
    this.config = config;
    this.initializeDestinations();
    this.startFlushTimer();
    
    logger.info('Audit log streamer initialized', {
      destinations: config.destinations.length,
      bufferSize: config.buffer_size,
      flushInterval: config.flush_interval_ms
    });
  }

  private initializeDestinations(): void {
    for (const dest of this.config.destinations) {
      if (dest.enabled) {
        this.destinations.set(dest.name, dest);
        logger.info(`SIEM destination enabled: ${dest.name} (${dest.type})`);
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, this.config.flush_interval_ms);
  }

  /**
   * Record an audit event
   */
  async recordEvent(event: Partial<AuditEvent>): Promise<void> {
    const auditEvent: AuditEvent = {
      event_id: event.event_id || this.generateEventId(),
      timestamp: event.timestamp || new Date().toISOString(),
      event_type: event.event_type || 'unknown',
      severity: event.severity || 'medium',
      source: event.source || 'smm-architect',
      actor: event.actor || {},
      target: event.target || { resource_type: 'unknown' },
      action: event.action || 'unknown',
      outcome: event.outcome || 'unknown',
      details: event.details || {},
      metadata: {
        service: process.env.SERVICE_NAME || 'smm-architect',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        correlation_id: event.metadata?.correlation_id || this.generateCorrelationId(),
        ...event.metadata
      }
    };

    // Add to buffer
    this.eventBuffer.push(auditEvent);

    // Emit event for real-time processing
    this.emit('audit_event', auditEvent);

    // Force flush if buffer is full
    if (this.eventBuffer.length >= this.config.buffer_size) {
      await this.flushBuffer();
    }

    // Log high-severity events immediately
    if (auditEvent.severity === 'critical' || auditEvent.severity === 'high') {
      logger.warn('High-severity audit event', {
        eventId: auditEvent.event_id,
        eventType: auditEvent.event_type,
        severity: auditEvent.severity,
        actor: auditEvent.actor,
        action: auditEvent.action,
        outcome: auditEvent.outcome
      });

      // Force immediate delivery for critical events
      if (auditEvent.severity === 'critical') {
        await this.flushBuffer();
      }
    }
  }

  /**
   * Flush buffered events to SIEM destinations
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    logger.debug(`Flushing ${events.length} audit events to SIEM destinations`);

    // Send to each destination
    for (const [name, destination] of this.destinations) {
      try {
        const filteredEvents = this.filterEventsForDestination(events, destination);
        if (filteredEvents.length > 0) {
          await this.sendToDestination(filteredEvents, destination);
        }
      } catch (error) {
        logger.error(`Failed to send audit events to ${name}`, {
          error: error instanceof Error ? error.message : String(error),
          destination: name,
          eventCount: events.length
        });

        // Re-queue events for retry (optional)
        if (this.config.retry_attempts > 0) {
          this.retryFailedEvents(events, destination);
        }
      }
    }
  }

  /**
   * Filter events based on destination configuration
   */
  private filterEventsForDestination(events: AuditEvent[], destination: SIEMDestination): AuditEvent[] {
    if (!destination.filters) {
      return events;
    }

    return events.filter(event => {
      // Filter by minimum severity
      if (destination.filters?.min_severity) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const minLevel = severityLevels[destination.filters.min_severity];
        const eventLevel = severityLevels[event.severity];
        if (eventLevel < minLevel) {
          return false;
        }
      }

      // Filter by event types
      if (destination.filters?.event_types && 
          !destination.filters.event_types.includes(event.event_type)) {
        return false;
      }

      // Exclude specific event types
      if (destination.filters?.exclude_event_types && 
          destination.filters.exclude_event_types.includes(event.event_type)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Send events to a specific SIEM destination
   */
  private async sendToDestination(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    switch (destination.type) {
      case 'elasticsearch':
        await this.sendToElasticsearch(events, destination);
        break;
      case 'splunk':
        await this.sendToSplunk(events, destination);
        break;
      case 'syslog':
        await this.sendToSyslog(events, destination);
        break;
      case 'webhook':
        await this.sendToWebhook(events, destination);
        break;
      case 'aws_cloudwatch':
        await this.sendToCloudWatch(events, destination);
        break;
      case 'gcp_logging':
        await this.sendToGCPLogging(events, destination);
        break;
      default:
        throw new Error(`Unsupported destination type: ${destination.type}`);
    }
  }

  /**
   * Send events to Elasticsearch
   */
  private async sendToElasticsearch(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const axios = require('axios');
    const { url, index, username, password } = destination.config;

    const bulkBody = events.flatMap(event => [
      { index: { _index: index } },
      event
    ]);

    await axios.post(`${url}/_bulk`, bulkBody.map(JSON.stringify).join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Authorization': username && password ? 
          `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` : undefined
      },
      timeout: 10000
    });

    logger.debug(`Sent ${events.length} events to Elasticsearch: ${destination.name}`);
  }

  /**
   * Send events to Splunk
   */
  private async sendToSplunk(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const axios = require('axios');
    const { url, token, index } = destination.config;

    for (const event of events) {
      const splunkEvent = {
        time: new Date(event.timestamp).getTime() / 1000,
        host: process.env.HOSTNAME || 'smm-architect',
        source: event.source,
        sourcetype: `smm:audit:${event.event_type}`,
        index,
        event
      };

      await axios.post(`${url}/services/collector/event`, splunkEvent, {
        headers: {
          'Authorization': `Splunk ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    }

    logger.debug(`Sent ${events.length} events to Splunk: ${destination.name}`);
  }

  /**
   * Send events to Syslog
   */
  private async sendToSyslog(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const dgram = require('dgram');
    const { host, port, facility = 16, severity_mapping } = destination.config;

    const client = dgram.createSocket('udp4');

    try {
      for (const event of events) {
        const priority = facility * 8 + (severity_mapping?.[event.severity] || 6);
        const message = `<${priority}>${event.timestamp} ${process.env.HOSTNAME || 'smm-architect'} smm-audit: ${JSON.stringify(event)}`;
        
        await new Promise<void>((resolve, reject) => {
          client.send(message, port, host, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
    } finally {
      client.close();
    }

    logger.debug(`Sent ${events.length} events to Syslog: ${destination.name}`);
  }

  /**
   * Send events to webhook
   */
  private async sendToWebhook(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const axios = require('axios');
    const { url, secret, headers = {} } = destination.config;

    const payload = {
      events,
      metadata: {
        source: 'smm-architect',
        timestamp: new Date().toISOString(),
        count: events.length
      }
    };

    const requestHeaders = { ...headers, 'Content-Type': 'application/json' };

    // Add signature if secret is provided
    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      requestHeaders['X-Signature-SHA256'] = `sha256=${signature}`;
    }

    await axios.post(url, payload, {
      headers: requestHeaders,
      timeout: 10000
    });

    logger.debug(`Sent ${events.length} events to webhook: ${destination.name}`);
  }

  /**
   * Send events to AWS CloudWatch
   */
  private async sendToCloudWatch(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const {
      region,
      logGroupName,
      logStreamName,
      accessKeyId,
      secretAccessKey,
      sessionToken
    } = destination.config;

    const client = new CloudWatchLogsClient({
      region,
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey, sessionToken } : undefined
    });

    const logEvents = events.map(event => ({
      message: JSON.stringify(event),
      timestamp: new Date(event.timestamp).getTime()
    }));

    await client.send(
      new PutLogEventsCommand({
        logGroupName,
        logStreamName,
        logEvents
      })
    );

    logger.debug(`Sent ${events.length} events to CloudWatch: ${destination.name}`);
  }

  /**
   * Send events to GCP Cloud Logging
   */
  private async sendToGCPLogging(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    const { projectId, logName, keyFilename, credentials } = destination.config;

    const logging = new Logging({ projectId, keyFilename, credentials });
    const log = logging.log(logName);

    const entries = events.map(event =>
      log.entry({ resource: { type: 'global' } }, event)
    );

    await log.write(entries);

    logger.debug(`Sent ${events.length} events to GCP Logging: ${destination.name}`);
  }

  /**
   * Retry failed events
   */
  private async retryFailedEvents(events: AuditEvent[], destination: SIEMDestination): Promise<void> {
    let attempt = 0;
    let delay = this.config.retry_delay_ms;

    while (attempt < this.config.retry_attempts) {
      try {
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.sendToDestination(events, destination);
        logger.info(`Retry succeeded for ${destination.name} after ${attempt + 1} attempt(s)`);
        return;
      } catch (error) {
        attempt++;
        logger.error(`Retry ${attempt} failed for ${destination.name}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        delay *= 2;
      }
    }

    logger.error(`All retries failed for ${destination.name}. Moving events to dead-letter queue`, {
      destination: destination.name,
      eventCount: events.length
    });

    const existing = this.deadLetterQueue.get(destination.name) || [];
    this.deadLetterQueue.set(destination.name, existing.concat(events));
    this.emit('dead_letter', { destination: destination.name, events });
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get streaming statistics
   */
  getStats(): {
    buffer_size: number;
    destinations_count: number;
    events_buffered: number;
  } {
    return {
      buffer_size: this.config.buffer_size,
      destinations_count: this.destinations.size,
      events_buffered: this.eventBuffer.length
    };
  }

  /**
   * Retrieve dead-letter queue
   */
  getDeadLetterQueue(): Map<string, AuditEvent[]> {
    return this.deadLetterQueue;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining events
    await this.flushBuffer();

    logger.info('Audit log streamer shutdown complete');
  }
}

// Export singleton instance
export const auditStreamer = new AuditLogStreamer({
  enabled: process.env.AUDIT_STREAMING_ENABLED === 'true',
  buffer_size: parseInt(process.env.AUDIT_BUFFER_SIZE || '100'),
  flush_interval_ms: parseInt(process.env.AUDIT_FLUSH_INTERVAL || '30000'), // 30 seconds
  retry_attempts: parseInt(process.env.AUDIT_RETRY_ATTEMPTS || '3'),
  retry_delay_ms: parseInt(process.env.AUDIT_RETRY_DELAY || '5000'),
  destinations: [
    // Example Elasticsearch destination
    {
      name: 'elasticsearch-siem',
      type: 'elasticsearch',
      enabled: process.env.ELASTICSEARCH_ENABLED === 'true',
      config: {
        url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        index: process.env.ELASTICSEARCH_INDEX || 'smm-audit-logs',
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      },
      filters: {
        min_severity: 'medium'
      }
    },
    // Example Splunk destination
    {
      name: 'splunk-siem',
      type: 'splunk',
      enabled: process.env.SPLUNK_ENABLED === 'true',
      config: {
        url: process.env.SPLUNK_URL || 'https://localhost:8088',
        token: process.env.SPLUNK_TOKEN,
        index: process.env.SPLUNK_INDEX || 'smm_audit'
      },
      filters: {
        min_severity: 'high'
      }
    },
    // Example webhook destination
    {
      name: 'security-webhook',
      type: 'webhook',
      enabled: process.env.SECURITY_WEBHOOK_ENABLED === 'true',
      config: {
        url: process.env.SECURITY_WEBHOOK_URL,
        secret: process.env.SECURITY_WEBHOOK_SECRET,
        headers: {
          'X-Source': 'smm-architect-audit'
        }
      },
      filters: {
        event_types: ['authentication_failure', 'privilege_escalation', 'security_violation']
      }
    }
  ]
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await auditStreamer.shutdown();
});

process.on('SIGTERM', async () => {
  await auditStreamer.shutdown();
});

export { AuditLogStreamer, AuditEvent, SIEMConfig, SIEMDestination };