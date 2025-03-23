/**
 * Player interface definition
 */

import { LevelSystem } from "../game/level-system";

export interface IPlayer {
  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Stats
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  
  // Progression
  level: number;
  kills: number;
  killsToNextLevel: number;
  skillPoints: number;
  
  // Reference to level system
  levelSystem: LevelSystem | null;
  
  // Methods
  setLevelSystem(levelSystem: LevelSystem): void;
  heal(amount: number): void;
  takeDamage(amount: number): boolean;
  addKill(): boolean;
}