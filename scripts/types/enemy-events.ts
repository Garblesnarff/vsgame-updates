import { Enemy } from "../entities/enemies/base-enemy";

export type EnemySpawnSource = "spawn-system" | "game" | "boss";

export interface EnemySpawnPayload {
  enemy: Enemy;
  enemyType: string;
  source: EnemySpawnSource;
}
