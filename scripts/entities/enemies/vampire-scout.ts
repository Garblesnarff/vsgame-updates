import { Enemy, ParticleCreationFunction } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VampireScout');

/**
 * Interface for player mark effect
 */
interface PlayerMark {
    duration: number;
    startTime: number;
    element: HTMLElement;
}

/**
 * VampireScout enemy class
 * A fast, evasive enemy that can mark the player, making all enemies more effective
 */
export class VampireScout extends Enemy {
    // Vampire Scout specific properties
    private markCooldown: number;
    private lastMarkTime: number;
    private markChannelTime: number;
    private isChannelingMark: boolean;
    private channelStartTime: number;
    private markElement: HTMLElement | null;
    private playerMark: PlayerMark | null;
    private dodgeChance: number;
    private invisibilityDuration: number;
    private isInvisible: boolean;
    private invisibilityStartTime: number;
    private lastCircleAngle: number;
    private dashCooldown: number;
    private lastDashTime: number;
    private summonCooldown: number;
    private lastSummonTime: number;
    private summonCount: number;

    /**
     * Create a new Vampire Scout enemy
     * @param gameContainer - DOM element containing the game
     * @param playerLevel - Current level of the player
     */
    constructor(gameContainer: HTMLElement, playerLevel: number) {
        // Call base enemy constructor
        super(gameContainer, playerLevel);
        
        // Add vampire scout class for specific styling
        this.element.classList.add('vampire-scout');
        
        // Override visual appearance
        this.element.style.backgroundColor = "#4a235a"; // Dark purple
        this.element.style.border = "1px solid #c0392b"; // Red border
        this.element.style.borderRadius = "40%"; // Rounded shape
        this.element.style.boxShadow = "0 0 5px #c0392b"; // Red glow
        
        // Set stats based on the plan
        this.health = 40 + playerLevel * 5; // 0.8x basic enemy health
        this.maxHealth = this.health;
        this.damage = 3 + playerLevel * 0.5; // Direct contact damage
        this.speed = 2.5 + Math.random() * playerLevel * 0.15; // 2.5x basic enemy speed
        
        // Vampire Scout specific properties
        this.markCooldown = 10000; // 10 seconds between marks
        this.lastMarkTime = 0 - (3000 + Math.random() * 2000); // Start with random offset
        this.markChannelTime = 1000; // 1 second to channel mark
        this.isChannelingMark = false;
        this.channelStartTime = 0;
        this.markElement = null;
        this.playerMark = null;
        this.dodgeChance = 0.4; // 40% dodge chance
        this.invisibilityDuration = 1000; // 1 second invisibility after dodge
        this.isInvisible = false;
        this.invisibilityStartTime = 0;
        this.lastCircleAngle = Math.random() * Math.PI * 2; // Random start angle
        this.dashCooldown = 2000; // 2 seconds between dashes
        this.lastDashTime = 0 - (Math.random() * 1000); // Start with random offset
        this.summonCooldown = 20000; // 20 seconds between summons
        this.lastSummonTime = 0;
        this.summonCount = Math.max(1, Math.floor(playerLevel / 3)); // More summons at higher levels
        
        // Add red eyes
        this.addRedEyes();
    }
    
    /**
     * Initialize the vampire scout
     */
    initialize(): void {
        super.initialize();
        logger.debug(`VampireScout ${this.id} initialized: health=${this.health}, speed=${this.speed}`);
    }
    
    /**
     * Add red eyes to the scout
     */
    private addRedEyes(): void {
        // Create left eye
        const leftEye = document.createElement('div');
        leftEye.className = 'scout-eye';
        leftEye.style.position = 'absolute';
        leftEye.style.width = '4px';
        leftEye.style.height = '4px';
        leftEye.style.borderRadius = '50%';
        leftEye.style.backgroundColor = '#ff0000';
        leftEye.style.top = '8px';
        leftEye.style.left = '7px';
        leftEye.style.boxShadow = '0 0 3px #ff0000';
        
        // Create right eye
        const rightEye = document.createElement('div');
        rightEye.className = 'scout-eye';
        rightEye.style.position = 'absolute';
        rightEye.style.width = '4px';
        rightEye.style.height = '4px';
        rightEye.style.borderRadius = '50%';
        rightEye.style.backgroundColor = '#ff0000';
        rightEye.style.top = '8px';
        rightEye.style.right = '7px';
        rightEye.style.boxShadow = '0 0 3px #ff0000';
        
        this.element.appendChild(leftEye);
        this.element.appendChild(rightEye);
    }
    
