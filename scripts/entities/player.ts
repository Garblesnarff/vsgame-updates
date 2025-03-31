import CONFIG from "../config";
import { AbilityManager } from "../abilities/ability-manager";
import { GameEvents, EVENTS } from "../utils/event-system";
import { Game } from "../game/game";
import { LevelSystem } from "../game/level-system";
import { StatsComponent } from "../ecs/components/StatsComponent";
import { createLogger } from "../utils/logger";
import { IPlayer, AutoAttack, ProjectileOptions } from "../types/player-types";
import { DropType } from "../types/drop-types";
import stateStore from "../game/state-store";
import { BaseEntity } from "./base-entity";
import passiveSkillModel from "../models/passive-skill-model"; // Import passive skill model

// Create a logger for the Player class
const logger = createLogger('Player');

/**
 * Player class representing the main character in the game
 * Implements IPlayer interface for type safety
 */
export class Player extends BaseEntity implements IPlayer {
  // These properties can be computed from the state store but we keep them
  // to maintain interface compatibility and avoid breaking existing code
  get level(): number { return stateStore.player.level.get(); }
  get kills(): number { return stateStore.levelSystem.kills.get(); }

  // Die method that ensures proper death state transition
  die(): void {
    // Only process if actually alive
    if (!this.isAlive) return;

    // Set state to dead
    this.isAlive = false;
    // State store updates isAlive via the setter

    // Add visual death effect
    this.element.classList.add('dead');

    // Emit death event
    GameEvents.emit(EVENTS.PLAYER_DEATH, this);

    console.log("Player death triggered at health: " + this.stats.getHealth()); // Keeping this original log
  }

  // Game reference
  readonly game: Game | null;

  // Position and dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;

  // Stats
  stats: StatsComponent;

  // Progression - linked to state store
  get skillPoints(): number { return stateStore.player.skillPoints.get(); }
  set skillPoints(value: number) { stateStore.player.skillPoints.set(value); }

  // States - linked to state store
  get isAlive(): boolean { return stateStore.player.isAlive.get(); }
  set isAlive(value: boolean) { stateStore.player.isAlive.set(value); }

  get isInvulnerable(): boolean { return stateStore.player.isInvulnerable.get(); }
  set isInvulnerable(value: boolean) { stateStore.player.isInvulnerable.set(value); }

  get showingSkillMenu(): boolean { return stateStore.ui.showingSkillMenu.get(); }
  set showingSkillMenu(value: boolean) { stateStore.ui.showingSkillMenu.set(value); }
  lastDamageTime: number; // Track last damage time for collision cooldown
  private invulnerabilityTimeoutId = 0; // Track invulnerability timeout, default to 0 (invalid ID)

  // Damage handling and collision tracking
  readonly collidingEnemies = new Set<string>(); // Track enemies colliding by ID

  // Attack properties
  lastAttack: number;
  attackCooldown: number;
  projectileSpeed: number;

  // Auto attack settings
  autoAttack: AutoAttack;
  currentDropType: DropType | null = null; // <-- Store the active drop type

  // Abilities
  abilityManager: AbilityManager;

  levelSystem: LevelSystem | null = null;

  // Base stats before passive modifications
  private baseMaxHealth: number;
  private baseSpeed: number;
  private baseAttackCooldown: number; // Manual attack cooldown
  private baseAutoAttackCooldown: number; // Auto attack cooldown

  // Status Effects
  effects: Map<string, number>; // Map effect name to expiry timestamp
  isStunned: boolean;

  // Vampire Scout mark effect
  private vampireScoutMarkActive: boolean = false;
  private energyRegenReductionFactor: number = 1;
  private markTimeoutId: number = 0;
  private energyBlockTimeoutId: number = 0; // Add this line

