import CONFIG from "../config";
import { Game } from "../game/game";

/**
 * Skill Menu
 * Manages the skill upgrade/unlock menu UI
 */
export class SkillMenu {
  game: Game;
  player: any; // Using any temporarily to avoid circular dependencies
  gameContainer: HTMLElement;
  menuOverlay: HTMLElement | null;
  skillPointsDisplay: HTMLElement | null;
  skillGrid: HTMLElement | null;
  isOpen: boolean;

  /**
   * Create a new skill menu
   * @param game - Game instance
   */
  constructor(game: Game) {
    this.game = game;
    this.player = game.player;
    this.gameContainer = game.gameContainer;

    // Get menu elements
    this.menuOverlay = document.getElementById("skill-menu-overlay");
    this.skillPointsDisplay = document.getElementById("available-skill-points");
    this.skillGrid = document.querySelector(".skill-grid");

    // Create menu if it doesn't exist
    this.ensureMenuExists();

    // Initialize event listeners
    this.initializeEventListeners();

    // Initialize skill cards
    this.ensureSkillCardsExist();

    // Track state
    this.isOpen = false;
  }

  /**
   * Ensure the skill menu elements exist
   */
  ensureMenuExists(): void {
    if (!this.menuOverlay) {
      this.menuOverlay = document.createElement("div");
      this.menuOverlay.id = "skill-menu-overlay";
      this.menuOverlay.className = "skill-menu-overlay";

      this.menuOverlay.innerHTML = `
                <div class="skill-menu">
                    <div class="skill-menu-header">
                        <h2>Vampiric Powers</h2>
                        <div class="skill-points-display">
                            Available Skill Points: <span id="available-skill-points">0</span>
                        </div>
                        <button class="skill-menu-close" id="skill-menu-close">Close</button>
                    </div>
                    
                    <div class="skill-grid"></div>
                </div>
            `;

      this.gameContainer.appendChild(this.menuOverlay);
      this.skillPointsDisplay = document.getElementById(
        "available-skill-points"
      );
      this.skillGrid = this.menuOverlay.querySelector(".skill-grid");
    }
  }

  /**
   * Initialize menu event listeners
   */
  initializeEventListeners(): void {
    // Close button
    const closeButton = document.getElementById("skill-menu-close");
    if (closeButton) {
      closeButton.addEventListener("click", () => this.toggle());
    }

    // Skill points indicator
    const skillPointsIndicator = document.getElementById("skill-points");
    if (skillPointsIndicator) {
      skillPointsIndicator.addEventListener("click", () => this.toggle());
    }
  }