    /**
     * Set the invisibility state
     * @param isInvisible - Whether the scout is invisible
     */
    private setInvisibility(isInvisible: boolean): void {
        this.isInvisible = isInvisible;
        
        if (isInvisible) {
            this.element.style.opacity = '0.2';
            this.element.style.boxShadow = 'none';
            this.invisibilityStartTime = Date.now();
        } else {
            this.element.style.opacity = '1';
            this.element.style.boxShadow = '0 0 5px #c0392b';
        }
    }
    
    /**
     * Set the channeling mark visual state
     * @param isChanneling - Whether the scout is channeling the mark
     */
    private setChannelingVisual(isChanneling: boolean): void {
        if (isChanneling) {
            this.element.classList.add('channeling-mark');
            // Add pulsing effect
            this.element.style.animation = "pulse 0.5s infinite alternate";
            
            // Create a visual beam connecting to player
            if (this.markElement === null) {
                this.markElement = document.createElement('div');
                this.markElement.className = 'mark-beam';
                this.gameContainer.appendChild(this.markElement);
            }
        } else {
            this.element.classList.remove('channeling-mark');
            this.element.style.animation = "";
            
            // Remove the visual beam
            if (this.markElement && this.markElement.parentNode) {
                this.markElement.parentNode.removeChild(this.markElement);
                this.markElement = null;
            }
        }
    }
    
    /**
     * Update vampire scout state
     * @param deltaTime - Time since last update in ms
     * @param player - The player to target
     */
    update(deltaTime: number, player?: any): void {
        super.update(deltaTime);
        
        const now = Date.now();
        
        // Update invisibility state
        if (this.isInvisible && now - this.invisibilityStartTime >= this.invisibilityDuration) {
            this.setInvisibility(false);
        }
        
        // Update marking channeling
        if (this.isChannelingMark) {
            if (player) {
                // Update mark beam position
                this.updateMarkBeamPosition(player);
                
                // Check if channel completed
                if (now - this.channelStartTime >= this.markChannelTime) {
                    this.applyMark(player);
                    this.isChannelingMark = false;
                    this.setChannelingVisual(false);
                }
            } else {
                // No player, cancel channeling
                this.isChannelingMark = false;
                this.setChannelingVisual(false);
            }
        }
        
        // Update existing player mark
        if (this.playerMark !== null) {
            if (now - this.playerMark.startTime >= this.playerMark.duration) {
                this.removePlayerMark();
            }
        }
        
        // Handle movement and abilities if we have a player
        if (player) {
            this.handleBehavior(player, now, deltaTime);
        }
    }
    
    /**
     * Handle vampire scout behavior patterns
     * @param player - The player to target
     * @param now - Current timestamp
     * @param deltaTime - Time elapsed since last frame
     */
    private handleBehavior(player: any, now: number, deltaTime: number): void {
        // If currently channeling mark, stand still
        if (this.isChannelingMark) {
            return;
        }
        
        // Calculate distance to player
        const distToPlayer = this.distanceTo(player);
        
        // Check if we should start marking the player
        if (!this.isChannelingMark && now - this.lastMarkTime >= this.markCooldown && distToPlayer < 300) {
            // Check line of sight (simple implementation - could be enhanced)
            const hasLineOfSight = true; // In a more complex game, check for obstacles
            
            if (hasLineOfSight && Math.random() < 0.8) { // 80% chance to try to mark when possible
                this.startChannelingMark();
                this.channelStartTime = now;
                return;
            }
        }
        
        // Check if we should summon more enemies when player is marked
        if (this.playerMark !== null && now - this.lastSummonTime >= this.summonCooldown) {
            this.summonEnemies();
            this.lastSummonTime = now;
        }
        
        // Implement circling and dash behavior
        this.handleMovement(player, now, deltaTime);
    }
    
