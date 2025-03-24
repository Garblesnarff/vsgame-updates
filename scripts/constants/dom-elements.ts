/**
 * DOM Element Constants
 * Centralized location for all DOM element IDs and CSS classes used in the game
 * Using these constants prevents hardcoded strings throughout the codebase
 * and makes it easier to update element IDs or classes in the future
 */

// Main UI elements
export const DOM_IDS = {
  // Passive skill menu elements
  PASSIVE_SKILL_MENU: {
    OVERLAY: 'passive-skill-menu-overlay',
    POINTS_DISPLAY: 'available-skill-points',
    CLOSE_BUTTON: 'skill-menu-close',
  },

  // Skill dynamic elements (to be used with template literals)
  SKILL: {
    CARD: (skillId: string) => `${skillId}-card`,
    VALUE: (skillId: string) => `${skillId}-value`,
    UPGRADE: (skillId: string) => `${skillId}-upgrade`,
  },

  // Game elements
  GAME: {
    // Add game-specific DOM IDs here
  },

  // Player elements
  PLAYER: {
    // Add player-specific DOM IDs here
  },

  // Enemy elements
  ENEMY: {
    // Add enemy-specific DOM IDs here
  },

  // Ability elements
  ABILITY: {
    // Add ability-specific DOM IDs here
  },

  // UI elements
  UI: {
    // Add UI-specific DOM IDs here
  }
};

// CSS Class names
export const CSS_CLASSES = {
  // Passive skill menu classes
  PASSIVE_SKILL_MENU: {
    OVERLAY: 'skill-menu-overlay',
    CONTAINER: 'skill-menu',
    HEADER: 'skill-menu-header',
    POINTS_DISPLAY: 'skill-points-display',
    CLOSE_BUTTON: 'skill-menu-close',
    DISABLED: 'disabled',
  },

  // Skill grid and cards
  SKILL: {
    GRID: 'skill-grid',
    CARD: 'skill-card',
    CARD_HEADER: 'skill-card-header',
    DESCRIPTION: 'skill-description',
    EFFECTS: 'skill-effects',
    EFFECT: 'skill-effect',
    EFFECT_NAME: 'skill-effect-name',
    EFFECT_VALUE: 'skill-effect-value',
    UPGRADE_BUTTON: 'skill-upgrade-btn',
  },

  // Game element classes
  GAME: {
    BLOOD_NOVA: 'blood-nova',
    BLOOD_DRAIN_AOE: 'blood-drain-aoe',
    BAT: 'bat',
    SHADOW_TRAIL: 'shadow-trail',
    BLOOD_PARTICLE: 'blood-particle',
  },

  // Player classes
  PLAYER: {
    // Add player-specific CSS classes here
  },

  // Enemy classes
  ENEMY: {
    // Add enemy-specific CSS classes here
  },

  // Ability classes
  ABILITY: {
    // Add ability-specific CSS classes here
  },

  // UI classes
  UI: {
    // Add UI-specific CSS classes here
  }
};

// Selector helpers
export const SELECTORS = {
  // Helper for ID selectors
  id: (id: string) => `#${id}`,
  
  // Helper for class selectors
  class: (className: string) => `.${className}`,
  
  // Helper for skill-specific selectors
  skill: {
    card: (skillId: string) => `#${DOM_IDS.SKILL.CARD(skillId)}`,
    value: (skillId: string) => `#${DOM_IDS.SKILL.VALUE(skillId)}`,
    upgrade: (skillId: string) => `#${DOM_IDS.SKILL.UPGRADE(skillId)}`,
  }
};
