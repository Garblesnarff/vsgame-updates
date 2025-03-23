## Styles Directory

This directory contains CSS style sheets for the vampire survival game's visual presentation.

### Files

- abilities.css: Styles for player abilities and their visual effects.
- game-elements.css: Styles for core game elements including player, enemies, projectiles, and game world.
- main.css: Main style sheet with global styles and CSS variables.
- passive-skills.css: Styles for the passive skills menu, designed to match the main Vampiric Powers menu with consistent card-based layout and purple color theme.
- ui.css: Styles for the user interface components like menus, buttons, and overlays.

### Instructions

- When modifying styles, maintain consistent color schemes in line with the vampire theme (dark reds, blacks, etc.)
- Use CSS variables defined in main.css for consistent theming
- Test responsive layouts at various viewport sizes
- Accessibility considerations: maintain readable text contrast

### Dependencies

- No external CSS frameworks or libraries
- Custom CSS implementation using modern CSS features
- Font Awesome icons for some UI elements

### Notes

- The game uses DOM-based rendering rather than canvas, so CSS plays a critical role in visual presentation
- Performance considerations: minimize expensive CSS properties like box-shadow in elements that update frequently
- Color schemes follow a consistent theme with unique accent colors for different ability types
