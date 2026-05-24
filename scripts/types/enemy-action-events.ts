import { Enemy } from "../entities/enemies/base-enemy";

export interface EnemyAttackPayload {
  enemy: Enemy;
  attackType?: string;
  metadata?: Record<string, unknown>;
}

export interface EnemyAttackStartPayload {
  enemy: Enemy;
  attackType: string;
  metadata?: Record<string, unknown>;
}

export interface EnemyChargePayload {
  enemy: Enemy;
}

export interface EnemySpecialMovePayload {
  enemy: Enemy;
  moveType: string;
  metadata?: Record<string, unknown>;
}

export interface EnemyHealPayload {
  enemy: Enemy;
  amount: number;
}

export interface EnemyBuffPayload {
  enemy: Enemy;
  buffType: string;
  amount?: number;
}

export interface EnemyBuffEndPayload {
  enemy: Enemy;
  buffType: string;
}

export interface EnemyDodgePayload {
  enemy: Enemy;
  projectileType: string;
}

export interface EnemySummonPayload {
  position: { x: number; y: number };
  count: number;
  types: string[];
  spawnRadius?: number;
  sourceEnemy?: Enemy;
}
