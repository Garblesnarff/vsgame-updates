import CONFIG from "../config";
import { GameEvents, EVENTS } from "../utils/event-system";
import { createLogger } from "../utils/logger";
import { IPlayer, ILevelSystem } from "../types/player-types";

// Create a logger for the LevelSystem class
const logger = createLogger('LevelSystem');

/**
 * Type for level up callback function
 */
type LevelUpCallback = (level: number) => void;

/**
 * Level System
 * Manages player level progression, experience, and level-up events
 */
export class LevelSystem implements ILevelSystem {
  player: IPlayer;
  level: number;
  kills: number;
  killsToNextLevel: number;
  levelUpCallbacks: LevelUpCallback[];

  /**
 * Create a new level system
 * @param player - The player associated with this level system
 */
constructor(player: IPlayer) {
  this.player = player;
  this.level = 1;
  this.kills = 0;
  this.killsToNextLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS[1];
  this.levelUpCallbacks = [];
  
  // Initialize player level
  if (this.player && typeof this.player.level !== 'undefined') {
    this.player.level = this.level;
  }
  
  // Set the level system reference on the player
  this.player.setLevelSystem(this);
  
  // Subscribe to kill events
  this.setupEventListeners();
  
  logger.debug(`LevelSystem initialized for player. Starting level: ${this.level}`);
}
  
  /**
   * Set up event listeners for game events
   */
  setupEventListeners(): void {
    // Listen for enemy death events to increment kills
    GameEvents.on(EVENTS.ENEMY_DEATH, () => {
      // Note: We don't directly add kills here since it's also
      // handled in the Game class updateProjectiles method
    });
  }

  /**
   * Add a kill to the player's count and check for level up
   * @returns Whether the player leveled up
   */
  addKill(): boolean {
    this.kills++;

    if (
      this.level < CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1 &&
      this.kills >= CONFIG.LEVEL.KILLS_FOR_LEVELS[this.level]
    ) {
      this.levelUp();
      return true;
    }

    return false;
  }

  /**
 * Level up the player
 */
levelUp(): void {
  this.level++;

  // Update next level threshold
  if (this.level < CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1) {
    this.killsToNextLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS[this.level];
  } else {
    // For levels beyond our predefined thresholds, use a formula
    this.killsToNextLevel =
      this.kills +
      (CONFIG.LEVEL.KILLS_FOR_LEVELS[
        CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1
      ] -
        CONFIG.LEVEL.KILLS_FOR_LEVELS[
          CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 2
        ]) +
      CONFIG.LEVEL.KILLS_INCREASE_PER_LEVEL;
  }
  
  // Directly update player's level property for immediate access
  if (this.player && typeof this.player.level !== 'undefined') {
    this.player.level = this.level;
  }

  // Notify all registered callbacks of the level up event
  this.levelUpCallbacks.forEach((callback) => callback(this.level));
  
  // Emit level up event
  GameEvents.emit(EVENTS.PLAYER_LEVEL_UP, this.level, this.player);
}

  /**
   * Register a callback to be called when the player levels up
   * @param callback - Function to call on level up, receives level as parameter
   */
  onLevelUp(callback: LevelUpCallback): void {
    this.levelUpCallbacks.push(callback);
  }

  /**
   * Get the current level
   * @returns Current level
   */
  getLevel(): number {
    return this.level;
  }

  /**
   * Get the current kills
   * @returns Current kills
   */
  getKills(): number {
    return this.kills;
  }

  /**
   * Get the kills required for the next level
   * @returns Kills required for next level
   */
  getKillsToNextLevel(): number {
    return this.killsToNextLevel;
  }

  /**
   * Reset the level system
   */
  reset(): void {
    this.level = 1;
    this.kills = 0;
    this.killsToNextLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS[1];
  }
}