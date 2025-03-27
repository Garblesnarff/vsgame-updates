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
  
  // Arena system
  arenaRadius: number;
  arenaElement: HTMLElement | null;
  arenaCenter: { x: number, y: number };
  arenaShrinkRate: number;
  minArenaRadius: number;
  arenaCreated: boolean; // Track if arena has been created
  
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
    
    // Arena system - initialize with defaults to avoid undefined errors
    const minDimension = Math.min(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    this.arenaRadius = minDimension / 3; // Default arena size - 1/3 of the smaller dimension
    this.arenaElement = null;
    this.arenaCreated = false;
    
    // Initialize arena center to the center of the game area
    this.arenaCenter = {
      x: CONFIG.GAME_WIDTH / 2,
      y: CONFIG.GAME_HEIGHT / 2
    };
    
    this.arenaShrinkRate = 0.05; // Shrink by 5% per minute
    this.minArenaRadius = this.arenaRadius * 0.7; // Don't shrink below 70%
    
    // Boss state
    this.isBossActive = true;
    this.rewardDropped = false;
    
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
    
    // NOTE: We do NOT create the arena here! We'll create it in initialize()
    // This prevents issues with arena center being undefined in some cases
    
    logger.debug(`Boss ${this.id} created: ${this.name}, health=${this.health}, phase=${this.phase}/${this.maxPhases}`);
    logger.debug(`Arena will be centered at (${this.arenaCenter.x}, ${this.arenaCenter.y}) with radius ${this.arenaRadius}`);
  }
  
  /**
   * Initialize the boss
   */
  initialize(): void {
    super.initialize();
    
    // Create arena now that we know the game is fully initialized
    this.createArena();
    
    // Position the boss at the top center of the arena
    this.x = this.arenaCenter.x - this.width / 2;
    this.y = this.arenaCenter.y - this.height / 2 - 100; // Appear slightly above center
    
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
   * Create the arena visual element
   */
  createArena(): void {
    // Don't create arena if it already exists
    if (this.arenaCreated || this.arenaElement) {
      // Just update position if it already exists
      this.updateArenaPosition();
      return;
    }
    
    // Ensure arena center is set to the center of the game area
    this.arenaCenter = {
      x: CONFIG.GAME_WIDTH / 2,
      y: CONFIG.GAME_HEIGHT / 2
    };
    
    // Create arena element
    this.arenaElement = document.createElement('div');
    this.arenaElement.className = 'boss-arena';
    
    // Set initial size
    this.arenaElement.style.width = (this.arenaRadius * 2) + 'px';
    this.arenaElement.style.height = (this.arenaRadius * 2) + 'px';
    this.arenaElement.style.borderRadius = '50%';
    this.arenaElement.style.border = '3px solid rgba(255, 0, 0, 0.7)';
    this.arenaElement.style.boxShadow = 'inset 0 0 30px rgba(255, 0, 0, 0.3), 0 0 30px rgba(255, 0, 0, 0.3)';
    this.arenaElement.style.position = 'absolute';
    this.arenaElement.style.zIndex = '5'; // Above background, below entities
    this.arenaElement.style.pointerEvents = 'none'; // Don't block clicks
    
    // Add to game container
    this.gameContainer.appendChild(this.arenaElement);
    
    // Set initial position
    this.updateArenaPosition();
    
    // Mark arena as created
    this.arenaCreated = true;
    
    logger.debug(`Arena element created with radius ${this.arenaRadius}px`);
    logger.debug(`Arena centered at (${this.arenaCenter.x}, ${this.arenaCenter.y})`);
  }
  
  /**
   * Update arena position (centered on arena center)
   */
  updateArenaPosition(): void {
    if (!this.arenaElement) return;
    
    const left = this.arenaCenter.x - this.arenaRadius;
    const top = this.arenaCenter.y - this.arenaRadius;
    
    this.arenaElement.style.left = left + 'px';
    this.arenaElement.style.top = top + 'px';
    
    logger.debug(`Arena position updated to (${left}, ${top})`);
  }
  
  /**
   * Update arena size (shrinks slowly over time)
   * @param deltaTime - Time elapsed since last update in milliseconds
   */
  updateArenaSize(deltaTime: number): void {
    if (!this.arenaElement) return;
    
    // Calculate shrink amount (convert deltaTime to minutes)
    const shrinkAmount = this.arenaRadius * this.arenaShrinkRate * (deltaTime / (60 * 1000));
    
    // Shrink arena if it's still above minimum size
    if (this.arenaRadius > this.minArenaRadius) {
      this.arenaRadius -= shrinkAmount;
      
      // Update visual
      this.arenaElement.style.width = (this.arenaRadius * 2) + 'px';
      this.arenaElement.style.height = (this.arenaRadius * 2) + 'px';
      this.updateArenaPosition();
    }
  }
  
  /**
   * Check if an entity (player or enemy) is inside the arena
   * @param entity - Entity to check
   * @returns Whether the entity is inside
   */
  isEntityInArena(entity: any): boolean {
    // Safety check - if no arena center is defined, return true to avoid issues
    if (!this.arenaCenter) return true;
    
    // Calculate distance from arena center to entity center
    const entityCenterX = entity.x + entity.width / 2;
    const entityCenterY = entity.y + entity.height / 2;
    
    const dx = entityCenterX - this.arenaCenter.x;
    const dy = entityCenterY - this.arenaCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Entity is in arena if distance < arenaRadius
    return distance < this.arenaRadius;
  }
  
  /**
   * Contain an entity within the arena boundary
   * @param entity - Entity to contain
   */
  containEntityInArena(entity: any): void {
    // Safety check - if no arena center is defined, do nothing
    if (!this.arenaCenter) return;
    
    // Calculate vector from arena center to entity center
    const entityCenterX = entity.x + entity.width / 2;
    const entityCenterY = entity.y + entity.height / 2;
    
    const dx = entityCenterX - this.arenaCenter.x;
    const dy = entityCenterY - this.arenaCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only contain if outside arena
    if (distance > this.arenaRadius - entity.width / 2) {
      // Calculate normalized direction
      const dirX = dx / distance;
      const dirY = dy / distance;
      
      // Calculate new position on arena boundary
      const newDistance = this.arenaRadius - entity.width / 2;
      const newCenterX = this.arenaCenter.x + dirX * newDistance;
      const newCenterY = this.arenaCenter.y + dirY * newDistance;
      
      // Update entity position
      entity.x = newCenterX - entity.width / 2;
      entity.y = newCenterY - entity.height / 2;
      
      // Update position of DOM element
      entity.updatePosition();
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
   * Update boss state
   * @param deltaTime - Time since last update in ms
   * @param player - Reference to the player
   * @param enemies - Array of all enemies
   */
  update(deltaTime: number, player?: any, enemies?: Enemy[]): void {
    // Don't update if not active
    if (!this.isBossActive) return;
    
    // Call parent update
    super.update(deltaTime, player, enemies);
    
    // Update arena size (slowly shrinks)
    this.updateArenaSize(deltaTime);
    
    // Check for phase transitions
    this.checkPhaseTransition();
    
    // Update health bar
    this.updateHealthBar();
    
    // Contain player in arena
    if (player && this.arenaCreated) {
      this.containEntityInArena(player);
    }
    
    // Boss behavior changes based on phase - implemented in subclasses
    this.updatePhaseSpecificBehavior(deltaTime, player, enemies);
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
    // Remove arena
    if (this.arenaElement && this.arenaElement.parentNode) {
      this.arenaElement.parentNode.removeChild(this.arenaElement);
      this.arenaElement = null;
      this.arenaCreated = false;
    }
    
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