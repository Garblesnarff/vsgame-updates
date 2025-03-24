import { Enemy } from './base-enemy';
import { EnemyGroup, GroupType, FormationType } from './enemy-group';
import { GameEvents, EVENTS } from '../../utils/event-system';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EnemyGroupManager');

/**
 * EnemyGroupManager - Manages the creation and coordination of enemy groups
 */
export class EnemyGroupManager {
  groups: Map<string, EnemyGroup>;
  gameContainer: HTMLElement;
  maxGroupSize: number;
  groupFormationDistance: number;
  player: any;
  formationTypes: FormationType[];
  groupTypes: GroupType[];
  
  /**
   * Create a new enemy group manager
   * @param gameContainer - DOM element containing the game
   * @param player - Reference to the player
   */
  constructor(gameContainer: HTMLElement, player: any) {
    this.groups = new Map();
    this.gameContainer = gameContainer;
    this.player = player;
    this.maxGroupSize = 8; // Maximum enemies per group
    this.groupFormationDistance = 200; // Distance for enemies to be considered part of the same group
    
    // Available formation types
    this.formationTypes = [
      FormationType.PHALANX,
      FormationType.PINCER,
      FormationType.ORBITAL,
      FormationType.SWARM
    ];
    
    // Available group types
    this.groupTypes = [
      GroupType.STANDARD,
      GroupType.SURROUND,
      GroupType.PROTECT,
      GroupType.DISTRACT,
      GroupType.DRAIN
    ];
    
    // Set up event listeners
    this.setupEventListeners();
    
    logger.debug('Enemy group manager initialized');
  }
  
  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for enemy spawn events
    GameEvents.on(EVENTS.ENEMY_SPAWN, (enemy: Enemy) => {
      this.handleEnemySpawn(enemy);
    });
    
    // Listen for enemy death events
    GameEvents.on(EVENTS.ENEMY_DEATH, (enemy: Enemy) => {
      this.handleEnemyDeath(enemy);
    });
    
