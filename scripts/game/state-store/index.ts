import { GameEvents } from "../../utils/event-system";
import { createLogger } from "../../utils/logger";

// Create a logger for the StateStore
const logger = createLogger('StateStore');

/**
 * State change subscriber function type
 */
type StateChangeSubscriber<T> = (newValue: T, oldValue: T) => void;

/**
 * Generic state container with subscription capability
 */
class StateContainer<T> {
  private value: T;
  private subscribers: Map<string, StateChangeSubscriber<T>>;
  private name: string;

  constructor(initialValue: T, name: string) {
    this.value = initialValue;
    this.subscribers = new Map();
    this.name = name;
  }

  /**
   * Get the current value
   */
  get(): T {
    return this.value;
  }

  /**
   * Set a new value and notify subscribers if changed
   */
  set(newValue: T): void {
    const oldValue = this.value;
    
    // Only update if value actually changed
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      this.value = newValue;
      
      // Log the state change
      logger.debug(`State changed - ${this.name}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)}`);
      
      // Notify all subscribers
      this.subscribers.forEach(subscriber => {
        try {
          subscriber(newValue, oldValue);
        } catch (error) {
          logger.error(`Error in state subscriber for ${this.name}:`, error);
        }
      });
      
      // Emit global event for this state change
      GameEvents.emit(`state:${this.name}:change`, { 
        oldValue, 
        newValue 
      });
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(id: string, callback: StateChangeSubscriber<T>): () => void {
    this.subscribers.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }
}

/**
 * Game State Store - Centralizes state management
 */
export class StateStore {
  // Player state
  public readonly player = {
    level: new StateContainer<number>(1, 'player.level'),
    kills: new StateContainer<number>(0, 'player.kills'),
    skillPoints: new StateContainer<number>(0, 'player.skillPoints'),
    health: new StateContainer<number>(100, 'player.health'),
    maxHealth: new StateContainer<number>(100, 'player.maxHealth'),
    energy: new StateContainer<number>(100, 'player.energy'),
    maxEnergy: new StateContainer<number>(100, 'player.maxEnergy'),
    attackPower: new StateContainer<number>(1, 'player.attackPower'),
    attackSpeed: new StateContainer<number>(1, 'player.attackSpeed'),
    lifeSteal: new StateContainer<number>(0, 'player.lifeSteal'),
    isAlive: new StateContainer<boolean>(true, 'player.isAlive'),
    isInvulnerable: new StateContainer<boolean>(false, 'player.isInvulnerable'),
  };

  // Level system state
  public readonly levelSystem = {
    level: new StateContainer<number>(1, 'levelSystem.level'),
    kills: new StateContainer<number>(0, 'levelSystem.kills'),
    killsToNextLevel: new StateContainer<number>(10, 'levelSystem.killsToNextLevel'),
  };

  // Game state
  public readonly game = {
    state: new StateContainer<string>('LOADING', 'game.state'),
    isPaused: new StateContainer<boolean>(false, 'game.isPaused'),
    isRunning: new StateContainer<boolean>(false, 'game.isRunning'),
    time: new StateContainer<number>(0, 'game.time'),
    availableKillPoints: new StateContainer<number>(0, 'game.availableKillPoints'),
  };

  // UI state
  public readonly ui = {
    showingSkillMenu: new StateContainer<boolean>(false, 'ui.showingSkillMenu'),
    showingPassiveSkillMenu: new StateContainer<boolean>(false, 'ui.showingPassiveSkillMenu'),
  };

  // Singleton instance
  private static instance: StateStore;

  /**
   * Get the StateStore instance (singleton)
   */
  public static getInstance(): StateStore {
    if (!StateStore.instance) {
      StateStore.instance = new StateStore();
    }
    return StateStore.instance;
  }

  /**
   * Private constructor for singleton
   */
  private constructor() {
    logger.debug('StateStore initialized');
    
    // Setup initial state bindings
    this.setupBindings();
  }

  /**
   * Setup initial state bindings between related states
   */
  private setupBindings(): void {
    // Bind player level to levelSystem level
    this.levelSystem.level.subscribe('player-level-sync', (newLevel) => {
      this.player.level.set(newLevel);
    });
    
    // We don't need to bind kills to skill points - skill points come from level ups
    // This binding was causing the bug where skill points increased with kills
    this.levelSystem.level.subscribe('level-update', (newLevel, oldLevel) => {
      // When level increases, increment skill points by the level difference
      if (newLevel > oldLevel) {
        const currentPoints = this.player.skillPoints.get();
        this.player.skillPoints.set(currentPoints + (newLevel - oldLevel));
      }
    });
    
    // When player dies, update game state
    this.player.isAlive.subscribe('player-death', (isAlive) => {
      if (!isAlive) {
        this.game.state.set('GAME_OVER');
        
        // Store level as available kill points for passive skills
        const level = this.player.level.get();
        this.game.availableKillPoints.set(level);
      }
    });
  }

  /**
   * Convenience method to reset all game state
   */
  resetAll(): void {
    // Reset player state
    this.player.level.set(1);
    this.player.kills.set(0);
    this.player.skillPoints.set(0);
    this.player.health.set(100);
    this.player.isAlive.set(true);
    this.player.isInvulnerable.set(false);
    
    // Reset level system
    this.levelSystem.level.set(1);
    this.levelSystem.kills.set(0);
    this.levelSystem.killsToNextLevel.set(10);
    
    // Reset game state
    this.game.state.set('PLAYING');
    this.game.isPaused.set(false);
    this.game.time.set(0);
    
    // Reset UI state
    this.ui.showingSkillMenu.set(false);
    this.ui.showingPassiveSkillMenu.set(false);
    
    logger.info('All game state reset to initial values');
  }
}

// Export a default instance
export default StateStore.getInstance();