    /**
     * Handle vampire scout movement patterns
     * @param player - The player to target
     * @param now - Current timestamp
     * @param deltaTime - Time elapsed since last frame
     */
    private handleMovement(player: any, now: number, deltaTime: number): void {
        // Calculate base values
        const distToPlayer = this.distanceTo(player);
        const dx = player.x + player.width / 2 - (this.x + this.width / 2);
        const dy = player.y + player.height / 2 - (this.y + this.height / 2);
        const angle = Math.atan2(dy, dx);
        
        // Determine if we should dash
        const shouldDash = now - this.lastDashTime >= this.dashCooldown && Math.random() < 0.3;
        
        if (shouldDash) {
            // Execute a dash in a random direction
            this.executeDash();
            this.lastDashTime = now;
        } else {
            // Normal circling movement
            // Ideal distance is between 150 and 250 pixels from player
            let speedMultiplier = 1.0;
            
            if (distToPlayer < 150) {
                // Too close, move away slightly faster
                speedMultiplier = 1.2;
            } else if (distToPlayer > 250) {
                // Too far, move closer
                this.x += Math.cos(angle) * this.speed * 0.8 * (deltaTime / 16);
                this.y += Math.sin(angle) * this.speed * 0.8 * (deltaTime / 16);
            }
            
            // Adjust circle angle
            this.lastCircleAngle += 0.05 * (deltaTime / 16);
            if (this.lastCircleAngle > Math.PI * 2) this.lastCircleAngle -= Math.PI * 2;
            
            // Calculate circle position
            const circleX = Math.cos(angle + Math.PI/2 + Math.sin(this.lastCircleAngle));
            const circleY = Math.sin(angle + Math.PI/2 + Math.sin(this.lastCircleAngle));
            
            // Apply movement
            this.x += circleX * this.speed * speedMultiplier * (deltaTime / 16);
            this.y += circleY * this.speed * speedMultiplier * (deltaTime / 16);
            
            // Add small random movement to make it harder to predict
            this.x += (Math.random() - 0.5) * this.speed * 0.3 * (deltaTime / 16);
            this.y += (Math.random() - 0.5) * this.speed * 0.3 * (deltaTime / 16);
        }
        
        // Ensure we stay in bounds
        this.x = Math.max(0, Math.min(CONFIG.GAME_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(CONFIG.GAME_HEIGHT - this.height, this.y));
        
        // Update position
        this.updatePosition();
    }
    
    /**
     * Legacy moveTowardsPlayer method override for compatibility
     * @param player - The player to target
     * @param _createProjectile - Unused parameter (kept for compatibility)
     */
    moveTowardsPlayer(player: any, _createProjectile?: any): void {
        this.handleBehavior(player, Date.now(), 16); // Assume 16ms for legacy compatibility
    }
    
    /**
     * Execute a dash in a random direction
     */
    private executeDash(): void {
        // Choose a random angle
        const dashAngle = Math.random() * Math.PI * 2;
        const dashDistance = 80 + Math.random() * 40; // 80-120 pixels
        
        // Calculate new position
        this.x += Math.cos(dashAngle) * dashDistance;
        this.y += Math.sin(dashAngle) * dashDistance;
        
        // Create dash visual effect
        this.createDashEffect(dashAngle, dashDistance);
        
        // Emit dash event
        GameEvents.emit(EVENTS.ENEMY_SPECIAL_MOVE, this, 'dash');
    }
    
    /**
     * Create a visual effect for dashing
     * @param angle - Angle of the dash
     * @param distance - Distance of the dash
     */
    private createDashEffect(angle: number, distance: number): void {
        // Create a trail effect
        const trail = document.createElement('div');
        trail.className = 'dash-trail';
        trail.style.position = 'absolute';
        trail.style.width = `${distance}px`;
        trail.style.height = '3px';
        trail.style.backgroundColor = 'rgba(169, 92, 232, 0.5)';
        trail.style.transformOrigin = '0 0';
        trail.style.transform = `rotate(${angle}rad)`;
        trail.style.left = `${this.x + this.width/2}px`;
        trail.style.top = `${this.y + this.height/2}px`;
        trail.style.zIndex = '5';
        
        this.gameContainer.appendChild(trail);
        
        // Remove after a short time
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 300);
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
     * Start channeling the mark ability
     */
    private startChannelingMark(): void {
        this.isChannelingMark = true;
        this.setChannelingVisual(true);
        
        // Emit event for sound effects or other feedback
        GameEvents.emit(EVENTS.ENEMY_ATTACK_START, this, 'markChannel');
    }
    
    /**
     * Update the mark beam position
     * @param player - The player to target
     */
    private updateMarkBeamPosition(player: any): void {
        if (!this.markElement) return;
        
        const scoutX = this.x + this.width / 2;
        const scoutY = this.y + this.height / 2;
        const playerX = player.x + player.width / 2;
        const playerY = player.y + player.height / 2;
        
        // Calculate distance and angle
        const dx = playerX - scoutX;
        const dy = playerY - scoutY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Update beam position and dimensions
        this.markElement.style.width = `${distance}px`;
        this.markElement.style.height = '2px';
        this.markElement.style.position = 'absolute';
        this.markElement.style.left = `${scoutX}px`;
        this.markElement.style.top = `${scoutY}px`;
        this.markElement.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
        this.markElement.style.transformOrigin = '0 0';
        this.markElement.style.transform = `rotate(${angle}deg)`;
        this.markElement.style.zIndex = '20';
    }
    
    /**
     * Apply the mark to the player
     * @param player - The player to mark
     */
    private applyMark(player: any): void {
        // Update last mark time
        this.lastMarkTime = Date.now();
        
        // Create mark visual
        const markElement = document.createElement('div');
        markElement.className = 'player-mark';
        markElement.style.position = 'absolute';
        markElement.style.width = `${player.width + 20}px`;
        markElement.style.height = `${player.height + 20}px`;
        markElement.style.left = `-10px`;
        markElement.style.top = `-10px`;
        markElement.style.borderRadius = '50%';
        markElement.style.border = '2px solid rgba(255, 0, 0, 0.7)';
        markElement.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
        markElement.style.pointerEvents = 'none';
        markElement.style.zIndex = '10';
        
        // Add mark to player
        player.element.appendChild(markElement);
        
        // Create mark data
        this.playerMark = {
            duration: 8000, // 8 seconds duration
            startTime: Date.now(),
            element: markElement
        };
        
        // Apply mark effects to player
        if (typeof player.applyVampireScoutMark === 'function') {
            player.applyVampireScoutMark(0.5); // Reduce energy regen by 50%
        }
        
        // Broadcast mark applied event to affect all enemies
        GameEvents.emit(EVENTS.PLAYER_DEBUFF, 'vampireScoutMark', 8000, {
            speedBonus: 0.3, // 30% speed bonus
            damageBonus: 0.2, // 20% damage bonus
            perfectTracking: true // Perfect tracking of player position
        });
        
        // Sound effect
        GameEvents.emit(EVENTS.ENEMY_ATTACK, this, 'markApplied');
    }
    
    /**
     * Remove the mark from the player
     */
    private removePlayerMark(): void {
        if (!this.playerMark) return;
        
        // Remove mark visual
        if (this.playerMark.element.parentNode) {
            this.playerMark.element.parentNode.removeChild(this.playerMark.element);
        }
        
        // Reset player mark data
        this.playerMark = null;
        
        // Broadcast mark removed event
        GameEvents.emit(EVENTS.PLAYER_DEBUFF_END, 'vampireScoutMark');
    }
    
    /**
     * Summon additional enemies when player is marked
     */
    private summonEnemies(): void {
        // Emit event for other systems to handle the actual spawning
        GameEvents.emit(EVENTS.ENEMY_SUMMON, {
            position: { x: this.x, y: this.y },
            count: this.summonCount,
            types: ['basic'], // Could be configurable
            spawnRadius: 50
        });
        
        // Create summon visual effect
        this.createSummonEffect();
    }
    
    /**
     * Create visual effect for summoning
     */
    private createSummonEffect(): void {
        // Create summon circle
        const summonCircle = document.createElement('div');
        summonCircle.className = 'summon-circle';
        summonCircle.style.position = 'absolute';
        summonCircle.style.left = `${this.x - 25}px`;
        summonCircle.style.top = `${this.y - 25}px`;
        summonCircle.style.width = '100px';
        summonCircle.style.height = '100px';
        summonCircle.style.borderRadius = '50%';
        summonCircle.style.border = '2px solid rgba(128, 0, 128, 0.7)';
        summonCircle.style.boxShadow = '0 0 15px rgba(128, 0, 128, 0.5)';
        summonCircle.style.zIndex = '5';
        summonCircle.style.animation = 'expand-fade 1s forwards';
        
        this.gameContainer.appendChild(summonCircle);
        
        // Remove after animation completes
        setTimeout(() => {
            if (summonCircle.parentNode) {
                summonCircle.parentNode.removeChild(summonCircle);
            }
        }, 1000);
    }
    
    /**
     * Override takeDamage to implement dodge chance and invisibility
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
        // Check for dodge
        let dodgeSuccessful = false;
        
        // Special interaction with Bat Swarm - lower dodge chance
        if (projectileType === 'batSwarm') {
            dodgeSuccessful = Math.random() < this.dodgeChance * 0.5; // 50% less effective
        } 
        // Special interaction with Shadow Dash - higher hit chance
        else if (projectileType === 'shadowDash') {
            dodgeSuccessful = Math.random() < this.dodgeChance * 0.3; // 70% less effective
        }
        else {
            dodgeSuccessful = Math.random() < this.dodgeChance;
        }
        
        if (dodgeSuccessful) {
            // Create dodge visual effect
            this.createDodgeEffect();
            
            // Become briefly invisible
            this.setInvisibility(true);
            
            // Emit dodge event
            GameEvents.emit(EVENTS.ENEMY_DODGE, this, projectileType || 'unknown');
            
            // Cancel channeling if we were marking
            if (this.isChannelingMark) {
                this.isChannelingMark = false;
                this.setChannelingVisual(false);
            }
            
            return false; // Didn't die
        }
        
        // Apply damage normally if dodge failed
        return super.takeDamage(amount, createParticles, projectileType);
    }
    
    /**
     * Create a visual effect for dodging
     */
    private createDodgeEffect(): void {
        // Create afterimage
        const afterimage = document.createElement('div');
        afterimage.className = 'dodge-afterimage';
        afterimage.style.position = 'absolute';
        afterimage.style.left = `${this.x}px`;
        afterimage.style.top = `${this.y}px`;
        afterimage.style.width = `${this.width}px`;
        afterimage.style.height = `${this.height}px`;
        afterimage.style.backgroundColor = 'rgba(74, 35, 90, 0.4)';
        afterimage.style.borderRadius = '40%';
        afterimage.style.zIndex = '5';
        afterimage.style.animation = 'fade-out 0.5s forwards';
        
        this.gameContainer.appendChild(afterimage);
        
        // Remove after animation completes
        setTimeout(() => {
            if (afterimage.parentNode) {
                afterimage.parentNode.removeChild(afterimage);
            }
        }, 500);
    }
    
    /**
     * Clean up vampire scout resources
     * @param player - Optional player reference
     */
    cleanup(player?: any): void {
        // Remove mark beam if active
        if (this.markElement && this.markElement.parentNode) {
            this.markElement.parentNode.removeChild(this.markElement);
        }
        
        // Remove player mark if active
        if (this.playerMark && this.playerMark.element.parentNode) {
            this.playerMark.element.parentNode.removeChild(this.playerMark.element);
            
            // Remove mark effects from player
            if (player && typeof player.removeVampireScoutMark === 'function') {
                player.removeVampireScoutMark();
            }
            
            // Broadcast mark removed event
            GameEvents.emit(EVENTS.PLAYER_DEBUFF_END, 'vampireScoutMark');
        }
        
        logger.debug(`VampireScout ${this.id} cleanup`);
        super.cleanup(player);
    }
    
    /**
     * Special death effect - dissolve into bats
     */
    dissolveIntoBats(): void {
        // Create bat particles
        for (let i = 0; i < 8; i++) {
            const bat = document.createElement('div');
            bat.className = 'bat-particle';
            bat.style.position = 'absolute';
            bat.style.width = '6px';
            bat.style.height = '4px';
            bat.style.backgroundColor = '#2c3e50';
            bat.style.borderRadius = '50%';
            bat.style.left = `${this.x + this.width/2}px`;
            bat.style.top = `${this.y + this.height/2}px`;
            bat.style.zIndex = '15';
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const dirX = Math.cos(angle) * speed;
            const dirY = Math.sin(angle) * speed;
            
            // Animation
            bat.style.animation = 'bat-dissolve 1s forwards';
            
            this.gameContainer.appendChild(bat);
            
            // Animate bat movement
            let frameCount = 0;
            const animateBat = () => {
                const left = parseFloat(bat.style.left);
                const top = parseFloat(bat.style.top);
                
                bat.style.left = `${left + dirX}px`;
                bat.style.top = `${top + dirY + Math.sin(frameCount * 0.2) * 2}px`; // Add wave motion
                
                frameCount++;
                
                if (frameCount < 30) {
                    requestAnimationFrame(animateBat);
                } else {
                    // Remove bat after animation
                    if (bat.parentNode) {
                        bat.parentNode.removeChild(bat);
                    }
                }
            };
            
            requestAnimationFrame(animateBat);
        }
    }
}

export default VampireScout;