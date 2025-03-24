import { createLogger } from "../utils/logger";

const logger = createLogger('BaseEntity');

/**
 * Interface for the common lifecycle methods all entities should implement
 */
export interface EntityLifecycle {
  /**
   * Initialize the entity (after construction)
   */
  initialize(): void;
  
  /**
   * Update the entity state (called each frame)
   * @param deltaTime - Time since last update in ms
   */
  update(deltaTime: number): void;
  
  /**
   * Clean up entity resources (before destruction)
   */
  cleanup(): void;
}

/**
 * Base entity class that implements common lifecycle methods
 * All game entities should extend this class
 */
export abstract class BaseEntity implements EntityLifecycle {
  // Unique ID for the entity
  id: string;
  
  // DOM element containing the entity
  gameContainer: HTMLElement;
  
  // DOM element representing the entity
  element: HTMLElement;
  
  // Flag to track if the entity is initialized
  private isInitialized: boolean = false;
  
  // Flag to track if the entity is destroyed
  private isDestroyed: boolean = false;
  
  /**
   * Create a new entity
   * @param gameContainer - DOM element containing the game
   * @param id - Optional ID for the entity (will be generated if not provided)
   * @param elementType - Type of DOM element to create (default: 'div')
   * @param className - Optional CSS class name for the element
   */
  constructor(gameContainer: HTMLElement, id?: string, elementType: string = 'div', className?: string) {
    this.gameContainer = gameContainer;
    this.id = id || this.generateId();
    
    // Create DOM element
    this.element = document.createElement(elementType);
    if (className) {
      this.element.className = className;
    }
    
    logger.debug(`Entity ${this.id} created`);
  }
  
  /**
   * Generate a unique ID for the entity
   * @returns A unique ID
   */
  protected generateId(): string {
    return `entity_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  }
  
  /**
   * Initialize the entity
   * Should be called after construction and overridden by derived classes
   */
  initialize(): void {
    if (this.isInitialized) {
      logger.warn(`Entity ${this.id} is already initialized`);
      return;
    }
    
    this.isInitialized = true;
    logger.debug(`Entity ${this.id} initialized`);
  }
  
  /**
   * Update method that will be called each frame
   * Should be overridden by derived classes
   * @param _deltaTime - Time since last update in ms
   */
  update(_deltaTime: number): void {
    // Base implementation does nothing
  }
  
  /**
   * Clean up entity resources
   * Should be called before destruction and can be extended by derived classes
   */
  cleanup(): void {
    if (this.isDestroyed) {
      logger.warn(`Entity ${this.id} is already destroyed`);
      return;
    }
    
    // Remove DOM element from parent if it exists and has a parent
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    this.isDestroyed = true;
    logger.debug(`Entity ${this.id} cleaned up`);
  }
  
  /**
   * Check if the entity is initialized
   * @returns Whether the entity is initialized
   */
  isEntityInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Check if the entity is destroyed
   * @returns Whether the entity is destroyed
   */
  isEntityDestroyed(): boolean {
    return this.isDestroyed;
  }
}
