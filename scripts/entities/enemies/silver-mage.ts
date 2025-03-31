import { Enemy, ParticleCreationFunction } from './base-enemy';
import CONFIG from '../../config';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

declare global {
  interface Window {
    gameInstance?: { player: any };
  }
}

const logger = createLogger('SilverMage');

/**
 * Type for the Silver Zone effect
 */
interface SilverZone {
  x: number;
  y: number;
  radius: number;
  damage: number;
  duration: number;
  element: HTMLElement;
  creationTime: number;
}

/**
 * SilverMage enemy class
 * A ranged enemy that creates hazardous silver zones that damage the player
 */
export class SilverMage extends Enemy {
  // Silver Mage specific properties
  private zoneCastCooldown: number;
  private lastCastTime: number;
  private teleportDistance: number;
  private teleportCooldown: number;
  private lastTeleportTime: number;
  private preferredDistance: number;
  private silverZones: SilverZone[]; // Array to track active zones
  private chargeUpTime: number;
  private isCharging: boolean;
  private chargeStartTime: number;
  private zoneDamage: number;
  private maxActiveZones: number;

  /**
   * Create a new Silver Mage enemy
   * @param gameContainer - DOM element containing the game
   * @param playerLevel - Current level of the player
   */
  constructor(gameContainer: HTMLElement, playerLevel: number) {
    // Call base enemy constructor
    super(gameContainer, playerLevel);
    
    // Add silver mage class for specific styling
    this.element.classList.add('silver-mage');
    
    // Override visual appearance
    this.element.style.backgroundColor = "#87CEFA"; // Blue-silver color
    this.element.style.border = "2px solid white"; // Glowing white outline
    this.element.style.borderRadius = "40%"; // Rounded shape
    
    // Set stats based on the plan
    this.health = 80 + playerLevel * 10; // 1.5x basic enemy health
    this.maxHealth = this.health;
    this.damage = 3 + playerLevel * 0.5; // Direct contact damage
    this.speed = 0.8 + Math.random() * playerLevel * 0.1; // 0.8x basic enemy speed
    
    // Silver Mage specific properties
    this.zoneCastCooldown = 3000 + Math.random() * 2000; // 3-5 seconds
    this.lastCastTime = 0;
    this.teleportDistance = 150; // Teleport distance when player is too close
    this.teleportCooldown = 1500; // 1.5 seconds between teleports
    this.lastTeleportTime = 0;
    this.preferredDistance = 300; // Maintain medium distance (250-350px)
    this.silverZones = []; // Initialize empty array for active zones
    this.chargeUpTime = 1000; // 1 second charge-up animation
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.zoneDamage = 5 + playerLevel * 0.5; // 5 damage per second, scaled with level
    this.maxActiveZones = 3; // Maximum 3 active zones per Silver Mage
    
    // Add visual indicator for mage
    this.addMageIndicator();
  }
  
  /**
   * Initialize the silver mage
   */
  initialize(): void {
    super.initialize();
    logger.debug(`SilverMage ${this.id} initialized: health=${this.health}, speed=${this.speed}`);
  }
  
  /**
   * Add a visual indicator that this is a mage-type enemy
   */
  private addMageIndicator(): void {
    const indicator = document.createElement('div');
    indicator.className = 'mage-indicator';
    indicator.style.width = "10px";
    indicator.style.height = "10px";
    indicator.style.borderRadius = "50%";
    indicator.style.backgroundColor = "white";
    indicator.style.position = "absolute";
    indicator.style.top = "0";
    indicator.style.left = "50%";
    indicator.style.transform = "translate(-50%, -50%)";
    indicator.style.boxShadow = "0 0 5px 2px rgba(255, 255, 255, 0.7)";
    this.element.appendChild(indicator);
  }
  
  /**
   * Set the charging visual state
   * @param isCharging - Whether the mage is charging a spell
   */
  private setChargingVisual(isCharging: boolean): void {
    if (isCharging) {
      this.element.classList.add('mage-charging');
      // Add pulsing effect
      this.element.style.animation = "pulse 0.5s infinite alternate";
    } else {
      this.element.classList.remove('mage-charging');
      this.element.style.animation = "";
    }
  }
  
  /**
   * Update silver mage state
   * @param deltaTime - Time since last update in ms
   * @param player - The player to target
   */
  update(deltaTime: number, player?: any): void {
    super.update(deltaTime);
    
    const now = Date.now();
    
    // Update existing silver zones
    this.updateSilverZones(now, player);
    
    // Move towards/away from player and handle abilities if we have a player
    if (player) {
      this.handleBehavior(player, now);
    }
  }
  
