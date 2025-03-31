/**
 * PassiveSkillModel - Model for passive skills
 * Stores skill data in memory and coordinates with UI and persistence
 */
import { createLogger } from "../utils/logger";
import { savePassiveSkills, loadPassiveSkills } from "../utils/persistence";
import { tryCatch, ErrorCategory, ErrorSeverity } from "../utils/error-handler";

// Create a logger for the model
const logger = createLogger('PassiveSkillModel');

/**
 * Interface for a passive skill
 */
export interface PassiveSkill {
  id: string;
  name: string;
  description: string;
  value: number;
  displayValue: string;
  incrementAmount: number;
}

/**
 * Class for managing passive skills in memory
 */
export class PassiveSkillModel {
  // Map of skill id to skill data
  private skills: Map<string, PassiveSkill> = new Map();

  /**
   * Initialize with default skills
   */
  constructor() {
    // Add default skills
    this.initializeDefaultSkills();
    
    // Load saved skills from storage
    this.loadSavedSkills();
  }

  /**
   * Setup default skills
   */
  private initializeDefaultSkills(): void {
    tryCatch(
      () => {
        // Attack Damage
        this.skills.set('increased-attack-damage', {
          id: 'increased-attack-damage',
          name: 'Increased Attack Damage',
          description: 'Increases your damage output against all enemies.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 10 // +10% per level
        });
    
        // Attack Speed
        this.skills.set('increased-attack-speed', {
          id: 'increased-attack-speed',
          name: 'Increased Attack Speed',
          description: 'Reduces the cooldown between attacks, allowing you to attack more frequently.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 10 // +10% per level
        });
    
        // Life Steal
        this.skills.set('life-steal', {
          id: 'life-steal',
          name: 'Life Steal',
          description: 'Heals you for a percentage of the damage you deal to enemies.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 5 // +5% per level
        });

        // Health Pool Increase
        this.skills.set('increased-health-pool', {
          id: 'increased-health-pool',
          name: 'Increased Health Pool',
          description: 'Increases your maximum health.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 10 // +10% per level
        });

        // Movement Speed Increase
        this.skills.set('increased-movement-speed', {
          id: 'increased-movement-speed',
          name: 'Increased Movement Speed',
          description: 'Increases your movement speed.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 10 // +10% per level
        });

        // Cooldown Reduction
        this.skills.set('cooldown-reduction', {
          id: 'cooldown-reduction',
          name: 'Cooldown Reduction',
          description: 'Reduces the cooldown of your abilities.',
          value: 0,
          displayValue: '+0%',
          incrementAmount: 10 // +10% per level
        });
        
        logger.debug('Default skills initialized successfully');
      },
      {
        message: 'Failed to initialize default skills',
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.INITIALIZATION,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: {
          action: 'initializeDefaultSkills'
        }
      },
      // Recovery function
      () => {
        // Create bare minimum skills if initialization fails
        logger.warn('Using fallback skills initialization');
        
        if (this.skills.size === 0) {
          // Only set up fallback skills if we don't have any
          this.skills.set('increased-attack-damage', {
            id: 'increased-attack-damage',
            name: 'Damage',
            description: 'Increases damage',
            value: 0,
            displayValue: '+0%',
            incrementAmount: 10
          });
        }
      }
    );
  }

  /**
   * Get all skills
   * @returns Array of all passive skills
   */
  getAllSkills(): PassiveSkill[] {
    return tryCatch(
      () => Array.from(this.skills.values()),
      {
        message: 'Failed to get all skills',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true
      },
      () => {
        logger.warn('Returning empty skills array due to error');
      }
    ) ?? [];
  }

  /**
   * Get a specific skill by ID
   * @param skillId - ID of the skill
   * @returns Skill data or undefined if not found
   */
  getSkill(skillId: string): PassiveSkill | undefined {
    return tryCatch(
      () => {
        if (!skillId) {
          throw new Error('Invalid skill ID');
        }
        return this.skills.get(skillId);
      },
      {
        message: `Failed to get skill: ${skillId}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: { skillId }
      }
    );
  }

  /**
   * Get a skill's value by ID
   * @param skillId - ID of the skill
   * @returns Value of the skill or 0 if not found
   */
  getSkillValue(skillId: string): number {
    return tryCatch(
      () => {
        if (!skillId) {
          throw new Error('Invalid skill ID');
        }
        return this.skills.get(skillId)?.value ?? 0;
      },
      {
        message: `Failed to get skill value: ${skillId}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: { skillId }
      },
      // Recovery function - return default value
      () => {
        logger.warn(`Returning default value 0 for skill: ${skillId}`);
      }
    ) ?? 0;
  }

