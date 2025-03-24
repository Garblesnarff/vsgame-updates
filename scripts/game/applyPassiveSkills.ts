/**
 * Apply purchased passive skills to the player
 * This method reads skill values from the model and applies them to the player
 * using a more modular, maintainable approach
 */

// Define a skill applier interface for applying different skill types
interface SkillApplier {
  skillId: string;
  apply: (game: any, skillValue: number) => void;
  reset: (game: any) => void;
}

/**
 * Apply purchased passive skills to the player
 * @param game - The game instance containing player, logger, and CONFIG
 * @param passiveSkillModel - The model containing skill values
 */
export function applyPurchasedPassiveSkills(game: any, passiveSkillModel: any): void {
  const { logger } = game;
  
  logger.debug('Applying purchased passive skills to player');
  
  // Define skill appliers for each skill type
  const skillAppliers: SkillApplier[] = [
    // Attack Damage skill
    {
      skillId: 'increased-attack-damage',
      apply: (game, skillValue) => {
        if (skillValue > 0) {
          const damagePercent = skillValue / 100;
          // Apply attack power bonus - default is 1, add percentage bonus
          game.player.stats.setAttackPower(1 + damagePercent);
          game.logger.debug(`Applied attack power: ${1 + damagePercent} (${skillValue}% bonus)`);
        }
      },
      reset: (game) => {
        // Reset to default if no bonus
        game.player.stats.setAttackPower(1);
      }
    },
    
    // Attack Speed skill
    {
      skillId: 'increased-attack-speed',
      apply: (game, skillValue) => {
        if (skillValue > 0) {
          const speedPercent = skillValue / 100;
          // Apply attack speed multiplier - default is 1, add percentage bonus
          const multiplier = 1 + speedPercent;
          game.player.stats.setAttackSpeedMultiplier(multiplier);
          game.logger.debug(`Applied attack speed multiplier: ${multiplier} (${skillValue}% bonus)`);
          
          // Also adjust the auto attack cooldown directly
          applySpeedToAutoAttack(game, multiplier);
        }
      },
      reset: (game) => {
        // Reset to default if no bonus
        game.player.stats.setAttackSpeedMultiplier(1);
        
        // Reset auto attack cooldown
        if (game.player.autoAttack && game.player.autoAttack.originalCooldown) {
          game.player.autoAttack.cooldown = game.player.autoAttack.originalCooldown;
        }
      }
    },
    
    // Life Steal skill
    {
      skillId: 'life-steal',
      apply: (game, skillValue) => {
        if (skillValue > 0) {
          // Set life steal percentage directly
          game.player.stats.setLifeStealPercentage(skillValue);
          game.logger.debug(`Applied life steal percentage: ${skillValue}%`);
        }
      },
      reset: (game) => {
        // Reset to default if no bonus
        game.player.stats.setLifeStealPercentage(0);
      }
    }
  ];
  
  // Apply each skill
  for (const applier of skillAppliers) {
    const skillValue = passiveSkillModel.getSkillValue(applier.skillId);
    
    if (skillValue > 0) {
      applier.apply(game, skillValue);
    } else {
      applier.reset(game);
    }
  }
  
  // Log the final stats
  game.logPlayerStats();
}

/**
 * Apply speed multiplier to auto attack
 * @param game - The game instance
 * @param multiplier - The speed multiplier to apply
 */
function applySpeedToAutoAttack(game: any, multiplier: number): void {
  const { player, CONFIG, logger } = game;
  
  if (player.autoAttack) {
    // Store the original cooldown if not already stored
    if (!player.autoAttack.originalCooldown) {
      player.autoAttack.originalCooldown = CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN;
    }
    const originalCooldown = player.autoAttack.originalCooldown;
    
    // Apply the speed multiplier to reduce cooldown
    // Use a minimum cooldown value to prevent it from becoming too fast
    const newCooldown = Math.max(100, originalCooldown / multiplier);
    player.autoAttack.cooldown = newCooldown;
    
    // Reset the lastFired timestamp to allow immediate firing
    player.autoAttack.lastFired = 0;
    
    logger.debug(`Applied speed boost: Original cooldown: ${originalCooldown}ms, New cooldown: ${newCooldown}ms, Multiplier: ${multiplier}`);
  }
}

/**
 * Factory function to create a new skill applier
 * This is useful for extending the system with new skill types
 * @param skillId - The skill ID
 * @param applyFn - Function to apply the skill
 * @param resetFn - Function to reset the skill
 * @returns A SkillApplier object
 */
export function createSkillApplier(
  skillId: string,
  applyFn: (game: any, skillValue: number) => void,
  resetFn: (game: any) => void
): SkillApplier {
  return {
    skillId,
    apply: applyFn,
    reset: resetFn
  };
}
