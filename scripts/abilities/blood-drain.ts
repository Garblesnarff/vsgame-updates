import { Ability } from "./ability-base";
import { Particle } from "../entities/particle";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";

import GameEvents, { EVENTS } from "../utils/event-system";

/**
 * Blood Drain ability - Drains health from nearby enemies
 */
export class BloodDrain extends Ability {
  // Ability-specific properties
  range: number;
  damage: number;
  healAmount: number;
  duration: number;
  activeSince: number;
  bloodNovas: Particle[]; // Track created blood novas

  /**
   * Create a new Blood Drain ability
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: any) {
    super(player, {
      name: "Blood Drain",
      description:
        "Drain blood from nearby enemies, damaging them and healing yourself",
      key: "1",
      cooldown: config.COOLDOWN,
      energyCost: config.ENERGY_COST,
      level: 1,
      maxLevel: config.MAX_LEVEL,
    });

    this.range = config.RANGE;
    this.damage = config.DAMAGE;
    this.healAmount = config.HEAL_AMOUNT;
    this.duration = config.DURATION;
    this.activeSince = 0;
    this.bloodNovas = [];
  }

  /**
   * Toggle the blood drain ability
   * @returns Whether the ability state was changed
   */
  use(): boolean {
    // If already active, deactivate
    if (this.active) {
      this.deactivate();
      return true;
    }

    // Otherwise, try to activate
    if (!super.use()) {
      return false;
    }

    this.activate();
    return true;
  }

  /**
   * Activate the blood drain ability
   */
  activate(): void {
    this.active = true;
    this.activeSince = Date.now();
    this.bloodNovas = []; // Clear any previously tracked blood novas

    // Create visual effect for the blood drain area
    this.visualEffect = document.createElement("div");
    this.visualEffect.className = "blood-drain-aoe";

    const range = this.getScaledRange();
    this.visualEffect.style.width = range * 2 + "px";
    this.visualEffect.style.height = range * 2 + "px";
    this.visualEffect.style.left =
      this.player.x + this.player.width / 2 - range + "px";
    this.visualEffect.style.top =
      this.player.y + this.player.height / 2 - range + "px";

    this.player.gameContainer.appendChild(this.visualEffect);

    // Deactivate after duration
    setTimeout(() => {
      if (this.active) {
        this.deactivate();
      }
    }, this.duration);
  }

  /**
   * Deactivate the blood drain ability
   */
  deactivate(): void {
    this.active = false;

    // Remove visual effect
    if (this.visualEffect && this.visualEffect.parentNode) {
      this.visualEffect.parentNode.removeChild(this.visualEffect);
      this.visualEffect = null;
    }

    // Clean up any blood novas we created
    for (const nova of this.bloodNovas) {
      if (nova.element && nova.element.parentNode) {
        nova.element.parentNode.removeChild(nova.element);
      }
    }
    this.bloodNovas = [];

    // Clean up any blood nova elements that were missed
    const bloodNovaElements = document.querySelectorAll('.blood-nova');
    bloodNovaElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
  }

  /**
   * Clean up ability resources
   */
  destroy(): void {
    // Ensure we deactivate first (which handles blood nova cleanup)
    this.deactivate();
    super.destroy();
  }

  /**
   * Update the blood drain effect
   * @param deltaTime - Time since last update in ms
   * @param enemies - Array of enemy objects
   */
  update(deltaTime: number, enemies: Enemy[] = []): void {
    if (!this.active) {
      return;
    }

    // Update visual effect position to follow player
    if (this.visualEffect) {
      const range = this.getScaledRange();
      this.visualEffect.style.left =
        this.player.x + this.player.width / 2 - range + "px";
      this.visualEffect.style.top =
        this.player.y + this.player.height / 2 - range + "px";
    }

    // Create pulsing effect around player (occasionally)
    if (Math.random() < 0.1) {
      // Use particle system if available through player.game
      if (this.player.game && this.player.game.particleSystem) {
        const nova = this.player.game.particleSystem.createBloodNova(
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2
        );
        this.bloodNovas.push(nova);
      } else {
        // Fallback to direct creation
        const nova = Particle.createBloodNova(
          this.player.gameContainer,
          this.player.x + this.player.width / 2,
          this.player.y + this.player.height / 2
        );
        this.bloodNovas.push(nova);
      }
    }

    // Process enemies within range
    if (enemies.length > 0) {
      this.processEnemies(enemies, deltaTime);
    }

    // Check if the duration has expired
    if (Date.now() - this.activeSince >= this.duration) {
      this.deactivate();
    }
  }

