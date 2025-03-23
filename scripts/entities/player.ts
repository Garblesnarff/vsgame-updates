import CONFIG from "../config";
import { AbilityManager } from "../abilities/ability-manager";
import { GameEvents, EVENTS } from "../utils/event-system";
import { Game } from "../game/game";
import { LevelSystem } from "../game/level-system";
import { StatsComponent } from "../ecs/components/StatsComponent";
import { createLogger } from "../utils/logger";
import { IPlayer, AutoAttack, ProjectileOptions } from "../types/player-types";

// Create a logger for the Player class
const logger = createLogger('Player');

/**
 * Player class representing the main character in the game
 * Implements IPlayer interface for type safety
 */
export class Player implements IPlayer {
  level: number;
  kills: number;
  
  // Container and game references
  gameContainer: HTMLElement;
  game: Game | null;

  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;

  // Stats
  stats: StatsComponent;

  // Progression
  skillPoints: number;

  // States
  isAlive: boolean;
  isInvulnerable: boolean;
  showingSkillMenu: boolean;
  lastDamageTime: number; // Track last damage time for collision cooldown
  invulnerabilityTimeoutId: number | null = null; // Track invulnerability timeout
  
  // Damage handling and collision tracking
  collidingEnemies: Set<string> = new Set(); // Track enemies colliding by ID
  
  // Attack properties
  lastAttack: number;
  attackCooldown: number;
  projectileSpeed: number;

  // Auto attack settings
  autoAttack: AutoAttack;

  // Abilities
  abilityManager: AbilityManager;

  // DOM element
  element: HTMLElement | null;
  levelSystem: LevelSystem | null = null;