    // Listen for group deactivation events
    GameEvents.on('enemyGroup:deactivate', (groupId: string) => {
      this.groups.delete(groupId);
    });
  }
  
  /**
   * Handle enemy spawn event
   * @param enemy - The spawned enemy
   */
  private handleEnemySpawn(enemy: Enemy): void {
    // Try to add to an existing group
    const addedToGroup = this.addToExistingGroup(enemy);
    
    // If not added to an existing group, consider creating a new group
    if (!addedToGroup && Math.random() < 0.7) { // 70% chance to create a new group
      this.createNewGroup(enemy);
    }
  }
  
  /**
   * Handle enemy death event
   * @param enemy - The enemy that died
   */
  private handleEnemyDeath(enemy: Enemy): void {
    // Find groups containing this enemy
    for (const group of this.groups.values()) {
      if (group.members.has(enemy.id)) {
        group.removeMember(enemy.id);
        break;
      }
    }
  }
  
  /**
   * Try to add an enemy to an existing group
   * @param enemy - The enemy to add
   * @returns Whether the enemy was added to a group
   */
  private addToExistingGroup(enemy: Enemy): boolean {
    // Find the closest group that has room
    let closestGroup: EnemyGroup | null = null;
    let closestDistance = Infinity;
    
    for (const group of this.groups.values()) {
      // Skip groups that are full
      if (group.members.size >= this.maxGroupSize) {
        continue;
      }
      
      // Find the closest enemy in the group
      let minDistance = Infinity;
      for (const member of group.members.values()) {
        const dx = member.enemy.x - enemy.x;
        const dy = member.enemy.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
      
      // Check if this group is closer than the current closest
      if (minDistance < closestDistance && minDistance <= this.groupFormationDistance) {
        closestDistance = minDistance;
        closestGroup = group;
      }
    }
    
    // If we found a close group, add the enemy to it
    if (closestGroup) {
      closestGroup.addMember(enemy);
      return true;
    }
    
    return false;
  }
  
  /**
   * Create a new group with an enemy
   * @param enemy - The enemy to create a group with
   * @returns The created group
   */
  private createNewGroup(enemy: Enemy): EnemyGroup {
    // Generate a unique ID for the group
    const groupId = `group_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Select a random group type
    const groupType = this.getRandomGroupType();
    
    // Create the group
    const group = new EnemyGroup(groupId, this.gameContainer, [enemy], groupType);
    
    // Select a formation type based on group type
    const formationType = this.getFormationForGroupType(groupType);
    group.setFormation(formationType);
    
    // Add to groups map
    this.groups.set(groupId, group);
    
    logger.debug(`Created new group ${groupId} with type ${groupType} and formation ${formationType}`);
    
    return group;
  }
  
  /**
   * Get a random group type
   * @returns A random group type
   */
  private getRandomGroupType(): GroupType {
    return this.groupTypes[Math.floor(Math.random() * this.groupTypes.length)];
  }
  
  /**
   * Get a formation type that works well with a group type
   * @param groupType - The group type
   * @returns A suitable formation type
   */
  private getFormationForGroupType(groupType: GroupType): FormationType {
    // Match formations to group types
    switch (groupType) {
      case GroupType.SURROUND:
        return FormationType.ORBITAL;
      case GroupType.PROTECT:
        return FormationType.PHALANX;
      case GroupType.DISTRACT:
        return FormationType.PINCER;
      case GroupType.DRAIN:
        return FormationType.SWARM;
      case GroupType.STANDARD:
      default:
        // Random formation for standard groups
        return this.formationTypes[Math.floor(Math.random() * this.formationTypes.length)];
    }
  }
  
  /**
   * Update all groups
   * @param deltaTime - Time since last update in ms
   */
  update(deltaTime: number): void {
    // Update each group
    for (const group of this.groups.values()) {
      group.update(deltaTime, this.player);
    }
    
    // Check for group merges
    this.checkForGroupMerges();
  }
  
  /**
   * Check for potential group merges
   */
  private checkForGroupMerges(): void {
    // Skip if we have fewer than 2 groups
    if (this.groups.size < 2) {
      return;
    }
    
    const groupArray = Array.from(this.groups.values());
    
    // Check each pair of groups
    for (let i = 0; i < groupArray.length; i++) {
      const group1 = groupArray[i];
      
      // Skip groups that are already at max size
      if (group1.members.size >= this.maxGroupSize) {
        continue;
      }
      
      for (let j = i + 1; j < groupArray.length; j++) {
        const group2 = groupArray[j];
        
        // Skip if the combined size would exceed max
        if (group1.members.size + group2.members.size > this.maxGroupSize) {
          continue;
        }
        
        // Check if groups are close enough to merge
        if (this.shouldMergeGroups(group1, group2)) {
          this.mergeGroups(group1, group2);
          // After merging, we need to break out of the inner loop
          break;
        }
      }
    }
  }
  
  /**
   * Check if two groups should merge
   * @param group1 - First group
   * @param group2 - Second group
   * @returns Whether the groups should merge
   */
  private shouldMergeGroups(group1: EnemyGroup, group2: EnemyGroup): boolean {
    // Calculate minimum distance between any members of the groups
    let minDistance = Infinity;
    
    for (const member1 of group1.members.values()) {
      for (const member2 of group2.members.values()) {
        const dx = member1.enemy.x - member2.enemy.x;
        const dy = member1.enemy.y - member2.enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
    }
    
    // Groups should merge if they're close enough
    return minDistance <= this.groupFormationDistance;
  }
  
  /**
   * Merge two groups
   * @param targetGroup - Group to merge into
   * @param sourceGroup - Group to merge from
   */
  private mergeGroups(targetGroup: EnemyGroup, sourceGroup: EnemyGroup): void {
    // Move all members from source to target
    for (const [memberId, member] of sourceGroup.members.entries()) {
      // Skip if already in target group
      if (targetGroup.members.has(memberId)) {
        continue;
      }
      
      // Remove from source group without deactivating
      sourceGroup.members.delete(memberId);
      
      // Add to target group
      targetGroup.addMember(member.enemy, member.role);
    }
    
    // Deactivate the source group
    sourceGroup.deactivate();
    
    // Remove the source group from our map
    this.groups.delete(sourceGroup.id);
    
    logger.debug(`Merged group ${sourceGroup.id} into ${targetGroup.id}`);
  }
  
  /**
   * Get a group by ID
   * @param groupId - ID of the group to get
   * @returns The group or null if not found
   */
  getGroup(groupId: string): EnemyGroup | null {
    return this.groups.get(groupId) || null;
  }
  
  /**
   * Get the group containing an enemy
   * @param enemyId - ID of the enemy
   * @returns The group containing the enemy or null if not found
   */
  getGroupForEnemy(enemyId: string): EnemyGroup | null {
    for (const group of this.groups.values()) {
      if (group.members.has(enemyId)) {
        return group;
      }
    }
    
    return null;
  }
  
  /**
   * Clean up the group manager
   */
  cleanup(): void {
    // Clean up all groups
    for (const group of this.groups.values()) {
      group.cleanup();
    }
    
    // Clear groups map
    this.groups.clear();
    
    // Remove event listeners
    GameEvents.removeAllListeners(EVENTS.ENEMY_SPAWN);
    GameEvents.removeAllListeners(EVENTS.ENEMY_DEATH);
    GameEvents.removeAllListeners('enemyGroup:deactivate');
    
    logger.debug('Enemy group manager cleaned up');
  }
}

export default EnemyGroupManager;
