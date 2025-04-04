import { Player } from "../entities/player";
import { setupBossSystem } from './boss-system-integration'; // Removed unused GameBossProperties import
import { fixBossSpawnSystem } from './boss-system-fix';
import { Projectile, ProjectileOptions } from "../entities/projectile";
import { Enemy } from "../entities/enemies/base-enemy";
import { Boss } from "../entities/bosses"; // <-- Import Boss type
import { Drop } from "../entities/drop"; // <-- Import Drop type
import { DropType } from "../types/drop-types"; // <-- Import DropType enum
import { VampireHunter } from "../entities/enemies/vampire-hunter";
import { BasicEnemy } from "../entities/enemies/basic-enemy";
import { GameLoop } from "./game-loop";
import { InputHandler } from "./input-handler";
import { SpawnSystem } from "./spawn-system";
import { UIManager } from "../ui/ui-manager";
import { ParticleSystem } from "./particle-system";
import { LevelSystem } from "./level-system";
import { GameStateManager, defaultStateHandlers } from "./state-manager";
import { GameEvents, EVENTS } from "../utils/event-system";
import CONFIG from "../config";
import { GameState } from "../types/game-types";
import PassiveSkillMenu from "../ui/PassiveSkillMenu";
import { createLogger } from "../utils/logger";
import { ILevelSystem } from "../types/player-types";
import passiveSkillModel from "../models/passive-skill-model";
import stateStore from "./state-store";
import { DOM_IDS, CSS_CLASSES, SELECTORS } from "../constants/dom-elements";

// Create a logger for the Game class
const logger = createLogger('Game');

/**
 * Main Game class that orchestrates all game systems
 */
export class Game {
  // Container
  gameContainer: HTMLElement;

  // Game state
  gameTime: number = 0;
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  drops: Drop[] = []; // <-- Add array to hold active drops

  // Game systems
  gameLoop: GameLoop;
  inputHandler: InputHandler;
  spawnSystem: SpawnSystem;
  particleSystem: ParticleSystem;
  uiManager: UIManager;
  stateManager: GameStateManager;
  levelSystem: LevelSystem;
  passiveSkillMenu: PassiveSkillMenu;
  bossSpawnSystem: any; // Will be initialized by boss-system-integration

  // Player
  player: Player;

  // --- Properties added by Boss Integration ---
  isInBossFight: boolean = false;
  currentBoss: Boss | null = null;
  regularSpawnRateBackup: number = 0;
  // --- End Boss Integration Properties ---
  
  // Kill points that are available for the passive skill tree
  // This is now backed by the state store
  get availableKillPoints(): number { return stateStore.game.availableKillPoints.get(); }
  set availableKillPoints(value: number) { stateStore.game.availableKillPoints.set(value); }

