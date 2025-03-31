import { Enemy, ParticleCreationFunction } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('HolyPriest');

/**
 * Interface for holy shield effect
 */
interface HolyShield {
    enemyId: string;
    enemy: Enemy;
    duration: number;
    startTime: number;
    element: HTMLElement;
}

/**
 * Interface for healing tether
 */
interface HealingTether {
    enemyId: string;
    enemy: Enemy;
    element: HTMLElement;
}

/**
 * Interface for courage blessing effect
 */
interface CourageBlessing {
    enemyId: string;
    enemy: Enemy;
    duration: number;
    startTime: number;
    element: HTMLElement;
}

/**
 * HolyPriest enemy class
 * A support unit that heals and buffs other enemies
 */
export class HolyPriest extends Enemy {
    // Holy Priest specific properties
    private healingAuraRange: number;
    private healingAmount: number;
    private holyShieldCooldown: number;
    private lastShieldTime: number;
    private activeShields: Map<string, HolyShield>;
    private shieldDamageReduction: number;
    private shieldDuration: number;
    private holyBurstDamage: number;
    private holyBurstCooldown: number;
    private holyBurstRange: number;
    private lastBurstTime: number;
    private activeTethers: Map<string, HealingTether>;
    private blessingCooldown: number;
    private lastBlessingTime: number;
    private activeBlessings: Map<string, CourageBlessing>;
    private blessingDuration: number;
    private blessingBoost: number;

    /**
     * Create a new Holy Priest enemy
     * @param gameContainer - DOM element containing the game
     * @param playerLevel - Current level of the player
     */
    constructor(gameContainer: HTMLElement, playerLevel: number) {
        // Call base enemy constructor
        super(gameContainer, playerLevel);
        
        // Ensure the priest spawns fully on screen by setting position again
        this.setSpawnPosition();

        // Add holy priest class for specific styling
        this.element.classList.add('holy-priest');

        // Override visual appearance
        this.element.style.backgroundColor = "#f8f8f8"; // White/cream color
        this.element.style.border = "2px solid #ffd700"; // Gold border
        this.element.style.borderRadius = "40%"; // Rounded shape

        // Set stats based on the plan
        this.health = 100 + playerLevel * 15; // 2x basic enemy health
        this.maxHealth = this.health;
        this.damage = 0; // No contact damage
        this.speed = 0.6 + Math.random() * playerLevel * 0.05; // 0.6x basic enemy speed
        
        // Ensure width and height are set explicitly
        this.width = CONFIG.ENEMY.BASE.WIDTH;
        this.height = CONFIG.ENEMY.BASE.HEIGHT;

        // Holy Priest specific properties
        this.healingAuraRange = 150; // Radius of healing aura
        this.healingAmount = 2 + playerLevel * 0.2; // Health restored per second
        this.holyShieldCooldown = 8000; // 8 seconds between shields
        this.lastShieldTime = 0;
        this.activeShields = new Map();
        this.shieldDamageReduction = 0.3; // 30% damage reduction
        this.shieldDuration = 5000; // 5 seconds duration
        this.holyBurstDamage = 50 + playerLevel * 5; // Burst damage
        this.holyBurstCooldown = 10000; // 10 seconds cooldown
        this.holyBurstRange = 50; // Burst radius
        this.lastBurstTime = 0;
        this.activeTethers = new Map();
        this.blessingCooldown = 15000; // 15 seconds between blessings
        this.lastBlessingTime = 0;
        this.activeBlessings = new Map();
        this.blessingDuration = 8000; // 8 seconds duration
        this.blessingBoost = 0.2; // 20% boost to damage and speed
        
        // Add holy symbol to the priest
        this.addHolySymbol();
            
        // Shield self immediately on spawn
        this.applySelfShield();
    }

    /**
     * Initialize the holy priest
     */
    initialize(): void {
        super.initialize();
        logger.debug(`HolyPriest ${this.id} initialized: health=${this.health}, speed=${this.speed}`);
    }
    
    /**
     * Override updatePosition to ensure priest remains fully on screen
     */
    updatePosition(): void {
        // First ensure the position is valid (not on edge of screen)
        const margin = 20; // Keep 20px margin from screen edge
        this.x = Math.max(margin, Math.min(CONFIG.WORLD_WIDTH - this.width - margin, this.x)); // Changed from GAME_WIDTH
        this.y = Math.max(margin, Math.min(CONFIG.WORLD_HEIGHT - this.height - margin, this.y)); // Changed from GAME_HEIGHT
        
        // Then use the base implementation
        super.updatePosition();
    }

