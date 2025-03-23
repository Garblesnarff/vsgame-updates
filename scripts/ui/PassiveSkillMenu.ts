import { Game } from "../game/game";
import { GameStateManager } from "../game/state-manager";
import { createLogger } from "../utils/logger";
import { IPlayer } from "../types/player-types";
import { ILevelSystem } from "../types/player-types";
import passiveSkillModel from "../models/passive-skill-model";
import PassiveSkillMenuEventManager from "./PassiveSkillMenuEventManager";

// Create a logger for the PassiveSkillMenu class
const logger = createLogger('PassiveSkillMenu');

/**
 * Skill Menu
 * Manages the skill upgrade/unlock menu UI
 */
export class PassiveSkillMenu {
  player: IPlayer;
  gameStateManager: GameStateManager;
  gameContainer: HTMLElement;
  menuOverlay: HTMLElement | null;
  killPointsDisplay: HTMLElement | null;
  skillGrid: HTMLElement | null;
  isOpen: boolean;
  levelSystem: ILevelSystem | {
    kills: number;
  };
  game: Game;
  // Event manager to keep track of all event listeners
  private eventManager: PassiveSkillMenuEventManager;
  // Stored timeout IDs for cleanup
  private timeouts: number[];

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
    // This is type-safe because LevelSystem implements ILevelSystem
    
    // Initialize event manager
    this.eventManager = new PassiveSkillMenuEventManager();
    
    // Initialize timeouts array
    this.timeouts = [];

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
      
      // Get the correct initial points value
      let initialPoints = 0;
      if (this.game && this.game.availableKillPoints !== undefined) {
        initialPoints = this.game.availableKillPoints;
      } else if (this.levelSystem && this.levelSystem.kills !== undefined) {
        initialPoints = this.levelSystem.kills;
      }

