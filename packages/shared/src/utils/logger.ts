/**
 * Unified Logger for SMM Architect
 */

import winston from 'winston';
import { createStream } from 'rotating-file-stream';
import fs from 'node:fs';
import path from 'node:path';

const logLevel = process.env['LOG_LEVEL'] || 'info';
const logDirectory = process.env['LOG_DIRECTORY'] || path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const rotatingStream = createStream('app.log', {
  size: process.env['LOG_ROTATION_SIZE'] || '10M',
  interval: process.env['LOG_ROTATION_INTERVAL'] || '1d',
  maxFiles: parseInt(process.env['LOG_ROTATION_MAX_FILES'] || '14', 10),
  path: logDirectory
});

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
    }),
    new winston.transports.Stream({ stream: rotatingStream })
  ]
});

export default logger;