  /**
   * Get a skill's display value by ID
   * @param skillId - ID of the skill
   * @returns Display value of the skill or '+0%' if not found
   */
  getSkillDisplayValue(skillId: string): string {
    return tryCatch(
      () => {
        if (!skillId) {
          throw new Error('Invalid skill ID');
        }
        return this.skills.get(skillId)?.displayValue ?? '+0%';
      },
      {
        message: `Failed to get skill display value: ${skillId}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: { skillId }
      },
      // Recovery function - return default value
      () => {
        logger.warn(`Returning default display value '+0%' for skill: ${skillId}`);
      }
    ) ?? '+0%';
  }

  /**
   * Upgrade a skill by its ID
   * @param skillId - ID of the skill to upgrade
   * @returns Whether the upgrade was successful
   */
  upgradeSkill(skillId: string): boolean {
    return tryCatch(
      () => {
        if (!skillId) {
          throw new Error('Invalid skill ID');
        }
        
        const skill = this.skills.get(skillId);
        if (!skill) {
          logger.warn(`Attempted to upgrade non-existent skill: ${skillId}`);
          return false;
        }
        
        skill.value += skill.incrementAmount;
        skill.displayValue = `+${skill.value}%`;
        logger.debug(`Upgraded skill ${skillId} to value ${skill.value}`);
        
        // Save skills to persist across sessions
        this.saveSkills();
        return true;
      },
      {
        message: `Failed to upgrade skill: ${skillId}`,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: { skillId }
      }
    ) ?? false;
  }

  /**
   * Set a skill's value directly (useful for testing or admin functions)
   * @param skillId - ID of the skill
   * @param value - New value
   * @returns Whether the operation was successful
   */
  setSkillValue(skillId: string, value: number): boolean {
    return tryCatch(
      () => {
        if (!skillId) {
          throw new Error('Invalid skill ID');
        }
        
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Invalid value for skill ${skillId}: ${value}`);
        }
        
        const skill = this.skills.get(skillId);
        if (!skill) {
          logger.warn(`Attempted to set value for non-existent skill: ${skillId}`);
          return false;
        }
        
        skill.value = value;
        skill.displayValue = `+${value}%`;
        logger.debug(`Set skill ${skillId} value to ${value}`);
        
        // Save to persist across sessions
        this.saveSkills();
        return true;
      },
      {
        message: `Failed to set skill value: ${skillId} = ${value}`,
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true,
        context: { skillId, value }
      }
    ) ?? false;
  }

  /**
   * Load skills from local storage
   * @returns Whether load operation was successful
   */
  loadSavedSkills(): boolean {
    return tryCatch(
      () => {
        const savedSkills = loadPassiveSkills();
        logger.debug('Loading saved skills from storage');
        
        // Process each known skill type
        const processSkill = (skillId: string, valueKey: string) => {
          if (savedSkills[valueKey]) {
            const skill = this.skills.get(skillId);
            if (skill) {
              const match = savedSkills[valueKey].match(/\+(\d+)%/);
              if (match && match[1]) {
                skill.value = parseInt(match[1], 10);
                skill.displayValue = savedSkills[valueKey];
                logger.debug(`Loaded ${skillId} value: ${skill.value}`);
              }
            }
          }
        };
        
        // Process each skill with proper validation
        processSkill('increased-attack-damage', 'increased-attack-damage-value');
        processSkill('increased-attack-speed', 'increased-attack-speed-value');
        processSkill('life-steal', 'life-steal-value');
        processSkill('increased-health-pool', 'increased-health-pool-value');
        processSkill('increased-movement-speed', 'increased-movement-speed-value');
        processSkill('cooldown-reduction', 'cooldown-reduction-value');
        
        return true;
      },
      {
        message: 'Failed to load saved skills from storage',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.STORAGE,
        module: 'PassiveSkillModel',
        recoverable: true
      },
      // Recovery function
      () => {
        logger.warn('Using default skill values due to load failure');
      }
    ) ?? false;
  }

  /**
   * Save skills to local storage
   * @returns Whether save operation was successful
   */
  saveSkills(): boolean {
    return tryCatch(
      () => {
        const skillData: Record<string, string> = {};
        
        // Helper to safely add skill value to data object
        const addSkillToData = (skillId: string, valueKey: string) => {
          const skill = this.skills.get(skillId);
          if (skill) {
            skillData[valueKey] = skill.displayValue;
          }
        };
        
        // Add each skill with proper validation
        addSkillToData('increased-attack-damage', 'increased-attack-damage-value');
        addSkillToData('increased-attack-speed', 'increased-attack-speed-value');
        addSkillToData('life-steal', 'life-steal-value');
        addSkillToData('increased-health-pool', 'increased-health-pool-value');
        addSkillToData('increased-movement-speed', 'increased-movement-speed-value');
        addSkillToData('cooldown-reduction', 'cooldown-reduction-value');
        
        // Save to storage
        const success = savePassiveSkills(skillData);
        if (success) {
          logger.debug('Saved skills to storage');
        }
        return success;
      },
      {
        message: 'Failed to save skills to storage',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.STORAGE,
        module: 'PassiveSkillModel',
        recoverable: true
      }
    ) ?? false;
  }
  
  /**
   * Reset all skills to default values
   * @returns Whether reset operation was successful
   */
  resetAllSkills(): boolean {
    return tryCatch(
      () => {
        // Reset each skill to zero
        this.skills.forEach(skill => {
          skill.value = 0;
          skill.displayValue = '+0%';
        });
        
        // Save the reset skills
        this.saveSkills();
        logger.info('All skills reset to default values');
        return true;
      },
      {
        message: 'Failed to reset skills to default values',
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.GAME_STATE,
        module: 'PassiveSkillModel',
        recoverable: true
      }
    ) ?? false;
  }
}

// Export a singleton instance
export const passiveSkillModel = new PassiveSkillModel();
export default passiveSkillModel;
