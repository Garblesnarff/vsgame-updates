import CONFIG from "../../config";
import { GameEvents, EVENTS } from "../../utils/event-system";

/**
 * Type for particle creation callback
 */
export type ParticleCreationFunction = (x: number, y: number, count: number) => void;

/**
 * Base Enemy class representing monsters that attack the player
 */
export class Enemy {
  // DOM elements
  gameContainer: HTMLElement;
  element: HTMLElement;
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

  // Unique identifier
  id: string;

  /**
   * Create a new enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    this.gameContainer = gameContainer;

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

    // Assign unique ID
    this.id = "enemy_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

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
  }

  /**
   * Sets a random spawn position outside the screen
   */
  setSpawnPosition(): void {
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // Top
        this.x = Math.random() * CONFIG.GAME_WIDTH;
        this.y = -this.height;
        break;
      case 1: // Right
        this.x = CONFIG.GAME_WIDTH + this.width;
        this.y = Math.random() * CONFIG.GAME_HEIGHT;
        break;
      case 2: // Bottom
        this.x = Math.random() * CONFIG.GAME_WIDTH;
        this.y = CONFIG.GAME_HEIGHT + this.height;
        break;
      case 3: // Left
        this.x = -this.width;
        this.y = Math.random() * CONFIG.GAME_HEIGHT;
        break;
    }
  }

  /**
   * Updates the enemy's position to follow the player
   * @param player - Player object to follow
   * @param _createProjectile - Optional function for enemies that can shoot
   */
  moveTowardsPlayer(player: any, _createProjectile?: any): void {
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
    return (
      this.x < player.x + player.width &&
      this.x + this.width > player.x &&
      this.y < player.y + player.height &&
      this.y + this.height > player.y
    );
  }

  /**
   * Checks if enemy position is out of bounds
   * @returns Whether enemy is out of bounds
   */
  isOutOfBounds(): boolean {
    return (
      this.x < -this.width - 100 ||
      this.x > CONFIG.GAME_WIDTH + 100 ||
      this.y < -this.height - 100 ||
      this.y > CONFIG.GAME_HEIGHT + 100
    );
  }

  /**
   * Clean up enemy resources
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export default Enemy;