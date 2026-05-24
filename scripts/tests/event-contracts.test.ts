import { GameEvents, EVENTS } from "../utils/event-system";
import {
  emitEnemyDamage,
  emitEnemyDeath,
  emitEnemySpawn,
  emitParticle,
  emitPlayerDamage,
  emitPlayerDeath,
  emitPlayerHeal,
  emitPlayerLevelUp,
  emitRenderSync,
} from "../utils/game-event-emitters";

describe("typed game event emitters", () => {
  beforeEach(() => {
    GameEvents.removeAllListeners();
  });

  afterEach(() => {
    GameEvents.removeAllListeners();
  });

  test("emits render sync as a single object payload", () => {
    const handler = jest.fn();
    GameEvents.on(EVENTS.RENDER_SYNC, handler);

    const payload = {
      player: { x: 1, y: 2, width: 10, height: 10, isAlive: true, isInvulnerable: false, health: 8, maxHealth: 10 },
      enemies: [],
      projectiles: [],
      drops: [],
      bats: [],
      gameTime: 123,
    };

    emitRenderSync(payload);

    expect(handler).toHaveBeenCalledWith(payload);
  });

  test("emits particle events as discriminated payload objects", () => {
    const handler = jest.fn();
    GameEvents.on(EVENTS.PARTICLE_EMIT, handler);

    emitParticle({ type: "blood", x: 12, y: 24, count: 5 });
    emitParticle({ type: "shadowTrail", x: 4, y: 8 });

    expect(handler).toHaveBeenNthCalledWith(1, { type: "blood", x: 12, y: 24, count: 5 });
    expect(handler).toHaveBeenNthCalledWith(2, { type: "shadowTrail", x: 4, y: 8 });
  });

  test("emits enemy lifecycle events as canonical object payloads", () => {
    const spawnHandler = jest.fn();
    const damageHandler = jest.fn();
    const deathHandler = jest.fn();
    const enemy = { id: "enemy-1" } as any;

    GameEvents.on(EVENTS.ENEMY_SPAWN, spawnHandler);
    GameEvents.on(EVENTS.ENEMY_DAMAGE, damageHandler);
    GameEvents.on(EVENTS.ENEMY_DEATH, deathHandler);

    emitEnemySpawn({ enemy, enemyType: "basicEnemy", source: "spawn-system" });
    emitEnemyDamage({ enemy, damage: 7, source: "projectile" });
    emitEnemyDeath({ enemy, source: "projectile" });

    expect(spawnHandler).toHaveBeenCalledWith({ enemy, enemyType: "basicEnemy", source: "spawn-system" });
    expect(damageHandler).toHaveBeenCalledWith({ enemy, damage: 7, source: "projectile" });
    expect(deathHandler).toHaveBeenCalledWith({ enemy, source: "projectile" });
  });

  test("emits player events as canonical object payloads", () => {
    const damageHandler = jest.fn();
    const healHandler = jest.fn();
    const deathHandler = jest.fn();
    const levelHandler = jest.fn();
    const player = { id: "player-1" } as any;

    GameEvents.on(EVENTS.PLAYER_DAMAGE, damageHandler);
    GameEvents.on(EVENTS.PLAYER_HEAL, healHandler);
    GameEvents.on(EVENTS.PLAYER_DEATH, deathHandler);
    GameEvents.on(EVENTS.PLAYER_LEVEL_UP, levelHandler);

    emitPlayerDamage({ player, damage: 3, currentHealth: 17, maxHealth: 20 });
    emitPlayerHeal({ player, amount: 2, currentHealth: 19, maxHealth: 20 });
    emitPlayerDeath({ player });
    emitPlayerLevelUp({ player, level: 2 });

    expect(damageHandler).toHaveBeenCalledWith({ player, damage: 3, currentHealth: 17, maxHealth: 20 });
    expect(healHandler).toHaveBeenCalledWith({ player, amount: 2, currentHealth: 19, maxHealth: 20 });
    expect(deathHandler).toHaveBeenCalledWith({ player });
    expect(levelHandler).toHaveBeenCalledWith({ player, level: 2 });
  });
});
