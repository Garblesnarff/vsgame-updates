import CONFIG from "../../config";
import { GameEvents, EVENTS } from "../../utils/event-system";
import { BaseEntity } from "../base-entity";
import { createLogger } from "../../utils/logger";

const logger = createLogger('Enemy');

/**
 * Type for particle creation callback
 */
export type ParticleCreationFunction = (x: number, y: number, count: number) => void;

/**
 * Base Enemy class representing monsters that attack the player
 */
export class Enemy extends BaseEntity {
  // DOM elements (element is inherited from BaseEntity)
  healthBarContainer: HTMLElement;
  healthBar: HTMLElement;

  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;

  // Stats
  speed: number;
  health: number;
  maxHealth: number;
  damage: number;

  // Collision tracking
  isCollidingWithPlayer: boolean = false;

  /**
   * Create a new enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    super(gameContainer, `enemy_${Date.now()}_${Math.floor(Math.random() * 1000)}`);

    // Position and dimensions
    this.width = CONFIG.ENEMY.BASE.WIDTH;
    this.height = CONFIG.ENEMY.BASE.HEIGHT;
    this.x = 0;
    this.y = 0;

    // Stats scaled by player level
    this.speed = 1 + Math.random() * playerLevel * 0.2;
    this.health = CONFIG.ENEMY.BASE.BASE_HEALTH + playerLevel * 10;
    this.maxHealth = this.health;
    this.damage = CONFIG.ENEMY.BASE.BASE_DAMAGE + playerLevel;

    // ID is already assigned by BaseEntity constructor

    // Determine spawn position (outside screen)
    this.setSpawnPosition();

    // Create DOM elements
    this.element = document.createElement("div");
    this.element.className = "enemy";

    this.healthBarContainer = document.createElement("div");
    this.healthBarContainer.className = "enemy-health-container";

    this.healthBar = document.createElement("div");
    this.healthBar.className = "enemy-health-bar";

    this.healthBarContainer.appendChild(this.healthBar);
    this.element.appendChild(this.healthBarContainer);

    // Position elements
    this.updatePosition();

    // Add to game container
    this.gameContainer.appendChild(this.element);
    
    // Initialize the enemy
    this.initialize();
  }

  /**
   * Initialize the enemy
   */
  initialize(): void {
    super.initialize();
    logger.debug(`Enemy ${this.id} initialized: health=${this.health}, speed=${this.speed}`);
  }
  
  /**
   * Update enemy state
   * @param deltaTime - Time since last update in ms
   * @param player - Reference to the player
   * @param enemies - Array of all enemies (for coordination)
   */
  update(deltaTime: number, player?: any, _enemies?: Enemy[]): void {
    super.update(deltaTime);
    
    if (player) {
      this.moveTowardsPlayer(player);
    }
  }

  /**
   * Sets a random spawn position outside the screen
   */
  setSpawnPosition(): void {
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // Top
        this.x = Math.random() * CONFIG.WORLD_WIDTH; // Changed from GAME_WIDTH
        this.y = -this.height;
        break;
      case 1: // Right
        this.x = CONFIG.WORLD_WIDTH + this.width; // Changed from GAME_WIDTH
        this.y = Math.random() * CONFIG.WORLD_HEIGHT; // Changed from GAME_HEIGHT
        break;
      case 2: // Bottom
        this.x = Math.random() * CONFIG.WORLD_WIDTH; // Changed from GAME_WIDTH
        this.y = CONFIG.WORLD_HEIGHT + this.height; // Changed from GAME_HEIGHT
        break;
      case 3: // Left
        this.x = -this.width;
        this.y = Math.random() * CONFIG.WORLD_HEIGHT; // Changed from GAME_HEIGHT
        break;
    }
  }

  /**
   * Updates the enemy's position to follow the player
   * @param player - Player object to follow
   * @param _createProjectile - Optional function for enemies that can shoot
   * @param _enemies - Optional array of all enemies (for coordination)
   */
  moveTowardsPlayer(player: any, _createProjectile?: any, _enemies?: Enemy[]): void {
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize and apply speed
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;

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
   * Updates the enemy's health bar display
   */
  updateHealthBar(): void {
    this.healthBar.style.width = (this.health / this.maxHealth) * 100 + "%";
  }

  /**
   * Enemy takes damage from a source
   * @param amount - Damage amount
   * @param createParticles - Function to create blood particles (optional)
   * @param _projectileType - Type of projectile that caused damage (optional)
   * @returns Whether the enemy died
   */
  takeDamage(
    amount: number,
    createParticles?: ParticleCreationFunction,
    _projectileType?: string
  ): boolean {
    // Default implementation - subclasses can override for special damage handling
    this.health -= amount;
    this.updateHealthBar();

    // Create blood particles at position
    if (createParticles) {
      createParticles(this.x + this.width / 2, this.y + this.height / 2, 5);
    }

    // Emit damage event
    GameEvents.emit(EVENTS.ENEMY_DAMAGE, this, amount);

    // Return whether the enemy died - use a small threshold to account for floating point errors
    return this.health <= 0.001;
  }

  /**
   * Checks if enemy collides with player
   * @param player - Player object
   * @returns Whether collision occurred
   */
  collidesWithPlayer(player: any): boolean {
    const wasColliding = this.isCollidingWithPlayer;
    
    // Check collision
    const isColliding = (
      this.x < player.x + player.width &&
      this.x + this.width > player.x &&
      this.y < player.y + player.height &&
      this.y + this.height > player.y
    );
    
    // If collision state changed, update tracking
    if (!wasColliding && isColliding) {
      // Newly colliding
      this.isCollidingWithPlayer = true;
      // Register collision with player if the player has this method
      if (player.registerEnemyCollision) {
        player.registerEnemyCollision(this);
      }
    } else if (wasColliding && !isColliding) {
      // No longer colliding
      this.isCollidingWithPlayer = false;
      // Unregister collision with player if the player has this method
      if (player.unregisterEnemyCollision) {
        player.unregisterEnemyCollision(this);
      }
    }
    
    return isColliding;
  }

  /**
   * Checks if enemy position is out of bounds
   * @returns Whether enemy is out of bounds
   */
  isOutOfBounds(): boolean {
    return (
      this.x < -this.width - 100 ||
      this.x > CONFIG.WORLD_WIDTH + 100 || // Changed from GAME_WIDTH
      this.y < -this.height - 100 ||
      this.y > CONFIG.WORLD_HEIGHT + 100 // Changed from GAME_HEIGHT
    );
  }

  /**
   * Clean up enemy resources
   * @param player - Optional player reference to unregister collision
   */
  cleanup(player?: any): void {
    // If this enemy was colliding with player, unregister the collision
    if (this.isCollidingWithPlayer && player && player.unregisterEnemyCollision) {
      player.unregisterEnemyCollision(this);
    }
    
    logger.debug(`Enemy ${this.id} cleanup`);
    super.cleanup();
  }
  
  /**
   * Destroy the enemy (backwards compatibility)
   * @param player - Optional player reference to unregister collision
   */
  destroy(player?: any): void {
    this.cleanup(player);
  }
}

export default Enemy;
