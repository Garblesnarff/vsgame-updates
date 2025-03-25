/**
 * Type definitions for event listeners and handler maps
 */
import { createLogger } from "./logger";
import { handleError, createError, ErrorCategory, ErrorSeverity } from "./error-handler";

// Create a logger for the event system
const logger = createLogger('EventSystem');

type EventListener = (...args: any[]) => void;
type EventMap = Record<string, EventListener[]>;

/**
 * EventEmitter - A simple event system implementing the publisher-subscriber pattern
 * This allows components to communicate without direct references to each other.
 */
export class EventEmitter {
  private events: EventMap;
  private maxListeners: number;

  constructor(maxListeners = 10) {
    this.events = {};
    this.maxListeners = maxListeners;
  }

  /**
   * Subscribe to an event
   * @param eventName - Name of the event to subscribe to
   * @param listener - Function to call when the event is emitted
   * @returns Unsubscribe function
   */
  on(eventName: string, listener: EventListener): () => void {
    // Validate inputs
    if (typeof eventName !== 'string' || !eventName) {
      handleError(
        createError('Invalid event name', {
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName }
        })
      );
      return () => {}; // Return empty unsubscribe function
    }
    
    if (typeof listener !== 'function') {
      handleError(
        createError('Listener must be a function', {
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName, listener }
        })
      );
      return () => {}; // Return empty unsubscribe function
    }

    // Create the event array if it doesn't exist
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    // Check for listener limit
    if (this.events[eventName].length >= this.maxListeners) {
      handleError(
        createError(`Max listeners (${this.maxListeners}) reached for event: ${eventName}`, {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName, currentListeners: this.events[eventName].length }
        })
      );
    }

    // Add the listener to the event array
    this.events[eventName].push(listener);
    logger.debug(`Added listener for event: ${eventName}, total listeners: ${this.events[eventName].length}`);

    // Return an unsubscribe function
    return () => this.off(eventName, listener);
  }

  /**
   * Subscribe to an event and remove after first trigger
   * @param eventName - Name of the event to subscribe to
   * @param listener - Function to call when the event is emitted
   * @returns Unsubscribe function
   */
  once(eventName: string, listener: EventListener): () => void {
    // Validate inputs
    if (typeof eventName !== 'string' || !eventName) {
      handleError(
        createError('Invalid event name for once', {
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName }
        })
      );
      return () => {}; // Return empty unsubscribe function
    }
    
    if (typeof listener !== 'function') {
      handleError(
        createError('Listener must be a function for once', {
          severity: ErrorSeverity.MEDIUM,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName, listener }
        })
      );
      return () => {}; // Return empty unsubscribe function
    }

    // Create a wrapper that will call the listener and unsubscribe
    const onceWrapper: EventListener = (...args) => {
      // First unsubscribe to prevent recursive calls if the listener triggers the same event
      this.off(eventName, onceWrapper);
      
      // Then call the original listener
      listener(...args);
    };
    
    logger.debug(`Added one-time listener for event: ${eventName}`);

    // Subscribe the wrapper
    return this.on(eventName, onceWrapper);
  }

  /**
   * Unsubscribe from an event
   * @param eventName - Name of the event to unsubscribe from
   * @param listenerToRemove - Function to remove from the event
   * @returns Whether the listener was found and removed
   */
  off(eventName: string, listenerToRemove: EventListener): boolean {
    // Validate inputs
    if (typeof eventName !== 'string' || !eventName) {
      handleError(
        createError('Invalid event name for off', {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName }
        })
      );
      return false;
    }
    
    if (typeof listenerToRemove !== 'function') {
      handleError(
        createError('Listener to remove must be a function', {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName, listenerToRemove }
        })
      );
      return false;
    }

    // If the event doesn't exist, return
    if (!this.events[eventName]) {
      logger.debug(`Attempted to remove listener for non-existent event: ${eventName}`);
      return false;
    }

    const originalLength = this.events[eventName].length;

    // Filter out the listener to remove
    this.events[eventName] = this.events[eventName].filter(
      (listener) => listener !== listenerToRemove
    );

    const removed = originalLength > this.events[eventName].length;
    
    if (removed) {
      logger.debug(`Removed listener for event: ${eventName}, remaining listeners: ${this.events[eventName].length}`);
    } else {
      logger.debug(`Attempted to remove non-existent listener for event: ${eventName}`);
    }

    return removed;
  }

  /**
   * Emit an event, calling all subscribed listeners
   * @param eventName - Name of the event to emit
   * @param args - Arguments to pass to the listeners
   * @returns Whether the event had listeners
   */
  emit(eventName: string, ...args: any[]): boolean {
    // Validate inputs
    if (typeof eventName !== 'string' || !eventName) {
      handleError(
        createError('Invalid event name for emit', {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName }
        })
      );
      return false;
    }

    // If the event doesn't exist, return
    if (!this.events[eventName] || this.events[eventName].length === 0) {
      logger.debug(`Emitted event with no listeners: ${eventName}`);
      return false;
    }

    // Call each listener with the provided arguments
    const listeners = [...this.events[eventName]]; // Make a copy to prevent mutation issues
    let successCount = 0;
    let errorCount = 0;

    for (const listener of listeners) {
      try {
        listener(...args);
        successCount++;
      } catch (error) {
        errorCount++;
        // Handle the error properly with our error handler
        handleError(
          createError(`Error in event listener for ${eventName}`, {
            severity: ErrorSeverity.MEDIUM,
            category: ErrorCategory.GAME_STATE,
            module: 'EventEmitter',
            recoverable: true,
            originalError: error,
            context: { eventName, args }
          })
        );
        
        // Also emit an error event if it's not already an error event (to prevent recursion)
        if (eventName !== EVENTS.GAME_ERROR) {
          this.emit(EVENTS.GAME_ERROR, error);
        }
      }
    }

    if (errorCount > 0) {
      logger.debug(`Emitted event: ${eventName}, listeners: ${listeners.length}, successful: ${successCount}, errors: ${errorCount}`);
    } else {
      logger.debug(`Emitted event: ${eventName}, listeners: ${listeners.length}, all successful`);
    }

    return true;
  }

  /**
   * Get all listeners for an event
   * @param eventName - Name of the event
   * @returns Array of listeners
   */
  listeners(eventName: string): EventListener[] {
    // Validate input
    if (typeof eventName !== 'string' || !eventName) {
      handleError(
        createError('Invalid event name for listeners', {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { eventName }
        })
      );
      return [];
    }

    return this.events[eventName] ? [...this.events[eventName]] : [];
  }

  /**
   * Get listener count for an event
   * @param eventName - Name of the event
   * @returns Number of listeners
   */
  listenerCount(eventName: string): number {
    return this.listeners(eventName).length;
  }

  /**
   * Remove all listeners for an event or all events
   * @param eventName - Name of the event (optional, if not provided all events are cleared)
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      // Validate input
      if (typeof eventName !== 'string') {
        handleError(
          createError('Invalid event name for removeAllListeners', {
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.GAME_STATE,
            module: 'EventEmitter',
            recoverable: true,
            context: { eventName }
          })
        );
        return;
      }

      // Check if the event exists
      if (this.events[eventName]) {
        logger.debug(`Removed all listeners for event: ${eventName}, count: ${this.events[eventName].length}`);
        delete this.events[eventName];
      }
    } else {
      // Remove all events
      const eventCount = Object.keys(this.events).length;
      let listenerCount = 0;
      
      // Count total listeners for logging
      for (const event in this.events) {
        listenerCount += this.events[event].length;
      }
      
      logger.debug(`Removed all listeners for all events, events: ${eventCount}, total listeners: ${listenerCount}`);
      this.events = {};
    }
  }

  /**
   * Set the maximum number of listeners per event
   * @param n - Maximum number of listeners (0 for unlimited)
   */
  setMaxListeners(n: number): void {
    if (typeof n !== 'number' || n < 0 || isNaN(n)) {
      handleError(
        createError('Invalid max listeners value', {
          severity: ErrorSeverity.LOW,
          category: ErrorCategory.GAME_STATE,
          module: 'EventEmitter',
          recoverable: true,
          context: { value: n }
        })
      );
      return;
    }
    
    this.maxListeners = n === 0 ? Infinity : Math.floor(n);
    logger.debug(`Set max listeners to: ${this.maxListeners}`);
  }
}