  /**
   * Create a new player
   * @param gameContainer - DOM element containing the game
   * @param game - Optional Game instance reference
   */
  constructor(gameContainer: HTMLElement, game: Game | null = null) {
    super(gameContainer, 'player', 'div', 'player');
    this.game = game;

    // Position and dimensions
    this.x = CONFIG.WORLD_WIDTH / 2 - CONFIG.PLAYER.WIDTH / 2; // Changed from GAME_WIDTH
    this.y = CONFIG.WORLD_HEIGHT / 2 - CONFIG.PLAYER.HEIGHT / 2; // Changed from GAME_HEIGHT
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;
    this.baseSpeed = CONFIG.PLAYER.SPEED; // Store base speed
    this.speed = this.baseSpeed; // Initialize current speed

    // Stats
    this.baseMaxHealth = CONFIG.PLAYER.MAX_HEALTH; // Store base max health
    this.stats = new StatsComponent({
      health: CONFIG.PLAYER.MAX_HEALTH,
      maxHealth: CONFIG.PLAYER.MAX_HEALTH,
      energy: CONFIG.PLAYER.MAX_ENERGY,
      maxEnergy: CONFIG.PLAYER.MAX_ENERGY,
      energyRegen: CONFIG.PLAYER.ENERGY_REGEN,
      speed: CONFIG.PLAYER.SPEED,
      attackPower: 1, // Default attack power
      defense: 1,     // Default defense
      attackSpeedMultiplier: 1, // Default attack speed multiplier
      lifeStealPercentage: 0,   // Default life steal percentage
    });

    // Initialize state store with initial values
    this.initializeStateStore();

    // States
    this.lastDamageTime = 0; // Initialize last damage time

    // Attack properties
    this.lastAttack = 0;
    this.baseAttackCooldown = CONFIG.PLAYER.ATTACK_COOLDOWN; // Store base cooldown
    this.attackCooldown = this.baseAttackCooldown; // Initialize current cooldown
    this.projectileSpeed = CONFIG.PLAYER.PROJECTILE_SPEED;

    // Auto attack settings
    this.baseAutoAttackCooldown = CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN; // Store base auto attack cooldown
    this.autoAttack = this.createInitialAutoAttack();
    // Note: autoAttack.cooldown will be set by applyPassiveSkillBonuses later

    // Initialize abilities
    this.abilityManager = new AbilityManager(this);

    // Store base config cooldown for rapid fire reset logic
    this.autoAttack.originalCooldown = this.baseAutoAttackCooldown;

    // Initialize status effects
    this.effects = new Map<string, number>();
    this.isStunned = false;

    // Set up the DOM element (already created in BaseEntity constructor)
    this.setupPlayerElement();
    this.updatePosition();

    // Call initialize on the player
    this.initialize();

    // Set up state change handlers
    this.setupStateChangeHandlers();

    // Apply initial passive skill bonuses
    this.applyPassiveSkillBonuses();

    // Listen for passive skill upgrades to re-apply bonuses
    GameEvents.on(EVENTS.PASSIVE_SKILL_UPGRADED, this.applyPassiveSkillBonuses.bind(this));
  }

  /**
   * Initialize the player
   */
  initialize(): void {
    super.initialize();
    logger.debug('Player initialized');
  }

  /**
   * Update player state
   * @param deltaTime - Time since last update in ms
   * @param keys - Current state of keyboard keys
   */
  update(deltaTime: number, keys?: Record<string, boolean>): void {
    super.update(deltaTime);

    // Double-check health vs alive state for consistency
    // This ensures player dies if health is zero but alive state wasn't updated
    if (this.stats.getHealth() <= 0 && this.isAlive) {
      console.log("Inconsistent player state detected in update - fixing");
      this.die();
      return;
    }

    // Don't update if dead
    if (!this.isAlive) return;

    const now = Date.now(); // Define 'now' here

    // Update status effects
    this.updateEffects(now);

    // Log stun status every update
    logger.debug(`Player update - isStunned: ${this.isStunned}`);

    // Move player if keys are provided and not stunned
    if (keys) {
      if (!this.isStunned) {
        this.move(keys);
      } else {
        logger.debug('Player movement blocked by stun.');
      }
    }

    // Regenerate energy
    this.regenerateEnergy(deltaTime);
  }

  /**
   * Initialize the state store with player initial values
   * Extracted method to avoid duplicated state updates
   */
  private initializeStateStore(): void {
    // Update state store with initial stats
    stateStore.player.health.set(this.stats.getHealth());
    stateStore.player.maxHealth.set(this.stats.getMaxHealth());
    stateStore.player.energy.set(this.stats.getEnergy());
    stateStore.player.maxEnergy.set(this.stats.getMaxEnergy());
    stateStore.player.attackPower.set(this.stats.getAttackPower());
    stateStore.player.attackSpeed.set(this.stats.getAttackSpeedMultiplier()); // This will be updated by applyPassiveSkillBonuses
    stateStore.player.lifeSteal.set(this.stats.getLifeStealPercentage()); // This will be updated by applyPassiveSkillBonuses
    stateStore.player.speed.set(this.speed); // Add speed sync
    // stateStore.player.cooldownReduction.set(0); // Add CDR sync (needs state definition)

    // Set initial player state
    stateStore.player.level.set(1);
    stateStore.player.isAlive.set(true);
    stateStore.player.isInvulnerable.set(false);
    stateStore.player.skillPoints.set(0);
  }

