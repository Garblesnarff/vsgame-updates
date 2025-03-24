/**
 * Error handler utility for consistent error handling throughout the application
 * Works with the logger system to provide structured error handling
 */
import { createLogger, LogLevel } from "./logger";

// Create a logger for the error handler
const logger = createLogger('ErrorHandler');

// Define error severity levels to match with log levels
export enum ErrorSeverity {
  LOW = LogLevel.DEBUG,    // Minor issues that don't impact functionality
  MEDIUM = LogLevel.WARN,  // Issues that might impact functionality but aren't critical
  HIGH = LogLevel.ERROR    // Critical issues that break functionality
}

// Define common error categories
export enum ErrorCategory {
  NETWORK = 'network',         // Network-related errors
  STORAGE = 'storage',         // Local storage/persistence errors
  DOM = 'dom',                 // DOM manipulation errors
  GAME_STATE = 'game-state',   // Game state/logic errors
  RESOURCE = 'resource',       // Resource loading errors
  INPUT = 'input',             // User input errors
  INITIALIZATION = 'init',     // Initialization errors
  UNKNOWN = 'unknown'          // Uncategorized errors
}

/**
 * Enhanced error type with additional metadata
 */
export interface GameError extends Error {
  severity: ErrorSeverity;
  category: ErrorCategory;
  module: string;
  recoverable: boolean;
  timestamp: Date;
  // Original error that caused this error (if any)
  originalError?: Error | unknown;
  // Additional data for debugging
  context?: Record<string, unknown>;
}

/**
 * Create a structured error object
 * 
 * @param message - Error message
 * @param options - Error options
 * @returns Enhanced error object
 */
export function createError(
  message: string,
  options: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    module?: string;
    recoverable?: boolean;
    originalError?: Error | unknown;
    context?: Record<string, unknown>;
  } = {}
): GameError {
  const error = new Error(message) as GameError;
  
  // Set default values and override with options
  error.severity = options.severity ?? ErrorSeverity.MEDIUM;
  error.category = options.category ?? ErrorCategory.UNKNOWN;
  error.module = options.module ?? 'Unknown';
  error.recoverable = options.recoverable ?? true;
  error.timestamp = new Date();
  error.originalError = options.originalError;
  error.context = options.context;
  
  return error;
}

/**
 * Handle an error with appropriate logging and recovery actions
 * 
 * @param error - Error to handle
 * @param recoveryFn - Optional function to run for recovery
 * @returns Whether the error was recoverable
 */
export function handleError(
  error: GameError | Error | unknown,
  recoveryFn?: () => void
): boolean {
  // Convert to GameError if it's not already
  const gameError = isGameError(error) 
    ? error 
    : createError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        { originalError: error }
      );
  
  // Log with appropriate level based on severity
  const module = gameError.module || 'Unknown';
  
  // Create context object for logging
  const contextObject = {
    severity: gameError.severity,
    category: gameError.category,
    module: module,
    recoverable: gameError.recoverable,
    timestamp: gameError.timestamp,
    stack: gameError.stack,
    originalError: gameError.originalError,
    context: gameError.context
  };
  
  // Log based on severity
  switch (gameError.severity) {
    case ErrorSeverity.LOW:
      logger.debug(`[${module}] ${gameError.message}`, contextObject);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(`[${module}] ${gameError.message}`, contextObject);
      break;
    case ErrorSeverity.HIGH:
      logger.error(`[${module}] ${gameError.message}`, contextObject);
      break;
  }
  
  // Run recovery function if provided and error is recoverable
  if (gameError.recoverable && recoveryFn) {
    try {
      recoveryFn();
    } catch (recoveryError) {
      // Log recovery failure
      logger.error(
        `Recovery failed for error: ${gameError.message}`,
        { originalError: gameError, recoveryError }
      );
      return false;
    }
  }
  
  return gameError.recoverable;
}

/**
 * Try to execute a function and handle any errors
 * 
 * @param fn - Function to execute
 * @param errorOptions - Options for error creation if fn throws
 * @param recoveryFn - Optional function to run for recovery
 * @returns Result of fn or undefined if error occurred
 */
export function tryCatch<T>(
  fn: () => T,
  errorOptions: {
    message?: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    module?: string;
    recoverable?: boolean;
    context?: Record<string, unknown>;
  } = {},
  recoveryFn?: () => void
): T | undefined {
  try {
    return fn();
  } catch (error) {
    const gameError = createError(
      errorOptions.message || (error instanceof Error ? error.message : 'Unknown error occurred'),
      {
        severity: errorOptions.severity,
        category: errorOptions.category,
        module: errorOptions.module,
        recoverable: errorOptions.recoverable,
        originalError: error,
        context: errorOptions.context
      }
    );
    
    handleError(gameError, recoveryFn);
    return undefined;
  }
}

/**
 * Async version of tryCatch
 * 
 * @param fn - Async function to execute
 * @param errorOptions - Options for error creation if fn throws
 * @param recoveryFn - Optional async function to run for recovery
 * @returns Promise resolving to result of fn or undefined if error occurred
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  errorOptions: {
    message?: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    module?: string;
    recoverable?: boolean;
    context?: Record<string, unknown>;
  } = {},
  recoveryFn?: () => Promise<void>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const gameError = createError(
      errorOptions.message || (error instanceof Error ? error.message : 'Unknown error occurred'),
      {
        severity: errorOptions.severity,
        category: errorOptions.category,
        module: errorOptions.module,
        recoverable: errorOptions.recoverable,
        originalError: error,
        context: errorOptions.context
      }
    );
    
    if (recoveryFn && gameError.recoverable) {
      try {
        await recoveryFn();
      } catch (recoveryError) {
        // Log recovery failure
        logger.error(
          `Async recovery failed for error: ${gameError.message}`,
          { originalError: gameError, recoveryError }
        );
      }
    }
    
    handleError(gameError);
    return undefined;
  }
}

/**
 * Type guard to check if an error is a GameError
 * 
 * @param error - Error to check
 * @returns Whether error is a GameError
 */
export function isGameError(error: unknown): error is GameError {
  return (
    error instanceof Error &&
    'severity' in error &&
    'category' in error &&
    'module' in error &&
    'recoverable' in error &&
    'timestamp' in error
  );
}

/**
 * Register a global error handler for unhandled errors
 * 
 * @param fallbackFn - Optional function to run for unhandled errors
 */
export function registerGlobalErrorHandler(fallbackFn?: (error: Error) => void): void {
  window.addEventListener('error', (event) => {
    const gameError = createError(event.message, {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.UNKNOWN,
      recoverable: false,
      originalError: event.error
    });
    
    handleError(gameError);
    
    if (fallbackFn) {
      fallbackFn(event.error);
    }
    
    // Prevent default browser error handling
    event.preventDefault();
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    const gameError = createError('Unhandled Promise rejection', {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.UNKNOWN,
      recoverable: false,
      originalError: event.reason
    });
    
    handleError(gameError);
    
    if (fallbackFn) {
      fallbackFn(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    }
    
    // Prevent default browser error handling
    event.preventDefault();
  });
  
  logger.info('Global error handlers registered');
}

// Default export for easy importing
export default {
  createError,
  handleError,
  tryCatch,
  tryCatchAsync,
  isGameError,
  registerGlobalErrorHandler,
  ErrorSeverity,
  ErrorCategory
};