  /**
   * Handle silver mage behavior patterns
   * @param player - The player to target
   * @param now - Current timestamp
   */
  private handleBehavior(player: any, now: number): void {
    // Calculate distance to player
    const dx = player.x + player.width / 2 - (this.x + this.width / 2);
    const dy = player.y + player.height / 2 - (this.y + this.height / 2);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Determine normalized direction
    const dirX = dx / distToPlayer;
    const dirY = dy / distToPlayer;
    
    // Handle teleport if player gets too close
    if (distToPlayer < this.teleportDistance && now - this.lastTeleportTime > this.teleportCooldown) {
      this.teleportAway(player);
      this.lastTeleportTime = now;
      return; // Skip other behavior after teleporting
    }
    
    // Handle charging and casting
    if (this.isCharging) {
      // If charge-up time completed, cast the zone
      if (now - this.chargeStartTime >= this.chargeUpTime) {
        this.castSilverZone(player);
        this.isCharging = false;
        this.setChargingVisual(false);
      }
      // While charging, stand still
    } else {
      // Start charging a new zone if cooldown elapsed and we don't have too many active zones
      if (now - this.lastCastTime >= this.zoneCastCooldown && this.silverZones.length < this.maxActiveZones) {
        this.startCharging();
        this.chargeStartTime = now;
      } else {
        // Move to maintain preferred distance
        if (distToPlayer < this.preferredDistance - 50) {
          // Too close, move away
          this.x -= dirX * this.speed;
          this.y -= dirY * this.speed;
        } else if (distToPlayer > this.preferredDistance + 50) {
          // Too far, move closer
          this.x += dirX * this.speed * 0.5;
          this.y += dirY * this.speed * 0.5;
        } else {
          // Good distance, strafe perpendicular to player
          const strafeDir = Math.random() > 0.5 ? 1 : -1;
          this.x += -dirY * this.speed * 0.5 * strafeDir;
          this.y += dirX * this.speed * 0.5 * strafeDir;
        }
      }
    }
    
    // Update position
    this.updatePosition();
  }
  
  /**
   * Legacy moveTowardsPlayer method for backwards compatibility
   * @param player - Player object to track
   */
  moveTowardsPlayer(player: any): void {
    this.handleBehavior(player, Date.now());
  }
  
  /**
   * Start charging a silver zone spell
   */
  private startCharging(): void {
    this.isCharging = true;
    this.setChargingVisual(true);
    
    // Emit event for sound effects or other feedback
    GameEvents.emit(EVENTS.ENEMY_ATTACK_START, this, 'silverMage');
  }
  
  /**
   * Teleport away from the player
   * @param player - The player to teleport away from
   */
  private teleportAway(player: any): void {
    // Calculate direction away from player
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize and apply teleport distance
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Calculate new position
    let newX = this.x + dirX * this.teleportDistance;
    let newY = this.y + dirY * this.teleportDistance;
    
    // Ensure we don't teleport out of bounds
    newX = Math.max(0, Math.min(CONFIG.WORLD_WIDTH - this.width, newX)); // Changed from GAME_WIDTH
    newY = Math.max(0, Math.min(CONFIG.WORLD_HEIGHT - this.height, newY)); // Changed from GAME_HEIGHT
    
    // Teleport
    this.x = newX;
    this.y = newY;
    
    // Add teleport visual effect
    this.createTeleportEffect();
    
    // Update position
    this.updatePosition();
    
    // Emit event for sound effects or other feedback
    GameEvents.emit(EVENTS.ENEMY_SPECIAL_MOVE, this, 'teleport');
  }
  
