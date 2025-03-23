import { Enemy } from './base-enemy';
import CONFIG from '../../config';

/**
 * FastSwarmer enemy class
 * A small, fast enemy that moves erratically and attacks in groups
 */
export class FastSwarmer extends Enemy {
  // Fast Swarmer specific properties
  private directionChangeInterval: number;
  private lastDirectionChange: number;
  private directionX: number;
  private directionY: number;
  private erraticMovement: boolean;
  private dodgeChance: number;
  private originalSpeed: number;
  private burstSpeed: number;
  private isBursting: boolean;
  private burstCooldown: number;
  private lastBurst: number;
  private swarmId: string; // To identify swarm groups

  /**
   * Create a new Fast Swarmer enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   * @param swarmId - Optional identifier for the swarm this enemy belongs to
   */
  constructor(gameContainer: HTMLElement, playerLevel: number, swarmId?: string) {
    // Call base enemy constructor
    super(gameContainer, playerLevel);
    
    // Add fast swarmer class for specific styling
    this.element.classList.add('fast-swarmer');
    
    // Set swarm identifier
    this.swarmId = swarmId || `swarm_${Date.now()}`;
    
    // Override size and appearance - make them smaller and more bat-like
    const sizeMultiplier = CONFIG.ENEMY.FAST_SWARMER.SIZE_MULTIPLIER;
    this.width = CONFIG.ENEMY.FAST_SWARMER.WIDTH * sizeMultiplier;
    this.height = CONFIG.ENEMY.FAST_SWARMER.HEIGHT * sizeMultiplier;
    (this.element.style as HTMLElement["style"]).width = this.width + "px";
    (this.element.style as HTMLElement["style"]).height = this.height + "px";
    (this.element.style as HTMLElement["style"]).backgroundColor = "#660066"; // More bat-like purple color
    (this.element.style as HTMLElement["style"]).borderRadius = "50% 5px 50% 5px"; // Bat-like shape
    
  // Add simple bat wings
    const wingLeft = document.createElement('div');
    wingLeft.className = 'swarmer-wing left';
    
    const wingRight = document.createElement('div');
    wingRight.className = 'swarmer-wing right';
    
    this.element.appendChild(wingLeft);
    this.element.appendChild(wingRight);
    
    // Set unique stats for Fast Swarmer
    const healthMultiplier = CONFIG.ENEMY.FAST_SWARMER.HEALTH_MULTIPLIER;
    const damageMultiplier = CONFIG.ENEMY.FAST_SWARMER.DAMAGE_MULTIPLIER;
    const speedMultiplier = CONFIG.ENEMY.FAST_SWARMER.SPEED_MULTIPLIER;
    
    this.health = CONFIG.ENEMY.FAST_SWARMER.BASE_HEALTH * healthMultiplier + playerLevel * 3;
    this.maxHealth = this.health;
    this.damage = CONFIG.ENEMY.FAST_SWARMER.BASE_DAMAGE * damageMultiplier + playerLevel * 0.5;
    this.originalSpeed = speedMultiplier + Math.random() * playerLevel * 0.15;
    this.speed = this.originalSpeed;
    
    // Erratic movement properties (make more unpredictable)
    this.directionChangeInterval = 300 + Math.random() * 500; // Change direction more often
    this.lastDirectionChange = 0;
    this.directionX = Math.random() * 2 - 1; // Random initial direction
    this.directionY = Math.random() * 2 - 1;
    const dirMagnitude = Math.sqrt(this.directionX * this.directionX + this.directionY * this.directionY);
    this.directionX /= dirMagnitude;
    this.directionY /= dirMagnitude;
    this.erraticMovement = true;
    
    // Dodge ability - increase from base config
    this.dodgeChance = CONFIG.ENEMY.FAST_SWARMER.DODGE_CHANCE + playerLevel * 0.015;
    
    // Burst speed properties
    this.burstSpeed = this.originalSpeed * CONFIG.ENEMY.FAST_SWARMER.BURST_SPEED_MULTIPLIER;
    this.isBursting = false;
    this.burstCooldown = 2000 + Math.random() * 1000; // More frequent bursts
    this.lastBurst = -this.burstCooldown; // Allow bursting soon after spawn
    
    // Update health bar position due to smaller size
    if (this.healthBarContainer) {
      (this.healthBarContainer.style as HTMLElement["style"]).width = this.width + "px";
    }
    
    // Animate wings
    this.animateWings();
  }
  