  /**
   * Create skill cards if they don't exist
   */
  ensureSkillCardsExist(): void {
    // Check if the skill cards already exist
    if (document.getElementById("auto-attack-card")) {
      return;
    }

    // Create skill cards for base abilities
    this.createSkillCard(
      "auto-attack",
      "Blood Bolt",
      "Automatically fire projectiles at nearby enemies.",
      [
        {
          name: "Damage",
          id: "auto-attack-damage",
          value: this.player.autoAttack.damage.toString(),
        },
        {
          name: "Cooldown",
          id: "auto-attack-cooldown",
          value: this.player.autoAttack.cooldown / 1000 + "s",
        },
        {
          name: "Range",
          id: "auto-attack-range",
          value: this.player.autoAttack.range.toString(),
        },
      ],
      this.player.autoAttack.level
    );

    // Get ability instances for current stats
    const abilities = this.player.abilityManager.abilities;
    const bloodDrain = abilities.get("bloodDrain");
    const batSwarm = abilities.get("batSwarm");
    const shadowDash = abilities.get("shadowDash");
    const bloodLance = abilities.get("bloodLance");
    const nightShield = abilities.get("nightShield");

    // Create ability cards
    this.createSkillCard(
      "blood-drain",
      "Blood Drain",
      bloodDrain.description,
      [
        {
          name: "Damage/sec",
          id: "blood-drain-damage",
          value: bloodDrain.getScaledDamage().toString(),
        },
        {
          name: "Healing/sec",
          id: "blood-drain-healing",
          value: bloodDrain.getScaledHealing().toString(),
        },
        {
          name: "Range",
          id: "blood-drain-range",
          value: bloodDrain.getScaledRange().toString(),
        },
        {
          name: "Duration",
          id: "blood-drain-duration",
          value: bloodDrain.duration / 1000 + "s",
        },
      ],
      bloodDrain.level
    );

    this.createSkillCard(
      "bat-swarm",
      "Bat Swarm",
      batSwarm.description,
      [
        {
          name: "Damage",
          id: "bat-swarm-damage",
          value: batSwarm.getScaledDamage().toString(),
        },
        {
          name: "Bat Count",
          id: "bat-swarm-count",
          value: batSwarm.getScaledCount().toString(),
        },
        {
          name: "Cooldown",
          id: "bat-swarm-cooldown",
          value: batSwarm.cooldown / 1000 + "s",
        },
      ],
      batSwarm.level
    );

    this.createSkillCard(
      "shadow-dash",
      "Shadow Dash",
      shadowDash.description,
      [
        {
          name: "Damage",
          id: "shadow-dash-damage",
          value: shadowDash.getScaledDamage().toString(),
        },
        {
          name: "Distance",
          id: "shadow-dash-distance",
          value: shadowDash.getScaledDistance().toString(),
        },
        {
          name: "Invulnerability",
          id: "shadow-dash-invuln",
          value: shadowDash.getScaledInvulnerabilityTime() / 1000 + "s",
        },
      ],
      shadowDash.level
    );

    // Create skill cards for unlockable abilities
    this.createSkillCard(
      "blood-lance",
      "Blood Lance",
      bloodLance.description,
      [
        {
          name: "Damage",
          id: "blood-lance-damage",
          value: bloodLance.getScaledDamage().toString(),
        },
        {
          name: "Pierce Count",
          id: "blood-lance-pierce",
          value: bloodLance.getScaledPierce().toString(),
        },
        {
          name: "Heal per Hit",
          id: "blood-lance-healing",
          value: bloodLance.getScaledHealing().toString(),
        },
      ],
      bloodLance.level,
      true,
      CONFIG.ABILITIES.BLOOD_LANCE.UNLOCK_LEVEL
    );

    this.createSkillCard(
      "night-shield",
      "Night Shield",
      nightShield.description,
      [
        {
          name: "Shield Amount",
          id: "night-shield-amount",
          value: nightShield.getScaledShieldAmount().toString(),
        },
        {
          name: "Duration",
          id: "night-shield-duration",
          value: nightShield.duration / 1000 + "s",
        },
        {
          name: "Explosion Damage",
          id: "night-shield-explosion",
          value: nightShield.getScaledExplosionDamage().toString(),
        },
      ],
      nightShield.level,
      true,
      CONFIG.ABILITIES.NIGHT_SHIELD.UNLOCK_LEVEL
    );

    // Initialize upgrade buttons
    this.initializeUpgradeButtons();
  }