/**
 * Game Events - Centralized event emitter for the game
 * This provides a singleton event system that can be imported anywhere
 */
export const GameEvents = new EventEmitter();

/**
 * Event names - Constants for event names to avoid typos
 */
export const EVENTS = {
  // Game state events
  GAME_INIT: "game:init",
  GAME_START: "game:start",
  GAME_OVER: "game:over",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_RESTART: "game:restart",
  GAME_ERROR: "game:error", // New event for game errors

  // Player events
  PLAYER_DAMAGE: "player:damage",
  PLAYER_HEAL: "player:heal",
  PLAYER_DEATH: "player:death",
  PLAYER_LEVEL_UP: "player:levelUp",
  PLAYER_SKILL_POINT: "player:skillPoint",
  PLAYER_DEBUFF: "player:debuff", // New event for player debuffs
  PLAYER_DEBUFF_END: "player:debuffEnd", // New event for player debuffs ending

  // Enemy events
  ENEMY_SPAWN: "enemy:spawn",
  ENEMY_DAMAGE: "enemy:damage",
  ENEMY_DEATH: "enemy:death",
  ENEMY_ATTACK: "enemy:attack",
  ENEMY_ATTACK_START: "enemy:attackStart",
  ENEMY_CHARGE: "enemy:charge",
  ENEMY_SPECIAL_MOVE: "enemy:specialMove",
  ENEMY_HEAL: "enemy:heal",
  ENEMY_BUFF: "enemy:buff",
  ENEMY_BUFF_END: "enemy:buffEnd",
  ENEMY_DODGE: "enemy:dodge", // New event for enemy dodging
  ENEMY_SUMMON: "enemy:summon", // New event for enemy summoning other enemies
  SPAWN_SPECIAL: "spawn:special",

  // Ability events
  ABILITY_USE: "ability:use",
  ABILITY_UPGRADE: "ability:upgrade",
  ABILITY_UNLOCK: "ability:unlock",

  // UI events
  UI_SKILL_MENU_OPEN: "ui:skillMenuOpen",
  UI_SKILL_MENU_CLOSE: "ui:skillMenuClose",

  // Input events
  INPUT_KEY_DOWN: "input:keyDown",
  INPUT_KEY_UP: "input:keyUp",
  INPUT_CLICK: "input:click",
  
  // System events
  SYSTEM_STORAGE_ERROR: "system:storageError",
  SYSTEM_RESOURCE_ERROR: "system:resourceError",
  SYSTEM_INIT_ERROR: "system:initError",
};

// Export a singleton instance as default
export default GameEvents;