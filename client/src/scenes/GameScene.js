import Phaser from 'phaser';
import CONFIG from '../../scripts/config'; // Adjust path as needed

// Placeholder for Player class/object - Assuming it will be imported or defined elsewhere
// import Player from '../../scripts/entities/player'; 

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.player = null; // Initialize player reference
        // Add other necessary properties like enemy groups, managers etc.
        this.enemies = null; 
    }

    preload() {
        // Load assets here (player sprite, enemy sprites, background, etc.)
        this.load.image('player', 'client/assets/images/player/player.png'); // Uncommented to load player asset
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
        // Placeholder: Create the player instance 
        // This assumes you have a Player class that handles its own physics sprite
        // Example: this.player = new Player(this, CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2); 
        // For now, let's add a simple placeholder sprite if no Player class exists yet
        this.player = this.physics.add.sprite(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2, 'player'); // Use a loaded player asset key
        this.player.setCollideWorldBounds(true); // Make player collide with world bounds
        console.log("Player placeholder created and set to collide with world bounds.");

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
        // Placeholder: Update player movement based on input
        if (this.player && this.cursors) {
            this.player.setVelocity(0);

            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-CONFIG.PLAYER.SPEED * 100); // Adjust speed scaling as needed
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(CONFIG.PLAYER.SPEED * 100);
            }

            if (this.cursors.up.isDown) {
                this.player.setVelocityY(-CONFIG.PLAYER.SPEED * 100);
            } else if (this.cursors.down.isDown) {
                this.player.setVelocityY(CONFIG.PLAYER.SPEED * 100);
            }
        }

        // --- System Updates ---
        // Placeholder: Update other systems
        // Example: this.spawnSystem.update(time, delta); // Pass time and delta
    }

    // Placeholder collision handler
    handlePlayerEnemyCollision(player, enemy) {
        // Handle collision logic (damage, effects, etc.)
        console.log("Player collided with enemy");
        // Example: enemy.destroy(); // Simple enemy removal
    }
}
