/**
 * Type definitions for the game events
 */

/**
 * Base Event interface
 */
interface GameEvent {
  type: string;
}

/**
 * Game state events
 */
interface GameInitEvent extends GameEvent {
  type: "game:init";
  game: any; // Will be typed properly once Game is converted to TS
}

interface GameStartEvent extends GameEvent {
  type: "game:start";
  game: any;
}

interface GameOverEvent extends GameEvent {
  type: "game:over";
  game: any;
}

interface GamePauseEvent extends GameEvent {
  type: "game:pause";
  game: any;
}

interface GameResumeEvent extends GameEvent {
  type: "game:resume";
  game: any;
}

interface GameRestartEvent extends GameEvent {
  type: "game:restart";
  game: any;
}

/**
 * Player events
 */
interface PlayerDamageEvent extends GameEvent {
  type: "player:damage";
  amount: number;
  player: any; // Will be typed properly once Player is converted to TS
}

interface PlayerHealEvent extends GameEvent {
  type: "player:heal";
  amount: number;
  player: any;
}

interface PlayerDeathEvent extends GameEvent {
  type: "player:death";
  player: any;
}

interface PlayerLevelUpEvent extends GameEvent {
  type: "player:levelUp";
  level: number;
  player: any;
}

interface PlayerSkillPointEvent extends GameEvent {
  type: "player:skillPoint";
  skillPoints: number;
  player: any;
}

/**
 * Enemy events
 */
interface EnemySpawnEvent extends GameEvent {
  type: "enemy:spawn";
  enemy: any; // Will be typed properly once Enemy is converted to TS
}

interface EnemyDamageEvent extends GameEvent {
  type: "enemy:damage";
  enemy: any;
  damage: number;
}

interface EnemyDeathEvent extends GameEvent {
  type: "enemy:death";
  enemy: any;
}

/**
 * Ability events
 */
interface AbilityUseEvent extends GameEvent {
  type: "ability:use";
  ability: string;
  player: any;
}

interface AbilityUpgradeEvent extends GameEvent {
  type: "ability:upgrade";
  ability: string;
  player: any;
}

interface AbilityUnlockEvent extends GameEvent {
  type: "ability:unlock";
  ability: string;
  player: any;
}

/**
 * UI events
 */
interface UISkillMenuOpenEvent extends GameEvent {
  type: "ui:skillMenuOpen";
}

interface UISkillMenuCloseEvent extends GameEvent {
  type: "ui:skillMenuClose";
}

/**
 * Input events
 */
interface InputKeyDownEvent extends GameEvent {
  type: "input:keyDown";
  key: string;
}

interface InputKeyUpEvent extends GameEvent {
  type: "input:keyUp";
  key: string;
}

interface InputClickEvent extends GameEvent {
  type: "input:click";
  x: number;
  y: number;
}

/**
 * Asset events
 */
interface AssetsLoadStartEvent extends GameEvent {
  type: "assets:loadStart";
  total: number;
}

interface AssetsLoadProgressEvent extends GameEvent {
  type: "assets:loadProgress";
  loaded: number;
  total: number;
  progress: number;
}

interface AssetsLoadCompleteEvent extends GameEvent {
  type: "assets:loadComplete";
  images: Map<string, HTMLImageElement>;
  sounds: Map<string, HTMLAudioElement>;
  fonts: Map<string, FontFace>;
  data: Map<string, any>;
}

interface AssetsLoadErrorEvent extends GameEvent {
  type: "assets:loadError";
  error: Error;
}

/**
 * State events
 */
interface StateChangeEvent extends GameEvent {
  type: "state:change";
  from: string;
  to: string;
}

/**
 * Union type of all possible game events
 */
type AllGameEvents =
  | GameInitEvent
  | GameStartEvent
  | GameOverEvent
  | GamePauseEvent
  | GameResumeEvent
  | GameRestartEvent
  | PlayerDamageEvent
  | PlayerHealEvent
  | PlayerDeathEvent
  | PlayerLevelUpEvent
  | PlayerSkillPointEvent
  | EnemySpawnEvent
  | EnemyDamageEvent
  | EnemyDeathEvent
  | AbilityUseEvent
  | AbilityUpgradeEvent
  | AbilityUnlockEvent
  | UISkillMenuOpenEvent
  | UISkillMenuCloseEvent
  | InputKeyDownEvent
  | InputKeyUpEvent
  | InputClickEvent
  | AssetsLoadStartEvent
  | AssetsLoadProgressEvent
  | AssetsLoadCompleteEvent
  | AssetsLoadErrorEvent
  | StateChangeEvent;

// Export the types for use in the game
export {
  GameEvent,
  GameInitEvent,
  GameStartEvent,
  GameOverEvent,
  GamePauseEvent,
  GameResumeEvent,
  GameRestartEvent,
  PlayerDamageEvent,
  PlayerHealEvent,
  PlayerDeathEvent,
  PlayerLevelUpEvent,
  PlayerSkillPointEvent,
  EnemySpawnEvent,
  EnemyDamageEvent,
  EnemyDeathEvent,
  AbilityUseEvent,
  AbilityUpgradeEvent,
  AbilityUnlockEvent,
  UISkillMenuOpenEvent,
  UISkillMenuCloseEvent,
  InputKeyDownEvent,
  InputKeyUpEvent,
  InputClickEvent,
  AssetsLoadStartEvent,
  AssetsLoadProgressEvent,
  AssetsLoadCompleteEvent,
  AssetsLoadErrorEvent,
  StateChangeEvent,
  AllGameEvents,
};
