export interface RenderPlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  isAlive: boolean;
  isInvulnerable: boolean;
  health: number;
  maxHealth: number;
}

export interface RenderEnemyState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  health: number;
  maxHealth: number;
  animationState?: string;
  facingDirection?: string;
}

export interface RenderProjectileState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isEnemyProjectile: boolean;
  isBloodLance: boolean;
}

export interface RenderDropState {
  id: string;
  x: number;
  y: number;
  type: string | number;
}

export interface RenderBatState {
  id: string;
  x: number;
  y: number;
  angle: number;
}

export interface RenderSyncPayload {
  player: RenderPlayerState;
  enemies: RenderEnemyState[];
  projectiles: RenderProjectileState[];
  drops: RenderDropState[];
  bats: RenderBatState[];
  gameTime: number;
}
