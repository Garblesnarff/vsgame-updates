import { Game } from "./game/game";
import { GameEvents, EVENTS } from "./utils/event-system";

/**
 * Main entry point for the Vampire Survival Game
 * Initializes the game and starts it
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Vampire Survival Game...");

  // Get the game container
  const gameContainer = document.getElementById("game-container");

  if (!gameContainer) {
    console.error("Game container not found!");
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

  console.log("Vampire Survival Game initialized successfully!");
});

/**
 * Setup event listeners for game events
 */
function setupEventListeners(): void {
  // Game state events
  GameEvents.on(EVENTS.GAME_INIT, () => {
    console.log("Game initialized");
  });

  GameEvents.on(EVENTS.GAME_START, () => {
    console.log("Game started");
  });

  GameEvents.on(EVENTS.GAME_OVER, () => {
    console.log("Game over");
  });

  // Player events
  GameEvents.on(EVENTS.PLAYER_LEVEL_UP, (level: number) => {
    console.log(`Player leveled up to ${level}`);
  });

  // In production, we would remove these console logs
  if (process.env.NODE_ENV === "production") {
    // Disable excessive logging in production
    console.log = () => {};
    console.debug = () => {};
  }
}

// Handle unhandled errors
window.addEventListener("error", function (event) {
  console.error("Unhandled error:", event.error);

  // In a production app, we might want to report this to an error tracking service
  // like Sentry or LogRocket
});
