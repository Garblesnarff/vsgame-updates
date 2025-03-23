import { Particle } from "../entities/particle";

/**
 * Particle System
 * Manages all particle effects in the game
 */
export class ParticleSystem {
  gameContainer: HTMLElement;
  particles: Particle[];
  bloodNovas: Particle[];
  shadowTrails: Particle[];

  /**
   * Create a new particle system
   * @param gameContainer - DOM element for the game container
   */
  constructor(gameContainer: HTMLElement) {
    this.gameContainer = gameContainer;
    this.particles = [];
    this.bloodNovas = [];
    this.shadowTrails = [];
  }

  /**
   * Update all particles
   */
  update(): void {
    // Update regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].update()) {
        this.particles.splice(i, 1);
      }
    }

    // Update blood novas
    for (let i = this.bloodNovas.length - 1; i >= 0; i--) {
      if (this.bloodNovas[i].update()) {
        this.bloodNovas.splice(i, 1);
      }
    }

    // Update shadow trails
    for (let i = this.shadowTrails.length - 1; i >= 0; i--) {
      if (this.shadowTrails[i].update()) {
        this.shadowTrails.splice(i, 1);
      }
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
    const newParticles = Particle.createBloodParticles(
      this.gameContainer,
      x,
      y,
      count
    );
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
    const nova = Particle.createBloodNova(this.gameContainer, x, y);
    this.bloodNovas.push(nova);
    return nova;
  }

  /**
   * Create shadow trail particles
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Created shadow particle
   */
  createShadowTrail(x: number, y: number): Particle {
    const trail = Particle.createShadowTrail(this.gameContainer, x, y);
    this.shadowTrails.push(trail);
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
      const particle = new Particle(this.gameContainer, {
        x: x,
        y: y,
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
    // Clean up all particles
    for (const particle of this.particles) {
      particle.destroy();
    }
    this.particles = [];

    // Clean up all blood novas
    for (const nova of this.bloodNovas) {
      nova.destroy();
    }
    this.bloodNovas = [];

    // Clean up all shadow trails
    for (const trail of this.shadowTrails) {
      trail.destroy();
    }
    this.shadowTrails = [];

    // Use querySelector for any other particles that might have been missed
    const allParticles = this.gameContainer.querySelectorAll('.blood-particle, .blood-nova, .shadow-trail');
    allParticles.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }
}

export default ParticleSystem;