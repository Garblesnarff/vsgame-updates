# Typed Event Contract Backlog

## Objective

Prioritize event typing work to reduce regressions and improve scalability for AI-assisted development.

## Method

Prioritization is based on:

1. **Runtime criticality** (can break core gameplay loop)
2. **Fan-out** (number of producers/consumers)
3. **Payload ambiguity** (`any`, positional args, inconsistent shape)
4. **Cross-layer impact** (logic ↔ renderer, logic ↔ UI)

## P0 (Do First)

These are high-traffic and/or cross-layer events with immediate regression risk.

**Status**: Complete. P0 events now use shared payload contracts and typed emitter helpers:
`RenderSyncPayload`, `ParticleEmitPayload`, `EnemySpawnPayload`, `EnemyDamagePayload`,
`EnemyDeathPayload`, and player lifecycle/progression payloads.

### 1) `EVENTS.RENDER_SYNC`
- **Current risk**: Drives renderer state each frame; payload shape is implicit.
- **Observed producers/consumers**:
  - Producer: `scripts/game/game.ts`
  - Consumer: `client/src/scenes/GameScene.js`
- **Required contract**:
  - Frame timestamp / delta
  - Player render state
  - Enemy render list
  - Projectile render list
  - Drop render list
  - Boss render state (optional)
- **Acceptance criteria**:
  - Shared `RenderSyncPayload` type exists.
  - Producer and consumer compile against same contract.

### 2) `EVENTS.PARTICLE_EMIT`
- **Current risk**: Emitted from many combat/ability paths with varying payload shape.
- **Observed producers/consumers**:
  - Producers: `scripts/game/game.ts`, `scripts/abilities/*.ts`
  - Consumer: `client/src/scenes/GameScene.js`
- **Required contract**:
  - `type` discriminant (`blood`, `nova`, `shadow`, `shield`, ...)
  - position fields
  - optional count/size/lifetime fields per subtype
- **Acceptance criteria**:
  - Discriminated union for particle payload.
  - Exhaustive handling in renderer.

### 3) `EVENTS.ENEMY_SPAWN`
- **Current risk**: Mixed argument patterns (`enemy`, sometimes extra type tag).
- **Observed producers/consumers**:
  - Producers: `scripts/game/game.ts`, `scripts/game/spawn-system.ts`, boss files
  - Consumers: renderer and systems listening for spawn-side effects
- **Required contract**:
  - canonical payload object: `{ enemy, enemyType, source }`
- **Acceptance criteria**:
  - All emissions use object payload (no positional variants).

### 4) `EVENTS.ENEMY_DEATH` / `EVENTS.ENEMY_DAMAGE`
- **Current risk**: Core progression and ability interactions depend on consistency.
- **Observed producers/consumers**:
  - Producers: core combat + abilities
  - Consumers: `level-system`, UI, effects
- **Required contract**:
  - `EnemyDeathPayload` and `EnemyDamagePayload` with explicit fields
- **Acceptance criteria**:
  - Level and effects systems consume typed payloads only.

### 5) `EVENTS.PLAYER_LEVEL_UP`, `EVENTS.PLAYER_DAMAGE`, `EVENTS.PLAYER_HEAL`, `EVENTS.PLAYER_DEATH`
- **Current risk**: Progression/UI and game-over flow depend on these; currently positional.
- **Observed producers/consumers**:
  - Producers: player, level/boss systems
  - Consumers: UI manager, main logging hooks, state flow
- **Required contract**:
  - Standardized payload objects with player id/reference and scalar values.
- **Acceptance criteria**:
  - No positional arg emissions remain for these events.

## P1 (Second Wave)

### 6) Boss lifecycle/combat events
- `BOSS_WARNING`, `BOSS_SPAWN`, `BOSS_DEFEATED`, `BOSS_PHASE_CHANGE`, `BOSS_ATTACK*`, `BOSS_SPECIAL_MOVE`, `BOSS_REWARD`
- **Goal**: Normalize boss telemetry and UI/renderer integration.

### 7) Enemy behavior telemetry events
- `ENEMY_ATTACK*`, `ENEMY_SPECIAL_MOVE`, `ENEMY_BUFF*`, `ENEMY_HEAL`, `ENEMY_DODGE`, `ENEMY_SUMMON`, `ENEMY_CHARGE`
- **Goal**: Strong typing for behavior effects and future balancing instrumentation.

### 8) Ability events
- `ABILITY_USE`, `ABILITY_UPGRADE`, `ABILITY_UNLOCK`, `ABILITY_VISUAL`
- **Goal**: Convert to typed object payloads and discriminated unions for visuals.

## P2 (Third Wave)

### 9) Input and UI interaction events
- `INPUT_KEY_DOWN`, `INPUT_KEY_UP`, `INPUT_CLICK`, `UI_SKILL_MENU_OPEN`, `UI_SKILL_MENU_CLOSE`, `PASSIVE_SKILL_UPGRADED`

### 10) Asset/state-store/system events
- `assets:*`, `state:change`, dynamic `state:<name>:change`, storage/system errors

## Migration Rules

1. Prefer payload object migration over positional args.
2. Add compatibility adapter shims only when necessary; remove in follow-up PR.
3. Land in narrow vertical slices (event + producer(s) + consumer(s) + tests).
4. For each migrated event, add/update contract tests.

## Suggested Execution Sequence

1. `RENDER_SYNC`
2. `PARTICLE_EMIT`
3. `ENEMY_SPAWN`
4. `ENEMY_DEATH` + `ENEMY_DAMAGE`
5. Player lifecycle/progression events
6. Boss events
7. Ability and enemy telemetry events
8. Remaining UI/input/assets/state events

## Definition of Done (for this backlog item)

- Prioritized list exists and is checked into repo.
- Each P0 item has contract shape and acceptance criteria.
- Sequence is explicit for implementation planning.