  /**
   * Create a skill card element
   * @param id - Skill ID
   * @param name - Skill name
   * @param description - Skill description
   * @param effects - Array of effect objects { name, id, value }
   * @param level - Current skill level
   * @param locked - Whether the skill is locked initially
   * @param unlockLevel - Level required to unlock the skill
   */
  createSkillCard(
    id: string,
    name: string,
    description: string,
    effects: Array<{ name: string; id: string; value: string }>,
    level: number = 0,
    locked: boolean = false,
    unlockLevel: number = 0
  ): void {
    if (!this.skillGrid) {
      return;
    }

    // Create card element
    const card = document.createElement("div");
    card.className = "skill-card";
    card.id = `${id}-card`;

    // Add "New!" badge for unlockable abilities
    if (locked) {
      const badge = document.createElement("div");
      badge.className = "new-ability-badge";
      badge.textContent = "New!";
      card.appendChild(badge);
    }

    // Add header
    const header = document.createElement("div");
    header.className = "skill-card-header";
    header.innerHTML = `<h3>${name}</h3>`;
    card.appendChild(header);

    // Add level pips
    const levelContainer = document.createElement("div");
    levelContainer.className = "skill-level";

    for (let i = 0; i < 5; i++) {
      const pip = document.createElement("div");
      pip.className = "level-pip";
      if (i < level) {
        pip.classList.add("filled");
      }
      levelContainer.appendChild(pip);
    }

    card.appendChild(levelContainer);

    // Add description
    const desc = document.createElement("div");
    desc.className = "skill-description";
    desc.textContent = description;
    card.appendChild(desc);

    // Add effects
    const effectsContainer = document.createElement("div");
    effectsContainer.className = "skill-effects";

    effects.forEach((effect) => {
      const effectElement = document.createElement("div");
      effectElement.className = "skill-effect";
      effectElement.innerHTML = `
                <span class="skill-effect-name">${effect.name}:</span>
                <span class="skill-effect-value" id="${effect.id}">${effect.value}</span>
            `;
      effectsContainer.appendChild(effectElement);
    });

    card.appendChild(effectsContainer);

    // Add upgrade button
    const button = document.createElement("button") as HTMLButtonElement;
    button.className = "skill-upgrade-btn";
    button.id = `${id}-upgrade`;
    button.textContent = locked ? "Unlock (3 Points)" : "Upgrade (1 Point)";
    card.appendChild(button);

    // Add locked overlay if needed
    if (locked) {
      const lockedOverlay = document.createElement("div");
      lockedOverlay.className = "skill-locked";
      lockedOverlay.id = `${id}-locked`;
      lockedOverlay.innerHTML = `<div class="skill-locked-message">Unlocks at Level ${unlockLevel}</div>`;
      card.appendChild(lockedOverlay);
    }

    // Add to skill grid
    this.skillGrid.appendChild(card);
  }

  /**
   * Initialize skill upgrade buttons
   */
  initializeUpgradeButtons(): void {
    // Auto Attack upgrade
    const autoAttackButton = document.getElementById(
      "auto-attack-upgrade"
    ) as HTMLButtonElement;
    if (autoAttackButton) {
      autoAttackButton.addEventListener("click", () => {
        this.game.upgradeSkill("autoAttack");
        this.update();
      });
    }

    // Blood Drain upgrade
    const bloodDrainButton = document.getElementById(
      "blood-drain-upgrade"
    ) as HTMLButtonElement;
    if (bloodDrainButton) {
      bloodDrainButton.addEventListener("click", () => {
        this.game.upgradeSkill("bloodDrain");
        this.update();
      });
    }

    // Bat Swarm upgrade
    const batSwarmButton = document.getElementById(
      "bat-swarm-upgrade"
    ) as HTMLButtonElement;
    if (batSwarmButton) {
      batSwarmButton.addEventListener("click", () => {
        this.game.upgradeSkill("batSwarm");
        this.update();
      });
    }

    // Shadow Dash upgrade
    const shadowDashButton = document.getElementById(
      "shadow-dash-upgrade"
    ) as HTMLButtonElement;
    if (shadowDashButton) {
      shadowDashButton.addEventListener("click", () => {
        this.game.upgradeSkill("shadowDash");
        this.update();
      });
    }

    // Blood Lance upgrade/unlock
    const bloodLanceButton = document.getElementById(
      "blood-lance-upgrade"
    ) as HTMLButtonElement;
    if (bloodLanceButton) {
      bloodLanceButton.addEventListener("click", () => {
        this.game.upgradeSkill("bloodLance");
        this.update();
      });
    }

    // Night Shield upgrade/unlock
    const nightShieldButton = document.getElementById(
      "night-shield-upgrade"
    ) as HTMLButtonElement;
    if (nightShieldButton) {
      nightShieldButton.addEventListener("click", () => {
        this.game.upgradeSkill("nightShield");
        this.update();
      });
    }
  }

