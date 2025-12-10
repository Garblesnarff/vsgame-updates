import { Particle } from "../entities/particle";
import { createLogger } from "../utils/logger";
import { ObjectPool } from "../utils/object-pool";

const logger = createLogger('ParticleSystem');

/**
 * Particle System with object pooling
 * Manages all particle effects in the game using efficient object pools
 */
export class ParticleSystem {
  gameContainer: HTMLElement;
  particles: Particle[];

  // Object pools for different particle types
  bloodParticlePool: ObjectPool<Particle>;
  shadowTrailPool: ObjectPool<Particle>;
  bloodNovaPool: ObjectPool<Particle>;

  /**
   * Create a new particle system with object pools
   * @param gameContainer - DOM element for the game container
   */
  constructor(gameContainer: HTMLElement) {
    this.gameContainer = gameContainer;
    this.particles = [];

    // Create object pools for different particle types
    this.bloodParticlePool = new ObjectPool(() => new Particle(gameContainer));
    this.bloodParticlePool.prewarm(50); // Pre-allocate blood particles

    this.shadowTrailPool = new ObjectPool(() => new Particle(gameContainer));
    this.shadowTrailPool.prewarm(10); // Pre-allocate shadow trails

    this.bloodNovaPool = new ObjectPool(() => new Particle(gameContainer));
    this.bloodNovaPool.prewarm(5); // Pre-allocate blood novas
  }

  /**
   * Update all particles
   * @param deltaTime - Time since last update in milliseconds
   */
  update(deltaTime: number = 0): void {
    // Update all particles and remove expired ones
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (particle.update(deltaTime)) {
        // Particle expired, release back to appropriate pool
        this.releaseParticleToPool(particle);
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Release a particle back to its appropriate pool
   * @param particle - The particle to release
   */
  private releaseParticleToPool(particle: Particle): void {
    switch (particle.type) {
      case "blood":
        this.bloodParticlePool.release(particle);
        break;
      case "shadow":
        this.shadowTrailPool.release(particle);
        break;
      case "bloodNova":
        this.bloodNovaPool.release(particle);
        break;
      default:
        this.bloodParticlePool.release(particle);
    }
  }

  /**
   * Create blood particles at a position
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param count - Number of particles to create
   * @returns Array of created particles
   */
  createBloodParticles(x: number, y: number, count: number): Particle[] {
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const particle = this.bloodParticlePool.acquire();
      particle.init({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 30 + Math.random() * 30,
        type: "blood",
      });
      newParticles.push(particle);
    }

    this.particles.push(...newParticles);
    return newParticles;
  }

  /**
   * Create a blood nova effect
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Created nova particle
   */
  createBloodNova(x: number, y: number): Particle {
    const nova = this.bloodNovaPool.acquire();
    nova.init({
      x: x,
      y: y,
      radius: 20,
      opacity: 0.5,
      type: "bloodNova",
    });
    this.particles.push(nova);
    return nova;
  }

  /**
   * Create shadow trail particles
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Created shadow particle
   */
  createShadowTrail(x: number, y: number): Particle {
    const trail = this.shadowTrailPool.acquire();
    trail.init({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      opacity: 0.5,
      type: "shadow",
    });
    this.particles.push(trail);
    return trail;
  }

  /**
   * Create shield particles
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param count - Number of particles to create
   */
  createShieldParticles(x: number, y: number, count: number): Particle[] {
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const particle = this.bloodParticlePool.acquire();
      particle.init({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 20 + Math.random() * 10,
        type: "blood",
      });

      // Override default color for shield particles
      particle.element.style.backgroundColor = "#8a2be2";

      this.particles.push(particle);
      particles.push(particle);
    }

    return particles;
  }

  /**
   * Reset the particle system
   */
  reset(): void {
    logger.debug('Resetting particle system');

    // Release all active particles back to their pools
    for (const particle of this.particles) {
      this.releaseParticleToPool(particle);
    }
    this.particles = [];
  }
}

export default ParticleSystem;
