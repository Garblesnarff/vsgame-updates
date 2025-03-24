import { State } from './state';
import { createLogger } from '../utils/logger';

const logger = createLogger('StateMachine');

/**
 * StateMachine - Manages states and transitions between them
 */
export class StateMachine<T> {
  private owner: T;
  private currentState: State<T> | null;
  private previousState: State<T> | null;
  private globalState: State<T> | null;
  private isInTransition: boolean;
  private debugMode: boolean;

  /**
   * Create a new state machine
   * @param owner - The entity that owns this state machine
   * @param initialState - The initial state (optional)
   * @param globalState - A global state that is always active (optional)
   * @param debugMode - Whether to log state transitions (default: false)
   */
  constructor(
    owner: T,
    initialState: State<T> | null = null,
    globalState: State<T> | null = null,
    debugMode: boolean = false
  ) {
    this.owner = owner;
    this.currentState = null;
    this.previousState = null;
    this.globalState = globalState;
    this.isInTransition = false;
    this.debugMode = debugMode;

    // Set initial state if provided
    if (initialState) {
      this.changeState(initialState);
    }
  }

  /**
   * Update the state machine
   * @param deltaTime - Time since last update in ms
   */
  update(deltaTime: number): void {
    // Don't update during a transition
    if (this.isInTransition) {
      return;
    }

    // Update global state if it exists
    if (this.globalState) {
      const nextState = this.globalState.update(this.owner, deltaTime);
      if (nextState) {
        this.changeState(nextState);
        return;
      }
    }

    // Update current state if it exists
    if (this.currentState) {
      const nextState = this.currentState.update(this.owner, deltaTime);
      if (nextState) {
        this.changeState(nextState);
      }
    }
  }

  /**
   * Change to a new state
   * @param newState - The new state to change to
   */
  changeState(newState: State<T>): void {
    // Don't change to the same state
    if (this.currentState === newState) {
      return;
    }

    // Don't allow state changes during a transition
    if (this.isInTransition) {
      if (this.debugMode) {
        logger.warn(`Attempted state change during transition: ${newState.name}`);
      }
      return;
    }

    this.isInTransition = true;

    // Store previous state
    this.previousState = this.currentState;

    // Exit current state
    if (this.currentState) {
      if (this.debugMode) {
        logger.debug(`Exiting state: ${this.currentState.name}`);
      }
      this.currentState.exit(this.owner, newState);
    }

    // Set new state
    this.currentState = newState;

    // Enter new state
    if (this.debugMode) {
      logger.debug(`Entering state: ${newState.name}`);
    }
    this.currentState.enter(this.owner, this.previousState || undefined);

    this.isInTransition = false;
  }

  /**
   * Revert to the previous state
   */
  revertToPreviousState(): void {
    if (this.previousState) {
      this.changeState(this.previousState);
    } else if (this.debugMode) {
      logger.warn('Attempted to revert to previous state, but no previous state exists');
    }
  }

  /**
   * Get the current state
   * @returns The current state
   */
  getCurrentState(): State<T> | null {
    return this.currentState;
  }

  /**
   * Get the name of the current state
   * @returns The name of the current state or 'No State'
   */
  getCurrentStateName(): string {
    return this.currentState ? this.currentState.name : 'No State';
  }

  /**
   * Check if the state machine is in a specific state
   * @param stateName - The name of the state to check
   * @returns Whether the current state has the specified name
   */
  isInState(stateName: string): boolean {
    return this.currentState ? this.currentState.name === stateName : false;
  }

  /**
   * Set the global state
   * @param state - The global state
   */
  setGlobalState(state: State<T> | null): void {
    this.globalState = state;
  }
}
