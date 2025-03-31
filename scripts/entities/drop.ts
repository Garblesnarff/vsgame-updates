import { BaseEntity } from './base-entity';
import { Player } from './player'; // Import Player for collision detection
import { DropType } from '../types/drop-types';
// import CONFIG from '../config'; // Removed unused import
import { createLogger } from '../utils/logger';

const logger = createLogger('Drop');

/**
 * Represents a weapon drop item in the game.
 */
export class Drop extends BaseEntity {
  type: DropType;
  // Position properties (inherited but explicitly declared for clarity/TS)
  public x: number;
  public y: number;
  width: number;
  height: number;

  /**
   * Creates a new Drop instance.
   * @param gameContainer - The main container for game elements.
   * @param type - The type of drop (e.g., MULTI_SHOT).
   * @param x - Initial X position.
   * @param y - Initial Y position.
   */
  constructor(gameContainer: HTMLElement, type: DropType, x: number, y: number) {
    // Use a unique ID including the type
    super(gameContainer, `drop_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`);

    this.type = type;
    // Define size for the drop item (can be adjusted)
    this.width = 20;
    this.height = 20;
    this.x = x - this.width / 2; // Center the drop on the spawn location
    this.y = y - this.height / 2;

    // Create the DOM element
    this.element = document.createElement('div');
    this.element.className = `drop-item drop-${type}`; // Base class + type-specific class
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;

    // Add to game container
    this.gameContainer.appendChild(this.element);

    // Set initial position
    this.updatePosition();

    // Initialize (calls super.initialize)
    this.initialize();

    logger.debug(`Drop created: type=${type}, id=${this.id} at (${this.x}, ${this.y})`);
  }

  /**
   * Initialize the drop entity.
   */
  initialize(): void {
    super.initialize();
    // Any drop-specific initialization can go here
  }

  /**
   * Update the drop's state (e.g., animations, movement).
   * @param _deltaTime - Time since the last frame.
   */
  update(_deltaTime: number): void {
    super.update(_deltaTime);
    // Drops are currently static, but update logic could be added here (e.g., bobbing effect)
  }

  /**
   * Updates the DOM element's position.
   */
  updatePosition(): void {
    this.element.style.left = `${this.x}px`;
    this.element.style.top = `${this.y}px`;
  }

  /**
   * Checks if this drop collides with the player.
   * @param player - The player entity.
   * @returns True if collision occurs, false otherwise.
   */
  collidesWithPlayer(player: Player): boolean {
    // Simple AABB collision detection
    const collides = (
      this.x < player.x + player.width &&
      this.x + this.width > player.x &&
      this.y < player.y + player.height &&
      this.y + this.height > player.y
    );

    if (collides) {
      logger.debug(`Drop ${this.id} collided with player.`);
    }
    return collides;
  }

  /**
   * Cleans up the drop entity (removes element from DOM).
   */
  cleanup(): void {
    logger.debug(`Cleaning up drop ${this.id}`);
    super.cleanup(); // BaseEntity handles removing the element
  }
}
