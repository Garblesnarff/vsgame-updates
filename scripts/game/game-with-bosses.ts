import { Game } from './game';
import { integrateWithGame } from './game-boss-integration';
import { createLogger } from '../utils/logger';

const logger = createLogger('GameWithBosses');

/**
 * Extends the Game class with boss encounter functionality
 */
export class GameWithBosses extends Game {
  constructor(gameContainer: HTMLElement) {
    // Call parent constructor
    super(gameContainer);

    // Integrate boss system
    logger.info('Integrating boss system with game');
    integrateWithGame(this);
  }
}

export default GameWithBosses;