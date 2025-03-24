import { State, HierarchicalState } from '../../../hsm/state';
import { Enemy } from '../base-enemy';
import { EnemyGroup, GroupMember } from '../enemy-group';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('EnemyStates');

/**
 * Interface for enemy with AI state
 */
export interface EnemyWithAI extends Enemy {
  group?: EnemyGroup;
  isLeader?: boolean;
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
  dodgeChance?: number;
  lastDodgeTime?: number;
  dodgeCooldown?: number;
}

/**
 * Base state for all enemy states
 */
export class EnemyBaseState extends HierarchicalState<EnemyWithAI> {
  /**
   * Update the enemy state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Check if enemy is dead
    if (enemy.health <= 0) {
      return null;
    }

    // Check if enemy is out of bounds
    if (enemy.isOutOfBounds()) {
      return null;
    }

    // Default behavior - stay in current state
    return null;
  }
}

/**
 * Idle state - enemy is not actively doing anything
 */
export class IdleState extends EnemyBaseState {
  constructor() {
    super('Idle');
  }

  /**
   * Enter the idle state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-idle');
    logger.debug(`Enemy ${enemy.id} entered Idle state`);
  }

  /**
   * Exit the idle state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-idle');
  }

  /**
   * Update the idle state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // If we have a target player, transition to pursue state
    if (enemy.targetPlayer) {
      return new PursueState();
    }

    return null;
  }
}

/**
 * Pursue state - enemy is moving toward the player
 */
export class PursueState extends EnemyBaseState {
  constructor() {
    super('Pursue');
  }

  /**
   * Enter the pursue state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-pursue');
    logger.debug(`Enemy ${enemy.id} entered Pursue state`);
  }

  /**
   * Exit the pursue state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-pursue');
  }

  /**
   * Update the pursue state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // Check if we should flee (low health)
    if (enemy.health < enemy.maxHealth * (enemy.lowHealthThreshold || 0.2)) {
      return new FleeState();
    }

    // Check if we're in a group and have a formation position
    if (enemy.group && enemy.formationPosition) {
      // Move toward formation position
      this.moveToFormationPosition(enemy);
    } else if (enemy.targetPlayer) {
      // Move toward player
      this.moveTowardPlayer(enemy);
    }

    // Check if we're close enough to attack
    if (enemy.targetPlayer && this.isInAttackRange(enemy, enemy.targetPlayer)) {
      return new AttackState();
    }

    return null;
  }

  /**
   * Move the enemy toward its formation position
   * @param enemy - The enemy to move
   */
  private moveToFormationPosition(enemy: EnemyWithAI): void {
    if (!enemy.formationPosition) {
      return;
    }

    const dx = enemy.formationPosition.x - enemy.x;
    const dy = enemy.formationPosition.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) { // Only move if we're not already at the position
      // Normalize and apply speed
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
      enemy.updatePosition();
    }
  }

  /**
   * Move the enemy toward the player
   * @param enemy - The enemy to move
   */
  private moveTowardPlayer(enemy: EnemyWithAI): void {
    if (!enemy.targetPlayer) {
      return;
    }

    const dx = enemy.targetPlayer.x + enemy.targetPlayer.width / 2 - (enemy.x + enemy.width / 2);
    const dy = enemy.targetPlayer.y + enemy.targetPlayer.height / 2 - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize and apply speed
    enemy.x += (dx / dist) * enemy.speed;
    enemy.y += (dy / dist) * enemy.speed;
    enemy.updatePosition();
  }

  /**
   * Check if the enemy is in attack range of the target
   * @param enemy - The enemy
   * @param target - The target
   * @returns Whether the enemy is in attack range
   */
  private isInAttackRange(enemy: EnemyWithAI, target: any): boolean {
    const dx = target.x + target.width / 2 - (enemy.x + enemy.width / 2);
    const dy = target.y + target.height / 2 - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Attack range is the sum of the enemy and target radii plus a small buffer
    const attackRange = (enemy.width + target.width) / 2 + 10;

    return dist <= attackRange;
  }
}

/**
 * Attack state - enemy is attacking the player
 */
export class AttackState extends EnemyBaseState {
  constructor() {
    super('Attack');
  }

