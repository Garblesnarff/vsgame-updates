// Immediately executing console.log to ensure this file is included in the bundle
console.log('BOSS INTEGRATION FILE LOADED');

import { BossSpawnSystem } from './boss-system';
import { Boss } from '../entities/bosses';
import { GameEvents, EVENTS } from '../utils/event-system';
import { createLogger } from '../utils/logger';
import { fixBossSpawnSystem } from './boss-system-fix';

// Create a logger for this integration module
const logger = createLogger('GameBossIntegration');

/**
 * Integration code for adding boss encounters to Game class
 * To be mixed into Game class in game.ts
 */

// Properties to add to Game class
export interface GameBossProperties {
  bossSpawnSystem: BossSpawnSystem;
  currentBoss: Boss | null;
  isInBossFight: boolean;
  regularSpawnRateBackup: number;
}

/**
 * Initialize boss system
 * @param game - Game instance
 */
export function initializeBossSystem(game: any): void {
  logger.debug('Initializing boss system');
  
  // Add boss-related properties
  game.bossSpawnSystem = new BossSpawnSystem(game.gameContainer, game);
  game.currentBoss = null;
  game.isInBossFight = false;
  game.regularSpawnRateBackup = 0;
  
  // Apply fixes to the boss spawn system
  fixBossSpawnSystem(game.bossSpawnSystem);
  
  // Listen for boss-related events
  GameEvents.on(EVENTS.BOSS_DEFEATED, () => {
    game.handleBossDefeated();
  });
  
  logger.info('Boss system initialized');
}

/**
 * Update boss system
 * @param game - Game instance
 * @param deltaTime - Time since last update in ms
 */
export function updateBossSystem(game: any, deltaTime: number): void {
  // Don't spawn bosses in non-playing states
  if (game.stateManager.getCurrentState() !== 'PLAYING') {
    return;
  }
  
  // Only log every 10 seconds to reduce console spam
  if (Math.floor(game.gameTime / 1000) % 10 === 0) {
    console.log(`BOSS INTEGRATION: updateBossSystem called with gameTime=${game.gameTime}ms (${Math.floor(game.gameTime/1000)}s), state=${game.stateManager.getCurrentState()}, isInBossFight=${game.isInBossFight}`);
  }
  
  // Check for boss spawning if not in a boss fight
  if (!game.isInBossFight) {
    const boss = game.bossSpawnSystem.update(game.gameTime, game.player.level);
    if (boss) {
      game.startBossFight(boss);
    }
  } else {
    // Update boss fight status
    game.updateBossFight(deltaTime);
  }
}

/**
 * Add boss-related methods to Game class
 * @param game - Game instance
 */
