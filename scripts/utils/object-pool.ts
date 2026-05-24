import { Poolable } from '../types/types';

/**
 * A generic object pool for reusing objects to reduce garbage collection.
 * Features dynamic resizing, memory limits, and performance monitoring.
 * @template T The type of object the pool will manage.
 */
export class ObjectPool<T extends Poolable<any>> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;
  private minSize: number;
  private shrinkThreshold: number;

  // Performance tracking
  private totalCreated: number = 0;
  private totalAcquired: number = 0;
  private totalReleased: number = 0;

  /**
   * Creates an instance of ObjectPool with memory management.
   * @param factory A function that creates new instances of T.
   * @param options Pool configuration options.
   */
  constructor(factory: () => T, options: {
    maxSize?: number;
    minSize?: number;
    growthFactor?: number;
    shrinkThreshold?: number;
  } = {}) {
    this.factory = factory;
    this.maxSize = options.maxSize ?? 1000; // Hard limit to prevent memory bloat
    this.minSize = options.minSize ?? 10;
    this.shrinkThreshold = options.shrinkThreshold ?? 0.3; // Shrink when utilization drops below 30%
  }

  /**
   * Pre-warms the pool with a specified number of objects.
   * @param count The number of objects to create and add to the pool.
   */
  prewarm(count: number): void {
    const actualCount = Math.min(count, this.maxSize);
    for (let i = 0; i < actualCount; i++) {
      this.pool.push(this.factory());
      this.totalCreated++;
    }
  }

  /**
   * Acquires an object from the pool. If the pool is empty, a new object is created.
   * @returns An object of type T.
   */
  acquire(): T {
    this.totalAcquired++;

    let obj = this.pool.pop();

    if (!obj) {
      // Pool is empty, create new object
      obj = this.factory();
      this.totalCreated++;

      // If we've grown too much, consider shrinking later
      if (this.totalCreated % 100 === 0) { // Periodic check
        this.considerShrink();
      }
    }

    return obj;
  }

  /**
   * Releases an object back into the pool for future reuse.
   * @param obj The object to release.
   */
  release(obj: T): void {
    this.totalReleased++;

    if (this.pool.length < this.maxSize) {
      obj.reset();
      this.pool.push(obj);
    }
    // If we're at max capacity, let the object be garbage collected
  }

  /**
   * Considers shrinking the pool if utilization is low.
   * Called periodically to prevent memory bloat.
   */
  private considerShrink(): void {
    if (this.pool.length > this.minSize) {
      const utilization = this.pool.length / this.totalCreated;

      if (utilization < this.shrinkThreshold) {
        // Shrink the pool by removing excess objects
        const targetSize = Math.max(this.minSize, Math.floor(this.pool.length * this.shrinkThreshold));
        const removeCount = this.pool.length - targetSize;

        for (let i = 0; i < removeCount; i++) {
          this.pool.pop(); // Remove from end
        }
      }
    }
  }

  /**
   * Returns the current number of available objects in the pool.
   * @returns The size of the pool.
   */
  get size(): number {
    return this.pool.length;
  }

  /**
   * Gets pool performance statistics.
   * @returns Performance metrics.
   */
  getStats(): {
    size: number;
    totalCreated: number;
    totalAcquired: number;
    totalReleased: number;
    utilization: number;
  } {
    return {
      size: this.pool.length,
      totalCreated: this.totalCreated,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      utilization: this.totalCreated > 0 ? this.pool.length / this.totalCreated : 0,
    };
  }

  /**
   * Forces garbage collection of excess objects.
   */
  trim(): void {
    while (this.pool.length > this.minSize) {
      this.pool.pop();
    }
  }
}
