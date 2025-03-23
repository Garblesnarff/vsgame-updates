import { Ability } from "./ability-base";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";
import { Particle } from "../entities/particle";

/**
 * Shadow Dash ability - Dash through enemies, becoming briefly invulnerable
 */
export class ShadowDash extends Ability {
  // Ability-specific properties
  distance: number;
  damage: number;
  invulnerabilityTime: number;

  /**
   * Create a new Shadow Dash ability
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: any) {
    super(player, {
      name: "Shadow Dash",
      description:
        "Dash through enemies, becoming briefly invulnerable and damaging enemies you pass through",
      key: "3",
      cooldown: config.COOLDOWN,
      energyCost: config.ENERGY_COST,
      level: 1,
      maxLevel: config.MAX_LEVEL,
    });

    this.distance = config.DISTANCE;
    this.damage = config.DAMAGE;
    this.invulnerabilityTime = config.INVULNERABILITY_TIME;
  }

  /**
   * Use the shadow dash ability
   * @returns Whether the ability was used
   */
  use(): boolean {
    if (this.active || !super.use()) {
      return false;
    }

    this.active = true;

    // Set player invulnerable
    this.player.setInvulnerable(this.invulnerabilityTime);

    // Calculate dash direction based on current movement keys
    const keys = this.getMovementKeys();
    let dirX = 0,
      dirY = 0;

    if (keys.up) {
      dirY = -1;
    }
    if (keys.down) {
      dirY = 1;
    }
    if (keys.left) {
      dirX = -1;
    }
    if (keys.right) {
      dirX = 1;
    }

    // If no direction pressed, dash forward (right)
    if (dirX === 0 && dirY === 0) {
      dirX = 1;
    }

    // Normalize direction vector
    const length = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= length;
    dirY /= length;

    // Get dash distance based on level
    const dashDistance = this.getScaledDistance();

    // Calculate dash target position
    const dashX = dirX * dashDistance;
    const dashY = dirY * dashDistance;

    // Create shadow trail effect
    this.createShadowTrail(dashX, dashY);

    // Move player
    this.player.x = Math.max(
      0,
      Math.min(window.innerWidth - this.player.width, this.player.x + dashX)
    );
    this.player.y = Math.max(
      0,
      Math.min(window.innerHeight - this.player.height, this.player.y + dashY)
    );
    this.player.updatePosition();

    // Damage enemies in path
    if (this.player.game && this.player.game.enemies) {
      this.damageEnemiesInPath(
        dirX,
        dirY,
        dashDistance,
        this.player.game.enemies
      );
    }

    // End dash after the invulnerability time
    setTimeout(() => {
      this.active = false;
    }, this.invulnerabilityTime);

    return true;
  }

  /**
   * Get current movement keys from the game input handler
   * @returns Keys state { up, down, left, right }
   */
  getMovementKeys(): {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  } {
    // If we can access the game input handler
    if (this.player.game && this.player.game.inputHandler) {
      const keys = this.player.game.inputHandler.getKeys();

      return {
        up: keys["ArrowUp"] || keys["w"] || false,
        down: keys["ArrowDown"] || keys["s"] || false,
        left: keys["ArrowLeft"] || keys["a"] || false,
        right: keys["ArrowRight"] || keys["d"] || false,
      };
    }

    // Default: dash right if we can't access input
    return { up: false, down: false, left: false, right: true };
  }

  /**
   * Create shadow trail effect
   * @param dashX - X component of dash vector
   * @param dashY - Y component of dash vector
   */
  createShadowTrail(dashX: number, dashY: number): void {
    // Create multiple shadow trails along the dash path
    for (let i = 0; i < 10; i++) {
      const trailX = this.player.x + dashX * (i / 10);
      const trailY = this.player.y + dashY * (i / 10);

      // Use particle system if available
      if (this.player.game && this.player.game.particleSystem) {
        this.player.game.particleSystem.createShadowTrail(trailX, trailY);
      } else {
        // Fallback if no particle system
        Particle.createShadowTrail(this.player.gameContainer, trailX, trailY);
      }
    }
  }

  /**
   * Damage enemies in the dash path
   * @param dirX - X direction component
   * @param dirY - Y direction component
   * @param dashDistance - Dash distance
   * @param enemies - Array of enemies to check
   */
  damageEnemiesInPath(
    dirX: number,
    dirY: number,
    dashDistance: number,
    enemies: Enemy[]
  ): void {
    const damage = this.getScaledDamage();

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      // Check if enemy is in dash path (simple approximation)
      if (this.isEnemyInDashPath(enemy, dirX, dirY, dashDistance)) {
        // Apply damage
        if (
          enemy.takeDamage(damage, (x, y, count) => {
            if (this.player.game && this.player.game.particleSystem) {
              this.player.game.particleSystem.createBloodParticles(x, y, count);
            }
          })
        ) {
          // Enemy died
          enemy.destroy();
          enemies.splice(i, 1);

          // Add kill to player
          this.player.addKill();
        }
      }
    }
  }

  /**
   * Check if an enemy is in the dash path
   * @param enemy - Enemy object
   * @param dirX - X direction component
   * @param dirY - Y direction component
   * @param dashDistance - Dash distance
   * @returns Whether the enemy is in the dash path
   */
  isEnemyInDashPath(
    enemy: Enemy,
    dirX: number,
    dirY: number,
    dashDistance: number
  ): boolean {
    // Simplified check: enemy center point is within a certain distance of the dash line
    // For a more accurate check, you'd use line-rectangle intersection

    // Dash start and end points
    const startX = this.player.x + this.player.width / 2;
    const startY = this.player.y + this.player.height / 2;
    const endX = startX + dirX * dashDistance;
    const endY = startY + dirY * dashDistance;

    // Enemy center
    const enemyX = enemy.x + enemy.width / 2;
    const enemyY = enemy.y + enemy.height / 2;

    // Distance from enemy center to dash line segment
    // Using point-to-line-segment distance formula
    const lengthSquared =
      (endX - startX) * (endX - startX) + (endY - startY) * (endY - startY);

    // If dash length is zero, return distance to start point
    if (lengthSquared === 0) {
      const dx = enemyX - startX;
      const dy = enemyY - startY;
      return Math.sqrt(dx * dx + dy * dy) < 50; // 50px collision radius
    }

    // Project enemy point onto dash line
    const t = Math.max(
      0,
      Math.min(
        1,
        ((enemyX - startX) * (endX - startX) +
          (enemyY - startY) * (endY - startY)) /
          lengthSquared
      )
    );

    const projX = startX + t * (endX - startX);
    const projY = startY + t * (endY - startY);

    // Distance from enemy center to projection point
    const dx = enemyX - projX;
    const dy = enemyY - projY;
    const distanceToLine = Math.sqrt(dx * dx + dy * dy);

    // Return true if enemy is close enough to dash path
    return distanceToLine < 50; // 50px collision radius
  }

  /**
   * Get distance scaled by ability level
   * @returns Scaled distance
   */
  getScaledDistance(): number {
    return this.distance + (this.level - 1) * 50;
  }

  /**
   * Get damage scaled by ability level
   * @returns Scaled damage
   */
  getScaledDamage(): number {
    return this.damage + (this.level - 1) * 15;
  }

  /**
   * Get invulnerability time scaled by ability level
   * @returns Scaled invulnerability time in ms
   */
  getScaledInvulnerabilityTime(): number {
    return this.invulnerabilityTime + (this.level - 1) * 100;
  }
}

export default ShadowDash;