  /**
   * Animate the bat wings
   */
  private animateWings(): void {
    // Add flapping animation to wings
    const wings = this.element.querySelectorAll('.swarmer-wing');
    wings.forEach(wing => {
      (wing as HTMLElement).style.animation = `flap ${0.2 + Math.random() * 0.3}s infinite alternate`;
    });
  }
  
  /**
   * Override takeDamage to implement dodge chance
   */
  takeDamage(amount: number, createParticles?: any, projectileType?: string): boolean {
    // Try to dodge projectiles (but not abilities or other damage types)
    if (!projectileType && Math.random() < this.dodgeChance) {
      // Create dodge effect
      this.showDodgeEffect();
      return false; // No damage taken
    }
    
    // Otherwise take damage normally
    return super.takeDamage(amount, createParticles, projectileType);
  }
  
  /**
   * Show visual effect when dodging
   */
  private showDodgeEffect(): void {
    // Create dodge text indicator
    const dodgeIndicator = document.createElement('div');
    dodgeIndicator.className = 'dodge-indicator';
    dodgeIndicator.textContent = 'DODGE!';
    (dodgeIndicator.style as HTMLElement["style"]).left = (this.x + this.width / 2) + 'px';
    (dodgeIndicator.style as HTMLElement["style"]).top = (this.y - 15) + 'px';
    
    this.gameContainer.appendChild(dodgeIndicator);
    
    // Remove after animation
    setTimeout(() => {
      if (dodgeIndicator.parentNode) {
        dodgeIndicator.parentNode.removeChild(dodgeIndicator);
      }
    }, 800);
    
    // Also add a brief speed burst when dodging
    this.speed *= 1.5;
    setTimeout(() => {
      this.speed = this.originalSpeed;
    }, 500);
  }
  
  /**
   * Override moveTowardsPlayer to implement the Fast Swarmer's unique behavior
   * @param player - Player object to track
   */
  moveTowardsPlayer(player: any): void {
    if (!player) return;
    
    const now = Date.now();
    
    // Check for swarm attack signals
    this.checkForSwarmSignals();
    
    // Calculate distance to player
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Find other swarmers with the same swarm ID (for coordination)
    // We'll need to locate other swarmers through DOM elements since we can't directly access the game's enemy array
    let nearbySwarmers: any[] = [];
    
    // Find all fast-swarmer elements in the DOM
    const swarmerElements = this.gameContainer.querySelectorAll('.fast-swarmer');
    swarmerElements.forEach(element => {
      // Skip self
      if (element === this.element) return;
      
      // Get element position
      const left = parseInt((element as HTMLElement).style.left || '0');
      const top = parseInt((element as HTMLElement).style.top || '0');
      
      // Check if nearby
      if (Math.abs(left - this.x) < 200 && Math.abs(top - this.y) < 200) {
        // Create a temporary swarmer object with enough properties to work with
        nearbySwarmers.push({
          x: left,
          y: top,
          width: parseInt((element as HTMLElement).style.width || '25'),
          height: parseInt((element as HTMLElement).style.height || '25'),
          speed: this.speed, // Assume similar speed
          isBursting: element.classList.contains('fast-swarmer-burst'),
          swarmId: this.swarmId,
          startBurst: () => {
            element.classList.add('fast-swarmer-burst');
          }
        });
      }
    });
    
    // Determine if it's time to change direction
    if (this.erraticMovement && now - this.lastDirectionChange > this.directionChangeInterval) {
      this.changeDirection(dx, dy, distToPlayer);
      this.lastDirectionChange = now;
    }
    
    // Handle burst speed mode
    if (!this.isBursting && now - this.lastBurst > this.burstCooldown) {
      // Start a burst
      this.startBurst();
      this.lastBurst = now;
    }
    
    // Check if burst should end
    if (this.isBursting && now - this.lastBurst > 500) {
      this.endBurst();
    }
    
    // Calculate movement direction combining all behaviors
    let moveX, moveY;
    
    // Weight for each behavior
    const playerWeight = 0.4;      // Target player
    const cohesionWeight = 0.2;    // Stay with the swarm
    const alignmentWeight = 0.2;   // Align with swarm direction
    const separationWeight = 0.2;  // Avoid crowding
    const erraticWeight = 0.2;     // Random movement (reduced from original)
    
    // Swarm behavior: cohesion, alignment, and separation
    let cohesionX = 0, cohesionY = 0;
    let alignmentX = 0, alignmentY = 0;
    let separationX = 0, separationY = 0;
    
    if (nearbySwarmers.length > 0) {
      // Calculate center of nearby swarmers (cohesion)
      let totalX = 0, totalY = 0;
      nearbySwarmers.forEach(swarmer => {
        totalX += swarmer.x;
        totalY += swarmer.y;
        
        // Calculate alignment (average direction)
        alignmentX += Math.cos(Math.atan2(player.y - swarmer.y, player.x - swarmer.x));
        alignmentY += Math.sin(Math.atan2(player.y - swarmer.y, player.x - swarmer.x));
        
        // Calculate separation (avoid crowding)
        const distX = this.x - swarmer.x;
        const distY = this.y - swarmer.y;
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist < 30) {
          separationX += distX / (dist || 1);
          separationY += distY / (dist || 1);
        }
      });
      
      // Average for cohesion
      cohesionX = totalX / nearbySwarmers.length - this.x;
      cohesionY = totalY / nearbySwarmers.length - this.y;
      
      // Normalize cohesion
      const cohesionLength = Math.sqrt(cohesionX * cohesionX + cohesionY * cohesionY) || 1;
      cohesionX /= cohesionLength;
      cohesionY /= cohesionLength;
      
      // Normalize alignment
      alignmentX /= nearbySwarmers.length;
      alignmentY /= nearbySwarmers.length;
      
      // Normalize separation if not zero
      const separationLength = Math.sqrt(separationX * separationX + separationY * separationY) || 1;
      separationX /= separationLength;
      separationY /= separationLength;
    }
    
