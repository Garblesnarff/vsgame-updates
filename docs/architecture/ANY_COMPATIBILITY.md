# Core `any` Compatibility Policy

## Purpose

This policy keeps AI-authored changes from expanding weakly typed gameplay paths while the legacy codebase is hardened incrementally.

## Rule

No new `any` is allowed in gameplay-critical paths unless it is a documented temporary compatibility exemption.

Gameplay-critical paths include:

- `scripts/game/**`
- `scripts/entities/**`
- `scripts/abilities/**`
- `scripts/types/**`
- `scripts/utils/event-system.ts`
- `scripts/utils/game-event-emitters.ts`

## Temporary Exemption Format

Use a narrow local type first. If that is not feasible in the same patch, the exemption must include:

```ts
// TODO(any-compat): Replace with <specific type> when <blocking work> is done.
```

The surrounding PR must explain:

- Why the `any` is temporarily necessary.
- Which module owns the follow-up.
- Which tests protect the behavior until the type is replaced.

## Migration Priority

1. Event payloads and cross-layer contracts.
2. `Game`, `Player`, and base enemy interfaces.
3. Boss integration seams.
4. Ability config and effect payloads.
5. Remaining UI/input/state utility paths.

## Review Rule

Reviewers should reject patches that add undocumented `any` in the paths above, even when tests pass.
