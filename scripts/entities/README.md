# Entity Lifecycle Management

This directory contains game entities that follow a consistent lifecycle pattern. All entities extend the `BaseEntity` class which provides a standard interface for initialization, updating, and cleanup.

## Entity Lifecycle

Every entity goes through the following lifecycle phases:

1. **Creation**: When an entity is instantiated via its constructor
2. **Initialization**: Perform any necessary setup after creation
3. **Update**: Regular updates during each game loop frame
4. **Cleanup**: Proper resource release before destruction

## BaseEntity Interface

All entities implement the `EntityLifecycle` interface via the `BaseEntity` class, which provides:

```typescript
interface EntityLifecycle {
  initialize(): void;  // Called after construction
  update(deltaTime: number): void;  // Called each frame
  cleanup(): void;  // Called before destruction
}
```

## Usage Pattern

Here's the recommended pattern for using entities:

```typescript
// Creation
const entity = new SomeEntity(gameContainer);

// Initialization (can happen in constructor or explicitly)
entity.initialize();

// Update each frame
entity.update(deltaTime);

// Cleanup when done
entity.cleanup();
```

## Benefits

This lifecycle approach provides several advantages:

1. **Consistency**: All entities follow the same pattern
2. **Predictability**: Clear separation between phases
3. **Resource Management**: Proper cleanup to prevent memory leaks
4. **Extensibility**: Easy to add new entity types that follow the pattern
5. **Testability**: Each phase can be tested independently

## Implementation Details

- `BaseEntity` includes flags to track if an entity is initialized or destroyed
- Entities can check their state with `isEntityInitialized()` and `isEntityDestroyed()`
- The `cleanup()` method handles DOM element removal
- Legacy `destroy()` methods still exist for backward compatibility

## Backward Compatibility

For backward compatibility, entities maintain their previous interface but now:

- `destroy()` methods call `cleanup()`
- External systems may call either method, but `cleanup()` is preferred
