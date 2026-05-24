# Game Decomposition Roadmap

## Purpose

`scripts/game/game.ts` is still the main orchestration hub. Future changes should reduce its size by extracting deterministic domain services behind typed interfaces.

## Extraction Order

1. Combat resolution
   - Projectile hit adjudication
   - Damage source payloads
   - Lifesteal application
   - Enemy death side effects
2. Loot/drop lifecycle
   - Drop spawn chance
   - Pickup effects
   - Drop cleanup
3. Collision adjudication pipeline
   - Spatial query
   - Collision filtering
   - Resolution side effects
4. Render sync adapter
   - Convert gameplay state into `RenderSyncPayload`
   - Keep Phaser-specific concerns in `client/src/scenes/**`

## Rules

- Extract pure functions first when possible.
- Keep `Game` responsible for orchestration, not domain decisions.
- Every extracted service needs deterministic tests before new mechanics build on it.
- No service may import from `client/src/scenes/**`.

## Current Status

- P0 and P1 event contracts are centralized through typed emitters.
- `scripts/game/combat-resolution.ts` owns the active projectile hit/death/lifesteal/drop decision slice.
- Deterministic level progression tests exist.
- Loot lifecycle, collision pipeline extraction, and render sync adapter hardening remain the next decomposition targets.
