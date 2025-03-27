import CONFIG from "../config";
import { AbilityManager } from "../abilities/ability-manager";
import { GameEvents, EVENTS } from "../utils/event-system";
import { Game } from "../game/game";
import { LevelSystem } from "../game/level-system";
import { StatsComponent } from "../ecs/components/StatsComponent";
import { createLogger } from "../utils/logger";
import { IPlayer, AutoAttack, ProjectileOptions } from "../types/player-types";
import stateStore from "../game/state-store";
import { BaseEntity } from "./base-entity";

// Create a logger for the Player class
const logger = createLogger('Player');

/**
 * Player class representing the main character in the game
 * Implements IPlayer interface for type safety
 */
export class Player extends BaseEntity implements IPlayer {
  // These properties can be computed from the state store but we keep them
  // to maintain interface compatibility and avoid breaking existing code
  get level(): number { return stateStore.player.level.get(); }
  get kills(): number { return stateStore.levelSystem.kills.get(); }
  
  // Die method that ensures proper death state transition
  die(): void {
    // Only process if actually alive
    if (!this.isAlive) return;
    
    // Set state to dead
    this.isAlive = false;
    // State store updates isAlive via the setter
    
    // Add visual death effect
    this.element.classList.add('dead');
    
    // Emit death event
    GameEvents.emit(EVENTS.PLAYER_DEATH, this);
    
    console.log("Player death triggered at health: " + this.stats.getHealth());
  }
  
  // Game reference
  readonly game: Game | null;

  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;

  // Stats
  stats: StatsComponent;

  // Progression - linked to state store
  get skillPoints(): number { return stateStore.player.skillPoints.get(); }
  set skillPoints(value: number) { stateStore.player.skillPoints.set(value); }

  // States - linked to state store
  get isAlive(): boolean { return stateStore.player.isAlive.get(); }
  set isAlive(value: boolean) { stateStore.player.isAlive.set(value); }
  
  get isInvulnerable(): boolean { return stateStore.player.isInvulnerable.get(); }
  set isInvulnerable(value: boolean) { stateStore.player.isInvulnerable.set(value); }
  
  get showingSkillMenu(): boolean { return stateStore.ui.showingSkillMenu.get(); }
  set showingSkillMenu(value: boolean) { stateStore.ui.showingSkillMenu.set(value); }
  lastDamageTime: number; // Track last damage time for collision cooldown
  private invulnerabilityTimeoutId = 0; // Track invulnerability timeout, default to 0 (invalid ID)
  
  // Damage handling and collision tracking
  readonly collidingEnemies = new Set<string>(); // Track enemies colliding by ID
  
  // Attack properties
  lastAttack: number;
  attackCooldown: number;
  projectileSpeed: number;

  // Auto attack settings
  autoAttack: AutoAttack;

  // Abilities
  abilityManager: AbilityManager;

  // DOM element inherited from BaseEntity
  levelSystem: LevelSystem | null = null;

  // Vampire Scout mark effect
  private vampireScoutMarkActive: boolean = false;
  private energyRegenReductionFactor: number = 1;
  private markTimeoutId: number = 0;

