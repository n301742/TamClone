import winston from 'winston';
import dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
  // Continue execution even if directory creation fails
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Determine the log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info: winston.Logform.TransformableInfo) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports for logs
const transports: winston.transport[] = [];

// In test environment, don't use any transports
if (process.env.NODE_ENV !== 'test') {
  // Add console transport only in non-test environments
  transports.push(new winston.transports.Console());
  
  // Only add file transports if directory creation was successful
  try {
    if (fs.existsSync(logsDir)) {
      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
        }),
        new winston.transports.File({ 
          filename: path.join(logsDir, 'all.log') 
        })
      );
    }
  } catch (error) {
    console.error('Failed to set up file transports:', error);
  }
}

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  silent: process.env.NODE_ENV === 'test', // Silence during tests
});

// Export a default logger instance
export default logger; 