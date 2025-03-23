import CONFIG from "../config";
import { Enemy } from "../entities/enemies/base-enemy";


/**
 * Interface for projectile options
 */
export interface ProjectileOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isAutoAttack: boolean;
  isBloodLance?: boolean;
  isEnemyProjectile?: boolean; // Added this flag
  pierce?: number;
  pierceCount?: number;
  healAmount?: number;
  hitEnemies?: Set<string>;
  className?: string;
  angle?: number;
}

/**
 * Projectile class for player attacks and abilities
 */
export class Projectile {
  // DOM elements
  gameContainer: HTMLElement;
  element: HTMLElement;

  // Position and movement
  x: number;
  y: number;
  vx: number;
  vy: number;

  // Properties
  damage: number;
  isAutoAttack: boolean;
  isBloodLance: boolean;
  isEnemyProjectile: boolean; // Added this property

  // Blood Lance specific properties
  pierce: number;
  pierceCount: number;
  healAmount: number;
  hitEnemies: Set<string>;

  /**
   * Create a new projectile
   * @param gameContainer - DOM element containing the game
   * @param options - Projectile options
   */
  constructor(gameContainer: HTMLElement, options: ProjectileOptions) {
    this.gameContainer = gameContainer;

    // Position and movement
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;

    // Properties
    this.damage = options.damage || 0;
    this.isAutoAttack = options.isAutoAttack || false;
    this.isBloodLance = options.isBloodLance || false;
    this.isEnemyProjectile = options.isEnemyProjectile || false; // Initialize enemy projectile flag

    // Blood Lance specific properties
    this.pierce = options.pierce || 3;
    this.pierceCount = options.pierceCount || 0;
    this.healAmount = options.healAmount || 0;
    this.hitEnemies = options.hitEnemies || new Set<string>();

    // Create DOM element
    this.element = document.createElement("div");
    this.element.className = options.className || "projectile";

    // Special styling for different projectile types
    if (this.isAutoAttack) {
      this.element.style.backgroundColor = "#990099";
    } else if (this.isBloodLance) {
      this.element.className = "blood-lance";
    } else if (this.isEnemyProjectile) {
      this.element.classList.add("enemy-projectile");
    }

    // Set rotation if provided
    if (options.angle !== undefined) {
      this.element.style.transform = `rotate(${options.angle}rad)`;
    }

    // Position element
    this.updatePosition();

    // Add to game container
    this.gameContainer.appendChild(this.element);
  }

  /**
   * Updates the projectile position
   */
  move(): void {
    this.x += this.vx;
    this.y += this.vy;
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
   * Checks if projectile is outside the game area
   * @returns Whether projectile is out of bounds
   */
  isOutOfBounds(): boolean {
    return (
      this.x < 0 ||
      this.x > CONFIG.GAME_WIDTH ||
      this.y < 0 ||
      this.y > CONFIG.GAME_HEIGHT
    );
  }

  /**
   * Checks if projectile hits an enemy
   * @param enemy - Enemy to check collision with
   * @returns Whether collision occurred
   */
  collidesWith(enemy: Enemy): boolean {
    // For Blood Lance, skip enemies we already hit
    if (this.isBloodLance && this.hitEnemies.has(enemy.id)) {
      return false;
    }

    return (
      this.x > enemy.x &&
      this.x < enemy.x + enemy.width &&
      this.y > enemy.y &&
      this.y < enemy.y + enemy.height
    );
  }

  /**
   * Checks if projectile hits the player
   * @param player - Player to check collision with
   * @returns Whether collision occurred
   */
  collidesWithPlayer(player: any): boolean {
    return (
      this.x > player.x &&
      this.x < player.x + player.width &&
      this.y > player.y &&
      this.y < player.y + player.height
    );
  }

  /**
   * Handle hit effects for Blood Lance
   * @param enemy - Enemy that was hit
   * @param healPlayer - Function to heal the player
   * @returns Whether the projectile should be destroyed
   */
  handleBloodLanceHit(
    enemy: Enemy,
    healPlayer: (amount: number) => void
  ): boolean {
    if (!this.isBloodLance) {
      return true;
    }

    // Record this enemy as hit
    this.hitEnemies.add(enemy.id);

    // Heal player
    if (healPlayer) {
      healPlayer(this.healAmount);
    }

    // Increment pierce count
    this.pierceCount++;

    // Check if we've reached max pierce
    return this.pierceCount >= this.pierce;
  }

  /**
   * Clean up projectile resources
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

export default Projectile;