import { Enemy } from "../entities/enemies/base-enemy";

export interface EnemyDamagePayload {
  enemy: Enemy;
  damage: number;
  source?: string;
}

export interface EnemyDeathPayload {
  enemy: Enemy;
  source?: string;
}