      this.menuOverlay.innerHTML = `
                <div class="skill-menu">
                    <div class="skill-menu-header">
                        <h2>Passive Skills</h2>
                        <div class="skill-points-display">
                            Available Skill Points: <span id="available-skill-points">${initialPoints}</span>
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
      // Add listener through event manager
      this.eventManager.addListener(closeButton as HTMLElement, "click", () => {
        logger.debug('Close button clicked');
        this.close();
        
        // Restart the game
        if (this.game) {
          this.game.restart();
        }
      });
    } else {
      logger.error('Close button not found in menu');
    }
    
    // Attack damage upgrade
    const damageUpgradeBtn = this.menuOverlay?.querySelector('#increased-attack-damage-upgrade');
    if (damageUpgradeBtn) {
      this.eventManager.addListener(damageUpgradeBtn as HTMLElement, 'click', 
        () => this.upgradePassiveSkill('increased-attack-damage'));
    }
    
    // Attack speed upgrade
    const speedUpgradeBtn = this.menuOverlay?.querySelector('#increased-attack-speed-upgrade');
    if (speedUpgradeBtn) {
      this.eventManager.addListener(speedUpgradeBtn as HTMLElement, 'click', 
        () => this.upgradePassiveSkill('increased-attack-speed'));
    }
    
    // Life steal upgrade
    const lifeStealUpgradeBtn = this.menuOverlay?.querySelector('#life-steal-upgrade');
    if (lifeStealUpgradeBtn) {
      this.eventManager.addListener(lifeStealUpgradeBtn as HTMLElement, 'click', 
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
      logger.debug('Opening passive skill menu');
      
      // Make sure the menu is displayed with flex
      this.menuOverlay.style.display = "flex";
      this.player.showingSkillMenu = true;
      this.isOpen = true;
      
      // Immediately update the kill points display when opening
      this.update();

      // Force a check for empty skill grid and create cards if needed
      if (!this.skillGrid || !this.skillGrid.children.length) {
        logger.debug('Skill grid is empty, recreating cards');
        this.skillGrid = this.menuOverlay.querySelector(".skill-grid");
        // Clear any existing content
        if (this.skillGrid) {
          this.skillGrid.innerHTML = '';
          this.createPassiveSkillCards();
          this.setupPassiveSkillEventListeners();
        } else {
          logger.error('Skill grid not found when opening menu');
        }
      } else {
        logger.debug(`Skill grid already has content: ${this.skillGrid.children.length} children`);
      }
      
      // Update content
      this.update();
    } else {
      logger.error('Menu overlay not found when trying to open');
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
   * Clean up resources when the menu is destroyed
   */
  destroy(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.timeouts = [];
    
    // Remove all event listeners
    this.eventManager.removeAllListeners();
    
    // Remove menu from DOM if it exists
    if (this.menuOverlay && this.menuOverlay.parentNode) {
      this.menuOverlay.parentNode.removeChild(this.menuOverlay);
      this.menuOverlay = null;
    }
    
    logger.debug('PassiveSkillMenu destroyed and resources cleaned up');
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
    
    logger.debug('Reset called - about to load saved skills');
    
    // Clear all timeouts before creating new ones
    this.timeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.timeouts = [];
    
    // Remove all existing event listeners
    this.eventManager.removeAllListeners();
    
    // Do NOT reset skill values, keep the existing ones
    // Load saved skills to restore upgrades without resetting values first
    this.loadSavedSkills();
    
    // Re-initialize event listeners
    this.setupPassiveSkillEventListeners();
    
    // Update UI
    this.update();
    
    logger.debug('Passive skill menu reset completed');
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
      logger.error("Could not find skill grid in passive skill menu");
      return;
    }
    
    logger.debug('Creating passive skill cards...');
    
    // Get all skills from the model
    const allSkills = passiveSkillModel.getAllSkills();
    logger.debug('Loaded skills from model for card creation:', allSkills);

    // Create a card for each skill from the model
    allSkills.forEach(skill => {
      this.createSkillCard(
        skill.id,
        skill.name,
        skill.description,
        [
          {
            name: skill.id === 'increased-attack-damage' ? 'Damage' : 
                  skill.id === 'increased-attack-speed' ? 'Attack Speed' : 'Life Steal',
            id: `${skill.id}-value`,
            value: skill.displayValue,
          },
        ]
      );
    });
    
    logger.debug('Passive skill cards created');
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
    logger.debug(`Skill card '${id}' added to grid`);
  }

  /**
   * Update skill card levels and values
   */
  update(): void {
    // Update available kill points
    // Always refresh the reference to ensure we have the latest element
    this.killPointsDisplay = document.getElementById('available-skill-points');
    
    if (this.killPointsDisplay) {
      // Get the kill points from the level system or from the game's availableKillPoints
      let availablePoints = 0;
      
      // If we're in game over state, use the game's availableKillPoints
      if (this.game && this.game.availableKillPoints !== undefined) {
        availablePoints = this.game.availableKillPoints;
      } else if (this.levelSystem && this.levelSystem.kills !== undefined) {
        // Otherwise use the levelSystem kills
        availablePoints = this.levelSystem.kills;
      }
      
      logger.debug('Updating kill points display:', availablePoints);
      this.killPointsDisplay.textContent = availablePoints.toString();
    } else {
      logger.error('Kill points display element not found');  
    }
    
    // Update skill values in UI from the model
    this.updateSkillValuesFromModel();
    
    // Update button states based on available kill points
    this.updateButtonStates();
  }

  /**
   * Update UI values from the model to ensure they're in sync
   */
  updateSkillValuesFromModel(): void {
    // Update UI elements with values from the model
    const allSkills = passiveSkillModel.getAllSkills();
    
    allSkills.forEach(skill => {
      const valueElement = document.getElementById(`${skill.id}-value`);
      if (valueElement) {
        valueElement.textContent = skill.displayValue;
      }
    });
  }
  
  /**
   * Update button states based on available kill points
   */
  updateButtonStates(): void {
    // Get available points safely
    const availablePoints = this.levelSystem?.kills || 0;
    logger.debug('Updating button states based on points:', availablePoints);
    
    // Find buttons specifically within our menu
    const buttons = this.menuOverlay?.querySelectorAll('.skill-upgrade-btn');
    
    if (!buttons || buttons.length === 0) {
      logger.error('No skill buttons found in the menu');
      return;
    }
    
    logger.debug(`Found ${buttons.length} skill buttons`);
    
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
    logger.debug(`Attempting to upgrade skill: ${skillId}`);
    
    // Check if we have skill points available
    let availablePoints = 0;
    
    // Determine where to get/update the points from
    if (this.game && this.game.availableKillPoints !== undefined) {
      // We're in game over state
      availablePoints = this.game.availableKillPoints;
      if (availablePoints <= 0) {
        logger.debug('No skill points available');
        return;
      }
      
      // Decrease available kill points in the game
      this.game.availableKillPoints = availablePoints - 1;
      logger.debug(`Reduced skill points from ${availablePoints} to ${this.game.availableKillPoints}`);
      
      // Also update levelSystem if it exists for consistency
      if (this.levelSystem) {
        this.levelSystem.kills = this.game.availableKillPoints;
      }
    } else if (this.levelSystem) {
      // Normal gameplay state
      availablePoints = this.levelSystem.kills || 0;
      if (availablePoints <= 0) {
        logger.debug('No skill points available');
        return;
      }
      
      // Decrease available kill points
      this.levelSystem.kills = availablePoints - 1;
      logger.debug(`Reduced skill points from ${availablePoints} to ${this.levelSystem.kills}`);
    } else {
      logger.debug('No source for skill points found');
      return;
    }
    
    // Upgrade the skill in the model
    passiveSkillModel.upgradeSkill(skillId);
    
    // Update UI
    this.updateSkillValuesFromModel();
    this.update();
    
    // Apply the upgrades to the player immediately if game is active
    if (this.game.isRunning()) {
      this.game.applyPurchasedPassiveSkills();
    }
  }
  
  /**
   * Load saved passive skills from storage
   */
  loadSavedSkills(): void {
    logger.debug('Loading saved passive skills into model and UI');
    
    // Model handles loading from storage itself
    // Just need to make sure UI is up to date
    this.updateSkillValuesFromModel();
    
    // Apply the loaded skills to the player immediately
    if (this.game) {
      // Ensure the UI elements have been properly updated before applying the skills
      // Store timeout ID for later cleanup
      const timeoutId = window.setTimeout(() => {
        logger.debug('About to apply loaded passive skills to player');
        this.game.applyPurchasedPassiveSkills();
        logger.debug('Successfully applied all passive skills from storage');
        
        // Force the player to log current stats
        if (this.game && this.game.logPlayerStats) {
          this.game.logPlayerStats();
        }
        
        // Remove timeout ID from array once executed
        const index = this.timeouts.indexOf(timeoutId);
        if (index !== -1) {
          this.timeouts.splice(index, 1);
        }
      }, 100); // Give the DOM a little time to update
      
      // Track timeout ID
      this.timeouts.push(timeoutId);
    }
  }
}

export default PassiveSkillMenu;