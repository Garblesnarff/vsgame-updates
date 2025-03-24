import { Player } from "../entities/player";
import { LevelSystem } from "../game/level-system";

/**
 * Type augmentation for Player to make TypeScript happy
 */
interface ExtendedPlayer extends Omit<Player, 'levelSystem'> {
  levelSystem?: any;
  setLevelSystem: (levelSystem: LevelSystem) => void; // Make this required, not optional
}

/**
 * Stats Display
 * Manages the display of player statistics (health, energy, level, kills, etc.)
 */
export class StatsDisplay {
  gameContainer: HTMLElement;
  player: ExtendedPlayer;
  healthBar: HTMLElement | null;
  energyBar: HTMLElement | null;
  timeElement: HTMLElement | null;
  levelElement: HTMLElement | null;
  killsElement: HTMLElement | null;
  skillPointsCount: HTMLElement | null;

  /**
   * Create a new stats display
   * @param gameContainer - DOM element containing the game
   * @param player - Player object whose stats to display
   */
  constructor(gameContainer: HTMLElement, player: Player) {
    this.gameContainer = gameContainer;
    this.player = player as ExtendedPlayer;

    // Get DOM elements
    this.healthBar = document.getElementById("health-bar");
    this.energyBar = document.getElementById("energy-bar");
    this.timeElement = document.getElementById("time");
    this.levelElement = document.getElementById("level");
    this.killsElement = document.getElementById("kills");
    this.skillPointsCount = document.getElementById("skill-points-count");

    // Create elements if they don't exist
    this.ensureElementsExist();
  }

  /**
   * Ensure all required UI elements exist
   */
  ensureElementsExist(): void {
    // Import templates and DOM constants
    const { Templates } = require('../utils/dom-templates');
    const { DOM_IDS } = require('../constants/dom-elements');
    
    // Check for stats container
    if (!document.getElementById(DOM_IDS.UI.STATS_CONTAINER)) {
      // Create container using template
      const statsContainer = Templates.statsContainer();
      this.gameContainer.appendChild(statsContainer);

      // Update references
      this.healthBar = document.getElementById(DOM_IDS.PLAYER.HEALTH_BAR);
      this.energyBar = document.getElementById(DOM_IDS.PLAYER.ENERGY_BAR);
      this.timeElement = document.getElementById(DOM_IDS.UI.TIME);
      this.levelElement = document.getElementById(DOM_IDS.UI.LEVEL);
      this.killsElement = document.getElementById(DOM_IDS.UI.KILLS);
    }

    // Check for skill points display
    if (!document.getElementById(DOM_IDS.UI.SKILL_POINTS)) {
      // Create skill points using template
      const skillPointsElement = Templates.skillPoints();
      this.gameContainer.appendChild(skillPointsElement);
      this.skillPointsCount = document.getElementById(DOM_IDS.UI.SKILL_POINTS_COUNT);
    }
  }

  /**
   * Update the display with current player stats
   * @param gameTime - Current game time in ms
   */
  update(gameTime: number): void {
    // Skip if elements aren't available
    if (!this.healthBar || !this.energyBar) {
      return;
    }

    // Update health and energy bars - Add explicit conversion to percentage
    const healthPercent = Math.max(0, Math.min(100, (this.player.stats.getHealth() / this.player.stats.getMaxHealth()) * 100));
    const energyPercent = Math.max(0, Math.min(100, (this.player.stats.getEnergy() / this.player.stats.getMaxEnergy()) * 100));
    
    this.healthBar.style.width = healthPercent + "%";
    this.energyBar.style.width = energyPercent + "%";

    // Update time display
    if (this.timeElement) {
      this.timeElement.textContent = this.formatTime(gameTime);
    }

    // Update level and kills
    if (this.levelElement) {
      let level = 1;
      //check if levelSystem exists
      if (this.player.levelSystem)
      {
        level = this.player.levelSystem.getLevel();
      }
      this.levelElement.textContent = level.toString();
    }

    if (this.killsElement) {
      let kills = 0;
      let killsToNextLevel = 10;

      //check if levelSystem exists
      if (this.player.levelSystem)
      {
        kills = this.player.levelSystem.getKills();
        killsToNextLevel = this.player.levelSystem.getKillsToNextLevel();
      }
      
      
      
      
      this.killsElement.textContent = kills + " / " + killsToNextLevel;
    }

    // Update skill points display
    if (this.skillPointsCount) {
      this.skillPointsCount.textContent = this.player.skillPoints.toString();
    }
  }

  /**
   * Format time in mm:ss format
   * @param ms - Time in milliseconds
   * @returns Formatted time string
   */
  formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  /**
   * Reset the stats display
   */
  reset(): void {
    // Reset to initial values with explicit percentages
    if (this.healthBar) {
      this.healthBar.style.width = "100%";
    }

    if (this.energyBar) {
      this.energyBar.style.width = "100%";
    }

    if (this.timeElement) {
      this.timeElement.textContent = "0:00";
    }

    if (this.levelElement) {
      this.levelElement.textContent = "1";
    }

    if (this.killsElement) {
      this.killsElement.textContent = "0 / 10";
    }

    if (this.skillPointsCount) {
      this.skillPointsCount.textContent = "0";
    }

    // Force update with latest player stats
    this.update(0);
  }

  /**
   * Set a new player reference
   * @param player - New player object
   */
  setPlayer(player: Player): void {
    this.player = player as ExtendedPlayer;
    this.update(0); // Force immediate update with new player
  }
}

export default StatsDisplay;
