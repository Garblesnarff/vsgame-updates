import { Enemy } from './base-enemy';

/**
 * BasicEnemy class - The standard enemy type
 * This is the regular enemy with default behavior
 */
export class BasicEnemy extends Enemy {
  /**
   * Create a new basic enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    super(gameContainer, playerLevel);
    
    // Add basic enemy class for specific styling
    this.element.classList.add('basic-enemy');
    
    // Default appearance already set in base class
    // Standard red color and square with rounded corners
  }
  
  // Basic enemy uses all default behavior from the base Enemy class
}

export default BasicEnemy;