  /**
   * Create a new player
   * @param gameContainer - DOM element containing the game
   * @param game - Optional Game instance reference
   */
  constructor(gameContainer: HTMLElement, game: Game | null = null) {
    super(gameContainer, 'player', 'div', 'player');
    this.game = game;

    // Position and dimensions
    this.x = CONFIG.GAME_WIDTH / 2 - CONFIG.PLAYER.WIDTH / 2;
    this.y = CONFIG.GAME_HEIGHT / 2 - CONFIG.PLAYER.HEIGHT / 2;
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;
    this.speed = CONFIG.PLAYER.SPEED;

    // Stats
    this.stats = new StatsComponent({
      health: CONFIG.PLAYER.MAX_HEALTH,
      maxHealth: CONFIG.PLAYER.MAX_HEALTH,
      energy: CONFIG.PLAYER.MAX_ENERGY,
      maxEnergy: CONFIG.PLAYER.MAX_ENERGY,
      energyRegen: CONFIG.PLAYER.ENERGY_REGEN,
      speed: CONFIG.PLAYER.SPEED,
      attackPower: 1, // Default attack power
      defense: 1,     // Default defense
      attackSpeedMultiplier: 1, // Default attack speed multiplier
      lifeStealPercentage: 0,   // Default life steal percentage
    });
    
    // Initialize state store with initial values
    this.initializeStateStore();
    
    // States
    this.lastDamageTime = 0; // Initialize last damage time

    // Attack properties
    this.lastAttack = 0;
    this.attackCooldown = CONFIG.PLAYER.ATTACK_COOLDOWN;
    this.projectileSpeed = CONFIG.PLAYER.PROJECTILE_SPEED;

    // Auto attack settings
    this.autoAttack = this.createInitialAutoAttack();

    // Initialize abilities
    this.abilityManager = new AbilityManager(this);

    // Set up the DOM element (already created in BaseEntity constructor)
    this.setupPlayerElement();
    this.updatePosition();
    
    // Call initialize on the player
    this.initialize();
    
    // Set up state change handlers
    this.setupStateChangeHandlers();
  }

  /**
   * Initialize the player
   */
  initialize(): void {
    super.initialize();
    logger.debug('Player initialized');
  }

  /**
   * Update player state
   * @param deltaTime - Time since last update in ms
   * @param keys - Current state of keyboard keys
   */
  update(deltaTime: number, keys?: Record<string, boolean>): void {
    super.update(deltaTime);
    
    // Double-check health vs alive state for consistency
    // This ensures player dies if health is zero but alive state wasn't updated
    if (this.stats.getHealth() <= 0 && this.isAlive) {
      console.log("Inconsistent player state detected in update - fixing");
      this.die();
      return;
    }
    
    // Don't update if dead
    if (!this.isAlive) return;
    
    // Move player if keys are provided
    if (keys) {
      this.move(keys);
    }
    
    // Regenerate energy
    this.regenerateEnergy(deltaTime);
  }

  /**
   * Initialize the state store with player initial values
   * Extracted method to avoid duplicated state updates
   */
  private initializeStateStore(): void {
    // Update state store with initial stats
    stateStore.player.health.set(this.stats.getHealth());
    stateStore.player.maxHealth.set(this.stats.getMaxHealth());
    stateStore.player.energy.set(this.stats.getEnergy());
    stateStore.player.maxEnergy.set(this.stats.getMaxEnergy());
    stateStore.player.attackPower.set(this.stats.getAttackPower());
    stateStore.player.attackSpeed.set(this.stats.getAttackSpeedMultiplier());
    stateStore.player.lifeSteal.set(this.stats.getLifeStealPercentage());

    // Set initial player state
    stateStore.player.level.set(1);
    stateStore.player.isAlive.set(true);
    stateStore.player.isInvulnerable.set(false);
    stateStore.player.skillPoints.set(0);
  }

  /**
   * Create initial auto attack configuration
   * Extracted method for better organization
   */
  private createInitialAutoAttack(): AutoAttack {
    return {
      enabled: CONFIG.ABILITIES.AUTO_ATTACK.ENABLED,
      cooldown: CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN,
      originalCooldown: CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN,
      lastFired: 0,
      damage: CONFIG.ABILITIES.AUTO_ATTACK.DAMAGE,
      range: CONFIG.ABILITIES.AUTO_ATTACK.RANGE,
      level: 1,
      maxLevel: CONFIG.ABILITIES.AUTO_ATTACK.MAX_LEVEL,
    };
  }

  /**
   * Setup player DOM element
   * Makes sure the element has the right class and is added to the container
   */
  private setupPlayerElement(): void {
    // Element class is already set in the constructor via BaseEntity
    // Just make sure it's in the game container
    this.gameContainer.appendChild(this.element);
  }