  /**
   * Enter the attack state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-attack');
    logger.debug(`Enemy ${enemy.id} entered Attack state`);
  }

  /**
   * Exit the attack state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-attack');
  }

  /**
   * Update the attack state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // Check if we should flee (low health)
    if (enemy.health < enemy.maxHealth * (enemy.lowHealthThreshold || 0.2)) {
      return new FleeState();
    }

    // Check if we're still in attack range
    if (!enemy.targetPlayer || !this.isInAttackRange(enemy, enemy.targetPlayer)) {
      return new PursueState();
    }

    // Perform attack if cooldown has elapsed
    const now = Date.now();
    if (!enemy.lastAttackTime || now - enemy.lastAttackTime >= (enemy.attackCooldown || 1000)) {
      this.performAttack(enemy);
      enemy.lastAttackTime = now;
    }

    // Check if we should perform a special attack
    if (enemy.specialAttackCooldown && 
        (!enemy.lastSpecialAttackTime || now - enemy.lastSpecialAttackTime >= enemy.specialAttackCooldown)) {
      this.performSpecialAttack(enemy);
      enemy.lastSpecialAttackTime = now;
    }

    return null;
  }

  /**
   * Perform a basic attack
   * @param enemy - The enemy performing the attack
   */
  private performAttack(enemy: EnemyWithAI): void {
    if (!enemy.targetPlayer) {
      return;
    }

    // Add attack animation class
    enemy.element.classList.add('attacking');
    setTimeout(() => {
      enemy.element.classList.remove('attacking');
    }, 300);

    // Check if player has a takeDamage method
    if (enemy.targetPlayer.takeDamage) {
      enemy.targetPlayer.takeDamage(enemy.damage, enemy);
    }
  }

  /**
   * Perform a special attack
   * @param enemy - The enemy performing the special attack
   */
  private performSpecialAttack(enemy: EnemyWithAI): void {
    if (!enemy.targetPlayer) {
      return;
    }

    // Add special attack animation class
    enemy.element.classList.add('special-attacking');
    setTimeout(() => {
      enemy.element.classList.remove('special-attacking');
    }, 500);

    // Special attack logic depends on enemy type
    // This is a placeholder - specific enemy types will override this
  }

  /**
   * Check if the enemy is in attack range of the target
   * @param enemy - The enemy
   * @param target - The target
   * @returns Whether the enemy is in attack range
   */
  private isInAttackRange(enemy: EnemyWithAI, target: any): boolean {
    const dx = target.x + target.width / 2 - (enemy.x + enemy.width / 2);
    const dy = target.y + target.height / 2 - (enemy.y + enemy.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Attack range is the sum of the enemy and target radii plus a small buffer
    const attackRange = (enemy.width + target.width) / 2 + 10;

    return dist <= attackRange;
  }
}

/**
 * Flee state - enemy is retreating from the player
 */
export class FleeState extends EnemyBaseState {
  constructor() {
    super('Flee');
  }

  /**
   * Enter the flee state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-flee');
    enemy.isRetreating = true;
    enemy.retreatStartTime = Date.now();
    enemy.retreatDuration = enemy.retreatDuration || 3000; // Default 3 seconds
    logger.debug(`Enemy ${enemy.id} entered Flee state`);
  }

  /**
   * Exit the flee state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-flee');
    enemy.isRetreating = false;
  }

  /**
   * Update the flee state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // Check if retreat duration has elapsed
    const now = Date.now();
    if (enemy.retreatStartTime && now - enemy.retreatStartTime >= (enemy.retreatDuration || 3000)) {
      return new PursueState();
    }

    // Move away from player
    if (enemy.targetPlayer) {
      this.moveAwayFromPlayer(enemy);
    }

    return null;
  }

  /**
   * Move the enemy away from the player
   * @param enemy - The enemy to move
   */
  private moveAwayFromPlayer(enemy: EnemyWithAI): void {
    if (!enemy.targetPlayer) {
      return;
    }

    const dx = enemy.x - enemy.targetPlayer.x;
    const dy = enemy.y - enemy.targetPlayer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      // If directly on top of player, move in a random direction
      const angle = Math.random() * Math.PI * 2;
      enemy.x += Math.cos(angle) * enemy.speed * 1.5;
      enemy.y += Math.sin(angle) * enemy.speed * 1.5;
    } else {
      // Move away from player with increased speed
      enemy.x += (dx / dist) * enemy.speed * 1.5;
      enemy.y += (dy / dist) * enemy.speed * 1.5;
    }

    enemy.updatePosition();
  }
}

/**
 * Support state - enemy is supporting other enemies
 */
export class SupportState extends EnemyBaseState {
  constructor() {
    super('Support');
  }

