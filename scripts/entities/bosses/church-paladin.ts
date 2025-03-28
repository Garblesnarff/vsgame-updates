import { Boss } from './base-boss';
import { Enemy, ParticleCreationFunction } from '../enemies/base-enemy';
import { GameEvents, EVENTS } from '../../utils/event-system';
import CONFIG from '../../config';
import { createLogger } from '../../utils/logger';
import { HolyPriest } from '../enemies/holy-priest';

const logger = createLogger('ChurchPaladin');

/**
 * Interface for a holy projectile
 */
interface HolyProjectile {
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    damage: number;
    element: HTMLElement;
    isActive: boolean;
}

/**
 * Interface for a consecration zone
 */
interface ConsecrationZone {
    x: number;
    y: number;
    radius: number;
    damage: number;
    duration: number;
    element: HTMLElement;
    creationTime: number;
}

/**
 * Interface for a light pillar attack
 */
interface LightPillar {
    x: number;
    y: number;
    width: number;
    height: number;
    damage: number;
    warningElement: HTMLElement;
    pillarElement: HTMLElement | null;
    creationTime: number;
    warningDuration: number;
    pillarDuration: number;
    isActive: boolean;
}

/**
 * Church Paladin Boss
 * A holy warrior clad in blessed armor who uses light-based attacks and defensive abilities
 */
export class ChurchPaladin extends Boss {
    // Paladin-specific properties
    holyProjectiles: HolyProjectile[];
    consecrationZones: ConsecrationZone[];
    lightPillars: LightPillar[];
    acolytes: HolyPriest[];

    // Shield mechanics
    hasShield: boolean;
    shieldDuration: number;
    shieldStartTime: number;

    // Attack cooldowns
    swordComboCooldown: number;
    lastSwordComboTime: number;
    shieldBashCooldown: number;
    lastShieldBashTime: number;
    holyProjectilesCooldown: number;
    lastHolyProjectilesTime: number;
    consecrationCooldown: number;
    lastConsecrationTime: number;
    divineShieldCooldown: number;
    lastDivineShieldTime: number;
    lightPillarsCooldown: number;
    lastLightPillarsTime: number;
    judgmentCooldown: number;
    lastJudgmentTime: number;
    holyNovaCooldown: number;
    lastHolyNovaTime: number;
    summonAcolytesCooldown: number;
    lastSummonAcolytesTime: number;

    // Movement variables
    chargeTarget: { x: number, y: number } | null;
    chargeSpeed: number;
    isCharging: boolean;
    teleportCooldown: number;
    lastTeleportTime: number;

    /**
     * Create a new Church Paladin boss
     * @param gameContainer - DOM element containing the game
     * @param playerLevel - Current level of the player
     */
    constructor(gameContainer: HTMLElement, playerLevel: number) {
        // Call parent constructor
        super(gameContainer, playerLevel);

        // Set Paladin properties
        this.name = "Church Paladin";
        this.element.classList.add('church-paladin');

        // Size (2.5x regular enemy)
        this.width = CONFIG.ENEMY.BASE.WIDTH * 2.5;
        this.height = CONFIG.ENEMY.BASE.HEIGHT * 2.5;
        this.element.style.width = this.width + 'px';
        this.element.style.height = this.height + 'px';

        // Visuals
        this.element.style.backgroundColor = "#f8f8ff"; // White/gold
        this.element.style.border = "2px solid #ffd700"; // Gold border
        this.element.style.boxShadow = "0 0 10px #ffd700"; // Golden glow

        // Multiple phases
        this.maxPhases = 3;
        this.phaseThresholds = [0.7, 0.4]; // 70% and 40% health

        // Initialize arrays for tracking abilities
        this.holyProjectiles = [];
        this.consecrationZones = [];
        this.lightPillars = [];
        this.acolytes = [];

        // Initialize attack cooldowns
        this.swordComboCooldown = 3000;
        this.lastSwordComboTime = 0;
        this.shieldBashCooldown = 5000;
        this.lastShieldBashTime = 0;
        this.holyProjectilesCooldown = 4000;
        this.lastHolyProjectilesTime = 0;
        this.consecrationCooldown = 8000;
        this.lastConsecrationTime = 0;
        this.divineShieldCooldown = 15000;
        this.lastDivineShieldTime = 0;
        this.lightPillarsCooldown = 10000;
        this.lastLightPillarsTime = 0;
        this.judgmentCooldown = 12000;
        this.lastJudgmentTime = 0;
        this.holyNovaCooldown = 20000;
        this.lastHolyNovaTime = 0;
        this.summonAcolytesCooldown = 25000;
        this.lastSummonAcolytesTime = 0;

        // Shield mechanics
        this.hasShield = false;
        this.shieldDuration = 3000; // 3 seconds
        this.shieldStartTime = 0;

        // Movement variables
        this.chargeTarget = null;
        this.chargeSpeed = this.speed * 3;
        this.isCharging = false;
        this.teleportCooldown = 8000;
        this.lastTeleportTime = 0;

        // Set damage modifiers for vampire abilities
        this.damageModifiers.set('bloodDrain', 0.7); // Take 30% less damage from vampire abilities
        this.damageModifiers.set('batSwarm', 0.7);
        this.damageModifiers.set('shadowDash', 0.7);
        this.damageModifiers.set('bloodLance', 0.7);
        this.damageModifiers.set('nightShield', 0.7);

        // Fix template literal
        logger.debug(`Church Paladin created at level ${playerLevel} with ${this.health} health`);
    }

    /**
     * Scale Church Paladin stats based on player level
     * @param playerLevel - Current level of the player
     */
    scaleBossStats(playerLevel: number): void {
        // Override parent method with Paladin-specific scaling
        this.health = 5000 + playerLevel * 500;
        this.maxHealth = this.health;
        this.damage = 20 + playerLevel * 3;

        // Paladin is larger than base boss
        this.width = CONFIG.ENEMY.BASE.WIDTH * 2.5;
        this.height = CONFIG.ENEMY.BASE.HEIGHT * 2.5;

        // Update element size
        if (this.element) {
            this.element.style.width = this.width + 'px';
            this.element.style.height = this.height + 'px';
        }
    }

    /**
     * Update Church Paladin state
     * @param deltaTime - Time since last update in ms
     * @param player - Reference to the player
     * @param enemies - Array of all enemies
     */
    update(deltaTime: number, player?: any, enemies?: Enemy[]): void {
        // Call parent update (handles health bar, phase checks)
        super.update(deltaTime, player, enemies);

        const now = Date.now();

        // Check if player is already dead before doing any processing
        if (player && (player.health <= 0 || player.isAlive === false)) {
            // Skip additional processing for dead player
            // Only continue with self-maintenance updates

            // Update projectiles (but skip player collision)
            this.updateHolyProjectiles(deltaTime);

            // Update consecration zones (but skip player damage)
            this.updateConsecrationZones(now);

            // Update light pillars (but skip player damage)
            this.updateLightPillars(now);

            // Check divine shield expiration
            if (this.hasShield && now - this.shieldStartTime > this.shieldDuration) {
                this.deactivateDivineShield();
            }

            // Clear out dead acolytes
            this.acolytes = this.acolytes.filter(acolyte => acolyte.health > 0);

            return; // Skip phase behavior if player is dead
        }

        // Update projectiles
        this.updateHolyProjectiles(deltaTime, player);

        // Update consecration zones
        this.updateConsecrationZones(now, player);

        // Update light pillars
        this.updateLightPillars(now, player);

        // Check divine shield expiration
        if (this.hasShield && now - this.shieldStartTime > this.shieldDuration) {
            this.deactivateDivineShield();
        }

        // Clear out dead acolytes
        this.acolytes = this.acolytes.filter(acolyte => acolyte.health > 0);

        // Handle phase-specific behavior with player
        if (player && player.isAlive) {
            // Movement and attacks based on current phase
            this.handlePhaseBasedBehavior(now, player, enemies);

            // Add periodic focus check
            // Make sure we're not dealing with keyboard focus issues
            // by periodically refocusing on game container
            if (now % 5000 < 20) { // Every 5 seconds
                if (this.gameContainer) {
                    this.gameContainer.focus();
                }
            }
        }
        // Note: The final visual updatePosition() is called in the base Boss update method
    }

