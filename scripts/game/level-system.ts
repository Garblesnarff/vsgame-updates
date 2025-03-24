import CONFIG from "../config";
import { GameEvents, EVENTS } from "../utils/event-system";
import { createLogger } from "../utils/logger";
import { IPlayer, ILevelSystem } from "../types/player-types";
import stateStore from "./state-store";

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
  // These properties are backed by the state store
  get level(): number { return stateStore.levelSystem.level.get(); }
  set level(value: number) { stateStore.levelSystem.level.set(value); }
  
  get kills(): number { return stateStore.levelSystem.kills.get(); }
  set kills(value: number) { stateStore.levelSystem.kills.set(value); }
  
  get killsToNextLevel(): number { return stateStore.levelSystem.killsToNextLevel.get(); }
  set killsToNextLevel(value: number) { stateStore.levelSystem.killsToNextLevel.set(value); }
  
  levelUpCallbacks: LevelUpCallback[];

  /**
 * Create a new level system
 * @param player - The player associated with this level system
 */
constructor(player: IPlayer) {
  this.player = player;
  this.levelUpCallbacks = [];
  
  // Initialize state with consistent values
  const initialLevel = 1;
  const initialKills = 0;
  let initialKillsToNextLevel = 0;
  
  // Get the correct initial killsToNextLevel value
  if (initialLevel < CONFIG.LEVEL.KILLS_FOR_LEVELS.length) {
    initialKillsToNextLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS[initialLevel];
  } else {
    // This is a safety check even though we typically start at level 1
    const lastDefinedLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1;
    const levelsPastArray = initialLevel - lastDefinedLevel;
    const baseKills = CONFIG.LEVEL.KILLS_FOR_LEVELS[lastDefinedLevel];
    const increment = CONFIG.LEVEL.KILLS_INCREASE_PER_LEVEL;
    
    initialKillsToNextLevel = baseKills + (increment * levelsPastArray * levelsPastArray);
  }
  
  // Set state store values
  stateStore.levelSystem.level.set(initialLevel);
  stateStore.levelSystem.kills.set(initialKills);
  stateStore.levelSystem.killsToNextLevel.set(initialKillsToNextLevel);
  
  // Ensure player level is in sync
  stateStore.player.level.set(initialLevel);
  
  // Set the level system reference on the player
  this.player.setLevelSystem(this);
  
  // Subscribe to kill events
  this.setupEventListeners();
  
  logger.debug(`LevelSystem initialized. Level: ${initialLevel}, Kills: ${initialKills}, KillsToNextLevel: ${initialKillsToNextLevel}`);
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
    // Increment kills in state store
    const currentKills = this.kills;
    this.kills = currentKills + 1;

    // Calculate kills needed for next level
    const currentLevel = this.level;
    let killsNeeded;
    
    if (currentLevel < CONFIG.LEVEL.KILLS_FOR_LEVELS.length) {
      // Use predefined level thresholds for early levels
      killsNeeded = CONFIG.LEVEL.KILLS_FOR_LEVELS[currentLevel];
    } else {
      // For levels beyond our predefined array, use a formula
      // Last predefined threshold + (increment per level * levels past the array)
      const lastDefinedLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1;
      const levelsPastArray = currentLevel - lastDefinedLevel;
      const baseKills = CONFIG.LEVEL.KILLS_FOR_LEVELS[lastDefinedLevel];
      const increment = CONFIG.LEVEL.KILLS_INCREASE_PER_LEVEL;
      
      killsNeeded = baseKills + (increment * levelsPastArray * levelsPastArray);
      
      // Update the killsToNextLevel in state store
      this.killsToNextLevel = killsNeeded;
    }

    // Check if we've reached the kills needed for level up
    if (this.kills >= killsNeeded) {
      this.levelUp();
      return true;
    }

    return false;
  }

  /**
 * Level up the player
 */
levelUp(): void {
  // Increment level in state store
  const newLevel = this.level + 1;
  this.level = newLevel;

  // Update next level threshold
  if (newLevel < CONFIG.LEVEL.KILLS_FOR_LEVELS.length) {
    // Use predefined thresholds for early levels
    this.killsToNextLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS[newLevel];
  } else {
    // For levels beyond our predefined array, use a quadratic formula
    // This creates an increasing curve of required kills per level
    const lastDefinedLevel = CONFIG.LEVEL.KILLS_FOR_LEVELS.length - 1;
    const levelsPastArray = newLevel - lastDefinedLevel;
    const baseKills = CONFIG.LEVEL.KILLS_FOR_LEVELS[lastDefinedLevel];
    const increment = CONFIG.LEVEL.KILLS_INCREASE_PER_LEVEL;
    
    // Quadratic growth: base + (increment * levelsPastArray²)
    this.killsToNextLevel = baseKills + (increment * levelsPastArray * levelsPastArray);
  }
  
  logger.debug(`Leveled up to ${newLevel}. Kills needed for next level: ${this.killsToNextLevel}`);

  // Notify all registered callbacks of the level up event
  this.levelUpCallbacks.forEach((callback) => callback(newLevel));
  
  // Emit level up event
  GameEvents.emit(EVENTS.PLAYER_LEVEL_UP, newLevel, this.player);
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
    return stateStore.levelSystem.level.get();
  }

  /**
   * Get the current kills
   * @returns Current kills
   */
  getKills(): number {
    return stateStore.levelSystem.kills.get();
  }

  /**
   * Get the kills required for the next level
   * @returns Kills required for next level
   */
  getKillsToNextLevel(): number {
    return stateStore.levelSystem.killsToNextLevel.get();
  }

  /**
   * Reset the level system
   */
  reset(): void {
    stateStore.levelSystem.level.set(1);
    stateStore.levelSystem.kills.set(0);
    stateStore.levelSystem.killsToNextLevel.set(CONFIG.LEVEL.KILLS_FOR_LEVELS[1]);
  }
}