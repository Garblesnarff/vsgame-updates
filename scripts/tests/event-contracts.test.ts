import { GameEvents, EVENTS } from "../utils/event-system";
import {
  emitAbilityUnlock,
  emitAbilityUpgrade,
  emitAbilityUse,
  emitAbilityVisual,
  emitBossAttack,
  emitBossAttackStart,
  emitBossDefeated,
  emitBossPhaseChange,
  emitBossReward,
  emitBossSpawn,
  emitBossSpecialMove,
  emitBossWarning,
  emitEnemyAttack,
  emitEnemyAttackStart,
  emitEnemyBuff,
  emitEnemyBuffEnd,
  emitEnemyDamage,
  emitEnemyDeath,
  emitEnemyDodge,
  emitEnemyHeal,
  emitEnemySpawn,
  emitEnemySpecialMove,
  emitEnemySummon,
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

  test("emits enemy action events as canonical object payloads", () => {
    const enemy = { id: "enemy-1" } as any;
    const handlers = {
      attack: jest.fn(),
      attackStart: jest.fn(),
      special: jest.fn(),
      heal: jest.fn(),
      buff: jest.fn(),
      buffEnd: jest.fn(),
      dodge: jest.fn(),
      summon: jest.fn(),
    };

    GameEvents.on(EVENTS.ENEMY_ATTACK, handlers.attack);
    GameEvents.on(EVENTS.ENEMY_ATTACK_START, handlers.attackStart);
    GameEvents.on(EVENTS.ENEMY_SPECIAL_MOVE, handlers.special);
    GameEvents.on(EVENTS.ENEMY_HEAL, handlers.heal);
    GameEvents.on(EVENTS.ENEMY_BUFF, handlers.buff);
    GameEvents.on(EVENTS.ENEMY_BUFF_END, handlers.buffEnd);
    GameEvents.on(EVENTS.ENEMY_DODGE, handlers.dodge);
    GameEvents.on(EVENTS.ENEMY_SUMMON, handlers.summon);

    emitEnemyAttack({ enemy, attackType: "slash" });
    emitEnemyAttackStart({ enemy, attackType: "windup" });
    emitEnemySpecialMove({ enemy, moveType: "teleport" });
    emitEnemyHeal({ enemy, amount: 5 });
    emitEnemyBuff({ enemy, buffType: "holyShield", amount: 0.5 });
    emitEnemyBuffEnd({ enemy, buffType: "holyShield" });
    emitEnemyDodge({ enemy, projectileType: "bloodLance" });
    emitEnemySummon({ position: { x: 1, y: 2 }, count: 3, types: ["basicEnemy"], sourceEnemy: enemy });

    expect(handlers.attack).toHaveBeenCalledWith({ enemy, attackType: "slash" });
    expect(handlers.attackStart).toHaveBeenCalledWith({ enemy, attackType: "windup" });
    expect(handlers.special).toHaveBeenCalledWith({ enemy, moveType: "teleport" });
    expect(handlers.heal).toHaveBeenCalledWith({ enemy, amount: 5 });
    expect(handlers.buff).toHaveBeenCalledWith({ enemy, buffType: "holyShield", amount: 0.5 });
    expect(handlers.buffEnd).toHaveBeenCalledWith({ enemy, buffType: "holyShield" });
    expect(handlers.dodge).toHaveBeenCalledWith({ enemy, projectileType: "bloodLance" });
    expect(handlers.summon).toHaveBeenCalledWith({ position: { x: 1, y: 2 }, count: 3, types: ["basicEnemy"], sourceEnemy: enemy });
  });

  test("emits boss events as canonical object payloads", () => {
    const boss = { id: "boss-1" } as any;
    const spawnHandler = jest.fn();
    const warningHandler = jest.fn();
    const attackHandler = jest.fn();
    const attackStartHandler = jest.fn();
    const phaseHandler = jest.fn();
    const specialHandler = jest.fn();
    const defeatedHandler = jest.fn();
    const rewardHandler = jest.fn();

    GameEvents.on(EVENTS.BOSS_SPAWN, spawnHandler);
    GameEvents.on(EVENTS.BOSS_WARNING, warningHandler);
    GameEvents.on(EVENTS.BOSS_ATTACK, attackHandler);
    GameEvents.on(EVENTS.BOSS_ATTACK_START, attackStartHandler);
    GameEvents.on(EVENTS.BOSS_PHASE_CHANGE, phaseHandler);
    GameEvents.on(EVENTS.BOSS_SPECIAL_MOVE, specialHandler);
    GameEvents.on(EVENTS.BOSS_DEFEATED, defeatedHandler);
    GameEvents.on(EVENTS.BOSS_REWARD, rewardHandler);

    emitBossSpawn({ boss });
    emitBossWarning({ bossType: "churchPaladin" });
    emitBossAttack({ boss, attackType: "holyNova", metadata: { radius: 10 } });
    emitBossAttackStart({ boss, attackType: "judgment" });
    emitBossPhaseChange({ boss, phase: 2 });
    emitBossSpecialMove({ boss, moveType: "teleport" });
    emitBossDefeated({ boss });
    emitBossReward({ boss, bossType: "churchPaladin", rewards: { xp: 100 } });

    expect(spawnHandler).toHaveBeenCalledWith({ boss });
    expect(warningHandler).toHaveBeenCalledWith({ bossType: "churchPaladin" });
    expect(attackHandler).toHaveBeenCalledWith({ boss, attackType: "holyNova", metadata: { radius: 10 } });
    expect(attackStartHandler).toHaveBeenCalledWith({ boss, attackType: "judgment" });
    expect(phaseHandler).toHaveBeenCalledWith({ boss, phase: 2 });
    expect(specialHandler).toHaveBeenCalledWith({ boss, moveType: "teleport" });
    expect(defeatedHandler).toHaveBeenCalledWith({ boss });
    expect(rewardHandler).toHaveBeenCalledWith({ boss, bossType: "churchPaladin", rewards: { xp: 100 } });
  });

  test("emits ability events as canonical object payloads", () => {
    const player = { id: "player-1" } as any;
    const useHandler = jest.fn();
    const upgradeHandler = jest.fn();
    const unlockHandler = jest.fn();
    const visualHandler = jest.fn();

    GameEvents.on(EVENTS.ABILITY_USE, useHandler);
    GameEvents.on(EVENTS.ABILITY_UPGRADE, upgradeHandler);
    GameEvents.on(EVENTS.ABILITY_UNLOCK, unlockHandler);
    GameEvents.on(EVENTS.ABILITY_VISUAL, visualHandler);

    emitAbilityUse({ abilityName: "Blood Drain", player });
    emitAbilityUpgrade({ abilityName: "Blood Drain", player });
    emitAbilityUnlock({ abilityName: "Blood Drain", player });
    emitAbilityVisual({ type: "blood-drain-start", x: 10, y: 20 });

    expect(useHandler).toHaveBeenCalledWith({ abilityName: "Blood Drain", player });
    expect(upgradeHandler).toHaveBeenCalledWith({ abilityName: "Blood Drain", player });
    expect(unlockHandler).toHaveBeenCalledWith({ abilityName: "Blood Drain", player });
    expect(visualHandler).toHaveBeenCalledWith({ type: "blood-drain-start", x: 10, y: 20 });
  });
});
