import { Enemy, ParticleCreationFunction } from '../enemies/base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Boss');

/**
 * Base Boss class representing special challenging enemies that appear at intervals
 * Extends the standard Enemy class with additional boss-specific functionality
 */
export class Boss extends Enemy {
  // Boss identity
  name: string;
  
  // Phase system
  phase: number;
  maxPhases: number;
  phaseThresholds: number[]; // Health percentages for phase transitions
  
  // Boss state
  isBossActive: boolean;
  rewardDropped: boolean;
  
  // Boss UI
  bossHealthBarContainer: HTMLElement | null;
  bossHealthBar: HTMLElement | null;
  phaseIndicators: HTMLElement[];
  
  // Special properties
  damageModifiers: Map<string, number>; // Ability types and their damage modifiers
  
  /**
   * Create a new boss
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  // For death checking 
  lastDeathCheckTime: number;
  deathCheckInterval: number;
  
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    // Call parent constructor
    super(gameContainer, playerLevel);
    
    // Set base boss properties
    this.name = "Boss";
    this.element.classList.add('boss');
    
    // Phase system
    this.phase = 1;
    this.maxPhases = 1; // Override in subclasses
    this.phaseThresholds = []; // Health percentages like [0.7, 0.4]
    
    // Boss state
    this.isBossActive = true;
    this.rewardDropped = false;
    
    // Set up periodic death checking (every 500ms)
    this.lastDeathCheckTime = Date.now();
    this.deathCheckInterval = 500;
    
    // Boss UI
    this.bossHealthBarContainer = null;
    this.bossHealthBar = null;
    this.phaseIndicators = [];
    
    // Special properties
    this.damageModifiers = new Map();
    
    // Scale boss appropriately
    this.scaleBossStats(playerLevel);
    
    // Create health bar in constructor
    this.createBossHealthBar();
    
    logger.debug(`Boss ${this.id} created: ${this.name}, health=${this.health}, phase=${this.phase}/${this.maxPhases}`);
  }
  
  /**
   * Initialize the boss
   */
  initialize(): void {
    super.initialize();
    
    // Position the boss at the center of the game area
    this.x = CONFIG.WORLD_WIDTH / 2 - this.width / 2; // Changed from GAME_WIDTH
    this.y = CONFIG.WORLD_HEIGHT / 2 - this.height / 2 - 100; // Changed from GAME_HEIGHT
    
    // Update position visually
    this.updatePosition();
    
    // Emit boss spawn event
    GameEvents.emit(EVENTS.BOSS_SPAWN, this);
    
    logger.debug(`Boss initialized at position (${this.x}, ${this.y})`);
  }
  
  /**
   * Scale boss stats based on player level
   * @param playerLevel - Current level of the player
   */
  scaleBossStats(playerLevel: number): void {
    // Default boss scaling - override in subclasses for specific scaling
    
    // Base health and damage (much higher than regular enemies)
    this.health = 1000 + playerLevel * 500;
    this.maxHealth = this.health;
    this.damage = 20 + playerLevel * 3;
    
    // Boss is much larger than regular enemies
    this.width = CONFIG.ENEMY.BASE.WIDTH * 2;
    this.height = CONFIG.ENEMY.BASE.HEIGHT * 2;
    
    // Update element size
    if (this.element) {
      this.element.style.width = this.width + 'px';
      this.element.style.height = this.height + 'px';
    }
  }
  
  /**
   * Create the boss health bar at the top of the screen
   */
  createBossHealthBar(): void {
    // Create container
    this.bossHealthBarContainer = document.createElement('div');
    this.bossHealthBarContainer.className = 'boss-health-container';
    this.bossHealthBarContainer.style.position = 'fixed';
    this.bossHealthBarContainer.style.top = '10px';
    this.bossHealthBarContainer.style.left = '50%';
    this.bossHealthBarContainer.style.transform = 'translateX(-50%)';
    this.bossHealthBarContainer.style.width = '80%';
    this.bossHealthBarContainer.style.height = '30px';
    this.bossHealthBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.bossHealthBarContainer.style.border = '2px solid #fff';
    this.bossHealthBarContainer.style.borderRadius = '5px';
    this.bossHealthBarContainer.style.zIndex = '100';
    this.bossHealthBarContainer.style.display = 'flex';
    this.bossHealthBarContainer.style.flexDirection = 'column';
    this.bossHealthBarContainer.style.padding = '5px';
    
    // Add boss name
    const nameElement = document.createElement('div');
    nameElement.className = 'boss-name';
    nameElement.textContent = this.name;
    nameElement.style.color = '#fff';
    nameElement.style.fontSize = '14px';
    nameElement.style.fontWeight = 'bold';
    nameElement.style.textAlign = 'center';
    nameElement.style.marginBottom = '5px';
    this.bossHealthBarContainer.appendChild(nameElement);
    
    // Create health bar background
    const healthBarBackground = document.createElement('div');
    healthBarBackground.style.width = '100%';
    healthBarBackground.style.height = '15px';
    healthBarBackground.style.backgroundColor = '#333';
    healthBarBackground.style.borderRadius = '3px';
    healthBarBackground.style.position = 'relative';
    this.bossHealthBarContainer.appendChild(healthBarBackground);
    
    // Create actual health bar
    this.bossHealthBar = document.createElement('div');
    this.bossHealthBar.className = 'boss-health-bar';
    this.bossHealthBar.style.width = '100%';
    this.bossHealthBar.style.height = '100%';
    this.bossHealthBar.style.backgroundColor = '#f00';
    this.bossHealthBar.style.borderRadius = '3px';
    this.bossHealthBar.style.transition = 'width 0.2s ease-out';
    healthBarBackground.appendChild(this.bossHealthBar);
    
    // Create phase indicators
    this.createPhaseIndicators(healthBarBackground);
    
    // Add to DOM
    document.body.appendChild(this.bossHealthBarContainer);
  }
  
