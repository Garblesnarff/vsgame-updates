import { 
  Enemy, 
  BasicEnemy,
  VampireHunter, 
  FastSwarmer, 
  TankyBrute 
} from "../entities/enemies";
import CONFIG from "../config";
import { GameEvents, EVENTS } from "../utils/event-system";

/**
 * Enemy spawn system
 * Manages the spawning of enemies based on game time and player level
 */
export class SpawnSystem {
  gameContainer: HTMLElement;
  lastSpawnTime: number;
  lastSwarmSpawnTime: number;
  lastHunterSpawnTime: number;
  baseSpawnRate: number;
  currentSpawnRate: number;
  hunterSpawnRate: number;
  swarmSpawnRate: number;
  swarmSize: number;
  bruteSpawnLevels: number[];
  bruteSpawnCount: Map<number, number>;
  spawnedBrutesCount: number;
  game: any; // Reference to the game object for adding enemies

  /**
   * Create a new spawn system
   * @param gameContainer - DOM element for the game container
   * @param game - Reference to the game object
   */
  constructor(gameContainer: HTMLElement, game?: any) {
    this.gameContainer = gameContainer;
    this.game = game;
    this.lastSpawnTime = 0;
    this.lastSwarmSpawnTime = 0;
    this.lastHunterSpawnTime = 0;
    this.baseSpawnRate = CONFIG.SPAWN_RATE;
    this.currentSpawnRate = this.baseSpawnRate;
    
    // Special enemy spawn timers
    this.hunterSpawnRate = CONFIG.ENEMY.SPAWN_RATES.HUNTER_SPAWN_RATE;
    this.swarmSpawnRate = CONFIG.ENEMY.SPAWN_RATES.SWARM_SPAWN_RATE;
    this.swarmSize = CONFIG.ENEMY.SPAWN_RATES.BASE_SWARM_SIZE;

    // Brute spawn levels (every 5 levels starting at 5)
    this.bruteSpawnLevels = [];
    for (let i = 5; i <= 50; i += 5) {
      this.bruteSpawnLevels.push(i);
    }
    
    // Map to track how many brutes should spawn at each level milestone
    this.bruteSpawnCount = new Map();
    this.bruteSpawnLevels.forEach((level, index) => {
      this.bruteSpawnCount.set(level, Math.floor(index / 2) + 1); // 1 at level 5, 1 at level 10, 2 at level 15, etc.
    });
    
    // Keep track of brutes already spawned in the current level
    this.spawnedBrutesCount = 0;
  }

  /**
   * Update the spawn system
   * @param gameTime - Current game time
   * @param playerLevel - Current player level
   * @returns Newly spawned enemy or null
   */
  update(gameTime: number, playerLevel: number): Enemy | null {
    // Adjust spawn rates based on player level
    this.currentSpawnRate = Math.max(
      500,
      this.baseSpawnRate - playerLevel * 200
    );
    
    // Adjust swarm spawn rate - make swarms appear more frequently than hunters
    const adjustedSwarmRate = Math.max(8000, this.swarmSpawnRate - playerLevel * 300);
    
    // Check if it's time to spawn a new regular enemy
    if (gameTime - this.lastSpawnTime > this.currentSpawnRate) {
      this.lastSpawnTime = gameTime;
      return this.spawnRegularEnemy(playerLevel);
    }
    
    // Check if it's time to spawn a hunter
    if (gameTime - this.lastHunterSpawnTime > this.hunterSpawnRate) {
      this.lastHunterSpawnTime = gameTime;
      return this.spawnVampireHunter(playerLevel);
    }
    
    // Check if it's time to spawn a swarm - using adjusted rate
    if (gameTime - this.lastSwarmSpawnTime > adjustedSwarmRate) {
      this.lastSwarmSpawnTime = gameTime;
      // Return the first swarmer, the rest will be added in spawnSwarm
      return this.spawnSwarm(playerLevel);
    }
    
    // Check if we need to spawn brutes for the current level
    if (this.shouldSpawnBrute(playerLevel)) {
      this.spawnedBrutesCount++;
      return this.spawnTankyBrute(playerLevel);
    }

    return null;
  }
  
  /**
   * Spawn a regular Enemy
   * @param playerLevel - Current player level
   * @returns Regular enemy
   */
  spawnRegularEnemy(playerLevel: number): Enemy {
    const enemy = new BasicEnemy(this.gameContainer, playerLevel);
    GameEvents.emit(EVENTS.ENEMY_SPAWN, enemy, 'basicEnemy');
    return enemy;
  }
  
  /**
   * Spawn a Vampire Hunter enemy
   * @param playerLevel - Current player level
   * @returns Vampire Hunter enemy
   */
  spawnVampireHunter(playerLevel: number): VampireHunter {
    const hunter = new VampireHunter(this.gameContainer, playerLevel);
    GameEvents.emit(EVENTS.ENEMY_SPAWN, hunter, 'vampireHunter');
    return hunter;
  }
  
