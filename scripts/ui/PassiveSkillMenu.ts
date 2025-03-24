import { Game } from "../game/game";
import { GameStateManager } from "../game/state-manager";
import { createLogger } from "../utils/logger";
import { IPlayer } from "../types/player-types";
import { ILevelSystem } from "../types/player-types";
import passiveSkillModel from "../models/passive-skill-model";
import PassiveSkillMenuEventManager from "./PassiveSkillMenuEventManager";
import stateStore from "../game/state-store";
import { GameState } from "../types/game-types";
import { DOM_IDS, CSS_CLASSES, SELECTORS } from "../constants/dom-elements";

// Create a logger for the PassiveSkillMenu class
const logger = createLogger('PassiveSkillMenu');

/**
 * Skill Menu
 * Manages the skill upgrade/unlock menu UI
 */
export class PassiveSkillMenu {
  player: IPlayer; // Not readonly to allow reassignment in Game.reset
  readonly gameStateManager: GameStateManager;
  readonly gameContainer: HTMLElement;
  private menuOverlay: HTMLElement | null = null;
  private killPointsDisplay: HTMLElement | null = null;
  private skillGrid: HTMLElement | null = null;
  isOpen: boolean = false;
  levelSystem: ILevelSystem | { // Not readonly to allow reassignment in Game.reset
    kills: number;
  };
  readonly game: Game;
  // Event manager to keep track of all event listeners
  private readonly eventManager: PassiveSkillMenuEventManager;
  // Stored timeout IDs for cleanup
  private readonly timeouts: number[] = [];
  // Cache of DOM elements by id to avoid repeated querySelector calls
  private domCache: Map<string, HTMLElement> = new Map();

  /**
   * Create a new skill menu
   * @param game - Game instance
   */
  constructor(game: Game) {
    // Initialize readonly properties
    this.game = game;
    this.gameStateManager = game.stateManager;
    this.player = game.player;
    this.gameContainer = game.gameContainer;
    this.levelSystem = game.levelSystem;
    
    // Initialize event manager
    this.eventManager = new PassiveSkillMenuEventManager();
    
    // Try to get existing menu elements
    this.menuOverlay = document.getElementById(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY);
    this.killPointsDisplay = document.getElementById(DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY);
    this.skillGrid = document.querySelector(SELECTORS.class(CSS_CLASSES.SKILL.GRID));

    // Create menu if it doesn't exist
    this.ensureMenuExists();
    
    // Initialize event listeners
    this.initializeEventListeners();
    
    // Initialize skill cards
    this.createPassiveSkillCards();
    
    // Load saved passive skills
    this.loadSavedSkills();
  }

  /**
   * Get the menu overlay element - accessor for Game.ts
   * @returns The menu overlay element or null if not created
   */
  getMenuOverlay(): HTMLElement | null {
    return this.menuOverlay;
  }
  
  /**
   * Reset the menu overlay to force recreation
   */
  resetMenuOverlay(): void {
    this.menuOverlay = null;
  }

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
   * Get initial points value for the skill menu
   */
  private getInitialPoints(): number {
    let initialPoints = 0;
    
    if (typeof this.game.availableKillPoints !== 'undefined') {
      initialPoints = this.game.availableKillPoints;
      // Update state store
      stateStore.game.availableKillPoints.set(initialPoints);
    } else if (typeof this.levelSystem.kills !== 'undefined') {
      initialPoints = this.levelSystem.kills;
      // If using level system kills value, ensure it's in state store
      stateStore.levelSystem.kills.set(initialPoints);
    }
    
    return initialPoints;
  }

