// boss-system-integration.ts
import { integrateWithGame } from './game-boss-integration';
import Game from './game';

/**
 * Initialize and integrate the boss system with the game
 * This function should be called during game initialization
 * @param game - Game instance to integrate with
 */
export function setupBossSystem(game: Game): void {
  console.log('BOSS SYSTEM INTEGRATION: Setting up boss system...');
  integrateWithGame(game);
  console.log('BOSS SYSTEM INTEGRATION: Boss system setup complete');
}
