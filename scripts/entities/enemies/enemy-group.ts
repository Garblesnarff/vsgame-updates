import { Enemy } from './base-enemy';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EnemyGroup');

/**
 * Group types for different coordinated behaviors
 */
export enum GroupType {
  STANDARD = 'standard',
  SURROUND = 'surround',
  PROTECT = 'protect',
  DISTRACT = 'distract',
  DRAIN = 'drain'
}

/**
 * Formation types for different movement patterns
 */
export enum FormationType {
  NONE = 'none',
  PHALANX = 'phalanx',
  PINCER = 'pincer',
  ORBITAL = 'orbital',
  SWARM = 'swarm'
}

/**
 * Role types for enemies within a group
 */
export enum EnemyRole {
  LEADER = 'leader',
  ATTACKER = 'attacker',
  DEFENDER = 'defender',
  SUPPORT = 'support',
  DISTRACTOR = 'distractor',
  STRIKER = 'striker'
}

/**
 * Interface for enemy group members
 */
export interface GroupMember {
  enemy: Enemy;
  role: EnemyRole;
  joinTime: number;
  formationPosition?: { x: number, y: number };
}

/**
 * EnemyGroup - Manages a group of enemies that coordinate their behavior
 */
export class EnemyGroup {
  id: string;
  members: Map<string, GroupMember>;
  leader: Enemy | null;
  groupType: GroupType;
  formationType: FormationType;
  formationBonus: number;
  isActive: boolean;
  lastUpdateTime: number;
  targetUpdateInterval: number;
  visualLinksEnabled: boolean;
  visualLinks: HTMLElement[];
  gameContainer: HTMLElement;

  /**
   * Create a new enemy group
   * @param id - Unique identifier for the group
   * @param gameContainer - DOM element containing the game
   * @param initialMembers - Initial enemies to add to the group (optional)
   * @param groupType - Type of group behavior (optional)
   */
  constructor(
    id: string,
    gameContainer: HTMLElement,
    initialMembers: Enemy[] = [],
    groupType: GroupType = GroupType.STANDARD
  ) {
    this.id = id;
    this.members = new Map();
    this.leader = null;
    this.groupType = groupType;
    this.formationType = FormationType.NONE;
    this.formationBonus = 1.0;
    this.isActive = true;
    this.lastUpdateTime = Date.now();
    this.targetUpdateInterval = 500; // ms between target updates
    this.visualLinksEnabled = true;
    this.visualLinks = [];
    this.gameContainer = gameContainer;

    // Add initial members
    initialMembers.forEach(enemy => this.addMember(enemy));

    logger.debug(`Created enemy group ${id} with ${initialMembers.length} initial members`);
  }

  /**
   * Add an enemy to the group
   * @param enemy - Enemy to add
   * @param role - Role for the enemy (optional)
   * @returns Whether the enemy was added successfully
   */
  addMember(enemy: Enemy, role: EnemyRole = EnemyRole.ATTACKER): boolean {
    // Don't add if already a member
    if (this.members.has(enemy.id)) {
      return false;
    }

    // Add to members map
    this.members.set(enemy.id, {
      enemy,
      role,
      joinTime: Date.now()
    });

    // Add group membership class to enemy
    enemy.element.classList.add('group-member');
    enemy.element.classList.add(`group-${this.id}`);
    enemy.element.classList.add(`role-${role}`);

    // If this is the first member or explicitly a leader, make it the leader
    if (!this.leader || role === EnemyRole.LEADER) {
      this.setLeader(enemy);
    }

    // Create visual links if enabled
    if (this.visualLinksEnabled) {
      this.updateVisualLinks();
    }

    logger.debug(`Added enemy ${enemy.id} to group ${this.id} as ${role}`);
    return true;
  }