  /**
   * Ensure the skill menu elements exist
   */
  ensureMenuExists(): void {
    if (!this.menuOverlay) {
      // Get the correct initial points value
      const initialPoints = this.getInitialPoints();

      // Clear DOM cache when creating a new menu
      this.clearDomCache();
      
      // Important: Use a different ID from the main skill menu
      this.menuOverlay = this.createElement('div', {
        id: DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY,
        className: CSS_CLASSES.PASSIVE_SKILL_MENU.OVERLAY
      }, this.gameContainer);
      
      // Set display style to ensure proper styling
      this.menuOverlay.style.display = 'none';
      
      // Create menu container
      const menuContainer = this.createElement('div', {
        className: CSS_CLASSES.PASSIVE_SKILL_MENU.CONTAINER
      }, this.menuOverlay);
      
      // Create header
      const header = this.createElement('div', {
        className: CSS_CLASSES.PASSIVE_SKILL_MENU.HEADER
      }, menuContainer);
      
      // Add title with appropriate name
      this.createElement('h2', {
        textContent: 'Passive Skills'
      }, header);
      
      // Add points display
      const pointsDisplay = this.createElement('div', {
        className: CSS_CLASSES.PASSIVE_SKILL_MENU.POINTS_DISPLAY
      }, header);
      pointsDisplay.textContent = 'Available Skill Points: ';
      
      this.killPointsDisplay = this.createElement('span', {
        id: DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY,
        textContent: initialPoints.toString()
      }, pointsDisplay);
      
      // Add close button
      this.createElement('button', {
        id: DOM_IDS.PASSIVE_SKILL_MENU.CLOSE_BUTTON,
        className: CSS_CLASSES.PASSIVE_SKILL_MENU.CLOSE_BUTTON,
        textContent: 'Close'
      }, header);
      
      // Add skill grid
      this.skillGrid = this.createElement('div', {
        className: CSS_CLASSES.SKILL.GRID
      }, menuContainer);
      
      // Cache elements for faster access
      this.domCache.set(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY), this.menuOverlay);
      this.domCache.set(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY), this.killPointsDisplay);
      this.domCache.set(SELECTORS.class(CSS_CLASSES.SKILL.GRID), this.skillGrid);
      
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
    const closeButton = this.getElement(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.CLOSE_BUTTON), this.menuOverlay || document);
    if (!closeButton) {
      logger.error('Close button not found in menu');
      return;
    }
    
    this.eventManager.addListener(closeButton, "click", () => {
      logger.debug('Close button clicked');
      this.close();
      
      // Restart the game
      this.game.restart();
    });
    
    // Add event listeners to all upgrade buttons in one loop
    // This avoids repeating similar code for each skill type
    const allSkills = passiveSkillModel.getAllSkills();
    
    allSkills.forEach(skill => {
      const buttonSelector = SELECTORS.skill.upgrade(skill.id);
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
    
    // State is already updated in open/close methods
  }

  /**
   * Open the skill menu
   */
  open(): void {
    // Make sure the menu exists and has cards
    this.ensureMenuExists();
    
    if (!this.menuOverlay) {
      logger.error('Menu overlay not found when trying to open');
      return;
    }
    
    logger.debug('Opening passive skill menu');
    
    // Match the display style of the main skill menu
    this.menuOverlay.style.display = "flex";
    this.menuOverlay.style.justifyContent = "center";
    this.menuOverlay.style.alignItems = "center";
    this.player.showingSkillMenu = true;
    this.isOpen = true;
    
    // Update state store
    stateStore.ui.showingPassiveSkillMenu.set(true);
    
    // Update content
    this.update();

    // Force a check for empty skill grid and create cards if needed
    if (!this.skillGrid || !this.skillGrid.children.length) {
      logger.debug('Skill grid is empty, recreating cards');
      if (this.menuOverlay) {
        this.skillGrid = this.menuOverlay.querySelector(SELECTORS.class(CSS_CLASSES.SKILL.GRID));
        // Clear any existing content
        if (this.skillGrid) {
          this.skillGrid.innerHTML = '';
          this.createPassiveSkillCards();
          this.setupPassiveSkillEventListeners();
        } else {
          logger.error('Skill grid not found when opening menu');
        }
      }
    } else {
      logger.debug(`Skill grid already has content: ${this.skillGrid.children.length} children`);
    }
  }

  /**
   * Close the skill menu
   */
  close(): void {
    if (!this.menuOverlay) {
      return;
    }
    
    this.menuOverlay.style.display = "none";
    this.player.showingSkillMenu = false;
    this.isOpen = false;
    
    // Update state store
    stateStore.ui.showingPassiveSkillMenu.set(false);
  }

  /**
   * Clear all tracked timeouts
   */
  private clearAllTimeouts(): void {
    this.timeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
    this.timeouts.length = 0; // Clear array while maintaining reference
  }
  
  /**
   * Remove menu from DOM if it exists
   */
  private removeMenuFromDOM(): void {
    if (!this.menuOverlay || !this.menuOverlay.parentNode) {
      return;
    }
    
    this.menuOverlay.parentNode.removeChild(this.menuOverlay);
    this.menuOverlay = null;
    
    // Remove from cached elements
    this.domCache.delete(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY));
  }

  /**
   * Clean up resources when the menu is destroyed
   */
  destroy(): void {
    // Clear all timeouts
    this.clearAllTimeouts();
    
    // Remove all event listeners
    this.eventManager.removeAllListeners();
    
    // Remove menu from DOM if it exists - important to check for proper ID
    this.removeMenuFromDOM();
    
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
    
    logger.debug('Reset called - about to load saved skills');
    
    // Clear all timeouts before creating new ones
    this.clearAllTimeouts();
    
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
      this.skillGrid = this.getElement(SELECTORS.class(CSS_CLASSES.SKILL.GRID), this.menuOverlay);
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
      card.className = CSS_CLASSES.SKILL.CARD;
      card.id = DOM_IDS.SKILL.CARD(skill.id);
      
      const effectName = skill.id === 'increased-attack-damage' ? 'Damage' : 
                        skill.id === 'increased-attack-speed' ? 'Attack Speed' : 'Life Steal';
      
      // Enhanced skill descriptions
      const descriptions: Record<string, string> = {
        'increased-attack-damage': 'Increases your damage output against all enemies.',
        'increased-attack-speed': 'Reduces the cooldown between attacks, allowing you to attack more frequently.',
        'life-steal': 'Heals you for a percentage of the damage you deal to enemies.'
      };
      
      // Set inner HTML with the same structure as the skill menu
      card.innerHTML = `
        <div class="${CSS_CLASSES.SKILL.CARD_HEADER}">
          <h3>${skill.name}</h3>
        </div>
        <div class="${CSS_CLASSES.SKILL.DESCRIPTION}">
          ${descriptions[skill.id] || skill.description}
        </div>
        <div class="${CSS_CLASSES.SKILL.EFFECTS}">
          <div class="${CSS_CLASSES.SKILL.EFFECT}">
            <span class="${CSS_CLASSES.SKILL.EFFECT_NAME}">${effectName}:</span>
            <span class="${CSS_CLASSES.SKILL.EFFECT_VALUE}" id="${DOM_IDS.SKILL.VALUE(skill.id)}">${skill.displayValue}</span>
          </div>
        </div>
        <button class="${CSS_CLASSES.SKILL.UPGRADE_BUTTON}" id="${DOM_IDS.SKILL.UPGRADE(skill.id)}">Purchase (1 Point)</button>
      `;

      // Add to fragment
      fragment.appendChild(card);
      
      // Cache elements for faster access later
      const valueElement = card.querySelector(SELECTORS.id(DOM_IDS.SKILL.VALUE(skill.id))) as HTMLElement;
      const upgradeBtn = card.querySelector(SELECTORS.id(DOM_IDS.SKILL.UPGRADE(skill.id))) as HTMLElement;
      
      if (valueElement) {
        this.domCache.set(SELECTORS.id(DOM_IDS.SKILL.VALUE(skill.id)), valueElement);
      }
      
      if (upgradeBtn) {
        this.domCache.set(SELECTORS.id(DOM_IDS.SKILL.UPGRADE(skill.id)), upgradeBtn);
      }
    });
    
    // Append all cards to the grid at once (single DOM operation)
    this.skillGrid.appendChild(fragment);
    
    logger.debug('Passive skill cards created efficiently');
  }

  /**
   * Get available points based on game state
   */
  private getAvailablePoints(): number {
    // If we're in game over state, use the game's availableKillPoints
    if (this.game.getState() === GameState.GAME_OVER) {
      return stateStore.game.availableKillPoints.get();
    }
    // Otherwise use the levelSystem kills
    return stateStore.levelSystem.kills.get();
  }

  /**
   * Update skill card levels and values
   */
  update(): void {
    // Use our cached element getter to find the kill points display
    this.killPointsDisplay = this.getElement(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY));
    
    if (!this.killPointsDisplay) {
      logger.error('Kill points display element not found');  
      return;
    }
    
    // Get the kill points from the state store
    const availablePoints = this.getAvailablePoints();
    
    logger.debug('Updating kill points display:', availablePoints);
    this.killPointsDisplay.textContent = availablePoints.toString();
    
    // Update skill values and button states
    this.updateSkillValuesFromModel();
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
      const valueElement = this.getElement(SELECTORS.id(DOM_IDS.SKILL.VALUE(skill.id)));
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
    // Get available points from state store
    const availablePoints = stateStore.levelSystem.kills.get();
    logger.debug('Updating button states based on points:', availablePoints);
    
    // Instead of querying all buttons every time, use our cached skills
    const allSkills = passiveSkillModel.getAllSkills();
    
    // Set disabled state based on available points
    const disabled = availablePoints <= 0;
    
    // Update each button
    allSkills.forEach(skill => {
      const buttonId = SELECTORS.id(DOM_IDS.SKILL.UPGRADE(skill.id));
      const button = this.getElement(buttonId) as HTMLButtonElement;
      
      if (button) {
        // Only update if state has changed
        if (button.disabled !== disabled) {
          button.disabled = disabled;
          
          if (disabled) {
            button.classList.add(CSS_CLASSES.PASSIVE_SKILL_MENU.DISABLED);
          } else {
            button.classList.remove(CSS_CLASSES.PASSIVE_SKILL_MENU.DISABLED);
          }
        }
      }
    });
  }
  
  /**
   * Decrease skill points based on game state
   * @param availablePoints - Current available points
   */
  private decreaseSkillPoints(availablePoints: number): void {
    const newPoints = availablePoints - 1;
    
    // Determine where to update the points based on game state
    if (this.game.getState() === GameState.GAME_OVER) {
      // Update game available kill points
      this.game.availableKillPoints = newPoints;
      stateStore.game.availableKillPoints.set(newPoints);
      
      // Update level system for consistency
      this.levelSystem.kills = newPoints;
      stateStore.levelSystem.kills.set(newPoints);
    } else {
      // Update level system kills
      stateStore.levelSystem.kills.set(newPoints);
      this.levelSystem.kills = newPoints;
    }
    
    logger.debug(`Reduced skill points from ${availablePoints} to ${newPoints}`);
  }

  /**
   * Upgrade a passive skill
   * @param skillId - ID of the skill to upgrade
   */
  upgradePassiveSkill(skillId: string): void {
    logger.debug(`Attempting to upgrade skill: ${skillId}`);
    
    // Check if we have skill points available from state store
    const availablePoints = this.getAvailablePoints();
    if (availablePoints <= 0) {
      logger.debug('No skill points available');
      return;
    }
    
    // Decrease available points based on game state
    this.decreaseSkillPoints(availablePoints);
    
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
    const timeoutId = window.setTimeout(() => {
      logger.debug('About to apply loaded passive skills to player');
      this.game.applyPurchasedPassiveSkills();
      logger.debug('Successfully applied all passive skills from storage');
      
      // Force the player to log current stats
      if (this.game.logPlayerStats) {
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

export default PassiveSkillMenu;