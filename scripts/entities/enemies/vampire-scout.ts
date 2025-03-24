import { Enemy } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { StateMachine } from '../../hsm/state-machine';
import { IdleState, PursueState, AttackState, FleeState, DodgeState, EnemyWithAI } from './ai/enemy-states';

/**
 * VampireScout enemy class
 * A nimble vampire traitor who serves vampire hunters, using supernatural abilities to track and mark the player
 */
export class VampireScout extends Enemy implements EnemyWithAI {
    // Marking ability properties
    private markCooldown: number = 10000; // 10 seconds
    private lastMarkTime: number = 0;
    private markDuration: number = 8000; // 8 seconds
    private isMarking: boolean = false;
    private markChannelTime: number = 1000; // 1 second
    private markChannelStart: number = 0;

    // Movement and evasion properties
    // Changed from private to protected to match EnemyWithAI interface
    protected isInvisible: boolean = false;
    protected invisibilityDuration: number = 1000; // 1 second
    protected invisibilityStart: number = 0;
    protected circlingRadius: number = 200;
    protected circlingSpeed: number = Math.PI / 2; // Radians per second
    protected circlingAngle: number = 0;
    protected lastDashTime: number = 0;
    protected dashCooldown: number = 2000; // 2 seconds between dashes
    protected dashDuration: number = 300; // 0.3 seconds per dash
    protected isDashing: boolean = false;
    protected dashStartTime: number = 0;
    protected dashDirection: { x: number; y: number } = { x: 0, y: 0 };

    // AI properties required by EnemyWithAI interface
    stateMachine?: StateMachine<EnemyWithAI>;
    targetPlayer?: any;
    lastStateChange?: number;
    lowHealthThreshold?: number;
    fleeTime?: number;
    isRetreating?: boolean;
    retreatStartTime?: number;
    retreatDuration?: number;
    formationPosition?: { x: number, y: number };
    role?: string;
    attackCooldown?: number;
    lastAttackTime?: number;
    specialAttackCooldown?: number;
    lastSpecialAttackTime?: number;
    // dodgeChance is already defined in base-enemy.ts
    lastDodgeTime?: number;
    dodgeCooldown?: number;

    /**
     * Create a new Vampire Scout enemy
     * @param gameContainer - DOM element containing the game
     * @param playerLevel - Current level of the player
     */
    constructor(gameContainer: HTMLElement, playerLevel: number) {
        super(gameContainer, playerLevel);

        // Add vampire scout specific styling
        this.element.classList.add('vampire-scout');

        // Override base enemy stats
        this.health = CONFIG.ENEMY.BASE.BASE_HEALTH * 0.8 + playerLevel * 8; // 0.8x basic enemy health
        this.maxHealth = this.health;
        this.damage = 3 + playerLevel * 0.5; // Base damage 3
        this.speed = CONFIG.ENEMY.BASE.BASE_SPEED * CONFIG.ENEMY.VAMPIRE_SCOUT.SPEED_MULTIPLIER;

        // Create visual elements for the scout
        this.createVisualElements();
    }

    /**
     * Initialize the enemy
     */
    initialize(): void {
        super.initialize();
        
        // Set up AI state machine with higher dodge chance
        this.dodgeChance = 0.4; // 40% chance to dodge
        this.lowHealthThreshold = 0.3; // Flee at 30% health
        this.attackCooldown = 800; // Attack every 0.8 seconds
        this.dodgeCooldown = 2000; // 2 seconds between dodges
        
        // Initialize with idle state
        this.stateMachine = new StateMachine<EnemyWithAI>(
            this,
            new IdleState()
        );
    }

    /**
     * Create visual elements for the vampire scout
     */
    private createVisualElements(): void {
        // Create mask element
        const mask = document.createElement('div');
        mask.className = 'vampire-scout-mask';
        this.element.appendChild(mask);

        // Create eyes
        const leftEye = document.createElement('div');
        leftEye.className = 'vampire-scout-eye left';
        const rightEye = document.createElement('div');
        rightEye.className = 'vampire-scout-eye right';
        mask.appendChild(leftEye);
        mask.appendChild(rightEye);

        // Create cloak effect
        const cloak = document.createElement('div');
        cloak.className = 'vampire-scout-cloak';
        this.element.appendChild(cloak);
    }

    /**
     * Update enemy state
     * @param deltaTime - Time since last update in ms
     * @param player - Reference to the player
     * @param enemies - Array of all enemies
     */
    update(deltaTime: number, player?: any, enemies?: Enemy[]): void {
        if (!player) return;

        const now = Date.now();

        // Handle invisibility
        if (this.isInvisible && now - this.invisibilityStart >= this.invisibilityDuration) {
            this.isInvisible = false;
            this.element.classList.remove('invisible');
        }

        // Handle marking ability
        if (this.isMarking) {
            if (now - this.markChannelStart >= this.markChannelTime) {
                this.completeMark(player, enemies);
            }
        } else if (now - this.lastMarkTime >= this.markCooldown) {
            this.tryMark(player);
        }

        // Update target player reference for AI
        this.targetPlayer = player;
        
        // Update AI state machine if not marking
        if (!this.isMarking && this.stateMachine) {
            this.stateMachine.update(deltaTime);
        } else if (!this.isMarking) {
            // Fallback to basic behavior if no state machine or if marking
            this.moveTowardsPlayer(player, null, enemies);
        }

        super.update(deltaTime);
    }

