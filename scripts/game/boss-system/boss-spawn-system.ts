import { GameEvents, EVENTS } from '../../utils/event-system';
import { Boss, ChurchPaladin } from '../../entities/bosses';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BossSpawnSystem');

/**
 * System for handling boss spawning at specific time intervals
 */
export class BossSpawnSystem {
  // References
  gameContainer: HTMLElement;
  game: any;
  
  // Boss timing
  firstBossTime: number;
  bossSpawnInterval: number;
  nextBossTime: number;
  
  // Warning system
  bossWarningTime: number;
  warningShown: boolean;
  
  // Boss tracking
  currentBoss: Boss | null;
  bossRotation: Array<new (gameContainer: HTMLElement, playerLevel: number) => Boss>;
  currentBossIndex: number;
  
  // State
  initialSpawnsComplete: boolean;
  
  /**
   * Create a boss spawn system
   * @param gameContainer - DOM element for the game container
   * @param game - Reference to the game object
   */
  constructor(gameContainer: HTMLElement, game: any) {
    this.gameContainer = gameContainer;
    this.game = game;
    
    // Boss timing (in milliseconds)
    this.firstBossTime = 2.5 * 60 * 1000; // 2:30 minutes
    this.bossSpawnInterval = 2.5 * 60 * 1000; // Every 2.5 minutes after that
    this.nextBossTime = this.firstBossTime;
    
    // Warning 30 seconds before boss
    this.bossWarningTime = 30 * 1000;
    this.warningShown = false;
    
    // Boss tracking
    this.currentBoss = null;
    
    // Define boss rotation
    this.bossRotation = [
      ChurchPaladin,
      // Add other boss types as they're implemented
    ];
    this.currentBossIndex = 0;
    
    // State
    this.initialSpawnsComplete = false;
    
    // Log initialization
    logger.debug('Boss Spawn System initialized');
  }
  
  /**
   * Update the boss spawn system
   * @param gameTime - Current game time in milliseconds
   * @param playerLevel - Current player level
   * @returns Newly spawned boss or null
   */
  update(gameTime: number, playerLevel: number): Boss | null {
    // Don't spawn a new boss if one is already active
    if (this.currentBoss && this.currentBoss.isBossActive) {
      return null;
    }
    
    // Reset current boss reference if it's no longer active
    if (this.currentBoss && !this.currentBoss.isBossActive) {
      this.currentBoss = null;
      // Reset warning flag after boss is defeated
      this.warningShown = false;
    }
    
    // Show warning before boss spawn
    if (!this.warningShown && gameTime >= this.nextBossTime - this.bossWarningTime) {
      this.showBossWarning();
      this.warningShown = true;
    }
    
    // Check if it's time to spawn a boss
    if (gameTime >= this.nextBossTime) {
      // Spawn boss
      const boss = this.spawnBoss(playerLevel);
      
      // Update next boss time
      this.nextBossTime += this.bossSpawnInterval;
      
      // Return the spawned boss
      return boss;
    }
    
    return null;
  }
  
  /**
   * Spawn a boss
   * @param playerLevel - Current player level
   * @returns The spawned boss
   */
  spawnBoss(playerLevel: number): Boss {
    logger.debug(`Spawning boss: index=${this.currentBossIndex}, playerLevel=${playerLevel}`);
    
    // Get the boss class from rotation
    const BossClass = this.bossRotation[this.currentBossIndex];
    
    // Create boss instance
    const boss = new BossClass(this.gameContainer, playerLevel);
    
    // Set as current boss
    this.currentBoss = boss;
    
    // Update rotation index for next boss
    this.currentBossIndex = (this.currentBossIndex + 1) % this.bossRotation.length;
    
    // Emit boss spawn event
    GameEvents.emit(EVENTS.BOSS_SPAWN, boss);
    
    return boss;
  }
  
  /**
   * Show warning before boss spawn
   */
  showBossWarning(): void {
    logger.debug('Showing boss warning');
    
    // Get the next boss type name
    const nextBossIndex = this.currentBossIndex;
    const BossClass = this.bossRotation[nextBossIndex];
    
    // Create a temporary instance to get its name (without adding to DOM)
    const tempBoss = new BossClass(this.gameContainer, 1);
    const bossName = tempBoss.name;
    
    // Remove the temporary instance
    tempBoss.cleanup();
    
    // Create warning element
    const warning = document.createElement('div');
    warning.className = 'boss-warning';
    warning.style.position = 'fixed';
    warning.style.top = '30%';
    warning.style.left = '50%';
    warning.style.transform = 'translate(-50%, -50%)';
    warning.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    warning.style.color = '#ff0000';
    warning.style.padding = '20px';
    warning.style.borderRadius = '10px';
    warning.style.fontSize = '24px';
    warning.style.fontWeight = 'bold';
    warning.style.textAlign = 'center';
    warning.style.zIndex = '100';
    warning.style.boxShadow = '0 0 20px 10px rgba(255, 0, 0, 0.3)';
    warning.style.animation = 'warning-flash 1s infinite';
    warning.textContent = `WARNING: ${bossName} approaching!`;
    
    // Add to DOM
    document.body.appendChild(warning);
    
    // Play warning sound if available
    if (this.game && this.game.playSound) {
      this.game.playSound('bossWarning');
    }
    
    // Emit warning event
    GameEvents.emit(EVENTS.BOSS_WARNING, bossName);
    
    // Remove after warning duration
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, this.bossWarningTime);
  }
  
  /**
   * Check if a boss fight is currently active
   * @returns Whether a boss fight is active
   */
  isBossFightActive(): boolean {
    return this.currentBoss !== null && this.currentBoss.isBossActive;
  }
  
  /**
   * Get the time until next boss in milliseconds
   * @param gameTime - Current game time
   * @returns Time until next boss in milliseconds
   */
  getTimeUntilNextBoss(gameTime: number): number {
    return Math.max(0, this.nextBossTime - gameTime);
  }
  
  /**
   * Reset the boss spawn system
   */
  reset(): void {
    // Reset timing
    this.nextBossTime = this.firstBossTime;
    this.warningShown = false;
    
    // Reset boss tracking
    this.currentBoss = null;
    this.currentBossIndex = 0;
    
    // Reset state
    this.initialSpawnsComplete = false;
    
    logger.debug('Boss Spawn System reset');
  }
}

export default BossSpawnSystem;