  /**
   * Spawn a group of Fast Swarmers in coordinated patterns
   * @param playerLevel - Current level of the player
   * @returns First Fast Swarmer in the group
   */
  spawnSwarm(playerLevel: number): FastSwarmer {
    // Generate a unique swarm ID to group these enemies
    const swarmId = `swarm_${Date.now()}`;
    
    // Calculate swarm size based on player level
    const minSwarmers = 3; // Minimum swarm size
    const actualSwarmSize = Math.max(minSwarmers, this.swarmSize + Math.floor(playerLevel / 3));
    
    console.debug(`Spawning coordinated swarm of ${actualSwarmSize} Fast Swarmers (ID: ${swarmId})`);
    
    // Calculate spawn points around a circle for a more coordinated swarm appearance
    const spawnRadius = 300; // Distance from center point
    const centerX = Math.random() * (CONFIG.GAME_WIDTH - 2 * spawnRadius) + spawnRadius;
    const centerY = Math.random() * (CONFIG.GAME_HEIGHT - 2 * spawnRadius) + spawnRadius;
    
    // Create first swarmer at a position on the circle
    const angle = Math.random() * Math.PI * 2;
    const firstSwarmerX = centerX + Math.cos(angle) * spawnRadius;
    const firstSwarmerY = centerY + Math.sin(angle) * spawnRadius;
    
    // Create first swarmer and manually set position
    const firstSwarmer = new FastSwarmer(this.gameContainer, playerLevel, swarmId);
    firstSwarmer.x = firstSwarmerX;
    firstSwarmer.y = firstSwarmerY;
    firstSwarmer.updatePosition();
    
    GameEvents.emit(EVENTS.ENEMY_SPAWN, firstSwarmer, 'fastSwarmer');
    
    // Create additional swarmers at positions around the circle
    for (let i = 1; i < actualSwarmSize; i++) {
      const spawnDelay = i * 150; // Quicker spawn sequence (150ms between each)
      
      setTimeout(() => {
        // Calculate position around the circle
        const swarmAngle = angle + (i * (2 * Math.PI / actualSwarmSize));
        const swarmX = centerX + Math.cos(swarmAngle) * spawnRadius;
        const swarmY = centerY + Math.sin(swarmAngle) * spawnRadius;
        
        // Create swarmer with the same swarm ID for potential coordination
        const swarmer = new FastSwarmer(this.gameContainer, playerLevel, swarmId);
        swarmer.x = swarmX;
        swarmer.y = swarmY;
        swarmer.updatePosition();
        
        GameEvents.emit(EVENTS.ENEMY_SPAWN, swarmer, 'fastSwarmer');
        
        // Add to the game's enemies array
        if (this.game && this.game.enemies) {
          this.game.enemies.push(swarmer);
        } else {
          console.warn('Game reference unavailable - additional swarmers will not be tracked');
        }
      }, spawnDelay);
    }
    
    return firstSwarmer;
  }
  
  /**
   * Spawn a Tanky Brute enemy
   * @param playerLevel - Current player level
   * @returns Tanky Brute enemy
   */
  spawnTankyBrute(playerLevel: number): TankyBrute {
    const brute = new TankyBrute(this.gameContainer, playerLevel);
    GameEvents.emit(EVENTS.ENEMY_SPAWN, brute, 'tankyBrute');
    return brute;
  }
  
  /**
   * Check if we should spawn a brute at the current level
   * @param playerLevel - Current player level
   * @returns Whether a brute should be spawned
   */
  shouldSpawnBrute(playerLevel: number): boolean {
    // Find the highest milestone level that's less than or equal to current level
    let milestone = -1;
    for (const level of this.bruteSpawnLevels) {
      if (level <= playerLevel && level > milestone) {
        milestone = level;
      }
    }
    
    // If no milestone is applicable
    if (milestone === -1) {
      return false;
    }
    
    // Get how many brutes should spawn at this level
    const brutesNeeded = this.bruteSpawnCount.get(milestone) || 0;
    
    // Spawn if we haven't reached the quota for this level
    return this.spawnedBrutesCount < brutesNeeded;
  }
  
  /**
   * Set the game reference
   * @param game - Game instance
   */
  setGameReference(game: any): void {
    this.game = game;
  }

  /**
   * Update spawn system for level change
   * @param playerLevel - New player level
   */
  updateForLevelChange(playerLevel: number): void {
    // Reset brute counter when level changes to ensure we get fresh spawns
    this.spawnedBrutesCount = 0;
    
    // Emit event about special enemies at this level
    const milestone = this.bruteSpawnLevels.find(level => level === playerLevel);
    if (milestone) {
      const bruteCount = this.bruteSpawnCount.get(milestone) || 0;
      GameEvents.emit(EVENTS.SPAWN_SPECIAL, { 
        type: 'tankyBrute', 
        count: bruteCount,
        level: playerLevel 
      });
    }
  }

  /**
   * Reset the spawn system
   */
  reset(): void {
    this.lastSpawnTime = 0;
    this.lastSwarmSpawnTime = 0;
    this.lastHunterSpawnTime = 0;
    this.currentSpawnRate = this.baseSpawnRate;
    this.spawnedBrutesCount = 0;
  }
}

export default SpawnSystem;