  /**
   * Create phase transition indicators on the health bar
   * @param container - Health bar container element
   */
  createPhaseIndicators(container: HTMLElement): void {
    // Clear existing indicators
    this.phaseIndicators = [];
    
    // Create indicators for phase transitions
    for (let i = 0; i < this.phaseThresholds.length; i++) {
      const threshold = this.phaseThresholds[i];
      
      const indicator = document.createElement('div');
      indicator.className = 'phase-indicator';
      indicator.style.position = 'absolute';
      indicator.style.top = '0';
      indicator.style.left = `${threshold * 100}%`;
      indicator.style.width = '2px';
      indicator.style.height = '100%';
      indicator.style.backgroundColor = '#fff';
      indicator.style.zIndex = '5';
      
      container.appendChild(indicator);
      this.phaseIndicators.push(indicator);
    }
  }
  
  /**
   * Update the boss health bar
   */
  updateHealthBar(): void {
    if (!this.bossHealthBar) return;
    
    // Calculate health percentage
    const healthPercent = this.health / this.maxHealth;
    
    // Update health bar width
    this.bossHealthBar.style.width = `${healthPercent * 100}%`;
    
    // Update color based on health
    if (healthPercent > 0.6) {
      this.bossHealthBar.style.backgroundColor = '#f00'; // Red
    } else if (healthPercent > 0.3) {
      this.bossHealthBar.style.backgroundColor = '#ff7700'; // Orange
    } else {
      this.bossHealthBar.style.backgroundColor = '#ff0'; // Yellow
    }
  }
  
  /**
   * Show damage effect on the health bar
   */
  showHealthBarDamageEffect(): void {
    if (!this.bossHealthBar) return;
    
    // Flash the health bar
    this.bossHealthBar.style.filter = 'brightness(2)';
    
    // Reset after animation
    setTimeout(() => {
      if (this.bossHealthBar) {
        this.bossHealthBar.style.filter = 'none';
      }
    }, 100);
  }
  
  /**
   * Check if boss should transition to next phase
   */
  checkPhaseTransition(): void {
    if (this.phase >= this.maxPhases) return;
    
    // Calculate current health percentage
    const healthPercent = this.health / this.maxHealth;
    
    // Check if health is below next phase threshold
    const nextPhaseIndex = this.phase - 1;
    if (nextPhaseIndex < this.phaseThresholds.length && 
        healthPercent <= this.phaseThresholds[nextPhaseIndex]) {
      this.transitionToNextPhase();
    }
  }
  
  /**
   * Transition to the next phase
   */
  transitionToNextPhase(): void {
    // Increment phase
    this.phase++;
    
    // Trigger phase transition event
    GameEvents.emit(EVENTS.BOSS_PHASE_CHANGE, this, this.phase);
    
    // Apply phase transition effects
    this.applyPhaseTransitionEffects();
    
    logger.debug(`Boss ${this.id} transitioning to phase ${this.phase}`);
  }
  
  /**
   * Apply effects when transitioning to a new phase
   * Override in subclasses for specific effects
   */
  applyPhaseTransitionEffects(): void {
    // Default implementation - flash the boss
    if (this.element) {
      this.element.style.filter = 'brightness(3)';
      
      // Reset after animation
      setTimeout(() => {
        if (this.element) {
          this.element.style.filter = 'none';
        }
      }, 500);
    }
    
    // Flash health bar
    if (this.bossHealthBar) {
      this.bossHealthBar.style.filter = 'brightness(3)';
      
      // Reset after animation
      setTimeout(() => {
        if (this.bossHealthBar) {
          this.bossHealthBar.style.filter = 'none';
        }
      }, 500);
    }
  }
  