    if (this.erraticMovement && nearbySwarmers.length === 0) {
      // If no nearby swarmers, use original erratic movement with more player targeting
      moveX = this.directionX * erraticWeight + (dx / distToPlayer) * (1 - erraticWeight);
      moveY = this.directionY * erraticWeight + (dy / distToPlayer) * (1 - erraticWeight);
    } else {
      // If part of a swarm, use flocking behavior
      moveX = (dx / distToPlayer) * playerWeight + 
              cohesionX * cohesionWeight + 
              alignmentX * alignmentWeight + 
              separationX * separationWeight + 
              this.directionX * erraticWeight;
              
      moveY = (dy / distToPlayer) * playerWeight + 
              cohesionY * cohesionWeight + 
              alignmentY * alignmentWeight + 
              separationY * separationWeight + 
              this.directionY * erraticWeight;
    }
    
    // Normalize movement vector
    const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY) || 1;
    this.x += (moveX / moveMagnitude) * this.speed;
    this.y += (moveY / moveMagnitude) * this.speed;
    
    // Update position
    this.updatePosition();
    
    // Occasionally coordinate attacks if close to player
    if (distToPlayer < 100 && nearbySwarmers.length >= 2 && Math.random() < 0.005) {
      this.coordinateSwarmAttack(player);
    }
  }
  
  /**
   * Coordinate a swarm attack
   * This uses a class name based approach to trigger other swarmers to attack
   */
  private coordinateSwarmAttack(player: any): void {
    // Emit a swarm attack event that triggers a visual signal
    const attackSignal = document.createElement('div');
    attackSignal.className = 'swarm-attack-signal';
    (attackSignal.style as HTMLElement["style"]).position = 'absolute';
    (attackSignal.style as HTMLElement["style"]).left = this.x + 'px';
    (attackSignal.style as HTMLElement["style"]).top = this.y + 'px';
    (attackSignal.style as HTMLElement["style"]).width = '300px';
    (attackSignal.style as HTMLElement["style"]).height = '300px';
    (attackSignal.style as HTMLElement["style"]).backgroundColor = 'rgba(255, 0, 255, 0.1)';
    (attackSignal.style as HTMLElement["style"]).borderRadius = '50%';
    (attackSignal.style as HTMLElement["style"]).transform = 'translate(-50%, -50%)';
    (attackSignal.style as HTMLElement["style"]).zIndex = '5';
    (attackSignal.style as HTMLElement["style"]).pointerEvents = 'none';
    
    // Add data for other swarmers to use
    attackSignal.dataset.swarmId = this.swarmId;
    attackSignal.dataset.playerX = player.x.toString();
    attackSignal.dataset.playerY = player.y.toString();
    
    // Add to game container
    this.gameContainer.appendChild(attackSignal);
    
    // Remove after a short delay
    setTimeout(() => {
      if (attackSignal.parentNode) {
        attackSignal.parentNode.removeChild(attackSignal);
      }
    }, 500);
    
    // This swarmer starts the burst
    this.startBurst();
  }

  /**
   * Check for attack signals from other swarmers (called in the main update loop)
   */
  private checkForSwarmSignals(): void {
    const signals = this.gameContainer.querySelectorAll('.swarm-attack-signal');
    signals.forEach(signal => {
      // Check if this signal is for our swarm
      if ((signal as any).dataset.swarmId === this.swarmId) {
        // 50% chance to respond to the signal (for varied behavior)
        if (Math.random() < 0.5) {
          setTimeout(() => {
            this.startBurst();
            
            // If player coordinates are available, move toward them
            if ((signal as any).dataset.playerX && (signal as any).dataset.playerY) {
              const playerX = parseFloat((signal as any).dataset.playerX);
              const playerY = parseFloat((signal as any).dataset.playerY);
              
              // Calculate angle to player
              const dx = playerX - this.x;
              const dy = playerY - this.y;
              const angle = Math.atan2(dy, dx);
              
              // Move directly toward player with burst speed
              this.x += Math.cos(angle) * this.burstSpeed * 1.2;
              this.y += Math.sin(angle) * this.burstSpeed * 1.2;
              this.updatePosition();
            }
          }, Math.random() * 300); // Slightly staggered timing
        }
      }
    });
  }
  
  /**
   * Change movement direction
   * @param dx - X direction to player
   * @param dy - Y direction to player
   * @param distToPlayer - Distance to player
   */
  private changeDirection(dx: number, dy: number, _distToPlayer: number): void {
    // Sometimes change to direct player chase
    if (Math.random() < 0.3) {
      this.erraticMovement = false;
      return;
    }
    
    this.erraticMovement = true;
    
    // Calculate new random direction with some bias toward player
    const randomAngle = Math.random() * Math.PI * 2;
    const playerAngle = Math.atan2(dy, dx);
    
    // Blend between random angle and player angle
    const blendFactor = 0.7; // 0 = pure random, 1 = directly toward player
    const finalAngle = randomAngle * (1 - blendFactor) + playerAngle * blendFactor;
    
    this.directionX = Math.cos(finalAngle);
    this.directionY = Math.sin(finalAngle);
  }
  
  /**
   * Start a speed burst
   */
  private startBurst(): void {
    this.isBursting = true;
    this.speed = this.burstSpeed;
    this.erraticMovement = false;
    
    // Visual indication of burst
    this.element.classList.add('fast-swarmer-burst');
  }
  
  /**
   * End a speed burst
   */
  private endBurst(): void {
    this.isBursting = false;
    this.speed = this.originalSpeed;
    this.erraticMovement = true;
    
    // Remove visual indication
    this.element.classList.remove('fast-swarmer-burst');
  }
  
  /**
   * Check if this enemy should dodge a projectile
   * @returns Whether dodge was successful
   */
  tryDodgeProjectile(): boolean {
    return Math.random() < this.dodgeChance;
  }
  
  /**
   * Check if enemy collides with player with a smaller hitbox for dodging
   * @param player - Player object
   * @returns Whether collision occurred
   */
  collidesWithPlayer(player: any): boolean {
    // Use a slightly smaller hitbox for collision to represent swift movement
    const hitboxReduction = 0.2;
    const effectiveWidth = this.width * (1 - hitboxReduction);
    const effectiveHeight = this.height * (1 - hitboxReduction);
    
    return (
      this.x + (this.width - effectiveWidth) / 2 < player.x + player.width &&
      this.x + (this.width - effectiveWidth) / 2 + effectiveWidth > player.x &&
      this.y + (this.height - effectiveHeight) / 2 < player.y + player.height &&
      this.y + (this.height - effectiveHeight) / 2 + effectiveHeight > player.y
    );
  }
}

export default FastSwarmer;