  /**
   * Create initial auto attack configuration
   * Extracted method for better organization
   */
  private createInitialAutoAttack(): AutoAttack {
    return {
      enabled: CONFIG.ABILITIES.AUTO_ATTACK.ENABLED,
      cooldown: this.baseAutoAttackCooldown, // Initialize with base, will be updated by applyPassiveSkillBonuses
      originalCooldown: this.baseAutoAttackCooldown, // Store base config value here
      lastFired: 0,
      damage: CONFIG.ABILITIES.AUTO_ATTACK.DAMAGE, // Base damage, modified by attack power later
      range: CONFIG.ABILITIES.AUTO_ATTACK.RANGE,
      level: 1,
      maxLevel: CONFIG.ABILITIES.AUTO_ATTACK.MAX_LEVEL,
    };
  }

  /**
   * Setup player DOM element
   * Makes sure the element has the right class and is added to the container
   */
  private setupPlayerElement(): void {
    // Element class is already set in the constructor via BaseEntity
    // Just make sure it's in the game container
    this.gameContainer.appendChild(this.element);
  }

  /**
   * Calculate dynamic damage cooldown based on player stats and environment
   * As life steal increases or more enemies are present, the cooldown decreases
   * to keep the game challenging regardless of player upgrades
   * @returns cooldown in milliseconds
   */
  private getDynamicDamageCooldown(): number {
    // Base cooldown for collision detection
    const baseCooldown = 100; // ms between damage applications

    // Get life steal percentage
    const lifeStealPct = this.stats.getLifeStealPercentage();

    // Calculate cooldown - scale down as life steal increases
    let cooldown = baseCooldown;

    // For high life steal percentages, reduce cooldown to allow more damage through
    if (lifeStealPct > 50) {
      // Scale down cooldown based on life steal (min 10ms)
      const reductionFactor = Math.min(0.9, (lifeStealPct - 50) / 100);
      cooldown *= (1 - reductionFactor);
    }

    // If many enemies are colliding, reduce cooldown even further
    const enemyCount = this.collidingEnemies.size;
    if (enemyCount > 1) {
      // Scale down cooldown based on number of enemies (minimum 10ms)
      cooldown = Math.max(10, cooldown / Math.sqrt(enemyCount));
    }

    // Note: Life steal percentage is now applied dynamically in applyPassiveSkillBonuses
    logger.debug(`Dynamic damage cooldown: ${cooldown}ms, Enemies: ${enemyCount}, Life steal: ${passiveSkillModel.getSkillValue('life-steal')}%`);
    return cooldown;
  }

  /**
   * Register an enemy collision - called when an enemy begins colliding
   * @param enemy - The enemy that started colliding
   */
  registerEnemyCollision(enemy: any): void {
    if (enemy && enemy.id) {
      this.collidingEnemies.add(enemy.id);
      logger.debug(`Enemy ${enemy.id} registered collision. Total colliding: ${this.collidingEnemies.size}`);
    }
  }

  /**
   * Unregister an enemy collision - called when an enemy stops colliding
   * @param enemy - The enemy that stopped colliding
   */
  unregisterEnemyCollision(enemy: any): void {
    if (enemy && enemy.id && this.collidingEnemies.has(enemy.id)) {
      this.collidingEnemies.delete(enemy.id);
      logger.debug(`Enemy ${enemy.id} unregistered collision. Total colliding: ${this.collidingEnemies.size}`);
    }
  }

