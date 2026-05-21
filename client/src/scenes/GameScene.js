import Phaser from 'phaser';
import { GameEvents, EVENTS } from '../../../scripts/utils/event-system';
import CONFIG from '../../../scripts/config';

console.log('=== GAMESCENE.JS LOADED - UPDATED VERSION WITH ENEMY SPRITES ===');

/**
 * @typedef {import('../../../scripts/types/render-sync').RenderSyncPayload} RenderSyncPayload
 * @typedef {import('../../../scripts/types/render-sync').RenderEnemyState} RenderEnemyState
 * @typedef {import('../../../scripts/types/particle-events').ParticleEmitPayload} ParticleEmitPayload
 */

/**
 * GameScene - Main Phaser scene that renders all game entities
 * This is a "dumb" rendering layer that subscribes to events from the game logic layer
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        // Sprite tracking maps (entityId -> sprite)
        this.playerSprite = null;
        this.enemySprites = new Map();
        this.projectileSprites = new Map();
        this.dropSprites = new Map();
        this.batSprites = new Map();

        // Boss health bar tracking
        this.bossHealthBar = null;
        this.bossHealthFill = null;
        this.bossNameText = null;
        this.currentBossId = null;

        // Active ability visuals
        this.bloodDrainCircle = null;
        this.nightShieldCircle = null;

        // Particle emitters
        this.bloodEmitter = null;
        this.novaEmitter = null;

        // Event unsubscribe functions
        this.unsubscribers = [];
    }

    preload() {
        // Try to load assets but don't fail if they don't exist
        // Fallback textures will be created in create()
        this.load.on('loaderror', (file) => {
            console.error(`LOAD ERROR: ${file.key} from ${file.url}`);
        });

        this.load.on('filecomplete', (key, type, data) => {
            console.log(`LOAD SUCCESS: ${key} (${type})`);
        });

        this.load.on('complete', () => {
            console.log('=== ALL ASSETS LOADED ===');
            // Log which textures are available
            const textureKeys = ['basic-enemy', 'fast-swarmer', 'vampire-hunter', 'tanky-brute',
                                 'silver-mage', 'holy-priest', 'vampire-scout', 'church-paladin', 'player'];
            textureKeys.forEach(key => {
                console.log(`  Texture '${key}': ${this.textures.exists(key) ? 'EXISTS' : 'MISSING'}`);
            });

            // Mark textures as ready - sprites created before this used fallback
            this.texturesReady = true;

            // Update existing sprites to use proper textures (instead of destroying them)
            if (this.enemySprites && this.enemySprites.size > 0) {
                console.log(`Updating ${this.enemySprites.size} sprites to use proper textures`);
                this.enemySprites.forEach((sprite, id) => {
                    const enemyType = sprite.getData('enemyType');
                    if (enemyType) {
                        this.updateSpriteTexture(sprite, enemyType);
                    }
                });
            }
        });

        // Load player spritesheet
        this.load.spritesheet('player', 'assets/images/player/vampire_character.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load enemy spritesheets - each type has unique sprite
        // BasicEnemy uses peasant spritesheet: 1024x1024, 4x4 grid = 256x256 per frame
        // Row 0: idle, Row 1: run, Row 2: attack, Row 3: death
        this.load.spritesheet('basic-enemy', 'assets/images/enemies/basic/peasant-animation.png', {
            frameWidth: 256,
            frameHeight: 256
        });
        // BasicEnemy walk animation: 1024x1024, 4x4 grid = 256x256 per frame (16 frames)
        // Row 0: DOWN, Row 1: LEFT, Row 2: UP, Row 3: RIGHT
        this.load.spritesheet('basic-enemy-walk', 'assets/images/enemies/basic/peasant-walk-16.png', {
            frameWidth: 256,
            frameHeight: 256
        });
        this.load.spritesheet('fast-swarmer', 'assets/images/enemies/swarmer/crow-all.png', {
            frameWidth: 48,
            frameHeight: 48
        });
        this.load.spritesheet('vampire-hunter', 'assets/images/enemies/hunter/paladin.png', {
            frameWidth: 128,
            frameHeight: 96
        });
        this.load.spritesheet('tanky-brute', 'assets/images/enemies/brute/Sword_Walk_full.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        // Wizard: 384x64 image, 6 frames = 64x64 each (image height is 64, width per frame is 64)
        this.load.spritesheet('silver-mage', 'assets/images/enemies/mage/wizzard-Run-Sheet.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        this.load.spritesheet('holy-priest', 'assets/images/enemies/priest/heroine_attack.png', {
            frameWidth: 128,
            frameHeight: 64
        });
        this.load.spritesheet('vampire-scout', 'assets/images/enemies/scout/hero-walk-front.png', {
            frameWidth: 32,
            frameHeight: 32
        });
        this.load.spritesheet('church-paladin', 'assets/images/enemies/boss/paladin.png', {
            frameWidth: 128,
            frameHeight: 96
        });

        // Load projectile sprites (simple colored shapes for now)
        this.load.image('projectile-player', 'assets/images/projectile.png');
        this.load.image('projectile-enemy', 'assets/images/projectile.png');

        // Load drop sprites
        this.load.image('drop', 'assets/images/drop.png');

        // Load background tile
        this.load.image('background-tile', 'assets/images/background.jpeg');
    }

    createFallbackTextures() {
        // Create fallback textures using graphics
        // These will be used since we don't have image assets

        // Player fallback (purple - matches original vampire CSS)
        if (!this.textures.exists('player-fallback')) {
            const playerGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            playerGraphics.fillStyle(0x800080, 1); // Purple like original
            playerGraphics.fillRoundedRect(0, 0, 30, 40, 8);
            playerGraphics.generateTexture('player-fallback', 30, 40);
            playerGraphics.destroy();
            console.log('Created player-fallback texture');
        }

        // Enemy fallback (white square - will be tinted per type)
        if (!this.textures.exists('enemy-fallback')) {
            const enemyGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            enemyGraphics.fillStyle(0xffffff, 1); // White, will be tinted
            enemyGraphics.fillRoundedRect(0, 0, 32, 32, 4);
            enemyGraphics.generateTexture('enemy-fallback', 32, 32);
            enemyGraphics.destroy();
            console.log('Created enemy-fallback texture');
        }

        // Projectile fallback (white circle - will be tinted)
        if (!this.textures.exists('projectile-fallback')) {
            const projGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            projGraphics.fillStyle(0xffffff, 1);
            projGraphics.fillCircle(8, 8, 8);
            projGraphics.generateTexture('projectile-fallback', 16, 16);
            projGraphics.destroy();
            console.log('Created projectile-fallback texture');
        }

        // Blood particle (red circle)
        if (!this.textures.exists('blood-particle')) {
            const bloodGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            bloodGraphics.fillStyle(0xff0000, 1);
            bloodGraphics.fillCircle(4, 4, 4);
            bloodGraphics.generateTexture('blood-particle', 8, 8);
            bloodGraphics.destroy();
        }

        // Nova particle (red ring)
        if (!this.textures.exists('nova-particle')) {
            const novaGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            novaGraphics.lineStyle(3, 0xff0000, 1);
            novaGraphics.strokeCircle(16, 16, 14);
            novaGraphics.generateTexture('nova-particle', 32, 32);
            novaGraphics.destroy();
        }

        // Shadow trail particle (purple circle)
        if (!this.textures.exists('shadow-particle')) {
            const shadowGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            shadowGraphics.fillStyle(0x800080, 1);
            shadowGraphics.fillCircle(8, 8, 8);
            shadowGraphics.generateTexture('shadow-particle', 16, 16);
            shadowGraphics.destroy();
        }

        // Shield particle (purple circle)
        if (!this.textures.exists('shield-particle')) {
            const shieldGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            shieldGraphics.fillStyle(0x8a2be2, 1);
            shieldGraphics.fillCircle(4, 4, 4);
            shieldGraphics.generateTexture('shield-particle', 8, 8);
            shieldGraphics.destroy();
        }

        // Bat fallback (purple bat shape)
        if (!this.textures.exists('bat-fallback')) {
            const batGraphics = this.make.graphics({ x: 0, y: 0, add: false });
            batGraphics.fillStyle(0x800080, 1);
            // Draw bat-like shape (body + wings)
            batGraphics.fillEllipse(10, 5, 8, 6); // Body
            batGraphics.fillTriangle(0, 3, 6, 5, 3, 8); // Left wing
            batGraphics.fillTriangle(20, 3, 14, 5, 17, 8); // Right wing
            batGraphics.generateTexture('bat-fallback', 20, 10);
            batGraphics.destroy();
        }

        console.log('All fallback textures created');
    }

    setupEnemyAnimations() {
        // BasicEnemy - 16-frame walk spritesheet (4x4 grid, 128x128 frames)
        // Row 0: DOWN, Row 1: RIGHT, Row 2: UP, Row 3: LEFT (first 2 frames only)
        if (this.textures.exists('basic-enemy-walk')) {
            // DOWN - front-facing (row 0, frames 0-3)
            this.anims.create({
                key: 'basic-enemy-walk-down',
                frames: this.anims.generateFrameNumbers('basic-enemy-walk', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
            // RIGHT - side walking right (row 1, frames 4-7)
            this.anims.create({
                key: 'basic-enemy-walk-right',
                frames: this.anims.generateFrameNumbers('basic-enemy-walk', { start: 4, end: 7 }),
                frameRate: 8,
                repeat: -1
            });
            // UP - back-facing (row 2, frames 8-11)
            this.anims.create({
                key: 'basic-enemy-walk-up',
                frames: this.anims.generateFrameNumbers('basic-enemy-walk', { start: 8, end: 11 }),
                frameRate: 8,
                repeat: -1
            });
            // LEFT - side walking left (row 3, frames 12-13 only - only 2 left-facing frames exist)
            this.anims.create({
                key: 'basic-enemy-walk-left',
                frames: this.anims.generateFrameNumbers('basic-enemy-walk', { start: 12, end: 13 }),
                frameRate: 8,
                repeat: -1
            });
            // IDLE - use first down frames
            this.anims.create({
                key: 'basic-enemy-idle',
                frames: this.anims.generateFrameNumbers('basic-enemy-walk', { start: 0, end: 1 }),
                frameRate: 4,
                repeat: -1
            });
        }

        // FastSwarmer - crow flying (3x3 grid = 9 frames)
        if (this.textures.exists('fast-swarmer')) {
            this.anims.create({
                key: 'swarmer-fly',
                frames: this.anims.generateFrameNumbers('fast-swarmer', { start: 0, end: 8 }),
                frameRate: 12,
                repeat: -1
            });
        }

        // VampireHunter - paladin idle stance (first row, 4 frames)
        if (this.textures.exists('vampire-hunter')) {
            this.anims.create({
                key: 'hunter-idle',
                frames: this.anims.generateFrameNumbers('vampire-hunter', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }

        // TankyBrute - swordsman walking (6 cols, 4 rows - use first row)
        if (this.textures.exists('tanky-brute')) {
            this.anims.create({
                key: 'brute-walk',
                frames: this.anims.generateFrameNumbers('tanky-brute', { start: 0, end: 5 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // SilverMage - wizard running (6 frames horizontal)
        if (this.textures.exists('silver-mage')) {
            this.anims.create({
                key: 'mage-run',
                frames: this.anims.generateFrameNumbers('silver-mage', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // HolyPriest - heroine attack stance (5 frames)
        if (this.textures.exists('holy-priest')) {
            this.anims.create({
                key: 'priest-attack',
                frames: this.anims.generateFrameNumbers('holy-priest', { start: 0, end: 4 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // VampireScout - hero walking (6 frames)
        if (this.textures.exists('vampire-scout')) {
            this.anims.create({
                key: 'scout-walk',
                frames: this.anims.generateFrameNumbers('vampire-scout', { start: 0, end: 5 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // ChurchPaladin (Boss) - same as hunter but different animation set
        if (this.textures.exists('church-paladin')) {
            this.anims.create({
                key: 'paladin-idle',
                frames: this.anims.generateFrameNumbers('church-paladin', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }

        console.log('Enemy animations created');
    }

    create() {
        // Create fallback textures FIRST (before any sprites)
        this.createFallbackTextures();

        // Setup enemy animations
        this.setupEnemyAnimations();

        // Set world bounds
        this.physics.world.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // Create tiled background
        this.backgroundTile = this.add.tileSprite(
            0, 0,
            CONFIG.WORLD_WIDTH,
            CONFIG.WORLD_HEIGHT,
            'background-tile'
        );
        this.backgroundTile.setOrigin(0, 0);
        this.backgroundTile.setDepth(-1); // Behind everything

        // Draw world border (subtle gray boundary)
        const border = this.add.graphics();
        border.lineStyle(4, 0x444444, 1);
        border.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
        border.setDepth(0);

        // Setup camera bounds
        this.cameras.main.setBounds(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

        // Create player sprite (will be positioned by sync events)
        this.createPlayerSprite();

        // Setup particle emitters
        this.setupParticleEmitters();

        // Subscribe to game events
        this.subscribeToEvents();

        console.log('GameScene ready');
    }

    createPlayerSprite() {
        // Always use fallback texture since we don't have image assets
        this.playerSprite = this.add.sprite(
            CONFIG.WORLD_WIDTH / 2,
            CONFIG.WORLD_HEIGHT / 2,
            'player-fallback'
        );
        this.playerSprite.setDepth(10); // Player on top
        this.playerSprite.setDisplaySize(30, 40); // Match player dimensions from config
        this.playerSprite.setVisible(true);

        // Camera follows player smoothly
        this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);
    }

    setupParticleEmitters() {
        // Blood particle emitter
        this.bloodEmitter = this.add.particles(0, 0, 'blood-particle', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 500,
            gravityY: 100,
            emitting: false
        });
        this.bloodEmitter.setDepth(5);

        // Nova particle emitter (expanding ring)
        this.novaEmitter = this.add.particles(0, 0, 'nova-particle', {
            speed: { min: 100, max: 200 },
            scale: { start: 0.5, end: 2 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            emitting: false
        });
        this.novaEmitter.setDepth(5);

        // Shadow trail particle emitter
        this.shadowEmitter = this.add.particles(0, 0, 'shadow-particle', {
            speed: { min: 10, max: 30 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 300,
            emitting: false
        });
        this.shadowEmitter.setDepth(4);

        // Shield particle emitter
        this.shieldEmitter = this.add.particles(0, 0, 'shield-particle', {
            speed: { min: 30, max: 80 },
            scale: { start: 1, end: 0.3 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 400,
            emitting: false
        });
        this.shieldEmitter.setDepth(5);
    }

    subscribeToEvents() {
        // Subscribe to render sync events
        const unsub1 = GameEvents.on(EVENTS.RENDER_SYNC, (state) => {
            this.syncRenderState(state);
        });
        this.unsubscribers.push(unsub1);

        // Subscribe to particle events
        const unsub2 = GameEvents.on(EVENTS.PARTICLE_EMIT, (data) => {
            this.emitParticles(data);
        });
        this.unsubscribers.push(unsub2);

        // Subscribe to ability visual events
        const unsub3 = GameEvents.on(EVENTS.ABILITY_VISUAL, (data) => {
            this.showAbilityVisual(data);
        });
        this.unsubscribers.push(unsub3);
    }

    /** @param {RenderSyncPayload} state */
    syncRenderState(state) {
        // Sync player
        if (state.player && this.playerSprite) {
            this.playerSprite.x = state.player.x + state.player.width / 2;
            this.playerSprite.y = state.player.y + state.player.height / 2;

            // Make sure sprite is visible and sized correctly
            this.playerSprite.setDisplaySize(state.player.width, state.player.height);
            this.playerSprite.setVisible(true);

            // Invulnerability flash effect
            if (state.player.isInvulnerable) {
                this.playerSprite.alpha = Math.sin(this.time.now * 0.01) * 0.3 + 0.7;
            } else {
                this.playerSprite.alpha = 1;
            }
        }

        // Sync enemies
        this.syncEnemies(state.enemies || []);

        // Sync projectiles
        this.syncProjectiles(state.projectiles || []);

        // Sync drops
        this.syncDrops(state.drops || []);

        // Sync bats (from Bat Swarm ability)
        this.syncBats(state.bats || []);
    }

    /** @param {RenderEnemyState[]} enemies */
    syncEnemies(enemies) {
        const currentIds = new Set();
        let currentBoss = null;

        for (const enemy of enemies) {
            currentIds.add(enemy.id);

            // Check if this enemy is a boss (by type name or large size)
            const isBoss = enemy.type === 'ChurchPaladin' ||
                          enemy.type?.includes('Boss') ||
                          (enemy.width >= 80 && enemy.height >= 80);

            if (isBoss) {
                currentBoss = enemy;
            }

            let sprite = this.enemySprites.get(enemy.id);

            if (!sprite) {
                // Create new sprite for this enemy
                sprite = this.createEnemySprite(enemy, isBoss);
                this.enemySprites.set(enemy.id, sprite);
            }

            // Update position (center the sprite)
            sprite.x = enemy.x + enemy.width / 2;
            sprite.y = enemy.y + enemy.height / 2;

            // Scale is set once during creation, no need to update every frame

            // Handle directional animation switching for BasicEnemy
            if (enemy.type === 'BasicEnemy' && enemy.facingDirection) {
                const targetAnim = `basic-enemy-walk-${enemy.facingDirection}`;
                const currentAnim = sprite.anims.currentAnim?.key;

                // Only switch if animation changed (avoid restart) and animation exists
                if (currentAnim !== targetAnim && this.anims.exists(targetAnim)) {
                    sprite.play(targetAnim);
                }
            }

            // Health-based visual feedback (only when significantly damaged)
            // Only apply damage tint for sprites using fallback textures
            const usesFallback = sprite.getData('usesFallback');
            if (usesFallback && enemy.maxHealth > 0) {
                const healthPercent = enemy.health / enemy.maxHealth;
                if (healthPercent < 0.3) {
                    // Flash red when very low health
                    const flashIntensity = (0.3 - healthPercent) / 0.3;
                    const redTint = Math.floor(255 * (1 - flashIntensity * 0.5));
                    sprite.setTint(Phaser.Display.Color.GetColor(255, redTint, redTint));
                }
                // Don't clear tint - it was set during sprite creation
            }
        }

        // Update boss health bar
        if (currentBoss) {
            this.updateBossHealthBar(currentBoss);
        } else {
            this.hideBossHealthBar();
        }

        // Remove sprites for dead enemies
        for (const [id, sprite] of this.enemySprites) {
            if (!currentIds.has(id)) {
                sprite.destroy();
                this.enemySprites.delete(id);
            }
        }
    }

    createEnemySprite(enemy, isBoss = false) {
        // Map enemy types to their specific textures
        const textureMap = {
            'BasicEnemy': 'basic-enemy-walk',  // 64-frame walk spritesheet
            'FastSwarmer': 'fast-swarmer',
            'VampireHunter': 'vampire-hunter',
            'TankyBrute': 'tanky-brute',
            'SilverMage': 'silver-mage',
            'HolyPriest': 'holy-priest',
            'VampireScout': 'vampire-scout',
            'ChurchPaladin': 'church-paladin'
        };

        // Map enemy types to their animations
        const animationMap = {
            'BasicEnemy': 'basic-enemy-walk-down',  // Default to facing down
            'FastSwarmer': 'swarmer-fly',
            'VampireHunter': 'hunter-idle',
            'TankyBrute': 'brute-walk',
            'SilverMage': 'mage-run',
            'HolyPriest': 'priest-attack',
            'VampireScout': 'scout-walk',
            'ChurchPaladin': 'paladin-idle'
        };

        // Frame dimensions and actual visible character sizes
        // charW/charH = approximate size of visible character within the frame
        const frameSizes = {
            'BasicEnemy': { w: 256, h: 256, charW: 180, charH: 220 },  // Peasant with pitchfork (256x256 frames)
            'FastSwarmer': { w: 48, h: 48, charW: 40, charH: 35 },    // Crow
            'VampireHunter': { w: 128, h: 96, charW: 35, charH: 50 }, // Small char in large frame
            'TankyBrute': { w: 64, h: 64, charW: 50, charH: 55 },     // Swordsman
            'SilverMage': { w: 64, h: 64, charW: 45, charH: 55 },     // Wizard
            'HolyPriest': { w: 128, h: 64, charW: 40, charH: 55 },    // Heroine attack
            'VampireScout': { w: 32, h: 32, charW: 24, charH: 28 },   // Small hero
            'ChurchPaladin': { w: 128, h: 96, charW: 35, charH: 50 }  // Boss paladin
        };

        // Get texture key, fall back to 'enemy-fallback' if texture doesn't exist
        let textureKey = textureMap[enemy.type] || 'basic-enemy';
        const textureExists = this.textures.exists(textureKey);
        const usesFallback = !textureExists;

        // Debug: Log which texture is being used
        console.log(`Enemy ${enemy.type}: texture=${textureKey}, exists=${textureExists}, usesFallback=${usesFallback}`);

        if (usesFallback) {
            textureKey = 'enemy-fallback';
        }

        const sprite = this.add.sprite(
            enemy.x + enemy.width / 2,
            enemy.y + enemy.height / 2,
            textureKey
        );

        // Start invisible to prevent frame 0 flash before animation starts
        sprite.setVisible(false);

        // Calculate proper scale to make visible character 2x the collision size
        let scale = 1.0;
        if (usesFallback) {
            // Fallback textures: use displaySize directly (they're simple shapes)
            sprite.setDisplaySize(enemy.width * 2, enemy.height * 2);
        } else {
            // For real sprites: scale based on frame size to achieve 2x visibility
            const frameInfo = frameSizes[enemy.type] || { w: 32, h: 32, charW: 28, charH: 28 };
            // Target: visible character should be 2x the enemy's collision size
            const targetSize = Math.max(enemy.width, enemy.height) * 2;
            // Scale factor: how much to scale the frame so visible char = targetSize
            scale = targetSize / Math.min(frameInfo.charW, frameInfo.charH);
            sprite.setScale(scale);
        }

        sprite.setDepth(isBoss ? 7 : 5); // Bosses render above regular enemies

        // Store data for later use in syncEnemies and texture updates
        sprite.setData('spriteScale', scale);
        sprite.setData('usesFallback', usesFallback);
        sprite.setData('enemyType', enemy.type);
        sprite.setData('isBoss', isBoss);

        // Play animation if available
        const animKey = animationMap[enemy.type];
        if (animKey && this.anims.exists(animKey)) {
            sprite.play(animKey);
        }

        // Make sprite visible AFTER animation is set up (prevents frame 0 flash)
        sprite.setVisible(true);

        // Only apply tint for boss (gold glow) or if using fallback texture
        if (isBoss) {
            sprite.setTint(0xffd700); // Gold tint for boss
        } else if (usesFallback) {
            // Fallback tinting for enemies without proper sprites
            const tintMap = {
                'BasicEnemy': 0xcc0000,
                'FastSwarmer': 0x00cc00,
                'VampireHunter': 0xa05000,
                'TankyBrute': 0x6a0dad,
                'SilverMage': 0xc0c0c0,
                'HolyPriest': 0xffff00,
                'VampireScout': 0x00ffff,
                'ChurchPaladin': 0xffd700
            };
            sprite.setTint(tintMap[enemy.type] || 0xcc0000);
        }

        // Add glow effect for bosses
        if (isBoss) {
            // Create a subtle pulsing effect
            this.tweens.add({
                targets: sprite,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        return sprite;
    }

    updateSpriteTexture(sprite, enemyType) {
        // Map enemy types to their specific textures
        const textureMap = {
            'BasicEnemy': 'basic-enemy-walk',  // 64-frame walk spritesheet
            'FastSwarmer': 'fast-swarmer',
            'VampireHunter': 'vampire-hunter',
            'TankyBrute': 'tanky-brute',
            'SilverMage': 'silver-mage',
            'HolyPriest': 'holy-priest',
            'VampireScout': 'vampire-scout',
            'ChurchPaladin': 'church-paladin'
        };

        // Map enemy types to their animations
        const animationMap = {
            'BasicEnemy': 'basic-enemy-walk-down',  // Default to facing down
            'FastSwarmer': 'swarmer-fly',
            'VampireHunter': 'hunter-idle',
            'TankyBrute': 'brute-walk',
            'SilverMage': 'mage-run',
            'HolyPriest': 'priest-attack',
            'VampireScout': 'scout-walk',
            'ChurchPaladin': 'paladin-idle'
        };

        // Frame dimensions and actual visible character sizes
        const frameSizes = {
            'BasicEnemy': { w: 256, h: 256, charW: 180, charH: 220 },  // Peasant (256x256 frames)
            'FastSwarmer': { w: 48, h: 48, charW: 40, charH: 35 },
            'VampireHunter': { w: 128, h: 96, charW: 35, charH: 50 },
            'TankyBrute': { w: 64, h: 64, charW: 50, charH: 55 },
            'SilverMage': { w: 64, h: 64, charW: 45, charH: 55 },
            'HolyPriest': { w: 128, h: 64, charW: 40, charH: 55 },
            'VampireScout': { w: 32, h: 32, charW: 24, charH: 28 },
            'ChurchPaladin': { w: 128, h: 96, charW: 35, charH: 50 }
        };

        const textureKey = textureMap[enemyType] || 'basic-enemy';
        const textureExists = this.textures.exists(textureKey);

        if (textureExists) {
            // Update to proper texture
            sprite.setTexture(textureKey);
            sprite.setData('usesFallback', false);

            // Recalculate scale for the new texture
            const frameInfo = frameSizes[enemyType] || { w: 32, h: 32, charW: 28, charH: 28 };
            // Use stored enemy dimensions or estimate from current display size
            const currentScale = sprite.getData('spriteScale') || 1.0;
            const estimatedEnemySize = 25; // Most enemies are 25x25
            const targetSize = estimatedEnemySize * 2;
            const scale = targetSize / Math.min(frameInfo.charW, frameInfo.charH);
            sprite.setScale(scale);
            sprite.setData('spriteScale', scale);

            // Start animation
            const animKey = animationMap[enemyType];
            if (animKey && this.anims.exists(animKey)) {
                sprite.play(animKey);
            }

            // Clear fallback tint (unless it's a boss)
            const isBoss = sprite.getData('isBoss');
            if (!isBoss) {
                sprite.clearTint();
            }

            console.log(`Updated sprite for ${enemyType} to use proper texture`);
        }
    }

    syncProjectiles(projectiles) {
        const currentIds = new Set();

        for (const proj of projectiles) {
            currentIds.add(proj.id);

            let sprite = this.projectileSprites.get(proj.id);

            if (!sprite) {
                // Create new sprite
                const textureKey = proj.isEnemyProjectile ? 'projectile-enemy' : 'projectile-player';
                const finalTexture = this.textures.exists(textureKey) ? textureKey : 'projectile-fallback';

                sprite = this.add.sprite(proj.x, proj.y, finalTexture);
                sprite.setDisplaySize(proj.width || 10, proj.height || 10);
                sprite.setDepth(8);

                // Color based on type
                if (proj.isBloodLance) {
                    sprite.setTint(0x8b0000); // Dark red for blood lance
                } else if (proj.isEnemyProjectile) {
                    sprite.setTint(0xffff00); // Yellow for enemy projectiles
                } else {
                    sprite.setTint(0xff4444); // Red for player projectiles
                }

                this.projectileSprites.set(proj.id, sprite);
            }

            // Update position
            sprite.x = proj.x + (proj.width || 10) / 2;
            sprite.y = proj.y + (proj.height || 10) / 2;
        }

        // Remove sprites for destroyed projectiles
        for (const [id, sprite] of this.projectileSprites) {
            if (!currentIds.has(id)) {
                sprite.destroy();
                this.projectileSprites.delete(id);
            }
        }
    }

    syncDrops(drops) {
        const currentIds = new Set();

        for (const drop of drops) {
            currentIds.add(drop.id);

            let sprite = this.dropSprites.get(drop.id);

            if (!sprite) {
                // Create new sprite for drop
                sprite = this.add.sprite(drop.x, drop.y, 'projectile-fallback'); // Reuse fallback
                sprite.setTint(0x00ffff); // Cyan for drops
                sprite.setDisplaySize(20, 20);
                sprite.setDepth(4);

                // Add floating animation
                this.tweens.add({
                    targets: sprite,
                    y: drop.y - 5,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.dropSprites.set(drop.id, sprite);
            }

            // Update base position (tween handles the float)
            sprite.setData('baseY', drop.y);
        }

        // Remove sprites for collected drops
        for (const [id, sprite] of this.dropSprites) {
            if (!currentIds.has(id)) {
                this.tweens.killTweensOf(sprite);
                sprite.destroy();
                this.dropSprites.delete(id);
            }
        }
    }

    syncBats(bats) {
        const currentIds = new Set();

        for (const bat of bats) {
            currentIds.add(bat.id);

            let sprite = this.batSprites.get(bat.id);

            if (!sprite) {
                // Create new bat sprite
                sprite = this.add.sprite(bat.x, bat.y, 'bat-fallback');
                sprite.setDisplaySize(20, 10);
                sprite.setDepth(9); // Above most entities
                sprite.setTint(0x800080); // Purple
                this.batSprites.set(bat.id, sprite);
            }

            // Update position and rotation
            sprite.x = bat.x;
            sprite.y = bat.y;
            sprite.rotation = bat.angle;
        }

        // Remove sprites for bats that no longer exist
        for (const [id, sprite] of this.batSprites) {
            if (!currentIds.has(id)) {
                sprite.destroy();
                this.batSprites.delete(id);
            }
        }
    }

    /** @param {ParticleEmitPayload} data */
    emitParticles(data) {
        if (!data) return;

        switch (data.type) {
            case 'blood':
                if (this.bloodEmitter) {
                    this.bloodEmitter.emitParticleAt(data.x, data.y, data.count || 5);
                }
                break;
            case 'nova':
            case 'bloodNova':
                if (this.novaEmitter) {
                    this.novaEmitter.emitParticleAt(data.x, data.y, 1);
                }
                break;
            case 'shadowTrail':
                if (this.shadowEmitter) {
                    this.shadowEmitter.emitParticleAt(data.x, data.y, 3);
                }
                break;
            case 'shield':
                if (this.shieldEmitter) {
                    this.shieldEmitter.emitParticleAt(data.x, data.y, data.count || 5);
                }
                break;
            default:
                // Default to blood particles
                if (this.bloodEmitter) {
                    this.bloodEmitter.emitParticleAt(data.x, data.y, data.count || 3);
                }
        }
    }

    showAbilityVisual(data) {
        // Handle ability visual effects
        if (!data) return;

        switch (data.type) {
            case 'blood-drain':
                this.showBloodDrainCircle(data.x, data.y, data.range);
                break;
            case 'blood-drain-end':
                this.hideBloodDrainCircle();
                break;
            case 'blood-drain-update':
                if (this.bloodDrainCircle) {
                    this.bloodDrainCircle.setPosition(data.x, data.y);
                }
                break;
            case 'shadow-dash-trail':
                // Shadow trail is handled by particle emitter
                if (this.shadowEmitter) {
                    this.shadowEmitter.emitParticleAt(data.x, data.y, 5);
                }
                break;
            case 'night-shield':
                this.showNightShieldCircle(data.x, data.y, data.radius);
                break;
            case 'night-shield-end':
                this.hideNightShieldCircle();
                break;
            case 'night-shield-explosion':
                this.showShieldExplosion(data.x, data.y, data.range);
                break;
            default:
                break;
        }
    }

    showBloodDrainCircle(x, y, range) {
        // Remove existing circle
        if (this.bloodDrainCircle) {
            this.bloodDrainCircle.destroy();
        }

        // Create blood drain AOE circle
        this.bloodDrainCircle = this.add.graphics();
        this.bloodDrainCircle.lineStyle(3, 0x8b0000, 0.8);
        this.bloodDrainCircle.strokeCircle(0, 0, range);
        this.bloodDrainCircle.fillStyle(0x8b0000, 0.15);
        this.bloodDrainCircle.fillCircle(0, 0, range);
        this.bloodDrainCircle.setPosition(x, y);
        this.bloodDrainCircle.setDepth(3);

        // Add pulsing animation
        this.tweens.add({
            targets: this.bloodDrainCircle,
            alpha: { from: 0.8, to: 0.4 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    hideBloodDrainCircle() {
        if (this.bloodDrainCircle) {
            this.tweens.killTweensOf(this.bloodDrainCircle);
            this.bloodDrainCircle.destroy();
            this.bloodDrainCircle = null;
        }
    }

    showNightShieldCircle(x, y, radius) {
        // Remove existing circle
        if (this.nightShieldCircle) {
            this.nightShieldCircle.destroy();
        }

        // Create night shield circle
        this.nightShieldCircle = this.add.graphics();
        this.nightShieldCircle.lineStyle(4, 0x8a2be2, 0.9);
        this.nightShieldCircle.strokeCircle(0, 0, radius || 40);
        this.nightShieldCircle.fillStyle(0x8a2be2, 0.2);
        this.nightShieldCircle.fillCircle(0, 0, radius || 40);
        this.nightShieldCircle.setPosition(x, y);
        this.nightShieldCircle.setDepth(9);

        // Add rotating animation
        this.tweens.add({
            targets: this.nightShieldCircle,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1
        });
    }

    hideNightShieldCircle() {
        if (this.nightShieldCircle) {
            this.tweens.killTweensOf(this.nightShieldCircle);
            this.nightShieldCircle.destroy();
            this.nightShieldCircle = null;
        }
    }

    showShieldExplosion(x, y, range) {
        // Create expanding ring effect
        const explosion = this.add.graphics();
        explosion.lineStyle(5, 0x8a2be2, 1);
        explosion.strokeCircle(0, 0, 10);
        explosion.setPosition(x, y);
        explosion.setDepth(15);

        // Animate explosion expanding
        this.tweens.add({
            targets: explosion,
            scaleX: range / 10,
            scaleY: range / 10,
            alpha: { from: 1, to: 0 },
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                explosion.destroy();
            }
        });

        // Emit particles
        if (this.shieldEmitter) {
            this.shieldEmitter.emitParticleAt(x, y, 20);
        }
    }

    updateBossHealthBar(boss) {
        // Create health bar if it doesn't exist
        if (!this.bossHealthBar) {
            this.createBossHealthBar();
        }

        // Update position (fixed at top of screen)
        const cam = this.cameras.main;
        const barWidth = 400;
        const barX = cam.scrollX + cam.width / 2 - barWidth / 2;
        const barY = cam.scrollY + 20;

        this.bossHealthBar.setPosition(barX, barY);
        this.bossHealthFill.setPosition(barX + 2, barY + 2);
        this.bossNameText.setPosition(cam.scrollX + cam.width / 2, barY + 35);

        // Update health fill width
        const healthPercent = Math.max(0, boss.health / boss.maxHealth);
        this.bossHealthFill.clear();
        this.bossHealthFill.fillStyle(0xff0000, 1);
        this.bossHealthFill.fillRect(0, 0, (barWidth - 4) * healthPercent, 26);

        // Update name text
        this.bossNameText.setText(boss.type || 'BOSS');

        // Show all elements
        this.bossHealthBar.setVisible(true);
        this.bossHealthFill.setVisible(true);
        this.bossNameText.setVisible(true);

        this.currentBossId = boss.id;
    }

    createBossHealthBar() {
        // Background bar
        this.bossHealthBar = this.add.graphics();
        this.bossHealthBar.fillStyle(0x333333, 0.9);
        this.bossHealthBar.fillRoundedRect(0, 0, 400, 30, 5);
        this.bossHealthBar.lineStyle(2, 0xffd700, 1);
        this.bossHealthBar.strokeRoundedRect(0, 0, 400, 30, 5);
        this.bossHealthBar.setDepth(100);
        this.bossHealthBar.setScrollFactor(0);

        // Health fill
        this.bossHealthFill = this.add.graphics();
        this.bossHealthFill.setDepth(101);
        this.bossHealthFill.setScrollFactor(0);

        // Boss name text
        this.bossNameText = this.add.text(0, 0, 'BOSS', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffd700',
            fontStyle: 'bold'
        });
        this.bossNameText.setOrigin(0.5, 0);
        this.bossNameText.setDepth(102);
        this.bossNameText.setScrollFactor(0);
    }

    hideBossHealthBar() {
        if (this.bossHealthBar) {
            this.bossHealthBar.setVisible(false);
        }
        if (this.bossHealthFill) {
            this.bossHealthFill.setVisible(false);
        }
        if (this.bossNameText) {
            this.bossNameText.setVisible(false);
        }
        this.currentBossId = null;
    }

    update(time, delta) {
        // The rendering is driven by events, not the Phaser update loop
        // This can be used for visual effects that need per-frame updates
    }

    shutdown() {
        // Clean up event subscriptions
        for (const unsub of this.unsubscribers) {
            if (typeof unsub === 'function') {
                unsub();
            }
        }
        this.unsubscribers = [];

        // Clear sprite maps
        this.enemySprites.clear();
        this.projectileSprites.clear();
        this.dropSprites.clear();
        this.batSprites.clear();

        // Clean up ability visuals
        this.hideBloodDrainCircle();
        this.hideNightShieldCircle();

        // Clean up boss health bar
        if (this.bossHealthBar) {
            this.bossHealthBar.destroy();
            this.bossHealthBar = null;
        }
        if (this.bossHealthFill) {
            this.bossHealthFill.destroy();
            this.bossHealthFill = null;
        }
        if (this.bossNameText) {
            this.bossNameText.destroy();
            this.bossNameText = null;
        }
    }
}
