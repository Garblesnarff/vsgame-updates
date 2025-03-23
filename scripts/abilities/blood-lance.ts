import { Ability } from "./ability-base";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";


/**
 * Interface for projectile creation options
 */
interface ProjectileOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isAutoAttack?: boolean;
  isBloodLance?: boolean;
  pierce?: number;
  pierceCount?: number;
  healAmount?: number;
  hitEnemies?: Set<string>;
  className?: string;
  angle?: number;
}

/**
 * Blood Lance ability - Fire a piercing projectile that damages enemies and heals
 */
export class BloodLance extends Ability {
  // Ability-specific properties
  damage: number;
  pierce: number;
  healAmount: number;
  speed: number;

  /**
   * Create a new Blood Lance ability
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: any) {
    super(player, {
      name: "Blood Lance",
      description:
        "Fire a powerful piercing projectile that damages enemies and heals you for each enemy hit",
      key: "4",
      cooldown: config.COOLDOWN,
      energyCost: config.ENERGY_COST,
      level: 0, // Starts at 0 because it's locked initially
      maxLevel: config.MAX_LEVEL,
      unlocked: config.UNLOCKED,
    });

    this.damage = config.DAMAGE;
    this.pierce = config.PIERCE;
    this.healAmount = config.HEAL_AMOUNT;
    this.speed = config.SPEED;
  }

  /**
   * Use the blood lance ability
   * @returns Whether the ability was used
   */
  use(): boolean {
    if (!this.unlocked || !super.use()) {
      return false;
    }

    // Find direction to target (closest enemy or mouse position)
    const targetInfo = this.findTarget();

    // Create the blood lance projectile
    this.createLance({
      angle: targetInfo.angle, x: this.player.x + this.player.width / 2, y: this.player.y + this.player.height / 2,
      vx: 0,
      vy: 0,
      damage: 0
    });

    return true;
  }

  /**
   * Find the best target for the lance
   * @returns Target information { angle, targetX, targetY }
   */
  findTarget(): { angle: number; targetX: number; targetY: number } {
    let targetX: number, targetY: number;

    // Try to find closest enemy
    const closestEnemy = this.findClosestEnemy();

    if (closestEnemy) {
      targetX = closestEnemy.x + closestEnemy.width / 2;
      targetY = closestEnemy.y + closestEnemy.height / 2;
    } else {
      // Default direction if no enemies (to the right)
      targetX = this.player.x + 100;
      targetY = this.player.y;
    }

    // Calculate angle to target
    const angle = Math.atan2(
      targetY - (this.player.y + this.player.height / 2),
      targetX - (this.player.x + this.player.width / 2)
    );

    return { angle, targetX, targetY };
  }

  /**
   * Find the closest enemy for targeting
   * @returns Closest enemy or null if none found
   */
  findClosestEnemy(): Enemy | null {
    // If we can access game enemies
    if (
      !this.player.game ||
      !this.player.game.enemies ||
      this.player.game.enemies.length === 0
    ) {
      return null;
    }

    const enemies = this.player.game.enemies;
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
      const dx =
        enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2);
      const dy =
        enemy.y + enemy.height / 2 - (this.player.y + this.player.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    }

    return closestEnemy;
  }

  /**
   * Create the blood lance projectile
   * @param options - Options for the projectile
   */
  createLance(options: ProjectileOptions): void {
    
    const {angle, x, y} = options;

    if(!angle || !x || !y) return;


    // Use the game's createProjectile method if available
    if (this.player.game && this.player.game.createProjectile) {
      this.player.game.createProjectile({
        x: x,
        y: y,
        vx: Math.cos(angle) * this.speed,
        vy: Math.sin(angle) * this.speed,
        damage: this.getScaledDamage(),
        isBloodLance: true,
        isAutoAttack: false,
        className: "blood-lance",
        angle: angle,
      });
    } else {
      // Fallback if game method not available
      this.createFallbackLance(angle);
    }
  }

  /**
   * Get damage scaled by ability level
   * @returns Scaled damage
   */
  getScaledDamage(): number {
    return this.damage + (this.level - 1) * 50;
  }

  /**
   * Get pierce count scaled by ability level
   * @returns Scaled pierce count
   */
  getScaledPierce(): number {
    return this.pierce + (this.level - 1);
  }

  /**
   * Get healing amount scaled by ability level
   * @returns Scaled healing
   */
  getScaledHealing(): number {
    return this.healAmount + (this.level - 1) * 5;
  }

  /**
   * Unlock the ability
   * @returns Whether the unlock was successful
   */
  unlock(): boolean {
    const result = super.unlock();
  
    
    return result;
  }
}

export default BloodLance;