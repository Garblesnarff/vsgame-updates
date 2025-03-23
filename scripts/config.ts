/**
 * Configuration interfaces for game settings
 */

/**
 * Player configuration interface
 */
interface PlayerConfig {
  WIDTH: number;
  HEIGHT: number;
  SPEED: number;
  MAX_HEALTH: number;
  MAX_ENERGY: number;
  ENERGY_REGEN: number;
  ATTACK_COOLDOWN: number;
  PROJECTILE_SPEED: number;
  MANUAL_PROJECTILE_DAMAGE: number;
}

/**
 * Base enemy configuration interface
 */
interface BaseEnemyConfig {
  WIDTH: number;
  HEIGHT: number;
  BASE_HEALTH: number;
  BASE_DAMAGE: number;
}

/**
 * Vampire Hunter configuration
 */
interface VampireHunterConfig {
  WIDTH: number;
  HEIGHT: number;
  BASE_HEALTH: number;
  BASE_DAMAGE: number;
  PROJECTILE_COOLDOWN: number;
  PROJECTILE_SPEED: number;
  PROJECTILE_DAMAGE_MULTIPLIER: number;
  DETECTION_RADIUS: number;
  PREFERRED_DISTANCE: number;
}

/**
 * Fast Swarmer configuration
 */
interface FastSwarmerConfig {
  WIDTH: number;
  HEIGHT: number;
  BASE_HEALTH: number;
  BASE_DAMAGE: number;
  SIZE_MULTIPLIER: number;
  SPEED_MULTIPLIER: number;
  HEALTH_MULTIPLIER: number;
  DAMAGE_MULTIPLIER: number;
  DODGE_CHANCE: number;
  BURST_SPEED_MULTIPLIER: number;
}

/**
 * Tanky Brute configuration
 */
interface TankyBruteConfig {
  WIDTH: number;
  HEIGHT: number;
  BASE_HEALTH: number;
  BASE_DAMAGE: number;
  SIZE_MULTIPLIER: number;
  HEALTH_MULTIPLIER: number;
  DAMAGE_MULTIPLIER: number;
  SPEED_MULTIPLIER: number;
  DAMAGE_REDUCTION: number;
  SLAM_ATTACK_COOLDOWN: number;
  SLAM_ATTACK_RADIUS: number;
  SLAM_ATTACK_DAMAGE_MULTIPLIER: number;
  BLOOD_LANCE_VULNERABILITY_MULTIPLIER: number;
}

/**
 * Spawn rates configuration
 */
interface SpawnRatesConfig {
  HUNTER_SPAWN_RATE: number;
  SWARM_SPAWN_RATE: number;
  BASE_SWARM_SIZE: number;
}

/**
 * Enemy configuration interface
 */
interface EnemyConfig {
  BASE: BaseEnemyConfig;
  VAMPIRE_HUNTER: VampireHunterConfig;
  FAST_SWARMER: FastSwarmerConfig;
  TANKY_BRUTE: TankyBruteConfig;
  SPAWN_RATES: SpawnRatesConfig;
}

/**
 * Level system configuration interface
 */
interface LevelConfig {
  KILLS_FOR_LEVELS: number[];
  KILLS_INCREASE_PER_LEVEL: number;
}

/**
 * Auto attack ability configuration
 */
interface AutoAttackConfig {
  ENABLED: boolean;
  COOLDOWN: number;
  DAMAGE: number;
  RANGE: number;
  MAX_LEVEL: number;
}

/**
 * Blood Drain ability configuration
 */
interface BloodDrainConfig {
  COOLDOWN: number;
  ENERGY_COST: number;
  RANGE: number;
  DAMAGE: number;
  HEAL_AMOUNT: number;
  DURATION: number;
  MAX_LEVEL: number;
}

/**
 * Bat Swarm ability configuration
 */
interface BatSwarmConfig {
  COOLDOWN: number;
  ENERGY_COST: number;
  COUNT: number;
  DAMAGE: number;
  SPEED: number;
  MAX_LEVEL: number;
}

/**
 * Shadow Dash ability configuration
 */
