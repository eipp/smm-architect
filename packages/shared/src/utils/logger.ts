/**
 * Unified Logger for SMM Architect
 */

import winston from 'winston';

const logLevel = process.env['LOG_LEVEL'] || 'info';
const throttleMs = parseInt(process.env['LOG_THROTTLE_MS'] || '1000', 10);

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'smm-architect' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Allow runtime adjustment of log level
export const setLogLevel = (level: string) => {
  logger.level = level;
};

// Throttled debug logging to prevent high-volume log spam
const lastDebugTimestamps = new Map<string, number>();
export const debugThrottled = (message: string, meta?: unknown) => {
  const now = Date.now();
  const next = lastDebugTimestamps.get(message) ?? 0;
  if (now < next) return;
  lastDebugTimestamps.set(message, now + throttleMs);
  logger.debug(message, meta);
};

export default logger;