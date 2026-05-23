# Task Pack: Add UI Panel

## Ownership

Primary owner: `scripts/ui/**`, `scripts/constants/dom-elements.ts`, `styles/**`.

Coordinate with:

- `scripts/game/state-store/**` for state subscriptions.
- `scripts/types/**` if new event payloads are required.

## Required Inputs

- User-facing purpose.
- State needed by the panel.
- Events or store fields consumed.
- Close/open lifecycle rules.

## Required Changes

- Add DOM IDs/classes through `scripts/constants/dom-elements.ts`.
- Use templates from `scripts/utils/dom-templates.ts` for complex markup.
- Subscribe and unsubscribe cleanly.
- Keep gameplay decisions in `scripts/game/**` or `scripts/entities/**`.

## Required Tests

- DOM constant coverage.
- Open/close or state update behavior.
- Event contract coverage if the panel consumes new events.

## Non-Goals

- Do not hardcode selectors.
- Do not compute combat/progression outcomes in UI code.
- Do not introduce untracked DOM listeners or timers.