    /**
     * Override movement to implement circling and dashing behavior
     */
    moveTowardsPlayer(player: any, _createProjectile?: any, _enemies?: Enemy[]): void {
        if (!player) return;

        const now = Date.now();

        // If currently dashing, continue dash
        if (this.isDashing) {
            if (now - this.dashStartTime < this.dashDuration) {
                this.x += this.dashDirection.x * this.speed * 2;
                this.y += this.dashDirection.y * this.speed * 2;
            } else {
                this.isDashing = false;
            }
        } 
        // Not dashing - normal movement
        else {
            // Try to start a new dash
            if (now - this.lastDashTime >= this.dashCooldown && Math.random() < 0.1) {
                this.startDash(player);
            } else {
                // Circle around the player
                this.circlingAngle += this.circlingSpeed * (now - this.lastDashTime) / 1000;
                
                const targetX = player.x + Math.cos(this.circlingAngle) * this.circlingRadius;
                const targetY = player.y + Math.sin(this.circlingAngle) * this.circlingRadius;

                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    this.x += (dx / dist) * this.speed;
                    this.y += (dy / dist) * this.speed;
                }
            }
        }

        this.updatePosition();
    }

    /**
     * Start a dash movement
     */
    private startDash(player: any): void {
        this.isDashing = true;
        this.dashStartTime = Date.now();
        this.lastDashTime = this.dashStartTime;

        // Calculate random dash direction with slight bias toward player
        const randomAngle = Math.random() * Math.PI * 2;
        const toPlayerAngle = Math.atan2(
            player.y - this.y,
            player.x - this.x
        );

        // Blend between random and player-directed angle
        const finalAngle = randomAngle * 0.7 + toPlayerAngle * 0.3;

        this.dashDirection = {
            x: Math.cos(finalAngle),
            y: Math.sin(finalAngle)
        };

        // Add dash effect
        this.element.classList.add('dashing');
        setTimeout(() => {
            this.element.classList.remove('dashing');
        }, this.dashDuration);
    }

    /**
     * Try to mark the player
     */
    private tryMark(player: any): void {
        // Check if in range and has line of sight
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 300) { // Mark range
            this.isMarking = true;
            this.markChannelStart = Date.now();
            this.element.classList.add('marking');
        }
    }

    /**
     * Complete the marking process
     */
    private completeMark(player: any, enemies?: Enemy[]): void {
        this.isMarking = false;
        this.lastMarkTime = Date.now();
        this.element.classList.remove('marking');

        // Apply mark to player
        if (player.element) {
            player.element.classList.add('marked');
            setTimeout(() => {
                player.element.classList.remove('marked');
            }, this.markDuration);
        }

        // Apply buffs to all enemies
        if (enemies) {
            for (const enemy of enemies) {
                if (enemy.id !== this.id) {
                    enemy.speed *= 1.3; // 30% speed boost
                    // Damage boost handled in enemy's damage calculation
                }
            }

            // Reset enemy stats after mark duration
            setTimeout(() => {
                for (const enemy of enemies) {
                    if (enemy.id !== this.id) {
                        enemy.speed /= 1.3;
                    }
                }
            }, this.markDuration);
        }

        // Emit mark event for other systems
        GameEvents.emit(EVENTS.PLAYER_MARKED, this.markDuration);
    }

    /**
     * Override damage handling to implement dodge chance
     */
    takeDamage(amount: number, createParticles?: any, projectileType?: string): boolean {
        // Try to dodge
        if (Math.random() < (this.dodgeChance || 0.4)) {
            // Become invisible
            this.isInvisible = true;
            this.invisibilityStart = Date.now();
            this.element.classList.add('invisible');

            // Create dodge indicator
            const dodgeText = document.createElement('div');
            dodgeText.className = 'dodge-indicator';
            dodgeText.textContent = 'DODGE!';
            dodgeText.style.left = (this.x + this.width / 2) + 'px';
            dodgeText.style.top = (this.y - 20) + 'px';
            this.gameContainer.appendChild(dodgeText);

            // Remove dodge indicator after animation
            setTimeout(() => {
                if (dodgeText.parentNode) {
                    dodgeText.parentNode.removeChild(dodgeText);
                }
            }, 1000);

            return false;
        }

        // If not dodged, take damage normally
        return super.takeDamage(amount, createParticles, projectileType);
    }

    /**
     * Clean up the enemy
     */
    cleanup(player?: any): void {
        // Play death animation
        this.element.classList.add('death');
        
        // Delay actual cleanup for animation
        setTimeout(() => {
            super.cleanup(player);
        }, 1000);
    }
}

export default VampireScout;
