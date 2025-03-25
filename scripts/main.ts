import { Game } from "./game/game";
import { GameEvents, EVENTS } from "./utils/event-system";
import { createLogger, LogLevel, setLogLevel } from "./utils/logger";
import { registerGlobalErrorHandler, ErrorSeverity, ErrorCategory, tryCatch } from "./utils/error-handler";
import { isStorageAvailable } from "./utils/persistence";
import "./utils/init"; // Initialize game settings

// Create a logger for the main module
const logger = createLogger('Main');

// Set appropriate log level based on environment
if (process.env.NODE_ENV === "production") {
  setLogLevel(LogLevel.ERROR); // Only show errors in production
} else {
  setLogLevel(LogLevel.DEBUG); // Show all logs in development
}

// Register global error handler for uncaught errors
registerGlobalErrorHandler((error: Error) => {
  // This callback runs after the error is logged
  // Show error UI to the user if in production
  if (process.env.NODE_ENV === "production") {
    showErrorUI(error.message);
  }
});

/**
 * Show a user-friendly error message
 * @param message - Error message to display
 */
function showErrorUI(message: string): void {
  const errorContainer = document.createElement("div");
  errorContainer.className = "error-container";
  errorContainer.innerHTML = `
    <div class="error-message">
      <h2>Oops! Something went wrong</h2>
      <p>${message}</p>
      <p>Please try refreshing the page. If the problem persists, clear your browser cache.</p>
      <button id="error-refresh">Refresh Page</button>
    </div>
  `;
  
  document.body.appendChild(errorContainer);
  
  // Add refresh button handler
  const refreshButton = document.getElementById("error-refresh");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      window.location.reload();
    });
  }
}

/**
 * Main entry point for the Vampire Survival Game
 * Initializes the game and starts it
 */
document.addEventListener("DOMContentLoaded", () => {
  logger.info("Initializing Vampire Survival Game...");

  // Check browser compatibility
  checkBrowserCompatibility();

  // Initialize the game
  initializeGame();
});

/**
 * Check if the browser supports necessary features
 */
function checkBrowserCompatibility(): void {
  // Check localStorage availability
  if (!isStorageAvailable()) {
    logger.error("localStorage is not available. Game progress won't be saved!");
    
    // Show warning to user
    const warningEl = document.createElement("div");
    warningEl.className = "storage-warning";
    warningEl.textContent = "Warning: Your browser doesn't support saving game progress.";
    document.body.insertBefore(warningEl, document.body.firstChild);
  }

  // Check for other required browser features if needed
  const requiredFeatures = {
    requestAnimationFrame: !!window.requestAnimationFrame,
    localStorage: isStorageAvailable(),
    addEventListener: !!window.addEventListener
  };

  // Log compatibility status
  logger.debug("Browser compatibility check:", requiredFeatures);
}

/**
 * Initialize the game with proper error handling
 */
function initializeGame(): void {
  tryCatch(
    () => {
      // Get the game container
      const gameContainer = document.getElementById("game-container");
    
      if (!gameContainer) {
        throw new Error("Game container not found!");
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
    },
    {
      message: "Failed to initialize game",
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.INITIALIZATION,
      module: "Main",
      recoverable: false, // Game can't run without proper initialization
      context: {
        environment: process.env.NODE_ENV,
        browserInfo: navigator.userAgent
      }
    },
    // No recovery function for failed initialization
    // We'll let the global error handler show the error UI
  );
}

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

  // Boss events
  GameEvents.on(EVENTS.BOSS_WARNING, (bossType: string) => {
    logger.info(`Boss warning: ${bossType} approaching`);
  });

  GameEvents.on(EVENTS.BOSS_SPAWN, (boss: any) => {
    logger.info(`Boss spawned: ${boss.name}`);
  });

  GameEvents.on(EVENTS.BOSS_DEFEATED, () => {
    logger.info('Boss defeated');
  });

  // Player events
  GameEvents.on(EVENTS.PLAYER_LEVEL_UP, (level: number) => {
    logger.info(`Player leveled up to ${level}`);
  });

  // Error events - add custom error event if needed
  GameEvents.on(EVENTS.GAME_ERROR, (error: Error) => {
    logger.error("Game error:", error);
  });
}
