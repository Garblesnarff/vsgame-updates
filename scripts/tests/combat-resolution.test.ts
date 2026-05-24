import { EVENTS, GameEvents } from "../utils/event-system";
import {
  resolveEnemyProjectileHit,
  resolvePlayerProjectileEnemyHit,
} from "../game/combat-resolution";

describe("combat resolution", () => {
  beforeEach(() => {
    GameEvents.removeAllListeners();
  });

  afterEach(() => {
    GameEvents.removeAllListeners();
  });

  test("applies projectile damage, lifesteal, death flow, drop spawn, and kill progression", () => {
    const particleHandler = jest.fn();
    const deathHandler = jest.fn();
    GameEvents.on(EVENTS.PARTICLE_EMIT, particleHandler);
    GameEvents.on(EVENTS.ENEMY_DEATH, deathHandler);

    const projectile = {
      x: 10,
      y: 20,
      damage: 40,
      isBloodLance: false,
      isEnemyProjectile: false,
      handleBloodLanceHit: jest.fn(),
    } as any;
    const enemy = {
      x: 100,
      y: 200,
      width: 20,
      height: 30,
      takeDamage: jest.fn((_damage, createParticles) => {
        createParticles(110, 215, 5);
        return true;
      }),
    } as any;
    const player = {
      stats: { getLifeStealPercentage: jest.fn(() => 25) },
      heal: jest.fn(),
    } as any;
    const releaseEnemy = jest.fn();
    const spawnDrop = jest.fn();
    const addKill = jest.fn(() => true);

    const result = resolvePlayerProjectileEnemyHit({
      projectile,
      enemy,
      player,
      releaseEnemy,
      spawnDrop,
      addKill,
      random: () => 0,
    });

    expect(result).toEqual({ shouldRemoveProjectile: true, enemyDied: true });
    expect(enemy.takeDamage).toHaveBeenCalledWith(40, expect.any(Function), undefined);
    expect(player.heal).toHaveBeenCalledWith(10);
    expect(releaseEnemy).toHaveBeenCalledWith(enemy);
    expect(spawnDrop).toHaveBeenCalledWith(110, 215);
    expect(addKill).toHaveBeenCalledTimes(1);
    expect(deathHandler).toHaveBeenCalledWith({ enemy, source: "projectile" });
    expect(particleHandler).toHaveBeenCalledWith({ type: "blood", x: 10, y: 20, count: 5 });
    expect(particleHandler).toHaveBeenCalledWith({ type: "blood", x: 110, y: 215, count: 5 });
  });

  test("emits damage without death side effects when enemy survives", () => {
    const damageHandler = jest.fn();
    GameEvents.on(EVENTS.ENEMY_DAMAGE, damageHandler);

    const projectile = {
      x: 10,
      y: 20,
      damage: 12,
      isBloodLance: false,
      isEnemyProjectile: false,
      handleBloodLanceHit: jest.fn(),
    } as any;
    const enemy = {
      takeDamage: jest.fn(() => false),
    } as any;
    const player = {
      stats: { getLifeStealPercentage: jest.fn(() => 0) },
      heal: jest.fn(),
    } as any;
    const releaseEnemy = jest.fn();
    const spawnDrop = jest.fn();
    const addKill = jest.fn();

    const result = resolvePlayerProjectileEnemyHit({
      projectile,
      enemy,
      player,
      releaseEnemy,
      spawnDrop,
      addKill,
      random: () => 1,
    });

    expect(result).toEqual({ shouldRemoveProjectile: true, enemyDied: false });
    expect(releaseEnemy).not.toHaveBeenCalled();
    expect(spawnDrop).not.toHaveBeenCalled();
    expect(addKill).not.toHaveBeenCalled();
    expect(damageHandler).toHaveBeenCalledWith({ enemy, damage: 12, source: "projectile" });
  });

  test("handles enemy projectile player death callback", () => {
    const player = {
      isAlive: false,
      takeDamage: jest.fn(),
    } as any;
    const projectile = {
      x: 10,
      y: 20,
      damage: 5,
    } as any;
    const onPlayerKilled = jest.fn();

    const result = resolveEnemyProjectileHit({ projectile, player, onPlayerKilled });

    expect(result).toEqual({ shouldRemoveProjectile: true });
    expect(player.takeDamage).toHaveBeenCalledWith(5);
    expect(onPlayerKilled).toHaveBeenCalledTimes(1);
  });
});
