/**
 * DOM Templates
 * Provides a declarative approach to creating DOM elements
 */

import { DOM_IDS, CSS_CLASSES } from "../constants/dom-elements";

/**
 * Generic template context
 */
export interface TemplateContext {
  [key: string]: any;
}

/**
 * Supported template types
 */
export type TemplateFunction<T extends TemplateContext> = (context: T) => string;

/**
 * Template engine for creating DOM elements declaratively
 */
export class DOMTemplateEngine {
  private templates: Map<string, TemplateFunction<any>> = new Map();

  /**
   * Register a template
   * @param name - Template name
   * @param templateFn - Template function that returns an HTML string
   */
  registerTemplate<T extends TemplateContext>(name: string, templateFn: TemplateFunction<T>): void {
    this.templates.set(name, templateFn);
  }

  /**
   * Render a template to string
   * @param name - Template name
   * @param context - Template context
   * @returns HTML string
   */
  renderToString<T extends TemplateContext>(name: string, context: T): string {
    const template = this.templates.get(name);
    if (!template) {
      console.error(`Template '${name}' not found`);
      throw new Error(`Template '${name}' not found`);
    }
    try {
      return template(context);
    } catch (error) {
      console.error(`Error rendering template '${name}':`, error);
      throw error;
    }
  }

  /**
   * Render a template to a DOM element
   * @param name - Template name
   * @param context - Template context
   * @returns DOM element or null if template not found
   */
  render<T extends TemplateContext>(name: string, context: T): HTMLElement | null {
    try {
      const html = this.renderToString(name, context);
      const container = document.createElement('div');
      container.innerHTML = html.trim();
      return container.firstChild as HTMLElement || null;
    } catch (error) {
      console.error(`Error rendering template '${name}':`, error);
      return null;
    }
  }
  
  /**
   * Render a template to multiple DOM elements
   * @param name - Template name
   * @param context - Template context
   * @returns Array of DOM elements or empty array if template not found
   */
  renderMultiple<T extends TemplateContext>(name: string, context: T): HTMLElement[] {
    try {
      const html = this.renderToString(name, context);
      const container = document.createElement('div');
      container.innerHTML = html.trim();
      return Array.from(container.childNodes).filter(
        node => node.nodeType === Node.ELEMENT_NODE
      ) as HTMLElement[];
    } catch (error) {
      console.error(`Error rendering template '${name}':`, error);
      return [];
    }
  }

  /**
   * Render a template and append it to a parent element
   * @param name - Template name
   * @param context - Template context
   * @param parent - Parent element
   * @returns Created element or null if template not found
   */
  renderToParent<T extends TemplateContext>(
    name: string, 
    context: T, 
    parent: HTMLElement
  ): HTMLElement | null {
    const element = this.render(name, context);
    if (element) {
      parent.appendChild(element);
      return element;
    }
    return null;
  }
  
  /**
   * Update an existing element with a template
   * @param element - Element to update
   * @param name - Template name
   * @param context - Template context
   * @returns true if update was successful, false otherwise
   */
  updateElement<T extends TemplateContext>(
    element: HTMLElement, 
    name: string, 
    context: T
  ): boolean {
    if (!element) {
      console.error('Cannot update null element');
      return false;
    }
    
    try {
      const html = this.renderToString(name, context);
      element.innerHTML = html;
      return true;
    } catch (error) {
      console.error(`Error updating element with template '${name}':`, error);
      return false;
    }
  }
}

// Create the engine instance
export const templateEngine = new DOMTemplateEngine();

// Register built-in templates

// Progress bar template
interface ProgressBarContext {
  id?: string;
  className?: string;
  fillClassName?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  value?: number;
}

templateEngine.registerTemplate<ProgressBarContext>('progressBar', (context) => {
  const {
    id = '',
    className = 'progress-bar-container',
    fillClassName = 'progress-bar-fill',
    width = 100,
    height = 10,
    backgroundColor = '#333',
    fillColor = '#4b0082',
    value = 100
  } = context;
  
  return `
    <div 
      ${id ? `id="${id}"` : ''} 
      class="${className}" 
      style="width: ${width}px; height: ${height}px; background-color: ${backgroundColor}; position: relative; overflow: hidden; border-radius: 3px;"
    >
      <div 
        class="${fillClassName}" 
        style="width: ${value}%; height: 100%; background-color: ${fillColor}; position: absolute; left: 0; top: 0; transition: width 0.3s ease;"
      ></div>
    </div>
  `;
});

// Tooltip template
interface TooltipContext {
  id?: string;
  className?: string;
  backgroundColor?: string;
  textColor?: string;
  text: string;
}

