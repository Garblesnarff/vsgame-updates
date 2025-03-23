/**
 * Logger utility for consistent logging throughout the application
 * Allows for different log levels and structured logging
 */

// Log levels with corresponding importance
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4 // For disabling logs
}

// Default configuration
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.ERROR  // Only show errors in production
  : LogLevel.DEBUG; // Show all logs in development

// Logger configuration
let currentLogLevel: LogLevel = DEFAULT_LOG_LEVEL;
let groupsEnabled: boolean = true;

// Color codes for console
const colors = {
  debug: '#8c8c8c', // Gray
  info: '#0099ff',  // Blue
  warn: '#ffcc00',  // Yellow
  error: '#ff0000', // Red
};

/**
 * Set the global log level
 * @param level - LogLevel to set
 */
export const setLogLevel = (level: LogLevel): void => {
  currentLogLevel = level;
};

/**
 * Enable or disable log grouping
 * @param enabled - Whether grouping should be enabled
 */
export const setGrouping = (enabled: boolean): void => {
  groupsEnabled = enabled;
};

/**
 * Internal logging function
 */
const logWithLevel = (
  level: LogLevel, 
  message: string, 
  data?: any, 
  module?: string
): void => {
  // Skip if current log level is higher than this message
  if (level < currentLogLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const modulePrefix = module ? `[${module}] ` : '';
  const formattedMessage = `${modulePrefix}${message}`;
  
  switch (level) {
    case LogLevel.DEBUG:
      console.debug(
        `%c${timestamp} | DEBUG | ${formattedMessage}`, 
        `color: ${colors.debug}`, 
        data !== undefined ? data : ''
      );
      break;
    case LogLevel.INFO:
      console.info(
        `%c${timestamp} | INFO | ${formattedMessage}`, 
        `color: ${colors.info}`, 
        data !== undefined ? data : ''
      );
      break;
    case LogLevel.WARN:
      console.warn(
        `%c${timestamp} | WARN | ${formattedMessage}`, 
        `color: ${colors.warn}`, 
        data !== undefined ? data : ''
      );
      break;
    case LogLevel.ERROR:
      console.error(
        `%c${timestamp} | ERROR | ${formattedMessage}`, 
        `color: ${colors.error}`, 
        data !== undefined ? data : ''
      );
      break;
  }
};

/**
 * Logger instance for a specific module
 */
export class Logger {
  private module: string;

  /**
   * Create a new logger for a specific module
   * @param module - Module name for this logger
   */
  constructor(module: string) {
    this.module = module;
  }

  /**
   * Log a debug message
   * @param message - Message to log
   * @param data - Optional data to log
   */
  debug(message: string, data?: any): void {
    logWithLevel(LogLevel.DEBUG, message, data, this.module);
  }

  /**
   * Log an info message
   * @param message - Message to log
   * @param data - Optional data to log
   */
  info(message: string, data?: any): void {
    logWithLevel(LogLevel.INFO, message, data, this.module);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   * @param data - Optional data to log
   */
  warn(message: string, data?: any): void {
    logWithLevel(LogLevel.WARN, message, data, this.module);
  }

  /**
   * Log an error message
   * @param message - Message to log
   * @param data - Optional data to log
   */
  error(message: string, data?: any): void {
    logWithLevel(LogLevel.ERROR, message, data, this.module);
  }

  /**
   * Start a grouped log section
   * @param title - Group title
   */
  group(title: string): void {
    if (groupsEnabled && currentLogLevel <= LogLevel.DEBUG) {
      console.group(`%c${this.module} | ${title}`, `color: ${colors.info}`);
    }
  }

  /**
   * End a grouped log section
   */
  groupEnd(): void {
    if (groupsEnabled && currentLogLevel <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }

  /**
   * Log performance measurements
   * @param label - Performance measurement label
   * @param startTime - Start time from performance.now()
   */
  performance(label: string, startTime: number): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.debug(`Performance [${label}]: ${duration.toFixed(2)}ms`);
    }
  }
}

/**
 * Create a new logger for a specific module
 * @param module - Module name
 * @returns Logger instance
 */
export const createLogger = (module: string): Logger => {
  return new Logger(module);
};

// Default export for easy importing
export default {
  createLogger,
  setLogLevel,
  setGrouping,
  LogLevel
};
