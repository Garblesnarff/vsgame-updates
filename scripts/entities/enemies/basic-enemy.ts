import { Enemy } from './base-enemy';

/**
 * BasicEnemy class - The standard enemy type
 * This is the regular enemy with default behavior
 */
export class BasicEnemy extends Enemy {
  /**
   * Create a new basic enemy
   * @param gameContainer - DOM element containing the game
   */
  constructor(gameContainer: HTMLElement) {
    super(gameContainer);
  }
  
  // Basic enemy uses all default behavior from the base Enemy class
}

export default BasicEnemy;