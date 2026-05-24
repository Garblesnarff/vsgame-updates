import CONFIG from "../config";
import { Enemy } from "../entities/enemies/base-enemy";
import { Player } from "../entities/player";
import { Projectile } from "../entities/projectile";
import { emitEnemyDamage, emitEnemyDeath, emitParticle } from "../utils/game-event-emitters";

export interface EnemyProjectileHitContext {
  projectile: Projectile;
  player: Player;
  onPlayerKilled: () => void;
}

export interface PlayerProjectileHitContext {
  projectile: Projectile;
  enemy: Enemy;
  player: Player;
  releaseEnemy: (enemy: Enemy) => void;
  spawnDrop: (x: number, y: number) => void;
  addKill: () => boolean;
  random?: () => number;
}

export interface ProjectileHitResult {
  shouldRemoveProjectile: boolean;
  enemyDied?: boolean;
}

export const resolveEnemyProjectileHit = ({
  projectile,
  player,
  onPlayerKilled,
}: EnemyProjectileHitContext): ProjectileHitResult => {
  emitParticle({ type: "blood", x: projectile.x, y: projectile.y, count: 5 });

  player.takeDamage(projectile.damage);

  if (!player.isAlive) {
    onPlayerKilled();
  }

  return { shouldRemoveProjectile: true };
};

export const resolvePlayerProjectileEnemyHit = ({
  projectile,
  enemy,
  player,
  releaseEnemy,
  spawnDrop,
  addKill,
  random = Math.random,
}: PlayerProjectileHitContext): ProjectileHitResult => {
  emitParticle({ type: "blood", x: projectile.x, y: projectile.y, count: 5 });

  const damageDealt = projectile.damage;
  const enemyDied = enemy.takeDamage(
    damageDealt,
    (x: number, y: number, count: number) => {
      emitParticle({ type: "blood", x, y, count });
    },
    projectile.isBloodLance ? "bloodLance" : undefined
  );

  const lifeStealPercentage = player.stats.getLifeStealPercentage();
  if (lifeStealPercentage > 0 && !projectile.isEnemyProjectile) {
    const healAmount = damageDealt * (lifeStealPercentage / 100);
    if (healAmount > 0) {
      player.heal(healAmount);
    }
  }

  if (enemyDied) {
    releaseEnemy(enemy);
    emitEnemyDeath({ enemy, source: "projectile" });

    if (random() < CONFIG.DROPS.ENEMY_DROP_CHANCE) {
      spawnDrop(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    }

    addKill();
  } else {
    emitEnemyDamage({ enemy, damage: projectile.damage, source: "projectile" });
  }

  const shouldRemoveProjectile = projectile.isBloodLance
    ? projectile.handleBloodLanceHit(enemy, player.heal.bind(player))
    : true;

  return { shouldRemoveProjectile, enemyDied };
};