  /**
   * Process enemies within range of the blood drain
   * @param enemies - Array of enemy objects
   * @param deltaTime - Time since last update in ms
   */
  processEnemies(enemies: Enemy[], deltaTime: number): void {
    const range = this.getScaledRange();
    const damage = this.getScaledDamage() * (deltaTime / 1000);
    const healing = this.getScaledHealing() * (deltaTime / 1000);

    let healingApplied = false;
    let particlesCreated = 0;
    const maxParticlesPerFrame = 5; // Limit particles per frame

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      
      const dx =
        enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2);
      const dy =
        enemy.y + enemy.height / 2 - (this.player.y + this.player.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range) {
        // Enemy is in range of blood drain
        const enemyDied = enemy.takeDamage(damage, (x: number, y: number, count: number) => {
          // Limit particle creation
          if (particlesCreated < maxParticlesPerFrame) {
            if (this.player.game && this.player.game.particleSystem) {
              this.player.game.particleSystem.createBloodParticles(x, y, Math.min(count, 2));
            } else {
              Particle.createBloodParticles(this.player.gameContainer, x, y, Math.min(count, 2));
            }
            particlesCreated++;
          }
        });

        // Track that we applied healing
        healingApplied = true;

        // Handle enemy death
        if (enemyDied) {
          if (enemy.element && enemy.element.parentNode) {
            enemy.element.parentNode.removeChild(enemy.element);
          }
          enemies.splice(i, 1);

          // FIXED: Update kill counter correctly
          // Check if player has a level system that we can access
          if (this.player.levelSystem && 
              typeof (this.player.levelSystem as any).addKill === 'function') {
            // Update the level system's kill counter, which will also update the player's kill count
            (this.player.levelSystem as any).addKill();
          } else {
            // Fallback to player's addKill if level system isn't available
            this.player.addKill();
          }
          
          // Emit enemy death event to ensure other systems update properly
          if (this.player.game) {
            GameEvents.emit(EVENTS.ENEMY_DEATH, enemy);
          }
        } else {
          // Create blood particles flowing from enemy to player (occasionally)
          // Reduced probability from 0.2 to 0.05 to limit particles
          if (Math.random() < 0.05 && particlesCreated < maxParticlesPerFrame) {
            if (this.player.game && this.player.game.particleSystem) {
              this.player.game.particleSystem.createBloodParticles(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                1
              );
            } else {
              Particle.createBloodParticles(
                this.player.gameContainer,
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                1
              );
            }
            particlesCreated++;
          }
        }
      }
    }

    // Only heal player if at least one enemy was drained
    if (healingApplied) {
      this.player.heal(healing);
    }
  }

  /**
   * Get damage scaled by ability level
   * @returns Scaled damage
   */
  getScaledDamage(): number {
    return this.damage + (this.level - 1) * 20;
  }

  /**
   * Get healing scaled by ability level
   * @returns Scaled healing
   */
  getScaledHealing(): number {
    return this.healAmount + (this.level - 1) * 10;
  }

  /**
   * Get range scaled by ability level
   * @returns Scaled range
   */
  getScaledRange(): number {
    return this.range + (this.level - 1) * 20;
  }

  /**
   * Upgrade the ability
   * @returns Whether the upgrade was successful
   */
  upgrade(): boolean {
    if (!super.upgrade()) {
      return false;
    }

    // Update visual effect size if active
    if (this.active && this.visualEffect) {
      const range = this.getScaledRange();
      this.visualEffect.style.width = range * 2 + "px";
      this.visualEffect.style.height = range * 2 + "px";
      this.visualEffect.style.left =
        this.player.x + this.player.width / 2 - range + "px";
      this.visualEffect.style.top =
        this.player.y + this.player.height / 2 - range + "px";
    }

    return true;
  }
}

export default BloodDrain;