  /**
   * Calculate dynamic damage cooldown based on player stats and environment
   * As life steal increases or more enemies are present, the cooldown decreases
   * to keep the game challenging regardless of player upgrades
   * @returns cooldown in milliseconds
   */
  private getDynamicDamageCooldown(): number {
    // Base cooldown for collision detection
    const baseCooldown = 100; // ms between damage applications
    
    // Get life steal percentage
    const lifeStealPct = this.stats.getLifeStealPercentage();
    
    // Calculate cooldown - scale down as life steal increases
    let cooldown = baseCooldown;
    
    // For high life steal percentages, reduce cooldown to allow more damage through
    if (lifeStealPct > 50) {
      // Scale down cooldown based on life steal (min 10ms)
      const reductionFactor = Math.min(0.9, (lifeStealPct - 50) / 100);
      cooldown *= (1 - reductionFactor);
    }
    
    // If many enemies are colliding, reduce cooldown even further
    const enemyCount = this.collidingEnemies.size;
    if (enemyCount > 1) {
      // Scale down cooldown based on number of enemies (minimum 10ms)
      cooldown = Math.max(10, cooldown / Math.sqrt(enemyCount));
    }
    
    logger.debug(`Dynamic damage cooldown: ${cooldown}ms, Enemies: ${enemyCount}, Life steal: ${lifeStealPct}%`);
    return cooldown;
  }
  
  /**
   * Register an enemy collision - called when an enemy begins colliding
   * @param enemy - The enemy that started colliding
   */
  registerEnemyCollision(enemy: any): void {
    if (enemy && enemy.id) {
      this.collidingEnemies.add(enemy.id);
      logger.debug(`Enemy ${enemy.id} registered collision. Total colliding: ${this.collidingEnemies.size}`);
    }
  }
  
  /**
   * Unregister an enemy collision - called when an enemy stops colliding
   * @param enemy - The enemy that stopped colliding
   */
  unregisterEnemyCollision(enemy: any): void {
    if (enemy && enemy.id && this.collidingEnemies.has(enemy.id)) {
      this.collidingEnemies.delete(enemy.id);
      logger.debug(`Enemy ${enemy.id} unregistered collision. Total colliding: ${this.collidingEnemies.size}`);
    }
  }

  /**
   * Updates player position based on input, respecting arena boundaries during boss fights.
   * @param keys - Current state of keyboard keys
   */
  move(keys: Record<string, boolean>): void {
    let deltaX = 0;
    let deltaY = 0;

    // Calculate intended movement based on keys
    if (keys["ArrowUp"] || keys["w"]) {
      deltaY -= this.speed;
    }
    if (keys["ArrowDown"] || keys["s"]) {
      deltaY += this.speed;
    }
    if (keys["ArrowLeft"] || keys["a"]) {
      deltaX -= this.speed;
    }
    if (keys["ArrowRight"] || keys["d"]) {
      deltaX += this.speed;
    }

    // Calculate potential next position
    let nextX = this.x + deltaX;
    let nextY = this.y + deltaY;

    // Clamp to game boundaries first
    nextX = Math.max(0, Math.min(CONFIG.GAME_WIDTH - this.width, nextX));
    nextY = Math.max(0, Math.min(CONFIG.GAME_HEIGHT - this.height, nextY));

    // Check for boss arena containment if applicable
    const game = this.game; // Access game instance
    // Check if game exists, is in boss fight, and currentBoss exists with arena details
    // Use type assertion for game properties added by integration
    if (game && (game as any).isInBossFight && (game as any).currentBoss && (game as any).currentBoss.arenaCenter && (game as any).currentBoss.arenaRadius) {
      const boss = (game as any).currentBoss;
      const arenaCenter = boss.arenaCenter;
      const arenaRadius = boss.arenaRadius;
      
      // Use player's approximate radius for boundary check (average of width/height)
      const playerRadius = (this.width + this.height) / 4; 
      const buffer = 5; // Small buffer to prevent sticking exactly on the edge

      // Calculate potential next center position
      const nextCenterX = nextX + this.width / 2;
      const nextCenterY = nextY + this.height / 2;

      // Calculate distance from arena center to potential next center
      const dx = nextCenterX - arenaCenter.x;
      const dy = nextCenterY - arenaCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If potential position is outside the arena boundary
      if (distance >= arenaRadius - playerRadius - buffer) {
        // Calculate the angle from arena center to the potential position
        const angle = Math.atan2(dy, dx);
        
        // Calculate the maximum allowed distance from the center
        const maxDist = arenaRadius - playerRadius - buffer;
        
        // Clamp the position to the boundary
        const clampedCenterX = arenaCenter.x + Math.cos(angle) * maxDist;
        const clampedCenterY = arenaCenter.y + Math.sin(angle) * maxDist;
        
        // Update nextX and nextY based on the clamped center position
        nextX = clampedCenterX - this.width / 2;
        nextY = clampedCenterY - this.height / 2;

        // Re-clamp to game boundaries in case the arena edge is outside
        nextX = Math.max(0, Math.min(CONFIG.GAME_WIDTH - this.width, nextX));
        nextY = Math.max(0, Math.min(CONFIG.GAME_HEIGHT - this.height, nextY));
        
        // Optional: Trigger barrier impact effect (if boss has the method)
        if (typeof boss.createBarrierImpact === 'function') {
           boss.createBarrierImpact(clampedCenterX, clampedCenterY);
        }
      }
    }

    // Apply the final (potentially clamped) position
    this.x = nextX;
    this.y = nextY;

    // Update the visual position
    this.updatePosition();
  }