    /**
     * Add a visual holy symbol to the priest
     */
    private addHolySymbol(): void {
        const symbol = document.createElement('div');
        symbol.className = 'holy-symbol';
        this.element.appendChild(symbol);
    }

    /**
     * Apply a shield to self immediately on spawn
     */
    private applySelfShield(): void {
        // Create shield visual
        const shield = document.createElement('div');
        shield.className = 'holy-shield';
        shield.style.position = 'absolute';
        shield.style.left = '-5px';
        shield.style.top = '-5px';
        shield.style.width = (this.width + 10) + 'px';
        shield.style.height = (this.height + 10) + 'px';
        shield.style.borderRadius = '50%';
        shield.style.border = '2px solid #ffda00';
        shield.style.boxShadow = '0 0 10px #ffda00';
        shield.style.zIndex = '10';
        shield.style.pointerEvents = 'none';
        
        // Add shield to self
        this.element.appendChild(shield);
        
        // Store the shield with its metadata
        this.activeShields.set(this.id, {
            enemyId: this.id,
            enemy: this,
            duration: this.shieldDuration * 1.5, // 50% longer duration for self
            startTime: Date.now(),
            element: shield
        });
        
        logger.debug(`HolyPriest ${this.id} shielded self`);
    }

    /**
     * Update holy priest state
     * @param deltaTime - Time since last update in ms
     * @param player - The player to target
     * @param enemies - All enemies in the game
     */
    update(deltaTime: number, player?: any, enemies: Enemy[] = []): void {
        // Call parent update method which handles basic movement and state
        super.update(deltaTime);
        
        // Ensure the priest is visible on screen
        this.updatePosition();

        const now = Date.now();

        // Update existing shields
        this.updateHolyShields(now);

        // Update existing blessings
        this.updateCourageBlessings(now);
            
        // Add debug logging
        logger.debug(`HolyPriest update: player=${!!player}, enemies=${enemies.length}, pos=(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`);

        // If we have a player and enemies, handle abilities
        if (player && enemies.length > 0) {
            logger.debug('HolyPriest: Have player and enemies, applying logic');
            
            // Move to position behind other enemies
            this.moveToProtectedPosition(player, enemies);
            
            // Process healing aura
            this.healNearbyEnemies(enemies, deltaTime);
            
            // Check if we should apply holy shield
            if (now - this.lastShieldTime > this.holyShieldCooldown) {
                logger.debug('HolyPriest: Applying holy shield');
                this.applyHolyShield(enemies);
                this.lastShieldTime = now;
            }
            
            // Check if we should apply courage blessing
            if (now - this.lastBlessingTime > this.blessingCooldown) {
                logger.debug('HolyPriest: Applying courage blessing');
                this.applyCourageBlessing(enemies);
                this.lastBlessingTime = now;
            }
                
            // Check for holy burst (if player is too close)
            const distToPlayer = this.distanceTo(player);
            if (distToPlayer < this.holyBurstRange && now - this.lastBurstTime > this.holyBurstCooldown) {
                logger.debug('HolyPriest: Triggering holy burst');
                this.triggerHolyBurst(player);
                this.lastBurstTime = now;
            }
        } else {
            // If no player or enemies, make a basic movement to show activity
            logger.debug('HolyPriest: No player or enemies, using fallback movement');
            this.x += Math.cos(now / 1000) * this.speed * 0.2;
            this.y += Math.sin(now / 1000) * this.speed * 0.2;
            this.updatePosition();
        }
    }

