import { State } from './state';

/**
 * Transition - Represents a condition for transitioning between states
 */
export class Transition<T> {
  private condition: (owner: T) => boolean;
  private targetState: State<T>;

  /**
   * Create a new transition
   * @param condition - Function that returns true when transition should occur
   * @param targetState - State to transition to when condition is met
   */
  constructor(condition: (owner: T) => boolean, targetState: State<T>) {
    this.condition = condition;
    this.targetState = targetState;
  }

  /**
   * Check if the transition should occur
   * @param owner - The entity to check the condition against
   * @returns Whether the transition should occur
   */
  shouldTransition(owner: T): boolean {
    return this.condition(owner);
  }

  /**
   * Get the target state for this transition
   * @returns The target state
   */
  getTargetState(): State<T> {
    return this.targetState;
  }
}

/**
 * TransitionTable - Collection of transitions for a state
 */
export class TransitionTable<T> {
  private transitions: Transition<T>[];

  /**
   * Create a new transition table
   * @param transitions - Initial transitions (optional)
   */
  constructor(transitions: Transition<T>[] = []) {
    this.transitions = [...transitions];
  }

  /**
   * Add a transition to the table
   * @param transition - The transition to add
   */
  addTransition(transition: Transition<T>): void {
    this.transitions.push(transition);
  }

  /**
   * Add a new transition with a condition and target state
   * @param condition - Function that returns true when transition should occur
   * @param targetState - State to transition to when condition is met
   */
  add(condition: (owner: T) => boolean, targetState: State<T>): void {
    this.addTransition(new Transition(condition, targetState));
  }

  /**
   * Check all transitions and return the first one that should occur
   * @param owner - The entity to check transitions against
   * @returns The target state if a transition should occur, or null
   */
  checkTransitions(owner: T): State<T> | null {
    for (const transition of this.transitions) {
      if (transition.shouldTransition(owner)) {
        return transition.getTargetState();
      }
    }
    return null;
  }
}
