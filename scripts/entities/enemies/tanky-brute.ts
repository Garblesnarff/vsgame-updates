import { Enemy } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';

/**
 * TankyBrute enemy class
 * A slow, high-health enemy with area damage and damage resistance
 */
export class TankyBrute extends Enemy {
  // Tanky Brute specific properties
  private slamAttackCooldown: number;
  private lastSlamAttack: number;
  private slamAttackRadius: number;
  private slamAttackDamage: number;
  private damageReduction: number;
  private isCharging: boolean;
  private chargeStartTime: number;
  private chargeTime: number;
  private bloodLanceVulnerabilityMultiplier: number;

  /**
   * Create a new Tanky Brute enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    // Call base enemy constructor
    super(gameContainer, playerLevel);
    
    // Add tanky brute class for specific styling
    this.element.classList.add('tanky-brute');
    
    // Override size and appearance - make it larger
    const sizeMultiplier = CONFIG.ENEMY.TANKY_BRUTE.SIZE_MULTIPLIER;
    this.width = CONFIG.ENEMY.TANKY_BRUTE.WIDTH * sizeMultiplier;
    this.height = CONFIG.ENEMY.TANKY_BRUTE.HEIGHT * sizeMultiplier;
    this.element.style.width = this.width + "px";
    this.element.style.height = this.height + "px";
    this.element.style.backgroundColor = "#6a0dad"; // Purple color
    this.element.style.borderRadius = "5px"; // Keep square-ish shape but with rounded corners
    
    // Set unique stats for Tanky Brute
    const levelMultiplier = 1 + (playerLevel * 0.2);
    const healthMultiplier = CONFIG.ENEMY.TANKY_BRUTE.HEALTH_MULTIPLIER;
    const damageMultiplier = CONFIG.ENEMY.TANKY_BRUTE.DAMAGE_MULTIPLIER;
    const speedMultiplier = CONFIG.ENEMY.TANKY_BRUTE.SPEED_MULTIPLIER;
    
    this.health = CONFIG.ENEMY.TANKY_BRUTE.BASE_HEALTH * healthMultiplier * levelMultiplier;
    this.maxHealth = this.health;
    this.damage = CONFIG.ENEMY.TANKY_BRUTE.BASE_DAMAGE * damageMultiplier * levelMultiplier;
    this.speed = speedMultiplier + playerLevel * 0.05;
    
    // Slam attack properties
    this.slamAttackCooldown = CONFIG.ENEMY.TANKY_BRUTE.SLAM_ATTACK_COOLDOWN;
    this.lastSlamAttack = -this.slamAttackCooldown; // Enable slam soon after spawn
    this.slamAttackRadius = CONFIG.ENEMY.TANKY_BRUTE.SLAM_ATTACK_RADIUS;
    this.slamAttackDamage = CONFIG.ENEMY.TANKY_BRUTE.BASE_DAMAGE * 
                            CONFIG.ENEMY.TANKY_BRUTE.SLAM_ATTACK_DAMAGE_MULTIPLIER * 
                            levelMultiplier;
    
    // Charging state for slam attack
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.chargeTime = 1200; // Time to charge slam attack
    
    // Damage reduction
    this.damageReduction = CONFIG.ENEMY.TANKY_BRUTE.DAMAGE_REDUCTION;
    
    // Vulnerability to Blood Lance
    this.bloodLanceVulnerabilityMultiplier = CONFIG.ENEMY.TANKY_BRUTE.BLOOD_LANCE_VULNERABILITY_MULTIPLIER;
    
    
    // Update health bar container due to larger size
    if (this.healthBarContainer) {
      this.healthBarContainer.style.width = this.width + "px";
      this.healthBarContainer.style.top = "-10px";
    }
    
    // Add visual indicator for special enemy
    this.addBruteIndicator();
  }
  
  /**
   * Add a visual indicator that this is a special brute enemy
   */
  private addBruteIndicator(): void {
    // Add a "crown" indicator
    const indicator = document.createElement('div');
    indicator.className = 'brute-crown';
    this.element.appendChild(indicator);
  }
  
