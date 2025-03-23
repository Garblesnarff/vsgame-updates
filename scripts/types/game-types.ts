/**
 * Common interfaces and types used throughout the game
 */

/**
 * Game state enum
 */
export enum GameState {
  LOADING = "loading",
  MAIN_MENU = "mainMenu",
  PLAYING = "playing",
  PAUSED = "paused",
  SKILL_MENU = "skillMenu",
  GAME_OVER = "gameOver",
}

/**
 * State handler interface
 */
export interface StateHandler {
  enter?: (game: any) => void;
  exit?: (game: any) => void;
  update?: (game: any, deltaTime: number) => void;
}

/**
 * State handlers collection
 */
export interface StateHandlers {
  [key: string]: StateHandler;
}

/**
 * Ability definition interface
 */
export interface AbilityDef {
  name: string;
  description: string;
  key: string;
  cooldown: number;
  energyCost: number;
  level: number;
  maxLevel: number;
  unlocked: boolean;
  active?: boolean;
  visualEffect?: HTMLElement | null;
  lastUsed: number;
  // Ability-specific properties would be defined in subclasses
}

/**
 * Vector interface for 2D positions
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Size interface for width/height dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Rectangle interface combining position and size
 */
export interface Rectangle extends Vector2, Size {}

/**
 * Entity interface for basic game objects
 */
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  element: HTMLElement | null;
  update?: (deltaTime: number) => void;
  destroy: () => void;
}

/**
 * Game configuration interface
 */
export interface GameConfig {
  WIDTH: number;
  HEIGHT: number;
  SPAWN_RATE: number;
}

/**
 * Player statistics
 */
export interface PlayerStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  level: number;
  kills: number;
  skillPoints: number;
}

// No namespace or default export, just export individual types
