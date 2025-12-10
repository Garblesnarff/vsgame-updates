/**
 * Game loop manager
 * Handles the main game update and render loop with frame rate limiting
 */
export class GameLoop {
  lastTimestamp: number;
  gameRunning: boolean;
  gamePaused: boolean;
  pauseOverlay: HTMLElement | null;
  updateCallback: ((deltaTime: number) => void) | null;
  targetFPS: number;
  frameInterval: number;
  lastFrameTime: number;
  accumulatedTime: number;

  constructor(targetFPS: number = 60) {
    this.lastTimestamp = 0;
    this.gameRunning = false;
    this.gamePaused = false;
    this.pauseOverlay = null;
    this.updateCallback = null;
    this.targetFPS = targetFPS;
    this.frameInterval = 1000 / targetFPS; // Target frame time in ms
    this.lastFrameTime = 0;
    this.accumulatedTime = 0;
  }

  /**
   * Start the game loop
   * @param updateCallback - Function to call on each update
   */
  start(updateCallback: (deltaTime: number) => void): void {
    this.gameRunning = true;
    this.gamePaused = false;
    this.updateCallback = updateCallback;
    this.lastTimestamp = 0;

    // Remove pause overlay if it exists
    this.resumeGame();

    // Start the animation frame loop
    requestAnimationFrame(this.update.bind(this));
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.gameRunning = false;
  }

  /**
   * Pause the game
   * @param gameContainer - Game container element
   */
  pauseGame(gameContainer: HTMLElement): void {
    this.gamePaused = true;

    // Create pause overlay if it doesn't exist
    if (!this.pauseOverlay) {
      this.pauseOverlay = document.createElement("div");
      this.pauseOverlay.id = "pause-overlay";
      this.pauseOverlay.textContent = "GAME PAUSED";

      gameContainer.appendChild(this.pauseOverlay);
    } else {
      this.pauseOverlay.style.display = "block";
    }
  }

  /**
   * Resume the game
   */
  resumeGame(): void {
    this.gamePaused = false;

    // Hide pause overlay
    if (this.pauseOverlay) {
      this.pauseOverlay.style.display = "none";
    }
  }

  /**
   * Toggle pause state
   * @param gameContainer - Game container element
   */
  togglePause(gameContainer: HTMLElement): void {
    if (this.gamePaused) {
      this.resumeGame();
    } else {
      this.pauseGame(gameContainer);
    }
  }

  /**
   * Main update function called on each animation frame
   * Implements frame rate limiting to maintain consistent target FPS
   * @param timestamp - Current timestamp
   */
  update(timestamp: number): void {
    if (!this.gameRunning) {
      return;
    }

    // Initialize lastFrameTime on first call
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
    }

    // Calculate delta time since last frame
    const deltaTime = timestamp - this.lastFrameTime;
    this.accumulatedTime += deltaTime;

    // Update if we have enough accumulated time for a frame
    if (this.accumulatedTime >= this.frameInterval) {
      // Skip updates if game is paused
      if (!this.gamePaused && this.updateCallback) {
        // Use fixed timestep for consistent game logic
        this.updateCallback(this.frameInterval);
      }

      // Consume the frame interval from accumulated time
      this.accumulatedTime -= this.frameInterval;
      this.lastFrameTime = timestamp;
    }

    // Request next frame (always maintain the animation frame loop)
    requestAnimationFrame(this.update.bind(this));
  }
}

export default GameLoop;
