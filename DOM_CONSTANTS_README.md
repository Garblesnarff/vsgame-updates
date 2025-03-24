# DOM Element Constants Pattern

## Overview

This document explains our approach to managing DOM element IDs and class names in the VSGame codebase. Instead of hardcoding DOM selectors throughout the code, we now use a centralized constants file.

## Why We Use DOM Constants

- **Maintainability**: Changes to DOM element IDs or classes only need to be made in one place
- **Consistency**: Prevents typos and ensures consistent naming across the codebase
- **Discoverability**: Makes it easier to see all the DOM elements used in the application
- **Refactoring**: Simplifies large-scale UI changes and refactoring
- **Type Safety**: Provides better TypeScript autocompletion and error checking

## How to Use DOM Constants

1. **Import the constants** at the top of your file:
```typescript
import { DOM_IDS, CSS_CLASSES, SELECTORS } from "../constants/dom-elements";
```

2. **Use DOM_IDS for element IDs**:
```typescript
// Instead of:
document.getElementById('passive-skill-menu-overlay');

// Use:
document.getElementById(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY);
```

3. **Use CSS_CLASSES for class names**:
```typescript
// Instead of:
element.className = 'skill-menu-overlay';

// Use:
element.className = CSS_CLASSES.PASSIVE_SKILL_MENU.OVERLAY;
```

4. **Use SELECTORS helpers** to create CSS selectors:
```typescript
// Instead of:
document.querySelector('#skill-menu-close');

// Use:
document.querySelector(SELECTORS.id(DOM_IDS.PASSIVE_SKILL_MENU.CLOSE_BUTTON));

// Or for classes:
document.querySelector('.skill-grid');

// Use:
document.querySelector(SELECTORS.class(CSS_CLASSES.SKILL.GRID));
```

5. **For dynamic IDs**, use the functions provided:
```typescript
// Instead of:
const cardId = `${skill.id}-card`;

// Use:
const cardId = DOM_IDS.SKILL.CARD(skill.id);
```

## Adding New DOM Elements

When adding new DOM elements:

1. Add the ID to the appropriate section in `DOM_IDS`
2. Add the class name to the appropriate section in `CSS_CLASSES`
3. Use these constants when creating elements

Example:
```typescript
// Add to dom-elements.ts
export const DOM_IDS = {
  NEW_FEATURE: {
    CONTAINER: 'new-feature-container',
    BUTTON: 'new-feature-button'
  },
  // ... existing code
};

// In your component
const container = this.createElement('div', {
  id: DOM_IDS.NEW_FEATURE.CONTAINER,
  className: CSS_CLASSES.NEW_FEATURE.CONTAINER
});
```

## Benefits

This approach makes our code more resilient to UI changes and refactoring. If we decide to change the naming convention for an entire feature, we only need to update the constants in one place rather than search through the entire codebase.

It also ensures consistency across different files and components, reducing bugs caused by typos or inconsistent naming.
