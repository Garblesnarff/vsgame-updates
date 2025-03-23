/**
 * Utility functions for saving and loading persistent game data
 */
import { createLogger } from "./logger";

// Create a logger for the persistence module
const logger = createLogger('Persistence');

/**
 * Save passive skill data to local storage
 * @param skillData - Object containing skill data to save
 */
export const savePassiveSkills = (skillData: Record<string, string>): void => {
  try {
    localStorage.setItem('vampireSurvival_passiveSkills', JSON.stringify(skillData));
    logger.debug('Saved passive skills:', skillData);
  } catch (error) {
    logger.error('Failed to save passive skills:', error);
  }
};

/**
 * Load passive skill data from local storage
 * @returns Object containing saved skill data, or empty object if none found
 */
export const loadPassiveSkills = (): Record<string, string> => {
  try {
    const savedData = localStorage.getItem('vampireSurvival_passiveSkills');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      logger.debug('Loaded passive skills from storage:', parsedData);
      return parsedData;
    }
  } catch (error) {
    logger.error('Failed to load passive skills:', error);
  }
  return {};
};

/**
 * Clear all saved passive skill data
 */
export const clearPassiveSkills = (): void => {
  try {
    localStorage.removeItem('vampireSurvival_passiveSkills');
    logger.debug('Cleared passive skills');
  } catch (error) {
    logger.error('Failed to clear passive skills:', error);
  }
};