import { Boss } from "../entities/bosses";

export interface BossSpawnPayload {
  boss: Boss;
}

export interface BossWarningPayload {
  bossType: string;
}

export interface BossAttackPayload {
  boss: Boss;
  attackType: string;
  metadata?: Record<string, unknown>;
}

export interface BossAttackStartPayload {
  boss: Boss;
  attackType: string;
  metadata?: Record<string, unknown>;
}

export interface BossPhaseChangePayload {
  boss: Boss;
  phase: number;
}

export interface BossSpecialMovePayload {
  boss: Boss;
  moveType: string;
  metadata?: Record<string, unknown>;
}

export interface BossDefeatedPayload {
  boss?: Boss;
}

export interface BossRewardPayload {
  boss: Boss;
  bossType: string;
  rewards: Record<string, unknown>;
}
