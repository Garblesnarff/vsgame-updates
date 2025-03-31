import CONFIG from "../config";
import { Ability } from "./ability-base";
import { BloodDrain } from "./blood-drain";
import { BatSwarm } from "./bat-swarm";
import { ShadowDash } from "./shadow-dash";
import { BloodLance } from "./blood-lance";
import { NightShield } from "./night-shield";
import { Player } from "../entities/player";
import { Enemy } from "../entities/enemies/base-enemy";
import passiveSkillModel from "../models/passive-skill-model"; // Import passive skill model


/**
 * Manages all player abilities
 */
export class AbilityManager {
  player: Player;
  abilities: Map<string, Ability>;
  private baseCooldowns: Map<string, number> = new Map(); // Store base cooldowns for CDR calculation

  /**
   * Create a new ability manager
   * @param player - The player that owns these abilities
   */
  constructor(player: Player) {
    this.player = player;
    this.abilities = new Map<string, Ability>();

    // Initialize abilities
    this.initializeAbilities();
    // Store base cooldowns after initialization
    this.storeBaseCooldowns();
  }

  /**
   * Initialize all abilities
   */
  initializeAbilities(): void {
    // Create base abilities
    this.abilities.set(
      "bloodDrain",
      new BloodDrain(this.player, CONFIG.ABILITIES.BLOOD_DRAIN)
    );
    this.abilities.set(
      "batSwarm",
      new BatSwarm(this.player, CONFIG.ABILITIES.BAT_SWARM)
    );
    this.abilities.set(
      "shadowDash",
      new ShadowDash(this.player, CONFIG.ABILITIES.SHADOW_DASH)
    );

    // Create locked abilities
    this.abilities.set(
      "bloodLance",
      new BloodLance(this.player, CONFIG.ABILITIES.BLOOD_LANCE)
    );
    this.abilities.set(
      "nightShield",
      new NightShield(this.player, CONFIG.ABILITIES.NIGHT_SHIELD)
    );
  }

  /**
   * Stores the initial cooldown for each ability.
   * This is needed to correctly apply percentage-based cooldown reduction.
   */
  private storeBaseCooldowns(): void {
    this.baseCooldowns.clear(); // Clear existing before storing
    for (const [name, ability] of this.abilities.entries()) {
      // Assuming 'cooldown' property exists on Ability base or is accessed via config
      // Need to check Ability base class or specific ability implementations if this fails
      const baseCooldown = ability.cooldown; // Or fetch from CONFIG if stored there
      if (typeof baseCooldown === 'number') {
        this.baseCooldowns.set(name, baseCooldown);
      } else {
        console.warn(`Ability ${name} does not have a numeric cooldown property to store. Attempting fallback via CONFIG.`);
        // Fallback: Explicitly check known ability names from CONFIG
        let configCooldown: number | undefined;
        switch (name) {
          case 'bloodDrain': configCooldown = CONFIG.ABILITIES.BLOOD_DRAIN.COOLDOWN; break;
          case 'batSwarm': configCooldown = CONFIG.ABILITIES.BAT_SWARM.COOLDOWN; break;
          case 'shadowDash': configCooldown = CONFIG.ABILITIES.SHADOW_DASH.COOLDOWN; break;
          case 'bloodLance': configCooldown = CONFIG.ABILITIES.BLOOD_LANCE.COOLDOWN; break;
          case 'nightShield': configCooldown = CONFIG.ABILITIES.NIGHT_SHIELD.COOLDOWN; break;
        }

        if (typeof configCooldown === 'number') {
           this.baseCooldowns.set(name, configCooldown);
           // Optionally update the ability instance's cooldown if it was missing/incorrect
           // ability.cooldown = configCooldown;
           console.debug(`Stored base cooldown for ${name} from CONFIG: ${configCooldown}`);
        } else {
           console.error(`Could not determine base cooldown for ability: ${name} from instance or CONFIG.`);
        }
      }
    }
    console.debug('Stored base cooldowns for abilities:', this.baseCooldowns);
  }

  /**
   * Initialize ability UI elements
   */
  initializeUI(): void {
    // Initialize base abilities UI
    this.abilities
      .get("bloodDrain")
      ?.initializeUI("abilities", "blood-drain", "🩸");
    this.abilities
      .get("batSwarm")
      ?.initializeUI("abilities", "bat-swarm", "🦇");
    this.abilities
      .get("shadowDash")
      ?.initializeUI("abilities", "shadow-dash", "💨");

    // Locked abilities UI won't be initialized until they're unlocked
  }

  /**
   * Get an ability by name
   * @param name - Name of the ability
   * @returns The ability object or undefined if not found
   */
  getAbility(name: string): Ability | undefined {
    return this.abilities.get(name);
  }

/**
 * Update all abilities
 * @param deltaTime - Time since last update
 * @param enemies - Array of enemies in the game
 */
update(deltaTime: number, enemies: Enemy[] = []): void {
  // Update cooldown displays
  for (const ability of this.abilities.values()) {
    ability.updateCooldownDisplay();
  }

  // Update active abilities
  for (const ability of this.abilities.values()) {
    if (ability.isActive()) {
      ability.update(deltaTime, enemies);
    }
  }
}