templateEngine.registerTemplate<TooltipContext>('tooltip', (context) => {
  const {
    id = '',
    className = 'tooltip',
    backgroundColor = 'rgba(0, 0, 0, 0.8)',
    textColor = 'white',
    text
  } = context;
  
  return `
    <div 
      ${id ? `id="${id}"` : ''} 
      class="${className}" 
      style="position: absolute; background-color: ${backgroundColor}; color: ${textColor}; padding: 5px 10px; border-radius: 3px; font-size: 12px; pointer-events: none; z-index: 1000; opacity: 0; transition: opacity 0.3s ease;"
    >
      ${text}
    </div>
  `;
});

// Stats container template
templateEngine.registerTemplate('statsContainer', () => {
  return `
    <div id="${DOM_IDS.UI.STATS_CONTAINER}">
      <div class="${CSS_CLASSES.UI.BAR_CONTAINER}">
        <div id="${DOM_IDS.PLAYER.HEALTH_BAR}"></div>
      </div>
      <div class="${CSS_CLASSES.UI.BAR_CONTAINER}">
        <div id="${DOM_IDS.PLAYER.ENERGY_BAR}"></div>
      </div>
      <div>Time: <span id="${DOM_IDS.UI.TIME}">0:00</span></div>
      <div>Level: <span id="${DOM_IDS.UI.LEVEL}">1</span></div>
      <div>Kills: <span id="${DOM_IDS.UI.KILLS}">0 / 10</span></div>
    </div>
  `;
});

// Skill points template
templateEngine.registerTemplate('skillPoints', () => {
  return `
    <div id="${DOM_IDS.UI.SKILL_POINTS}" class="${CSS_CLASSES.UI.SKILL_POINTS}">
      Skill Points: <span id="${DOM_IDS.UI.SKILL_POINTS_COUNT}">0</span>
    </div>
  `;
});

// Game over screen template
interface GameOverContext {
  kills?: number;
  time?: string;
}

templateEngine.registerTemplate<GameOverContext>('gameOverScreen', (context) => {
  const { kills = 0, time = '0:00' } = context;
  
  return `
    <div id="${DOM_IDS.UI.GAME_OVER}" class="${CSS_CLASSES.UI.GAME_OVER}">
      GAME OVER<br>
      <span id="${DOM_IDS.UI.FINAL_SCORE}">Kills: ${kills} | Time: ${time}</span><br>
      Press SPACE to restart
    </div>
  `;
});

// Level up screen template
templateEngine.registerTemplate('levelUpScreen', () => {
  return `
    <div id="${DOM_IDS.UI.LEVEL_UP}" class="${CSS_CLASSES.UI.LEVEL_UP}">
      LEVEL UP!<br>
      You gained a skill point!<br>
      Press 'S' to open Skills
    </div>
  `;
});

// Auto attack toggle template
interface AutoAttackContext {
  enabled?: boolean;
}

templateEngine.registerTemplate<AutoAttackContext>('autoAttackToggle', (context) => {
  const { enabled = true } = context;
  
  return `
    <div id="${DOM_IDS.UI.AUTO_ATTACK_TOGGLE}" class="${CSS_CLASSES.UI.AUTO_ATTACK_TOGGLE} ${enabled ? 'active' : ''}">
      Auto-Attack: ${enabled ? 'ON' : 'OFF'}
    </div>
  `;
});

// Ability template
interface AbilityContext {
  id: string;
  icon: string;
  key: string;
  level: number;
}

templateEngine.registerTemplate<AbilityContext>('ability', (context) => {
  const { id, icon, key, level } = context;
  const kebabId = id.replace(/([A-Z])/g, "-$1").toLowerCase(); // camelCase to kebab-case
  
  return `
    <div class="${CSS_CLASSES.ABILITY.ITEM}" id="${kebabId}">
      <div class="${CSS_CLASSES.ABILITY.ICON}">${icon}</div>
      <div class="${CSS_CLASSES.ABILITY.KEY}">${key}</div>
      <div class="${CSS_CLASSES.ABILITY.LEVEL}">Lv${level}</div>
      <div class="${CSS_CLASSES.ABILITY.COOLDOWN}"></div>
    </div>
  `;
});

