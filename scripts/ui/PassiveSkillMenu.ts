import { Game } from "../game/game";
import { GameStateManager } from "../game/state-manager";
import { savePassiveSkills, loadPassiveSkills } from "../utils/persistence";

/**
 * Skill Menu
 * Manages the skill upgrade/unlock menu UI
 */
export class PassiveSkillMenu {
  game: Game;
  gameStateManager: GameStateManager;
  player: any; // Using any temporarily to avoid circular dependencies
  gameContainer: HTMLElement;
  menuOverlay: HTMLElement | null;
  killPointsDisplay: HTMLElement | null;
  skillGrid: HTMLElement | null;
  isOpen: boolean;
  levelSystem: any;

  /**
   * Create a new skill menu
   * @param game - Game instance
   */
  constructor(game: Game) {
    this.game = game;
    this.gameStateManager = game.stateManager;
    this.player = game.player;
    this.gameContainer = game.gameContainer;
    this.levelSystem = game.levelSystem;

    // Get menu elements
    this.menuOverlay = document.getElementById("passive-skill-menu-overlay");
    this.killPointsDisplay = document.getElementById("available-skill-points");
    this.skillGrid = document.querySelector(".skill-grid");

    // Create menu if it doesn't exist
    this.ensureMenuExists();
    
    // Initialize event listeners
    this.initializeEventListeners();
    
    // Initialize skill cards
    this.createPassiveSkillCards();

    // Track state
    this.isOpen = false;
    
    // Load saved passive skills
    this.loadSavedSkills();
  }

  /**
   * Ensure the skill menu elements exist
   */
  ensureMenuExists(): void {
    if (!this.menuOverlay) {
      this.menuOverlay = document.createElement("div");
      this.menuOverlay.id = "passive-skill-menu-overlay";
      this.menuOverlay.className = "skill-menu-overlay passive-skill-menu-overlay";

      this.menuOverlay.innerHTML = `
                <div class="skill-menu">
                    <div class="skill-menu-header">
                        <h2>Passive Skills</h2>
                        <div class="skill-points-display">
                            Available Skill Points: <span id="available-skill-points">0</span>
                        </div>
                        <button class="skill-menu-close" id="skill-menu-close">Close</button>
                    </div>
                    
                    <div class="skill-grid"></div>
                </div>
            `;

      this.gameContainer.appendChild(this.menuOverlay);
      this.killPointsDisplay = document.getElementById(
        "available-skill-points"
      );
      this.skillGrid = this.menuOverlay.querySelector(".skill-grid");
      
      // Create the skill cards after the menu is added to the DOM
      this.createPassiveSkillCards();
      
      // Initialize event listeners
      this.setupPassiveSkillEventListeners();
    }
  }

  /**
   * Initialize menu event listeners
   */
  initializeEventListeners(): void {
    // Set up passive skill upgrade buttons
    this.setupPassiveSkillEventListeners();
  }
  