  /**
   * Update skill card levels and values
   */
  update(): void {
    const player = this.player;

    // Update available skill points
    if (this.skillPointsDisplay) {
      this.skillPointsDisplay.textContent = player.skillPoints.toString();
    }

    // Update Auto Attack card
    this.updateSkillCardPips("auto-attack", player.autoAttack.level);
    const damageElement = document.getElementById("auto-attack-damage");
    if (damageElement) {
      damageElement.textContent = player.autoAttack.damage.toString();
    }

    const cooldownElement = document.getElementById("auto-attack-cooldown");
    if (cooldownElement) {
      cooldownElement.textContent = player.autoAttack.cooldown / 1000 + "s";
    }

    const rangeElement = document.getElementById("auto-attack-range");
    if (rangeElement) {
      rangeElement.textContent = player.autoAttack.range.toString();
    }

    // Update ability cards through ability manager
    const abilities = player.abilityManager.abilities;

    // Blood Drain
    const bloodDrain = abilities.get("bloodDrain");
    if (bloodDrain) {
      this.updateSkillCardPips("blood-drain", bloodDrain.level);

      const drainDamageElement = document.getElementById("blood-drain-damage");
      if (drainDamageElement) {
        drainDamageElement.textContent = bloodDrain
          .getScaledDamage()
          .toString();
      }

      const drainHealingElement = document.getElementById(
        "blood-drain-healing"
      );
      if (drainHealingElement) {
        drainHealingElement.textContent = bloodDrain
          .getScaledHealing()
          .toString();
      }

      const drainRangeElement = document.getElementById("blood-drain-range");
      if (drainRangeElement) {
        drainRangeElement.textContent = bloodDrain.getScaledRange().toString();
      }

      const drainDurationElement = document.getElementById(
        "blood-drain-duration"
      );
      if (drainDurationElement) {
        drainDurationElement.textContent = bloodDrain.duration / 1000 + "s";
      }
    }

    // Bat Swarm
    const batSwarm = abilities.get("batSwarm");
    if (batSwarm) {
      this.updateSkillCardPips("bat-swarm", batSwarm.level);

      const batDamageElement = document.getElementById("bat-swarm-damage");
      if (batDamageElement) {
        batDamageElement.textContent = batSwarm.getScaledDamage().toString();
      }

      const batCountElement = document.getElementById("bat-swarm-count");
      if (batCountElement) {
        batCountElement.textContent = batSwarm.getScaledCount().toString();
      }

      const batCooldownElement = document.getElementById("bat-swarm-cooldown");
      if (batCooldownElement) {
        batCooldownElement.textContent = batSwarm.cooldown / 1000 + "s";
      }
    }

    // Shadow Dash
    const shadowDash = abilities.get("shadowDash");
    if (shadowDash) {
      this.updateSkillCardPips("shadow-dash", shadowDash.level);

      const dashDamageElement = document.getElementById("shadow-dash-damage");
      if (dashDamageElement) {
        dashDamageElement.textContent = shadowDash.getScaledDamage().toString();
      }

      const dashDistanceElement = document.getElementById(
        "shadow-dash-distance"
      );
      if (dashDistanceElement) {
        dashDistanceElement.textContent = shadowDash
          .getScaledDistance()
          .toString();
      }

      const dashInvulnElement = document.getElementById("shadow-dash-invuln");
      if (dashInvulnElement) {
        dashInvulnElement.textContent =
          shadowDash.getScaledInvulnerabilityTime() / 1000 + "s";
      }
    }

    // Blood Lance
    const bloodLance = abilities.get("bloodLance");
    if (bloodLance) {
      this.updateSkillCardPips("blood-lance", bloodLance.level);

      const lanceElement = document.getElementById("blood-lance-damage");
      if (lanceElement) {
        lanceElement.textContent = bloodLance.getScaledDamage().toString();
      }

      const lancePierceElement = document.getElementById("blood-lance-pierce");
      if (lancePierceElement) {
        lancePierceElement.textContent = bloodLance
          .getScaledPierce()
          .toString();
      }

      const lanceHealingElement = document.getElementById(
        "blood-lance-healing"
      );
      if (lanceHealingElement) {
        lanceHealingElement.textContent = bloodLance
          .getScaledHealing()
          .toString();
      }
    }

    // Night Shield
    const nightShield = abilities.get("nightShield");
    if (nightShield) {
      this.updateSkillCardPips("night-shield", nightShield.level);

      const shieldAmountElement = document.getElementById(
        "night-shield-amount"
      );
      if (shieldAmountElement) {
        shieldAmountElement.textContent = nightShield
          .getScaledShieldAmount()
          .toString();
      }

      const shieldDurationElement = document.getElementById(
        "night-shield-duration"
      );
      if (shieldDurationElement) {
        shieldDurationElement.textContent = nightShield.duration / 1000 + "s";
      }

      const shieldExplosionElement = document.getElementById(
        "night-shield-explosion"
      );
      if (shieldExplosionElement) {
        shieldExplosionElement.textContent = nightShield
          .getScaledExplosionDamage()
          .toString();
      }
    }

    // Update button states
    this.updateUpgradeButtonStates();
  }

