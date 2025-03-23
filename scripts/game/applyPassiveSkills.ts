/**
 * Apply purchased passive skills to the player
 * This method reads skill values from the model instead of directly from the DOM
 */
export function applyPurchasedPassiveSkills(game: any, passiveSkillModel: any): void {
  const { player, logger, CONFIG } = game;
  
  // Get passive skill values from the model instead of DOM
  logger.debug('Applying purchased passive skills to player');
  
  // Apply damage skill
  const damageValue = passiveSkillModel.getSkillValue('increased-attack-damage');
  if (damageValue > 0) {
    const damagePercent = damageValue / 100;
    // Apply attack power bonus - default is 1, add percentage bonus
    player.stats.setAttackPower(1 + damagePercent);
    logger.debug(`Applied attack power: ${1 + damagePercent} (${damageValue}% bonus)`);
  } else {
    // Reset to default if no bonus
    player.stats.setAttackPower(1);
  }
  
  // Apply speed skill
  const speedValue = passiveSkillModel.getSkillValue('increased-attack-speed');
  if (speedValue > 0) {
    const speedPercent = speedValue / 100;
    // Apply attack speed multiplier - default is 1, add percentage bonus
    const multiplier = 1 + speedPercent;
    player.stats.setAttackSpeedMultiplier(multiplier);
    logger.debug(`Applied attack speed multiplier: ${multiplier} (${speedValue}% bonus)`);
    
    // Also adjust the auto attack cooldown directly
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
  } else {
    // Reset to default if no bonus
    player.stats.setAttackSpeedMultiplier(1);
    if (player.autoAttack && player.autoAttack.originalCooldown) {
      player.autoAttack.cooldown = player.autoAttack.originalCooldown;
    }
  }
  
  // Apply life steal skill
  const lifeStealValue = passiveSkillModel.getSkillValue('life-steal');
  if (lifeStealValue > 0) {
    // Set life steal percentage directly
    player.stats.setLifeStealPercentage(lifeStealValue);
    logger.debug(`Applied life steal percentage: ${lifeStealValue}%`);
  } else {
    // Reset to default if no bonus
    player.stats.setLifeStealPercentage(0);
  }
  
  // Log the final stats
  game.logPlayerStats();
}