    /**
     * Handle behavior based on current phase
     * @param now - Current timestamp
     * @param player - Reference to the player
     * @param enemies - Array of all enemies
     */
    handlePhaseBasedBehavior(now: number, player: any, enemies?: Enemy[]): void {
        // If charging, continue charge
        if (this.isCharging && this.chargeTarget) {
            this.continueCharge(); // Movement handled within continueCharge
            return;
        }

        // Phase-specific behavior
        switch (this.phase) {
            case 1:
                this.handlePhase1Behavior(now, player);
                break;
            case 2:
                this.handlePhase2Behavior(now, player);
                break;
            case 3:
                this.handlePhase3Behavior(now, player, enemies);
                break;
        }
    }

    /**
     * Handle Phase 1 behavior (100-70% health)
     * - Moderate speed, direct approach
     * - Sword combo, shield bash, holy projectiles
     * @param now - Current timestamp
     * @param player - Reference to the player
     */
    handlePhase1Behavior(now: number, player: any): void {
        // Direct approach movement
        this.moveTowardsPlayer(player);

        // Attack selection
        const distToPlayer = this.getDistanceToPlayer(player);

        // Close range: sword combo or shield bash
        if (distToPlayer < 150) {
            // Sword combo
            if (now - this.lastSwordComboTime > this.swordComboCooldown) {
                this.performSwordCombo(player);
                this.lastSwordComboTime = now;
                return;
            }

            // Shield bash
            if (now - this.lastShieldBashTime > this.shieldBashCooldown) {
                this.performShieldBash(player);
                this.lastShieldBashTime = now;
                return;
            }
        }
        // Medium range: holy projectiles
        else if (distToPlayer < 400) {
            if (now - this.lastHolyProjectilesTime > this.holyProjectilesCooldown) {
                this.fireHolyProjectiles(player);
                this.lastHolyProjectilesTime = now;
                return;
            }
        }
    }

    /**
     * Handle Phase 2 behavior (70-40% health)
     * - Increased speed with occasional charge attacks
     * - Consecration, divine shield, light pillars
     * @param now - Current timestamp
     * @param player - Reference to the player
     */
    handlePhase2Behavior(now: number, player: any): void {
        // Faster movement in phase 2
        this.moveTowardsPlayer(player, 1.5);

        // Try to use divine shield when low in phase 2
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 0.5 && now - this.lastDivineShieldTime > this.divineShieldCooldown) {
            this.activateDivineShield();
            this.lastDivineShieldTime = now;
            return;
        }

        // Use phase 1 abilities occasionally
        const distToPlayer = this.getDistanceToPlayer(player);

