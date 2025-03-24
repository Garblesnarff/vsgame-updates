/**
 * Utility functions for saving and loading persistent game data
 */
import { createLogger } from "./logger";
import { tryCatch, ErrorCategory, ErrorSeverity } from "./error-handler";

// Create a logger for the persistence module
const logger = createLogger('Persistence');

// Storage keys
const STORAGE_KEYS = {
  PASSIVE_SKILLS: 'vampireSurvival_passiveSkills',
  GAME_SETTINGS: 'vampireSurvival_settings',
  HIGH_SCORES: 'vampireSurvival_highScores'
};

/**
 * Check if localStorage is available
 * @returns Whether localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  return tryCatch(
    () => {
      const test = 'test';
      localStorage.setItem(test, test);
      const result = localStorage.getItem(test) === test;
      localStorage.removeItem(test);
      return result;
    },
    {
      message: 'localStorage is not available',
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      context: { 
        storageType: 'localStorage',
        userAgent: navigator.userAgent
      }
    },
    // No recovery function - this is a critical failure
  ) ?? false;
};

/**
 * Save passive skill data to local storage
 * @param skillData - Object containing skill data to save
 * @returns Whether save operation was successful
 */
export const savePassiveSkills = (skillData: Record<string, string>): boolean => {
  return tryCatch(
    () => {
      // First validate input
      if (!skillData || typeof skillData !== 'object') {
        throw new Error('Invalid skill data format');
      }
      
      localStorage.setItem(STORAGE_KEYS.PASSIVE_SKILLS, JSON.stringify(skillData));
      logger.debug('Saved passive skills:', skillData);
      return true;
    },
    {
      message: 'Failed to save passive skills',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true,
      context: { dataSize: JSON.stringify(skillData).length }
    },
    // Recovery function - log failure but don't crash
    () => {
      logger.warn('Using fallback for passive skills save failure - game will continue but progress may not be saved');
    }
  ) ?? false;
};

/**
 * Load passive skill data from local storage
 * @returns Object containing saved skill data, or empty object if none found
 */
export const loadPassiveSkills = (): Record<string, string> => {
  return tryCatch(
    () => {
      const savedData = localStorage.getItem(STORAGE_KEYS.PASSIVE_SKILLS);
      
      if (!savedData) {
        logger.debug('No saved passive skills found');
        return {};
      }
      
      const parsedData = JSON.parse(savedData);
      
      // Validate parsed data
      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error('Invalid saved passive skills format');
      }
      
      logger.debug('Loaded passive skills from storage:', parsedData);
      return parsedData;
    },
    {
      message: 'Failed to load passive skills',
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    },
    // Recovery function - return empty object to start fresh
    () => {
      logger.warn('Using default empty skills due to load failure');
    }
  ) ?? {};
};

/**
 * Clear all saved passive skill data
 * @returns Whether clear operation was successful
 */
export const clearPassiveSkills = (): boolean => {
  return tryCatch(
    () => {
      localStorage.removeItem(STORAGE_KEYS.PASSIVE_SKILLS);
      logger.debug('Cleared passive skills');
      return true;
    },
    {
      message: 'Failed to clear passive skills',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    }
  ) ?? false;
};

/**
 * Save game settings to local storage
 * @param settings - Object containing game settings
 * @returns Whether save operation was successful
 */
export const saveGameSettings = (settings: Record<string, unknown>): boolean => {
  return tryCatch(
    () => {
      // Validate input
      if (!settings || typeof settings !== 'object') {
        throw new Error('Invalid settings format');
      }
      
      localStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(settings));
      logger.debug('Saved game settings:', settings);
      return true;
    },
    {
      message: 'Failed to save game settings',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    }
  ) ?? false;
};

/**
 * Load game settings from local storage
 * @returns Object containing game settings, or default settings if none found
 */
export const loadGameSettings = (): Record<string, unknown> => {
  return tryCatch(
    () => {
      const savedData = localStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
      
      if (!savedData) {
        logger.debug('No saved game settings found, using defaults');
        return {};
      }
      
      const parsedData = JSON.parse(savedData);
      
      // Validate parsed data
      if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error('Invalid saved game settings format');
      }
      
      logger.debug('Loaded game settings from storage:', parsedData);
      return parsedData;
    },
    {
      message: 'Failed to load game settings',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    },
    // Recovery function - return empty object for default settings
    () => {
      logger.warn('Using default settings due to load failure');
    }
  ) ?? {};
};

/**
 * Save high scores to local storage
 * @param scores - Array of high score objects
 * @returns Whether save operation was successful
 */
export const saveHighScores = (scores: Array<{name: string, score: number, level: number, date: string}>): boolean => {
  return tryCatch(
    () => {
      // Validate input
      if (!Array.isArray(scores)) {
        throw new Error('Invalid high scores format - expected array');
      }
      
      // Validate each score entry
      scores.forEach(score => {
        if (!score.name || typeof score.score !== 'number' || typeof score.level !== 'number') {
          throw new Error('Invalid high score entry format');
        }
      });
      
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
      logger.debug('Saved high scores:', scores);
      return true;
    },
    {
      message: 'Failed to save high scores',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    }
  ) ?? false;
};

/**
 * Load high scores from local storage
 * @returns Array of high score objects, or empty array if none found
 */
export const loadHighScores = (): Array<{name: string, score: number, level: number, date: string}> => {
  return tryCatch(
    () => {
      const savedData = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES);
      
      if (!savedData) {
        logger.debug('No saved high scores found');
        return [];
      }
      
      const parsedData = JSON.parse(savedData);
      
      // Validate parsed data
      if (!Array.isArray(parsedData)) {
        throw new Error('Invalid saved high scores format - expected array');
      }
      
      // Validate each entry
      parsedData.forEach(score => {
        if (!score.name || typeof score.score !== 'number' || typeof score.level !== 'number') {
          throw new Error('Invalid high score entry format');
        }
      });
      
      logger.debug('Loaded high scores from storage:', parsedData);
      return parsedData;
    },
    {
      message: 'Failed to load high scores',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    },
    // Recovery function - return empty array for fresh high scores
    () => {
      logger.warn('Using empty high scores due to load failure');
    }
  ) ?? [];
};

/**
 * Clear all saved high scores
 * @returns Whether clear operation was successful
 */
export const clearHighScores = (): boolean => {
  return tryCatch(
    () => {
      localStorage.removeItem(STORAGE_KEYS.HIGH_SCORES);
      logger.debug('Cleared high scores');
      return true;
    },
    {
      message: 'Failed to clear high scores',
      severity: ErrorSeverity.LOW, // Not critical
      category: ErrorCategory.STORAGE,
      module: 'Persistence',
      recoverable: true
    }
  ) ?? false;
};

// Export default object for easy importing
export default {
  isStorageAvailable,
  savePassiveSkills,
  loadPassiveSkills,
  clearPassiveSkills,
  saveGameSettings,
  loadGameSettings,
  saveHighScores,
  loadHighScores,
  clearHighScores,
  STORAGE_KEYS
};