// Skill menu template
templateEngine.registerTemplate('skillMenuOverlay', () => {
  return `
    <div id="${DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY}" class="${CSS_CLASSES.PASSIVE_SKILL_MENU.OVERLAY}">
      <div class="${CSS_CLASSES.PASSIVE_SKILL_MENU.CONTAINER}">
        <div class="${CSS_CLASSES.PASSIVE_SKILL_MENU.HEADER}">
          <h2>Vampiric Powers</h2>
          <div class="${CSS_CLASSES.PASSIVE_SKILL_MENU.POINTS_DISPLAY}">
            Available Skill Points: <span id="${DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY}">0</span>
          </div>
          <button class="${CSS_CLASSES.PASSIVE_SKILL_MENU.CLOSE_BUTTON}" id="${DOM_IDS.PASSIVE_SKILL_MENU.CLOSE_BUTTON}">Close</button>
        </div>
        <div class="${CSS_CLASSES.SKILL.GRID}"></div>
      </div>
    </div>
  `;
});

// Skill card template
interface SkillCardContext {
  id: string;
  name: string;
  description: string;
  level: number;
  effects: Array<{ name: string; id: string; value: string }>;
  locked?: boolean;
  unlockLevel?: number;
}

templateEngine.registerTemplate<SkillCardContext>('skillCard', (context) => {
  const { id, name, description, level, effects, locked = false, unlockLevel = 0 } = context;
  
  // Generate level pips HTML
  let levelPipsHtml = '';
  for (let i = 0; i < 5; i++) {
    levelPipsHtml += `<div class="level-pip ${i < level ? 'filled' : ''}"></div>`;
  }
  
  // Generate effects HTML
  let effectsHtml = '';
  effects.forEach(effect => {
    effectsHtml += `
      <div class="${CSS_CLASSES.SKILL.EFFECT}">
        <span class="${CSS_CLASSES.SKILL.EFFECT_NAME}">${effect.name}:</span>
        <span class="${CSS_CLASSES.SKILL.EFFECT_VALUE}" id="${effect.id}">${effect.value}</span>
      </div>
    `;
  });
  
  return `
    <div class="${CSS_CLASSES.SKILL.CARD}" id="${DOM_IDS.SKILL.CARD(id)}">
      ${locked ? '<div class="new-ability-badge">New!</div>' : ''}
      <div class="${CSS_CLASSES.SKILL.CARD_HEADER}"><h3>${name}</h3></div>
      <div class="skill-level">${levelPipsHtml}</div>
      <div class="${CSS_CLASSES.SKILL.DESCRIPTION}">${description}</div>
      <div class="${CSS_CLASSES.SKILL.EFFECTS}">${effectsHtml}</div>
      <button class="${CSS_CLASSES.SKILL.UPGRADE_BUTTON}" id="${DOM_IDS.SKILL.UPGRADE(id)}">${locked ? 'Unlock (3 Points)' : 'Upgrade (1 Point)'}</button>
      ${locked ? `<div class="skill-locked" id="${id}-locked"><div class="skill-locked-message">Unlocks at Level ${unlockLevel}</div></div>` : ''}
    </div>
  `;
});

// Night shield explosion template
interface ShieldExplosionContext {
  x: number;
  y: number;
  range: number;
}

templateEngine.registerTemplate<ShieldExplosionContext>('shieldExplosion', (context) => {
  const { x, y } = context;
  
  return `
    <div class="${CSS_CLASSES.GAME.NIGHT_SHIELD}" 
      style="width: 0px; height: 0px; left: ${x}px; top: ${y}px; border: 5px solid #8a2be2; background-color: rgba(138, 43, 226, 0.3); transition: all 0.3s ease-out;">
    </div>
  `;
});

// Generic message template
interface MessageContext {
  message: string;
  className?: string;
}

templateEngine.registerTemplate<MessageContext>('message', (context) => {
  const { message, className = 'message' } = context;
  
  return `
    <div class="${className}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 36px; color: #ffffff; text-align: center; z-index: 1000;">
      ${message}
    </div>
  `;
});

// Export common template helpers
export const Templates = {
  skillMenuOverlay: () => templateEngine.render('skillMenuOverlay', {}),
  skillCard: (context: SkillCardContext) => templateEngine.render('skillCard', context),
  statsContainer: () => templateEngine.render('statsContainer', {}),
  skillPoints: () => templateEngine.render('skillPoints', {}),
  gameOverScreen: (context: GameOverContext) => templateEngine.render('gameOverScreen', context),
  levelUpScreen: () => templateEngine.render('levelUpScreen', {}),
  autoAttackToggle: (context: AutoAttackContext) => templateEngine.render('autoAttackToggle', context),
  ability: (context: AbilityContext) => templateEngine.render('ability', context),
  progressBar: (context: ProgressBarContext) => templateEngine.render('progressBar', context),
  tooltip: (context: TooltipContext) => templateEngine.render('tooltip', context),
  shieldExplosion: (context: ShieldExplosionContext) => templateEngine.render('shieldExplosion', context),
  message: (context: MessageContext) => templateEngine.render('message', context)
};

export default Templates;
