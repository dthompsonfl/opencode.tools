import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'opencode-tools',
    version: process.env.npm_package_version || '1.0.0',
    hostname: require('os').hostname()
  },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// If we're not in production, log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && process.env.OPENCODE_MCP !== '1') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// For test environment, maybe suppress logs or redirect
if (process.env.NODE_ENV === 'test') {
  // Can be configured to be silent
  // logger.transports.forEach((t) => (t.silent = true));
}
