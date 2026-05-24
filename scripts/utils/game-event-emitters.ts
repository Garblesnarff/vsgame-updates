import { GameEvents, EVENTS } from "./event-system";
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