  /**
   * Updates the DOM element position
   */
  updatePosition(): void {
    this.element.style.left = this.x + "px";
    this.element.style.top = this.y + "px";
  }

  /**
   * Regenerates energy over time
   */
  regenerateEnergy(deltaTime: number): void {
    // Apply energy regen reduction if marked by Vampire Scout
    const effectiveRegen = this.stats.getEnergyRegen() * this.energyRegenReductionFactor;
    
    const newEnergy = Math.min(
      this.stats.getMaxEnergy(),
      this.stats.getEnergy() + effectiveRegen * (deltaTime / 1000)
    );
    
    this.stats.setEnergy(newEnergy);
    
    // Update state store
    stateStore.player.energy.set(newEnergy);
  }

  /**
   * Player takes damage from an enemy
   * @param amount - Damage amount
   * @returns Whether damage was actually applied (not invulnerable)
   */
  takeDamage(amount: number): boolean {
    const now = Date.now();
    
    // If player is already dead, ignore further damage
    if (!this.isAlive) {
      return false;
    }
    
    // Check invulnerability
    if (this.isInvulnerable) {
      return false;
    }
    
    // Use dynamic damage cooldown based on player stats and situation
    const cooldown = this.getDynamicDamageCooldown();
    if (now - this.lastDamageTime < cooldown) {
      return false;
    }
    
    // Update last damage time
    this.lastDamageTime = now;

    let damageTaken = amount;

    // Apply defense reduction
    damageTaken = Math.max(1, damageTaken - this.stats.getDefense());

    // Check if Night Shield is active
    const nightShield = this.abilityManager.getAbility("nightShield");
    if (
      nightShield &&
      nightShield.isActive() &&
      nightShield.currentShield > 0
    ) {
      return nightShield.absorbDamage(damageTaken);
    }

    // Calculate new health
    const newHealth = Math.max(0, this.stats.getHealth() - damageTaken);
    
    // Update stats component
    this.stats.setHealth(newHealth);
    
    // Update state store
    stateStore.player.health.set(newHealth);

    // Emit damage event
    GameEvents.emit(EVENTS.PLAYER_DAMAGE, damageTaken, this);

    // Force consistency between health value and alive state
    if (newHealth <= 0 && this.isAlive) {
      console.log("Player health at zero - triggering death");
      this.die();
    }

    return true;
  }

  /**
   * Heals the player
   * @param amount - Healing amount
   */
  heal(amount: number): void {
    const oldHealth = this.stats.getHealth();
    const newHealth = Math.min(this.stats.getMaxHealth(), oldHealth + amount);
    
    // Update stats component
    this.stats.setHealth(newHealth);
    
    // Update state store
    stateStore.player.health.set(newHealth);

    // Only emit heal event if actually healed
    if (newHealth > oldHealth) {
      GameEvents.emit(EVENTS.PLAYER_HEAL, amount, this);
    }
  }