  /**
   * Enter the support state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-support');
    logger.debug(`Enemy ${enemy.id} entered Support state`);
  }

  /**
   * Exit the support state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-support');
  }

  /**
   * Update the support state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // Check if we should flee (low health)
    if (enemy.health < enemy.maxHealth * (enemy.lowHealthThreshold || 0.2)) {
      return new FleeState();
    }

    // If we're in a group, move to formation position
    if (enemy.group && enemy.formationPosition) {
      this.moveToFormationPosition(enemy);
    } else {
      // If not in a group or no formation position, revert to pursue
      return new PursueState();
    }

    return null;
  }

  /**
   * Move the enemy toward its formation position
   * @param enemy - The enemy to move
   */
  private moveToFormationPosition(enemy: EnemyWithAI): void {
    if (!enemy.formationPosition) {
      return;
    }

    const dx = enemy.formationPosition.x - enemy.x;
    const dy = enemy.formationPosition.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) { // Only move if we're not already at the position
      // Normalize and apply speed
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
      enemy.updatePosition();
    }
  }
}

/**
 * Dodge state - enemy is dodging an attack
 */
export class DodgeState extends EnemyBaseState {
  private dodgeDirection: { x: number, y: number };
  private dodgeDuration: number;
  private dodgeStartTime: number;

  constructor() {
    super('Dodge');
    this.dodgeDirection = { x: 0, y: 0 };
    this.dodgeDuration = 500; // 0.5 seconds
    this.dodgeStartTime = 0;
  }

  /**
   * Enter the dodge state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-dodge');
    this.dodgeStartTime = Date.now();
    
    // Calculate dodge direction (perpendicular to player direction)
    if (enemy.targetPlayer) {
      const dx = enemy.targetPlayer.x - enemy.x;
      const dy = enemy.targetPlayer.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        // Perpendicular direction (90 degrees rotation)
        this.dodgeDirection = {
          x: -dy / dist,
          y: dx / dist
        };
        
        // Randomly choose between the two perpendicular directions
        if (Math.random() < 0.5) {
          this.dodgeDirection.x = -this.dodgeDirection.x;
          this.dodgeDirection.y = -this.dodgeDirection.y;
        }
      } else {
        // Random direction if directly on top of player
        const angle = Math.random() * Math.PI * 2;
        this.dodgeDirection = {
          x: Math.cos(angle),
          y: Math.sin(angle)
        };
      }
    } else {
      // Random direction if no player
      const angle = Math.random() * Math.PI * 2;
      this.dodgeDirection = {
        x: Math.cos(angle),
        y: Math.sin(angle)
      };
    }
    
    logger.debug(`Enemy ${enemy.id} entered Dodge state`);
  }

  /**
   * Exit the dodge state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-dodge');
  }

  /**
   * Update the dodge state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    // Check if dodge duration has elapsed
    const now = Date.now();
    if (now - this.dodgeStartTime >= this.dodgeDuration) {
      // Return to previous state
      return new PursueState();
    }

    // Move in dodge direction with increased speed
    enemy.x += this.dodgeDirection.x * enemy.speed * 2;
    enemy.y += this.dodgeDirection.y * enemy.speed * 2;
    enemy.updatePosition();

    return null;
  }
}

/**
 * Sacrifice state - enemy is sacrificing itself to empower others
 */
export class SacrificeState extends EnemyBaseState {
  private sacrificeStartTime: number;
  private sacrificeDuration: number;
  private targetEnemy: EnemyWithAI | null;
  private sacrificeRange: number;

  constructor() {
    super('Sacrifice');
    this.sacrificeStartTime = 0;
    this.sacrificeDuration = 2000; // 2 seconds
    this.targetEnemy = null;
    this.sacrificeRange = 150;
  }

  /**
   * Enter the sacrifice state
   * @param enemy - The enemy entering the state
   */
  enter(enemy: EnemyWithAI): void {
    enemy.element.classList.add('state-sacrifice');
    this.sacrificeStartTime = Date.now();
    
    // Find a nearby ally to empower
    if (enemy.group) {
      let bestTarget: EnemyWithAI | null = null;
      let bestScore = -Infinity;
      
      for (const member of enemy.group.members.values()) {
        if (member.enemy === enemy) {
          continue;
        }
        
        // Calculate distance
        const dx = member.enemy.x - enemy.x;
        const dy = member.enemy.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= this.sacrificeRange) {
          // Score based on health and distance
          const healthRatio = member.enemy.health / member.enemy.maxHealth;
          const score = healthRatio - dist / this.sacrificeRange;
          
          if (score > bestScore) {
            bestScore = score;
            bestTarget = member.enemy as EnemyWithAI;
          }
        }
      }
      
      this.targetEnemy = bestTarget;
    }
    
