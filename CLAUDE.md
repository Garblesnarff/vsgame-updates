# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based vampire survival game built with TypeScript, Phaser 3 (for rendering), and Webpack. Players control a vampire fighting waves of enemies, using abilities, leveling up, and facing boss encounters. The game features a skill tree system, various enemy types with unique behaviors, and a comprehensive entity lifecycle management system.

## Development Commands

### Core Development
- **Start dev server**: `npm run dev` - Launches webpack-dev-server on port 9901 with hot reload
- **Build for production**: `npm run build` - Creates optimized bundle in `dist/`
- **Type checking**: `npm run typecheck` - Run TypeScript compiler without emitting files
- **Watch TypeScript**: `npm run watch:ts` - TypeScript compilation in watch mode

### Testing
- **Run tests**: `npm test` - Runs Jest test suite
- **Watch tests**: `npm run test:watch` - Jest in watch mode for active development
- **Coverage report**: `npm run test:coverage` - Generates test coverage reports

### Code Quality
- **Lint**: `npm run lint` - Check code with ESLint
- **Lint fix**: `npm run lint:fix` - Auto-fix linting issues
- **Generate docs**: `npm run docs` - Creates TypeDoc documentation in `docs/`

### Legacy
- **Simple HTTP server**: `npm start` - Basic http-server on port 3000 (legacy, use `npm run dev` instead)

## Architecture Overview

### Dual-Codebase Structure

The project has **two separate codebases** that work together:

1. **`scripts/`** - Core game logic (TypeScript)
   - Entry point: `scripts/main.ts`
   - Main game class: `scripts/game/game.ts`
   - Business logic, game systems, abilities, entities
   - Compiled by Webpack and served to browser

2. **`client/`** - Phaser 3 rendering layer (JavaScript)
   - Entry point: `client/src/scenes/GameScene.js`
   - Handles all visual rendering, animations, sprites
   - Asset management and visual effects
   - Separate from core game logic

**Key Integration Point**: The `scripts/` logic manages game state, while `client/` consumes that state for rendering. They communicate through shared interfaces and the global game state.

### Core Systems in `scripts/`

#### Entity Lifecycle Management
All game entities extend `BaseEntity` (see `ADVANCED_LIFECYCLE.md` for details):
- **Lifecycle phases**: Creation → `initialize()` → `update(deltaTime)` → `cleanup()`
- **Entity Registry**: Centralized tracking via `EntityRegistry` singleton
- **Type-safe retrieval**: Get entities by type (e.g., `getEntitiesByType(Player)`)
- **Automatic cleanup**: Prevents memory leaks with proper DOM/listener cleanup

#### Object Pooling System
**Critical Performance Optimization** - Eliminates garbage collection pauses during gameplay.

**Files**:
- `scripts/utils/object-pool.ts` - Generic `ObjectPool<T>` implementation
- `scripts/types/types.ts` - `Poolable<T>` interface definition
- `scripts/game/spatial-grid.ts` - Spatial partitioning for collision optimization

**How it Works**:
```typescript
// Poolable interface that entities must implement
interface Poolable<T> {
  init(options: T): void;    // Re-initialize when acquired from pool
  reset(): void;             // Reset to default state when released to pool
}

// Object pool maintains reusable entity instances
class ObjectPool<T extends Poolable<any>> {
  acquire(): T;              // Get entity from pool (reuses or creates new)
  release(obj: T): void;     // Return entity to pool after reset()
  prewarm(count: number);    // Pre-allocate entities at startup
}
```

**Pooled Entities**:
- **Projectiles**: Single pool (`game.projectilePool`) pre-warmed with 100 instances
- **Enemies**: Multiple pools (`game.enemyPools`) by type:
  - `basicEnemy`: 50 instances
  - `vampireHunter`: 10 instances
  - `fastSwarmer`: 20 instances
  - `tankyBrute`: 5 instances
  - `silverMage`, `holyPriest`, `vampireScout`: 5 instances each

**Entity Lifecycle with Pooling**:
1. **Construction** (once): `new Enemy(gameContainer)` - Creates DOM elements
2. **Acquire from pool**: `const enemy = enemyPool.acquire()`
3. **Initialize**: `enemy.init({ playerLevel, config, poolKey })` - Sets properties
4. **Use**: Enemy operates normally with `update(deltaTime)` calls
5. **Release to pool**: `enemyPool.release(enemy)` - Calls `reset()` internally
6. **Reset**: `enemy.reset()` - Clears state, hides DOM elements
7. **Reuse**: Entity stays in pool, ready to be acquired again