  /**
   * Check player for death condition and ensure they die if health <= 0
   * @param player - The player object
   * @returns Whether the player should be dead
   */
  checkPlayerDeath(player: any): boolean {
    if (!player || player.health === undefined) return false;
    
    // Check if player is already dead
    if (player.isDead === true) return true;
    
    // Check if player should be dead
    if (player.health <= 0) {
      logger.debug(`Player health is ${player.health}, should be dead`);
      
      // Try the die method if available
      if (player.die && typeof player.die === 'function') {
        try {
          logger.debug('Forcing player.die() method call');
          player.die();
          return true;
        } catch (error) {
          logger.debug(`Error calling player.die(): ${error}`);
        }
      } else if (GameEvents && GameEvents.emit) {
        // Alternative: Emit death event
        logger.debug('Emitting PLAYER_DEATH event');
        GameEvents.emit(EVENTS.PLAYER_DEATH, player);
        return true;
      }
      
      // Backup: Force isDead property
      if (player.isDead !== undefined) {
        player.isDead = true;
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Update boss state
   * @param deltaTime - Time since last update in ms
   * @param player - Reference to the player
   * @param enemies - Array of all enemies
   */
  update(deltaTime: number, player?: any, enemies?: Enemy[]): void {
    // Don't update if not active
    if (!this.isBossActive) return;
    
    // Call parent update (handles basic movement logic before clamping)
    // super.update(deltaTime, player, enemies); // Handle movement within phase logic

    // Periodic death check (every 500ms)
    const now = Date.now();
    if (player && now - this.lastDeathCheckTime > this.deathCheckInterval) {
      this.checkPlayerDeath(player);
      this.lastDeathCheckTime = now;
    }
    
    // Check for phase transitions
    this.checkPhaseTransition();
    
    // Update health bar
    this.updateHealthBar();
    
    
    // Boss behavior changes based on phase - implemented in subclasses
    this.updatePhaseSpecificBehavior(deltaTime, player, enemies);

    // Update visual position AFTER phase logic (which includes movement)
    this.updatePosition(); 
  }
  
  /**
   * Update phase-specific behavior
   * Override in subclasses for phase-specific behavior
   * @param deltaTime - Time since last update in ms
   * @param player - Reference to the player
   * @param enemies - Array of all enemies
   */
  updatePhaseSpecificBehavior(_deltaTime: number, _player?: any, _enemies?: Enemy[]): void {
    // Default implementation does nothing - override in subclasses
  }
  
  /**
   * Boss takes damage from a source
   * @param amount - Damage amount
   * @param createParticles - Function to create blood particles (optional)
   * @param projectileType - Type of projectile that caused damage (optional)
   * @returns Whether the boss died
   */
  takeDamage(
    amount: number,
    createParticles?: ParticleCreationFunction,
    projectileType?: string
  ): boolean {
    // Apply damage modifiers if applicable
    let modifiedAmount = amount;
    
    if (projectileType && this.damageModifiers.has(projectileType)) {
      const modifier = this.damageModifiers.get(projectileType) || 1;
      modifiedAmount = amount * modifier;
    }
    
    // Show damage effect on health bar
    this.showHealthBarDamageEffect();
    
    // Call parent method with modified amount
    const died = super.takeDamage(modifiedAmount, createParticles, projectileType);
    
    // If boss died and rewards not yet dropped
    if (died && !this.rewardDropped) {
      this.dropRewards();
      this.rewardDropped = true;
    }
    
    return died;
  }
  
  /**
   * Drop rewards when boss is defeated
   * Override in subclasses for specific rewards
   */
  dropRewards(): void {
    // Default implementation
    logger.debug(`Boss ${this.id} dropping rewards`);
    
    // Emit rewards event
    GameEvents.emit(EVENTS.BOSS_DEFEATED, this);
  }
  
  /**
   * Clean up boss resources
   * @param player - Optional player reference to unregister collision
   */
  cleanup(player?: any): void {
    logger.info(`Cleanup called for Boss ${this.id} (${this.name})`); // Added log
    
    // Remove health bar
    if (this.bossHealthBarContainer && this.bossHealthBarContainer.parentNode) {
      this.bossHealthBarContainer.parentNode.removeChild(this.bossHealthBarContainer);
      this.bossHealthBarContainer = null;
    }
    
    // Set boss as inactive
    this.isBossActive = false;
    
    // Call parent cleanup
    super.cleanup(player);
    
    logger.debug(`Boss ${this.id} cleanup complete`);
  }
}

export default Boss;