  /**
 * Check if abilities can be unlocked based on player level
 */
checkUnlockableAbilities(): void {
  const bloodLance = this.abilities.get("bloodLance");
  const nightShield = this.abilities.get("nightShield");

  // Get player level, making sure to use the correct property
  const playerLevel = this.player.level;
  
  // Debug for visibility
  console.debug(`Checking unlockable abilities. Player level: ${playerLevel}`);

  // Blood Lance unlocks at level 3
  if (
    playerLevel >= CONFIG.ABILITIES.BLOOD_LANCE.UNLOCK_LEVEL &&
    bloodLance &&
    !bloodLance.unlocked
  ) {
    const lockedElement = document.getElementById("blood-lance-locked");
    if (lockedElement) {
      lockedElement.style.display = "none";
    }
    console.debug('Blood Lance can be unlocked now');
  }

  // Night Shield unlocks at level 5
  if (
    playerLevel >= CONFIG.ABILITIES.NIGHT_SHIELD.UNLOCK_LEVEL &&
    nightShield &&
    !nightShield.unlocked
  ) {
    const lockedElement = document.getElementById("night-shield-locked");
    if (lockedElement) {
      lockedElement.style.display = "none";
    }
    console.debug('Night Shield can be unlocked now');
  }
}

/**
   * Unlock an ability
   * @param abilityName - Name of the ability to unlock
   * @returns Whether the unlock was successful
   */
unlockAbility(abilityName: string): boolean {
  const ability = this.abilities.get(abilityName);
  if (!ability || ability.unlocked) {
    return false;
  }

  // Unlock the ability
  ability.unlock();

  // Initialize UI for newly unlocked ability
  if (abilityName === "bloodLance") {
    ability.initializeUI("abilities", "blood-lance", "🗡️");
  } else if (abilityName === "nightShield") {
    ability.initializeUI("abilities", "night-shield", "🛡️");
  }

  return true;
}

  /**
   * Upgrade an ability
   * @param abilityName - Name of the ability to upgrade
   * @returns Whether the upgrade was successful
   */
  upgradeAbility(abilityName: string): boolean {
    const ability = this.abilities.get(abilityName);
    if (!ability || !ability.unlocked || ability.level >= ability.maxLevel) {
      return false;
    }

    const success = ability.upgrade();
    // Re-apply CDR after upgrade in case cooldown changed
    if (success) {
       const cdrBonus = passiveSkillModel.getSkillValue('cooldown-reduction');
       const cdrMultiplier = 1 - (cdrBonus / 100);
       this.applyCooldownReduction(cdrMultiplier);
    }
    return success;
  }

  /**
   * Applies a cooldown reduction multiplier to all abilities.
   * @param cdrMultiplier - The multiplier (e.g., 0.9 for 10% CDR).
   */
  applyCooldownReduction(cdrMultiplier: number): void {
    console.debug(`Applying CDR multiplier: ${cdrMultiplier} to abilities.`);
    for (const [name, ability] of this.abilities.entries()) {
      const baseCooldown = this.baseCooldowns.get(name);
      if (typeof baseCooldown === 'number') {
        // Apply multiplier, ensuring a minimum cooldown (e.g., 50ms or 0)
        ability.cooldown = Math.max(50, baseCooldown * cdrMultiplier);
        // console.debug(`Ability ${name} cooldown updated: ${baseCooldown} * ${cdrMultiplier} = ${ability.cooldown}`);
      } else {
        console.warn(`Cannot apply CDR to ability ${name}: Base cooldown not stored.`);
      }
    }
  }

  /**
   * Reset the cooldown for all abilities.
   */
  resetAllCooldowns(): void {
    for (const ability of this.abilities.values()) {
      // Setting lastUsed to 0 makes the ability available immediately
      ability.lastUsed = 0;
      // Also update the UI display
      ability.updateCooldownDisplay();
    }
  }

  /**
   * Reset all abilities to initial state
   */
  reset(): void {
    // Deactivate all active abilities first
    for (const ability of this.abilities.values()) {
      if (ability.isActive()) {
        if (typeof ability.deactivate === 'function') {
          ability.deactivate();
        } else {
          ability.active = false;
        }
      }
    }

    // Clean up ability resources
    for (const ability of this.abilities.values()) {
      ability.destroy();
    }

    // Clear the current abilities map and base cooldowns, then reinitialize
    this.abilities.clear();
    this.baseCooldowns.clear();
    this.initializeAbilities();
    this.storeBaseCooldowns(); // Re-store base cooldowns after reinitialization
  }
}

export default AbilityManager;