    /**
     * Calculate distance to another entity
     * @param entity - Entity to measure distance to
     * @returns Distance in pixels
     */
    private distanceTo(entity: any): number {
        const dx = entity.x + entity.width / 2 - (this.x + this.width / 2);
        const dy = entity.y + entity.height / 2 - (this.y + this.height / 2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Move to a position behind other enemies for protection
     * @param player - The player to move relative to
     * @param enemies - All enemies in the game
     */
    private moveToProtectedPosition(player: any, enemies: Enemy[]): void {
        logger.debug(`Moving to protected position, enemies: ${enemies.length}`);
        
        // Find nearby non-priest enemies to hide behind
        const nearbyEnemies = enemies.filter(enemy => 
            enemy !== this && 
            !(enemy instanceof HolyPriest) && 
            this.distanceTo(enemy) < 200
        );
        
        logger.debug(`Nearby non-priest enemies: ${nearbyEnemies.length}`);
        
        if (nearbyEnemies.length > 0) {
            // Find the furthest enemy from the player to hide behind
            let furthestEnemy = nearbyEnemies[0];
            let maxDistance = this.distanceTo(player);
            
            for (const enemy of nearbyEnemies) {
                const enemyDistToPlayer = this.distanceTo(player);
                if (enemyDistToPlayer > maxDistance) {
                    maxDistance = enemyDistToPlayer;
                    furthestEnemy = enemy;
                }
            }
            
            // Calculate position behind the enemy relative to player
            const dx = furthestEnemy.x - player.x;
            const dy = furthestEnemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Normalize direction
                const dirX = dx / dist;
                const dirY = dy / dist;
                
                // Position slightly behind the enemy
                const targetX = furthestEnemy.x + dirX * 40;
                const targetY = furthestEnemy.y + dirY * 40;
                
                // Move towards target position
                const moveX = targetX - this.x;
                const moveY = targetY - this.y;
                const moveDist = Math.sqrt(moveX * moveX + moveY * moveY);
                
                if (moveDist > 5) {
                    this.x += (moveX / moveDist) * this.speed;
                    this.y += (moveY / moveDist) * this.speed;
                    logger.debug(`Moving behind enemy: old=(${this.x}, ${this.y}), new=(${this.x + (moveX / moveDist) * this.speed}, ${this.y + (moveY / moveDist) * this.speed})`);
                }
            }
        } else {
            // If no enemies to hide behind, move away from player
            logger.debug('No enemies to hide behind, moving away from player');
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
                
            // Move opposite direction from player with a slight random offset
            if (dist > 0) {
                const dirX = dx / dist;
                const dirY = dy / dist;
                const offsetX = (Math.random() - 0.5) * 0.2; // Small random movement
                const offsetY = (Math.random() - 0.5) * 0.2;
                
                // Move based on distance to player
                if (dist < 150) {
                    // Too close, move away quickly
                    this.x += (dirX + offsetX) * this.speed * 1.5;
                    this.y += (dirY + offsetY) * this.speed * 1.5;
                } else if (dist > 300) {
                    // Too far, move back closer (but still maintain some distance)
                    this.x -= dirX * this.speed * 0.5;
                    this.y -= dirY * this.speed * 0.5;
                } else {
                    // Good distance, make small random movements
                    this.x += offsetX * this.speed;
                    this.y += offsetY * this.speed;
                }
                
                logger.debug(`Moving relative to player: dist=${dist.toFixed(2)}, dir=(${dirX.toFixed(2)}, ${dirY.toFixed(2)})`);
            }
        }

        // Ensure we stay in bounds
        this.x = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - this.width, this.x)); // Changed from GAME_WIDTH
        this.y = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - this.height, this.y)); // Changed from GAME_HEIGHT

        // Update position
        this.updatePosition();
    }

    /**
     * Legacy moveTowardsPlayer method override for compatibility
     * @param player - The player to target
     * @param _createProjectile - Unused parameter (kept for compatibility)
     * @param enemies - All enemies in the game
     */
    moveTowardsPlayer(player: any, _createProjectile?: any, enemies: Enemy[] = []): void {
        logger.debug(`moveTowardsPlayer called in HolyPriest, player: ${!!player}, enemies: ${enemies.length}`);
        // Fall back to direct movement if enemies list is empty
        if (enemies.length === 0) {
            // Simple AI - just move toward or away from player based on distance
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Move based on distance
            if (dist > 0) {
                if (dist < 150) {
                    // Too close, move away
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                } else if (dist > 300) {
                    // Too far, move closer
                    this.x -= (dx / dist) * this.speed * 0.5;
                    this.y -= (dy / dist) * this.speed * 0.5;
                } else {
                    // Good distance, move randomly
                    this.x += (Math.random() - 0.5) * this.speed;
                    this.y += (Math.random() - 0.5) * this.speed;
                }
                
                // Update position
                this.updatePosition();
            }
        } else {
            // Use the protected position logic if enemies are available
            this.moveToProtectedPosition(player, enemies);
        }
    }

    /**
     * Heal enemies within the healing aura
     * @param enemies - All enemies in the game
     * @param deltaTime - Time since last update in ms
     */
    private healNearbyEnemies(enemies: Enemy[], deltaTime: number): void {
        // Clear old tethers
        this.activeTethers.forEach((tether, _id) => {
            if (tether.element.parentNode) {
                tether.element.parentNode.removeChild(tether.element);
            }
        });
        this.activeTethers.clear();

        // Find enemies in healing range
        const nearbyEnemies = enemies.filter(enemy =>
            enemy !== this &&
            enemy.health < enemy.maxHealth &&
            this.distanceTo(enemy) < this.healingAuraRange
        );

        // Sort by priority (Tanky Brutes and special enemies first)
        nearbyEnemies.sort((a, b) => {
            // Check enemy type - this requires instanceof checks as needed
            const aIsTanky = a.element.classList.contains('tanky-brute');
            const bIsTanky = b.element.classList.contains('tanky-brute');

            if (aIsTanky && !bIsTanky) return -1;
            if (!aIsTanky && bIsTanky) return 1;

            // If same type, prioritize most damaged
            const aHealthPercent = a.health / a.maxHealth;
            const bHealthPercent = b.health / b.maxHealth;
            return aHealthPercent - bHealthPercent;
        });

        // Apply healing to nearby enemies
        const healPerFrame = this.healingAmount * (deltaTime / 1000);

        for (const enemy of nearbyEnemies) {
            // Apply healing
            enemy.health = Math.min(enemy.maxHealth, enemy.health + healPerFrame);
            enemy.updateHealthBar();

            // Create healing tether visual
            this.createHealingTether(enemy);

            // Emit event for other systems
            GameEvents.emit(EVENTS.ENEMY_HEAL, enemy, healPerFrame);
        }

        // If all nearby enemies are at full health, consider adding shields
        if (nearbyEnemies.length === 0) {
            // Find any nearby enemies even at full health
            const nearbyFullHealthEnemies = enemies.filter(enemy =>
                enemy !== this &&
                this.distanceTo(enemy) < this.healingAuraRange
            );

            // If there are some and shield isn't on cooldown, add shields
            if (nearbyFullHealthEnemies.length > 0 && Date.now() - this.lastShieldTime > this.holyShieldCooldown) {
                this.applyHolyShield(nearbyFullHealthEnemies);
                this.lastShieldTime = Date.now();
            }
        }
    }

    /**
     * Create a visual healing tether to an enemy
     * @param enemy - Enemy to create tether to
     */
    private createHealingTether(enemy: Enemy): void {
        const tether = document.createElement('div');
        tether.className = 'healing-tether';
        this.gameContainer.appendChild(tether);

        // Update tether position
        this.updateTetherPosition(tether, enemy);

        // Store the tether
        this.activeTethers.set(enemy.id, {
            enemyId: enemy.id,
            enemy,
            element: tether
        });
    }

    /**
     * Update the position of a tether element
     * @param tetherElement - The tether DOM element
     * @param enemy - The target enemy
     */
    private updateTetherPosition(tetherElement: HTMLElement, enemy: Enemy): void {
        const priestX = this.x + this.width / 2;
        const priestY = this.y + this.height / 2;
        const enemyX = enemy.x + enemy.width / 2;
        const enemyY = enemy.y + enemy.height / 2;

        // Calculate distance and angle
        const dx = enemyX - priestX;
        const dy = enemyY - priestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Update tether position and dimensions
        tetherElement.style.width = `${distance}px`;
        tetherElement.style.left = `${priestX}px`;
        tetherElement.style.top = `${priestY}px`;
        tetherElement.style.transformOrigin = '0 0';
        tetherElement.style.transform = `rotate(${angle}deg)`;
    }

    /**
     * Apply holy shield to enemies
     * @param enemies - Enemies to consider shielding
     */
    private applyHolyShield(enemies: Enemy[]): void {
        // Prioritize enemies without shields
        const unshieldedEnemies = enemies.filter(enemy =>
            enemy !== this &&
            !this.activeShields.has(enemy.id) &&
            this.distanceTo(enemy) < this.healingAuraRange
        );

        if (unshieldedEnemies.length === 0) return;

        // Prioritize tanky enemies first
        unshieldedEnemies.sort((a, b) => {
            const aIsTanky = a.element.classList.contains('tanky-brute');
            const bIsTanky = b.element.classList.contains('tanky-brute');

            if (aIsTanky && !bIsTanky) return -1;
            if (!aIsTanky && bIsTanky) return 1;

            // Otherwise, prioritize full health enemies
            return (b.health / b.maxHealth) - (a.health / a.maxHealth);
        });

        // Shield 1-3 enemies depending on their importance
        const enemiesToShield = unshieldedEnemies.slice(0, Math.min(3, unshieldedEnemies.length));

        // Apply shields
        for (const enemy of enemiesToShield) {
            this.createHolyShield(enemy);
        }

        // Create a visual effect for the shield casting
        this.createShieldCastEffect();
    }

    /**
     * Create a visual effect for shield casting
     */
    private createShieldCastEffect(): void {
        // Create glow effect around priest
        const glow = document.createElement('div');
        glow.className = 'shield-cast-effect';
        glow.style.position = 'absolute';
        glow.style.left = this.x + 'px';
        glow.style.top = this.y + 'px';
        glow.style.width = this.width + 'px';
        glow.style.height = this.height + 'px';
        glow.style.borderRadius = '50%';
        glow.style.backgroundColor = 'transparent';
        glow.style.border = '2px solid #ffda00';
        glow.style.boxShadow = '0 0 15px #ffda00';
        glow.style.zIndex = '11';
        glow.style.animation = 'expandFade 1s forwards';

        this.gameContainer.appendChild(glow);

        // Remove after animation
        setTimeout(() => {
            if (glow.parentNode) {
                glow.parentNode.removeChild(glow);
            }
        }, 1000);

        // Emit shield cast event
        GameEvents.emit(EVENTS.ENEMY_SPECIAL_MOVE, this, 'holyShield');
    }

    /**
     * Create a holy shield on an enemy
     * @param enemy - Enemy to shield
     */
    private createHolyShield(enemy: Enemy): void {
        // Create shield visual
        const shield = document.createElement('div');
        shield.className = 'holy-shield';
        shield.style.position = 'absolute';
        shield.style.left = '-5px';
        shield.style.top = '-5px';
        shield.style.width = (enemy.width + 10) + 'px';
        shield.style.height = (enemy.height + 10) + 'px';
        shield.style.borderRadius = '50%';
        shield.style.border = '2px solid #ffda00';
        shield.style.boxShadow = '0 0 10px #ffda00';
        shield.style.zIndex = '10';
        shield.style.pointerEvents = 'none';

        // Add shield to enemy
        enemy.element.appendChild(shield);

        // Store the shield with its metadata
        this.activeShields.set(enemy.id, {
            enemyId: enemy.id,
            enemy,
            duration: this.shieldDuration,
            startTime: Date.now(),
            element: shield
        });

        // Register the shield in the enemy object for damage reduction
        if (typeof (enemy as any).registerHolyShield === 'function') {
            (enemy as any).registerHolyShield(this.shieldDamageReduction);
        } else {
            // If the enemy doesn't have a shield method, we'll need to handle it in our takeDamage override
            // But we should at least store the reference to know this enemy is shielded
        }

        // Emit shield applied event
        GameEvents.emit(EVENTS.ENEMY_BUFF, enemy, 'holyShield', this.shieldDamageReduction);
    }

    /**
     * Update all active holy shields
     * @param now - Current timestamp
     */
    private updateHolyShields(now: number): void {
        // Check each shield for expiration
        this.activeShields.forEach((shield, enemyId) => {
            const elapsed = now - shield.startTime;

            // If shield has expired or enemy is no longer valid
            if (elapsed >= shield.duration || !shield.enemy.element || !shield.enemy.element.parentNode) {
                // Remove shield element
                if (shield.element.parentNode) {
                    shield.element.parentNode.removeChild(shield.element);
                }

                // Unregister shield from enemy
                if (typeof (shield.enemy as any).unregisterHolyShield === 'function') {
                    (shield.enemy as any).unregisterHolyShield();
                }

                // Remove from tracking
                this.activeShields.delete(enemyId);

                // Emit shield removed event
                GameEvents.emit(EVENTS.ENEMY_BUFF_END, shield.enemy, 'holyShield');
            } else {
                // Update shield opacity based on remaining time
                const opacity = 0.8 * (1 - elapsed / shield.duration);
                shield.element.style.opacity = opacity.toString();
            }
        });
    }

    /**
     * Apply courage blessing to nearby enemies
     * @param enemies - All enemies in the game
     */
    private applyCourageBlessing(enemies: Enemy[]): void {
        // Find nearby enemies without blessing
        const unblessedEnemies = enemies.filter(enemy =>
            enemy !== this &&
            !this.activeBlessings.has(enemy.id) &&
            this.distanceTo(enemy) < this.healingAuraRange
        );

        if (unblessedEnemies.length === 0) return;

        // Can bless multiple enemies at once (up to 5)
        const enemiesToBless = unblessedEnemies.slice(0, Math.min(5, unblessedEnemies.length));

        // Apply blessings
        for (const enemy of enemiesToBless) {
            this.createCourageBlessing(enemy);
        }

        // Create a visual effect for the blessing
        this.createBlessingCastEffect();
    }

    /**
     * Create a visual effect for blessing casting
     */
    private createBlessingCastEffect(): void {
        // Create prayer animation
        this.element.classList.add('praying');

        // Create glow effect around priest
        const glow = document.createElement('div');
        glow.className = 'blessing-cast-effect';
        glow.style.position = 'absolute';
        glow.style.left = (this.x - 20) + 'px';
        glow.style.top = (this.y - 20) + 'px';
        glow.style.width = (this.width + 40) + 'px';
        glow.style.height = (this.height + 40) + 'px';
        glow.style.borderRadius = '50%';
        glow.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
        glow.style.border = '2px solid #ffda00';
        glow.style.boxShadow = '0 0 20px #ffda00';
        glow.style.zIndex = '11';
        glow.style.animation = 'expandFade 1.5s forwards';

        this.gameContainer.appendChild(glow);

        // Remove after animation
        setTimeout(() => {
            if (glow.parentNode) {
                glow.parentNode.removeChild(glow);
            }
            this.element.classList.remove('praying');
        }, 1500);

        // Emit blessing cast event
        GameEvents.emit(EVENTS.ENEMY_SPECIAL_MOVE, this, 'courageBlessing');
    }

    /**
     * Create a courage blessing on an enemy
     * @param enemy - Enemy to bless
     */
    private createCourageBlessing(enemy: Enemy): void {
        // Create blessing visual
        const blessing = document.createElement('div');
        blessing.className = 'courage-blessing';
        blessing.style.position = 'absolute';
        blessing.style.left = '-3px';
        blessing.style.top = '-3px';
        blessing.style.width = (enemy.width + 6) + 'px';
        blessing.style.height = (enemy.height + 6) + 'px';
        blessing.style.borderRadius = '50%';
        blessing.style.border = '2px solid #ff9900';
        blessing.style.boxShadow = '0 0 8px #ff9900';
        blessing.style.zIndex = '9';
        blessing.style.pointerEvents = 'none';

        // Add blessing to enemy
        enemy.element.appendChild(blessing);

        // Store the blessing with its metadata
        this.activeBlessings.set(enemy.id, {
            enemyId: enemy.id,
            enemy,
            duration: this.blessingDuration,
            startTime: Date.now(),
            element: blessing
        });

        // Apply temporary speed and damage boost
        if (typeof (enemy as any).registerCourageBlessing === 'function') {
            (enemy as any).registerCourageBlessing(this.blessingBoost);
        } else {
            // If the enemy doesn't have a boost method, we'll store the reference
            // The actual boost will be applied through the enemy's behavior
            // This could be enhanced with a more robust buff system
        }

        // Emit blessing applied event
        GameEvents.emit(EVENTS.ENEMY_BUFF, enemy, 'courageBlessing', this.blessingBoost);
    }
    
    /**
     * Update all active courage blessings
     * @param now - Current timestamp
     */
    private updateCourageBlessings(now: number): void {
        // Check each blessing for expiration
        this.activeBlessings.forEach((blessing, enemyId) => {
            const elapsed = now - blessing.startTime;

            // If blessing has expired or enemy is no longer valid
            if (elapsed >= blessing.duration || !blessing.enemy.element || !blessing.enemy.element.parentNode) {
                // Remove blessing element
                if (blessing.element.parentNode) {
                    blessing.element.parentNode.removeChild(blessing.element);
                }

                // Unregister blessing from enemy
                if (typeof (blessing.enemy as any).unregisterCourageBlessing === 'function') {
                    (blessing.enemy as any).unregisterCourageBlessing();
                }

                // Remove from tracking
                this.activeBlessings.delete(enemyId);

                // Emit blessing removed event
                GameEvents.emit(EVENTS.ENEMY_BUFF_END, blessing.enemy, 'courageBlessing');
            } else {
                // Update blessing opacity based on remaining time
                const opacity = 0.7 * (1 - elapsed / blessing.duration);
                blessing.element.style.opacity = opacity.toString();
            }
        });
    }

    /**
     * Trigger a holy burst when player gets too close
     * @param player - The player to damage
     */
    private triggerHolyBurst(player: any): void {
        // Create burst visual effect
        const burst = document.createElement('div');
        burst.className = 'holy-burst';
        burst.style.position = 'absolute';
        burst.style.left = (this.x + this.width / 2 - this.holyBurstRange) + 'px';
        burst.style.top = (this.y + this.height / 2 - this.holyBurstRange) + 'px';
        burst.style.width = (this.holyBurstRange * 2) + 'px';
        burst.style.height = (this.holyBurstRange * 2) + 'px';
        burst.style.borderRadius = '50%';
        burst.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        burst.style.boxShadow = '0 0 20px #ffda00';
        burst.style.zIndex = '15';
        burst.style.animation = 'holy-burst 0.5s forwards';

        this.gameContainer.appendChild(burst);

        // Remove after animation
        setTimeout(() => {
            if (burst.parentNode) {
                burst.parentNode.removeChild(burst);
            }
        }, 500);

        // Deal damage to player
        if (player && player.takeDamage) {
            player.takeDamage(this.holyBurstDamage);
        }

        // Emit burst event
        GameEvents.emit(EVENTS.ENEMY_ATTACK, this, 'holyBurst');
    }

    /**
     * Override collidesWithPlayer to ensure proper collision detection
     * @param player - The player to check collision with
     * @returns Whether collision occurred
     */
    collidesWithPlayer(player: any): boolean {
        // Use the base implementation but ensure it's properly recorded
        const collides = super.collidesWithPlayer(player);
        return collides;
    }
    
    /**
     * Override takeDamage to apply shield damage reduction to other enemies
     * @param amount - Damage amount
     * @param createParticles - Function to create blood particles
     * @param projectileType - Type of projectile that caused damage
     * @returns Whether the enemy died
     */
    takeDamage(
        amount: number,
        createParticles?: ParticleCreationFunction,
        projectileType?: string
    ): boolean {
        // Apply damage reduction from existing shield if present
        let actualDamage = amount;

        // Handle Blood Drain ability interaction
        if (projectileType === 'bloodDrain') {
            // Holy Priest's presence reduces Blood Drain effectiveness by 50%
            actualDamage *= 0.5;
        }

        // Create particles on hit
        if (createParticles) {
            createParticles(this.x + this.width / 2, this.y + this.height / 2, 3);
            // Log damage for debugging
            logger.debug(`Holy Priest ${this.id} taking damage: ${actualDamage}, current health: ${this.health}`);
        }

        // Always call super's takeDamage and return its result
        return super.takeDamage(actualDamage, undefined, projectileType);
    }

    /**
     * Clean up holy priest resources
     * @param player - Optional player reference to unregister collision
     */
    cleanup(player?: any): void {
        // Clean up all shields
        this.activeShields.forEach((shield) => {
            if (shield.element.parentNode) {
                shield.element.parentNode.removeChild(shield.element);
            }

            // Unregister shield from enemy
            if (typeof (shield.enemy as any).unregisterHolyShield === 'function') {
                (shield.enemy as any).unregisterHolyShield();
            }
        });
        this.activeShields.clear();

        // Clean up all blessings
        this.activeBlessings.forEach((blessing) => {
            if (blessing.element.parentNode) {
                blessing.element.parentNode.removeChild(blessing.element);
            }

            // Unregister blessing from enemy
            if (typeof (blessing.enemy as any).unregisterCourageBlessing === 'function') {
                (blessing.enemy as any).unregisterCourageBlessing();
            }
        });
        this.activeBlessings.clear();

        // Clean up all tethers
        this.activeTethers.forEach((tether) => {
            if (tether.element.parentNode) {
                tether.element.parentNode.removeChild(tether.element);
            }
        });
        this.activeTethers.clear();

        logger.debug(`HolyPriest ${this.id} cleanup`);
        super.cleanup(player);
    }
}

export default HolyPriest;
