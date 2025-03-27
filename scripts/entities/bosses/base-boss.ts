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
   * Create a visual effect when an entity hits the arena barrier
   * @param x - X coordinate of impact
   * @param y - Y coordinate of impact
   */
  createBarrierImpact(x: number, y: number): void {
    // Create impact element
    const impact = document.createElement('div');
    impact.className = 'barrier-impact';
    
    // Set position and size
    const size = 60;
    impact.style.width = `${size}px`;
    impact.style.height = `${size}px`;
    impact.style.left = `${x - size/2}px`;
    impact.style.top = `${y - size/2}px`;
    impact.style.position = 'absolute';
    impact.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    impact.style.border = '2px solid rgba(255, 0, 0, 0.7)';
    impact.style.borderRadius = '50%';
    impact.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
    impact.style.zIndex = '60';
    
    // Add animation
    const animationName = 'barrier-impact';
    if (!document.getElementById(animationName + '-style')) {
      const style = document.createElement('style');
      style.id = animationName + '-style';
      style.textContent = `
        @keyframes ${animationName} {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    impact.style.animation = `${animationName} 0.5s forwards`;
    
    // Add to game container
    this.gameContainer.appendChild(impact);
    
    // Remove after animation
    setTimeout(() => {
      if (impact.parentNode) {
        impact.parentNode.removeChild(impact);
      }
    }, 500);
  }
  
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
    
    // Adjust arena radius for better visibility
    const minDimension = Math.min(CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
    this.arenaRadius = minDimension * 0.4; // 40% of the smaller dimension
    
    // Create arena element
    this.arenaElement = document.createElement('div');
    this.arenaElement.className = 'boss-arena';
    
    // Set initial size
    this.arenaElement.style.width = (this.arenaRadius * 2) + 'px';
    this.arenaElement.style.height = (this.arenaRadius * 2) + 'px';
    this.arenaElement.style.borderRadius = '50%';
    this.arenaElement.style.border = '8px solid rgba(255, 0, 0, 0.9)';
    this.arenaElement.style.boxShadow = 'inset 0 0 70px rgba(255, 0, 0, 0.7), 0 0 70px rgba(255, 0, 0, 0.7)';
    this.arenaElement.style.position = 'absolute';
    this.arenaElement.style.zIndex = '50'; // Increased to ensure visibility
    this.arenaElement.style.pointerEvents = 'none'; // Don't block clicks
    
    // Add pulsing animation
    const animationName = 'arena-pulse';
    if (!document.getElementById(animationName + '-style')) {
      const style = document.createElement('style');
      style.id = animationName + '-style';
      style.textContent = `
        @keyframes ${animationName} {
          0% { box-shadow: inset 0 0 70px rgba(255, 0, 0, 0.7), 0 0 70px rgba(255, 0, 0, 0.7); border-color: rgba(255, 0, 0, 0.9); }
          50% { box-shadow: inset 0 0 100px rgba(255, 0, 0, 1), 0 0 100px rgba(255, 0, 0, 1); border-color: rgba(255, 255, 255, 1); transform: scale(1.01); }
          100% { box-shadow: inset 0 0 70px rgba(255, 0, 0, 0.7), 0 0 70px rgba(255, 0, 0, 0.7); border-color: rgba(255, 0, 0, 0.9); }
        }
      `;
      document.head.appendChild(style);
    }
    this.arenaElement.style.animation = `${animationName} 2s infinite ease-in-out`
    
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
   * Contain an entity within the arena boundary - DEPRECATED: Use clampToArena in movement methods instead.
   * @param entity - Entity to contain
   */
  containEntityInArena(entity: any): void {
    // Safety check - if no arena center is defined, do nothing
    if (!this.arenaCenter || !entity) return;
    
    // Make sure entity has position and size properties
    if (typeof entity.x !== 'number' || typeof entity.y !== 'number' ||
        typeof entity.width !== 'number' || typeof entity.height !== 'number') {
      return;
    }
    
    // Calculate vector from arena center to entity center
    const entityCenterX = entity.x + entity.width / 2;
    const entityCenterY = entity.y + entity.height / 2;
    
    const dx = entityCenterX - this.arenaCenter.x;
    const dy = entityCenterY - this.arenaCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Buffer to keep entities fully inside arena
    const buffer = 10; // Increased buffer
    
    // Only contain if outside arena (using >= for robustness)
    if (distance >= this.arenaRadius - entity.width / 2 - buffer) {
      // Calculate normalized direction
      const dirX = dx / distance;
      const dirY = dy / distance;
      
      // Calculate new position on arena boundary with buffer
      const newDistance = this.arenaRadius - entity.width / 2 - buffer;
      const newCenterX = this.arenaCenter.x + dirX * newDistance;
      const newCenterY = this.arenaCenter.y + dirY * newDistance;
      
      // Update entity position
      entity.x = newCenterX - entity.width / 2;
      entity.y = newCenterY - entity.height / 2;
      
      // Update position of DOM element if method exists
      if (typeof entity.updatePosition === 'function') {
        entity.updatePosition();
      }
      
      // Create impact effect if it's the player
      if (entity.isPlayer) {
        this.createBarrierImpact(newCenterX, newCenterY);
        
        // Log message for debugging
        logger.debug(`Player contained at boundary. Distance: ${distance.toFixed(2)}, Arena radius: ${this.arenaRadius.toFixed(2)}`);
      } else if (entity === this) {
        // Log if boss is contained
        logger.debug(`Boss contained at boundary. Distance: ${distance.toFixed(2)}, Arena radius: ${this.arenaRadius.toFixed(2)}`);
      }
    }
  }

  /**
   * Clamps the given coordinates to stay within the arena boundaries.
   * @param x - The potential next X coordinate.
   * @param y - The potential next Y coordinate.
   * @returns The clamped [x, y] coordinates.
   */
  clampToArena(x: number, y: number): [number, number] {
    if (!this.arenaCreated || !this.arenaCenter || !this.arenaRadius) {
      return [x, y]; // No arena, return original position
    }

    const entityRadius = (this.width + this.height) / 4; // Approximate radius
    const buffer = 5; // Small buffer

    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;

    const dx = centerX - this.arenaCenter.x;
    const dy = centerY - this.arenaCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDist = this.arenaRadius - entityRadius - buffer;

    if (distance >= maxDist) {
      const angle = Math.atan2(dy, dx);
      const clampedCenterX = this.arenaCenter.x + Math.cos(angle) * maxDist;
      const clampedCenterY = this.arenaCenter.y + Math.sin(angle) * maxDist;
      
      // Return clamped position based on center
      return [clampedCenterX - this.width / 2, clampedCenterY - this.height / 2];
    }

    // Position is already inside the arena
    return [x, y];
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
    // super.update(deltaTime, player, enemies); // We'll call this after clamping if needed, or handle movement within phase logic

    // Periodic death check (every 500ms)
    const now = Date.now();
    if (player && now - this.lastDeathCheckTime > this.deathCheckInterval) {
      this.checkPlayerDeath(player);
      this.lastDeathCheckTime = now;
    }
    
    // Update arena size (slowly shrinks)
    this.updateArenaSize(deltaTime);
    
    // Check for phase transitions
    this.checkPhaseTransition();
    
    // Update health bar
    this.updateHealthBar();
    
    // Arena containment is now handled within player and boss movement methods.
    // Containment for other enemies might still be needed here.
    if (this.arenaCreated) {
      // Player and Boss handle their own containment in their move methods.
      
      // Check player status for logging/teleport logic
      if (player) {
        // Check if player should be dead - use our dedicated method
        if (this.checkPlayerDeath(player)) {
          // Player should be dead or was just killed, skip containment
          logger.debug('Player is dead, skipping arena containment');
          // Still need to update phase behavior even if player is dead
          this.updatePhaseSpecificBehavior(deltaTime, player, enemies);
          this.updatePosition(); // Update visual position
          return; // Skip remaining enemy containment if player is dead
        }
        
        // Only log player health every 2 seconds to avoid spamming the console
        if (now % 2000 < 20 && player.health !== undefined) {
          logger.debug(`Player health: ${player.health}`);
        }
        
        // Force containment with a more aggressive check (teleport if way outside)
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        const dx = playerCenterX - this.arenaCenter.x;
        const dy = playerCenterY - this.arenaCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If player is far outside arena, teleport them inside with visual effect
        if (distance > this.arenaRadius * 1.2) {
          logger.debug(`Player way outside arena (${distance} > ${this.arenaRadius * 1.2}), teleporting in`);
          player.x = this.arenaCenter.x - player.width / 2;
          player.y = this.arenaCenter.y - player.height / 2;
          player.updatePosition();
        }
        
        // Note: Player's move method now handles its own clamping.
        // this.containEntityInArena(player); // Removed
      }
      
      // Contain other enemies if provided
      if (enemies) {
        for (const enemy of enemies) {
          // Only process other enemies (not self)
          if (enemy !== this) {
            // TODO: Implement clamping in BaseEnemy movement or keep this?
            // For now, keep containing other enemies here.
            // This method is deprecated, but keep it for non-boss enemies for now.
            this.containEntityInArena(enemy); 
          }
        }
      }
    }
    
    // Boss behavior changes based on phase - implemented in subclasses
    // Movement methods within phase logic should now handle clamping
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
    // Remove arena
    if (this.arenaElement && this.arenaElement.parentNode) {
      logger.debug(`Removing arena element for Boss ${this.id}`);
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
