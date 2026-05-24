import { GameEvents, EVENTS } from "./event-system";
import {
  AbilityUnlockPayload,
  AbilityUpgradePayload,
  AbilityUsePayload,
  AbilityVisualPayload,
} from "../types/ability-events";
import {
  BossAttackPayload,
  BossAttackStartPayload,
  BossDefeatedPayload,
  BossPhaseChangePayload,
  BossRewardPayload,
  BossSpawnPayload,
  BossSpecialMovePayload,
  BossWarningPayload,
} from "../types/boss-events";
import {
  EnemyAttackPayload,
  EnemyAttackStartPayload,
  EnemyBuffEndPayload,
  EnemyBuffPayload,
  EnemyChargePayload,
  EnemyDodgePayload,
  EnemyHealPayload,
  EnemySpecialMovePayload,
  EnemySummonPayload,
} from "../types/enemy-action-events";
import {
  EnemyDamagePayload,
  EnemyDeathPayload,
} from "../types/enemy-combat-events";
import { EnemySpawnPayload } from "../types/enemy-events";
import { ParticleEmitPayload } from "../types/particle-events";
import {
  PlayerDamagePayload,
  PlayerDeathPayload,
  PlayerHealPayload,
  PlayerLevelUpPayload,
} from "../types/player-events";
import { RenderSyncPayload } from "../types/render-sync";

export const emitRenderSync = (payload: RenderSyncPayload): void => {
  GameEvents.emit(EVENTS.RENDER_SYNC, payload);
};

export const emitParticle = (payload: ParticleEmitPayload): void => {
  GameEvents.emit(EVENTS.PARTICLE_EMIT, payload);
};

export const emitEnemySpawn = (payload: EnemySpawnPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_SPAWN, payload);
};

export const emitEnemyDamage = (payload: EnemyDamagePayload): void => {
  GameEvents.emit(EVENTS.ENEMY_DAMAGE, payload);
};

export const emitEnemyDeath = (payload: EnemyDeathPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_DEATH, payload);
};

export const emitPlayerDamage = (payload: PlayerDamagePayload): void => {
  GameEvents.emit(EVENTS.PLAYER_DAMAGE, payload);
};

export const emitPlayerHeal = (payload: PlayerHealPayload): void => {
  GameEvents.emit(EVENTS.PLAYER_HEAL, payload);
};

export const emitPlayerDeath = (payload: PlayerDeathPayload): void => {
  GameEvents.emit(EVENTS.PLAYER_DEATH, payload);
};

export const emitPlayerLevelUp = (payload: PlayerLevelUpPayload): void => {
  GameEvents.emit(EVENTS.PLAYER_LEVEL_UP, payload);
};

export const emitEnemyAttack = (payload: EnemyAttackPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_ATTACK, payload);
};

export const emitEnemyAttackStart = (payload: EnemyAttackStartPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_ATTACK_START, payload);
};

export const emitEnemyCharge = (payload: EnemyChargePayload): void => {
  GameEvents.emit(EVENTS.ENEMY_CHARGE, payload);
};

export const emitEnemySpecialMove = (payload: EnemySpecialMovePayload): void => {
  GameEvents.emit(EVENTS.ENEMY_SPECIAL_MOVE, payload);
};

export const emitEnemyHeal = (payload: EnemyHealPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_HEAL, payload);
};

export const emitEnemyBuff = (payload: EnemyBuffPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_BUFF, payload);
};

export const emitEnemyBuffEnd = (payload: EnemyBuffEndPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_BUFF_END, payload);
};

export const emitEnemyDodge = (payload: EnemyDodgePayload): void => {
  GameEvents.emit(EVENTS.ENEMY_DODGE, payload);
};

export const emitEnemySummon = (payload: EnemySummonPayload): void => {
  GameEvents.emit(EVENTS.ENEMY_SUMMON, payload);
};

export const emitBossSpawn = (payload: BossSpawnPayload): void => {
  GameEvents.emit(EVENTS.BOSS_SPAWN, payload);
};

export const emitBossWarning = (payload: BossWarningPayload): void => {
  GameEvents.emit(EVENTS.BOSS_WARNING, payload);
};

export const emitBossAttack = (payload: BossAttackPayload): void => {
  GameEvents.emit(EVENTS.BOSS_ATTACK, payload);
};

export const emitBossAttackStart = (payload: BossAttackStartPayload): void => {
  GameEvents.emit(EVENTS.BOSS_ATTACK_START, payload);
};

export const emitBossPhaseChange = (payload: BossPhaseChangePayload): void => {
  GameEvents.emit(EVENTS.BOSS_PHASE_CHANGE, payload);
};

export const emitBossSpecialMove = (payload: BossSpecialMovePayload): void => {
  GameEvents.emit(EVENTS.BOSS_SPECIAL_MOVE, payload);
};

export const emitBossDefeated = (payload: BossDefeatedPayload = {}): void => {
  GameEvents.emit(EVENTS.BOSS_DEFEATED, payload);
};

export const emitBossReward = (payload: BossRewardPayload): void => {
  GameEvents.emit(EVENTS.BOSS_REWARD, payload);
};

export const emitAbilityUse = (payload: AbilityUsePayload): void => {
  GameEvents.emit(EVENTS.ABILITY_USE, payload);
};

export const emitAbilityUpgrade = (payload: AbilityUpgradePayload): void => {
  GameEvents.emit(EVENTS.ABILITY_UPGRADE, payload);
};

export const emitAbilityUnlock = (payload: AbilityUnlockPayload): void => {
  GameEvents.emit(EVENTS.ABILITY_UNLOCK, payload);
};

export const emitAbilityVisual = (payload: AbilityVisualPayload): void => {
  GameEvents.emit(EVENTS.ABILITY_VISUAL, payload);
};
