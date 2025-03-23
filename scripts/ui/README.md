## Scripts/UI Directory

This directory contains scripts related to the game's user interface components and systems.

### Files

- ability-bar.ts: Manages the visual representation of player abilities in the UI, handling rendering, cooldown display, and hotkey indicators.
- PassiveSkillMenu.ts: Handles the passive skills menu UI for permanent character upgrades between game runs. Styled to match the Vampiric Powers menu.
- PassiveSkillMenuEventManager.ts: Helper class for PassiveSkillMenu that manages event listeners with proper tracking and cleanup to prevent memory leaks.
- screens.ts: Manages different game screens (e.g., game over, level up) and transitions between them.
- skill-menu.ts: Manages the in-game skill menu (Vampiric Powers) for upgrading abilities during gameplay.
- stats-display.ts: Displays player stats (e.g., health, energy) and updates them in real-time.
- ui-manager.ts: Coordinates all UI components of the game and maintains UI state consistency.

### Instructions

- When implementing new UI components, match the visual style of existing components
- Use event delegation where possible to minimize event listeners
- Clear DOM element references when components are destroyed
- Always use the createElement helper method for DOM manipulation instead of innerHTML
- Follow the pattern of caching DOM elements to minimize querySelector calls

### Dependencies

- Relies on ../models/passive-skill-model.ts for passive skill data
- Uses ../utils/logger.ts for consistent logging
- Works with ../game/game.ts for game state
- Leverages ../utils/persistence.ts for data saving/loading

### Notes

- The PassiveSkillMenu and skill-menu (Vampiric Powers) use a consistent design language
- DOM-based element management is preferred over string templates for better performance
- Event listener tracking is critical for preventing memory leaks
