import { BaseEntity } from "./base-entity";
import { createLogger } from "../utils/logger";
import { Poolable } from "../types/types";

const logger = createLogger('Particle');

/**
 * Interface for particle creation options
 */
interface ParticleOptions {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  life?: number;
  type?: "blood" | "shadow" | "bloodNova";
  opacity?: number;
  radius?: number;
}

/**
 * Particle class for visual effects with object pooling support
 */
export class Particle extends BaseEntity implements Poolable<ParticleOptions> {
  // DOM elements inherited from BaseEntity

  // Position and movement
  x: number;
  y: number;
  vx: number;
  vy: number;

  // Properties
  life: number;
  type: string;
  opacity: number;
  radius?: number;

  /**
   * Create a new particle for pooling (DOM element created once)
   * @param gameContainer - DOM element containing the game
   */
  constructor(gameContainer: HTMLElement) {
    super(gameContainer, `particle_blood_${Date.now()}`);

    // Create DOM element once (reused across pool lifecycle)
    this.element = document.createElement("div");
    this.element.className = "blood-particle"; // Default class

    // Add to game container once
    this.gameContainer.appendChild(this.element);

    // Reset to default state
    this.reset();
  }

  /**
   * Initialize particle with options (called when acquired from pool)
   * @param options - Particle initialization options
   */
  init(options: ParticleOptions): void {
    this.id = `particle_${options.type || 'blood'}_${Date.now()}`;

    // Position and movement
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;

    // Properties
    this.life = options.life || 30;
    this.type = options.type || "blood";
    this.opacity = options.opacity || 1;
    this.radius = options.radius;

    // Update DOM element based on particle type
    switch (this.type) {
      case "blood":
        this.element.className = "blood-particle";
        break;
      case "shadow":
        this.element.className = "shadow-trail";
        this.opacity = options.opacity || 0.5;
        break;
      case "bloodNova":
        this.element.className = "blood-nova";
        this.radius = options.radius || 20;
        this.element.style.width = this.radius * 2 + "px";
        this.element.style.height = this.radius * 2 + "px";
        this.element.style.left = this.x - this.radius + "px";
        this.element.style.top = this.y - this.radius + "px";
        break;
      default:
        this.element.className = "blood-particle";
    }

    // Apply opacity if specified
    if (this.opacity !== 1) {
      this.element.style.opacity = this.opacity.toString();
    }

    // Position element and show it
    this.updatePosition();
    this.element.style.display = 'block';

    // Initialize the particle
    this.initialize();
  }

  /**
   * Reset particle to default state (called when released to pool)
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.type = "blood";
    this.opacity = 1;
    this.radius = undefined;

    // Hide element
    if (this.element) {
      this.element.style.display = 'none';
      this.element.className = "blood-particle";
      this.element.style.opacity = "1";
    }
  }

  /**
   * Initialize the particle
   */
  initialize(): void {
    super.initialize();
    logger.debug(`Particle ${this.id} initialized: type=${this.type}`);
  }

  /**
   * Updates the particle position and properties
   * @param _deltaTime - Time since last update in ms (not used)
   * @returns Whether the particle has expired
   */
  update(_deltaTime: number = 0): boolean {
    // Move particle
    this.x += this.vx;
    this.y += this.vy;

    // Update position
    this.updatePosition();

    // Special handling for different particle types
    if (this.type === "bloodNova" && this.radius !== undefined) {
      // Expand nova
      this.radius += 5;
      this.opacity -= 0.05;

      // Update nova appearance
      this.element.style.width = this.radius * 2 + "px";
      this.element.style.height = this.radius * 2 + "px";
      this.element.style.left = this.x - this.radius + "px";
      this.element.style.top = this.y - this.radius + "px";
      this.element.style.opacity = this.opacity.toString();
    } else if (this.type === "shadow") {
      // Fade out shadow
      this.opacity -= 0.05;
      this.element.style.opacity = this.opacity.toString();
    } else {
      // Reduce particle life
      this.life--;
    }

    // Check if particle should be removed
    if (this.life <= 0 || this.opacity <= 0) {
      this.cleanup();
      return true;
    }

    return false;
  }

  /**
   * Updates the DOM element position
   */
  updatePosition(): void {
    if (this.type === "bloodNova") {
      // For blood nova, position is handled in update method
      return;
    }

    this.element.style.left = this.x + "px";
    this.element.style.top = this.y + "px";
  }



  /**
   * Clean up particle resources
   */
  cleanup(): void {
    logger.debug(`Particle ${this.id} cleanup`);
    super.cleanup();
  }

  /**
   * Destroy the particle (backwards compatibility)
   */
  destroy(): void {
    this.cleanup();
  }
}

export default Particle;
