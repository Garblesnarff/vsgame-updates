/**
 * Type definitions for event listeners and handler maps
 */
type EventListener = (...args: any[]) => void;
type EventMap = Record<string, EventListener[]>;

/**
 * EventEmitter - A simple event system implementing the publisher-subscriber pattern
 * This allows components to communicate without direct references to each other.
 */
export class EventEmitter {
  private events: EventMap;

  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param eventName - Name of the event to subscribe to
   * @param listener - Function to call when the event is emitted
   * @returns Unsubscribe function
   */
  on(eventName: string, listener: EventListener): () => void {
    // Create the event array if it doesn't exist
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    // Add the listener to the event array
    this.events[eventName].push(listener);

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
    // Create a wrapper that will call the listener and unsubscribe
    const onceWrapper: EventListener = (...args) => {
      listener(...args);
      this.off(eventName, onceWrapper);
    };

    // Subscribe the wrapper
    return this.on(eventName, onceWrapper);
  }

  /**
   * Unsubscribe from an event
   * @param eventName - Name of the event to unsubscribe from
   * @param listenerToRemove - Function to remove from the event
   */
  off(eventName: string, listenerToRemove: EventListener): void {
    // If the event doesn't exist, return
    if (!this.events[eventName]) {
      return;
    }

    // Filter out the listener to remove
    this.events[eventName] = this.events[eventName].filter(
      (listener) => listener !== listenerToRemove
    );
  }

  /**
   * Emit an event, calling all subscribed listeners
   * @param eventName - Name of the event to emit
   * @param args - Arguments to pass to the listeners
   */
  emit(eventName: string, ...args: any[]): void {
    // If the event doesn't exist, return
    if (!this.events[eventName]) {
      return;
    }

    // Call each listener with the provided arguments
    this.events[eventName].forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${eventName}:`, error);
      }
    });
  }

  /**
   * Get all listeners for an event
   * @param eventName - Name of the event
   * @returns Array of listeners
   */
  listeners(eventName: string): EventListener[] {
    return this.events[eventName] || [];
  }

  /**
   * Remove all listeners for an event
   * @param eventName - Name of the event (optional, if not provided all events are cleared)
   */
  removeAllListeners(eventName?: string): void {
    if (eventName) {
      delete this.events[eventName];
    } else {
      this.events = {};
    }
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

  // Player events
  PLAYER_DAMAGE: "player:damage",
  PLAYER_HEAL: "player:heal",
  PLAYER_DEATH: "player:death",
  PLAYER_LEVEL_UP: "player:levelUp",
  PLAYER_SKILL_POINT: "player:skillPoint",

  // Enemy events
  ENEMY_SPAWN: "enemy:spawn",
  ENEMY_DAMAGE: "enemy:damage",
  ENEMY_DEATH: "enemy:death",
  ENEMY_ATTACK: "enemy:attack",
  ENEMY_CHARGE: "enemy:charge",
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
};

export default GameEvents;