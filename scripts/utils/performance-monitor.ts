/**
 * Performance monitoring utility for the game
 * Tracks FPS, memory usage, and other performance metrics
 */

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  entityCount: number;
  particleCount: number;
  collisionChecks: number;
}

interface FrameData {
  timestamp: number;
  frameTime: number;
}

/**
 * Performance Monitor class
 * Provides real-time performance tracking and statistics
 */
export class PerformanceMonitor {
  private frameHistory: FrameData[] = [];
  private maxHistorySize = 60; // Keep 60 frames of history for averaging
  private lastFrameTime = 0;
  private currentMetrics: PerformanceMetrics;

  // Counters for current frame
  private drawCallsThisFrame = 0;
  private collisionChecksThisFrame = 0;

  // Performance thresholds
  private readonly WARNING_FPS = 45;
  private readonly CRITICAL_FPS = 30;
  private readonly HIGH_MEMORY_MB = 100;

  constructor() {
    this.currentMetrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      entityCount: 0,
      particleCount: 0,
      collisionChecks: 0
    };
  }

  /**
   * Start tracking a new frame
   */
  startFrame(): void {
    this.lastFrameTime = performance.now();
    this.drawCallsThisFrame = 0;
    this.collisionChecksThisFrame = 0;
  }

  /**
   * End tracking the current frame
   */
  endFrame(entityCount: number, particleCount: number): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    // Add to frame history
    this.frameHistory.push({
      timestamp: now,
      frameTime: frameTime
    });

    // Maintain history size
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift();
    }

    // Calculate FPS
    const recentFrames = this.frameHistory.slice(-10); // Use last 10 frames for smoother FPS
    const avgFrameTime = recentFrames.reduce((sum, frame) => sum + frame.frameTime, 0) / recentFrames.length;
    const fps = 1000 / avgFrameTime;

    // Get memory usage (if available)
    const memoryUsage = (performance as any).memory ?
      (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;

    // Update current metrics
    this.currentMetrics = {
      fps: Math.round(fps),
      frameTime: Math.round(frameTime * 100) / 100,
      memoryUsage: Math.round(memoryUsage),
      drawCalls: this.drawCallsThisFrame,
      entityCount,
      particleCount,
      collisionChecks: this.collisionChecksThisFrame
    };
  }

  /**
   * Record a draw call
   */
  recordDrawCall(): void {
    this.drawCallsThisFrame++;
  }

  /**
   * Record collision checks
   */
  recordCollisionCheck(): void {
    this.collisionChecksThisFrame++;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get performance warnings
   */
  getWarnings(): string[] {
    const warnings: string[] = [];

    if (this.currentMetrics.fps < this.CRITICAL_FPS) {
      warnings.push(`CRITICAL: FPS dropped to ${this.currentMetrics.fps}`);
    } else if (this.currentMetrics.fps < this.WARNING_FPS) {
      warnings.push(`WARNING: FPS below ${this.WARNING_FPS} (${this.currentMetrics.fps})`);
    }

    if (this.currentMetrics.frameTime > 33) { // More than 30 FPS
      warnings.push(`WARNING: Frame time ${this.currentMetrics.frameTime}ms (>30FPS)`);
    }

    if (this.currentMetrics.memoryUsage > this.HIGH_MEMORY_MB) {
      warnings.push(`WARNING: High memory usage ${this.currentMetrics.memoryUsage}MB`);
    }

    if (this.currentMetrics.collisionChecks > 1000) {
      warnings.push(`WARNING: High collision checks ${this.currentMetrics.collisionChecks}`);
    }

    return warnings;
  }

  /**
   * Get performance summary string
   */
  getSummary(): string {
    const m = this.currentMetrics;
    return `FPS: ${m.fps} | Frame: ${m.frameTime}ms | Memory: ${m.memoryUsage}MB | Entities: ${m.entityCount} | Particles: ${m.particleCount} | Collisions: ${m.collisionChecks}`;
  }

  /**
   * Check if performance is critical
   */
  isPerformanceCritical(): boolean {
    return this.currentMetrics.fps < this.CRITICAL_FPS ||
           this.currentMetrics.frameTime > 50; // >20 FPS
  }

  /**
   * Get average FPS over the last N frames
   */
  getAverageFPS(frames = 30): number {
    if (this.frameHistory.length < frames) return 0;

    const recentFrames = this.frameHistory.slice(-frames);
    const avgFrameTime = recentFrames.reduce((sum, frame) => sum + frame.frameTime, 0) / recentFrames.length;
    return Math.round(1000 / avgFrameTime);
  }

  /**
   * Reset performance statistics
   */
  reset(): void {
    this.frameHistory = [];
    this.lastFrameTime = 0;
    this.drawCallsThisFrame = 0;
    this.collisionChecksThisFrame = 0;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
