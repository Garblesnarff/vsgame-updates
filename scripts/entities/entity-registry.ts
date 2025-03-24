import { BaseEntity } from './base-entity';
import { createLogger } from '../utils/logger';

const logger = createLogger('EntityRegistry');

/**
 * EntityRegistry class
 * A centralized registry for all game entities to help with lifecycle management
 */
export class EntityRegistry {
  private static instance: EntityRegistry;
  private entities: Map<string, BaseEntity> = new Map();

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    logger.debug('EntityRegistry initialized');
  }

  /**
   * Get the singleton instance
   * @returns The EntityRegistry instance
   */
  public static getInstance(): EntityRegistry {
    if (!EntityRegistry.instance) {
      EntityRegistry.instance = new EntityRegistry();
    }
    return EntityRegistry.instance;
  }

  /**
   * Register an entity with the registry
   * @param entity - Entity to register
   */
  public register(entity: BaseEntity): void {
    if (!entity.id) {
      logger.warn('Attempted to register entity without ID');
      return;
    }

    if (this.entities.has(entity.id)) {
      logger.warn(`Entity with ID ${entity.id} is already registered`);
      return;
    }

    this.entities.set(entity.id, entity);
    logger.debug(`Registered entity ${entity.id}`);
  }

  /**
   * Remove an entity from the registry
   * @param entityId - ID of the entity to remove
   */
  public unregister(entityId: string): void {
    if (!this.entities.has(entityId)) {
      logger.warn(`Entity with ID ${entityId} is not registered`);
      return;
    }

    this.entities.delete(entityId);
    logger.debug(`Unregistered entity ${entityId}`);
  }

  /**
   * Get an entity by ID
   * @param entityId - ID of the entity to retrieve
   * @returns The entity, or undefined if not found
   */
  public getEntity<T extends BaseEntity>(entityId: string): T | undefined {
    return this.entities.get(entityId) as T | undefined;
  }

  /**
   * Get all entities of a specific type
   * @param constructor - Constructor of the entity type to filter for
   * @returns Array of entities of the specified type
   */
  public getEntitiesByType<T extends BaseEntity>(constructor: new (...args: any[]) => T): T[] {
    const result: T[] = [];
    
    for (const entity of this.entities.values()) {
      if (entity instanceof constructor) {
        result.push(entity as T);
      }
    }
    
    return result;
  }

  /**
   * Get all registered entities
   * @returns Array of all entities
   */
  public getAllEntities(): BaseEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get the number of registered entities
   * @returns Number of entities
   */
  public getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Update all registered entities
   * @param deltaTime - Time since last update in ms
   */
  public updateAll(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      entity.update(deltaTime);
    }
  }

  /**
   * Clean up all registered entities
   */
  public cleanupAll(): void {
    logger.info(`Cleaning up all ${this.entities.size} entities`);
    
    for (const entity of this.entities.values()) {
      entity.cleanup();
    }
    
    this.entities.clear();
  }

  /**
   * Reset the registry (for testing or game restart)
   */
  public reset(): void {
    this.entities.clear();
    logger.debug('EntityRegistry reset');
  }
}

export default EntityRegistry;