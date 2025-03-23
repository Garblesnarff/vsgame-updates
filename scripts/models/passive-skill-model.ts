/**
 * PassiveSkillModel - Model for passive skills
 * Stores skill data in memory and coordinates with UI and persistence
 */
import { createLogger } from "../utils/logger";
import { savePassiveSkills, loadPassiveSkills } from "../utils/persistence";

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
  }

  /**
   * Get all skills
   * @returns Array of all passive skills
   */
  getAllSkills(): PassiveSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a specific skill by ID
   * @param skillId - ID of the skill
   * @returns Skill data or undefined if not found
   */
  getSkill(skillId: string): PassiveSkill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get a skill's value by ID
   * @param skillId - ID of the skill
   * @returns Value of the skill or 0 if not found
   */
  getSkillValue(skillId: string): number {
    return this.skills.get(skillId)?.value || 0;
  }

  /**
   * Get a skill's display value by ID
   * @param skillId - ID of the skill
   * @returns Display value of the skill or '+0%' if not found
   */
  getSkillDisplayValue(skillId: string): string {
    return this.skills.get(skillId)?.displayValue || '+0%';
  }

  /**
   * Upgrade a skill by its ID
   * @param skillId - ID of the skill to upgrade
   * @returns Whether the upgrade was successful
   */
  upgradeSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.value += skill.incrementAmount;
      skill.displayValue = `+${skill.value}%`;
      logger.debug(`Upgraded skill ${skillId} to value ${skill.value}`);
      
      // Save skills to persist across sessions
      this.saveSkills();
      return true;
    }
    return false;
  }

  /**
   * Set a skill's value directly (useful for testing or admin functions)
   * @param skillId - ID of the skill
   * @param value - New value
   */
  setSkillValue(skillId: string, value: number): void {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.value = value;
      skill.displayValue = `+${value}%`;
      logger.debug(`Set skill ${skillId} value to ${value}`);
      
      // Save to persist across sessions
      this.saveSkills();
    }
  }

  /**
   * Load skills from local storage
   */
  loadSavedSkills(): void {
    const savedSkills = loadPassiveSkills();
    logger.debug('Loading saved skills from storage');
    
    if (savedSkills['increased-attack-damage-value']) {
      const damageSkill = this.skills.get('increased-attack-damage');
      if (damageSkill) {
        const match = savedSkills['increased-attack-damage-value'].match(/\+(\d+)%/);
        if (match && match[1]) {
          damageSkill.value = parseInt(match[1], 10);
          damageSkill.displayValue = savedSkills['increased-attack-damage-value'];
          logger.debug(`Loaded damage skill value: ${damageSkill.value}`);
        }
      }
    }
    
    if (savedSkills['increased-attack-speed-value']) {
      const speedSkill = this.skills.get('increased-attack-speed');
      if (speedSkill) {
        const match = savedSkills['increased-attack-speed-value'].match(/\+(\d+)%/);
        if (match && match[1]) {
          speedSkill.value = parseInt(match[1], 10);
          speedSkill.displayValue = savedSkills['increased-attack-speed-value'];
          logger.debug(`Loaded speed skill value: ${speedSkill.value}`);
        }
      }
    }
    
    if (savedSkills['life-steal-value']) {
      const lifeStealSkill = this.skills.get('life-steal');
      if (lifeStealSkill) {
        const match = savedSkills['life-steal-value'].match(/\+(\d+)%/);
        if (match && match[1]) {
          lifeStealSkill.value = parseInt(match[1], 10);
          lifeStealSkill.displayValue = savedSkills['life-steal-value'];
          logger.debug(`Loaded life steal skill value: ${lifeStealSkill.value}`);
        }
      }
    }
  }

  /**
   * Save skills to local storage
   */
  saveSkills(): void {
    const skillData: Record<string, string> = {};
    
    const damageSkill = this.skills.get('increased-attack-damage');
    if (damageSkill) {
      skillData['increased-attack-damage-value'] = damageSkill.displayValue;
    }
    
    const speedSkill = this.skills.get('increased-attack-speed');
    if (speedSkill) {
      skillData['increased-attack-speed-value'] = speedSkill.displayValue;
    }
    
    const lifeStealSkill = this.skills.get('life-steal');
    if (lifeStealSkill) {
      skillData['life-steal-value'] = lifeStealSkill.displayValue;
    }
    
    // Save to storage
    savePassiveSkills(skillData);
    logger.debug('Saved skills to storage');
  }
}

// Export a singleton instance
export const passiveSkillModel = new PassiveSkillModel();
export default passiveSkillModel;
