// Immediately executing console.log to ensure this file is included in the bundle
console.log('BOSS SYSTEM FILE LOADED');

import { Boss, ChurchPaladin } from '../entities/bosses';
import { GameEvents, EVENTS } from '../utils/event-system';
import CONFIG from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('BossSystem');

/**
 * System for spawning and managing boss encounters
 */
export class BossSpawnSystem {
  // Game container reference
  gameContainer: HTMLElement;
  
  // Game reference for adding bosses to enemies array
  game: any;
  
  // Boss spawning timing
  nextBossTime: number;
  bossSpawnInterval: number;
  bossWarningTime: number;
  lastBossWarningTime: number;
  
  // Current boss reference
  currentBoss: Boss | null;
  
  // Boss rotation
  bossRotation: Array<new (gameContainer: HTMLElement, playerLevel: number) => Boss>;
  currentBossIndex: number;
  
  // Tracking for warning messages
  hasShownWarning: boolean;
  
  /**
   * Create a new boss spawn system
   * @param gameContainer - DOM element containing the game
   * @param game - Game instance reference
   */
  constructor(gameContainer: HTMLElement, game?: any) {
    this.gameContainer = gameContainer;
    this.game = game;
    
    // Initialize timing - first boss at 2:30 minutes
    this.nextBossTime = 2.5 * 60 * 1000; // 2.5 minutes in ms (150,000ms)
    this.bossSpawnInterval = 5 * 60 * 1000; // 5 minutes in ms (300,000ms)
    this.bossWarningTime = 30 * 1000; // 30 seconds in ms
    this.lastBossWarningTime = 0;
    
    // Initialize boss state
    this.currentBoss = null;
    this.hasShownWarning = false;
    
    // Define boss rotation (only Church Paladin for now)
    this.bossRotation = [
      ChurchPaladin,
      // Add other boss types as they are implemented
    ];
    this.currentBossIndex = 0;
    
    // Debug info about initial configuration
    console.log(`BOSS SYSTEM: Initialized with first boss at ${Math.floor(this.nextBossTime/1000)}s, warning at ${Math.floor((this.nextBossTime - this.bossWarningTime)/1000)}s`);
    logger.info('Boss spawn system initialized');
  }
  
  /**
   * Update boss spawn system
   * @param gameTime - Current game time in ms
   * @param playerLevel - Current player level
   * @returns New boss if spawned, otherwise null
   */
  update(gameTime: number, playerLevel: number): Boss | null {
    // Log every 10 seconds
    if (Math.floor(gameTime / 1000) % 10 === 0) {
      // Convert to minutes and seconds for clearer logging
      const currentMinutes = Math.floor(gameTime / 60000);
      const currentSeconds = Math.floor((gameTime % 60000) / 1000);
      const nextBossMinutes = Math.floor(this.nextBossTime / 60000);
      const nextBossSeconds = Math.floor((this.nextBossTime % 60000) / 1000);
      
      console.log(`BOSS SYSTEM: Current game time: ${currentMinutes}:${currentSeconds.toString().padStart(2, '0')}, Next boss at: ${nextBossMinutes}:${nextBossSeconds.toString().padStart(2, '0')}, Warning shown: ${this.hasShownWarning}`);
    }

    // Check if we should show a warning
    const warningTime = this.nextBossTime - this.bossWarningTime;
    if (!this.hasShownWarning && gameTime >= warningTime) {
      console.log(`BOSS SYSTEM: Warning time reached at game time ${Math.floor(gameTime/1000)}s`);
      this.showBossWarning(this.getBossTypeForNextSpawn());
      this.hasShownWarning = true;
      this.lastBossWarningTime = gameTime;
    }
    
    // Check if it's time to spawn a boss
    if (gameTime >= this.nextBossTime) {
      console.log(`BOSS SYSTEM: Boss spawn time reached at game time ${Math.floor(gameTime/1000)}s`);
      
      // Reset warning flag
      this.hasShownWarning = false;
      
      // Set next boss time
      this.nextBossTime = gameTime + this.bossSpawnInterval;
      console.log(`BOSS SYSTEM: Next boss time set to ${Math.floor(this.nextBossTime/1000)}s`);
      
      // Spawn boss
      return this.spawnBoss(playerLevel);
    }
    
    return null;
  }
  