    logger.debug(`Enemy ${enemy.id} entered Sacrifice state`);
  }

  /**
   * Exit the sacrifice state
   * @param enemy - The enemy exiting the state
   */
  exit(enemy: EnemyWithAI): void {
    enemy.element.classList.remove('state-sacrifice');
  }

  /**
   * Update the sacrifice state
   * @param enemy - The enemy to update
   * @param deltaTime - Time since last update in ms
   * @returns The next state or null to stay in current state
   */
  update(enemy: EnemyWithAI, deltaTime: number): State<EnemyWithAI> | null {
    // Call parent update
    const nextState = super.update(enemy, deltaTime);
    if (nextState) {
      return nextState;
    }

    const now = Date.now();
    const progress = (now - this.sacrificeStartTime) / this.sacrificeDuration;
    
    // Visual effect - pulsing
    const pulseScale = 1 + 0.2 * Math.sin(progress * Math.PI * 10);
    enemy.element.style.transform = `scale(${pulseScale})`;
    
    // Create energy transfer effect if we have a target
    if (this.targetEnemy) {
      this.createEnergyTransferEffect(enemy, this.targetEnemy, progress);
    }
    
    // Check if sacrifice duration has elapsed
    if (progress >= 1) {
      // Perform sacrifice effect
      this.completeSacrifice(enemy);
      
      // Enemy dies after sacrifice
      enemy.health = 0;
      return null;
    }

    return null;
  }

  /**
   * Create energy transfer effect between sacrificing enemy and target
   * @param enemy - The sacrificing enemy
   * @param target - The target enemy
   * @param progress - Progress of the sacrifice (0-1)
   */
  private createEnergyTransferEffect(enemy: EnemyWithAI, target: EnemyWithAI, progress: number): void {
    // This would be implemented with visual effects
    // For now, just add a class to the target
    target.element.classList.add('receiving-sacrifice');
    
    // Pulse the target as well
    const targetPulse = 1 + 0.1 * Math.sin((1 - progress) * Math.PI * 10);
    target.element.style.transform = `scale(${targetPulse})`;
  }

  /**
   * Complete the sacrifice, empowering the target
   * @param enemy - The sacrificing enemy
   */
  private completeSacrifice(enemy: EnemyWithAI): void {
    if (!this.targetEnemy) {
      return;
    }
    
    // Heal the target
    const healAmount = enemy.maxHealth * 0.5;
    this.targetEnemy.health = Math.min(
      this.targetEnemy.maxHealth,
      this.targetEnemy.health + healAmount
    );
    this.targetEnemy.updateHealthBar();
    
    // Buff the target
    this.targetEnemy.damage *= 1.5; // 50% damage increase
    this.targetEnemy.speed *= 1.2; // 20% speed increase
    
    // Visual effect for the buff
    this.targetEnemy.element.classList.add('sacrifice-buffed');
    
    // Remove the receiving effect
    this.targetEnemy.element.classList.remove('receiving-sacrifice');
    
    // Create explosion effect
    this.createExplosionEffect(enemy);
  }

  /**
   * Create explosion effect when sacrifice completes
   * @param enemy - The sacrificing enemy
   */
  private createExplosionEffect(enemy: EnemyWithAI): void {
    // Create explosion element
    const explosion = document.createElement('div');
    explosion.className = 'sacrifice-explosion';
    explosion.style.left = `${enemy.x}px`;
    explosion.style.top = `${enemy.y}px`;
    explosion.style.width = `${enemy.width * 3}px`;
    explosion.style.height = `${enemy.height * 3}px`;
    
    // Add to game container
    enemy.gameContainer.appendChild(explosion);
    
    // Remove after animation
    setTimeout(() => {
      if (explosion.parentNode) {
        explosion.parentNode.removeChild(explosion);
      }
    }, 1000);
    
    // Damage nearby player
    if (enemy.targetPlayer) {
      const dx = enemy.targetPlayer.x - enemy.x;
      const dy = enemy.targetPlayer.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const explosionRadius = enemy.width * 3;
      if (dist < explosionRadius && enemy.targetPlayer.takeDamage) {
        // Damage decreases with distance
        const damageMultiplier = 1 - dist / explosionRadius;
        const damage = enemy.damage * 2 * damageMultiplier;
        enemy.targetPlayer.takeDamage(damage, enemy);
      }
    }
  }
}
