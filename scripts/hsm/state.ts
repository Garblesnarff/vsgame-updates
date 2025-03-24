5/**
 * Base State interface for the Hierarchical State Machine
 * States represent different behaviors that entities can be in
 */
export interface State<T> {
  /**
   * Name of the state for debugging and identification
   */
  name: string;

  /**
   * Called when entering this state
   * @param owner - The entity that owns this state
   * @param prevState - The previous state (if any)
   */
  enter(owner: T, prevState?: State<T>): void;

  /**
   * Called when exiting this state
   * @param owner - The entity that owns this state
   * @param nextState - The next state (if any)
   */
  exit(owner: T, nextState?: State<T>): void;

  /**
   * Update logic for this state
   * @param owner - The entity that owns this state
   * @param deltaTime - Time since last update in ms
   * @returns The next state to transition to, or null to stay in current state
   */
  update(owner: T, deltaTime: number): State<T> | null;
}

/**
 * Hierarchical State - A state that can have a parent state
 * Child states inherit behavior from parent states
 */
export abstract class HierarchicalState<T> implements State<T> {
  name: string;
  parent: State<T> | null;

  /**
   * Create a new hierarchical state
   * @param name - Name of the state
   * @param parent - Parent state (optional)
   */
  constructor(name: string, parent: State<T> | null = null) {
    this.name = name;
    this.parent = parent;
  }

  /**
   * Enter this state
   * @param owner - The entity that owns this state
   * @param prevState - The previous state (if any)
   */
  enter(owner: T, prevState?: State<T>): void {
    // Default implementation - override in subclasses
  }

  /**
   * Exit this state
   * @param owner - The entity that owns this state
   * @param nextState - The next state (if any)
   */
  exit(owner: T, nextState?: State<T>): void {
    // Default implementation - override in subclasses
  }

  /**
   * Update logic for this state
   * @param owner - The entity that owns this state
   * @param deltaTime - Time since last update in ms
   * @returns The next state to transition to, or null to stay in current state
   */
  abstract update(owner: T, deltaTime: number): State<T> | null;
}