  /**
   * Get the type of boss for the next spawn
   * @returns Boss type name
   */
  getBossTypeForNextSpawn(): string {
    // Get the next boss class from rotation
    const BossClass = this.bossRotation[this.currentBossIndex];
    
    // Create a temporary boss just to get its name
    const tempBoss = new BossClass(document.createElement('div'), 1);
    const bossName = tempBoss.name;
    
    // Clean up temp boss
    tempBoss.cleanup();
    
    return bossName;
  }
  
  /**
   * Show boss warning message
   * @param bossType - Type of boss about to spawn
   */
  showBossWarning(bossType: string): void {
    logger.debug(`Showing warning for ${bossType} boss`);
    console.log(`BOSS SYSTEM: Showing warning for ${bossType} boss at game time ${Math.floor(Date.now()/1000)}s`);
    
    // Emit warning event
    GameEvents.emit(EVENTS.BOSS_WARNING, bossType);
    
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
    warning.style.zIndex = '100';
    warning.style.boxShadow = '0 0 20px 10px rgba(255, 0, 0, 0.3)';
    warning.style.animation = 'boss-warning-pulse 3s forwards';
    warning.textContent = `${bossType} approaching in 30 seconds!`;
    
    // Add to DOM
    document.body.appendChild(warning);
    
    // Add animation to the styles if it doesn't exist
    if (!document.getElementById('boss-warning-animation')) {
      const style = document.createElement('style');
      style.id = 'boss-warning-animation';
      style.textContent = `
        @keyframes boss-warning-pulse {
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
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 3000);
  }
  
  /**
   * Spawn a boss
   * @param playerLevel - Current player level
   * @returns The spawned boss
   */
  spawnBoss(playerLevel: number): Boss {
    logger.info(`Spawning boss at level ${playerLevel}`);
    console.log(`BOSS SYSTEM: Spawning boss at level ${playerLevel} at game time ${Math.floor(Date.now()/1000)}s`);
    
    // Get the next boss class from rotation
    const BossClass = this.bossRotation[this.currentBossIndex];
    
    // Create boss instance
    const boss = new BossClass(this.gameContainer, playerLevel);
    
    // Position boss in center of game area
    boss.x = CONFIG.GAME_WIDTH / 2 - boss.width / 2;
    boss.y = CONFIG.GAME_HEIGHT / 2 - boss.height / 2;
    boss.updatePosition();
    
    // Update rotation index for next spawn
    this.currentBossIndex = (this.currentBossIndex + 1) % this.bossRotation.length;
    
    // Log boss stats
    logger.debug(`Spawned ${boss.name} with ${boss.health} health`);
    console.log(`BOSS SYSTEM: Spawned ${boss.name} with ${boss.health} health at position (${boss.x}, ${boss.y})`);
    
    return boss;
  }
  
  /**
   * Set the game reference (needed for adding bosses to enemies array)
   * @param game - Game instance
   */
  setGameReference(game: any): void {
    this.game = game;
  }
  
  /**
   * Reset the boss spawn system
   */
  reset(): void {
    logger.debug('Resetting boss spawn system');
    console.log('BOSS SYSTEM: Resetting boss spawn system');
    
    // Reset timers - IMPORTANT: Make sure the timing is correct!
    this.nextBossTime = 2.5 * 60 * 1000; // 2.5 minutes (exactly 150,000ms)
    this.lastBossWarningTime = 0;
    
    // Reset state
    this.currentBoss = null;
    this.hasShownWarning = false;
    this.currentBossIndex = 0;
    
    console.log(`BOSS SYSTEM: Reset completed. Next boss at ${Math.floor(this.nextBossTime/1000)}s, warning at ${Math.floor((this.nextBossTime - this.bossWarningTime)/1000)}s`);
  }
}

export default BossSpawnSystem;