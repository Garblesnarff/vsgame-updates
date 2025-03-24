/**
 * Screens Manager
 * Handles different game screens (game over, level up, etc.)
 */
export class ScreensManager {
  gameContainer: HTMLElement;
  gameOverScreen: HTMLElement | null;
  levelUpScreen: HTMLElement | null;
  finalScoreElement: HTMLElement | null;

  /**
   * Create a new screens manager
   * @param gameContainer - DOM element for the game container
   */
  constructor(gameContainer: HTMLElement) {
    this.gameContainer = gameContainer;

    // Get screen elements
    this.gameOverScreen = document.getElementById("game-over");
    this.levelUpScreen = document.getElementById("level-up");
    this.finalScoreElement = document.getElementById("final-score");

    // Create screens if they don't exist
    this.ensureScreensExist();
  }

  /**
   * Ensure all screen elements exist
   */
  ensureScreensExist(): void {
    // Import templates
    const { Templates } = require('../utils/dom-templates');
    const { DOM_IDS } = require('../constants/dom-elements');
    
    // Create game over screen if it doesn't exist
    if (!this.gameOverScreen) {
    this.gameOverScreen = Templates.gameOverScreen({ kills: 0, time: '0:00' });
    if (this.gameOverScreen) {
      this.gameContainer.appendChild(this.gameOverScreen);
        this.finalScoreElement = document.getElementById(DOM_IDS.UI.FINAL_SCORE);
      }
    }

    // Create level up screen if it doesn't exist
    if (!this.levelUpScreen) {
      this.levelUpScreen = Templates.levelUpScreen();
      if (this.levelUpScreen) {
        this.gameContainer.appendChild(this.levelUpScreen);
      }
    }
  }

  /**
   * Show the game over screen
   * @param kills - Number of kills
   * @param time - Time played
   */
  showGameOver(kills: number, time: string): void {
    if (this.finalScoreElement) {
      this.finalScoreElement.textContent = `Kills: ${kills} | Time: ${time}`;
    }

    if (this.gameOverScreen) {
      this.gameOverScreen.style.display = "block";
    }
  }

  /**
   * Hide the game over screen
   */
  hideGameOver(): void {
    if (this.gameOverScreen) {
      this.gameOverScreen.style.display = "none";
    }
  }

  /**
   * Show the level up screen
   * @param duration - Duration to show the screen in ms (default: 3000)
   */
  showLevelUp(duration: number = 3000): void {
    if (this.levelUpScreen) {
      this.levelUpScreen.style.display = "block";

      // Hide after duration
      setTimeout(() => {
        this.hideLevelUp();
      }, duration);
    }
  }

  /**
   * Hide the level up screen
   */
  hideLevelUp(): void {
    if (this.levelUpScreen) {
      this.levelUpScreen.style.display = "none";
    }
  }

  /**
   * Create a custom message screen
   * @param message - Message to display
   * @param className - CSS class for styling
   * @param duration - Duration to show in ms (0 for permanent)
   * @returns The created screen element
   */
  showMessage(
    message: string,
    className: string = "message",
    duration: number = 3000
  ): HTMLElement {
    // Import templates
    const { Templates } = require('../utils/dom-templates');
    
    // Create message using template
    const messageScreen = Templates.message({
      message,
      className
    });
    
    this.gameContainer.appendChild(messageScreen);

    if (duration > 0) {
      setTimeout(() => {
        if (messageScreen.parentNode) {
          messageScreen.parentNode.removeChild(messageScreen);
        }
      }, duration);
    }

    return messageScreen;
  }

  /**
   * Hide all screens
   */
  hideAll(): void {
    this.hideGameOver();
    this.hideLevelUp();
  }
}

export default ScreensManager;
