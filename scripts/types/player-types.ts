/**
 * Type definitions for player and related components
 * Helps resolve circular dependencies between modules
 */
import { StatsComponent } from "../ecs/components/StatsComponent";
import { AbilityManager } from "../abilities/ability-manager";
import { Game } from "../game/game";
import { LevelSystem } from "../game/level-system";
import { DropType } from "./drop-types"; // <-- Import DropType

/**
 * Interface for auto attack configuration
 */
export interface AutoAttack {
  enabled: boolean;
  cooldown: number;
  originalCooldown?: number; 
  lastFired: number;
  damage: number;
  range: number;
  level: number;
  maxLevel: number;
}

/**
 * Interface for projectile creation options
 */
export interface ProjectileOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isAutoAttack: boolean;
  isBloodLance?: boolean;
  pierce?: number;
  pierceCount?: number;
  healAmount?: number;
  hitEnemies?: Set<string>;
  className?: string;
  angle?: number;
}

/**
 * Interface for Player core functionality
 * Used to prevent circular dependencies
 */
export interface IPlayer {
  level: number;
  kills: number;
  gameContainer: HTMLElement;
  game: Game | null;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  stats: StatsComponent;
  skillPoints: number;
  isAlive: boolean;
  isInvulnerable: boolean;
  showingSkillMenu: boolean;
  lastAttack: number;
  attackCooldown: number;
  projectileSpeed: number;
  autoAttack: AutoAttack;
  abilityManager: AbilityManager;
  element: HTMLElement | null;
  levelSystem: LevelSystem | null;
  
  move(keys: Record<string, boolean>): void;
  updatePosition(): void;
  regenerateEnergy(deltaTime: number): void;
  takeDamage(amount: number): boolean;
  heal(amount: number): void;
  fireProjectile(targetX: number, targetY: number, createProjectile: (options: ProjectileOptions) => void): boolean;
  fireAutoProjectile(enemy: any, createProjectile: (options: ProjectileOptions) => void): boolean;
  setInvulnerable(duration: number): void;
  addKill(): boolean;
  setLevelSystem(levelSystem: LevelSystem): void;
  destroy(): void;
  // Added for weapon drops
  pickupDrop(dropType: DropType): void;
}

/**
 * Interface for LevelSystem core functionality
 * Used to prevent circular dependencies
 */
export interface ILevelSystem {
  level: number;
  kills: number;
  killsToNextLevel: number;
  
  addKill(): boolean;
  levelUp(): void;
  onLevelUp(callback: (level: number) => void): void;
  getLevel(): number;
  getKills(): number;
  getKillsToNextLevel(): number;
  reset(): void;
}
