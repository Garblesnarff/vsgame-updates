# Architecture Boundaries

## Purpose

This document defines strict architectural boundaries for the Vampire Survival Game so contributors (human and AI) can make safe, scalable changes with minimal regressions.

## Source of Truth

- `scripts/` is the authoritative gameplay domain.
  - State transitions
  - Combat rules
  - Spawn logic
  - Progression and economy logic
- `client/src/scenes/` is a rendering adapter.
  - Visual presentation only
  - Animation state mapping
  - Texture/sprite lifecycle

## Hard Rules

1. Renderer files in `client/src/scenes/**` must not implement gameplay decisions.
   - No combat math
   - No XP/level decisions
   - No drop chance decisions
2. Gameplay files in `scripts/**` must not depend on Phaser scene internals.
   - Communicate through typed events and data contracts only.
3. New cross-layer communication must be event-driven.
   - Use `GameEvents` and typed payloads.
4. Core gameplay paths must avoid `any` types.
   - Temporary exceptions require inline TODO with tracking issue.
5. P0 event families must use typed emitters from `scripts/utils/game-event-emitters.ts`.
   - `RENDER_SYNC`
   - `PARTICLE_EMIT`
   - `ENEMY_SPAWN`
   - `ENEMY_DAMAGE`
   - `ENEMY_DEATH`
   - `PLAYER_LEVEL_UP`
   - `PLAYER_DAMAGE`
   - `PLAYER_HEAL`
   - `PLAYER_DEATH`

## Forbidden Patterns

- Importing gameplay mutators from renderer and invoking them directly.
- Mutating gameplay state in renderer callbacks.
- Adding new `@ts-ignore` in core gameplay modules.
- Introducing untyped event payloads for high-traffic events.

## Preferred Patterns

- Define event payload types first.
- Add tests for event contracts before feature integration.
- Keep modules single-purpose and composable.
- Run `npm run architecture:check` when changing event, renderer, or cross-layer code.

## Scope Notes

- This policy applies to all new code.
- Existing violations should be addressed incrementally in prioritized backlog order.
