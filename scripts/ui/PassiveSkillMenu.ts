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

    // Get menu elements - use the passive skill menu ID
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
   * Cache of DOM elements by id to avoid repeated querySelector calls
   */
  private domCache: Map<string, HTMLElement> = new Map();

  /**
   * Get cached DOM element or find it once and cache
   * @param selector - CSS selector for element
   * @param parent - Optional parent element to search within (defaults to document)
   * @returns DOM element or null if not found
   */
  private getElement(selector: string, parent: Document | HTMLElement = document): HTMLElement | null {
    // Create a unique key for the selector and parent
    const key = parent === document ? selector : `${parent instanceof HTMLElement ? parent.id || 'unknown' : 'document'}-${selector}`;
    
    // Return cached element if we have it
    if (this.domCache.has(key)) {
      return this.domCache.get(key) || null;
    }
    
    // Find the element
    let element: HTMLElement | null = null;
    if (selector.startsWith('#')) {
      element = parent.querySelector(selector) as HTMLElement;
    } else {
      element = parent.querySelector(selector) as HTMLElement;
    }
    
    // Cache the element if found
    if (element) {
      this.domCache.set(key, element);
    }
    
    return element;
  }

  /**
   * Clear the DOM element cache
   */
  private clearDomCache(): void {
    this.domCache.clear();
  }

  /**
   * Create a DOM element with attributes and append to parent
   * @param tagName - HTML tag name
   * @param attributes - Optional map of attributes to set
   * @param parent - Optional parent to append to
   * @returns The created element
   */
  private createElement<T extends HTMLElement>(tagName: string, attributes: Record<string, string> = {}, parent?: HTMLElement): T {
    const element = document.createElement(tagName) as T;
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'textContent') {
        element.textContent = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // Append to parent if provided
    if (parent) {
      parent.appendChild(element);
    }
    
    return element;
  }

  /**
   * Ensure the skill menu elements exist
   */
  ensureMenuExists(): void {
    if (!this.menuOverlay) {
      // Get the correct initial points value
      let initialPoints = 0;
      if (this.game && this.game.availableKillPoints !== undefined) {
        initialPoints = this.game.availableKillPoints;
      } else if (this.levelSystem && this.levelSystem.kills !== undefined) {
        initialPoints = this.levelSystem.kills;
      }

      // Clear DOM cache when creating a new menu
      this.clearDomCache();
      
      // Important: Use a different ID from the main skill menu
      this.menuOverlay = this.createElement('div', {
        id: 'passive-skill-menu-overlay',
        className: 'skill-menu-overlay'
      }, this.gameContainer);
      
      // Set display style to ensure proper styling
      this.menuOverlay.style.display = 'none';
      
      // Create menu container
      const menuContainer = this.createElement('div', {
        className: 'skill-menu'
      }, this.menuOverlay);
      
      // Create header
      const header = this.createElement('div', {
        className: 'skill-menu-header'
      }, menuContainer);
      
      // Add title with appropriate name
      this.createElement('h2', {
        textContent: 'Passive Skills'
      }, header);
      
      // Add points display
      const pointsDisplay = this.createElement('div', {
        className: 'skill-points-display'
      }, header);
      pointsDisplay.textContent = 'Available Skill Points: ';
      
      this.killPointsDisplay = this.createElement('span', {
        id: 'available-skill-points',
        textContent: initialPoints.toString()
      }, pointsDisplay);
      
      // Add close button
      this.createElement('button', {
        id: 'skill-menu-close',
        className: 'skill-menu-close',
        textContent: 'Close'
      }, header);
      
      // Add skill grid
      this.skillGrid = this.createElement('div', {
        className: 'skill-grid'
      }, menuContainer);
      
      // Cache elements for faster access
      this.domCache.set('#passive-skill-menu-overlay', this.menuOverlay);
      this.domCache.set('#available-skill-points', this.killPointsDisplay);
      this.domCache.set('.skill-grid', this.skillGrid);
      
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
    // First remove all existing listeners to avoid duplicates
    this.eventManager.removeAllListeners();
    
    // Close button - use our cached element getter
    const closeButton = this.getElement('#skill-menu-close', this.menuOverlay || document);
    if (closeButton) {
      this.eventManager.addListener(closeButton, "click", () => {
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
    
    // Add event listeners to all upgrade buttons in one loop
    // This avoids repeating similar code for each skill type
    const allSkills = passiveSkillModel.getAllSkills();
    
    allSkills.forEach(skill => {
      const buttonSelector = `#${skill.id}-upgrade`;
      const upgradeBtn = this.getElement(buttonSelector, this.menuOverlay || document);
      
      if (upgradeBtn) {
        this.eventManager.addListener(upgradeBtn, 'click', 
          () => this.upgradePassiveSkill(skill.id));
        logger.debug(`Added click listener to ${skill.id} upgrade button`);
      } else {
        logger.warn(`Button ${buttonSelector} not found for skill ${skill.id}`);
      }
    });
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
      
      // Match the display style of the main skill menu
      this.menuOverlay.style.display = "flex";
      this.menuOverlay.style.justifyContent = "center";
      this.menuOverlay.style.alignItems = "center";
      this.player.showingSkillMenu = true;
      this.isOpen = true;
      
      // Update content
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
    
    // Remove menu from DOM if it exists - important to check for proper ID
    if (this.menuOverlay && this.menuOverlay.parentNode) {
      this.menuOverlay.parentNode.removeChild(this.menuOverlay);
      this.menuOverlay = null;
      
      // Remove from cached elements
      this.domCache.delete('#passive-skill-menu-overlay');
    }
    
    // Clear DOM cache
    this.clearDomCache();
    
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
    // Get the skill grid using our cached element getter
    if (!this.skillGrid && this.menuOverlay) {
      this.skillGrid = this.getElement('.skill-grid', this.menuOverlay);
    }
    
    if (!this.skillGrid) {
      logger.error("Could not find skill grid in passive skill menu");
      return;
    }
    
    // Clear existing cards to avoid duplication
    if (this.skillGrid.children.length > 0) {
      logger.debug(`Clearing ${this.skillGrid.children.length} existing skill cards`);
      this.skillGrid.innerHTML = '';
      // Also clear any cached elements related to cards
      this.clearDomCache();
    }
    
    logger.debug('Creating passive skill cards...');
    
    // Get all skills from the model
    const allSkills = passiveSkillModel.getAllSkills();
    logger.debug(`Creating ${allSkills.length} skill cards from model`);

    // Create a document fragment to batch DOM operations
    const fragment = document.createDocumentFragment();

    // Create a card for each skill from the model
    allSkills.forEach(skill => {
      // Create card HTML directly to match the structure
      const card = document.createElement('div');
      card.className = 'skill-card';
      card.id = `${skill.id}-card`;
      
      const effectName = skill.id === 'increased-attack-damage' ? 'Damage' : 
                        skill.id === 'increased-attack-speed' ? 'Attack Speed' : 'Life Steal';
      
      // Enhanced skill descriptions
      const descriptions = {
        'increased-attack-damage': 'Increases your damage output against all enemies.',
        'increased-attack-speed': 'Reduces the cooldown between attacks, allowing you to attack more frequently.',
        'life-steal': 'Heals you for a percentage of the damage you deal to enemies.'
      };
      
      // Set inner HTML with the same structure as the skill menu
      card.innerHTML = `
        <div class="skill-card-header">
          <h3>${skill.name}</h3>
        </div>
        <div class="skill-description">
          ${descriptions[skill.id as keyof typeof descriptions] || skill.description}
        </div>
        <div class="skill-effects">
          <div class="skill-effect">
            <span class="skill-effect-name">${effectName}:</span>
            <span class="skill-effect-value" id="${skill.id}-value">${skill.displayValue}</span>
          </div>
        </div>
        <button class="skill-upgrade-btn" id="${skill.id}-upgrade">Purchase (1 Point)</button>
      `;

      // Add to fragment
      fragment.appendChild(card);
      
      // Cache elements for faster access later
      this.domCache.set(`#${skill.id}-value`, card.querySelector(`#${skill.id}-value`) as HTMLElement);
      this.domCache.set(`#${skill.id}-upgrade`, card.querySelector(`#${skill.id}-upgrade`) as HTMLElement);
    });
    
    // Append all cards to the grid at once (single DOM operation)
    this.skillGrid.appendChild(fragment);
    
    logger.debug('Passive skill cards created efficiently');
  }

  /**
   * Update skill card levels and values
   */
  update(): void {
    // Use our cached element getter to find the kill points display
    this.killPointsDisplay = this.getElement('#available-skill-points');
    
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
      // Use cached element or get it once
      const valueElement = this.getElement(`#${skill.id}-value`);
      if (valueElement) {
        // Only update if the value has changed
        if (valueElement.textContent !== skill.displayValue) {
          valueElement.textContent = skill.displayValue;
        }
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
    
    // Instead of querying all buttons every time, use our cached skills
    const allSkills = passiveSkillModel.getAllSkills();
    
    // Set disabled state based on available points
    const disabled = availablePoints <= 0;
    
    // Update each button
    allSkills.forEach(skill => {
      const buttonId = `#${skill.id}-upgrade`;
      const button = this.getElement(buttonId) as HTMLButtonElement;
      
      if (button) {
        // Only update if state has changed
        if (button.disabled !== disabled) {
          button.disabled = disabled;
          
          if (disabled) {
            button.classList.add('disabled');
          } else {
            button.classList.remove('disabled');
          }
        }
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