  /**
   * Set up event listeners for all passive skill buttons
   */
  setupPassiveSkillEventListeners(): void {
    // Close button - add this listener directly to the element in our overlay
    const closeButton = this.menuOverlay?.querySelector("#skill-menu-close");
    if (closeButton) {
      // Remove any existing listeners
      closeButton.replaceWith(closeButton.cloneNode(true));
      
      // Add fresh listener
      this.menuOverlay?.querySelector("#skill-menu-close")?.addEventListener("click", () => {
        console.log('Close button clicked');
        this.close();
        
        // Restart the game
        if (this.game) {
          this.game.restart();
        }
      });
    } else {
      console.error('Close button not found in menu');
    }
    
    // Attack damage upgrade
    const damageUpgradeBtn = this.menuOverlay?.querySelector('#increased-attack-damage-upgrade');
    if (damageUpgradeBtn) {
      // Remove any existing listeners
      damageUpgradeBtn.replaceWith(damageUpgradeBtn.cloneNode(true));
      
      // Add fresh listener
      this.menuOverlay?.querySelector('#increased-attack-damage-upgrade')?.addEventListener('click', 
        () => this.upgradePassiveSkill('increased-attack-damage'));
    }
    
    // Attack speed upgrade
    const speedUpgradeBtn = this.menuOverlay?.querySelector('#increased-attack-speed-upgrade');
    if (speedUpgradeBtn) {
      // Remove any existing listeners
      speedUpgradeBtn.replaceWith(speedUpgradeBtn.cloneNode(true));
      
      // Add fresh listener
      this.menuOverlay?.querySelector('#increased-attack-speed-upgrade')?.addEventListener('click', 
        () => this.upgradePassiveSkill('increased-attack-speed'));
    }
    
    // Life steal upgrade
    const lifeStealUpgradeBtn = this.menuOverlay?.querySelector('#life-steal-upgrade');
    if (lifeStealUpgradeBtn) {
      // Remove any existing listeners
      lifeStealUpgradeBtn.replaceWith(lifeStealUpgradeBtn.cloneNode(true));
      
      // Add fresh listener
      this.menuOverlay?.querySelector('#life-steal-upgrade')?.addEventListener('click', 
        () => this.upgradePassiveSkill('life-steal'));
    }
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
    // Make sure the menu exists and has cards
    this.ensureMenuExists();
    
    if (this.menuOverlay) {
      console.log('Opening passive skill menu');
      
      // Make sure the menu is displayed with flex
      this.menuOverlay.style.display = "flex";
      this.player.showingSkillMenu = true;
      this.isOpen = true;

      // Force a check for empty skill grid and create cards if needed
      if (!this.skillGrid || !this.skillGrid.children.length) {
        console.log('Skill grid is empty, recreating cards');
        this.skillGrid = this.menuOverlay.querySelector(".skill-grid");
        // Clear any existing content
        if (this.skillGrid) {
          this.skillGrid.innerHTML = '';
          this.createPassiveSkillCards();
          this.setupPassiveSkillEventListeners();
        } else {
          console.error('Skill grid not found when opening menu');
        }
      } else {
        console.log('Skill grid already has content:', this.skillGrid.children.length, 'children');
      }
      
      // Update content
      this.update();
    } else {
      console.error('Menu overlay not found when trying to open');
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
    
    // Update the player and level system references
    this.player = this.game.player;
    this.levelSystem = this.game.levelSystem;
    
    // Do NOT reset skill values, keep the existing ones
    // Load saved skills to restore upgrades without resetting values first
    console.log('Loading saved skills during reset');
    this.loadSavedSkills();
    
    // Re-initialize event listeners
    this.setupPassiveSkillEventListeners();
    
    // Update UI
    this.update();
  }

  /**
   * Create skill cards if they don't exist
   */
  createPassiveSkillCards(): void {
    // Find the skill grid inside our menu
    if (this.menuOverlay) {
      this.skillGrid = this.menuOverlay.querySelector(".skill-grid");
    }
    
    if (!this.skillGrid) {
      console.error("Could not find skill grid in passive skill menu");
      return;
    }

    // Increased Attack Damage
    this.createSkillCard(
      "increased-attack-damage",
      "Increased Attack Damage",
      "Increases the player's attack damage.",
      [
        {
          name: "Damage",
          id: "increased-attack-damage-value",
          value: "+0%",
        },
      ]
    );

    // Increased Attack Speed
    this.createSkillCard(
      "increased-attack-speed",
      "Increased Attack Speed",
      "Increases the player's attack speed.",
      [
        {
          name: "Attack Speed",
          id: "increased-attack-speed-value",
          value: "+0%",
        },
      ]
    );

    // Life Steal
    this.createSkillCard(
      "life-steal",
      "Life Steal",
      "Grants the player life steal on hit.",
      [
        {
          name: "Life Steal",
          id: "life-steal-value",
          value: "+0%",
        },
      ]
    );
  }

  /**
   * Create a skill card element
   * @param id - Skill ID
   * @param name - Skill name
   * @param description - Skill description
   * @param effects - Array of effect objects { name, id: string; value: string }
   */
  createSkillCard(
    id: string,
    name: string,
    description: string,
    effects: Array<{ name: string; id: string; value: string }>
  ): void {
    if (!this.skillGrid) {
      return;
    }

    // Create card element
    const card = document.createElement("div");
    card.className = "skill-card";
    card.id = `${id}-card`;

    // Add header
    const header = document.createElement("div");
    header.className = "skill-card-header";
    header.innerHTML = `<h3>${name}</h3>`;
    card.appendChild(header);

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
    button.textContent = "Purchase (1 Skill Point)";
    card.appendChild(button);
    
    // Append card to skill grid
    this.skillGrid.appendChild(card);
    
    // Log for debugging
    console.log(`Skill card '${id}' added to grid`, this.skillGrid);
  }

  /**
   * Update skill card levels and values
   */
  update(): void {
    // Update available kill points
    if (this.killPointsDisplay) {
      // Get the kill points from the level system
      const availablePoints = this.levelSystem?.kills || 0;
      
      console.log('Updating kill points display:', availablePoints);
      this.killPointsDisplay.textContent = availablePoints.toString();
    } else {
      console.error('Kill points display element not found');
    }
    
    // Update button states based on available kill points
    this.updateButtonStates();
  }
  
  /**
   * Update button states based on available kill points
   */
  updateButtonStates(): void {
    // Get available points safely
    const availablePoints = this.levelSystem?.kills || 0;
    console.log('Updating button states based on points:', availablePoints);
    
    // Find buttons specifically within our menu
    const buttons = this.menuOverlay?.querySelectorAll('.skill-upgrade-btn');
    
    if (!buttons || buttons.length === 0) {
      console.error('No skill buttons found in the menu');
      return;
    }
    
    console.log('Found', buttons.length, 'skill buttons');
    
    buttons.forEach((button) => {
      const buttonElement = button as HTMLButtonElement;
      if (availablePoints <= 0) {
        buttonElement.disabled = true;
        buttonElement.classList.add('disabled');
      } else {
        buttonElement.disabled = false;
        buttonElement.classList.remove('disabled');
      }
    });
  }
  
  /**
   * Upgrade a passive skill
   * @param skillId - ID of the skill to upgrade
   */
  upgradePassiveSkill(skillId: string): void {
    console.log(`Attempting to upgrade skill: ${skillId}`);
    
    // Check if we have kill points available (safely)
    const availablePoints = this.levelSystem?.kills || 0;
    if (availablePoints <= 0) {
      console.log('No skill points available');
      return;
    }
    
    // Decrease available kill points
    if (this.levelSystem) {
      this.levelSystem.kills = availablePoints - 1;
      console.log(`Reduced skill points from ${availablePoints} to ${this.levelSystem.kills}`);
    }
    
    // Update the skill value based on ID
    let valueElement: HTMLElement | null = null;
    let newValue = 0;
    
    switch (skillId) {
      case 'increased-attack-damage':
        valueElement = document.getElementById('increased-attack-damage-value');
        // Get current value and increase by 10%
        if (valueElement) {
          const currentValueMatch = valueElement.textContent?.match(/\+(\d+)%/);
          const currentValue = currentValueMatch ? parseInt(currentValueMatch[1], 10) : 0;
          newValue = currentValue + 10; // +10% per upgrade
          valueElement.textContent = `+${newValue}%`;
        }
        break;
        
      case 'increased-attack-speed':
        valueElement = document.getElementById('increased-attack-speed-value');
        // Get current value and increase by 10%
        if (valueElement) {
          const currentValueMatch = valueElement.textContent?.match(/\+(\d+)%/);
          const currentValue = currentValueMatch ? parseInt(currentValueMatch[1], 10) : 0;
          newValue = currentValue + 10; // +10% per upgrade
          valueElement.textContent = `+${newValue}%`;
        }
        break;
        
      case 'life-steal':
        valueElement = document.getElementById('life-steal-value');
        // Get current value and increase by 5%
        if (valueElement) {
          const currentValueMatch = valueElement.textContent?.match(/\+(\d+)%/);
          const currentValue = currentValueMatch ? parseInt(currentValueMatch[1], 10) : 0;
          newValue = currentValue + 5; // +5% per upgrade
          valueElement.textContent = `+${newValue}%`;
        }
        break;
    }
    
    // Update UI
    this.update();
    
    // Save skills to persist across sessions
    this.saveSkills();
    
    // Apply the upgrades to the player immediately if game is active
    if (this.game.isRunning()) {
      this.game.applyPurchasedPassiveSkills();
    }
  }
  
  /**
   * Load saved passive skills from storage
   */
  loadSavedSkills(): void {
    const savedSkills = loadPassiveSkills();
    console.log('Loading saved passive skills');
    
    // Apply saved values to the UI elements
    if (savedSkills['increased-attack-damage-value']) {
      const damageElement = document.getElementById('increased-attack-damage-value');
      if (damageElement) {
        damageElement.textContent = savedSkills['increased-attack-damage-value'];
      }
    }
    
    if (savedSkills['increased-attack-speed-value']) {
      const speedElement = document.getElementById('increased-attack-speed-value');
      if (speedElement) {
        speedElement.textContent = savedSkills['increased-attack-speed-value'];
      }
    }
    
    if (savedSkills['life-steal-value']) {
      const lifeStealElement = document.getElementById('life-steal-value');
      if (lifeStealElement) {
        lifeStealElement.textContent = savedSkills['life-steal-value'];
      }
    }
    
    // Apply the loaded skills to the player
    if (this.game) {
      this.game.applyPurchasedPassiveSkills();
    }
  }
  
  /**
   * Save all passive skills to storage
   */
  saveSkills(): void {
    const skillData: Record<string, string> = {};
    
    // Collect all skill values
    const damageElement = document.getElementById('increased-attack-damage-value');
    const speedElement = document.getElementById('increased-attack-speed-value');
    const lifeStealElement = document.getElementById('life-steal-value');
    
    if (damageElement && damageElement.textContent) {
      skillData['increased-attack-damage-value'] = damageElement.textContent;
    }
    
    if (speedElement && speedElement.textContent) {
      skillData['increased-attack-speed-value'] = speedElement.textContent;
    }
    
    if (lifeStealElement && lifeStealElement.textContent) {
      skillData['life-steal-value'] = lifeStealElement.textContent;
    }
    
    // Save to storage
    savePassiveSkills(skillData);
  }
}

export default PassiveSkillMenu;