  /**
   * Update skill card level pips
   * @param skillId - Skill ID
   * @param level - Current skill level
   */
  updateSkillCardPips(skillId: string, level: number): void {
    const card = document.getElementById(skillId + "-card");
    if (!card) {
      return;
    }

    const pips = card.querySelectorAll(".level-pip");
    pips.forEach((pip, i) => {
      if (i < level) {
        pip.classList.add("filled");
      } else {
        pip.classList.remove("filled");
      }
    });
  }

  /**
   * Update the state of upgrade buttons
   */
  updateUpgradeButtonStates(): void {
    const player = this.player;

    // Disable upgrade buttons if no skill points or max level reached
    const autoAttackButton = document.getElementById(
      "auto-attack-upgrade"
    ) as HTMLButtonElement;
    if (autoAttackButton) {
      autoAttackButton.disabled =
        player.skillPoints < 1 ||
        player.autoAttack.level >= player.autoAttack.maxLevel;
    }

    const abilities = player.abilityManager.abilities;

    // Blood Drain
    const bloodDrainButton = document.getElementById(
      "blood-drain-upgrade"
    ) as HTMLButtonElement;
    if (bloodDrainButton) {
      const bloodDrain = abilities.get("bloodDrain");
      bloodDrainButton.disabled =
        player.skillPoints < 1 || bloodDrain.level >= bloodDrain.maxLevel;
    }

    // Bat Swarm
    const batSwarmButton = document.getElementById(
      "bat-swarm-upgrade"
    ) as HTMLButtonElement;
    if (batSwarmButton) {
      const batSwarm = abilities.get("batSwarm");
      batSwarmButton.disabled =
        player.skillPoints < 1 || batSwarm.level >= batSwarm.maxLevel;
    }

    // Shadow Dash
    const shadowDashButton = document.getElementById(
      "shadow-dash-upgrade"
    ) as HTMLButtonElement;
    if (shadowDashButton) {
      const shadowDash = abilities.get("shadowDash");
      shadowDashButton.disabled =
        player.skillPoints < 1 || shadowDash.level >= shadowDash.maxLevel;
    }

    // Update unlockable abilities
    this.updateUnlockableAbilityButtons();
  }

