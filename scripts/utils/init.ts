/**
 * Initialization module for game-wide settings and configuration
 */
import { setLogLevel, LogLevel } from './logger';

/**
 * Initialize game-wide settings
 */
export const initializeGame = (): void => {
  // Set log level based on environment
  if (process.env.NODE_ENV === 'production') {
    // In production, only show errors
    setLogLevel(LogLevel.ERROR);
  } else if (process.env.NODE_ENV === 'development') {
    // In development, show all logs
    setLogLevel(LogLevel.DEBUG);
  } else {
    // Default (local testing)
    // Show info and above, hide debug logs
    setLogLevel(LogLevel.INFO);
  }
};

// Initialize settings on import
initializeGame();

export default {
  initializeGame
};
