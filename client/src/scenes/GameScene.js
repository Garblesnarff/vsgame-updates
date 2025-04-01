import Phaser from 'phaser';
import CONFIG from '../../scripts/config'; // Adjust path as needed
import Player from '../entities/Player'; // Import the Player class

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null; // Initialize player reference
        // Add other necessary properties like enemy groups, managers etc.
        this.enemies = null; 
    }

    preload() {
        // Load assets here (player sprite, enemy sprites, background, etc.)
        // Corrected path to align with webpack output/serving structure
        this.load.spritesheet('vampire', 'assets/images/player/vampire_character.png', {
            frameWidth: 32,  // Each frame is 32 pixels wide
            frameHeight: 32, // Each frame is 32 pixels high
            // Adjust these values based on the actual sprite dimensions
        });
        // Example: this.load.image('background', 'client/assets/images/background.png'); // Placeholder for a large background
        this.load.image('basic_enemy', 'client/assets/images/enemies/basic/basic_character_sheet.png'); // Example enemy asset
    }

    create() {
        console.log("GameScene Create - Setting up world and camera");

        // --- World Setup ---
        // Draw a visible border for the world bounds
        const graphics = this.add.graphics();
        graphics.lineStyle(4, 0xffffff, 1); // White border, 4px thick
        graphics.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        console.log("World border drawn.");

        // Set the physics boundaries of the world
        this.physics.world.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        console.log(`World bounds set to: 0, 0, ${CONFIG.WORLD_WIDTH}, ${CONFIG.WORLD_HEIGHT}`);

        // Add a placeholder background (replace with actual tiled background later)
        // this.add.image(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2, 'background').setScrollFactor(1);

        // --- Player Setup ---
        // Create the player using our Player class
        this.player = new Player(this, CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
        
        // Start with idle animation
        this.player.anims.play('player-idle', true);
        console.log("Player created and animations initialized.");

        // --- Camera Setup ---
        // Set the camera boundaries to match the world
        this.cameras.main.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        console.log(`Camera bounds set to: 0, 0, ${CONFIG.WORLD_WIDTH}, ${CONFIG.WORLD_HEIGHT}`);
        
        // Make the camera follow the player
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Smooth follow
        console.log("Camera set to follow player.");

        // --- Enemy Setup ---
        // Example: Initialize enemy group
        this.enemies = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Sprite, // Or your BaseEnemy class if it extends Sprite
            runChildUpdate: true
        });
        console.log("Enemy group initialized.");

        // Placeholder: Add collision between player and enemies
        // this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

        // Placeholder: Initialize other managers (Input, SpawnSystem integration, UI)
        // Example: this.inputSystem = new InputSystem(this.input);
        // Example: this.spawnSystem = new SpawnSystem(this, this.enemies); // Pass scene and enemy group

        // --- Input ---
        // Example: Setup keyboard input listeners
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update(time, delta) {
        // --- Player Update ---
        if (this.player && this.cursors) {
            // Update player with cursor input
            this.player.update(this.cursors, time, delta);
        }

        // --- System Updates ---
        // Placeholder: Update other systems
        // Example: this.spawnSystem.update(time, delta); // Pass time and delta
    }

    // Create animations for enemies (player animations are handled in Player class)
    createEnemyAnimations() {
        // Placeholder for enemy animations
        // Will be implemented when we add enemies
    }

    // Placeholder collision handler
    handlePlayerEnemyCollision(player, enemy) {
        // Handle collision logic (damage, effects, etc.)
        console.log("Player collided with enemy");
        // Example: enemy.destroy(); // Simple enemy removal
    }
}