        // Close range: sword combo, shield bash, or consecration
        if (distToPlayer < 150) {
            // Try consecration first (new phase 2 ability)
            if (now - this.lastConsecrationTime > this.consecrationCooldown) {
                this.createConsecration(this.x + this.width / 2, this.y + this.height / 2);
                this.lastConsecrationTime = now;
                return;
            }

            // Phase 1 abilities as fallback
            if (now - this.lastSwordComboTime > this.swordComboCooldown) {
                this.performSwordCombo(player);
                this.lastSwordComboTime = now;
                return;
            }

            if (now - this.lastShieldBashTime > this.shieldBashCooldown) {
                this.performShieldBash(player);
                this.lastShieldBashTime = now;
                return;
            }
        }
        // Medium range: charge, light pillars, or holy projectiles
        else if (distToPlayer < 400) {
            // Occasionally charge at player
            if (Math.random() < 0.1 && !this.isCharging) {
                this.startCharge(player);
                return;
            }

            // Try light pillars (new phase 2 ability)
            if (now - this.lastLightPillarsTime > this.lightPillarsCooldown) {
                this.summonLightPillars(player);
                this.lastLightPillarsTime = now;
                return;
            }

            // Holy projectiles as fallback
            if (now - this.lastHolyProjectilesTime > this.holyProjectilesCooldown) {
                this.fireHolyProjectiles(player);
                this.lastHolyProjectilesTime = now;
                return;
            }
        }
    }

    /**
     * Handle Phase 3 behavior (40-0% health)
     * - Tactical repositioning with occasional teleports
     * - Judgment, holy nova, summon acolytes
     * @param now - Current timestamp
     * @param player - Reference to the player
     * @param enemies - Array of all enemies
     */
    handlePhase3Behavior(now: number, player: any, enemies?: Enemy[]): void {
        // Tactical movement (stay at medium distance)
        const distToPlayer = this.getDistanceToPlayer(player);

        // Too close: teleport away
        if (distToPlayer < 150 && now - this.lastTeleportTime > this.teleportCooldown) {
            this.teleportAway(player); // Movement handled within teleportAway
            this.lastTeleportTime = now;
            return;
        }

        // Maintain medium distance
        if (distToPlayer < 200) {
            this.moveAwayFromPlayer(player);
        } else if (distToPlayer > 350) {
            this.moveTowardsPlayer(player);
        } else {
            // Strafe sideways when at optimal distance
            this.strafeAroundPlayer(player);
        }

        // Judgment (new phase 3 ability) - requires medium distance
        if (distToPlayer > 200 && distToPlayer < 400 &&
            now - this.lastJudgmentTime > this.judgmentCooldown) {
            this.castJudgment(player);
            this.lastJudgmentTime = now;
            return;
        }

        // Holy Nova (new phase 3 ability) - player is close
        if (distToPlayer < 250 && now - this.lastHolyNovaTime > this.holyNovaCooldown) {
            this.castHolyNova();
            this.lastHolyNovaTime = now;
            return;
        }

        // Summon Acolytes (new phase 3 ability) - not many acolytes alive
        if (this.acolytes.length < 2 && now - this.lastSummonAcolytesTime > this.summonAcolytesCooldown) {
            this.summonAcolytes(player, enemies);
            this.lastSummonAcolytesTime = now;
            return;
        }

        // Use other abilities from previous phases as backup
        this.handleBackupAbilities(now, player);
    }

    /**
     * Handle backup abilities from previous phases
     * @param now - Current timestamp
     * @param player - Reference to the player
     */
    handleBackupAbilities(now: number, player: any): void {
        const distToPlayer = this.getDistanceToPlayer(player);

        // Try phase 2 abilities
        if (now - this.lastConsecrationTime > this.consecrationCooldown && distToPlayer < 200) {
            this.createConsecration(this.x + this.width / 2, this.y + this.height / 2);
            this.lastConsecrationTime = now;
            return;
        }

        if (now - this.lastLightPillarsTime > this.lightPillarsCooldown) {
            this.summonLightPillars(player);
            this.lastLightPillarsTime = now;
            return;
        }

        if (now - this.lastDivineShieldTime > this.divineShieldCooldown && this.health < this.maxHealth * 0.2) {
            this.activateDivineShield();
            this.lastDivineShieldTime = now;
            return;
        }

        // Try phase 1 abilities
        if (now - this.lastHolyProjectilesTime > this.holyProjectilesCooldown) {
            this.fireHolyProjectiles(player);
            this.lastHolyProjectilesTime = now;
        }
    }

    /**
     * Get distance to player
     * @param player - Player entity
     * @returns Distance to player
     */
    getDistanceToPlayer(player: any): number {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Move towards player with optional speed multiplier.
     * @param player - Player entity
     * @param speedMultiplier - Optional speed multiplier
     */
    moveTowardsPlayer(player: any, speedMultiplier: number = 1): void {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero if already at the target
        if (dist === 0) return;

        // Calculate potential next position
        let nextX = this.x + (dx / dist) * this.speed * speedMultiplier;
        let nextY = this.y + (dy / dist) * this.speed * speedMultiplier;

        // TODO: Add clamping to game boundaries if needed
        // [nextX, nextY] = this.clampToGameBounds(nextX, nextY);

        // Apply final position
        this.x = nextX;
        this.y = nextY;

        // Visual update is handled by the base Boss update method
    }

    /**
     * Move away from player.
     * @param player - Player entity
     */
    moveAwayFromPlayer(player: any): void {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero
        if (dist === 0) return;

        // Calculate potential next position
        let nextX = this.x - (dx / dist) * this.speed;
        let nextY = this.y - (dy / dist) * this.speed;

        // TODO: Add clamping to game boundaries if needed
        // [nextX, nextY] = this.clampToGameBounds(nextX, nextY);

        // Apply final position
        this.x = nextX;
        this.y = nextY;

        // Visual update is handled by the base Boss update method
    }

    /**
     * Strafe sideways around player.
     * @param player - Player entity
     */
    strafeAroundPlayer(player: any): void {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Avoid division by zero
        if (dist === 0) return;

        // Perpendicular direction (clockwise strafe)
        const strafeX = -dy / dist;
        const strafeY = dx / dist;

        // Calculate potential next position
        let nextX = this.x + strafeX * this.speed;
        let nextY = this.y + strafeY * this.speed;

        // TODO: Add clamping to game boundaries if needed
        // [nextX, nextY] = this.clampToGameBounds(nextX, nextY);

        // Apply final position
        this.x = nextX;
        this.y = nextY;

        // Visual update is handled by the base Boss update method
    }

    /**
     * Start a charge attack towards player
     * @param player - Player entity
     */
    startCharge(player: any): void {
        // Set charge target (player's position)
        this.chargeTarget = {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2
        };

        // Set charging state
        this.isCharging = true;

        // Visual effect
        this.element.classList.add('charging');

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'charge');
    }

    /**
     * Continue charge movement.
     */
    continueCharge(): void {
        if (!this.chargeTarget) return;

        // Calculate direction to target
        const dx = this.chargeTarget.x - (this.x + this.width / 2);
        const dy = this.chargeTarget.y - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Check if we've reached the target or hit the boundary
        if (dist < 10) {
            this.finishCharge();
            return;
        }

        // Calculate potential next position
        let nextX = this.x + (dx / dist) * this.chargeSpeed;
        let nextY = this.y + (dy / dist) * this.chargeSpeed;

        // TODO: Add clamping to game boundaries if needed
        // const [clampedX, clampedY] = this.clampToGameBounds(nextX, nextY);
        // if (clampedX !== nextX || clampedY !== nextY) {
        //     this.x = clampedX;
        //     this.y = clampedY;
        //     this.finishCharge(); // Finish charge if boundary is hit
        //     return;
        // }

        // Apply final position
        this.x = nextX;
        this.y = nextY;

        // Visual update is handled by the base Boss update method
    }

    /**
     * Finish charge attack
     */
    finishCharge(): void {
        // Reset charge state
        this.isCharging = false;
        this.chargeTarget = null;

        // Remove visual effect
        this.element.classList.remove('charging');

        // Create impact effect
        this.createChargeImpactEffect();
    }

    /**
     * Create visual effect for charge impact
     */
    createChargeImpactEffect(): void {
        // Create impact element
        const impact = document.createElement('div');
        impact.className = 'charge-impact';
        impact.style.position = 'absolute';
        impact.style.left = (this.x + this.width / 2 - 50) + 'px';
        impact.style.top = (this.y + this.height / 2 - 50) + 'px';
        impact.style.width = '100px';
        impact.style.height = '100px';
        impact.style.borderRadius = '50%';
        impact.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        impact.style.zIndex = '15';
        impact.style.animation = 'expand-fade 0.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(impact);

        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, 500);
    }

    /**
     * Teleport away from player.
     * @param player - Player entity
     */
    teleportAway(player: any): void {
        // Calculate direction away from player
        const dx = (this.x + this.width / 2) - (player.x + player.width / 2);
        const dy = (this.y + this.height / 2) - (player.y + player.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Normalize and apply teleport distance (200px)
        const teleportDist = 200;
        let newX = this.x + (dx / dist) * teleportDist;
        let newY = this.y + (dy / dist) * teleportDist;

        // Clamp to game boundaries
        newX = Math.max(0, Math.min(CONFIG.GAME_WIDTH - this.width, newX));
        newY = Math.max(0, Math.min(CONFIG.GAME_HEIGHT - this.height, newY));

        // Create teleport effect at old position
        this.createTeleportEffect(this.x, this.y);

        // Update position
        this.x = newX;
        this.y = newY;
        // Visual update handled in main loop

        // Create teleport effect at new position
        this.createTeleportEffect(this.x, this.y);

        // Emit event
        GameEvents.emit(EVENTS.BOSS_SPECIAL_MOVE, this, 'teleport');
    }

    /**
     * Create teleport visual effect
     * @param x - X position for effect
     * @param y - Y position for effect
     */
    createTeleportEffect(x: number, y: number): void {
        // Create flash element
        const flash = document.createElement('div');
        flash.className = 'teleport-flash';
        flash.style.position = 'absolute';
        flash.style.left = x + 'px';
        flash.style.top = y + 'px';
        flash.style.width = this.width + 'px';
        flash.style.height = this.height + 'px';
        flash.style.borderRadius = '50%';
        flash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        flash.style.boxShadow = '0 0 20px 10px rgba(255, 255, 255, 0.6)';
        flash.style.zIndex = '20';
        flash.style.animation = 'flash-fade 0.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(flash);

        // Remove after animation
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 500);
    }

    // ======== PHASE 1 ABILITIES ========

    /**
     * Perform sword combo attack
     * @param player - Player entity
     */
    performSwordCombo(player: any): void {
        logger.debug('Church Paladin performing sword combo');

        // Visual effect
        this.element.classList.add('attacking');

        // 3-hit combo with timing
        this.performSwordHit(player, 0, 1); // First hit immediately
        this.performSwordHit(player, 500, 1.2); // Second hit after 500ms, 1.2x damage
        this.performSwordHit(player, 1000, 1.5); // Third hit after 1000ms, 1.5x damage

        // Remove visual effect after combo
        setTimeout(() => {
            this.element.classList.remove('attacking');
        }, 1200);

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'swordCombo');
    }

    /**
     * Perform individual sword hit
     * @param player - Player entity
     * @param delay - Delay before hit in ms
     * @param damageMultiplier - Damage multiplier
     */
    performSwordHit(player: any, delay: number, damageMultiplier: number): void {
        setTimeout(() => {
            // Check if we're close enough to player
            const distToPlayer = this.getDistanceToPlayer(player);
            if (distToPlayer < 150) {
                // Apply damage if player has takeDamage method
                if (player.takeDamage) {
                    player.takeDamage(this.damage * damageMultiplier);
                }

                // Create hit effect
                this.createSwordHitEffect(player);
            }
        }, delay);
    }

    /**
     * Create sword hit visual effect
     * @param player - Player entity
     */
    createSwordHitEffect(player: any): void {
        // Create slash element
        const slash = document.createElement('div');
        slash.className = 'sword-slash';
        slash.style.position = 'absolute';
        slash.style.left = player.x + 'px';
        slash.style.top = player.y + 'px';
        slash.style.width = player.width + 'px';
        slash.style.height = player.height + 'px';
        slash.style.backgroundImage = 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)';
        slash.style.zIndex = '15';
        slash.style.animation = 'slash-fade 0.3s forwards';

        // Add to game container
        this.gameContainer.appendChild(slash);

        // Remove after animation
        setTimeout(() => {
            if (slash.parentNode) {
                slash.parentNode.removeChild(slash);
            }
        }, 300);
    }

    /**
     * Perform shield bash attack
     * @param player - Player entity
     */
    performShieldBash(player: any): void {
        logger.debug('Church Paladin performing shield bash');

        // Visual effect
        this.element.classList.add('shield-bash');

        // Apply damage and knockback if player is close
        const distToPlayer = this.getDistanceToPlayer(player);
        if (distToPlayer < 150) {
            // Apply damage if player has takeDamage method
            if (player.takeDamage) {
                player.takeDamage(this.damage * 1.5);
            }

            // Apply knockback
            this.applyKnockback(player, 200);

            // Apply stun (if player has applyEffect method)
            if (player.applyEffect) {
                player.applyEffect('stun', 1000); // 1 second stun
            }

            // Create bash effect
            this.createShieldBashEffect(player);
        }

        // Remove visual effect
        setTimeout(() => {
            this.element.classList.remove('shield-bash');
        }, 500);

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'shieldBash');
    }

    /**
     * Apply knockback to player
     * @param player - Player entity
     * @param strength - Knockback strength
     */
    applyKnockback(player: any, strength: number): void {
        // Calculate direction from boss to player
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply knockback force
        const knockbackX = (dx / dist) * strength;
        const knockbackY = (dy / dist) * strength;

        // Update player position if they have the properties
        player.x += knockbackX;
        player.y += knockbackY;

        // Update player position visually if they have the method
        if (player.updatePosition) {
            player.updatePosition();
        }
    }

    /**
     * Create shield bash visual effect
     * @param player - Player entity
     */
    createShieldBashEffect(player: any): void {
        // Create impact element
        const impact = document.createElement('div');
        impact.className = 'shield-bash-impact';
        impact.style.position = 'absolute';
        impact.style.left = (player.x - 20) + 'px';
        impact.style.top = (player.y - 20) + 'px';
        impact.style.width = (player.width + 40) + 'px';
        impact.style.height = (player.height + 40) + 'px';
        impact.style.borderRadius = '50%';
        impact.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        impact.style.boxShadow = '0 0 15px 5px rgba(255, 255, 255, 0.8)';
        impact.style.zIndex = '15';
        impact.style.animation = 'impact-fade 0.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(impact);

        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, 500);
    }

    /**
     * Fire holy projectiles at player
     * @param player - Player entity
     */
    fireHolyProjectiles(player: any): void {
        logger.debug('Church Paladin firing holy projectiles');

        // Create 3 projectiles
        const projectileCount = 3;
        const projectileSpeed = 5;

        for (let i = 0; i < projectileCount; i++) {
            // Calculate direction to player with spread
            const angle = Math.atan2(
                (player.y + player.height / 2) - (this.y + this.height / 2),
                (player.x + player.width / 2) - (this.x + this.width / 2)
            );

            // Add spread based on projectile index
            const spread = Math.PI / 12; // 15 degrees
            const spreadAngle = angle + (i - 1) * spread;

            // Calculate velocity
            const velocityX = Math.cos(spreadAngle) * projectileSpeed;
            const velocityY = Math.sin(spreadAngle) * projectileSpeed;

            // Create holy projectile
            this.createHolyProjectile(
                this.x + this.width / 2,
                this.y + this.height / 2,
                velocityX,
                velocityY
            );
        }

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'holyProjectiles');
    }

    /**
     * Create a holy projectile
     * @param x - Starting X position
     * @param y - Starting Y position
     * @param speedX - X velocity
     * @param speedY - Y velocity
     */
    createHolyProjectile(x: number, y: number, speedX: number, speedY: number): void {
        // Create projectile element
        const element = document.createElement('div');
        element.className = 'holy-projectile';
        element.style.position = 'absolute';
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.width = '15px';
        element.style.height = '15px';
        element.style.borderRadius = '50%';
        element.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        element.style.boxShadow = '0 0 10px 5px rgba(255, 255, 180, 0.8)';
        element.style.zIndex = '10';

        // Add to game container
        this.gameContainer.appendChild(element);

        // Create projectile object
        const projectile: HolyProjectile = {
            x,
            y,
            speedX,
            speedY,
            damage: this.damage * 0.8,
            element,
            isActive: true
        };

        // Add to projectiles array
        this.holyProjectiles.push(projectile);
    }

    /**
     * Update holy projectiles
     * @param deltaTime - Time since last update in ms
     * @param player - Player entity
     */
    updateHolyProjectiles(_deltaTime: number, player?: any): void {
        // Update each projectile
        for (let i = this.holyProjectiles.length - 1; i >= 0; i--) {
            const projectile = this.holyProjectiles[i];

            // Skip inactive projectiles
            if (!projectile.isActive) continue;

            // Move projectile
            projectile.x += projectile.speedX;
            projectile.y += projectile.speedY;

            // Update element position
            projectile.element.style.left = projectile.x + 'px';
            projectile.element.style.top = projectile.y + 'px';

            // Check for collisions with player
            if (player && this.projectileCollidesWithPlayer(projectile, player)) {
                // Apply damage if player has takeDamage method
                if (player.takeDamage) {
                    player.takeDamage(projectile.damage);
                }

                // Create hit effect
                this.createProjectileHitEffect(projectile.x, projectile.y);

                // Deactivate projectile
                this.removeProjectile(projectile);
                continue;
            }

            // Check if out of bounds
            if (this.isProjectileOutOfBounds(projectile)) {
                this.removeProjectile(projectile);
                continue;
            }
        }

        // Clean up inactive projectiles
        this.holyProjectiles = this.holyProjectiles.filter(p => p.isActive);
    }

    /**
     * Check if a projectile collides with the player
     * @param projectile - Projectile to check
     * @param player - Player entity
     * @returns Whether collision occurred
     */
    projectileCollidesWithPlayer(projectile: HolyProjectile, player: any): boolean {
        // Simple collision check (treating projectile as point)
        return (
            projectile.x >= player.x &&
            projectile.x <= player.x + player.width &&
            projectile.y >= player.y &&
            projectile.y <= player.y + player.height
        );
    }

    /**
     * Check if a projectile is out of bounds
     * @param projectile - Projectile to check
     * @returns Whether projectile is out of bounds
     */
    isProjectileOutOfBounds(projectile: HolyProjectile): boolean {
        return (
            projectile.x < 0 ||
            projectile.x > CONFIG.GAME_WIDTH ||
            projectile.y < 0 ||
            projectile.y > CONFIG.GAME_HEIGHT
        );
    }

    /**
     * Remove a projectile
     * @param projectile - Projectile to remove
     */
    removeProjectile(projectile: HolyProjectile): void {
        // Mark as inactive
        projectile.isActive = false;

        // Remove element
        if (projectile.element.parentNode) {
            projectile.element.parentNode.removeChild(projectile.element);
        }
    }

    /**
     * Create projectile hit visual effect
     * @param x - X position
     * @param y - Y position
     */
    createProjectileHitEffect(x: number, y: number): void {
        // Create hit element
        const hit = document.createElement('div');
        hit.className = 'projectile-hit';
        hit.style.position = 'absolute';
        hit.style.left = (x - 20) + 'px';
        hit.style.top = (y - 20) + 'px';
        hit.style.width = '40px';
        hit.style.height = '40px';
        hit.style.borderRadius = '50%';
        hit.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        hit.style.boxShadow = '0 0 10px 5px rgba(255, 255, 180, 0.7)';
        hit.style.zIndex = '15';
        hit.style.animation = 'hit-fade 0.3s forwards';

        // Add to game container
        this.gameContainer.appendChild(hit);

        // Remove after animation
        setTimeout(() => {
            if (hit.parentNode) {
                hit.parentNode.removeChild(hit);
            }
        }, 300);
    }

    // ======== PHASE 2 ABILITIES ========

    /**
     * Create a consecration zone
     * @param x - Center X position
     * @param y - Center Y position
     */
    createConsecration(x: number, y: number): void {
        logger.debug('Church Paladin creating consecration zone');

        // Create zone element
        const radius = 120;
        const element = document.createElement('div');
        element.className = 'consecration-zone';
        element.style.position = 'absolute';
        element.style.left = (x - radius) + 'px';
        element.style.top = (y - radius) + 'px';
        element.style.width = (radius * 2) + 'px';
        element.style.height = (radius * 2) + 'px';
        element.style.borderRadius = '50%';
        element.style.backgroundColor = 'rgba(255, 255, 180, 0.3)';
        element.style.border = '2px solid rgba(255, 255, 100, 0.6)';
        element.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 100, 0.6)';
        element.style.zIndex = '5';
        element.style.animation = 'consecration-pulse 2s infinite';

        // Add to game container
        this.gameContainer.appendChild(element);

        // Create zone object
        const zone: ConsecrationZone = {
            x,
            y,
            radius,
            damage: this.damage * 0.5, // Per second
            duration: 6000, // 6 seconds
            element,
            creationTime: Date.now()
        };

        // Add to zones array
        this.consecrationZones.push(zone);

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'consecration');
    }

    /**
     * Update consecration zones
     * @param now - Current timestamp
     * @param player - Player entity
     */
    updateConsecrationZones(now: number, player?: any): void {
        // Update each zone
        for (let i = this.consecrationZones.length - 1; i >= 0; i--) {
            const zone = this.consecrationZones[i];
            const elapsedTime = now - zone.creationTime;

            // Check if zone has expired
            if (elapsedTime >= zone.duration) {
                // Remove zone element
                if (zone.element.parentNode) {
                    zone.element.parentNode.removeChild(zone.element);
                }

                // Remove from array
                this.consecrationZones.splice(i, 1);
                continue;
            }

            // Update visual fade
            const opacity = 0.3 * (1 - (elapsedTime / zone.duration));
            // Fix template literal
            zone.element.style.backgroundColor = `rgba(255, 255, 180, ${opacity})`;

            // Check if player is in zone
            if (player && this.isPlayerInZone(player, zone)) {
                // Apply damage every 200ms while in zone
                if (now % 200 < 20) {
                    // Apply damage if player has takeDamage method
                    if (player.takeDamage) {
                        player.takeDamage(zone.damage * 0.2); // 1/5 of damage per second
                    }

                    // Create damage effect
                    this.createZoneDamageEffect(player);
                }
            }
        }
    }

    /**
     * Check if player is in consecration zone
     * @param player - Player entity
     * @param zone - Consecration zone
     * @returns Whether player is in zone
     */
    isPlayerInZone(player: any, zone: ConsecrationZone): boolean {
        // Calculate distance from zone center to player center
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const dx = playerCenterX - zone.x;
        const dy = playerCenterY - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Player is in zone if distance < zone radius
        return distance < zone.radius;
    }

    /**
     * Create zone damage visual effect
     * @param player - Player entity
     */
    createZoneDamageEffect(player: any): void {
        // Create damage element
        const damage = document.createElement('div');
        damage.className = 'zone-damage';
        damage.style.position = 'absolute';
        damage.style.left = player.x + 'px';
        damage.style.top = player.y + 'px';
        damage.style.width = player.width + 'px';
        damage.style.height = player.height + 'px';
        damage.style.backgroundColor = 'rgba(255, 255, 100, 0.3)';
        damage.style.zIndex = '15';
        damage.style.animation = 'zone-damage-fade 0.3s forwards';

        // Add to game container
        this.gameContainer.appendChild(damage);

        // Remove after animation
        setTimeout(() => {
            if (damage.parentNode) {
                damage.parentNode.removeChild(damage);
            }
        }, 300);
    }

    /**
     * Activate divine shield
     */
    activateDivineShield(): void {
        logger.debug('Church Paladin activating divine shield');

        // Set shield state
        this.hasShield = true;
        this.shieldStartTime = Date.now();

        // Add visual effect
        this.element.classList.add('divine-shield');
        this.element.style.boxShadow = '0 0 20px 10px rgba(255, 255, 180, 0.9)';

        // Create shield pulse effect
        this.createShieldPulseEffect();

        // Emit event
        GameEvents.emit(EVENTS.BOSS_SPECIAL_MOVE, this, 'divineShield');
    }

    /**
     * Deactivate divine shield
     */
    deactivateDivineShield(): void {
        // Reset shield state
        this.hasShield = false;

        // Remove visual effect
        this.element.classList.remove('divine-shield');
        this.element.style.boxShadow = '0 0 10px #ffd700'; // Reset to normal glow
    }

    /**
     * Create shield pulse visual effect
     */
    createShieldPulseEffect(): void {
        // Create pulse element
        const pulse = document.createElement('div');
        pulse.className = 'shield-pulse';
        pulse.style.position = 'absolute';
        pulse.style.left = (this.x - 20) + 'px';
        pulse.style.top = (this.y - 20) + 'px';
        pulse.style.width = (this.width + 40) + 'px';
        pulse.style.height = (this.height + 40) + 'px';
        pulse.style.borderRadius = '50%';
        pulse.style.border = '5px solid rgba(255, 255, 180, 0.8)';
        pulse.style.boxShadow = '0 0 20px 10px rgba(255, 255, 180, 0.6)';
        pulse.style.zIndex = '15';
        pulse.style.animation = 'shield-pulse 2s linear';

        // Add to game container
        this.gameContainer.appendChild(pulse);

        // Remove after animation
        setTimeout(() => {
            if (pulse.parentNode) {
                pulse.parentNode.removeChild(pulse);
            }
        }, 2000);
    }

    /**
     * Summon light pillars
     * @param player - Player entity
     */
    summonLightPillars(player: any): void {
        logger.debug('Church Paladin summoning light pillars');

        // Create multiple pillars
        const pillarCount = 3 + Math.floor(Math.random() * 2); // 3-4 pillars

        for (let i = 0; i < pillarCount; i++) {
            // Determine position (player's position or random positions near player)
            let x, y;

            if (i === 0) {
                // First pillar targets player directly
                x = player.x + player.width / 2;
                y = player.y + player.height / 2;
            } else {
                // Other pillars target random positions near player
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 150; // 100-250px from player

                x = player.x + player.width / 2 + Math.cos(angle) * distance;
                y = player.y + player.height / 2 + Math.sin(angle) * distance;
            }

            // Create light pillar warning
            this.createLightPillarWarning(x, y);
        }

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'lightPillars');
    }

    /**
     * Create light pillar warning
     * @param x - Center X position
     * @param y - Center Y position
     */
    createLightPillarWarning(x: number, y: number): void {
        // Define pillar dimensions
        const width = 80;
        const height = 80;

        // Create warning element
        const warning = document.createElement('div');
        warning.className = 'light-pillar-warning';
        warning.style.position = 'absolute';
        warning.style.left = (x - width / 2) + 'px';
        warning.style.top = (y - height / 2) + 'px';
        warning.style.width = width + 'px';
        warning.style.height = height + 'px';
        warning.style.borderRadius = '50%';
        warning.style.backgroundColor = 'rgba(255, 255, 180, 0.3)';
        warning.style.border = '2px solid rgba(255, 255, 100, 0.6)';
        warning.style.boxShadow = 'inset 0 0 10px rgba(255, 255, 100, 0.6)';
        warning.style.zIndex = '5';
        warning.style.animation = 'warning-pulse 1s infinite';

        // Add to game container
        this.gameContainer.appendChild(warning);

        // Create pillar object
        const pillar: LightPillar = {
            x,
            y,
            width,
            height,
            damage: this.damage * 2,
            warningElement: warning,
            pillarElement: null,
            creationTime: Date.now(),
            warningDuration: 1000, // 1 second warning
            pillarDuration: 500, // 0.5 second pillar
            isActive: true
        };

        // Add to pillars array
        this.lightPillars.push(pillar);
    }

    /**
     * Update light pillars
     * @param now - Current timestamp
     * @param player - Player entity
     */
    updateLightPillars(now: number, player?: any): void {
        // Update each pillar
        for (let i = this.lightPillars.length - 1; i >= 0; i--) {
            const pillar = this.lightPillars[i];
            const elapsedTime = now - pillar.creationTime;

            // Warning phase -> Pillar phase
            if (elapsedTime >= pillar.warningDuration && !pillar.pillarElement) {
                this.activateLightPillar(pillar);
            }

            // Pillar phase -> End
            if (elapsedTime >= pillar.warningDuration + pillar.pillarDuration && pillar.pillarElement) {
                // Remove pillar and warning elements
                this.removeLightPillar(pillar);

                // Remove from array
                this.lightPillars.splice(i, 1);
                continue;
            }

            // Check if player is hit by active pillar
            if (player && pillar.pillarElement && this.isPlayerInPillar(player, pillar)) {
                // Apply damage only once per pillar
                if (pillar.isActive) {
                    // Apply damage if player has takeDamage method
                    if (player.takeDamage) {
                        player.takeDamage(pillar.damage);
                    }

                    // Mark as no longer active (to prevent multiple hits)
                    pillar.isActive = false;
                }
            }
        }
    }

    /**
     * Activate a light pillar after warning
     * @param pillar - Light pillar to activate
     */
    activateLightPillar(pillar: LightPillar): void {
        // Remove warning element
        if (pillar.warningElement.parentNode) {
            pillar.warningElement.parentNode.removeChild(pillar.warningElement);
        }

        // Create pillar element
        const element = document.createElement('div');
        element.className = 'light-pillar';
        element.style.position = 'absolute';
        element.style.left = (pillar.x - pillar.width / 2) + 'px';
        element.style.top = (pillar.y - pillar.height / 2) + 'px';
        element.style.width = pillar.width + 'px';
        element.style.height = pillar.height + 'px';
        element.style.borderRadius = '50%';
        element.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        element.style.boxShadow = '0 0 30px 15px rgba(255, 255, 180, 0.9)';
        element.style.zIndex = '15';
        element.style.animation = 'pillar-fade 0.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(element);

        // Update pillar object
        pillar.pillarElement = element;
    }

    /**
     * Remove a light pillar
     * @param pillar - Light pillar to remove
     */
    removeLightPillar(pillar: LightPillar): void {
        // Remove warning element if still present
        if (pillar.warningElement.parentNode) {
            pillar.warningElement.parentNode.removeChild(pillar.warningElement);
        }

        // Remove pillar element if present
        if (pillar.pillarElement && pillar.pillarElement.parentNode) {
            pillar.pillarElement.parentNode.removeChild(pillar.pillarElement);
        }
    }

    /**
     * Check if player is hit by a light pillar
     * @param player - Player entity
     * @param pillar - Light pillar
     * @returns Whether player is in pillar
     */
    isPlayerInPillar(player: any, pillar: LightPillar): boolean {
        // Calculate distance from pillar center to player center
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        const dx = playerCenterX - pillar.x;
        const dy = playerCenterY - pillar.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Player is in pillar if distance < pillar radius
        return distance < pillar.width / 2;
    }

    // ======== PHASE 3 ABILITIES ========

    /**
     * Cast judgment beam attack
     * @param player - Player entity
     */
    castJudgment(player: any): void {
        logger.debug('Church Paladin casting judgment');

        // Add charge-up visual
        this.element.classList.add('judgment-charge');

        // Position while charging
        this.moveTowardsPlayer(player, 0.3); // Slow movement during charge

        // Check if player is already dead to avoid unnecessary processing
        if (player.health <= 0 || player.isDead === true || player.isAlive === false) {
            setTimeout(() => {
                this.element.classList.remove('judgment-charge');
            }, 500);
            return;
        }

        // Schedule actual beam after charge-up
        setTimeout(() => {
            // Recheck if player is alive before firing beam
            if (player.health <= 0 || player.isDead === true || player.isAlive === false) {
                this.element.classList.remove('judgment-charge');
                return;
            }

            // Fire beam
            this.fireJudgmentBeam(player);

            // Remove charge-up visual
            this.element.classList.remove('judgment-charge');
        }, 2000); // 2 second charge-up

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK_START, this, 'judgment');
    }

    /**
     * Fire judgment beam
     * @param player - Player entity
     */
    fireJudgmentBeam(player: any): void {
        // Calculate direction to player
        const startX = this.x + this.width / 2;
        const startY = this.y + this.height / 2;
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;

        // Calculate angle
        const angle = Math.atan2(targetY - startY, targetX - startX);

        // Create beam element
        const beamLength = 1000; // Long enough to cross screen
        const beamWidth = 50;

        const beam = document.createElement('div');
        beam.className = 'judgment-beam';
        beam.style.position = 'absolute';
        beam.style.left = startX + 'px';
        beam.style.top = (startY - beamWidth / 2) + 'px';
        beam.style.width = beamLength + 'px';
        beam.style.height = beamWidth + 'px';
        beam.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        beam.style.boxShadow = '0 0 20px 10px rgba(255, 255, 180, 0.8)';
        beam.style.zIndex = '20';
        beam.style.transformOrigin = '0 50%';
        // Fix template literal
        beam.style.transform = `rotate(${angle}rad)`;
        beam.style.animation = 'beam-fade 1s forwards';

        // Add to game container
        this.gameContainer.appendChild(beam);

        // Check if player is hit
        const isHit = this.isPlayerHitByBeam(player, startX, startY, angle, beamWidth);

        if (isHit) {
            // Apply heavy damage if player has takeDamage method
            if (player.takeDamage) {
                player.takeDamage(this.damage * 3);
            }

            // Create hit effect
            this.createJudgmentHitEffect(player);
        }

        // Remove beam after animation
        setTimeout(() => {
            if (beam.parentNode) {
                beam.parentNode.removeChild(beam);
            }
        }, 1000);

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'judgment');
    }

    /**
     * Check if player is hit by judgment beam
     * @param player - Player entity
     * @param startX - Beam start X
     * @param startY - Beam start Y
     * @param angle - Beam angle
     * @param beamWidth - Beam width
     * @returns Whether player is hit
     */
    isPlayerHitByBeam(player: any, startX: number, startY: number, angle: number, beamWidth: number): boolean {
        // Add check for dead player
        // Don't hit dead players
        if (!player || !player.isAlive || player.health <= 0) return false;

        // Calculate player center
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        // Calculate vector from beam start to player
        const dx = playerCenterX - startX;
        const dy = playerCenterY - startY;

        // Calculate distance from player to beam line
        const playerDist = Math.sqrt(dx * dx + dy * dy);
        const playerAngle = Math.atan2(dy, dx);
        // Use Math.atan2 for angle difference to handle wrapping correctly
        let angleDiff = playerAngle - angle;
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;


        // Convert to perpendicular distance
        const perpDist = Math.abs(playerDist * Math.sin(angleDiff));

        // Check if player is in beam's width
        const inBeamWidth = perpDist < (beamWidth / 2 + player.width / 2); // Consider player width

        // Check if player is in front of the beam origin along the beam's direction
        // Project player vector onto beam vector
        const projectedDist = playerDist * Math.cos(angleDiff);
        const inFrontOfBeam = projectedDist > 0; // Player is in front if projection is positive

        return inBeamWidth && inFrontOfBeam;
    }

    /**
     * Create judgment hit visual effect
     * @param player - Player entity
     */
    createJudgmentHitEffect(player: any): void {
        // Create hit element
        const hit = document.createElement('div');
        hit.className = 'judgment-hit';
        hit.style.position = 'absolute';
        hit.style.left = (player.x - 20) + 'px';
        hit.style.top = (player.y - 20) + 'px';
        hit.style.width = (player.width + 40) + 'px';
        hit.style.height = (player.height + 40) + 'px';
        hit.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        hit.style.boxShadow = '0 0 30px 15px rgba(255, 255, 255, 0.9)';
        hit.style.zIndex = '25';
        hit.style.animation = 'judgment-hit-fade 0.8s forwards';

        // Add to game container
        this.gameContainer.appendChild(hit);

        // Remove after animation
        setTimeout(() => {
            if (hit.parentNode) {
                hit.parentNode.removeChild(hit);
            }
        }, 800);
    }

    /**
     * Cast holy nova - radial blast centered on Paladin
     */
    castHolyNova(): void {
        logger.debug('Church Paladin casting holy nova');

        // Add charge-up visual
        this.element.classList.add('holy-nova-charge');

        // Add focus trick
        // Add focused audio element (but immediately remove to ensure focus is cleared)
        const tempButton = document.createElement('button');
        tempButton.style.position = 'absolute';
        tempButton.style.left = '-9999px';
        document.body.appendChild(tempButton);
        // Focus and immediately blur to potentially clear focus from other elements
        tempButton.focus();
        tempButton.blur();
        setTimeout(() => {
            if (tempButton.parentNode === document.body) {
                 document.body.removeChild(tempButton);
            }
        }, 10); // Remove quickly

        // Schedule actual nova after charge-up
        setTimeout(() => {
            // Release nova
            this.releaseHolyNova();

            // Remove charge-up visual
            this.element.classList.remove('holy-nova-charge');

            // Restore focus
            // Restore keyboard focus to the game container
            if (this.gameContainer) {
                this.gameContainer.focus();
            }
        }, 1500); // 1.5 second charge-up

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK_START, this, 'holyNova');
    }

    /**
     * Release holy nova blast
     */
    releaseHolyNova(): void {
        // Create nova element
        const novaRadius = 300;
        const nova = document.createElement('div');
        nova.className = 'holy-nova';
        nova.style.position = 'absolute';
        nova.style.left = (this.x + this.width / 2 - novaRadius) + 'px';
        nova.style.top = (this.y + this.height / 2 - novaRadius) + 'px';
        nova.style.width = (novaRadius * 2) + 'px';
        nova.style.height = (novaRadius * 2) + 'px';
        nova.style.borderRadius = '50%';
        nova.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        nova.style.boxShadow = '0 0 50px 25px rgba(255, 255, 200, 0.9)';
        nova.style.zIndex = '20';
        nova.style.animation = 'nova-expand 0.8s forwards';

        // Prevent focus capture
        // Prevent nova from capturing focus/mouse events
        nova.style.pointerEvents = 'none';

        // Add to game container
        this.gameContainer.appendChild(nova);

        // Check for player hit
        // Note: This should be handled outside in game.ts when processing the BOSS_ATTACK event

        // Emit event with nova radius for damage calculation
        GameEvents.emit(EVENTS.BOSS_ATTACK, this, 'holyNova', { radius: novaRadius, damage: this.damage * 4 });

        // Remove nova after animation
        setTimeout(() => {
            if (nova.parentNode) {
                nova.parentNode.removeChild(nova);
            }

            // Restore focus
            // Restore keyboard focus
            if (this.gameContainer) {
                this.gameContainer.focus();
            }
        }, 800);
    }

    /**
     * Summon acolytes (Holy Priest enemies)
     * @param player - Player entity
     * @param enemies - Array of all enemies
     */
    summonAcolytes(player: any, enemies?: Enemy[]): void {
        logger.debug('Church Paladin summoning acolytes');

        // Number of acolytes to summon
        const acolyteCount = 2 + Math.floor(Math.random()); // 2-3 acolytes

        // Perform summoning gesture
        this.element.classList.add('summoning');

        // Summoning portal visual
        this.createSummoningPortal();

        // Schedule actual summoning after animation
        setTimeout(() => {
            // Create acolytes
            for (let i = 0; i < acolyteCount; i++) {
                this.summonAcolyte(player, enemies);
            }

            // Remove summoning visual
            this.element.classList.remove('summoning');
        }, 1500); // 1.5 second summon time

        // Emit event
        GameEvents.emit(EVENTS.BOSS_ATTACK_START, this, 'summonAcolytes');
    }

    /**
     * Create summoning portal visual effect
     */
    createSummoningPortal(): void {
        // Create portal element
        const portal = document.createElement('div');
        portal.className = 'summoning-portal';
        portal.style.position = 'absolute';
        portal.style.left = (this.x + this.width / 2 - 50) + 'px';
        portal.style.top = (this.y + this.height / 2 - 50) + 'px';
        portal.style.width = '100px';
        portal.style.height = '100px';
        portal.style.borderRadius = '50%';
        portal.style.backgroundColor = 'rgba(255, 255, 150, 0.2)';
        portal.style.border = '3px solid rgba(255, 255, 150, 0.6)';
        portal.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 150, 0.6), 0 0 20px rgba(255, 255, 150, 0.6)';
        portal.style.zIndex = '10';
        portal.style.animation = 'portal-pulse 1.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(portal);

        // Remove after animation
        setTimeout(() => {
            if (portal.parentNode) {
                portal.parentNode.removeChild(portal);
            }
        }, 1500);
    }

    /**
     * Summon a single Holy Priest acolyte
     * @param player - Player entity
     * @param enemies - Array of all enemies
     */
    summonAcolyte(player: any, enemies?: Enemy[]): void {
        // Create Holy Priest enemy
        const acolyte = new HolyPriest(this.gameContainer, player.level || 1);

        // Position around boss
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 50; // 100-150px from boss

        acolyte.x = this.x + this.width / 2 + Math.cos(angle) * distance - acolyte.width / 2;
        acolyte.y = this.y + this.height / 2 + Math.sin(angle) * distance - acolyte.height / 2;
        acolyte.updatePosition();

        // Track acolyte
        this.acolytes.push(acolyte);

        // Add to enemies array if available
        if (enemies) {
            enemies.push(acolyte);
        }

        // Create spawn effect
        this.createAcolyteSpawnEffect(acolyte.x, acolyte.y, acolyte.width, acolyte.height);

        // Emit event
        GameEvents.emit(EVENTS.ENEMY_SPAWN, acolyte, 'holyPriest');
    }

    /**
     * Create acolyte spawn visual effect
     * @param x - X position
     * @param y - Y position
     * @param width - Width
     * @param height - Height
     */
    createAcolyteSpawnEffect(x: number, y: number, width: number, height: number): void {
        // Create spawn element
        const spawn = document.createElement('div');
        spawn.className = 'acolyte-spawn';
        spawn.style.position = 'absolute';
        spawn.style.left = (x - 10) + 'px';
        spawn.style.top = (y - 10) + 'px';
        spawn.style.width = (width + 20) + 'px';
        spawn.style.height = (height + 20) + 'px';
        spawn.style.borderRadius = '50%';
        spawn.style.backgroundColor = 'rgba(255, 255, 200, 0.8)';
        spawn.style.boxShadow = '0 0 20px 10px rgba(255, 255, 200, 0.8)';
        spawn.style.zIndex = '15';
        spawn.style.animation = 'spawn-fade 0.5s forwards';

        // Add to game container
        this.gameContainer.appendChild(spawn);

        // Remove after animation
        setTimeout(() => {
            if (spawn.parentNode) {
                spawn.parentNode.removeChild(spawn);
            }
        }, 500);
    }

    /**
     * Override takeDamage to handle divine shield and other special cases
     * @param amount - Damage amount
     * @param createParticles - Function to create blood particles
     * @param projectileType - Type of projectile that caused damage
     * @returns Whether the boss died
     */
    takeDamage(
        amount: number,
        createParticles?: ParticleCreationFunction,
        projectileType?: string
    ): boolean {
        // Invulnerable during divine shield
        if (this.hasShield) {
            // Create shield impact effect
            this.createShieldImpactEffect();

            // No damage taken
            return false;
        }

        // Call parent takeDamage method
        return super.takeDamage(amount, createParticles, projectileType);
    }

    /**
     * Create shield impact visual effect
     */
    createShieldImpactEffect(): void {
        // Create impact element
        const impact = document.createElement('div');
        impact.className = 'shield-impact';
        impact.style.position = 'absolute';
        impact.style.left = (this.x - 10) + 'px';
        impact.style.top = (this.y - 10) + 'px';
        impact.style.width = (this.width + 20) + 'px';
        impact.style.height = (this.height + 20) + 'px';
        impact.style.borderRadius = '50%';
        impact.style.border = '3px solid rgba(255, 255, 200, 0.9)';
        impact.style.boxShadow = '0 0 15px 5px rgba(255, 255, 200, 0.9)';
        impact.style.zIndex = '25';
        impact.style.animation = 'impact-flash 0.3s forwards';

        // Add to game container
        this.gameContainer.appendChild(impact);

        // Remove after animation
        setTimeout(() => {
            if (impact.parentNode) {
                impact.parentNode.removeChild(impact);
            }
        }, 300);
    }

    /**
     * Drop rewards when defeated
     */
    dropRewards(): void {
        logger.debug('Church Paladin dropping rewards');

        // Call parent method
        super.dropRewards();

        // Emit special reward event with reward type
        GameEvents.emit(EVENTS.BOSS_REWARD, this, 'churchPaladin', {
            rewardType: 'holyConviction',
            duration: 3 * 60 * 1000, // 3 minutes
            powerUp: 'blessedBlood'
        });
    }

    /**
     * Clean up all resources
     * @param player - Optional player reference
     */
    cleanup(player?: any): void {
        // Clean up projectiles
        for (const projectile of this.holyProjectiles) {
            if (projectile.element.parentNode) {
                projectile.element.parentNode.removeChild(projectile.element);
            }
        }
        this.holyProjectiles = [];

        // Clean up consecration zones
        for (const zone of this.consecrationZones) {
            if (zone.element.parentNode) {
                zone.element.parentNode.removeChild(zone.element);
            }
        }
        this.consecrationZones = [];

        // Clean up light pillars
        for (const pillar of this.lightPillars) {
            this.removeLightPillar(pillar);
        }
        this.lightPillars = [];

        // Clean up acolytes
        for (const acolyte of this.acolytes) {
            acolyte.cleanup(player);
        }
        this.acolytes = [];

        // Call parent cleanup
        super.cleanup(player);
    }
}

export default ChurchPaladin;