  /**
   * Create a new player
   * @param gameContainer - DOM element containing the game
   * @param game - Optional Game instance reference
   */
  constructor(gameContainer: HTMLElement, game: Game | null = null) {
    this.gameContainer = gameContainer;
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

    // Progression
    this.level = 1;
    this.kills = 0;
    this.skillPoints = 0;

    // States
    this.isAlive = true;
    this.isInvulnerable = false;
    this.showingSkillMenu = false;
    this.lastDamageTime = 0; // Initialize last damage time

    // Attack properties
    this.lastAttack = 0;
    this.attackCooldown = CONFIG.PLAYER.ATTACK_COOLDOWN;
    this.projectileSpeed = CONFIG.PLAYER.PROJECTILE_SPEED;

    // Auto attack settings
    this.autoAttack = {
      enabled: CONFIG.ABILITIES.AUTO_ATTACK.ENABLED,
      cooldown: CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN,
      originalCooldown: CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN, // Store original value
      lastFired: 0, // Initialize to 0 to allow immediate firing
      damage: CONFIG.ABILITIES.AUTO_ATTACK.DAMAGE,
      range: CONFIG.ABILITIES.AUTO_ATTACK.RANGE,
      level: 1,
      maxLevel: CONFIG.ABILITIES.AUTO_ATTACK.MAX_LEVEL,
    };

    // Initialize abilities
    this.abilityManager = new AbilityManager(this);

    // Create DOM element
    this.element = document.createElement("div");
    this.element.className = "player";
    this.gameContainer.appendChild(this.element);
    this.updatePosition();
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
   * Updates player position based on input
   * @param keys - Current state of keyboard keys
   */
  move(keys: Record<string, boolean>): void {
    if (keys["ArrowUp"] || keys["w"]) {
      this.y = Math.max(0, this.y - this.speed);
    }
    if (keys["ArrowDown"] || keys["s"]) {
      this.y = Math.min(CONFIG.GAME_HEIGHT - this.height, this.y + this.speed);
    }
    if (keys["ArrowLeft"] || keys["a"]) {
      this.x = Math.max(0, this.x - this.speed);
    }
    if (keys["ArrowRight"] || keys["d"]) {
      this.x = Math.min(CONFIG.GAME_WIDTH - this.width, this.x + this.speed);
    }

    this.updatePosition();
  }

  /**
   * Updates the DOM element position
   */
  updatePosition(): void {
    if (this.element) {
      this.element.style.left = this.x + "px";
      this.element.style.top = this.y + "px";
    }
  }

  /**
   * Regenerates energy over time
   */
  regenerateEnergy(deltaTime: number): void {
    this.stats.setEnergy(Math.min(
      this.stats.getMaxEnergy(),
      this.stats.getEnergy() + this.stats.getEnergyRegen() * (deltaTime / 1000)
    ));
  }

  /**
   * Player takes damage from an enemy
   * @param amount - Damage amount
   * @returns Whether damage was actually applied (not invulnerable)
   */
  takeDamage(amount: number): boolean {
    const now = Date.now();
    
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

    this.stats.setHealth(this.stats.getHealth() - damageTaken);

    // Emit damage event
    GameEvents.emit(EVENTS.PLAYER_DAMAGE, damageTaken, this);

    if (this.stats.getHealth() <= 0) {
      this.stats.setHealth(0);
      this.isAlive = false;

      // Emit death event
      GameEvents.emit(EVENTS.PLAYER_DEATH, this);
    }

    return true;
  }

  /**
   * Heals the player
   * @param amount - Healing amount
   */
  heal(amount: number): void {
    const oldHealth = this.stats.getHealth();
    this.stats.setHealth(Math.min(this.stats.getMaxHealth(), this.stats.getHealth() + amount));

    // Only emit heal event if actually healed
    if (this.stats.getHealth() > oldHealth) {
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

    // Use energy
    this.stats.setEnergy(this.stats.getEnergy() - 10);
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
   * Make the player temporarily invulnerable
   * @param duration - Duration in milliseconds
   */
  setInvulnerable(duration: number): void {
    // Clear any existing invulnerability timeout
    if (this.invulnerabilityTimeoutId !== null) {
      window.clearTimeout(this.invulnerabilityTimeoutId);
      this.invulnerabilityTimeoutId = null;
    }
    
    // Set invulnerable state
    this.isInvulnerable = true;

    // Add visual indication of invulnerability
    if (this.element) {
      this.element.classList.add('invulnerable');
    }
    
    // Set timeout to remove invulnerability after duration
    this.invulnerabilityTimeoutId = window.setTimeout(() => {
      this.isInvulnerable = false;
      
      // Remove visual indication
      if (this.element) {
        this.element.classList.remove('invulnerable');
      }
      
      this.invulnerabilityTimeoutId = null;
      
      logger.debug('Invulnerability ended');
    }, duration);
    
    logger.debug(`Player invulnerable for ${duration}ms`);
  }

  /**
   * Add a kill to the player's count
   * @returns Whether the player leveled up
   */
  addKill(): boolean {
    // If the player has a level system, use that
    if (this.levelSystem && typeof this.levelSystem.addKill === 'function') {
      return this.levelSystem.addKill();
    }
    
    // Otherwise, just count kills directly
    if (!this.kills) {
      this.kills = 0;
    }
    this.kills++;
    
    return false; // No level-up without a level system
  }

  /**
   * Set the level system reference and ensure level property is kept in sync
   * @param levelSystem - The level system instance
   */
  setLevelSystem(levelSystem: LevelSystem): void {
    this.levelSystem = levelSystem;
    
    // Initialize with current level from the level system
    this.level = levelSystem.getLevel();
    
    // Listen for level changes
    levelSystem.onLevelUp((newLevel: number) => {
      this.level = newLevel;
    });
  }

  /**
   * Clean up player resources
   */
  destroy(): void {
    // Clear any invulnerability timeout
    if (this.invulnerabilityTimeoutId !== null) {
      window.clearTimeout(this.invulnerabilityTimeoutId);
      this.invulnerabilityTimeoutId = null;
    }
    
    // Remove DOM element
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
      this.element = null;
    }
    
    // Reset collision tracking
    this.collidingEnemies.clear();
  }
}