  /**
   * Remove an enemy from the group
   * @param enemyId - ID of the enemy to remove
   * @returns Whether the enemy was removed successfully
   */
  removeMember(enemyId: string): boolean {
    const member = this.members.get(enemyId);
    if (!member) {
      return false;
    }

    // Remove group membership classes
    member.enemy.element.classList.remove('group-member');
    member.enemy.element.classList.remove(`group-${this.id}`);
    member.enemy.element.classList.remove(`role-${member.role}`);

    // Remove from members map
    this.members.delete(enemyId);

    // If this was the leader, choose a new leader
    if (this.leader && this.leader.id === enemyId) {
      this.chooseNewLeader();
    }

    // Update visual links
    if (this.visualLinksEnabled) {
      this.updateVisualLinks();
    }

    logger.debug(`Removed enemy ${enemyId} from group ${this.id}`);

    // If no members left, deactivate the group
    if (this.members.size === 0) {
      this.deactivate();
      return true;
    }

    return true;
  }

  /**
   * Set an enemy as the leader of the group
   * @param enemy - Enemy to set as leader
   */
  setLeader(enemy: Enemy): void {
    // If there's an existing leader, change its role
    if (this.leader) {
      const oldLeaderMember = this.members.get(this.leader.id);
      if (oldLeaderMember) {
        oldLeaderMember.role = EnemyRole.ATTACKER;
        this.leader.element.classList.remove('role-leader');
        this.leader.element.classList.add(`role-${oldLeaderMember.role}`);
      }
    }

    // Set the new leader
    this.leader = enemy;
    const member = this.members.get(enemy.id);
    if (member) {
      member.role = EnemyRole.LEADER;
      enemy.element.classList.remove(`role-${member.role}`);
      enemy.element.classList.add('role-leader');
    }

    logger.debug(`Set enemy ${enemy.id} as leader of group ${this.id}`);
  }

  /**
   * Choose a new leader from existing members
   * @returns Whether a new leader was chosen
   */
  chooseNewLeader(): boolean {
    if (this.members.size === 0) {
      this.leader = null;
      return false;
    }

    // Choose the member that's been in the group the longest
    let oldestMember: GroupMember | null = null;
    let oldestTime = Infinity;

    for (const member of this.members.values()) {
      if (member.joinTime < oldestTime) {
        oldestMember = member;
        oldestTime = member.joinTime;
      }
    }

    if (oldestMember) {
      this.setLeader(oldestMember.enemy);
      return true;
    }

    return false;
  }

  /**
   * Update the group's behavior
   * @param deltaTime - Time since last update in ms
   * @param player - Reference to the player
   */
  update(deltaTime: number, player: any): void {
    if (!this.isActive || !player) {
      return;
    }

    const now = Date.now();

    // Update formation positions periodically
    if (now - this.lastUpdateTime > this.targetUpdateInterval) {
      this.lastUpdateTime = now;
      this.updateFormationPositions(player);
    }

    // Update visual links if enabled
    if (this.visualLinksEnabled) {
      this.updateVisualLinks();
    }
  }

  /**
   * Update the positions for enemies in formation
   * @param player - Reference to the player
   */
  updateFormationPositions(player: any): void {
    if (!player || this.members.size === 0) {
      return;
    }

    // Different formation types have different positioning logic
    switch (this.formationType) {
      case FormationType.PHALANX:
        this.updatePhalanxFormation(player);
        break;
      case FormationType.PINCER:
        this.updatePincerFormation(player);
        break;
      case FormationType.ORBITAL:
        this.updateOrbitalFormation(player);
        break;
      case FormationType.SWARM:
        this.updateSwarmFormation(player);
        break;
      case FormationType.NONE:
      default:
        // No formation, just update roles
        this.updateRoles(player);
        break;
    }
  }

  /**
   * Update the phalanx formation positions
   * @param player - Reference to the player
   */
  private updatePhalanxFormation(player: any): void {
    if (!this.leader || this.members.size <= 1) {
      return;
    }

    // Calculate direction to player
    const dx = player.x - this.leader.x;
    const dy = player.y - this.leader.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return;
    }

    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Calculate perpendicular direction for the line
    const perpX = -dirY;
    const perpY = dirX;

    // Calculate line width based on number of members
    const lineWidth = Math.min(this.members.size * 40, 300);
    const halfWidth = lineWidth / 2;

    // Position members along the line
    let index = 0;
    const memberCount = this.members.size;

    for (const member of this.members.values()) {
      // Skip the leader
      if (member.enemy === this.leader) {
        continue;
      }

      // Calculate position along the line
      const offset = halfWidth - (index * lineWidth / (memberCount - 1));
      const posX = this.leader.x + perpX * offset;
      const posY = this.leader.y + perpY * offset;

      // Store formation position
      member.formationPosition = { x: posX, y: posY };
      index++;
    }

