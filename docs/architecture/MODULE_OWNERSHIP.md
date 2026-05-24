# Module Ownership Map

## Purpose

Define ownership slices so multiple contributors (especially AI agents) can work in parallel with low merge conflict risk.

## Ownership Areas

### Gameplay Domain (`scripts/game/**`)
- Responsibility:
  - Game orchestration
  - Update loops
  - Spawn/level/state systems
- Do not own:
  - Scene-level rendering concerns

### Entities and Combat (`scripts/entities/**`, `scripts/abilities/**`)
- Responsibility:
  - Entity behavior
  - Ability behavior
  - Combat interactions
- Do not own:
  - UI composition details

### Event and Utility Contracts (`scripts/utils/**`, `scripts/types/**`)
- Responsibility:
  - Event bus behavior
  - Shared contracts/types
  - Cross-cutting helpers
- Do not own:
  - Gameplay tuning decisions

### User Interface (`scripts/ui/**`)
- Responsibility:
  - DOM-based UI behavior
  - Menu/stats/skill surfaces
- Do not own:
  - Core combat math and progression

### Rendering Adapter (`client/src/scenes/**`)
- Responsibility:
  - Sprite/texture/animation rendering
  - Event-driven visual response
- Do not own:
  - Gameplay state mutation and rules

## Parallel Work Rules

- One task = one ownership area where possible.
- Cross-area tasks must explicitly define integration points.
- If unavoidable overlap exists, merge owner-defined foundational refactors first.

## Escalation Rules

When a task crosses ownership boundaries:

1. Define a typed interface/event contract first.
2. Land contract + tests.
3. Land consumer/producer updates in small follow-up patches.
