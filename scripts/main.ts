import { Game } from "./game/game";
import { GameEvents, EVENTS } from "./utils/event-system";
import { createLogger } from "./utils/logger";
import "./utils/init"; // Initialize game settings

// Create a logger for the main module
const logger = createLogger('Main');

/**
 * Main entry point for the Vampire Survival Game
 * Initializes the game and starts it
 */
document.addEventListener("DOMContentLoaded", () => {
  logger.info("Initializing Vampire Survival Game...");

  // Get the game container
  const gameContainer = document.getElementById("game-container");

  if (!gameContainer) {
    logger.error("Game container not found!");
    return;
  }

  // Create and initialize the game
  const game = new Game(gameContainer);

  // Subscribe to game events
  setupEventListeners();

  // Start the game
  game.start();

  // Expose game instance to window for debugging (only in development)
  if (process.env.NODE_ENV !== "production") {
    (window as any).vampireGame = game;
  }

  logger.info("Vampire Survival Game initialized successfully!");
});

/**
 * Setup event listeners for game events
 */
function setupEventListeners(): void {
  // Game state events
  GameEvents.on(EVENTS.GAME_INIT, () => {
    logger.info("Game initialized");
  });

  GameEvents.on(EVENTS.GAME_START, () => {
    logger.info("Game started");
  });

  GameEvents.on(EVENTS.GAME_OVER, () => {
    logger.info("Game over");
  });

  // Player events
  GameEvents.on(EVENTS.PLAYER_LEVEL_UP, (level: number) => {
    logger.info(`Player leveled up to ${level}`);
  });

  // No need to manually disable logs - our logger utility handles this based on log level
}

// Handle unhandled errors
window.addEventListener("error", function (event) {
  logger.error("Unhandled error:", event.error);

  // In a production app, we might want to report this to an error tracking service
  // like Sentry or LogRocket
});