  /**
   * Create a visual effect for teleporting
   */
  private createTeleportEffect(): void {
    // Create a flash effect
    const flash = document.createElement('div');
    flash.className = 'teleport-flash';
    flash.style.position = 'absolute';
    flash.style.left = this.x + 'px';
    flash.style.top = this.y + 'px';
    flash.style.width = this.width + 'px';
    flash.style.height = this.height + 'px';
    flash.style.borderRadius = '50%';
    flash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    flash.style.zIndex = '10';
    flash.style.animation = 'fadeOut 0.5s forwards';
    
    // Add flash to game container
    this.gameContainer.appendChild(flash);
    
    // Remove after animation completes
    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 500);
  }
  
  /**
   * Cast a silver zone at the player's position or predicted position
   * @param player - The player to target
   */
  private castSilverZone(player: any): void {
    // Calculate target position (with some prediction)
    const usePlayerPrediction = Math.random() > 0.5;
    let targetX, targetY;
    
    if (usePlayerPrediction && player.velocityX !== undefined && player.velocityY !== undefined) {
      // Predict where player will be in 0.5 seconds
      targetX = player.x + (player.velocityX * 0.5);
      targetY = player.y + (player.velocityY * 0.5);
    } else {
      // Target current position
      targetX = player.x;
      targetY = player.y;
    }
    
    // Randomize radius a bit
    const radius = 100 + Math.random() * 50; // 100-150px radius
    
    // Create zone element
    const zoneElement = document.createElement('div');
    zoneElement.className = 'silver-zone';
    zoneElement.style.position = 'absolute';
    zoneElement.style.left = (targetX - radius) + 'px';
    zoneElement.style.top = (targetY - radius) + 'px';
    zoneElement.style.width = (radius * 2) + 'px';
    zoneElement.style.height = (radius * 2) + 'px';
    zoneElement.style.borderRadius = '50%';
    zoneElement.style.backgroundColor = 'rgba(173, 216, 230, 0.3)';
    zoneElement.style.border = '2px solid rgba(192, 192, 192, 0.7)';
    zoneElement.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 255, 0.7)';
    zoneElement.style.zIndex = '5';
    
    // Add pulsing effect
    zoneElement.style.animation = 'zonePulse 2s infinite alternate';
    
    // Add zone to game container
    this.gameContainer.appendChild(zoneElement);
    
    // Calculate random duration for zone
    const duration = 4000 + Math.random() * 2000; // 4-6 seconds
    
    // Create zone object
    const zone: SilverZone = {
      x: targetX,
      y: targetY,
      radius,
      damage: this.zoneDamage,
      duration,
      element: zoneElement,
      creationTime: Date.now()
    };
    
    // Add to active zones array
    this.silverZones.push(zone);
    
    // Update last cast time
    this.lastCastTime = Date.now();
    
    // Emit event for sound effects or other feedback
    GameEvents.emit(EVENTS.ENEMY_ATTACK, this, 'silverZone');
  }
  
  /**
   * Update all active silver zones
   * @param now - Current timestamp
   * @param player - The player to check for zone damage
   */
  private updateSilverZones(now: number, player?: any): void {
    // Process each zone
    for (let i = this.silverZones.length - 1; i >= 0; i--) {
      const zone = this.silverZones[i];
      const elapsedTime = now - zone.creationTime;
      
      // Check if zone has expired
      if (elapsedTime >= zone.duration) {
        // Remove zone element
        if (zone.element.parentNode) {
          zone.element.parentNode.removeChild(zone.element);
        }
        
        // Remove from array
        this.silverZones.splice(i, 1);
        continue;
      }
      
      // Update visual fade
      const opacity = 0.3 * (1 - (elapsedTime / zone.duration));
      zone.element.style.backgroundColor = `rgba(173, 216, 230, ${opacity})`;
      
      // Check if player is in zone
      if (player) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        const dx = playerCenterX - zone.x;
        const dy = playerCenterY - zone.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If player is inside zone radius, apply damage
        if (distance < zone.radius) {
          // Apply damage (adjusted for deltaTime)
          if (player.takeDamage) {
            // Apply damage every 200ms while in zone
            if (now % 200 < 20) { // Check within a small window of time
              player.takeDamage(zone.damage * 0.2);
              
              // Block energy regeneration
              if (player.blockEnergyRegen) {
                player.blockEnergyRegen(200); // Block for 200ms
              }
              
              // Create damage visual effect
              this.createZoneDamageEffect(player);
            }
          }
        }
      }
    }
  }
  
  /**
   * Create a visual effect when player takes zone damage
   * @param player - The player taking damage
   */
  private createZoneDamageEffect(player: any): void {
    // Create a damage pulse effect
    const pulse = document.createElement('div');
    pulse.className = 'zone-damage-pulse';
    pulse.style.position = 'absolute';
    pulse.style.left = player.x + 'px';
    pulse.style.top = player.y + 'px';
    pulse.style.width = player.width + 'px';
    pulse.style.height = player.height + 'px';
    pulse.style.borderRadius = '50%';
    pulse.style.backgroundColor = 'rgba(192, 192, 192, 0.2)';
    pulse.style.zIndex = '15';
    pulse.style.animation = 'pulseFadeOut 0.3s forwards';
    
    // Add to game container
    this.gameContainer.appendChild(pulse);
    
    // Remove after animation completes
    setTimeout(() => {
      if (pulse.parentNode) {
        pulse.parentNode.removeChild(pulse);
      }
    }, 300);
  }
  
  /**
   * Enemy takes damage from a source - with special handling for Blood Lance
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
      // Special interaction with Blood Lance - teleport defensively
      if (projectileType === 'bloodLance') {
        // Try to teleport if not on cooldown
        const now = Date.now();
        if (now - this.lastTeleportTime > this.teleportCooldown) {
          // Get player from the game if available
          const player = window.gameInstance?.player;
          if (player) {
            this.teleportAway(player);
            this.lastTeleportTime = now;
          }
        }
      }
      
      // Default damage handling
      return super.takeDamage(amount, createParticles, projectileType);
    }
  
  /**
   * Clean up silver mage resources
   * @param player - Optional player to unregister with
   */
  cleanup(player?: any): void {
    // Remove all silver zones
    for (const zone of this.silverZones) {
      if (zone.element.parentNode) {
        zone.element.parentNode.removeChild(zone.element);
      }
    }
    
    // Clear zones array
    this.silverZones = [];
    
    logger.debug(`SilverMage ${this.id} cleanup`);
    super.cleanup(player);
  }
}

export default SilverMage;