  /**
   * Updates player position based on input, respecting arena boundaries during boss fights.
   * @param keys - Current state of keyboard keys
   */
  move(keys: Record<string, boolean>): void {
    // Check if alive AND if stunned (using the existing isStunned property)
    // Note: Original debug logs removed after fixing freeze issue.
    if (!this.isAlive || this.isStunned === true) {
        return; // Stop movement if dead or stunned
    }

    let deltaX = 0;
    let deltaY = 0;

    // Calculate intended movement based on keys
    if (keys["ArrowUp"] || keys["w"]) {
      deltaY -= this.speed;
    }
    if (keys["ArrowDown"] || keys["s"]) {
      deltaY += this.speed;
    }
    if (keys["ArrowLeft"] || keys["a"]) {
      deltaX -= this.speed;
    }
    if (keys["ArrowRight"] || keys["d"]) {
      deltaX += this.speed;
    }

    // Calculate potential next position
    let nextX = this.x + deltaX;
    let nextY = this.y + deltaY;

    // Clamp to game boundaries first
    nextX = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - this.width, nextX)); // Changed from GAME_WIDTH
    nextY = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - this.height, nextY)); // Changed from GAME_HEIGHT

    // Apply the final position (clamped only to game boundaries)
    this.x = nextX;
    this.y = nextY;

    // Update the visual position
    this.updatePosition();
  }

  /**
   * Apply a status effect to the player
   * @param effectName - Name of the effect (e.g., 'stun', 'slow')
   * @param duration - Duration in milliseconds
   */
  applyEffect(effectName: string, duration: number): void {
    const now = Date.now();
    const expiryTime = now + duration;

    // Update or add the effect
    this.effects.set(effectName, expiryTime);

    // Set specific flags based on effect
    if (effectName === 'stun') {
      this.isStunned = true;
      this.element.classList.add('stunned'); // Add visual indicator
      logger.debug(`Player stunned for ${duration}ms`);
    }
    // Add other effects like 'slow' here if needed
  }

  /**
   * Update and clear expired status effects
   * @param now - Current timestamp
   */
  updateEffects(now: number): void {
    for (const [effectName, expiryTime] of this.effects.entries()) {
      if (now >= expiryTime) {
        // Effect expired
        this.effects.delete(effectName);

        // Reset specific flags
        if (effectName === 'stun') {
          this.isStunned = false;
          this.element.classList.remove('stunned'); // Remove visual indicator
          logger.debug('Player stun expired');
        }
        // Reset other effect flags here
      }
    }
  }

  /**
   * Updates the DOM element position
   */
  updatePosition(): void {
    this.element.style.left = this.x + "px";
    this.element.style.top = this.y + "px";
  }

  /**
   * Regenerates energy over time
   */
  regenerateEnergy(deltaTime: number): void {
    // Apply energy regen reduction if marked by Vampire Scout
    const effectiveRegen = this.stats.getEnergyRegen() * this.energyRegenReductionFactor;

    const newEnergy = Math.min(
      this.stats.getMaxEnergy(),
      this.stats.getEnergy() + effectiveRegen * (deltaTime / 1000)
    );

    this.stats.setEnergy(newEnergy);

    // Update state store
    stateStore.player.energy.set(newEnergy);
  }

  /**
   * Player takes damage from an enemy
   * @param amount - Damage amount
   * @returns Whether damage was actually applied (not invulnerable)
   */
  takeDamage(amount: number): boolean {
    const now = Date.now();

    // If player is already dead, ignore further damage
    if (!this.isAlive) {
      return false;
    }

    // Check invulnerability
    if (this.isInvulnerable) {
      return false;
    }

    // Use dynamic damage cooldown based on player stats and situation
    const cooldown = this.getDynamicDamageCooldown();
    if (now - this.lastDamageTime < cooldown) {
      return false;
    }

    // Update last damage time
    this.lastDamageTime = now;

    let damageTaken = amount;

    // Apply defense reduction
    damageTaken = Math.max(1, damageTaken - this.stats.getDefense());

    // Check if Night Shield is active
    const nightShield = this.abilityManager.getAbility("nightShield");
    if (
      nightShield &&
      nightShield.isActive() &&
      nightShield.currentShield > 0
    ) {
      return nightShield.absorbDamage(damageTaken);
    }

    // Calculate new health
    const newHealth = Math.max(0, this.stats.getHealth() - damageTaken);

    // Update stats component
    this.stats.setHealth(newHealth);

    // Update state store
    stateStore.player.health.set(newHealth);

    // Emit damage event
    GameEvents.emit(EVENTS.PLAYER_DAMAGE, damageTaken, this);

    // Force consistency between health value and alive state
    if (newHealth <= 0 && this.isAlive) {
      console.log("Player health at zero - triggering death"); // Keeping this original log
      this.die();
    }

    // Temporary focus test removed
    // if (this.gameContainer) {
    //     this.gameContainer.focus();
    // }

    return true;
  }

  /**
   * Heals the player
   * @param amount - Healing amount
   */
  heal(amount: number): void {
    const oldHealth = this.stats.getHealth();
    const newHealth = Math.min(this.stats.getMaxHealth(), oldHealth + amount);

    // Update stats component
    this.stats.setHealth(newHealth);

    // Update state store
    stateStore.player.health.set(newHealth);

    // Only emit heal event if actually healed
    if (newHealth > oldHealth) {
      GameEvents.emit(EVENTS.PLAYER_HEAL, amount, this);
    }
  }

  /**
   * Fires a projectile toward a target
   * @param targetX - Target X coordinate
   * @param targetY - Target Y coordinate
   * @param createProjectile - Function to create a projectile
   * @returns Whether the projectile was fired
   */
  fireProjectile(
    targetX: number,
    targetY: number,
    createProjectile: (options: ProjectileOptions) => void
  ): boolean {
    const now = Date.now();

    // Check cooldown and energy
    if (now - this.lastAttack < this.attackCooldown || this.stats.getEnergy() < 10) {
      return false;
    }

    // Calculate new energy
    const newEnergy = this.stats.getEnergy() - 10;

    // Update stats component
    this.stats.setEnergy(newEnergy);

    // Update state store
    stateStore.player.energy.set(newEnergy);

    this.lastAttack = now;

    // Calculate direction
    const angle = Math.atan2(
      targetY - (this.y + this.height / 2),
      targetX - (this.x + this.width / 2)
    );

    // Create projectile
    createProjectile({
      x: this.x + this.width / 2,
      y: this.y + this.height / 2,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed,
      damage: CONFIG.PLAYER.MANUAL_PROJECTILE_DAMAGE * this.stats.getAttackPower(), // Apply attack power as a multiplier
      isAutoAttack: false,
    });

    return true;
  }

  /**
   * Fires an auto-attack projectile toward a target
   * @param enemy - Target enemy
   * @param createProjectile - Function to create a projectile
   * @returns Whether the projectile was fired
   */
  fireAutoProjectile(
    enemy: any,
    createProjectile: (options: ProjectileOptions) => void
  ): boolean {
    const now = Date.now();

    // Check cooldown
    const timeSinceLastFired = now - this.autoAttack.lastFired;
    const cooldown = this.autoAttack.cooldown;

    logger.debug(`Attempting to fire auto-projectile. Time since last: ${timeSinceLastFired}ms, Cooldown: ${cooldown}ms`);

    if (timeSinceLastFired < cooldown) {
      return false;
    }

    // Calculate direction
    const targetX = enemy.x + enemy.width / 2;
    const targetY = enemy.y + enemy.height / 2;
    const angle = Math.atan2(
      targetY - (this.y + this.height / 2),
      targetX - (this.x + this.width / 2)
    );

    // --- Modify projectile creation based on currentDropType ---
    const startX = this.x + this.width / 2;
    const startY = this.y + this.height / 2;
    const baseDamage = this.autoAttack.damage * this.stats.getAttackPower(); // Apply attack power as a multiplier

    switch (this.currentDropType) {
      case DropType.MULTI_SHOT: {
        logger.debug(`Firing MULTI_SHOT`);
        const count = CONFIG.DROPS.MULTI_SHOT?.PROJECTILE_COUNT ?? 3;
        const yOffset = CONFIG.DROPS.MULTI_SHOT?.Y_OFFSET ?? 10;
        const angleRad = angle; // Base angle
        const perpendicularAngle = angleRad + Math.PI / 2; // Angle perpendicular to the firing direction

        // Calculate offsets based on the perpendicular angle
        const offsetX = Math.cos(perpendicularAngle) * yOffset;
        const offsetY = Math.sin(perpendicularAngle) * yOffset;

        // Fire center projectile
        createProjectile({
          x: startX,
          y: startY,
          vx: Math.cos(angleRad) * this.projectileSpeed,
          vy: Math.sin(angleRad) * this.projectileSpeed,
          damage: baseDamage,
          isAutoAttack: true,
        });

        // Fire side projectiles (only if count is 3 or more)
        if (count >= 3) {
           createProjectile({ // Offset 1
            x: startX + offsetX,
            y: startY + offsetY,
            vx: Math.cos(angleRad) * this.projectileSpeed,
            vy: Math.sin(angleRad) * this.projectileSpeed,
            damage: baseDamage,
            isAutoAttack: true,
          });
           createProjectile({ // Offset 2
            x: startX - offsetX,
            y: startY - offsetY,
            vx: Math.cos(angleRad) * this.projectileSpeed,
            vy: Math.sin(angleRad) * this.projectileSpeed,
            damage: baseDamage,
            isAutoAttack: true,
          });
        }
        // Add logic for more projectiles if count > 3
        break;
      }

      case DropType.SPREAD_SHOT: {
        logger.debug(`Firing SPREAD_SHOT`);
        const count = CONFIG.DROPS.SPREAD_SHOT?.PROJECTILE_COUNT ?? 5;
        const totalSpreadAngleDeg = CONFIG.DROPS.SPREAD_SHOT?.SPREAD_ANGLE ?? 30;
        const totalSpreadAngleRad = totalSpreadAngleDeg * (Math.PI / 180);
        // Ensure count is at least 2 to avoid division by zero
        const angleStep = count > 1 ? totalSpreadAngleRad / (count - 1) : 0;
        const startAngle = angle - totalSpreadAngleRad / 2;

        for (let i = 0; i < count; i++) {
          // For a single projectile, use the original angle
          const currentAngle = count > 1 ? startAngle + i * angleStep : angle;
          createProjectile({
            x: startX,
            y: startY,
            vx: Math.cos(currentAngle) * this.projectileSpeed,
            vy: Math.sin(currentAngle) * this.projectileSpeed,
            damage: baseDamage,
            isAutoAttack: true,
          });
        }
        break;
      }

      case DropType.RAPID_FIRE:
      default: // Includes null (no drop) and RAPID_FIRE (handled by cooldown change in pickupDrop)
        logger.debug(`Firing default/rapid auto-projectile`);
        createProjectile({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * this.projectileSpeed,
          vy: Math.sin(angle) * this.projectileSpeed,
          damage: baseDamage,
          isAutoAttack: true,
        });
        break;
    }
    // --- End modification ---

    // Update last fired timestamp
    this.autoAttack.lastFired = now;
    return true;
  }

  /**
   * Handles picking up a weapon drop.
   * @param dropType - The type of drop picked up.
   */
  pickupDrop(dropType: DropType): void {
    logger.info(`Picked up drop: ${dropType}`);
    this.currentDropType = dropType;

    // Use baseAutoAttackCooldown and apply passive bonuses dynamically
    const attackSpeedBonus = passiveSkillModel.getSkillValue('increased-attack-speed');
    const cooldownReductionBonus = passiveSkillModel.getSkillValue('cooldown-reduction');

    // Calculate the effective cooldown reduction multiplier (e.g., 10% CDR -> 0.9 multiplier)
    const cdrMultiplier = 1 - (cooldownReductionBonus / 100);
    // Calculate the effective attack speed multiplier (e.g., 10% AS -> 1 / 1.1 multiplier)
    const attackSpeedMultiplier = 1 / (1 + (attackSpeedBonus / 100));

    let finalCooldown = this.baseAutoAttackCooldown * attackSpeedMultiplier * cdrMultiplier;

    // Apply rapid fire multiplier if active
    if (dropType === DropType.RAPID_FIRE) {
      const rapidFireMultiplier = CONFIG.DROPS.RAPID_FIRE?.COOLDOWN_MULTIPLIER ?? 1;
      finalCooldown *= rapidFireMultiplier;
      logger.debug(`Drop pickup: Applied rapid fire multiplier. Base: ${this.baseAutoAttackCooldown}, AS: ${attackSpeedBonus}%, CDR: ${cooldownReductionBonus}%, Final: ${finalCooldown}ms`);
    } else {
      logger.debug(`Drop pickup: Calculated auto-attack cooldown. Base: ${this.baseAutoAttackCooldown}, AS: ${attackSpeedBonus}%, CDR: ${cooldownReductionBonus}%, Final: ${finalCooldown}ms`);
    }

    this.autoAttack.cooldown = Math.max(50, finalCooldown); // Ensure a minimum cooldown

    // Emit an event for UI updates or other systems
    GameEvents.emit(EVENTS.PLAYER_PICKUP_DROP, dropType);
  }

  /**
   * Set up handlers for state changes
   */
  private setupStateChangeHandlers(): void {
    // When player health is updated in the state store, update the UI
    stateStore.player.health.subscribe('player-health-ui', (newHealth) => {
      logger.debug(`Player health updated to ${newHealth}`);
    });

    // When player level changes, update abilities or other mechanics
    stateStore.player.level.subscribe('player-level-abilities', (newLevel) => {
      logger.debug(`Player level updated to ${newLevel}`);

      // Check for unlockable abilities - no need for conditional
      this.abilityManager.checkUnlockableAbilities();
    });
  }

  /**
   * Applies bonuses from passive skills to player stats and properties.
   * Should be called on initialization and whenever a passive skill is upgraded.
   */
  applyPassiveSkillBonuses(): void {
    logger.debug('Applying passive skill bonuses...');

    // --- Get Skill Values ---
    const healthBonus = passiveSkillModel.getSkillValue('increased-health-pool');
    const speedBonus = passiveSkillModel.getSkillValue('increased-movement-speed');
    const damageBonus = passiveSkillModel.getSkillValue('increased-attack-damage');
    const attackSpeedBonus = passiveSkillModel.getSkillValue('increased-attack-speed');
    const lifeStealBonus = passiveSkillModel.getSkillValue('life-steal');
    const cooldownReductionBonus = passiveSkillModel.getSkillValue('cooldown-reduction');

    // --- Calculate Multipliers/Modifiers ---
    const healthMultiplier = 1 + (healthBonus / 100);
    const speedMultiplier = 1 + (speedBonus / 100);
    const damageMultiplier = 1 + (damageBonus / 100);
    // Attack speed bonus reduces cooldown time, so the multiplier is inverse
    const attackSpeedCooldownMultiplier = 1 / (1 + (attackSpeedBonus / 100));
    // Cooldown reduction bonus reduces cooldown time
    const cdrMultiplier = 1 - (cooldownReductionBonus / 100);

    // --- Apply Bonuses ---

    // Health
    const previousMaxHealth = this.stats.getMaxHealth();
    const newMaxHealth = Math.round(this.baseMaxHealth * healthMultiplier);
    this.stats.setMaxHealth(newMaxHealth);
    // Optionally heal the player by the amount their max health increased
    const healthIncrease = newMaxHealth - previousMaxHealth;
    if (healthIncrease > 0 && this.isAlive) {
      this.heal(healthIncrease);
    }
    stateStore.player.maxHealth.set(newMaxHealth);
    logger.debug(`Health Bonus: ${healthBonus}% -> Max Health: ${newMaxHealth}`);

    // Speed
    this.speed = this.baseSpeed * speedMultiplier;
    // this.stats.setSpeed(this.speed); // StatsComponent doesn't track speed directly
    stateStore.player.speed.set(this.speed);
    logger.debug(`Speed Bonus: ${speedBonus}% -> Speed: ${this.speed}`);

    // Attack Power (Damage Bonus)
    // Assuming base attack power is 1 and damage is calculated elsewhere using this multiplier
    this.stats.setAttackPower(damageMultiplier);
    stateStore.player.attackPower.set(damageMultiplier);
    logger.debug(`Damage Bonus: ${damageBonus}% -> Attack Power Multiplier: ${damageMultiplier}`);

    // Life Steal
    this.stats.setLifeStealPercentage(lifeStealBonus);
    stateStore.player.lifeSteal.set(lifeStealBonus);
    logger.debug(`Life Steal Bonus: ${lifeStealBonus}%`);

    // Attack Speed & Cooldown Reduction (apply to cooldowns)
    const combinedCooldownMultiplier = attackSpeedCooldownMultiplier * cdrMultiplier;

    // Manual Attack Cooldown
    this.attackCooldown = Math.max(50, this.baseAttackCooldown * combinedCooldownMultiplier); // Minimum cooldown 50ms
    logger.debug(`AS Bonus: ${attackSpeedBonus}%, CDR Bonus: ${cooldownReductionBonus}% -> Manual Attack CD: ${this.attackCooldown}ms`);

    // Auto Attack Cooldown
    // Recalculate auto attack cooldown, considering rapid fire drop if active
    let finalAutoAttackCooldown = this.baseAutoAttackCooldown * combinedCooldownMultiplier;
    if (this.currentDropType === DropType.RAPID_FIRE) {
        const rapidFireMultiplier = CONFIG.DROPS.RAPID_FIRE?.COOLDOWN_MULTIPLIER ?? 1;
        finalAutoAttackCooldown *= rapidFireMultiplier;
    }
    this.autoAttack.cooldown = Math.max(50, finalAutoAttackCooldown); // Minimum cooldown 50ms
    // Update state store for attack speed (as a percentage bonus for UI)
    stateStore.player.attackSpeed.set(attackSpeedBonus); // Represents % bonus
    // Update state store for cooldown reduction (as a percentage bonus for UI)
    stateStore.player.cooldownReduction.set(cooldownReductionBonus); // Represents % bonus
    logger.debug(`-> Auto Attack CD: ${this.autoAttack.cooldown}ms`);


    // Ability Cooldowns (apply CDR multiplier)
    this.abilityManager.applyCooldownReduction(cdrMultiplier);
    logger.debug(`Applied CDR Multiplier ${cdrMultiplier} to abilities.`);

    // Optionally, emit an event that stats were updated
    // GameEvents.emit(EVENTS.PLAYER_STATS_UPDATED, this);
  }

  /**
   * Make the player temporarily invulnerable
   * @param duration - Duration in milliseconds
   */
  setInvulnerable(duration: number): void {
    // Clear any existing invulnerability timeout
    this.clearInvulnerabilityTimeout();

    // Set invulnerable state
    this.isInvulnerable = true;

    // Add visual indication of invulnerability
    this.element.classList.add('invulnerable');

    // Set timeout to remove invulnerability after duration
    this.invulnerabilityTimeoutId = window.setTimeout(() => {
      this.isInvulnerable = false;

      // Remove visual indication
      this.element.classList.remove('invulnerable');

      this.invulnerabilityTimeoutId = 0;

      logger.debug('Invulnerability ended');
    }, duration);

    logger.debug(`Player invulnerable for ${duration}ms`);
  }

  /**
   * Clear the invulnerability timeout if it exists
   */
  private clearInvulnerabilityTimeout(): void {
    if (this.invulnerabilityTimeoutId !== 0) {
      window.clearTimeout(this.invulnerabilityTimeoutId);
      this.invulnerabilityTimeoutId = 0;
    }
  }

  /**
   * Add a kill to the player's count
   * @returns Whether the player leveled up
   */
  addKill(): boolean {
    // If the player has a level system, use that
    if (this.levelSystem) {
      return this.levelSystem.addKill();
    }

    // Otherwise, use the state store to update kills
    const currentKills = stateStore.levelSystem.kills.get();
    stateStore.levelSystem.kills.set(currentKills + 1);

    return false; // No level-up without a level system
  }

  /**
   * Set the level system reference and ensure state store is kept in sync
   * @param levelSystem - The level system instance
   */
  setLevelSystem(levelSystem: LevelSystem): void {
    this.levelSystem = levelSystem;

    // Initialize state store with current level from the level system
    stateStore.player.level.set(levelSystem.getLevel());
    stateStore.levelSystem.level.set(levelSystem.getLevel());
    stateStore.levelSystem.kills.set(levelSystem.getKills());
    stateStore.levelSystem.killsToNextLevel.set(levelSystem.getKillsToNextLevel());

    // Listen for level changes using a lambda to avoid 'this' binding issues
    levelSystem.onLevelUp((newLevel: number) => {
      // Update state store values
      stateStore.player.level.set(newLevel);
      stateStore.levelSystem.level.set(newLevel);
    });
  }

  /**
   * Apply Vampire Scout mark effect to the player
   * @param energyRegenReduction - Factor to reduce energy regeneration by (0.5 = 50% reduction)
   */
  applyVampireScoutMark(energyRegenReduction: number): void {
    // Clear any existing mark timeout
    this.clearMarkTimeout();

    // Set mark as active
    this.vampireScoutMarkActive = true;

    // Set energy regen reduction
    this.energyRegenReductionFactor = 1 - energyRegenReduction;

    // Add visual indication that isn't too overwhelming
    this.element.classList.add('vampire-scout-marked');

    logger.debug(`Player marked by Vampire Scout. Energy regen reduced by ${energyRegenReduction * 100}%`);
  }

  /**
   * Remove Vampire Scout mark effect from the player
   */
  removeVampireScoutMark(): void {
    // Reset mark state
    this.vampireScoutMarkActive = false;
    this.energyRegenReductionFactor = 1;

    // Remove visual indication
    this.element.classList.remove('vampire-scout-marked');

    // Clear timeout if it exists
    this.clearMarkTimeout();

    logger.debug('Vampire Scout mark removed from player');
  }

  /**
   * Clear the mark timeout if it exists
   */
  private clearMarkTimeout(): void {
    if (this.markTimeoutId !== 0) {
      window.clearTimeout(this.markTimeoutId);
      this.markTimeoutId = 0;
    }
  }

  /**
   * Check if player is marked by Vampire Scout
   * @returns Whether player is marked
   */
  isMarkedByVampireScout(): boolean {
    return this.vampireScoutMarkActive;
  }

  /**
   * Block energy regeneration temporarily
   * For use with special enemy abilities like Silver Zones
   * @param duration - Duration in milliseconds
   */
  blockEnergyRegen(duration: number): void {
    // Clear any existing timeout before setting a new one.
    if (this.energyBlockTimeoutId) {
      window.clearTimeout(this.energyBlockTimeoutId);
      // console.log("Cleared previous energy block timeout"); // Optional debug log
    }

    // Only capture the '1' (unblocked) state if it's not already blocked
    // If it's already 0, we still want to restore to 1 eventually.
    const factorToRestore = 1; // We always want to restore to 1 eventually

    // Block energy regen immediately
    this.energyRegenReductionFactor = 0;
    // console.log(Energy regen blocked. Factor set to 0.); // Optional debug log

    // Set a new timeout to restore the factor
    this.energyBlockTimeoutId = window.setTimeout(() => {
      // Restore the regeneration factor
      this.energyRegenReductionFactor = factorToRestore;
      // console.log(Energy regen restored. Factor set to ${factorToRestore}.); // Optional debug log

      // Reset the timeout ID since it has now executed
      this.energyBlockTimeoutId = 0;
    }, duration);
    // console.log(Scheduled energy regen restore in ${duration}ms. Timeout ID: ${this.energyBlockTimeoutId}); // Optional debug log

    logger.debug(`Energy regeneration blocked for ${duration}ms`); // Keep existing logger
  }

  /**
   * Clean up player resources
   */
  cleanup(): void {
    // Clear any invulnerability timeout
    this.clearInvulnerabilityTimeout();

    // Clear any mark timeout
    this.clearMarkTimeout();

    // Add this block
    if (this.energyBlockTimeoutId) {
      window.clearTimeout(this.energyBlockTimeoutId);
      this.energyBlockTimeoutId = 0;
    }

    // Reset collision tracking
    this.collidingEnemies.clear();

    logger.debug('Player cleanup');
    super.cleanup();
  }

  /**
   * Destroy the player (backwards compatibility)
   */
  destroy(): void {
    // Unsubscribe from passive skill upgrade event
    GameEvents.off(EVENTS.PASSIVE_SKILL_UPGRADED, this.applyPassiveSkillBonuses.bind(this));
    this.cleanup();
  }
}
