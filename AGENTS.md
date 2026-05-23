# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Browser-based vampire survival game built with TypeScript, Phaser 3 (rendering), and Webpack. Players control a vampire fighting waves of enemies, using abilities, leveling up, and facing boss encounters.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:9901 (hot reload)
npm run build        # Production build to dist/
npm run typecheck    # TypeScript type checking

# Testing
npm test                           # Run all tests
npm test -- path/to/file.test.ts   # Run single test file
npm run test:watch                 # Watch mode
npm run test:coverage              # Coverage report

# Code Quality
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
```

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

## Key Files and Entry Points

- **Main entry**: `scripts/main.ts` - Initializes game, starts `Game`
- **Game core**: `scripts/game/game.ts` - Main `Game` class, orchestrates all systems
- **Config**: `scripts/config.ts` - Game configuration constants
- **Enemy configs**: `scripts/config/enemy-configs.ts` - Data-driven enemy stats

## Code Quality Standards

### Logging Convention
**Always use the logger instead of `console.log`** (ESLint enforces this):
```typescript
import { createLogger } from "./utils/logger";
const logger = createLogger('ModuleName');
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

## Important Patterns and Conventions

### Pooled vs Non-Pooled Entity Lifecycle

**For Pooled Entities (Enemies, Projectiles)** - Use `pool.release()` not `cleanup()`:
```typescript
const enemy = game.enemyPools.get('basicEnemy').acquire();
enemy.init({ playerLevel, config: ENEMY_CONFIGS.basicEnemy, poolKey: 'basicEnemy' });
// ... later ...
game.enemyPools.get('basicEnemy').release(enemy);  // NOT enemy.cleanup()
```

**For Non-Pooled Entities (Player, Drops)** - Use standard lifecycle:
```typescript
const entity = new Entity(gameContainer);
entity.initialize();
// ... later ...
entity.cleanup();
```

### State Store Usage
```typescript
import stateStore from "./game/state-store";
const killPoints = stateStore.game.availableKillPoints.get();
stateStore.game.availableKillPoints.set(newValue);
const unsubscribe = stateStore.game.availableKillPoints.subscribe('key', (newVal) => { });
```

### Event System Usage
```typescript
import { GameEvents, EVENTS } from "./utils/event-system";
GameEvents.emit(EVENTS.PLAYER_LEVEL_UP, playerLevel);
const unsubscribe = GameEvents.on(EVENTS.PLAYER_LEVEL_UP, (level) => { });
```

## Task Management with Beads

This project uses [Beads](https://github.com/steveyegge/beads) for AI-agent-friendly issue tracking. Beads provides persistent memory across sessions via a git-backed issue database.

### Quick Reference

```bash
# View ready work (no blockers)
bd ready                    # Human-readable
bd ready --json             # For programmatic use

# Issue lifecycle
bd create "Fix collision detection bug"   # Create issue
bd update bd-a1b2 --status in_progress    # Start work
bd close bd-a1b2 --reason "Fixed in commit abc123"  # Complete

# Exploration
bd list                     # All issues
bd show bd-a1b2             # Issue details
bd dep tree bd-a1b2         # Dependency graph
```

### Session Workflow

**Start of session**:
```bash
bd ready                    # See what's ready to work on
```

**During work**: Create issues for newly discovered tasks:
```bash
bd create "Refactor enemy spawn system"
bd dep add bd-new bd-current --type discovered-from
```

**End of session**:
1. File issues for remaining/discovered work
2. Close completed issues with clear reasons
3. Run `bd sync` to ensure state is saved

### Issue IDs

Beads uses hash-based IDs: `bd-a1b2`, `bd-f14c`. Child issues use dot notation: `bd-a3f8e9.1`.

### Dependency Types

- **blocks**: Issue A must complete before B
- **parent-child**: Hierarchical task breakdown
- **discovered-from**: Work found during another task
- **related**: Connected but independent

### Key Files

- `.beads/beads.jsonl` - Issue database (committed to git)
- `.beads/beads.db` - Local SQLite cache (gitignored)

## Common Development Workflows

### Adding a New Enemy Type
1. Add config in `scripts/config/enemy-configs.ts`
2. Create class in `scripts/entities/enemies/` extending `base-enemy.ts`
   - Constructor takes only `gameContainer`
   - Override `init()`, `reset()`, `update()` as needed
3. Export in `scripts/entities/enemies/index.ts`
4. Register pool in `scripts/game/game.ts` constructor
5. Add to spawn logic in `scripts/game/spawn-system.ts`
6. Add Phaser rendering in `client/src/scenes/managers/EnemyManager.js`

### Adding a New Ability
1. Create class in `scripts/abilities/` extending `ability-base.ts`
2. Implement `activate(player, game)` with cooldown, energyCost, keybind
3. Register in `ability-manager.ts`
4. Add visuals in `client/src/scenes/managers/AbilityVisualManager.js`

### Debugging
- **Dev mode**: Game instance at `window.vampireGame`
- **Entity tracking**: `EntityRegistry.getInstance().getAll()`
- **State inspection**: `stateStore` in console

## Architecture Notes

1. **Dual Codebases**: `scripts/` (TypeScript logic) and `client/` (Phaser rendering) are separate. Logic manages state, client renders it.

2. **Partial ECS**: `scripts/ecs/` exists but most code uses traditional OOP.

3. **State Management Hybrid**: `StateStore` for reactive data, `GameStateManager` for game flow states.

4. **Boss System**: Main integration point is `boss-system-integration.ts`.

5. **Object Pooling**: Critical for performance. `tsconfig.json` has `strictPropertyInitialization: false` to support this pattern.
