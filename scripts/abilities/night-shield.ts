import { Ability } from "./ability-base";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";


/**
 * Night Shield ability - Create a shield that absorbs damage and explodes
 */
export class NightShield extends Ability {
  // Ability-specific properties
  shieldAmount: number;
  duration: number;
  explosionDamage: number;
  explosionRange: number;
  currentShield: number;
  shieldElement: HTMLElement | null;
  shieldHealthBar: HTMLElement | null;
  shieldIndicator: HTMLElement | null;
  activeSince: number;
  timerHandle: number | null;

  /**
   * Create a new Night Shield ability
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: any) {
    super(player, {
      name: "Night Shield",
      description:
        "Surround yourself with a shield of darkness that absorbs damage and explodes when it expires or is broken",
      key: "5",
      cooldown: config.COOLDOWN,
      energyCost: config.ENERGY_COST,
      level: 0, // Starts at 0 because it's locked initially
      maxLevel: config.MAX_LEVEL,
      unlocked: config.UNLOCKED,
    });

    this.shieldAmount = config.SHIELD_AMOUNT;
    this.duration = config.DURATION;
    this.explosionDamage = config.EXPLOSION_DAMAGE;
    this.explosionRange = config.EXPLOSION_RANGE;
    this.currentShield = 0;
    this.shieldElement = null;
    this.shieldHealthBar = null;
    this.shieldIndicator = null;
    this.activeSince = 0;
    this.timerHandle = null;
  }

  /**
   * Use the night shield ability
   * @returns Whether the ability was used
   */
  use(): boolean {
    if (!this.unlocked || this.active || !super.use()) {
      return false;
    }

    this.active = true;
    this.activeSince = Date.now();

    // Set shield amount based on level
    this.currentShield = this.getScaledShieldAmount();

    // Create shield visual element
    this.createShieldVisual();

    // Set shield expiration timer
    this.timerHandle = window.setTimeout(() => {
      this.explodeShield();
    }, this.duration);

    return true;
  }

  /**
   * Create shield visual effect
   */
  createShieldVisual(): void {
    // Create shield element
    this.shieldElement = document.createElement("div");
    this.shieldElement.className = "night-shield";

    const shieldSize = 80;
    this.shieldElement.style.width = shieldSize + "px";
    this.shieldElement.style.height = shieldSize + "px";
    this.shieldElement.style.left =
      this.player.x + this.player.width / 2 - shieldSize / 2 + "px";
    this.shieldElement.style.top =
      this.player.y + this.player.height / 2 - shieldSize / 2 + "px";

    // Add shield health bar
    this.shieldHealthBar = document.createElement("div");
    this.shieldHealthBar.className = "shield-health-bar";

    this.shieldIndicator = document.createElement("div");
    this.shieldIndicator.className = "shield-health-fill";

    this.shieldHealthBar.appendChild(this.shieldIndicator);
    this.shieldElement.appendChild(this.shieldHealthBar);

    // Add to game container
    this.player.gameContainer.appendChild(this.shieldElement);
  }

  /**
   * Update the shield position and health display
   * @param _deltaTime - Time since last update
   * @param _enemies - Array of enemies (not used directly but required by base class)
   */
  update(_deltaTime: number, _enemies: Enemy[] = []): void {
    if (!this.active || !this.shieldElement) {
      return;
    }

    // Update shield position to follow player
    const shieldSize = 80;
    this.shieldElement.style.left =
      this.player.x + this.player.width / 2 - shieldSize / 2 + "px";
    this.shieldElement.style.top =
      this.player.y + this.player.height / 2 - shieldSize / 2 + "px";

    // Update shield health bar
    this.updateShieldHealthBar();

    // Check if shield duration has expired
    if (Date.now() - this.activeSince >= this.duration) {
      this.explodeShield();
    }
  }

  /**
   * Update the shield health bar display
   */
  updateShieldHealthBar(): void {
    if (!this.shieldIndicator) {
      return;
    }

    const maxShield = this.getScaledShieldAmount();
    const shieldPercent = Math.max(0, (this.currentShield / maxShield) * 100);
    this.shieldIndicator.style.width = shieldPercent + "%";
  }

  /**
   * Absorb damage with the shield
   * @param amount - Damage amount to absorb
   * @returns Whether damage was absorbed
   */
  absorbDamage(amount: number): boolean {
    if (!this.active || this.currentShield <= 0) {
      return false;
    }

    // Absorb damage with shield
    this.currentShield -= amount;

    // Update shield health bar
    this.updateShieldHealthBar();

    // Create particle effect to visualize shield absorbing damage
    this.createShieldAbsorptionEffect();

    // Check if shield is depleted
    if (this.currentShield <= 0) {
      this.explodeShield();
    }

    return true;
  }