interface ShadowDashConfig {
  COOLDOWN: number;
  ENERGY_COST: number;
  DISTANCE: number;
  DAMAGE: number;
  INVULNERABILITY_TIME: number;
  MAX_LEVEL: number;
}

/**
 * Blood Lance ability configuration
 */
interface BloodLanceConfig {
  UNLOCKED: boolean;
  COOLDOWN: number;
  ENERGY_COST: number;
  DAMAGE: number;
  PIERCE: number;
  HEAL_AMOUNT: number;
  SPEED: number;
  MAX_LEVEL: number;
  UNLOCK_LEVEL: number;
}

/**
 * Night Shield ability configuration
 */
interface NightShieldConfig {
  UNLOCKED: boolean;
  COOLDOWN: number;
  ENERGY_COST: number;
  SHIELD_AMOUNT: number;
  DURATION: number;
  EXPLOSION_DAMAGE: number;
  EXPLOSION_RANGE: number;
  MAX_LEVEL: number;
  UNLOCK_LEVEL: number;
}

/**
 * UI skill menu configuration
 */
interface UISkillMenuConfig {
  BLOOD_LANCE_UNLOCK_COST: number;
  NIGHT_SHIELD_UNLOCK_COST: number;
  UPGRADE_COST: number;
}

/**
 * All abilities configuration
 */
interface AbilitiesConfig {
  AUTO_ATTACK: AutoAttackConfig;
  BLOOD_DRAIN: BloodDrainConfig;
  BAT_SWARM: BatSwarmConfig;
  SHADOW_DASH: ShadowDashConfig;
  BLOOD_LANCE: BloodLanceConfig;
  NIGHT_SHIELD: NightShieldConfig;
}

/**
 * UI configuration
 */
interface UIConfig {
  SKILL_MENU: UISkillMenuConfig;
}

/**
 * Complete game configuration
 */
interface GameConfig {
  GAME_WIDTH: number;
  GAME_HEIGHT: number;
  SPAWN_RATE: number;
  PLAYER: PlayerConfig;
  ENEMY: EnemyConfig;
  LEVEL: LevelConfig;
  ABILITIES: AbilitiesConfig;
  UI: UIConfig;
}

/**
 * Game Configuration
 * Contains all constants and default values for the game
 */
