import { Ability } from "./ability-base";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";
import CONFIG from "../config";
import { emitParticle } from "../utils/game-event-emitters";


/**
 * Interface for bat objects
 */
interface Bat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  element: HTMLElement;
}

/**
 * Bat Swarm ability - Release a swarm of bats that damage enemies they touch
 */
export class BatSwarm extends Ability {
  // Ability-specific properties
  count: number;
  damage: number;
  speed: number;
  bats: Bat[];

  /**
   * Create a new Bat Swarm ability
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: any) {
    super(player, {
      name: "Bat Swarm",
      description: "Release a swarm of bats that damage enemies they touch",
      key: "2",
      cooldown: config.COOLDOWN,
      energyCost: config.ENERGY_COST,
      level: 1,
      maxLevel: config.MAX_LEVEL,
    });

    this.count = config.COUNT;
    this.damage = config.DAMAGE;
    this.speed = config.SPEED;
    this.bats = [];
  }

  /**
   * Check if the ability can be used
   * Override to allow multiple swarms (skip active check)
   */
  canUse(): boolean {
    if (!this.unlocked) {
      return false;
    }

    const now = Date.now();
    const onCooldown = now - this.lastUsed < this.cooldown;
    const hasEnergy = this.player.stats.getEnergy() >= this.energyCost;
    const isStunned = this.player.isStunned;

    // Skip the !this.active check to allow multiple swarms
    return !onCooldown && hasEnergy && !isStunned;
  }

  /**
   * Use the bat swarm ability
   * @returns Whether the ability was used
   */
  use(): boolean {
    if (!super.use()) {
      return false;
    }

    // Set ability as active so update() will be called
    this.active = true;

    // Create bats in all directions
    const batCount = this.getScaledCount();
    const angleStep = (2 * Math.PI) / batCount;

    for (let i = 0; i < batCount; i++) {
      const angle = i * angleStep;
      this.createBat(angle);
    }

    return true;
  }

  /**
   * Create a bat with the given angle
   * @param angle - Direction angle in radians
   */
  createBat(angle: number): void {
    // Create bat element
    const batElement = document.createElement("div");
    batElement.className = "bat";
    batElement.style.left = this.player.x + this.player.width / 2 + "px";
    batElement.style.top = this.player.y + this.player.height / 2 + "px";
    batElement.style.transform = `rotate(${angle + Math.PI / 2}rad)`;

    // Add to game container
    this.player.gameContainer.appendChild(batElement);

    // Create bat object
    const bat: Bat = {
      x: this.player.x + this.player.width / 2,
      y: this.player.y + this.player.height / 2,
      vx: Math.cos(angle) * this.speed,
      vy: Math.sin(angle) * this.speed,
      element: batElement,
    };

    // Track bat
    this.bats.push(bat);
  }

  /**
   * Update bat positions and check for collisions
   * @param _deltaTime - Time since last update
   * @param enemies - Array of enemy objects
   */
  update(_deltaTime: number, enemies: Enemy[] = []): void {
    if (this.bats.length === 0) {
      // No more bats, deactivate the ability
      this.active = false;
      return;
    }

    for (let i = this.bats.length - 1; i >= 0; i--) {
      const bat = this.bats[i];

      // Move bat
      bat.x += bat.vx;
      bat.y += bat.vy;

      // Update bat position
      bat.element.style.left = bat.x + "px";
      bat.element.style.top = bat.y + "px";

      // Remove bat if out of bounds
      if (this.isBatOutOfBounds(bat)) {
        this.removeBat(i);
        continue;
      }

      // Check for collision with enemies
      if (enemies && enemies.length > 0) {
        let batRemoved = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];

          if (this.batCollidesWithEnemy(bat, enemy)) {
            // Create blood particles (emit to Phaser renderer)
            emitParticle({
              type: 'blood', x: bat.x, y: bat.y, count: 3
            });

            // Apply scaled damage to the enemy
            enemy.health -= this.getScaledDamage();
              
            // Update the enemy health bar
            enemy.updateHealthBar();
              
            // Check if enemy died
            if (enemy.health <= 0) {
              if (enemy.destroy) {
                enemy.destroy();
              } else if (enemy.element && enemy.element.parentNode) {
                enemy.element.parentNode.removeChild(enemy.element);
              }
                
              enemies.splice(j, 1);
                
              // Add kill to player
              if (this.player.addKill) {
                this.player.addKill();
              }
            }

            // Remove bat
            this.removeBat(i);
            batRemoved = true;
            break;
          }
        }

        if (batRemoved) {
          continue;
        }
      }
    }
  }

  /**
   * Check if a bat is outside the game area
   * @param bat - Bat object
 * @returns Whether the bat is out of bounds
 */
isBatOutOfBounds(bat: Bat): boolean {
    // Use world dimensions from CONFIG instead of window dimensions
    return bat.x < 0 || bat.x > CONFIG.WORLD_WIDTH || bat.y < 0 || bat.y > CONFIG.WORLD_HEIGHT;
}

  /**
   * Check if a bat collides with an enemy
   * @param bat - Bat object
   * @param enemy - Enemy object
   * @returns Whether collision occurred
   */
  batCollidesWithEnemy(bat: Bat, enemy: Enemy): boolean {
    return (
      bat.x > enemy.x &&
      bat.x < enemy.x + enemy.width &&
      bat.y > enemy.y &&
      bat.y < enemy.y + enemy.height
    );
  }

  /**
   * Remove a bat from the game
   * @param index - Index of the bat to remove
   */
  removeBat(index: number): void {
    const bat = this.bats[index];

    if (bat.element && bat.element.parentNode) {
      bat.element.parentNode.removeChild(bat.element);
    }

    this.bats.splice(index, 1);
  }

  /**
   * Get count scaled by ability level
   * @returns Scaled count
   */
  getScaledCount(): number {
    return this.count + (this.level - 1) * 4;
  }

  /**
   * Get damage scaled by ability level
   * @returns Scaled damage
   */
  getScaledDamage(): number {
    // Scale damage with level: base + 50% per level above 1
    return Math.floor(this.damage * (1 + (this.level - 1) * 0.5));
  }

  /**
   * Get bat data for Phaser rendering
   * @returns Array of bat position data
   */
  getBatRenderData(): Array<{ id: string; x: number; y: number; angle: number }> {
    return this.bats.map((bat, index) => ({
      id: `bat-${index}`,
      x: bat.x,
      y: bat.y,
      angle: Math.atan2(bat.vy, bat.vx),
    }));
  }

  /**
   * Clean up ability resources
   */
  destroy(): void {
    super.destroy();

    // Remove all bats
    for (const bat of this.bats) {
      if (bat.element && bat.element.parentNode) {
        bat.element.parentNode.removeChild(bat.element);
      }
    }

    this.bats = [];
  }
}

export default BatSwarm;