  /**
   * Create visual effect for shield absorbing damage
   */
  createShieldAbsorptionEffect(): void {
    // Use particle system if available
    if (this.player.game && this.player.game.particleSystem) {
      this.player.game.particleSystem.createShieldParticles(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        5
      );
    }
  }

  /**
   * Make the shield explode
   */
  explodeShield(): void {
    if (!this.active) {
      return;
    }

    // Cancel timer if it's still active
    if (this.timerHandle !== null) {
      window.clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    // Damage all enemies within explosion range
    this.damageEnemiesInRange();

    // Create explosion visual effect
    this.createExplosionEffect();

    // Deactivate shield
    this.deactivateShield();
  }

  /**
   * Damage all enemies within the explosion range
   */
  damageEnemiesInRange(): void {
    // If we can access game enemies
    if (!this.player.game || !this.player.game.enemies) {
      return;
    }

    const enemies = this.player.game.enemies;
    const explosionDamage = this.getScaledExplosionDamage();
    const range = this.explosionRange;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      // Check if enemy is within explosion range
      const dx =
        enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2);
      const dy =
        enemy.y + enemy.height / 2 - (this.player.y + this.player.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= range) {
        // Create explosion particles at enemy position
        if (this.player.game.particleSystem) {
          this.player.game.particleSystem.createBloodParticles(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            10
          );
        }

        // Damage enemy
        if (enemy.takeDamage(explosionDamage)) {
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
   * Create explosion visual effect
   */
  createExplosionEffect(): void {
    // Use UI manager if available
    if (this.player.game && this.player.game.uiManager) {
      this.player.game.uiManager.createShieldExplosion(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.explosionRange
      );
    } else {
      // Fallback explosion effect
      this.createFallbackExplosionEffect();
    }
  }

  /**
   * Create fallback explosion effect if UI manager isn't available
   */
  createFallbackExplosionEffect(): void {
    const explosion = document.createElement("div");
    explosion.className = "night-shield";
    explosion.style.width = "0px";
    explosion.style.height = "0px";
    explosion.style.left = this.player.x + this.player.width / 2 + "px";
    explosion.style.top = this.player.y + this.player.height / 2 + "px";
    explosion.style.border = "5px solid #8a2be2";
    explosion.style.backgroundColor = "rgba(138, 43, 226, 0.3)";
    explosion.style.transition = "all 0.3s ease-out";

    this.player.gameContainer.appendChild(explosion);

    // Animate explosion
    setTimeout(() => {
      explosion.style.width = this.explosionRange * 2 + "px";
      explosion.style.height = this.explosionRange * 2 + "px";
      explosion.style.left =
        this.player.x + this.player.width / 2 - this.explosionRange + "px";
      explosion.style.top =
        this.player.y + this.player.height / 2 - this.explosionRange + "px";
      explosion.style.opacity = "0.7";
    }, 10);

    setTimeout(() => {
      explosion.style.opacity = "0";
      setTimeout(() => {
        if (explosion.parentNode) {
          explosion.parentNode.removeChild(explosion);
        }
      }, 300);
    }, 300);
  }

  /**
   * Deactivate the shield
   */
  deactivateShield(): void {
    this.active = false;

    // Remove shield element
    if (this.shieldElement && this.shieldElement.parentNode) {
      this.shieldElement.parentNode.removeChild(this.shieldElement);
    }

    this.shieldElement = null;
    this.shieldHealthBar = null;
    this.shieldIndicator = null;
  }

  /**
   * Get shield amount scaled by ability level
   * @returns Scaled shield amount
   */
  getScaledShieldAmount(): number {
    return this.shieldAmount + (this.level - 1) * 40;
  }

  /**
   * Get explosion damage scaled by ability level
   * @returns Scaled explosion damage
   */
  getScaledExplosionDamage(): number {
    return this.explosionDamage + (this.level - 1) * 30;
  }

  /**
   * Clean up ability resources
   */
  destroy(): void {
    super.destroy();

    // Cancel timer if active
    if (this.timerHandle !== null) {
      window.clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    // Remove shield element
    this.deactivateShield();
  }

  /**
   * Unlock the ability
   * @returns Whether the unlock was successful
   */
  unlock(): boolean {
    const result = super.unlock();
    
    // Removed UI initialization to fix duplicate buttons issue
    // The UI will now be initialized by AbilityManager only
    
    return result;
  }
}

export default NightShield;