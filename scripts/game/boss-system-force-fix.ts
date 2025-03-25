// This file contains a direct implementation of boss system fixes
// Direct implementation to force boss spawn timing to work correctly

import { createLogger } from '../utils/logger';
import { Boss } from '../entities/bosses';

const logger = createLogger('BossSystemFix');

/**
 * Apply fixes to boss spawn timing and show debug info
 * @param bossSystem - The boss system to fix
 */
export function fixBossSpawnSystem(bossSystem: any): void {
  logger.info('Applying forced fixes to boss spawn system');
  console.log('BOSS SYSTEM FIX: Applying forced fixes to boss spawn timing');
  
  // Force the boss spawn timing to specific values
  // First boss at 2.5 minutes (150 seconds)
  bossSystem.nextBossTime = 150 * 1000;
  
  // Boss warning time 30 seconds before boss spawn
  bossSystem.bossWarningTime = 30 * 1000;
  
  // Reset the warning flag to ensure it will show
  bossSystem.hasShownWarning = false;
  
  // Add debug logging to critical functions
  // Show warning function
  const originalShowWarning = bossSystem.showBossWarning;
  bossSystem.showBossWarning = function(bossType: string) {
    console.log(`BOSS SYSTEM FIX: Showing warning for ${bossType} boss`);
    logger.info(`Showing warning for ${bossType} boss`);
    
    try {
      // Call the original function
      return originalShowWarning.call(this, bossType);
    } catch (err) {
      // Handle any error
      console.error('Error in showBossWarning:', err);
      logger.error('Error in showBossWarning');
      // Create a fallback warning if the original fails
      createFallbackWarning(bossType);
    }
  };
  
  // Spawn boss function
  const originalSpawnBoss = bossSystem.spawnBoss;
  bossSystem.spawnBoss = function(playerLevel: number): Boss {
    console.log(`BOSS SYSTEM FIX: Spawning boss at level ${playerLevel}`);
    logger.info(`Spawning boss at level ${playerLevel}`);
    
    try {
      // Call the original function
      return originalSpawnBoss.call(this, playerLevel);
    } catch (err) {
      // Handle any error
      console.error('Error in spawnBoss:', err);
      logger.error('Error in spawnBoss');
      // Throw error to prevent silent failure
      throw new Error('Failed to spawn boss');
    }
  };
  
  // Update function
  const originalUpdate = bossSystem.update;
  bossSystem.update = function(gameTime: number, playerLevel: number): Boss | null {
    // Log critical timing information
    if (Math.floor(gameTime / 1000) % 5 === 0) {
      const warningTime = this.nextBossTime - this.bossWarningTime;
      const gameTimeSec = Math.floor(gameTime / 1000);
      const nextBossTimeSec = Math.floor(this.nextBossTime / 1000);
      const warningTimeSec = Math.floor(warningTime / 1000);
      
      console.log(`BOSS SYSTEM FIX: Game time ${gameTimeSec}s, Next boss at ${nextBossTimeSec}s, Warning at ${warningTimeSec}s`);
      console.log(`BOSS SYSTEM FIX: Warning shown: ${this.hasShownWarning}, Warning time remaining: ${warningTimeSec - gameTimeSec}s`);
      console.log(`BOSS SYSTEM FIX: Boss time remaining: ${nextBossTimeSec - gameTimeSec}s`);
    }
    
    // Special checks near warning and boss spawn times
    const warningTime = this.nextBossTime - this.bossWarningTime;
    
    // Force warning to show if we're past the warning time and it hasn't shown yet
    if (!this.hasShownWarning && gameTime >= warningTime) {
      console.log(`BOSS SYSTEM FIX: Forcing warning at ${Math.floor(gameTime/1000)}s`);
      this.showBossWarning(this.getBossTypeForNextSpawn());
      this.hasShownWarning = true;
      this.lastBossWarningTime = gameTime;
    }
    
    // Force boss to spawn if we're past the spawn time and no boss is active
    if (gameTime >= this.nextBossTime && !this.game?.currentBoss && !this.game?.isInBossFight) {
      console.log(`BOSS SYSTEM FIX: Forcing boss spawn at ${Math.floor(gameTime/1000)}s`);
      this.hasShownWarning = false;
      this.nextBossTime = gameTime + this.bossSpawnInterval;
      return this.spawnBoss(playerLevel);
    }
    
    // Call the original update function
    return originalUpdate.call(this, gameTime, playerLevel);
  };
  
  logger.info('Boss spawn system fixes applied');
  console.log('BOSS SYSTEM FIX: All fixes applied successfully');
}

/**
 * Create a fallback warning if the original warning function fails
 * @param bossType - Type of boss that's approaching
 */
function createFallbackWarning(bossType: string): void {
  // Create warning element
  const warning = document.createElement('div');
  warning.className = 'boss-warning';
  warning.style.position = 'fixed';
  warning.style.top = '30%';
  warning.style.left = '50%';
  warning.style.transform = 'translate(-50%, -50%)';
  warning.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  warning.style.color = '#ff0000';
  warning.style.padding = '20px';
  warning.style.borderRadius = '10px';
  warning.style.fontSize = '24px';
  warning.style.fontWeight = 'bold';
  warning.style.textAlign = 'center';
  warning.style.zIndex = '1000';
  warning.style.boxShadow = '0 0 20px 10px rgba(255, 0, 0, 0.3)';
  warning.textContent = `${bossType} approaching in 30 seconds!`;
  
  // Add to DOM
  document.body.appendChild(warning);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (warning.parentNode) {
      warning.parentNode.removeChild(warning);
    }
  }, 3000);
}
