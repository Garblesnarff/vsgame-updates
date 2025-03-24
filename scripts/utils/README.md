# Utility Functions

This directory contains utility functions used across the game.

## DOM Utilities

The DOM utilities provide functions for creating and manipulating DOM elements.

### dom.ts

Contains basic DOM utility functions:

- `createElement`: Creates an HTML element with attributes and content (legacy approach)
- `clearElement`: Removes all children from an element
- `setStyles`: Sets multiple styles on an element at once
- `createProgressBar`: Creates a progress bar component
- `createTooltip`: Creates a tooltip element
- `positionElement`: Positions an element at specific coordinates

### dom-templates.ts

Provides a declarative, template-based approach to creating DOM elements:

- `templateEngine`: A simple template engine for creating DOM elements
- `Templates`: Pre-defined templates for common game UI components

## Using Templates

Instead of manually creating DOM elements with imperative code, you can use templates:

### Old Approach (Imperative)

```typescript
// Create a complex UI element imperatively
const card = document.createElement("div");
card.className = "skill-card";
card.id = `${id}-card`;

// Add header
const header = document.createElement("div");
header.className = "skill-card-header";
header.innerHTML = `<h3>${name}</h3>`;
card.appendChild(header);

// More DOM operations...
```

### New Approach (Declarative Templates)

```typescript
// Import templates
import Templates from "../utils/dom-templates";

// Create the same card with a template
const card = Templates.skillCard({
  id,
  name,
  description,
  effects,
  level,
  locked,
  unlockLevel
});
```

## Creating New Templates

You can register new templates with the template engine:

```typescript
import { templateEngine } from "../utils/dom-templates";

// Define context interface for strongly-typed parameters
interface MyComponentContext {
  id: string;
  title: string;
  content: string;
}

// Register the template
templateEngine.registerTemplate<MyComponentContext>("myComponent", (context) => {
  const { id, title, content } = context;
  return `
    <div id="${id}" class="my-component">
      <h2>${title}</h2>
      <div class="content">${content}</div>
    </div>
  `;
});

// Export as a helper function for easy usage
export const myComponent = (context: MyComponentContext) => 
  templateEngine.render("myComponent", context);
```

## Benefits of Templates

- **Declarative Code**: Templates separate the "what" from the "how" making code easier to understand
- **Consistency**: UI components created with templates have consistent structure
- **Maintainability**: Changes to templates apply to all instances automatically
- **Reduced Duplication**: Common UI patterns are defined once and reused
- **Better Organization**: UI structure is defined in templates, not scattered across the codebase
