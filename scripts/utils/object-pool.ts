import { Poolable } from '../types/types';

/**
 * A generic object pool for reusing objects to reduce garbage collection.
 * @template T The type of object the pool will manage.
 */
export class ObjectPool<T extends Poolable<any>> {
  private pool: T[] = [];
  private factory: () => T;

  /**
   * Creates an instance of ObjectPool.
   * @param factory A function that creates new instances of T.
   */
  constructor(factory: () => T) {
    this.factory = factory;
  }

  /**
   * Pre-warms the pool with a specified number of objects.
   * @param count The number of objects to create and add to the pool.
   */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquires an object from the pool. If the pool is empty, a new object is created.
   * @returns An object of type T.
   */
  acquire(): T {
    let obj = this.pool.pop();
    if (!obj) {
      obj = this.factory();
    }
    return obj;
  }

  /**
   * Releases an object back into the pool for future reuse.
   * @param obj The object to release.
   */
  release(obj: T): void {
    obj.reset();
    this.pool.push(obj);
  }

  /**
   * Returns the current number of available objects in the pool.
   * @returns The size of the pool.
   */
  get size(): number {
    return this.pool.length;
  }
}
