# AI Contribution Protocol

## Purpose

This protocol standardizes AI-authored changes to maximize scalability, reviewability, and safety.

## Change Size and Scope

- Prefer small, single-responsibility changes.
- Each change must target one primary objective.
- Avoid mixing refactor + feature + test-infra in a single patch unless required.

## Required Pull Request Checklist

Every PR must include:

1. **Objective**: one-sentence summary of why this change exists.
2. **Touched Systems**: explicit list of affected modules/subsystems.
3. **Risk Assessment**:
   - Runtime risk (low/medium/high)
   - Regression areas
4. **Contracts Changed**:
   - Events added/modified
   - Type signatures changed
5. **Verification**:
   - Commands run
   - Results (pass/fail/warning with reason)
6. **Rollback Plan**:
   - How to revert quickly if needed.

## Mandatory Engineering Rules

- No new untyped high-traffic events.
- No renderer-side gameplay logic.
- No silent API contract changes.
- Add or update tests with behavior changes.

## Task Framing for AI Contributors

When assigning work, include:

- File ownership boundaries
- Acceptance criteria
- Required tests
- Non-goals

## Review Guidance

Reviewers should reject PRs when:

- Scope is unclear or too broad.
- Contracts changed without explicit documentation.
- Tests do not cover affected behavior.
- Architectural boundaries are violated.