  /**
   * Fires a projectile toward a target
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @param createProjectile - Function to create a projectile
   * @returns Whether the projectile was fired
   */
  fireProjectile(
    targetX: number,
    targetY: number,
    createProjectile: (options: ProjectileOptions) => void
  ): boolean {
    const now = Date.now();

    // Check cooldown and energy
    if (now - this.lastAttack < this.attackCooldown || this.stats.getEnergy() < 10) {
      return false;
    }

    // Calculate new energy
    const newEnergy = this.stats.getEnergy() - 10;
    
    // Update stats component
    this.stats.setEnergy(newEnergy);
    
    // Update state store
    stateStore.player.energy.set(newEnergy);
    
    this.lastAttack = now;

    // Calculate direction
    const angle = Math.atan2(
      targetY - (this.y + this.height / 2),
      targetX - (this.x + this.width / 2)
    );

    // Create projectile
    createProjectile({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed,
      damage: CONFIG.PLAYER.MANUAL_PROJECTILE_DAMAGE * this.stats.getAttackPower(), // Apply attack power as a multiplier
      isAutoAttack: false,
    });

    return true;
  }

  /**
   * Fires an auto-attack projectile toward a target
   * @param enemy - Target enemy
   * @param createProjectile - Function to create a projectile
   * @returns Whether the projectile was fired
   */
  fireAutoProjectile(
    enemy: any,
    createProjectile: (options: ProjectileOptions) => void
  ): boolean {
    const now = Date.now();

    // Check cooldown
    const timeSinceLastFired = now - this.autoAttack.lastFired;
    const cooldown = this.autoAttack.cooldown;
    
    logger.debug(`Attempting to fire auto-projectile. Time since last: ${timeSinceLastFired}ms, Cooldown: ${cooldown}ms`);
    
    if (timeSinceLastFired < cooldown) {
      return false;
    }

    // Calculate direction
    const targetX = enemy.x + enemy.width / 2;
    const targetY = enemy.y + enemy.height / 2;
    const angle = Math.atan2(
      targetY - (this.y + this.height / 2),
      targetX - (this.x + this.width / 2)
    );

    // Create projectile
    logger.debug(`Firing auto-projectile at enemy`);
    createProjectile({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed,
      damage: this.autoAttack.damage * this.stats.getAttackPower(), // Apply attack power as a multiplier
      isAutoAttack: true,
    });

    // Update last fired timestamp
    this.autoAttack.lastFired = now;
    return true;
  }

  /**
   * Set up handlers for state changes
   */
  private setupStateChangeHandlers(): void {
    // When player health is updated in the state store, update the UI
    stateStore.player.health.subscribe('player-health-ui', (newHealth) => {
      logger.debug(`Player health updated to ${newHealth}`);
    });
    
    // When player level changes, update abilities or other mechanics
    stateStore.player.level.subscribe('player-level-abilities', (newLevel) => {
      logger.debug(`Player level updated to ${newLevel}`);
      
      // Check for unlockable abilities - no need for conditional
      this.abilityManager.checkUnlockableAbilities();
    });
  }

  /**
   * Make the player temporarily invulnerable
   * @param duration - Duration in milliseconds
   */
  setInvulnerable(duration: number): void {
    // Clear any existing invulnerability timeout
    this.clearInvulnerabilityTimeout();
    
    // Set invulnerable state
    this.isInvulnerable = true;

    // Add visual indication of invulnerability
    this.element.classList.add('invulnerable');
    
    // Set timeout to remove invulnerability after duration
    this.invulnerabilityTimeoutId = window.setTimeout(() => {
      this.isInvulnerable = false;
      
      // Remove visual indication
      this.element.classList.remove('invulnerable');
      
      this.invulnerabilityTimeoutId = 0;
      
      logger.debug('Invulnerability ended');
    }, duration);
    
    logger.debug(`Player invulnerable for ${duration}ms`);
  }
  
  /**
   * Clear the invulnerability timeout if it exists
   */
  private clearInvulnerabilityTimeout(): void {
    if (this.invulnerabilityTimeoutId !== 0) {
      window.clearTimeout(this.invulnerabilityTimeoutId);
      this.invulnerabilityTimeoutId = 0;
    }
  }

