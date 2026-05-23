# Task Pack: Add Enemy

## Ownership

Primary owner: `scripts/entities/enemies/**`, `scripts/config/enemy-configs.ts`.

Coordinate with:

- `scripts/game/spawn-system.ts` for spawn timing and unlock rules.
- `client/src/scenes/GameScene.js` only for visual adapter mapping.
- `scripts/tests/**` for deterministic behavior coverage.

## Required Inputs

- Enemy role and unlock level.
- Base stats and scaling intent.
- Special behavior, if any.
- Sprite/texture key and animation states.

## Required Changes

- Add enemy config in `scripts/config/enemy-configs.ts`.
- Add enemy class extending `Enemy`.
- Register exports in `scripts/entities/enemies/index.ts`.
- Add object pool registration in `Game` if the enemy is pooled.
- Add spawn path in `SpawnSystem`.
- Add renderer mapping only for sprite/animation display.

## Required Tests

- Spawn selection or unlock rule.
- Damage/death behavior if special.
- Event contract test when a new event or payload field is introduced.

## Non-Goals

- Do not add renderer-side combat decisions.
- Do not introduce untyped cross-layer payloads.
- Do not bundle balance changes for unrelated enemies.