  /**
 * Update unlockable ability buttons
 */
updateUnlockableAbilityButtons(): void {
  const player = this.player;
  const abilities = player.abilityManager.abilities;
  
  // Get player level from level system if available, or fallback to player.level
  let playerLevel = player.level;
  
  // Safety check in case level is undefined for some reason
  if (typeof playerLevel !== 'number' || isNaN(playerLevel)) {
    console.warn('Player level is undefined, defaulting to 1');
    playerLevel = 1;
  }

  // Blood Lance
  const bloodLance = abilities.get("bloodLance");
  const bloodLanceUnlockLevel = CONFIG.ABILITIES.BLOOD_LANCE.UNLOCK_LEVEL;
  const bloodLanceButton = document.getElementById(
    "blood-lance-upgrade"
  ) as HTMLButtonElement;
  const bloodLanceLockedElement =
    document.getElementById("blood-lance-locked");

  if (bloodLanceButton && bloodLanceLockedElement) {
    if (playerLevel < bloodLanceUnlockLevel) {
      // Not high enough level to unlock
      bloodLanceButton.disabled = true;
      bloodLanceLockedElement.style.display = "flex";
    } else if (bloodLance.unlocked) {
      // Already unlocked, check if can upgrade
      bloodLanceButton.disabled =
        player.skillPoints < 1 || bloodLance.level >= bloodLance.maxLevel;
      bloodLanceButton.textContent = "Upgrade (1 Point)";
      bloodLanceLockedElement.style.display = "none";
    } else {
      // Can unlock
      bloodLanceButton.disabled = player.skillPoints < 3;
      bloodLanceButton.textContent = "Unlock (3 Points)";
      bloodLanceLockedElement.style.display = "none";
    }
  }

  // Night Shield
  const nightShield = abilities.get("nightShield");
  const nightShieldUnlockLevel = CONFIG.ABILITIES.NIGHT_SHIELD.UNLOCK_LEVEL;
  const nightShieldButton = document.getElementById(
    "night-shield-upgrade"
  ) as HTMLButtonElement;
  const nightShieldLockedElement = document.getElementById(
    "night-shield-locked"
  );

  if (nightShieldButton && nightShieldLockedElement) {
    if (playerLevel < nightShieldUnlockLevel) {
      // Not high enough level to unlock
      nightShieldButton.disabled = true;
      nightShieldLockedElement.style.display = "flex";
    } else if (nightShield.unlocked) {
      // Already unlocked, check if can upgrade
      nightShieldButton.disabled =
        player.skillPoints < 1 || nightShield.level >= nightShield.maxLevel;
      nightShieldButton.textContent = "Upgrade (1 Point)";
      nightShieldLockedElement.style.display = "none";
    } else {
      // Can unlock
      nightShieldButton.disabled = player.skillPoints < 3;
      nightShieldButton.textContent = "Unlock (3 Points)";
      nightShieldLockedElement.style.display = "none";
    }
  }
  
  // Debug output to help diagnose issues
  console.debug(`Player level: ${playerLevel}, Blood Lance unlock level: ${bloodLanceUnlockLevel}, Night Shield unlock level: ${nightShieldUnlockLevel}`);
}

  /**
   * Toggle the skill menu
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open the skill menu
   */
  open(): void {
    if (this.menuOverlay) {
      this.menuOverlay.style.display = "flex";
      this.player.showingSkillMenu = true;
      this.isOpen = true;

      // Update content
      this.update();

      // Pause game
      if (this.game.gameLoop) {
        this.game.gameLoop.pauseGame(this.game.gameContainer);
      }
    }
  }

  /**
   * Close the skill menu
   */
  close(): void {
    if (this.menuOverlay) {
      this.menuOverlay.style.display = "none";
      this.player.showingSkillMenu = false;
      this.isOpen = false;

      // Resume game
      if (this.game.gameLoop) {
        this.game.gameLoop.resumeGame();
      }
    }
  }

  /**
   * Reset the skill menu to initial state
   */
  reset(): void {
    // Close menu if open
    if (this.isOpen) {
      this.close();
    }
  }
}

export default SkillMenu;