  /**
   * Add a kill to the player's count
   * @returns Whether the player leveled up
   */
  addKill(): boolean {
    // If the player has a level system, use that
    if (this.levelSystem) {
      return this.levelSystem.addKill();
    }
    
    // Otherwise, use the state store to update kills
    const currentKills = stateStore.levelSystem.kills.get();
    stateStore.levelSystem.kills.set(currentKills + 1);
    
    return false; // No level-up without a level system
  }

  /**
   * Set the level system reference and ensure state store is kept in sync
   * @param levelSystem - The level system instance
   */
  setLevelSystem(levelSystem: LevelSystem): void {
    this.levelSystem = levelSystem;
    
    // Initialize state store with current level from the level system
    stateStore.player.level.set(levelSystem.getLevel());
    stateStore.levelSystem.level.set(levelSystem.getLevel());
    stateStore.levelSystem.kills.set(levelSystem.getKills());
    stateStore.levelSystem.killsToNextLevel.set(levelSystem.getKillsToNextLevel());
    
    // Listen for level changes using a lambda to avoid 'this' binding issues
    levelSystem.onLevelUp((newLevel: number) => {
      // Update state store values
      stateStore.player.level.set(newLevel);
      stateStore.levelSystem.level.set(newLevel);
    });
  }

  /**
   * Apply Vampire Scout mark effect to the player
   * @param energyRegenReduction - Factor to reduce energy regeneration by (0.5 = 50% reduction)
   */
  applyVampireScoutMark(energyRegenReduction: number): void {
    // Clear any existing mark timeout
    this.clearMarkTimeout();
    
    // Set mark as active
    this.vampireScoutMarkActive = true;
    
    // Set energy regen reduction
    this.energyRegenReductionFactor = 1 - energyRegenReduction;
    
    // Add visual indication that isn't too overwhelming
    this.element.classList.add('vampire-scout-marked');
    
    logger.debug(`Player marked by Vampire Scout. Energy regen reduced by ${energyRegenReduction * 100}%`);
  }
  
  /**
   * Remove Vampire Scout mark effect from the player
   */
  removeVampireScoutMark(): void {
    // Reset mark state
    this.vampireScoutMarkActive = false;
    this.energyRegenReductionFactor = 1;
    
    // Remove visual indication
    this.element.classList.remove('vampire-scout-marked');
    
    // Clear timeout if it exists
    this.clearMarkTimeout();
    
    logger.debug('Vampire Scout mark removed from player');
  }
  
  /**
   * Clear the mark timeout if it exists
   */
  private clearMarkTimeout(): void {
    if (this.markTimeoutId !== 0) {
      window.clearTimeout(this.markTimeoutId);
      this.markTimeoutId = 0;
    }
  }

  /**
   * Check if player is marked by Vampire Scout
   * @returns Whether player is marked
   */
  isMarkedByVampireScout(): boolean {
    return this.vampireScoutMarkActive;
  }

  /**
   * Block energy regeneration temporarily
   * For use with special enemy abilities like Silver Zones
   * @param duration - Duration in milliseconds
   */
  blockEnergyRegen(duration: number): void {
    // Save current reduction factor to restore later
    const previousFactor = this.energyRegenReductionFactor;
    
    // Block energy regen completely
    this.energyRegenReductionFactor = 0;
    
    // Set timeout to restore
    window.setTimeout(() => {
      this.energyRegenReductionFactor = previousFactor;
    }, duration);
    
    logger.debug(`Energy regeneration blocked for ${duration}ms`);
  }

  /**
   * Clean up player resources
   */
  cleanup(): void {
    // Clear any invulnerability timeout
    this.clearInvulnerabilityTimeout();
    
    // Clear any mark timeout
    this.clearMarkTimeout();
    
    // Reset collision tracking
    this.collidingEnemies.clear();
    
    logger.debug('Player cleanup');
    super.cleanup();
  }
  
  /**
   * Destroy the player (backwards compatibility)
   */
  destroy(): void {
    this.cleanup();
  }
}
