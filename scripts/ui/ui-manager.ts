import { StatsDisplay } from "./stats-display";
import { AbilityBar } from "./ability-bar";
import { SkillMenu } from "./skill-menu";
import { ScreensManager } from "./screens";
import { GameEvents, EVENTS } from "../utils/event-system";
import { Game } from "../game/game";
import { Player } from "../entities/player";

/**
 * UI Manager
 * Coordinates all UI components of the game
 */
export class UIManager {
  game: Game;
  gameContainer: HTMLElement;
  player: Player;
  statsDisplay: StatsDisplay;
  abilityBar: AbilityBar;
  skillMenu: SkillMenu;
  screensManager: ScreensManager;
  autoAttackToggle: HTMLElement | null;

  /**
   * Create a new UI manager
   * @param game - Game instance
   */
  constructor(game: Game) {
    this.game = game;
    this.gameContainer = game.gameContainer;
    this.player = game.player;

    // Initialize UI components
    this.statsDisplay = new StatsDisplay(this.gameContainer, this.player);
    this.abilityBar = new AbilityBar(
      this.gameContainer,
      this.player.abilityManager
    );
    this.skillMenu = new SkillMenu(this.game);
    this.screensManager = new ScreensManager(this.gameContainer);

    // Initialize auto-attack toggle
    this.autoAttackToggle = document.getElementById("auto-attack-toggle");
    this.ensureAutoAttackToggleExists();

    // Initialize event listeners
    this.initializeEventListeners();

    // Subscribe to game events
    this.subscribeToEvents();
  }

  /**
   * Ensure auto-attack toggle element exists
   */
  ensureAutoAttackToggleExists(): void {
    if (!this.autoAttackToggle) {
      this.autoAttackToggle = document.createElement("div");
      this.autoAttackToggle.id = "auto-attack-toggle";
      this.autoAttackToggle.className = "auto-attack-toggle active";
      this.autoAttackToggle.textContent = "Auto-Attack: ON";

      this.gameContainer.appendChild(this.autoAttackToggle);
    }
  }

  /**
   * Initialize UI event listeners
   */
  initializeEventListeners(): void {
    // Auto-attack toggle
    if (this.autoAttackToggle) {
      this.autoAttackToggle.addEventListener("click", () => {
        this.toggleAutoAttack();
      });
    }

    // Skill points display
    const skillPointsElement = document.getElementById("skill-points");
    if (skillPointsElement) {
      skillPointsElement.addEventListener("click", () => {
        this.toggleSkillMenu();
      });
    }
  }

  /**
   * Subscribe to game events
   */
  subscribeToEvents(): void {
    // Game state events
    GameEvents.on(EVENTS.GAME_OVER, () => this.showGameOver());
    GameEvents.on(EVENTS.PLAYER_LEVEL_UP, () => this.showLevelUp());

    // Player events
    GameEvents.on(EVENTS.PLAYER_SKILL_POINT, () =>
      this.updateSkillPointsDisplay()
    );
  }

  /**
   * Toggle auto-attack
   */
  toggleAutoAttack(): void {
    this.player.autoAttack.enabled = !this.player.autoAttack.enabled;
    this.updateAutoAttackToggle();
  }

  /**
   * Update the auto-attack toggle display
   */
  updateAutoAttackToggle(): void {
    if (this.autoAttackToggle) {
      this.autoAttackToggle.textContent = `Auto-Attack: ${
        this.player.autoAttack.enabled ? "ON" : "OFF"
      }`;
      this.autoAttackToggle.classList.toggle(
        "active",
        this.player.autoAttack.enabled
      );
    }
  }

  /**
   * Toggle the skill menu
   */
  toggleSkillMenu(): void {
    this.skillMenu.toggle();
  }

  /**
   * Show the game over screen
   */
  showGameOver(): void {
    const timeString = this.statsDisplay.formatTime(this.game.gameTime);
    // Cast kills to number to ensure type safety
    const killCount = Number(this.player.kills);
    this.screensManager.showGameOver(killCount, timeString);
  }

  /**
   * Show the level up notification
   */
  showLevelUp(): void {
    this.screensManager.showLevelUp();
  }

  /**
   * Update skill points display
   */
  updateSkillPointsDisplay(): void {
    const skillPointsCount = document.getElementById("skill-points-count");
    if (skillPointsCount) {
      skillPointsCount.textContent = this.player.skillPoints.toString();
    }

    // Update available skill points in menu if open
    if (this.player.showingSkillMenu) {
      const availableSkillPoints = document.getElementById(
        "available-skill-points"
      );
      if (availableSkillPoints) {
        availableSkillPoints.textContent = this.player.skillPoints.toString();
      }
    }
  }

  /**
   * Create shield explosion effect
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param range - Explosion range
   */
  createShieldExplosion(x: number, y: number, range: number): void {
    // Create explosion visual effect
    const explosion = document.createElement("div");
    explosion.className = "night-shield";
    explosion.style.width = "0px";
    explosion.style.height = "0px";
    explosion.style.left = x + "px";
    explosion.style.top = y + "px";
    explosion.style.border = "5px solid #8a2be2";
    explosion.style.backgroundColor = "rgba(138, 43, 226, 0.3)";
    explosion.style.transition = "all 0.3s ease-out";

    this.gameContainer.appendChild(explosion);

    // Animate explosion
    setTimeout(() => {
      explosion.style.width = range * 2 + "px";
      explosion.style.height = range * 2 + "px";
      explosion.style.left = x - range + "px";
      explosion.style.top = y - range + "px";
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
   * Add an unlocked ability to the ability bar
   * @param abilityId - ID of the ability
   * @param icon - Icon to display
   * @param key - Hotkey
   */
  addUnlockedAbility(abilityId: string, icon: string, key: string): void {
    this.abilityBar.addUnlockedAbility(abilityId, icon, key);
  }

  /**
   * Update the UI
   */
  update(): void {
    // Update stats display
    this.statsDisplay.update(this.game.gameTime);

    // Update ability bar
    this.abilityBar.update();

    // Update skill menu if open
    if (this.player.showingSkillMenu) {
      this.skillMenu.update();
    }
  }

/**
 * Reset the UI to initial state
 */
reset(): void {
  // Reset all UI components with proper player references
  this.statsDisplay.setPlayer(this.player);
  this.statsDisplay.reset();
  
  // Reset ability bar with new player's abilities
  this.abilityBar = new AbilityBar(this.gameContainer, this.player.abilityManager);
  this.abilityBar.reset();
  
  // Reset skill menu with new player reference
  this.skillMenu.player = this.player;
  this.skillMenu.reset();
  
  // Reset screens
  this.screensManager.hideAll();

  // Reset auto-attack toggle
  this.updateAutoAttackToggle();
  
  // Force immediate update to refresh all UI elements
  this.update();
}
}

export default UIManager;
