import Phaser from 'phaser';
import CONFIG from '../../scripts/config';

/**
 * Player class representing the vampire character
 * Handles player-specific functionality like movement, abilities, health, and energy
 */
export default class Player extends Phaser.Physics.Arcade.Sprite {
    /**
     * Create a new Player instance
     * @param {Phaser.Scene} scene - The scene this player belongs to
     * @param {number} x - Initial x position
     * @param {number} y - Initial y position
     */
    constructor(scene, x, y) {
        super(scene, x, y, 'vampire');
        
        // Add sprite to the scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Configure physics properties
        this.setCollideWorldBounds(true);
        this.setSize(20, 28); // Adjust hitbox size (smaller than sprite)
        this.setOffset(6, 4); // Center the hitbox
        
        // Player stats
        this.health = CONFIG.PLAYER.MAX_HEALTH;
        this.energy = CONFIG.PLAYER.MAX_ENERGY;
        
        // Cooldown tracking
        this.lastAttackTime = 0;
        this.lastAbilityUse = {
            bloodDrain: 0,
            batSwarm: 0,
            shadowDash: 0,
            bloodLance: 0,
            nightShield: 0
        };
        
        // State flags
        this.isInvulnerable = false;
        this.isDashing = false;
        this.isAttacking = false;
        
        // Create animations
        this.createAnimations(scene);
    }
    
    /**
     * Create player animations
     * @param {Phaser.Scene} scene - The scene to create animations in
     */
    createAnimations(scene) {
        // Idle animation
        scene.anims.create({
            key: 'player-idle',
            frames: scene.anims.generateFrameNumbers('vampire', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });
        
        // Walking animation
        scene.anims.create({
            key: 'player-walk',
            frames: scene.anims.generateFrameNumbers('vampire', { start: 4, end: 9 }),
            frameRate: 10,
            repeat: -1
        });
        
        // Attack animation
        scene.anims.create({
            key: 'player-attack',
            frames: scene.anims.generateFrameNumbers('vampire', { start: 10, end: 15 }), // Corrected end frame
            frameRate: 10,
            repeat: 0
        });
    }
    
    /**
     * Update player state and handle input
     * @param {Phaser.Input.Keyboard.CursorKeys} cursors - Keyboard input
     * @param {number} time - Current time
     * @param {number} delta - Time delta since last update
     */
    update(cursors, time, delta) {
        if (!this.active) return;
        
        // Handle energy regeneration
        this.regenerateEnergy(delta);
        
        // Don't allow movement while dashing
        if (this.isDashing) return;
        
        // Reset velocity
        this.setVelocity(0);
        
        // Track if player is moving
        let isMoving = false;
        
        // Handle horizontal movement
        if (cursors.left.isDown) {
            this.setVelocityX(-CONFIG.PLAYER.SPEED * 100);
            this.flipX = true; // Face left
            isMoving = true;
        } else if (cursors.right.isDown) {
            this.setVelocityX(CONFIG.PLAYER.SPEED * 100);
            this.flipX = false; // Face right
            isMoving = true;
        }
        
        // Handle vertical movement
        if (cursors.up.isDown) {
            this.setVelocityY(-CONFIG.PLAYER.SPEED * 100);
            isMoving = true;
        } else if (cursors.down.isDown) {
            this.setVelocityY(CONFIG.PLAYER.SPEED * 100);
            isMoving = true;
        }
        
        // Attack handling (auto attack)
        if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
            this.attack(time);
        }
        
        // Animation handling
        if (!this.isAttacking) {
            if (isMoving) {
                this.anims.play('player-walk', true);
            } else {
                this.anims.play('player-idle', true);
            }
        }
    }
    
    /**
     * Regenerate player energy over time
     * @param {number} delta - Time delta since last update
     */
    regenerateEnergy(delta) {
        if (this.energy < CONFIG.PLAYER.MAX_ENERGY) {
            // Convert delta time (ms) to seconds and multiply by regen rate
            const regenAmount = (delta / 1000) * CONFIG.PLAYER.ENERGY_REGEN;
            this.energy = Math.min(this.energy + regenAmount, CONFIG.PLAYER.MAX_ENERGY);
        }
    }
    
    /**
     * Player attack function (auto attack)
     * @param {number} time - Current time
     */
    attack(time) {
        const cooldown = CONFIG.ABILITIES.AUTO_ATTACK.COOLDOWN;
        
        if (time - this.lastAttackTime < cooldown) {
            return; // Still on cooldown
        }
        
        // Set attack state
        this.isAttacking = true;
        
        // Play attack animation
        this.anims.play('player-attack');
        
        // When animation completes, reset attack state
        this.on('animationcomplete-player-attack', () => {
            this.isAttacking = false;
        });
        
        // Create projectile (to be implemented)
        // this.scene.createProjectile(this.x, this.y);
        
        // Update cooldown
        this.lastAttackTime = time;
    }
    
    /**
     * Handle player taking damage
     * @param {number} amount - Amount of damage to take
     */
    takeDamage(amount) {
        // Skip damage if invulnerable
        if (this.isInvulnerable) return;
        
        this.health = Math.max(0, this.health - amount);
        
        // Flash the sprite to indicate damage
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2
        });
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Handle player death
     */
    die() {
        // Play death animation (if available)
        // this.anims.play('player-death');
        
        // Disable player input and physics
        this.active = false;
        this.body.enable = false;
        
        // Notify game over (to be implemented)
        // this.scene.gameOver();
    }
    
    // Ability methods that can be implemented in the future
    
    castBloodDrain() {
        // Implementation for Blood Drain ability
    }
    
    castBatSwarm() {
        // Implementation for Bat Swarm ability
    }
    
    castShadowDash() {
        // Implementation for Shadow Dash ability
    }
    
    castBloodLance() {
        // Implementation for Blood Lance ability
    }
    
    castNightShield() {
        // Implementation for Night Shield ability
    }
}
