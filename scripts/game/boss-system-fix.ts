// /scripts/game/boss-system-fix.ts
import { createLogger } from '../utils/logger';

const logger = createLogger('BossSystemFix');

/**
 * Fix boss spawn timing issues
 * @param bossSystem - The boss spawn system to fix
 */
export function fixBossSpawnSystem(bossSystem: any): void {
  logger.info('Applying fixes to boss spawn system');
  console.log('BOSS SYSTEM FIX: Applying fixes to boss spawn timing');
  
  // Force the boss spawn timing to specific values
  // First boss at 2.5 minutes (150 seconds)
  bossSystem.nextBossTime = 150 * 1000;
  
  // Boss warning time 30 seconds before boss spawn
  bossSystem.bossWarningTime = 30 * 1000;
  
  // Reset the warning flag to ensure it will show
  bossSystem.hasShownWarning = false;
  
  // Add logging to critical functions for troubleshooting
  const originalUpdate = bossSystem.update;
  
  // Override the update method to add additional checks
  bossSystem.update = function(gameTime: number, playerLevel: number) {
    // Log every 10 seconds to avoid console spam
    if (Math.floor(gameTime / 1000) % 10 === 0) {
      const timeRemaining = this.nextBossTime - gameTime;
      console.log(`BOSS SYSTEM: Game time ${Math.floor(gameTime/1000)}s, Next boss at ${Math.floor(this.nextBossTime/1000)}s, Time remaining: ${Math.floor(timeRemaining/1000)}s`);
    }
    
    // Force warning to show if we're past the warning time and it hasn't shown yet
    const warningTime = this.nextBossTime - this.bossWarningTime;
    if (!this.hasShownWarning && gameTime >= warningTime) {
      console.log(`BOSS SYSTEM FIX: Forcing warning at ${Math.floor(gameTime/1000)}s`);
      this.showBossWarning(this.getBossTypeForNextSpawn());
      this.hasShownWarning = true;
      this.lastWarningTime = gameTime;
    }
    
    // Force boss to spawn if we're past the spawn time
    if (gameTime >= this.nextBossTime && !this.hasShownWarning) {
      console.log(`BOSS SYSTEM FIX: Forcing boss spawn at ${Math.floor(gameTime/1000)}s`);
      this.hasShownWarning = false;
      this.nextBossTime = gameTime + this.bossSpawnInterval;
      return this.spawnBoss(playerLevel);
    }
    
    // Call the original update function
    return originalUpdate.call(this, gameTime, playerLevel);
  };
  
  logger.info('Boss spawn system fixes applied');
}