  /**
   * Update projectile movement and check for collisions using the entity lifecycle
   * @param deltaTime - Time since last update in ms
   */
  updateProjectilesLifecycle(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Update projectile using lifecycle method
      projectile.update(deltaTime);

      // Check if projectile is out of bounds
      if (projectile.isOutOfBounds()) {
        projectile.cleanup();
        this.projectiles.splice(i, 1);
        continue;
      }

      let shouldRemoveProjectile = false;

      // Handle enemy projectiles (they only collide with the player)
      if (projectile.isEnemyProjectile) {
        // Check collision with player
        if (
          this.player.isAlive &&
          !this.player.isInvulnerable &&
          projectile.collidesWithPlayer(this.player)
        ) {
          // Create hit effect
          this.particleSystem.createBloodParticles(
            projectile.x,
            projectile.y,
            5
          );

          // Apply damage to player
          this.player.takeDamage(projectile.damage);

          // *** ADD THIS CHECK ***
          if (!this.player.isAlive) {
            this.gameOver();
            // Potentially return or break here if gameOver stops the loop
            // or handles cleanup appropriately. For now, just add the call.
          }
          // *** END ADDED CHECK ***

          // Remove projectile
          shouldRemoveProjectile = true;
        }
      } 
      // Handle player projectiles (they only collide with enemies)
      else {
        // Check collision with enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];

          if (projectile.collidesWith(enemy)) {
            // Create blood particles
            this.particleSystem.createBloodParticles(
              projectile.x,
              projectile.y,
              5
            );

            // Apply damage to enemy and get the damage dealt
            const damageDealt = projectile.damage;
            const enemyDied = enemy.takeDamage(
              damageDealt,
              this.particleSystem.createBloodParticles.bind(this.particleSystem),
              projectile.isBloodLance ? 'bloodLance' : undefined
            );
            
            // Apply life steal if the player has it
            const lifeStealPercentage = this.player.stats.getLifeStealPercentage();
            if (lifeStealPercentage > 0 && !projectile.isEnemyProjectile) {
              const healAmount = damageDealt * (lifeStealPercentage / 100);
              if (healAmount > 0) {
                this.player.heal(healAmount);
              }
            }
            
            if (enemyDied) {
              // Enemy died
              enemy.cleanup(this.player);
              this.enemies.splice(j, 1);

              // Emit enemy death event
              GameEvents.emit(EVENTS.ENEMY_DEATH, enemy);

              // Add kill to player and check for level up
              if (this.levelSystem.addKill()) {
                // Level up was handled by the callback
              }

              // --- Add Drop Chance Logic ---
              if (Math.random() < CONFIG.DROPS.ENEMY_DROP_CHANCE) {
                this.spawnDrop(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
              }
              // --- End Drop Chance Logic ---

            } else {
              // Emit enemy damage event
              GameEvents.emit(EVENTS.ENEMY_DAMAGE, enemy, projectile.damage);
            }

            // Handle Blood Lance special behavior
            if (projectile.isBloodLance) {
              shouldRemoveProjectile = projectile.handleBloodLanceHit(
                enemy,
                this.player.heal.bind(this.player)
              );
            } else {
              // Regular projectile or auto-attack - remove after hitting
              shouldRemoveProjectile = true;
            }

            // Break loop for non-piercing projectiles
            if (shouldRemoveProjectile && !projectile.isBloodLance) {
              break;
            }
          }
        }
      }

      // Remove projectile if needed
      if (shouldRemoveProjectile) {
        projectile.cleanup();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Create a new game
   * @param gameContainer - DOM element containing the game
   */
  constructor(gameContainer: HTMLElement) {
    this.gameContainer = gameContainer;

    // Update state store with game state
    stateStore.game.state.set(GameState.LOADING);

    // Create game systems
    this.gameLoop = new GameLoop();
    this.inputHandler = new InputHandler(this);
    this.spawnSystem = new SpawnSystem(this.gameContainer);
    // Set game reference for the spawn system so it can add enemies
    this.spawnSystem.setGameReference(this);
    this.particleSystem = new ParticleSystem(this.gameContainer);

    // Create player
    this.player = new Player(this.gameContainer, this);

    // Create level system
    this.levelSystem = new LevelSystem(this.player);
    this.player.setLevelSystem(this.levelSystem);
    // Create state manager
    this.stateManager = new GameStateManager(this);
    this.stateManager.registerStates(defaultStateHandlers);

    // Register level up handler
    this.levelSystem.onLevelUp((_level) => {
      this.player.skillPoints++;
      this.handleLevelUp();
    });

    // Create UI manager (after player is created)
    this.uiManager = new UIManager(this);

    // Create passive skill menu
    this.passiveSkillMenu = new PassiveSkillMenu(this);

    // Initialize ability UI
    this.player.abilityManager.initializeUI();

    // Initialize boss system
    setupBossSystem(this);

    // Initialize event listeners
    this.initializeEventListeners();

    // Add world border element
    this.createWorldBorder();
  }

  /**
   * Initialize game event listeners
   */
  initializeEventListeners(): void {
    // Listen for game state events
    GameEvents.once(EVENTS.GAME_INIT, () => {
      logger.info("Game initialized");
    });
    
    // Listen for enemy summon events (used by Vampire Scout)
    GameEvents.on(EVENTS.ENEMY_SUMMON, (data) => {
      this.handleEnemySummon(data);
    });

    // Emit game initialized event
    GameEvents.emit(EVENTS.GAME_INIT, this);
  }
  
  /**
   * Handle enemy summon event from Vampire Scout
   * @param data - Summon data with position, count, and types
   */
  handleEnemySummon(data: any): void {
    if (!data || !data.position || !data.count) {
      logger.warn('Invalid enemy summon data received:', data);
      return;
    }
    
    logger.info(`Enemy summon event: Spawning ${data.count} enemies near position (${data.position.x}, ${data.position.y})`);
    
    // Get player level for proper enemy scaling
    const playerLevel = this.player?.level ?? 1;
    
    // Get enemy types to spawn (default to basic enemies if not specified)
    const enemyTypes = data.types || ['basic'];
    
    // Calculate spawn radius (default to 50 if not specified)
    const spawnRadius = data.spawnRadius || 50;
    
    // Spawn the requested number of enemies
    for (let i = 0; i < data.count; i++) {
      // Calculate a random position within the spawn radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * spawnRadius;
      const x = data.position.x + Math.cos(angle) * distance;
      const y = data.position.y + Math.sin(angle) * distance;
      
      // Create enemy based on the type (currently only basic type is implemented)
      let enemy: Enemy;
      
      if (enemyTypes.includes('basic')) {
        enemy = new BasicEnemy(this.gameContainer, playerLevel);
      } else {
        // Default to basic enemy if type is not recognized
        enemy = new BasicEnemy(this.gameContainer, playerLevel);
      }
      
      // Set enemy position
      enemy.x = x;
      enemy.y = y;
      enemy.updatePosition();
      
      // Initialize and add to game
      enemy.initialize();
      this.enemies.push(enemy);
      
      // Emit spawn event
      GameEvents.emit(EVENTS.ENEMY_SPAWN, enemy, 'summonedEnemy');
    }
    
    // Create a visual effect for the summoning
    this.createSummonEffect(data.position.x, data.position.y, spawnRadius);
  }
  
  /**
   * Create visual effect for enemy summoning
   * @param x - Center X coordinate
   * @param y - Center Y coordinate
   * @param radius - Radius of the effect
   */
  createSummonEffect(x: number, y: number, radius: number): void {
    // Create a circular pulse effect
    const effect = document.createElement('div');
    effect.className = 'summon-pulse-effect';
    effect.style.position = 'absolute';
    effect.style.left = (x - radius) + 'px';
    effect.style.top = (y - radius) + 'px';
    effect.style.width = (radius * 2) + 'px';
    effect.style.height = (radius * 2) + 'px';
    effect.style.borderRadius = '50%';
    effect.style.backgroundColor = 'rgba(128, 0, 128, 0.2)';
    effect.style.border = '2px solid rgba(128, 0, 128, 0.5)';
    effect.style.boxShadow = '0 0 15px rgba(128, 0, 128, 0.3)';
    effect.style.zIndex = '5';
    effect.style.animation = 'summon-pulse 1s forwards';
    
    this.gameContainer.appendChild(effect);
    
    // Add animation to the styles if it doesn't exist
    if (!document.getElementById('summon-pulse-animation')) {
      const style = document.createElement('style');
      style.id = 'summon-pulse-animation';
      style.textContent = `
        @keyframes summon-pulse {
          0% { transform: scale(0.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove after animation completes
    setTimeout(() => {
      if (effect.parentNode) {
        effect.parentNode.removeChild(effect);
      }
    }, 1000);
  }

  /**
   * Start the game
   */
  start(): void {
    // Start in the playing state
    this.stateManager.changeState(GameState.PLAYING);

    // Update state store
    stateStore.game.isRunning.set(true);
    stateStore.game.state.set(GameState.PLAYING);
    
    // Start the game loop
    this.gameLoop.start(this.update.bind(this));

    // Emit game started event
    GameEvents.emit(EVENTS.GAME_START, this);
  }

  /**
   * Main update function called each frame
   * @param deltaTime - Time since last update in ms
   */
  update(deltaTime: number): void {
    // Update game time
    this.gameTime += deltaTime;

    // Update player using lifecycle method
    this.player.update(deltaTime, this.inputHandler.getKeys());

    // Update abilities
    this.player.abilityManager.update(deltaTime, this.enemies);

    // --- MODIFIED SECTION: Prevent regular spawns during boss fights ---
    // Spawn enemies only if not in a boss fight
    if (!this.isInBossFight) { // <-- Added condition
      const playerLevel = this.player?.level ?? 1; // Handle potentially undefined level
      const newEnemy = this.spawnSystem.update(this.gameTime, playerLevel);
      if (newEnemy) {
        // Initialize the enemy if not already initialized
        if (!newEnemy.isEntityInitialized()) {
          newEnemy.initialize();
        }
        this.enemies.push(newEnemy);

        // Emit enemy spawn event
        GameEvents.emit(EVENTS.ENEMY_SPAWN, newEnemy);
      }
    } // <-- Added closing brace
    // --- END MODIFIED SECTION ---

    // Auto-attack
    this.updateAutoAttack();

    // Update enemies using lifecycle
    this.updateEnemiesLifecycle(deltaTime);

    // Update projectiles using lifecycle
    this.updateProjectilesLifecycle(deltaTime);

    // Update drops using lifecycle
    this.updateDropsLifecycle(deltaTime); // <-- Call new update method

    // Update particles using lifecycle
    this.particleSystem.update(deltaTime);

    // --- Check for Game Over after all updates ---
    // Ensure we only trigger game over once
    if (!this.player.isAlive && this.stateManager.getCurrentState() !== GameState.GAME_OVER) {
      this.gameOver();
      return; // Stop further updates this frame if game is over
    }
    // --- End Game Over Check ---

    // Update UI
    this.uiManager.update();

    // Update state manager
    this.stateManager.update(deltaTime);

    // Update camera scroll to follow player
    this.updateCameraScroll();

    // Update boss system if it exists
    if (this.bossSpawnSystem) {
      console.log(`GAME: Updating boss system at game time ${Math.floor(this.gameTime/1000)}s`);
      const boss = this.bossSpawnSystem.update(this.gameTime, this.player.level);
      if (boss) {
        // Add boss to enemies array
        this.enemies.push(boss);
        console.log(`GAME: Boss added to enemies array`);
      }
    }
  }

  /**
   * Update auto-attack logic
   */
  updateAutoAttack(): void {
    // First check if auto-attack is enabled
    if (!this.player.autoAttack?.enabled) {
      logger.debug('Auto-attack is disabled');
      return;
    }

    const now = Date.now();
    const timeSinceLastFired = now - (this.player.autoAttack?.lastFired ?? 0);
    
    // Get the cooldown directly from the player's auto-attack, don't recalculate it here
    // The attack speed modifiers are already applied to the cooldown value during skill application
    const cooldown = this.player.autoAttack?.cooldown ?? 800; // Default to config value if undefined
    
    logger.debug(`Auto-attack check: Time since last fired: ${timeSinceLastFired}ms, Cooldown: ${cooldown}ms`);

    if (timeSinceLastFired < cooldown) {
      // Not ready to fire yet
      return;
    }

    // Find the closest enemy within range
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;

    for (const enemy of this.enemies) {
      const dx =
        enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2);
      const dy =
        enemy.y + enemy.height / 2 - (this.player.y + this.player.height / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (
        distance < (this.player.autoAttack?.range ?? 0) &&
        distance < closestDistance
      ) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    }

    // If there's an enemy in range, fire at it
    if (closestEnemy) {
      logger.debug(`Firing auto-attack at enemy at distance ${closestDistance}`);
      this.player.fireAutoProjectile(
        closestEnemy,
        this.createProjectile.bind(this)
      );
    } else {
      logger.debug(`No enemies in range for auto-attack`);
    }
  }

  /**
   * Update enemies using the entity lifecycle
   * @param deltaTime - Time since last update in ms
   */
  updateEnemiesLifecycle(deltaTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // --- ADD THIS CHECK ---
      if (!enemy) {
        console.warn(`Enemy at index ${i} is undefined. Skipping update.`);
        // Optionally remove the undefined entry if it's persistent
        // this.enemies.splice(i, 1); 
        continue; // Skip to the next iteration
      }
      // --- END ADDED CHECK ---

      // Check if it's the boss before updating
      const isBoss = enemy instanceof Boss; // Or check specific boss type if needed

      // Update enemy using lifecycle method
      // Special handling for VampireHunter to pass createProjectile function
      if (enemy instanceof VampireHunter) {
        enemy.update(deltaTime, this.player, this.createProjectile.bind(this));
      } else {
        // Pass the current enemies array to all enemy types for coordination
        enemy.update(deltaTime, this.player, this.enemies);
      }

      // Log after boss update
      if (isBoss) {
        // Boss update finished log removed
      }

      // Check for Blood Drain ability affecting this enemy
      const bloodDrain = this.player.abilityManager.getAbility("bloodDrain");
      if (bloodDrain && bloodDrain.isActive()) {
        // Blood Drain is handled in the ability's update method
      }

      // Check if enemy is far out of bounds (cleanup)
      if (enemy.isOutOfBounds()) {
        enemy.cleanup(this.player);
        this.enemies.splice(i, 1);
        continue;
      }

      // Check collision with player
      if (
        this.player.isAlive &&
        !this.player.isInvulnerable &&
        enemy.collidesWithPlayer(this.player)
      ) {
        // We don't need to explicitly register collision here as the
        // enemy.collidesWithPlayer method already handles registration
        
        // Calculate damage amount
        const damageAmount = enemy.damage;

        // Apply damage to player
        if (this.player.takeDamage(damageAmount)) {
          // Create blood particles if damage was applied
          this.particleSystem.createBloodParticles(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2,
            10
          );

          // Check if player died
          if (!this.player.isAlive) {
            this.gameOver();
          }
        }

        // Push enemy back more aggressively to avoid stacking
        const dx =
          enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2);
        const dy =
          enemy.y + enemy.height / 2 - (this.player.y + this.player.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate a stronger push distance (20 pixels minimum)
        const pushDistance = Math.max(20, enemy.width / 2 + this.player.width / 2);
        
        // Apply the push with a minimum distance to prevent stacking
        const pushX = (dx / dist) * pushDistance;
        const pushY = (dy / dist) * pushDistance;
        
        enemy.x += pushX;
        enemy.y += pushY;
        enemy.updatePosition();
      }
    }
  }

  /**
   * Update projectile movement and check for collisions
   */
  updateProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      // Move projectile
      projectile.move();

      // Check if projectile is out of bounds
      if (projectile.isOutOfBounds()) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      let shouldRemoveProjectile = false;

      // Handle enemy projectiles (they only collide with the player)
      if (projectile.isEnemyProjectile) {
        // Check collision with player
        if (
          this.player.isAlive &&
          !this.player.isInvulnerable &&
          projectile.collidesWithPlayer(this.player)
        ) {
          // Create hit effect
          this.particleSystem.createBloodParticles(
            projectile.x,
            projectile.y,
            5
          );

          // Apply damage to player
          this.player.takeDamage(projectile.damage);

          // Remove projectile
          shouldRemoveProjectile = true;
        }
      } 
      // Handle player projectiles (they only collide with enemies)
      else {
        // Check collision with enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];

          if (projectile.collidesWith(enemy)) {
            // Create blood particles
            this.particleSystem.createBloodParticles(
              projectile.x,
              projectile.y,
              5
            );

            // Apply damage to enemy and get the damage dealt
            const damageDealt = projectile.damage;
            const enemyDied = enemy.takeDamage(
              damageDealt,
              this.particleSystem.createBloodParticles.bind(this.particleSystem),
              projectile.isBloodLance ? 'bloodLance' : undefined
            );
            
            // Apply life steal if the player has it
            const lifeStealPercentage = this.player.stats.getLifeStealPercentage();
            if (lifeStealPercentage > 0 && !projectile.isEnemyProjectile) {
              const healAmount = damageDealt * (lifeStealPercentage / 100);
              if (healAmount > 0) {
                this.player.heal(healAmount);
              }
            }
            
            if (enemyDied) {
              // Enemy died
              enemy.destroy(this.player);
              this.enemies.splice(j, 1);

              // Emit enemy death event
              GameEvents.emit(EVENTS.ENEMY_DEATH, enemy);

              // Add kill to player and check for level up
              if (this.levelSystem.addKill()) {
                // Level up was handled by the callback
              }
            } else {
              // Emit enemy damage event
              GameEvents.emit(EVENTS.ENEMY_DAMAGE, enemy, projectile.damage);
            }

            // Handle Blood Lance special behavior
            if (projectile.isBloodLance) {
              shouldRemoveProjectile = projectile.handleBloodLanceHit(
                enemy,
                this.player.heal.bind(this.player)
              );
            } else {
              // Regular projectile or auto-attack - remove after hitting
              shouldRemoveProjectile = true;
            }

            // Break loop for non-piercing projectiles
            if (shouldRemoveProjectile && !projectile.isBloodLance) {
              break;
            }
          }
        }
      }

      // Remove projectile if needed
      if (shouldRemoveProjectile) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Create a new projectile
   * @param options - Projectile options
   * @returns The created projectile
   */
  createProjectile(options: ProjectileOptions): Projectile {
    const projectile = new Projectile(this.gameContainer, options);
    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * Handle player level up
   */
  handleLevelUp(): void {
    // Show level up notification
    this.uiManager.showLevelUp();

    // Update spawn rate
    const playerLevel = this.player.level;
    this.spawnSystem.currentSpawnRate = Math.max(
      500,
      CONFIG.SPAWN_RATE - playerLevel * 200
    );

    // Check for unlockable abilities
    this.player.abilityManager.checkUnlockableAbilities();
    
    // Reset brute spawn count and update for the new level
    this.spawnSystem.updateForLevelChange(playerLevel);
    
    // Debug info
    logger.debug(`Level up handled. New level: ${playerLevel}`);
    logger.debug(`Blood Lance unlock level: ${CONFIG.ABILITIES.BLOOD_LANCE.UNLOCK_LEVEL}`);
    logger.debug(`Night Shield unlock level: ${CONFIG.ABILITIES.NIGHT_SHIELD.UNLOCK_LEVEL}`);

    // Also trigger skill menu to update in case it's open
    if (this.player.showingSkillMenu && this.uiManager.skillMenu) {
      this.uiManager.skillMenu.update();
    }

    // Heal player slightly
    this.player.heal(20);
  }

  /**
   * Game over logic
   */
  gameOver(): void {
    logger.info('Game over - showing passive skill menu');
    this.gameLoop.stop();

    // Store level as passive skill points in state store
    const playerLevel = stateStore.player.level.get();
    stateStore.game.availableKillPoints.set(playerLevel);
    logger.info(`Available passive skill points: ${playerLevel}`);

    // Change to game over state
    this.stateManager.changeState(GameState.GAME_OVER);
    stateStore.game.state.set(GameState.GAME_OVER);
    stateStore.game.isRunning.set(false);

    // Make sure we have the current player and level system with correct kill points
    this.passiveSkillMenu.player = this.player;
    this.passiveSkillMenu.levelSystem = {
      kills: stateStore.game.availableKillPoints.get()
    } as ILevelSystem;
    
    // Force the killPointsDisplay to update even before the menu is reopened
    const skillPointsElement = document.getElementById(DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY);
    if (skillPointsElement) {
      skillPointsElement.textContent = this.availableKillPoints.toString();
    }

    // Make sure the menu exists and force recreation
    const menuOverlay = this.passiveSkillMenu.getMenuOverlay();
    if (menuOverlay) {
      menuOverlay.remove();
      // Null the overlay to force recreation
      this.passiveSkillMenu.resetMenuOverlay();
    }

    // Open passive skill menu
    this.passiveSkillMenu.open();

    // Emit game over event
    GameEvents.emit(EVENTS.GAME_OVER, this);
  }

  /**
   * Restart the game
   */
  restart(): void {
    logger.info('Restarting game...');
    
    // Reset game state in store
    stateStore.game.time.set(0);
    stateStore.game.isRunning.set(true);
    stateStore.game.isPaused.set(false);
    stateStore.game.state.set(GameState.PLAYING);
    
    // First, clean up all existing event listeners
    this.cleanupEventListeners();
    
    // Deactivate all abilities before cleanup
    if (this.player && this.player.abilityManager) {
      const abilities = this.player.abilityManager.abilities;
      for (const ability of abilities.values()) {
        if (ability.isActive()) {
          if (typeof ability.deactivate === 'function') {
            ability.deactivate();
          } else {
            ability.active = false;
          }
        }
      }
    }

    // Clean up existing entities
    this.cleanupEntities();

    // Reset player
    if (this.player) {
      this.player.cleanup();
    }
    this.player = new Player(this.gameContainer, this);
    // Player is already initialized in its constructor
    logger.debug('New player created. Auto-attack enabled:', this.player.autoAttack.enabled);
    logger.debug('Auto-attack cooldown:', this.player.autoAttack.cooldown);

    // Reset level system
    this.levelSystem = new LevelSystem(this.player);
    
    // Reset state store
    stateStore.player.level.set(1);
    stateStore.player.skillPoints.set(0);
    stateStore.levelSystem.level.set(1);
    stateStore.levelSystem.kills.set(0);

    // Register level up handler for the new level system
    this.levelSystem.onLevelUp((_level) => {
      this.player.skillPoints++;
      this.handleLevelUp();
    });

    // Apply purchased passive skills - make sure this is called after player is created
    logger.debug('Forcefully applying passive skills during restart');
    this.applyPurchasedPassiveSkills();
    this.logPlayerStats();
    
    // Also ensure that saved values are loaded and reapplied
    this.passiveSkillMenu.loadSavedSkills();

    // Initialize player abilities
    this.player.abilityManager.initializeUI();

    // Reset game systems
    this.gameTime = 0;
    this.spawnSystem.reset();
    this.particleSystem.reset();
    
    // Reset boss system
    if (this.bossSpawnSystem) {
      console.log('GAME: Resetting boss system during restart');
      this.bossSpawnSystem.reset();
      // Reapply fixes to ensure correct timing
      fixBossSpawnSystem(this.bossSpawnSystem);
    }

    // Update UI manager with new player reference
    if (this.uiManager) {
      this.uiManager.player = this.player;
      
      // Update stats display with new player reference
      if (this.uiManager.statsDisplay) {
        this.uiManager.statsDisplay.player = this.player;
      }
      
      // Update ability bar with new ability manager
      if (this.uiManager.abilityBar) {
        this.uiManager.abilityBar.abilityManager = this.player.abilityManager;
      }
    }

    // Reset UI
    this.uiManager.reset();

    // Reset passive skill menu
    this.passiveSkillMenu.reset();

    // Force an immediate UI update
    this.uiManager.update();

    // Start game loop
    this.gameLoop.start(this.update.bind(this));

    // Emit game restart event
    GameEvents.emit(EVENTS.GAME_RESTART, this);
  }

  /**
   * Apply purchased passive skills to the player
   */
  applyPurchasedPassiveSkills(): void {
    // Get passive skill values from the model instead of DOM
    logger.debug('Applying purchased passive skills to player');
    
    // Apply damage skill
    const damageValue = passiveSkillModel.getSkillValue('increased-attack-damage');
    // Make sure damage percentage cannot be negative
    const damagePercent = Math.max(0, damageValue / 100);
    // Apply attack power bonus - default is 1, add percentage bonus
    const attackPower = 1 + damagePercent;
    
    this.player.stats.setAttackPower(attackPower);
    logger.debug(`Applied attack power: ${attackPower} (${damageValue}% bonus)`);
    
    // Update state store
    stateStore.player.attackPower.set(attackPower);
    
// Apply speed skill
const speedValue = passiveSkillModel.getSkillValue('increased-attack-speed');
// Make sure speed percentage cannot be negative
const speedPercent = Math.max(0, speedValue / 100);
// Apply attack speed multiplier - default is 1, add percentage bonus
const multiplier = 1 + speedPercent;

this.player.stats.setAttackSpeedMultiplier(multiplier);
logger.debug(`Applied attack speed multiplier: ${multiplier} (${speedValue}% bonus)`);

// Update state store
stateStore.player.attackSpeed.set(multiplier);

// Also adjust the auto attack cooldown directly
if (this.player.autoAttack) {
  // Store the original cooldown if not already stored
  if (!this.player.autoAttack.originalCooldown) {
    this.player.autoAttack.originalCooldown = CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN;
  }
  const originalCooldown = this.player.autoAttack.originalCooldown;
  
  // Apply the speed multiplier to reduce cooldown - DIVIDE by multiplier
  // Use a minimum cooldown value to prevent it from becoming too fast
  const newCooldown = Math.max(100, originalCooldown / multiplier);
  this.player.autoAttack.cooldown = newCooldown;
  
  // Reset the lastFired timestamp to allow immediate firing
  this.player.autoAttack.lastFired = 0;
  
  logger.debug(`Applied speed boost: Original cooldown: ${originalCooldown}ms, New cooldown: ${newCooldown}ms, Multiplier: ${multiplier}`);
}

// Apply life steal skill
const lifeStealValue = passiveSkillModel.getSkillValue('life-steal');
// Make sure life steal percentage cannot be negative
const lifeStealPercentage = Math.max(0, lifeStealValue);

this.player.stats.setLifeStealPercentage(lifeStealPercentage);
logger.debug(`Applied life steal percentage: ${lifeStealPercentage}%`);

// Update state store
stateStore.player.lifeSteal.set(lifeStealPercentage);

// Log the final stats
this.logPlayerStats();
}

/**
* Toggle the skill menu
*/
toggleSkillMenu(): void {
this.uiManager.toggleSkillMenu();
}

/**
* Toggle game pause
*/
togglePause(): void {
if (this.player.showingSkillMenu) {
  // Don't toggle pause if skill menu is open
  return;
}

this.gameLoop.togglePause(this.gameContainer);

// Emit appropriate event
if (this.gameLoop.gamePaused) {
  GameEvents.emit(EVENTS.GAME_PAUSE, this);
} else {
  GameEvents.emit(EVENTS.GAME_RESUME, this);
}
}

/**
* Upgrade a skill
* @param skillId - ID of the skill to upgrade
*/
upgradeSkill(skillId: string): void {
// Check if player has skill points
if ((this.player.skillPoints ?? 0) <= 0) {
  return;
}

let pointCost = CONFIG.UI.SKILL_MENU.UPGRADE_COST;
let upgraded = false;

// Handle different skills
if (skillId === "autoAttack") {
  // Auto attack upgrade
  const autoAttack = this.player.autoAttack;
  if (autoAttack && autoAttack.level < autoAttack.maxLevel) {
    autoAttack.level++;
    autoAttack.damage += 10; // +10 damage per level
    autoAttack.cooldown = Math.max(
      300,
      autoAttack.cooldown - 100
    ); // -100ms cooldown (min 300ms)
    autoAttack.range += 30; // +30 range per level
    upgraded = true;
  }
} else if (skillId === "bloodLance") {
  // Blood Lance unlock/upgrade
  const bloodLance = this.player.abilityManager.getAbility("bloodLance");
  const playerLevel = this.player?.level ?? 0;

  if (
    bloodLance &&
    !bloodLance.unlocked &&
    playerLevel >= CONFIG.ABILITIES.BLOOD_LANCE.UNLOCK_LEVEL
  ) {
    // Unlock ability
    pointCost = CONFIG.UI.SKILL_MENU.BLOOD_LANCE_UNLOCK_COST;
    upgraded = this.player.abilityManager.unlockAbility("bloodLance");
    
    // No UI initialization here - handled by AbilityManager
  } else if (bloodLance && bloodLance.unlocked) {
    // Upgrade ability
    upgraded = this.player.abilityManager.upgradeAbility("bloodLance");
  }
} else if (skillId === "nightShield") {
  // Night Shield unlock/upgrade
  const nightShield = this.player.abilityManager.getAbility("nightShield");
  const playerLevel = this.player?.level ?? 0;

  if (
    nightShield &&
    !nightShield.unlocked &&
    playerLevel >= CONFIG.ABILITIES.NIGHT_SHIELD.UNLOCK_LEVEL
  ) {
    // Unlock ability
    pointCost = CONFIG.UI.SKILL_MENU.NIGHT_SHIELD_UNLOCK_COST;
    upgraded = this.player.abilityManager.unlockAbility("nightShield");
    
    // No UI initialization here - handled by AbilityManager
  } else if (nightShield && nightShield.unlocked) {
    // Upgrade ability
    upgraded = this.player.abilityManager.upgradeAbility("nightShield");
  }
} else {
  // Regular ability upgrade
  upgraded = this.player.abilityManager.upgradeAbility(skillId);
}

// Deduct skill points if upgrade was successful
if (upgraded) {
  this.player.skillPoints -= pointCost;

  // Emit ability upgraded event
  GameEvents.emit(EVENTS.ABILITY_UPGRADE, skillId, this.player);
}
}

/**
* Check if the game is currently running
* @returns Whether the game is running
*/
isRunning(): boolean {
return stateStore.game.isRunning.get();
}

/**
* Get the current game state
* @returns Current game state
*/
getState(): GameState {
return this.stateManager.getCurrentState();
}

/**
* Log player stats for debugging
*/
logPlayerStats(): void {
logger.group('CURRENT PLAYER STATS');
logger.info(`Attack Power: ${this.player.stats.getAttackPower()}`);
logger.info(`Attack Speed Multiplier: ${this.player.stats.getAttackSpeedMultiplier()}`);
logger.info(`Life Steal Percentage: ${this.player.stats.getLifeStealPercentage()}%`);
if (this.player.autoAttack) {
  logger.info(`Auto Attack Cooldown: ${this.player.autoAttack.cooldown}ms`);
  logger.info(`Auto Attack Enabled: ${this.player.autoAttack.enabled}`);
}
logger.groupEnd();
}

/**
* Clean up event listeners to prevent memory leaks
*/
cleanupEventListeners(): void {
// No need to unsubscribe from one-time events (GAME_INIT)
// But we should unsubscribe from any events we've subscribed to

// Remove all game-related events to prevent leaks
GameEvents.removeAllListeners(EVENTS.GAME_START);
GameEvents.removeAllListeners(EVENTS.GAME_OVER);
GameEvents.removeAllListeners(EVENTS.GAME_PAUSE);
GameEvents.removeAllListeners(EVENTS.GAME_RESUME);
GameEvents.removeAllListeners(EVENTS.GAME_RESTART);
GameEvents.removeAllListeners(EVENTS.ENEMY_SUMMON);

logger.debug('Cleaned up all game event listeners');
}

/**
* Clean up all game entities
*/
cleanupEntities(): void {
logger.info('Cleaning up all game entities');

// Clean up enemies
for (const enemy of this.enemies) {
  enemy.cleanup();
}
this.enemies = [];

// Clean up projectiles
for (const projectile of this.projectiles) {
  projectile.cleanup();
}
  this.projectiles = [];

  // Clean up drops
  for (const drop of this.drops) {
    drop.cleanup();
  }
  this.drops = [];

  // Clean up particles
  this.particleSystem.reset();

// Clean up passive skill menu
if (this.passiveSkillMenu) {
  this.passiveSkillMenu.destroy();
}

// Clean up any DOM elements that might have been missed
const bloodNovas = document.querySelectorAll(SELECTORS.class(CSS_CLASSES.GAME.BLOOD_NOVA));
bloodNovas.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

const bloodDrainAOEs = document.querySelectorAll(SELECTORS.class(CSS_CLASSES.GAME.BLOOD_DRAIN_AOE));
bloodDrainAOEs.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

const bats = document.querySelectorAll(SELECTORS.class(CSS_CLASSES.GAME.BAT));
bats.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

const shadowTrails = document.querySelectorAll(SELECTORS.class(CSS_CLASSES.GAME.SHADOW_TRAIL));
shadowTrails.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

const bloodParticles = document.querySelectorAll(SELECTORS.class(CSS_CLASSES.GAME.BLOOD_PARTICLE));
bloodParticles.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

// Clean up summon effects if any
const summonEffects = document.querySelectorAll('.summon-pulse-effect');
summonEffects.forEach(element => {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
});

logger.debug('Cleaned up all game entities');
}

/**
* Perform complete cleanup of all game resources
* Call this when the game is completely destroyed (e.g., page unload)
*/
dispose(): void {
logger.info('Disposing game...');

// Stop the game loop
this.gameLoop.stop();

// Clean up event listeners
this.cleanupEventListeners();

// Clean up entities
this.cleanupEntities();

// Clean up player separately to ensure it's properly handled
if (this.player) {
  this.player.cleanup();
}

// Remove all events to prevent memory leaks
    GameEvents.removeAllListeners();

    logger.info('Game completely disposed');
  }

  /**
   * Creates a visible border element representing the world boundaries.
   */
  createWorldBorder(): void {
    const border = document.createElement('div');
    border.style.position = 'absolute';
    border.style.left = '0px';
    border.style.top = '0px';
    border.style.width = `${CONFIG.WORLD_WIDTH}px`;
    border.style.height = `${CONFIG.WORLD_HEIGHT}px`;
    border.style.border = '4px solid white'; // Visible white border
    border.style.boxSizing = 'border-box'; // Include border in size
    border.style.pointerEvents = 'none'; // Prevent interaction
    border.style.zIndex = '-1'; // Draw behind entities
    this.gameContainer.appendChild(border);
    logger.info('World border created.');
  }

  /**
   * Updates the scroll position of the game container to follow the player.
   */
  updateCameraScroll(): void {
    if (!this.player || !this.gameContainer) return;

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const containerWidth = this.gameContainer.clientWidth;
    const containerHeight = this.gameContainer.clientHeight;

    // Calculate desired scroll position to center the player
    let targetScrollLeft = playerCenterX - containerWidth / 2;
    let targetScrollTop = playerCenterY - containerHeight / 2;

    // Clamp scroll position to world boundaries
    const maxScrollLeft = CONFIG.WORLD_WIDTH - containerWidth;
    const maxScrollTop = CONFIG.WORLD_HEIGHT - containerHeight;

    targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));
    targetScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));

    // Apply the scroll position
    this.gameContainer.scrollLeft = targetScrollLeft;
    this.gameContainer.scrollTop = targetScrollTop;
  }

  /**
   * Spawns a random weapon drop at the specified location.
   * @param x - The X coordinate for the drop.
   * @param y - The Y coordinate for the drop.
   */
  spawnDrop(x: number, y: number): void {
    const dropTypes = Object.values(DropType);
    const randomType = dropTypes[Math.floor(Math.random() * dropTypes.length)];

    const drop = new Drop(this.gameContainer, randomType, x, y);
    this.drops.push(drop);
    logger.info(`Spawned drop: ${randomType} at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    // Optionally emit an event: GameEvents.emit(EVENTS.DROP_SPAWN, drop);
  }

  /**
   * Updates active drops, checking for player collision.
   * @param deltaTime - Time since the last frame.
   */
  updateDropsLifecycle(deltaTime: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.update(deltaTime); // Update drop (e.g., animation)

      // Check for collision with player
      if (this.player.isAlive && drop.collidesWithPlayer(this.player)) {
        logger.info(`Player picked up drop: ${drop.type}`);
        this.player.pickupDrop(drop.type); // Notify player
        drop.cleanup(); // Remove drop element
        this.drops.splice(i, 1); // Remove from active drops array
        // Optionally emit event: GameEvents.emit(EVENTS.PLAYER_PICKUP_DROP, drop.type);
      }

      // TODO: Add logic for drop timeout/despawn?
    }
  }
}

export default Game;