export const CONFIG: GameConfig = {
  // Game settings
  GAME_WIDTH: window.innerWidth,
  GAME_HEIGHT: window.innerHeight,
  SPAWN_RATE: 2000, // ms between enemy spawns

  // Player settings
  PLAYER: {
    WIDTH: 30,
    HEIGHT: 40,
    SPEED: 5,
    MAX_HEALTH: 100,
    MAX_ENERGY: 100,
    ENERGY_REGEN: 10, // Increased from 0.2 to match original implementation
    ATTACK_COOLDOWN: 350, // ms
    PROJECTILE_SPEED: 8,
    MANUAL_PROJECTILE_DAMAGE: 25,
  },

  // Enemy settings
  ENEMY: {
    // Base enemy settings
    BASE: {
      WIDTH: 25,
      HEIGHT: 25,
      BASE_HEALTH: 50,
      BASE_DAMAGE: 5,
    },
    // Vampire Hunter settings
    VAMPIRE_HUNTER: {
      WIDTH: 25, // Using base values
      HEIGHT: 25,
      BASE_HEALTH: 50,
      BASE_DAMAGE: 5,
      PROJECTILE_COOLDOWN: 2000, // 2 seconds between shots
      PROJECTILE_SPEED: 6,
      PROJECTILE_DAMAGE_MULTIPLIER: 1.5, // Projectiles do more damage than base
      DETECTION_RADIUS: 350, // Detection range
      PREFERRED_DISTANCE: 250, // Tries to maintain this distance from player
    },
    // Fast Swarmer settings
    FAST_SWARMER: {
      WIDTH: 25, // Base values before applying multiplier
      HEIGHT: 25,
      BASE_HEALTH: 5,
      BASE_DAMAGE: 1,
      SIZE_MULTIPLIER: 0.7, // Smaller than base enemies
      SPEED_MULTIPLIER: 2.2, // Much faster than base enemies
      HEALTH_MULTIPLIER: 0.4, // Less health than base enemies
      DAMAGE_MULTIPLIER: 0.6, // Less damage than base enemies
      DODGE_CHANCE: 0.15, // 15% base chance to dodge
      BURST_SPEED_MULTIPLIER: 2.5, // Speed burst multiplier
    },
    // Tanky Brute settings
    TANKY_BRUTE: {
      WIDTH: 25, // Base values before applying multiplier
      HEIGHT: 25,
      BASE_HEALTH: 50,
      BASE_DAMAGE: 5,
      SIZE_MULTIPLIER: 1.8, // Much larger than base enemies
      HEALTH_MULTIPLIER: 4.0, // Much more health than base enemies
      DAMAGE_MULTIPLIER: 2.0, // Much more damage than base enemies
      SPEED_MULTIPLIER: 0.5, // Much slower than base enemies
      DAMAGE_REDUCTION: 0.4, // Reduces damage taken by 40%
      SLAM_ATTACK_COOLDOWN: 5000, // 5 seconds between slam attacks
      SLAM_ATTACK_RADIUS: 120, // Area affect radius
      SLAM_ATTACK_DAMAGE_MULTIPLIER: 1.5, // Slam attack damage multiplier
      BLOOD_LANCE_VULNERABILITY_MULTIPLIER: 1.5, // Takes extra damage from Blood Lance
    },
    // Spawn rate settings
    SPAWN_RATES: {
      HUNTER_SPAWN_RATE: 7000, // 7 seconds between hunter spawns
      SWARM_SPAWN_RATE: 12000, // 12 seconds between swarm spawns
      BASE_SWARM_SIZE: 3, // Base number of enemies per swarm
    }
  },

  // Leveling system
  LEVEL: {
    KILLS_FOR_LEVELS: [
      0, 10, 22, 36, 52, 70, 90, 112, 136, 162, 190, 220, 252, 286, 322,
    ],
    KILLS_INCREASE_PER_LEVEL: 4,
  },

  // Ability settings
  ABILITIES: {
    AUTO_ATTACK: {
      ENABLED: true,
      COOLDOWN: 800, // ms
      DAMAGE: 15,
      RANGE: 300,
      MAX_LEVEL: 5,
    },
    BLOOD_DRAIN: {
      COOLDOWN: 8000, // ms
      ENERGY_COST: 30,
      RANGE: 150,
      DAMAGE: 50,
      HEAL_AMOUNT: 25,
      DURATION: 5000, // ms
      MAX_LEVEL: 5,
    },
    BAT_SWARM: {
      COOLDOWN: 8000, // ms
      ENERGY_COST: 40,
      COUNT: 24,
      DAMAGE: 2000,
      SPEED: 6,
      MAX_LEVEL: 5,
    },
    SHADOW_DASH: {
      COOLDOWN: 5000, // ms
      ENERGY_COST: 25,
      DISTANCE: 200,
      DAMAGE: 30,
      INVULNERABILITY_TIME: 500, // ms
      MAX_LEVEL: 5,
    },
    BLOOD_LANCE: {
      UNLOCKED: false,
      COOLDOWN: 12000, // ms
      ENERGY_COST: 50,
      DAMAGE: 150,
      PIERCE: 3,
      HEAL_AMOUNT: 10,
      SPEED: 12,
      MAX_LEVEL: 5,
      UNLOCK_LEVEL: 3,
    },
    NIGHT_SHIELD: {
      UNLOCKED: false,
      COOLDOWN: 15000, // ms
      ENERGY_COST: 60,
      SHIELD_AMOUNT: 100,
      DURATION: 8000, // ms
      EXPLOSION_DAMAGE: 100,
      EXPLOSION_RANGE: 120,
      MAX_LEVEL: 5,
      UNLOCK_LEVEL: 5,
    },
  },

  // UI Settings
  UI: {
    SKILL_MENU: {
      BLOOD_LANCE_UNLOCK_COST: 3,
      NIGHT_SHIELD_UNLOCK_COST: 3,
      UPGRADE_COST: 1,
    },
  },
};

export default CONFIG;