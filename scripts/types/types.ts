/**
 * An interface for objects that can be managed by an ObjectPool.
 * @template T The type of options object used to initialize the object.
 */
export interface Poolable<T> {
  /**
   * Initializes the object with a given set of options. This is called when the object is acquired from the pool.
   * @param options The options to initialize the object with.
   */
  init(options: T): void;

  /**
   * Resets the object to its default state. This is called when the object is released back into the pool.
   */
  reset(): void;
}
