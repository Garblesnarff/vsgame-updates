import { GameEvents, EVENTS } from "../utils/event-system";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";

/**
 * Configuration options for creating abilities
 */
export interface AbilityConfig {
  name: string;
  description: string;
  key: string;
  cooldown: number;
  energyCost: number;
  level?: number;
  maxLevel?: number;
  unlocked?: boolean;
}

/**
 * Base class for all player abilities
 *
 * This serves as the foundation for all abilities in the game,
 * providing common functionality like cooldowns, energy costs,
 * UI representation, and leveling.
 */
export class Ability {
  /**
   * The player that owns this ability
   */
  player: Player;

  /**
   * The name of the ability
   */
  name: string;

  /**
   * Description of what the ability does
   */
  description: string;

  /**
   * Keyboard key associated with the ability
   */
  key: string;

  /**
   * Cooldown time in milliseconds
   */
  cooldown: number;

  /**
   * Energy cost to use the ability
   */
  energyCost: number;

  /**
   * Timestamp of when the ability was last used
   */
  lastUsed: number;

  /**
   * Current ability level
   */
  level: number;

  /**
   * Maximum level for this ability
   */
  maxLevel: number;

  /**
   * Whether the ability is unlocked
   */
  unlocked: boolean;

  /**
   * Whether the ability is currently active
   */
  active: boolean;

  /**
   * Visual effect element for the ability
   */
  visualEffect: HTMLElement | null;

  /**
   * UI element for the ability
   */
  element: HTMLElement | null;

  /**
   * UI element for the cooldown display
   */
  cooldownElement: HTMLElement | null;

  /**
   * Additional properties that may be defined in subclasses
   */
  [key: string]: any;

  /**
   * Create a new ability
   *
   * @param player - The player that owns this ability
   * @param config - Configuration for the ability
   */
  constructor(player: Player, config: AbilityConfig) {
    this.player = player;
    this.name = config.name || "Unknown Ability";
    this.description = config.description || "";
    this.key = config.key || "";
    this.cooldown = config.cooldown || 5000;
    this.energyCost = config.energyCost || 0;
    this.lastUsed = 0;
    this.level = config.level || 1;
    this.maxLevel = config.maxLevel || 5;
    this.unlocked = config.unlocked !== undefined ? config.unlocked : true;
    this.active = false;
    this.visualEffect = null;
    this.element = null;
    this.cooldownElement = null;
  }

  /**
   * Check if the ability can be used
   *
   * Verifies that:
   * 1. The ability is unlocked
   * 2. The cooldown has expired
   * 3. The player has enough energy
   * 4. The ability isn't already active
   *
   * @returns Whether the ability can be used
   */
  canUse(): boolean {
    if (!this.unlocked) {
      return false;
    }

    const now = Date.now();
    const onCooldown = now - this.lastUsed < this.cooldown;
    const hasEnergy = this.player.stats.getEnergy() >= this.energyCost;

    return !onCooldown && hasEnergy && !this.active;
  }

  /**
   * Use the ability
   *
   * This is the base implementation that:
   * 1. Checks if the ability can be used
   * 2. Consumes energy
   * 3. Sets the last used timestamp
   * 4. Emits the ability use event
   *
   * Subclasses should override this to implement specific ability behaviors
   * but should call super.use() first to handle these common operations.
   *
   * @returns Whether the ability was successfully used
   */
  use(): boolean {
    if (!this.canUse()) {
      return false;
    }

    // Consume energy
    this.player.stats.setEnergy(this.player.stats.getEnergy() - this.energyCost);
    this.lastUsed = Date.now();

    // Emit ability use event
    GameEvents.emit(EVENTS.ABILITY_USE, this.name, this.player);

    return true;
  }

  /**
   * Deactivate the ability
   * This is a base implementation that subclasses should override
   */
  deactivate(): void {
    this.active = false;
    
    // Clean up visual effect
    if (this.visualEffect && this.visualEffect.parentNode) {
      this.visualEffect.parentNode.removeChild(this.visualEffect);
      this.visualEffect = null;
    }
  }

  /**
   * Update the ability's cooldown display in the UI
   */
  updateCooldownDisplay(): void {
    if (!this.cooldownElement) {
      return;
    }

    const now = Date.now();
    const remaining = Math.max(
      0,
      this.lastUsed + this.cooldown - now
    );
    const percentage = (remaining / this.cooldown) * 100;

    this.cooldownElement.style.height = percentage + "%";
  }

  /**
   * Initialize the UI element for this ability
   *
   * Creates and configures the DOM elements needed to display this ability
   * in the UI, including the icon, key binding, level indicator, and cooldown display.
   *
   * @param containerId - ID of the container element
   * @param abilityId - ID to use for this ability's element
   * @param icon - Icon to display (emoji or character)
   */
  initializeUI(containerId: string, abilityId: string, icon: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    // Create ability element
    this.element = document.createElement("div");
    this.element.className = "ability";
    this.element.id = abilityId;

    // Add inner content
    this.element.innerHTML = `
            <div class="ability-icon">${icon}</div>
            <div class="ability-key">${this.key}</div>
            <div class="ability-level">Lv${this.level}</div>
            <div class="ability-cooldown"></div>
        `;

    // Store reference to cooldown element
    this.cooldownElement = this.element.querySelector(".ability-cooldown");

    // Add event listener
    this.element.addEventListener("click", () => this.use());

    // Add to container
    container.appendChild(this.element);
  }

  /**
   * Update the ability's level display in the UI
   */
  updateLevelDisplay(): void {
    if (!this.element) {
      return;
    }

    const levelElement = this.element.querySelector(".ability-level");
    if (levelElement) {
      levelElement.textContent = `Lv${this.level}`;
    }
  }

  /**
   * Clean up ability resources
   */
  destroy(): void {
    // Ensure the ability is deactivated first
    if (this.active) {
      this.deactivate();
    }
    
    // Clean up visual effects
    if (this.visualEffect && this.visualEffect.parentNode) {
      this.visualEffect.parentNode.removeChild(this.visualEffect);
      this.visualEffect = null;
    }
    
    // Note: We don't remove the element from the UI here
    // as that's handled by the UI management system
  }

  /**
   * Check if the ability is currently active
   *
   * @returns Whether the ability is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Upgrade the ability to the next level
   *
   * Increases the ability's level and updates the UI to reflect the change.
   * Abilities typically gain improved effects at higher levels.
   *
   * @returns Whether the upgrade was successful
   */
  upgrade(): boolean {
    if (this.level >= this.maxLevel) {
      return false;
    }

    this.level++;
    this.updateLevelDisplay();

    // Emit upgrade event
    GameEvents.emit(EVENTS.ABILITY_UPGRADE, this.name, this.player);

    return true;
  }

  /**
   * Unlock the ability
   *
   * Makes the ability available for use. Some abilities start locked
   * and must be unlocked through progression.
   *
   * @returns Whether the unlock was successful
   */
  unlock(): boolean {
    if (this.unlocked) {
      return false;
    }

    this.unlocked = true;
    this.level = 1;

    // Emit unlock event
    GameEvents.emit(EVENTS.ABILITY_UNLOCK, this.name, this.player);

    return true;
  }

  /**
   * Update the ability state
   *
   * This method is meant to be overridden by subclasses to implement
   * the specific update logic for each ability type.
   *
   * @param _deltaTime - Time in milliseconds since the last update
   * @param _enemies - List of enemies in the game (optional)
   */
  update(_deltaTime: number, _enemies: Enemy[] = []): void {
    // Base implementation does nothing
    // Override in subclasses to implement ability-specific behavior
  }
}

export default Ability;
