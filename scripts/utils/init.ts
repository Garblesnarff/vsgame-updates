/**
 * Initialization module for the game
 * Sets up error handling, logging, and other game-wide settings
 */
import { LogLevel, setLogLevel } from './logger';
import { registerGlobalErrorHandler, ErrorSeverity, ErrorCategory } from './error-handler';
import { isStorageAvailable } from './persistence';
import GameEvents, { EVENTS } from './event-system';

/**
 * Initialize the environment
 * This automatically runs when the module is imported
 */
const init = (() => {
  // Set log level based on environment
  if (process.env.NODE_ENV === 'production') {
    setLogLevel(LogLevel.ERROR); // Only log errors in production
  } else {
    setLogLevel(LogLevel.DEBUG); // Log everything in development
  }

  // Register global error handler
  registerGlobalErrorHandler();

  // Check for localStorage availability
  const storageAvailable = isStorageAvailable();
  
  if (!storageAvailable) {
    // Emit storage error event
    GameEvents.emit(EVENTS.SYSTEM_STORAGE_ERROR, {
      message: 'localStorage is not available',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.STORAGE
    });
  }

  return {
    environment: process.env.NODE_ENV || 'development',
    storageAvailable,
    logLevel: process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG
  };
})();

export default init;