**Spatial Grid** (`scripts/game/spatial-grid.ts`):
- Divides world into 100px cells for collision detection optimization
- Reduces collision checks from O(N×M) to O(N) average case
- Rebuilt every frame: `spatialGrid.clear()` → `insert(entity)` → `retrieve(entity)`
- Only checks entities in nearby cells (9 cells max: entity's cell + 8 neighbors)

**Data-Driven Enemy Configuration** (`scripts/config/enemy-configs.ts`):
- Centralized `ENEMY_CONFIGS` object replaces hardcoded stats
- Each config defines: `width`, `height`, `baseHealth`, `baseDamage`, `speed`, `sprite`, `behavior`
- Passed to `enemy.init()` to set stats dynamically
- Easier to balance and modify without changing enemy classes

**Performance Impact**:
- **Before**: GC pause every 5-10 seconds with 50+ entities
- **After**: Zero GC pauses during gameplay (pre-allocated pools)
- **Collision**: 5000 checks → ~500 checks with 100 projectiles × 50 enemies
- **Frame time**: 20-40% improvement with many entities on screen
- **Memory**: Higher base usage (pools) but stable over time

**Important Notes**:
- DOM elements are created once and reused across pool lifecycle
- `tsconfig.json` has `strictPropertyInitialization: false` to support pooling pattern
- Properties set in `init()` don't need to be initialized in constructor
- Always call `pool.release(entity)` instead of `entity.cleanup()` for pooled entities
- **Boss enemies** are NOT pooled yet - they use traditional lifecycle

#### State Management
- **StateStore** (`scripts/game/state-store/`): Centralized reactive state management
  - Observable state containers with subscription capabilities
  - Automatic logging of state changes
  - Used for game-wide state like `availableKillPoints`, player stats, etc.
- **GameStateManager** (`scripts/game/state-manager.ts`): Handles game flow states
  - States: loading, menu, playing, paused, game_over
  - State-specific handlers for enter/exit/update
  - Integrates with UI updates

#### Event System
- **EventEmitter** (`scripts/utils/event-system.ts`): Pub-sub pattern for decoupled communication
- **GameEvents**: Global event emitter instance
- **EVENTS**: Centralized event name constants
- Key events: `GAME_START`, `GAME_OVER`, `PLAYER_LEVEL_UP`, `BOSS_SPAWN`, `BOSS_DEFEATED`, etc.

#### Game Systems
- **GameLoop** (`scripts/game/game-loop.ts`): Manages update cycle with `requestAnimationFrame`
- **SpawnSystem** (`scripts/game/spawn-system.ts`): Enemy spawning with difficulty scaling
- **LevelSystem** (`scripts/game/level-system.ts`): XP and leveling mechanics
- **ParticleSystem** (`scripts/game/particle-system.ts`): Visual particle effects
- **InputHandler** (`scripts/game/input-handler.ts`): Keyboard input management
- **Boss System** (`scripts/game/boss-system-integration.ts`): Boss encounter logic

### Entity Component System (ECS) - Partial Implementation

The `scripts/ecs/` directory contains a **partial ECS implementation**:
- **Components** (`scripts/ecs/components/`): Data containers (e.g., `StatsComponent`)
- **Systems** (`scripts/ecs/systems/`): Logic operating on components (e.g., `StatsSystem`)
- **Status**: Not fully integrated throughout the codebase; mostly traditional OOP is used

### Hierarchical State Machines (HSM)

The `scripts/hsm/` directory is for hierarchical state machines but is currently **minimal/placeholder**. Complex state logic is currently handled through the `GameStateManager` and entity-specific state management.

### DOM Element Management Pattern

**Critical Convention**: Never hardcode DOM selectors!

- **Import constants**: `import { DOM_IDS, CSS_CLASSES, SELECTORS } from "../constants/dom-elements"`
- **Use for IDs**: `document.getElementById(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY)`
- **Use for classes**: `element.className = CSS_CLASSES.PASSIVE_SKILL_MENU.OVERLAY`
- **Selectors helper**: `document.querySelector(SELECTORS.id(DOM_IDS.SKILL.CARD))`
- **Dynamic IDs**: Use functions like `DOM_IDS.SKILL.CARD(skillId)`

**Templates**: Use `Templates` from `scripts/utils/dom-templates.ts` for complex UI elements:
```typescript
import { Templates } from "./utils/dom-templates";
const card = Templates.skillCard({ id, name, description, effects, level, locked });
```

See `DOM_CONSTANTS_README.md` for full details.

### Abilities System

Located in `scripts/abilities/`:
- **Base class**: `ability-base.ts` - All abilities extend `Ability`
- **Manager**: `ability-manager.ts` - Handles ability registration, cooldowns, energy costs
- **Abilities**: `blood-drain.ts`, `bat-swarm.ts`, `shadow-dash.ts`, `blood-lance.ts`, `night-shield.ts`
- Each ability implements: `activate(player, game)`, `update(deltaTime)`, cooldown tracking

### Enemy System

Located in `scripts/entities/enemies/`:
- **Base class**: `base-enemy.ts` extends `BaseEntity`
- **Enemy types**: `BasicEnemy`, `VampireHunter`, `FastSwarmer`, `SilverMage`, `HolyPriest`, `TankyBrute`, `VampireScout`
- **Boss system**: `scripts/entities/bosses/` - Boss-specific logic
  - `base-boss.ts` - Boss base class
  - `church-paladin.ts` - Example boss implementation
- **Spawn progression**: Enemies unlock at specific player levels (see README.md)

### UI System

Located in `scripts/ui/`:
- **UIManager** (`ui-manager.ts`): Main UI orchestrator
- **PassiveSkillMenu** (`PassiveSkillMenu.ts`): Skill tree interface
- **AbilityBar** (`ability-bar.ts`): Ability cooldown display
- **StatsDisplay** (`stats-display.ts`): Player health/energy bars
- **Screens** (`screens.ts`): Game over, level up screens

### Utilities

Located in `scripts/utils/`:
- **logger.ts**: Centralized logging with log levels (DEBUG, INFO, WARN, ERROR)
- **error-handler.ts**: Structured error handling with categories and severity
- **event-system.ts**: EventEmitter implementation
- **persistence.ts**: LocalStorage management for save data
- **asset-manager.ts**: Asset loading/caching
- **collision.ts**: Collision detection helpers
- **math.ts**: Math utilities
- **dom.ts**: DOM manipulation helpers
- **dom-templates.ts**: Reusable DOM template creation

### Phaser 3 Client (`client/src/`)

The Phaser rendering layer handles visuals:
- **GameScene** (`scenes/GameScene.js`): Main Phaser scene
- **Managers** (`scenes/managers/`):
  - `MapManager.js` - Tilemap/world rendering
  - `EnemyManager.js` - Enemy sprite management
  - `ProjectileManager.js` - Projectile rendering
  - `AbilityVisualManager.js` - Ability effects
  - `CollisionManager.js` - Phaser collision handling
- **Systems** (`scenes/systems/`):
  - `CameraSystem.js` - Camera following/smoothing
  - `AudioSystem.js` - Sound effects and music
  - `InputSystem.js` - Phaser input integration
- **Effects** (`scenes/effects/`):
  - `VisualEffects.js` - General visual effects
  - `ParticleEffects.js` - Phaser particle systems
  - `AnimationEffects.js` - Sprite animations

### Assets

Located in `client/assets/`:
- **Images**: `client/assets/images/` - Spritesheets and textures
  - `player/vampire_character.png` - Player sprite
  - `enemies/basic/basic_character_sheet.png` - Enemy sprites
- **Sounds**: `client/assets/sounds/` - Audio files (placeholder)
- **Fonts**: `client/assets/fonts/` - Custom fonts (placeholder)

## Key Files and Entry Points

- **Main entry**: `scripts/main.ts` - Initializes game, sets up error handling, starts `Game`
- **Game core**: `scripts/game/game.ts` - Main `Game` class, orchestrates all systems
- **Config**: `scripts/config.ts` - Game configuration constants
- **HTML template**: `index.html` - Base HTML structure with stat displays, overlays
- **Webpack config**: `webpack.config.js` - Build configuration
- **TypeScript config**: `tsconfig.json` - TypeScript compiler settings

## TypeScript Configuration

- **Target**: ES2020
- **Module**: ESNext with bundler resolution
- **Strict mode**: Enabled with all strict flags
- **Output**: `dist/` directory
- **Source maps**: Enabled for debugging
- **Lib**: ES2020, DOM, DOM.Iterable

## Testing Infrastructure

- **Framework**: Jest with ts-jest and jsdom
- **Test location**: Tests should be in `scripts/**/__tests__/` or `*.test.ts` files
- **Coverage**: Configured to collect from `scripts/**/*.{js,ts}` (excluding tests)
- **Setup**: `jest.setup.js` for test environment configuration

## Code Quality Standards

### ESLint Configuration
- **Extends**: `eslint:recommended`, `@typescript-eslint/recommended`, `prettier`
- **Key rules**:
  - No `console.log` (use `logger` instead)
  - Prefer `const` over `let`
  - No `var` keyword
  - Strict equality (`===`)
  - Unused vars must start with `_`
- **TypeScript rules**: `@typescript-eslint/no-explicit-any` is a warning (not error)

### Logging Convention
**Always use the logger instead of `console.log`**:
```typescript
import { createLogger, LogLevel } from "./utils/logger";
const logger = createLogger('ModuleName');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Error Handling Convention
Use structured error handling:
```typescript
import { handleError, createError, ErrorCategory, ErrorSeverity } from "./utils/error-handler";

handleError(
  createError('Error message', {
    severity: ErrorSeverity.HIGH,
    category: ErrorCategory.GAME_STATE,
    module: 'ModuleName',
    recoverable: false,
    context: { additionalInfo: 'value' }
  })
);
```

## Important Patterns and Conventions

### Entity Creation Pattern (with Object Pooling)

**For Pooled Entities (Enemies, Projectiles)**:
```typescript
// Acquire from pool
const pool = game.enemyPools.get('basicEnemy');
const enemy = pool.acquire();

// Initialize with options
enemy.init({
  playerLevel: game.player.level,
  config: ENEMY_CONFIGS.basicEnemy,
  poolKey: 'basicEnemy'
});

// Add to game arrays
game.enemies.push(enemy);
game.spatialGrid.insert(enemy);

// ... entity lives and updates ...

// Release back to pool (instead of cleanup)
pool.release(enemy);
game.enemies.splice(index, 1);
```

**For Non-Pooled Entities (Player, Drops, Particles)**:
1. Create entity instance: `const entity = new Entity(gameContainer)`
2. Call `initialize()` explicitly
3. Entity automatically registers with `EntityRegistry`
4. Game loop calls `update(deltaTime)` each frame
5. Call `cleanup()` when removing entity
6. Remove from game arrays: `game.drops.splice(index, 1)`

**Important**: Never call `cleanup()` on pooled entities - always use `pool.release(entity)` instead!

### State Store Usage
For reactive game state:
```typescript
import stateStore from "./game/state-store";

// Read state
const killPoints = stateStore.game.availableKillPoints.get();

// Update state (triggers subscribers)
stateStore.game.availableKillPoints.set(newValue);

// Subscribe to changes
const unsubscribe = stateStore.game.availableKillPoints.subscribe(
  'uniqueKey',
  (newValue, oldValue) => { /* react to change */ }
);
```

### Event System Usage
```typescript
import { GameEvents, EVENTS } from "./utils/event-system";

// Emit event
GameEvents.emit(EVENTS.PLAYER_LEVEL_UP, playerLevel);

// Subscribe to event
const unsubscribe = GameEvents.on(EVENTS.PLAYER_LEVEL_UP, (level) => {
  // Handle event
});

// Unsubscribe when done
unsubscribe();
```

### Webpack Integration
- **Entry**: `scripts/main.ts`
- **Output**: `dist/js/[name].[contenthash].js`
- **Dev server**: Port 9901, hot reload enabled
- **CSS**: Loaded via `style-loader` and `css-loader`
- **Assets**: Images, sounds, fonts handled via asset modules

## Directory-Specific READMEs

Many directories contain their own README.md files with detailed information:
- `scripts/README.md` - Scripts directory overview
- `scripts/abilities/README.md` - Abilities system details
- `scripts/ecs/README.md` - ECS architecture
- `scripts/entities/README.md` - Entity system and lifecycle
- `scripts/hsm/README.md` - State machine info
- `scripts/ui/README.md` - UI components
- `scripts/utils/README.md` - Utility functions
- `client/README.md` - Client/Phaser layer
- `DIRECTORY_RULES.md` - Guidelines for directory README structure

## Special Documentation Files

- **ADVANCED_LIFECYCLE.md**: Comprehensive guide to entity lifecycle management and the Entity Registry system
- **DOM_CONSTANTS_README.md**: Full guide to DOM element constant usage and templates
- **DIRECTORY_RULES.md**: Template and guidelines for creating directory READMEs

## Common Development Workflows

### Adding a New Enemy Type
1. **Create enemy config** in `scripts/config/enemy-configs.ts`:
   ```typescript
   myNewEnemy: {
     width: 30, height: 30,
     baseHealth: 50, baseDamage: 5,
     speed: 1.0, sprite: 'new-enemy'
   }
   ```

2. **Create enemy class** in `scripts/entities/enemies/new-enemy.ts`:
   - Extend `base-enemy.ts`
   - Constructor should only take `gameContainer` (no playerLevel)
   - Initialize DOM elements and default properties in constructor
   - Override `init(options: EnemyOptions)` if needed for custom initialization
   - Override `reset()` if you have custom cleanup (call `super.reset()` first)
   - Override `update(deltaTime)` for custom behavior

3. **Add to exports** in `scripts/entities/enemies/index.ts`

4. **Register in object pool** in `scripts/game/game.ts` constructor:
   ```typescript
   { key: 'myNewEnemy', type: MyNewEnemy, prewarm: 10 }
   ```

5. **Update spawn system** in `scripts/game/spawn-system.ts`:
   - Add spawn method using pool: `pool.get('myNewEnemy').acquire()`
   - Add to spawn weight/probability logic

6. **Add Phaser rendering** in `client/src/scenes/managers/EnemyManager.js`

7. **Add assets** to `client/assets/images/enemies/`

### Adding a New Ability
1. Create new file in `scripts/abilities/` extending `ability-base.ts`
2. Implement `activate(player, game)` method
3. Define `config` with cooldown, energyCost, icon, keybind
4. Register in `ability-manager.ts`
5. Add UI icon/styling in `styles/abilities.css`
6. Add visual effects in `client/src/scenes/managers/AbilityVisualManager.js`

### Adding a New UI Component
1. Create class in `scripts/ui/` with proper DOM element management
2. Use `DOM_IDS` and `CSS_CLASSES` constants from `scripts/constants/dom-elements.ts`
3. Prefer `Templates` from `scripts/utils/dom-templates.ts` for complex UI
4. Add styling in appropriate `styles/*.css` file
5. Integrate with `UIManager` if needed
6. Subscribe to relevant events via `GameEvents`

### Debugging
- **Development mode**: Game instance exposed as `window.vampireGame`
- **Logging**: Adjust log level via `setLogLevel(LogLevel.DEBUG)` in `scripts/main.ts`
- **Source maps**: Enabled in both dev and production builds
- **Entity tracking**: Use `EntityRegistry.getInstance().getAll()` to inspect entities
- **State inspection**: Access `stateStore` to view current game state

## Browser Compatibility

The game checks for:
- `requestAnimationFrame` support
- `localStorage` availability (for save data)
- `addEventListener` support

Warnings are shown if localStorage is unavailable (game progress won't save).

## Production vs Development

- **Development** (`npm run dev`):
  - Log level: DEBUG (all logs)
  - Source maps: `eval-source-map` (fast)
  - Game instance on `window.vampireGame`
  - Hot module reloading

- **Production** (`npm run build`):
  - Log level: ERROR (errors only)
  - Source maps: `source-map` (separate files)
  - Minified HTML/CSS/JS
  - Code splitting for vendors
  - No debug globals

## Known Architecture Notes

1. **Partial ECS**: The project has ECS components/systems but doesn't fully use ECS throughout. Most code is traditional OOP with classes.

2. **Dual Codebases**: `scripts/` (logic) and `client/` (rendering) are separate. This separation allows business logic to be independent of rendering concerns.

3. **Boss System Integration**: Boss system has multiple integration files (`boss-system.ts`, `boss-system-integration.ts`, `boss-system-fix.ts`) indicating iterative development. The main integration point is `boss-system-integration.ts`.

4. **State Management Hybrid**: Uses both `StateStore` (reactive) and `GameStateManager` (state machine). `StateStore` is for reactive data, `GameStateManager` is for game flow states.

5. **Entity Registry**: Provides centralized entity tracking but adoption may be partial. Some entities may be tracked only in game arrays (`game.enemies`, `game.projectiles`).
