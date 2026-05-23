# Task Pack: Add Ability

## Ownership

Primary owner: `scripts/abilities/**`.

Coordinate with:

- `scripts/entities/**` only when the ability changes entity behavior.
- `scripts/types/**` for typed visual or combat event payloads.
- `client/src/scenes/GameScene.js` only for rendering the visual effect.

## Required Inputs

- Activation trigger and cooldown.
- Energy cost and scaling rules.
- Gameplay effect and target selection.
- Visual effect payload requirements.

## Required Changes

- Add ability class extending `Ability`.
- Register it in `AbilityManager`.
- Emit typed events through `scripts/utils/game-event-emitters.ts` for P0 event families.
- Keep renderer updates visual-only.

## Required Tests

- Activation preconditions.
- Cooldown/energy behavior.
- Deterministic effect result where practical.
- Event payload contract coverage for new visual/combat events.

## Non-Goals

- Do not mutate gameplay state from the renderer.
- Do not use raw `GameEvents.emit` for P0 event families.
- Do not add undocumented `any` in ability config or effect payloads.
