import { Enemy } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VampireHunter');

/**
 * VampireHunter enemy class
 * A ranged enemy that maintains distance and fires projectiles at the player
 */
export class VampireHunter extends Enemy {
  // Vampire Hunter specific properties
  private projectileCooldown: number;
  private lastFired: number;
  private detectionRadius: number;
  private aimingTime: number;
  // @ts-ignore: This is used in state transitions
  private isAiming: boolean;
  private aimStartTime: number;
  private preferredDistance: number;
  private projectileSpeed: number;
  private projectileDamage: number;
  
  // State management
  private state: 'patrol' | 'aim' | 'fire' | 'reposition';

  /**
   * Create a new Vampire Hunter enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    // Call base enemy constructor
    super(gameContainer, playerLevel);
    
    // Add vampire hunter class for specific styling
    this.element.classList.add('vampire-hunter');
    
    // Override visual appearance
    this.element.style.backgroundColor = "#a05000"; // Brown/amber color
    this.element.style.borderRadius = "0"; // Square shape to distinguish from basic enemies
    
    // Set unique stats for Vampire Hunter
    this.health = CONFIG.ENEMY.VAMPIRE_HUNTER.BASE_HEALTH * 0.8 + playerLevel * 8; // Medium health
    this.maxHealth = this.health;
    this.damage = CONFIG.ENEMY.VAMPIRE_HUNTER.BASE_DAMAGE * 0.7 + playerLevel * 0.7; // Less direct damage
    this.speed = 0.8 + Math.random() * playerLevel * 0.1; // Slower than basic enemies
    
    // Ranged attack properties
    this.projectileCooldown = CONFIG.ENEMY.VAMPIRE_HUNTER.PROJECTILE_COOLDOWN;
    this.lastFired = 0;
    this.detectionRadius = CONFIG.ENEMY.VAMPIRE_HUNTER.DETECTION_RADIUS + playerLevel * 5;
    this.aimingTime = 700; // Time spent aiming before firing
    this.isAiming = false; 
    this.aimStartTime = 0;
    this.preferredDistance = CONFIG.ENEMY.VAMPIRE_HUNTER.PREFERRED_DISTANCE;
    this.projectileSpeed = CONFIG.ENEMY.VAMPIRE_HUNTER.PROJECTILE_SPEED;
    this.projectileDamage = CONFIG.ENEMY.VAMPIRE_HUNTER.BASE_DAMAGE * 
                           CONFIG.ENEMY.VAMPIRE_HUNTER.PROJECTILE_DAMAGE_MULTIPLIER + 
                           playerLevel * 1.5;
    
    // Initial state
    this.state = 'patrol';
    
    // Add indicator for ranged enemy
    this.addRangedIndicator();
    
    // Set the initial aim visual state
    this.setAimingVisual(false);
  }
  
  /**
   * Initialize the vampire hunter
   */
  initialize(): void {
    super.initialize();
    logger.debug(`VampireHunter ${this.id} initialized`);
  }
  
  /**
   * Update vampire hunter state
   * @param deltaTime - Time since last update in ms
   * @param player - The player to target
   * @param createProjectile - Function to create projectiles
   */
  update(deltaTime: number, player?: any, createProjectile?: any): void {
    super.update(deltaTime);
    
    // Move towards player if we have one
    if (player) {
      this.handleBehavior(player, createProjectile);
    }
  }
  