export function addBossMethods(game: any): void {
  /**
   * Start a boss fight
   * @param boss - Boss to fight
   */
  game.startBossFight = function(boss: Boss): void {
    logger.info(`Starting boss fight with ${boss.name}`);
    console.log(`BOSS FIGHT: Starting boss fight with ${boss.name}`);

    // --- BEGIN ADDED CODE: Clear existing non-boss enemies ---
    logger.debug(`Clearing ${this.enemies.length} existing enemies for boss fight.`);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        // Ensure we don't remove the boss itself if it somehow got added early,
        // and ensure it's not a Boss instance.
        if (enemy !== boss && !(enemy instanceof Boss)) {
            logger.debug(`Cleaning up enemy ${enemy.id}`);
            enemy.cleanup(this.player); // Call cleanup to remove DOM element and listeners
            this.enemies.splice(i, 1); // Remove from the array
        }
    }
    logger.debug(`Remaining enemies after clear: ${this.enemies.length}`);
    // --- END ADDED CODE ---
    
    // Set boss fight state
    this.currentBoss = boss;
    this.isInBossFight = true;
    
    // Back up spawn rate (the actual stopping happens in game.ts update)
    if (!this.regularSpawnRateBackup) { // Only back up if not already backed up
        this.regularSpawnRateBackup = this.spawnSystem.currentSpawnRate;
    }
    // Note: The line below that modifies currentSpawnRate is now less critical
    // because the main update loop will skip spawning based on isInBossFight.
    // Leaving it doesn't hurt, but it's not the primary mechanism anymore.
    this.spawnSystem.currentSpawnRate *= 3.33; // Original logic: Reduce spawn rate by 70%
    
    // Add boss to enemies array (now happens *after* clearing others)
    this.enemies.push(boss);
    
    // Create a special notification
    this.showBossEncounterNotification(boss.name);
    
    // Emit event
    GameEvents.emit(EVENTS.BOSS_SPAWN, boss);

    // --- ADDED CODE: Ensure boss arena is created (Safeguard) ---
    // Check if the specific boss instance has arena-related methods/properties
    if ('createArena' in boss && typeof boss.createArena === 'function' &&
        'arenaElement' in boss && !boss.arenaElement) {
        logger.debug("Force creating arena in startBossFight");
        // We've confirmed createArena exists and is a function via the 'in' and typeof checks
        (boss as any).createArena(); 
    }
    // --- END ADDED CODE ---
  };
  
  /**
   * Update boss fight status
   * @param deltaTime - Time since last update in ms
   */
  game.updateBossFight = function(_deltaTime: number): void {
    // Check if boss is still alive
    if (!this.currentBoss || this.currentBoss.health <= 0) {
      this.endBossFight();
      return;
    }
  };
  
  /**
   * End boss fight
   */
  game.endBossFight = function(): void {
    logger.info('Boss fight ended');
    console.log('BOSS FIGHT: Boss fight ended');
    
    // Return to normal spawn rate
    if (this.regularSpawnRateBackup) {
      this.spawnSystem.currentSpawnRate = this.regularSpawnRateBackup;
      this.regularSpawnRateBackup = 0;
    }
    
    // Reset boss-related properties
    this.isInBossFight = false;
    this.currentBoss = null;
    
    // Emit event
    GameEvents.emit(EVENTS.BOSS_DEFEATED);
  };
  
  /**
   * Handle boss defeated
   */
  game.handleBossDefeated = function(): void {
    logger.info('Boss defeated - granting rewards');
    console.log('BOSS FIGHT: Boss defeated - granting rewards');
    
    // Reset player cooldowns
    if (this.player && this.player.abilityManager) {
      this.player.abilityManager.resetAllCooldowns();
    }
    
    // Grant player level up
    if (this.levelSystem) {
      // Force a level up
      this.levelSystem.forceGainExperience(this.levelSystem.getExperienceForNextLevel());
    }
    
    // Grant a temporary buff (will depend on the boss type)
    this.grantBossDefeatBuff();
    
    // Show victory notification
    this.showBossDefeatNotification();
  };
  
  /**
   * Grant a temporary buff after defeating a boss
   */
  game.grantBossDefeatBuff = function(): void {
    // This will be customized based on boss type
    // For now, implement a generic buff
    
    if (this.player) {
      // Temporarily boost attack power by 30% for 3 minutes
      const originalAttackPower = this.player.stats.getAttackPower();
      const boostedAttackPower = originalAttackPower * 1.3;
      
      this.player.stats.setAttackPower(boostedAttackPower);
      
      // Show buff indicator
      this.showBuffIndicator('Holy Conviction', 'Attack power increased by 30%', 3 * 60 * 1000);
      
      // Reset after duration
      setTimeout(() => {
        if (this.player) {
          this.player.stats.setAttackPower(originalAttackPower);
          this.hideBuffIndicator('Holy Conviction');
        }
      }, 3 * 60 * 1000); // 3 minutes
    }
  };
  
  /**
   * Show a notification for boss encounter
   * @param bossName - Name of the boss
   */
  game.showBossEncounterNotification = function(bossName: string): void {
    console.log(`BOSS FIGHT: Showing encounter notification for ${bossName}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'boss-encounter-notification';
    notification.style.position = 'fixed';
    notification.style.top = '40%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = '#ff0000';
    notification.style.padding = '20px';
    notification.style.borderRadius = '10px';
    notification.style.fontSize = '28px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    notification.style.zIndex = '100';
    notification.style.boxShadow = '0 0 20px 10px rgba(255, 0, 0, 0.5)';
    notification.style.animation = 'boss-notification-fade 3s forwards';
    notification.textContent = `${bossName} has appeared!`;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Add animation to the styles if it doesn't exist
    if (!document.getElementById('boss-notification-animation')) {
      const style = document.createElement('style');
      style.id = 'boss-notification-animation';
      style.textContent = `
        @keyframes boss-notification-fade {
          0% { opacity: 0; transform: translate(-50%, -70%); }
          20% { opacity: 1; transform: translate(-50%, -50%); }
          80% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -30%); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };
  
  /**
   * Show a notification for boss defeat
   */
  game.showBossDefeatNotification = function(): void {
    console.log('BOSS FIGHT: Showing defeat notification');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'boss-defeat-notification';
    notification.style.position = 'fixed';
    notification.style.top = '40%';
    notification.style.left = '50%';
    notification.style.transform = 'translate(-50%, -50%)';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = '#00ff00';
    notification.style.padding = '20px';
    notification.style.borderRadius = '10px';
    notification.style.fontSize = '28px';
    notification.style.fontWeight = 'bold';
    notification.style.textAlign = 'center';
    notification.style.zIndex = '100';
    notification.style.boxShadow = '0 0 20px 10px rgba(0, 255, 0, 0.5)';
    notification.style.animation = 'boss-defeat-fade 3s forwards';
    notification.textContent = 'Boss Defeated!';
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Add animation to the styles if it doesn't exist
    if (!document.getElementById('boss-defeat-animation')) {
      const style = document.createElement('style');
      style.id = 'boss-defeat-animation';
      style.textContent = `
        @keyframes boss-defeat-fade {
          0% { opacity: 0; transform: translate(-50%, -70%) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          30% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -30%) scale(0.8); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };
  
  /**
   * Show a buff indicator
   * @param buffName - Name of the buff
   * @param description - Description of the buff
   * @param duration - Duration of the buff in ms
   */
  game.showBuffIndicator = function(buffName: string, description: string, duration: number): void {
    // Check if we already have a buff container
    let buffContainer = document.getElementById('buff-container');
    
    if (!buffContainer) {
      // Create buff container
      buffContainer = document.createElement('div');
      buffContainer.id = 'buff-container';
      buffContainer.style.position = 'fixed';
      buffContainer.style.top = '10px';
      buffContainer.style.right = '10px';
      buffContainer.style.display = 'flex';
      buffContainer.style.flexDirection = 'column';
      buffContainer.style.gap = '5px';
      buffContainer.style.zIndex = '100';
      
      // Add to DOM
      document.body.appendChild(buffContainer);
    }
    
    // Create buff indicator
    const buffIndicator = document.createElement('div');
    buffIndicator.className = 'buff-indicator';
    buffIndicator.id = `buff-${buffName.replace(/\s+/g, '-').toLowerCase()}`;
    buffIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    buffIndicator.style.color = '#ffffff';
    buffIndicator.style.padding = '10px';
    buffIndicator.style.borderRadius = '5px';
    buffIndicator.style.fontSize = '14px';
    buffIndicator.style.border = '1px solid #ffcc00';
    
    // Create buff content
    const buffTitle = document.createElement('div');
    buffTitle.style.fontWeight = 'bold';
    buffTitle.style.color = '#ffcc00';
    buffTitle.textContent = buffName;
    
    const buffDesc = document.createElement('div');
    buffDesc.style.fontSize = '12px';
    buffDesc.textContent = description;
    
    const buffTimer = document.createElement('div');
    buffTimer.style.fontSize = '10px';
    buffTimer.style.marginTop = '5px';
    
    // Add all elements to the indicator
    buffIndicator.appendChild(buffTitle);
    buffIndicator.appendChild(buffDesc);
    buffIndicator.appendChild(buffTimer);
    
    // Add to container
    buffContainer.appendChild(buffIndicator);
    
    // Update timer
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      
      if (remaining > 0) {
        // Calculate minutes and seconds
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        // Update timer text
        buffTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        
        // Continue updating
        requestAnimationFrame(updateTimer);
      } else {
        // Time's up, remove the buff indicator
        this.hideBuffIndicator(buffName);
      }
    };
    
    // Start updating timer
    updateTimer();
  };
  
  /**
   * Hide a buff indicator
   * @param buffName - Name of the buff to hide
   */
  game.hideBuffIndicator = function(buffName: string): void {
    const buffId = `buff-${buffName.replace(/\s+/g, '-').toLowerCase()}`;
    const buffIndicator = document.getElementById(buffId);
    
    if (buffIndicator && buffIndicator.parentNode) {
      // Fade out animation
      buffIndicator.style.transition = 'opacity 0.5s';
      buffIndicator.style.opacity = '0';
      
      // Remove after animation
      setTimeout(() => {
        if (buffIndicator.parentNode) {
          buffIndicator.parentNode.removeChild(buffIndicator);
        }
      }, 500);
    }
  };
  
  /**
   * Reset boss system
   */
  game.resetBossSystem = function(): void {
    // Reset boss spawn system
    if (this.bossSpawnSystem) {
      this.bossSpawnSystem.reset();
      
      // Apply fixes again after reset - crucial to make boss appear at correct time
      fixBossSpawnSystem(this.bossSpawnSystem);
      console.log('BOSS SYSTEM: Reset completed and fixes reapplied');
    }
    
    // Reset boss-related properties
    this.currentBoss = null;
    this.isInBossFight = false;
    this.regularSpawnRateBackup = 0;
    
    // Clean up any leftover UI elements
    const buffContainer = document.getElementById('buff-container');
    if (buffContainer && buffContainer.parentNode) {
      buffContainer.parentNode.removeChild(buffContainer);
    }
    
    logger.debug('Boss system reset');
  };
  
  /**
   * Clean up boss system resources
   */
  game.cleanupBossSystem = function(): void {
    // Reset boss system
    this.resetBossSystem();
    
    // Remove event listeners
    GameEvents.removeAllListeners(EVENTS.BOSS_DEFEATED);
    
    logger.debug('Boss system cleaned up');
  };
}

/**
 * Apply boss system integration to Game class
 * @param game - Game instance
 */
export function integrateWithGame(game: any): void {
  // Console log for debugging - we want to make sure this function is actually called
  console.log('BOSS INTEGRATION: integrateWithGame function called');
  // Initialize boss system
  initializeBossSystem(game);
  
  // Add boss methods
  addBossMethods(game);
  
  // Modify update method to include boss system updates
  const originalUpdate = game.update;
  game.update = function(deltaTime: number): void {
    // Call original update method
    originalUpdate.call(this, deltaTime);
    
    // Update boss system
    updateBossSystem(this, deltaTime);
  };
  
  // Modify cleanup method
  const originalCleanupEntities = game.cleanupEntities;
  game.cleanupEntities = function(): void {
    // Call original cleanup method
    originalCleanupEntities.call(this);
    
    // Clean up boss-related elements
    if (this.currentBoss) {
      this.currentBoss.cleanup();
      this.currentBoss = null;
    }
    
    // Remove any boss-related UI elements
    const bossArenas = document.querySelectorAll('.boss-arena');
    bossArenas.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    const bossHealthBars = document.querySelectorAll('.boss-health-container');
    bossHealthBars.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  };
  
  // Modify restart method
  const originalRestart = game.restart;
  game.restart = function(): void {
    // Reset boss system
    this.resetBossSystem();
    
    // Call original restart method
    originalRestart.call(this);
  };
  
  // Modify dispose method
  const originalDispose = game.dispose;
  game.dispose = function(): void {
    // Clean up boss system
    this.cleanupBossSystem();
    
    // Call original dispose method
    originalDispose.call(this);
  };
  
  logger.info('Boss system integrated with Game class');
}