    // Apply formation bonus - front line enemies get damage reduction
    for (const member of this.members.values()) {
      if (member.role === EnemyRole.DEFENDER) {
        // 30% damage reduction for defenders in phalanx
        member.enemy.element.classList.add('phalanx-defender');
      } else {
        member.enemy.element.classList.remove('phalanx-defender');
      }
    }
  }

  /**
   * Update the pincer formation positions
   * @param player - Reference to the player
   */
  private updatePincerFormation(player: any): void {
    if (!this.leader || this.members.size <= 1) {
      return;
    }

    // Split members into two groups
    const leftGroup: GroupMember[] = [];
    const rightGroup: GroupMember[] = [];
    
    let index = 0;
    for (const member of this.members.values()) {
      // Skip the leader
      if (member.enemy === this.leader) {
        continue;
      }

      // Alternate between left and right groups
      if (index % 2 === 0) {
        leftGroup.push(member);
      } else {
        rightGroup.push(member);
      }
      index++;
    }

    // Calculate angles for the two groups
    const angleOffset = Math.PI / 3; // 60 degrees
    
    // Calculate direction to player
    const dx = player.x - this.leader.x;
    const dy = player.y - this.leader.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) {
      return;
    }
    
    // Normalize direction
    const angle = Math.atan2(dy, dx);
    
    // Calculate angles for the two groups
    const leftAngle = angle - angleOffset;
    const rightAngle = angle + angleOffset;
    
    // Position left group
    for (let i = 0; i < leftGroup.length; i++) {
      const member = leftGroup[i];
      const distance = 100 + i * 50; // Increasing distance for each member
      
      const posX = player.x - Math.cos(leftAngle) * distance;
      const posY = player.y - Math.sin(leftAngle) * distance;
      
      member.formationPosition = { x: posX, y: posY };
      member.enemy.element.classList.add('pincer-member');
    }
    
    // Position right group
    for (let i = 0; i < rightGroup.length; i++) {
      const member = rightGroup[i];
      const distance = 100 + i * 50; // Increasing distance for each member
      
      const posX = player.x - Math.cos(rightAngle) * distance;
      const posY = player.y - Math.sin(rightAngle) * distance;
      
      member.formationPosition = { x: posX, y: posY };
      member.enemy.element.classList.add('pincer-member');
    }
    
    // Apply formation bonus - speed boost when executing pincer attack
    const playerDistance = dist;
    if (playerDistance < 200) { // Close enough to execute pincer attack
      for (const member of this.members.values()) {
        // 25% speed boost during pincer attack
        member.enemy.element.classList.add('pincer-attacking');
      }
    } else {
      for (const member of this.members.values()) {
        member.enemy.element.classList.remove('pincer-attacking');
      }
    }
  }

  /**
   * Update the orbital formation positions
   * @param player - Reference to the player
   */
  private updateOrbitalFormation(player: any): void {
    if (this.members.size <= 1) {
      return;
    }

    // Calculate orbit parameters
    const orbitRadius = 150; // Base orbit radius
    const memberCount = this.members.size;
    
    // Position members in a circle around the player
    let index = 0;
    for (const member of this.members.values()) {
      // Calculate position on the circle
      const angle = (index / memberCount) * Math.PI * 2;
      const posX = player.x + Math.cos(angle) * orbitRadius;
      const posY = player.y + Math.sin(angle) * orbitRadius;
      
      member.formationPosition = { x: posX, y: posY };
      member.enemy.element.classList.add('orbital-member');
      index++;
    }
    
    // Apply formation bonus - dodge chance while in orbital motion
    for (const member of this.members.values()) {
      // 20% dodge chance while in orbital formation
      member.enemy.element.classList.add('orbital-dodge');
    }
  }

  /**
   * Update the swarm formation positions
   * @param player - Reference to the player
   */
  private updateSwarmFormation(player: any): void {
    if (this.members.size <= 1) {
      return;
    }

    // Calculate swarm center
    let centerX = 0;
    let centerY = 0;
    
    for (const member of this.members.values()) {
      centerX += member.enemy.x;
      centerY += member.enemy.y;
    }
    
    centerX /= this.members.size;
    centerY /= this.members.size;
    
    // Calculate direction to player
    const dx = player.x - centerX;
    const dy = player.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) {
      return;
    }
    
    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Calculate swarm radius based on number of members
    const swarmRadius = Math.min(this.members.size * 10, 100);
    
    // Position members in a tight cluster
    for (const member of this.members.values()) {
      // Random offset within the swarm radius
      const offsetX = (Math.random() - 0.5) * swarmRadius;
      const offsetY = (Math.random() - 0.5) * swarmRadius;
      
      // Position relative to swarm center, biased toward player
      const posX = centerX + dirX * 50 + offsetX;
      const posY = centerY + dirY * 50 + offsetY;
      
      member.formationPosition = { x: posX, y: posY };
      member.enemy.element.classList.add('swarm-member');
    }
    
    // Apply formation bonus - damage reduction while in swarm
    for (const member of this.members.values()) {
      // 40% damage reduction while in swarm
      member.enemy.element.classList.add('swarm-protection');
    }
  }

  /**
   * Update enemy roles based on group type
   * @param player - Reference to the player
   */
  private updateRoles(player: any): void {
    if (!player || this.members.size <= 1) {
      return;
    }

    switch (this.groupType) {
      case GroupType.SURROUND:
        this.updateSurroundRoles(player);
        break;
      case GroupType.PROTECT:
        this.updateProtectRoles(player);
        break;
      case GroupType.DISTRACT:
        this.updateDistractRoles(player);
        break;
      case GroupType.DRAIN:
        this.updateDrainRoles(player);
        break;
      case GroupType.STANDARD:
      default:
        // Standard roles - no special behavior
        break;
    }
  }

  /**
   * Update roles for surround and ambush behavior
   * @param player - Reference to the player
   */
  private updateSurroundRoles(player: any): void {
    if (!player || this.members.size <= 1) {
      return;
    }

    // Divide the circle into equal segments
    const angleStep = (Math.PI * 2) / this.members.size;
    let index = 0;

    for (const member of this.members.values()) {
      // Calculate angle for this member
      const angle = index * angleStep;
      
      // Calculate target position around the player
      const distance = 150; // Distance from player
      const targetX = player.x + Math.cos(angle) * distance;
      const targetY = player.y + Math.sin(angle) * distance;
      
      // Store as formation position
      member.formationPosition = { x: targetX, y: targetY };
      
      // Visual indicator
      member.enemy.element.classList.add('surrounding');
      
      index++;
    }
  }

  /**
   * Update roles for protect specialized units behavior
   * @param player - Reference to the player
   */
  private updateProtectRoles(player: any): void {
    if (!player || this.members.size <= 1) {
      return;
    }

    // Find specialized units to protect
    const specializedUnits: GroupMember[] = [];
    const regularUnits: GroupMember[] = [];
    
    for (const member of this.members.values()) {
      // Check if this is a specialized unit (VampireHunter, SilverMage, HolyPriest)
      const isSpecialized = 
        member.enemy.element.classList.contains('vampire-hunter') ||
        member.enemy.element.classList.contains('silver-mage') ||
        member.enemy.element.classList.contains('holy-priest');
      
      if (isSpecialized) {
        specializedUnits.push(member);
        member.role = EnemyRole.SUPPORT;
        member.enemy.element.classList.add('protected-unit');
      } else {
        regularUnits.push(member);
        member.role = EnemyRole.DEFENDER;
        member.enemy.element.classList.add('bodyguard');
      }
    }
    
    // Position bodyguards around specialized units
    for (let i = 0; i < specializedUnits.length; i++) {
      const specialUnit = specializedUnits[i];
      
      // Calculate direction to player
      const dx = player.x - specialUnit.enemy.x;
      const dy = player.y - specialUnit.enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist === 0) {
        continue;
      }
      
      // Normalize direction
      const dirX = dx / dist;
      const dirY = dy / dist;
      
      // Position specialized unit behind bodyguards
      const backDistance = 100;
      specialUnit.formationPosition = {
        x: player.x - dirX * backDistance,
        y: player.y - dirY * backDistance
      };
      
      // Assign bodyguards to this specialized unit
      const guardsPerUnit = Math.floor(regularUnits.length / specializedUnits.length);
      const startIndex = i * guardsPerUnit;
      const endIndex = Math.min(startIndex + guardsPerUnit, regularUnits.length);
      
      // Position bodyguards in front of the specialized unit
      for (let j = startIndex; j < endIndex; j++) {
        if (j >= regularUnits.length) {
          break;
        }
        
        const guard = regularUnits[j];
        const angle = ((j - startIndex) / guardsPerUnit) * Math.PI - Math.PI / 2;
        
        // Position in front of specialized unit
        const guardDistance = 50;
        guard.formationPosition = {
          x: specialUnit.formationPosition.x + dirX * guardDistance + Math.cos(angle) * 30,
          y: specialUnit.formationPosition.y + dirY * guardDistance + Math.sin(angle) * 30
        };
      }
    }
  }

  /**
   * Update roles for distraction tactics
   * @param player - Reference to the player
   */
  private updateDistractRoles(player: any): void {
    if (!player || this.members.size <= 1) {
      return;
    }

    // Divide members into distractors and strikers
    const distractorCount = Math.ceil(this.members.size / 2);
    let index = 0;
    
    for (const member of this.members.values()) {
      if (index < distractorCount) {
        // Distractors - more aggressive, erratic movement
        member.role = EnemyRole.DISTRACTOR;
        member.enemy.element.classList.add('distractor');
        
        // Position closer to player
        const angle = (index / distractorCount) * Math.PI * 2;
        const distance = 100 + Math.random() * 50;
        
        member.formationPosition = {
          x: player.x + Math.cos(angle) * distance,
          y: player.y + Math.sin(angle) * distance
        };
      } else {
        // Strikers - more deliberate movement, preparing stronger attacks
        member.role = EnemyRole.STRIKER;
        member.enemy.element.classList.add('striker');
        
        // Position further from player
        const angle = ((index - distractorCount) / (this.members.size - distractorCount)) * Math.PI * 2;
        const distance = 200 + Math.random() * 50;
        
        member.formationPosition = {
          x: player.x + Math.cos(angle) * distance,
          y: player.y + Math.sin(angle) * distance
        };
      }
      
      index++;
    }
  }

  /**
   * Update roles for resource drain strategy
   * @param player - Reference to the player
   */
  private updateDrainRoles(player: any): void {
    if (!player || this.members.size <= 1) {
      return;
    }

    // All members focus on draining player resources
    for (const member of this.members.values()) {
      member.enemy.element.classList.add('resource-drainer');
      
      // Position in a loose formation around player
      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      
      member.formationPosition = {
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance
      };
    }
  }

  /**
   * Update visual links between group members
   */
  private updateVisualLinks(): void {
    // Remove old links
    this.clearVisualLinks();

    // Don't create links if only one member
    if (this.members.size <= 1) {
      return;
    }

    // Create links between members
    const memberArray = Array.from(this.members.values());
    
    for (let i = 0; i < memberArray.length; i++) {
      const member1 = memberArray[i];
      
      // Link to leader if this is not the leader
      if (this.leader && member1.enemy !== this.leader) {
        this.createVisualLink(member1.enemy, this.leader);
      }
      
      // Link to next member in array (circular)
      const nextIndex = (i + 1) % memberArray.length;
      const member2 = memberArray[nextIndex];
      
      if (member1 !== member2) {
        this.createVisualLink(member1.enemy, member2.enemy);
      }
    }
  }

  /**
   * Create a visual link between two enemies
   * @param enemy1 - First enemy
   * @param enemy2 - Second enemy
   */
  private createVisualLink(enemy1: Enemy, enemy2: Enemy): void {
    // Calculate center points
    const x1 = enemy1.x + enemy1.width / 2;
    const y1 = enemy1.y + enemy1.height / 2;
    const x2 = enemy2.x + enemy2.width / 2;
    const y2 = enemy2.y + enemy2.height / 2;
    
    // Calculate distance
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Don't create links if too far apart
    if (distance > 300) {
      return;
    }
    
    // Create link element
    const link = document.createElement('div');
    link.className = 'enemy-group-link';
    
    // Position and rotate link
    const angle = Math.atan2(dy, dx);
    link.style.width = `${distance}px`;
    link.style.left = `${x1}px`;
    link.style.top = `${y1}px`;
    link.style.transform = `rotate(${angle}rad)`;
    
    // Add to game container and track
    this.gameContainer.appendChild(link);
    this.visualLinks.push(link);
  }

  /**
   * Clear all visual links
   */
  private clearVisualLinks(): void {
    for (const link of this.visualLinks) {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }
    this.visualLinks = [];
  }

  /**
   * Set the formation type for the group
   * @param formationType - New formation type
   */
  setFormation(formationType: FormationType): void {
    // Remove old formation classes
    for (const member of this.members.values()) {
      member.enemy.element.classList.remove('phalanx-member');
      member.enemy.element.classList.remove('phalanx-defender');
      member.enemy.element.classList.remove('pincer-member');
      member.enemy.element.classList.remove('pincer-attacking');
      member.enemy.element.classList.remove('orbital-member');
      member.enemy.element.classList.remove('orbital-dodge');
      member.enemy.element.classList.remove('swarm-member');
      member.enemy.element.classList.remove('swarm-protection');
    }
    
    // Set new formation
    this.formationType = formationType;
    
    // Add new formation classes
    for (const member of this.members.values()) {
      switch (formationType) {
        case FormationType.PHALANX:
          member.enemy.element.classList.add('phalanx-member');
          break;
        case FormationType.PINCER:
          member.enemy.element.classList.add('pincer-member');
          break;
        case FormationType.ORBITAL:
          member.enemy.element.classList.add('orbital-member');
          break;
        case FormationType.SWARM:
          member.enemy.element.classList.add('swarm-member');
          break;
      }
    }
    
    logger.debug(`Set formation type for group ${this.id} to ${formationType}`);
  }

  /**
   * Set the group type
   * @param groupType - New group type
   */
  setGroupType(groupType: GroupType): void {
    // Remove old group type classes
    for (const member of this.members.values()) {
      member.enemy.element.classList.remove('surrounding');
      member.enemy.element.classList.remove('protected-unit');
      member.enemy.element.classList.remove('bodyguard');
      member.enemy.element.classList.remove('distractor');
      member.enemy.element.classList.remove('striker');
      member.enemy.element.classList.remove('resource-drainer');
    }
    
    // Set new group type
    this.groupType = groupType;
    
    logger.debug(`Set group type for group ${this.id} to ${groupType}`);
  }

  /**
   * Deactivate the group
   */
  deactivate(): void {
    this.isActive = false;
    this.clearVisualLinks();
    
    logger.debug(`Deactivated group ${this.id}`);
    
    // Emit event for group deactivation
    GameEvents.emit('enemyGroup:deactivate', this.id);
  }

  /**
   * Clean up the group
   */
  cleanup(): void {
    this.clearVisualLinks();
    
    // Remove all group classes from members
    for (const member of this.members.values()) {
      member.enemy.element.classList.remove('group-member');
      member.enemy.element.classList.remove(`group-${this.id}`);
      member.enemy.element.classList.remove(`role-${member.role}`);
      
      // Remove formation classes
      member.enemy.element.classList.remove('phalanx-member');
      member.enemy.element.classList.remove('phalanx-defender');
      member.enemy.element.classList.remove('pincer-member');
      member.enemy.element.classList.remove('pincer-attacking');
      member.enemy.element.classList.remove('orbital-member');
      member.enemy.element.classList.remove('orbital-dodge');
      member.enemy.element.classList.remove('swarm-member');
      member.enemy.element.classList.remove('swarm-protection');
      
      // Remove group type classes
      member.enemy.element.classList.remove('surrounding');
      member.enemy.element.classList.remove('protected-unit');
      member.enemy.element.classList.remove('bodyguard');
      member.enemy.element.classList.remove('distractor');
      member.enemy.element.classList.remove('striker');
      member.enemy.element.classList.remove('resource-drainer');
    }
    
    // Deactivate the group
    this.deactivate();
    
    logger.debug(`Cleaned up group ${this.id}`);
  }
}