  /**
   * Add a visual indicator that this is a ranged enemy
   */
  private addRangedIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'hunter-indicator';
    this.element.appendChild(indicator);
  }
  
  /**
   * Handle the aiming state visualization
   * @param isAiming - Whether the hunter is aiming
   */
  private setAimingVisual(isAiming: boolean): void {
    if (isAiming) {
      this.element.classList.add('hunter-aiming');
    } else {
      this.element.classList.remove('hunter-aiming');
    }
  }
  
  /**
   * Handle the vampire hunter's behavior
   * This replaces the old moveTowardsPlayer method to better follow the lifecycle pattern
   * @param player - Player object to track
   * @param createProjectile - Function to create a projectile
   */
  private handleBehavior(player: any, createProjectile?: any): void {
    // Only proceed if we have the player
    if (!player) return;
    
    const now = Date.now();
    
    // Calculate distance to player
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Determine normalized direction
    const dirX = dx / distToPlayer;
    const dirY = dy / distToPlayer;
    
    // State machine for Vampire Hunter behavior
    switch (this.state) {
      case 'patrol':
        // If player is in detection range, start aiming
        if (distToPlayer <= this.detectionRadius) {
          this.state = 'aim';
          this.aimStartTime = now;
          
          this.isAiming = true;
          this.setAimingVisual(true);
        } else {
          // Move slowly towards player
          this.x += dirX * this.speed * 0.5;
          this.y += dirY * this.speed * 0.5;
        }
        break;
        
      case 'aim':
        // If player moves out of range while aiming, go back to patrol
        if (distToPlayer > this.detectionRadius) {
          this.state = 'patrol';          
          this.isAiming = false;
          this.setAimingVisual(false);
        } 
        // If aiming time completed, fire
        else if (now - this.aimStartTime >= this.aimingTime) {
          this.state = 'fire';
          this.isAiming = false;
          this.setAimingVisual(false);
        }
        // While aiming, stand still
        break;
        
      case 'fire':
        // Fire a projectile at the player
        if (createProjectile && now - this.lastFired >= this.projectileCooldown) {
          this.fireProjectile(player, createProjectile);
          this.lastFired = now;
          this.state = 'reposition';
        }
        break;
        
      case 'reposition':
        // After firing, move to maintain preferred distance
        if (distToPlayer < this.preferredDistance - 50) {
          // Too close, move away
          this.x -= dirX * this.speed;
          this.y -= dirY * this.speed;
        } else if (distToPlayer > this.preferredDistance + 50) {
          // Too far, move closer
          this.x += dirX * this.speed * 0.5;
          this.y += dirY * this.speed * 0.5;
        } else {
          // Good distance, start aiming again if cooldown elapsed
          if (now - this.lastFired >= this.projectileCooldown) {
            
            this.state = 'aim';
            this.aimStartTime = now;
            this.isAiming = true;
            this.setAimingVisual(true);
          } else {
            // Strafe perpendicular to player
            const strafeDir = Math.random() > 0.5 ? 1 : -1;
            this.x += -dirY * this.speed * 0.5 * strafeDir;
            this.y += dirX * this.speed * 0.5 * strafeDir;
          }
        }
        break;
    }
    
    // Update position
    this.updatePosition();
  }
  
  /**
   * Legacy moveTowardsPlayer method for backwards compatibility
   * @param player - Player object to track
   * @param createProjectile - Function to create a projectile
   */
  moveTowardsPlayer(player: any, createProjectile?: any): void {
    this.handleBehavior(player, createProjectile);
  }
  
  /**
   * Fire a projectile at the player
   * @param player - Player target
   * @param createProjectile - Function to create a projectile
   */
  private fireProjectile(player: any, createProjectile: any): void {
    // Calculate direction toward player
    const targetX = player.x + player.width / 2;
    const targetY = player.y + player.height / 2;
    const sourceX = this.x + this.width / 2;
    const sourceY = this.y + this.height / 2;
    
    // Calculate angle
    const angle = Math.atan2(
      targetY - sourceY,
      targetX - sourceX
    );
    
    // Create projectile with isEnemyProjectile flag to prevent self-damage
    createProjectile({
      x: sourceX,
      y: sourceY,
      vx: Math.cos(angle) * this.projectileSpeed,
      vy: Math.sin(angle) * this.projectileSpeed,
      damage: this.projectileDamage,
      isEnemyProjectile: true,  // This flag is crucial!
      isAutoAttack: false,      // Not an auto-attack
      className: "enemy-projectile",
      angle: angle
    });
    
    // Emit event
    GameEvents.emit(EVENTS.ENEMY_ATTACK, this);
  }
  
  /**
   * Clean up vampire hunter resources
   * @param player - Optional player to unregister with
   */
  cleanup(player?: any): void {
    logger.debug(`VampireHunter ${this.id} cleanup`);
    super.cleanup(player);
  }
}

export default VampireHunter;