  /**
   * Override moveTowardsPlayer to implement the Tanky Brute's unique behavior
   * @param player - Player object to track
   */
  moveTowardsPlayer(player: any): void {
    if (!player) return;
    
    const now = Date.now();
    
    // Calculate distance to player
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Handle slam attack logic
    if (!this.isCharging && now - this.lastSlamAttack > this.slamAttackCooldown && distToPlayer < this.slamAttackRadius * 1.5) {
      // Start charging slam attack
      this.startChargingSlam();
    }
    
    // If charging, don't move
    if (this.isCharging) {
      // Check if charge time is complete
      if (now - this.chargeStartTime > this.chargeTime) {
        this.performSlamAttack(player);
      } else {
        // Visual pulse while charging (change border color)
        const chargeProgress = (now - this.chargeStartTime) / this.chargeTime;
        const pulseIntensity = Math.sin(chargeProgress * Math.PI * 10) * 0.5 + 0.5;
        this.element.style.borderColor = `rgba(255, 0, 0, ${pulseIntensity})`;
      }
      return;
    }
    
    // Normal movement - slow but relentless
    const normalizedDx = dx / distToPlayer;
    const normalizedDy = dy / distToPlayer;
    
    this.x += normalizedDx * this.speed;
    this.y += normalizedDy * this.speed;
    
    // Update position
    this.updatePosition();
  }
  
  /**
   * Start charging a slam attack
   */
  private startChargingSlam(): void {
    this.isCharging = true;
    this.chargeStartTime = Date.now();
    
    // Visual indication of charging
    this.element.classList.add('brute-charging');
    
    // Emit event
    GameEvents.emit(EVENTS.ENEMY_CHARGE, this);
  }
  
  /**
   * Perform the slam attack
   * @param player - Player object
   */
  private performSlamAttack(player: any): void {
    // Reset charging state
    this.isCharging = false;
    this.lastSlamAttack = Date.now();
    
    // Reset appearance
    this.element.classList.remove('brute-charging');
    
    // Create visual effect for slam
    this.createSlamEffect();
    
    // Check if player is in range of slam attack
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    if (distToPlayer <= this.slamAttackRadius) {
      // Apply damage to player if not invulnerable
      if (!player.isInvulnerable) {
        player.takeDamage(this.slamAttackDamage);
        
        // Emit event
        GameEvents.emit(EVENTS.ENEMY_ATTACK, this);
      }
    }
  }
  
  /**
   * Create visual effect for slam attack
   */
  private createSlamEffect(): void {
    // Create slam visual (circle expanding outward)
    const slamEffect = document.createElement('div');
    slamEffect.className = 'slam-effect';
    slamEffect.style.left = this.x + this.width / 2 - 5 + 'px';
    slamEffect.style.top = this.y + this.height / 2 - 5 + 'px';
    
    this.gameContainer.appendChild(slamEffect);
    
    // Animate slam effect
    setTimeout(() => {
      slamEffect.style.width = this.slamAttackRadius * 2 + 'px';
      slamEffect.style.height = this.slamAttackRadius * 2 + 'px';
      slamEffect.style.left = this.x + this.width / 2 - this.slamAttackRadius + 'px';
      slamEffect.style.top = this.y + this.height / 2 - this.slamAttackRadius + 'px';
      slamEffect.style.opacity = '0.7';
      
      setTimeout(() => {
        slamEffect.style.opacity = '0';
        setTimeout(() => {
          if (slamEffect.parentNode) {
            slamEffect.parentNode.removeChild(slamEffect);
          }
        }, 300);
      }, 300);
    }, 10);
  }
  
  /**
   * Override takeDamage to implement damage reduction
   * @param amount - Damage amount
   * @param createParticles - Function to create blood particles
   * @param projectileType - Type of projectile causing damage (optional)
   * @returns Whether the enemy died
   */
  takeDamage(amount: number, createParticles?: any, projectileType?: string): boolean {
    // Apply damage reduction unless hit by Blood Lance
    let finalDamage = amount;
    
    if (projectileType !== 'bloodLance') {
      finalDamage = amount * (1 - this.damageReduction);
    } else {
      // Take extra damage from Blood Lance
      finalDamage = amount * this.bloodLanceVulnerabilityMultiplier;
    }
    
    // Apply the damage using the base implementation
    return super.takeDamage(finalDamage, createParticles);
  }
}

export default TankyBrute;
