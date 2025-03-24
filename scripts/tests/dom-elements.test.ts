import { DOM_IDS, CSS_CLASSES, SELECTORS } from '../constants/dom-elements';

describe('DOM Elements Constants', () => {
  describe('DOM_IDS', () => {
    it('should have the correct passive skill menu IDs', () => {
      expect(DOM_IDS.PASSIVE_SKILL_MENU.OVERLAY).toBe('passive-skill-menu-overlay');
      expect(DOM_IDS.PASSIVE_SKILL_MENU.POINTS_DISPLAY).toBe('available-skill-points');
      expect(DOM_IDS.PASSIVE_SKILL_MENU.CLOSE_BUTTON).toBe('skill-menu-close');
    });

    it('should generate dynamic skill IDs correctly', () => {
      expect(DOM_IDS.SKILL.CARD('test-skill')).toBe('test-skill-card');
      expect(DOM_IDS.SKILL.VALUE('test-skill')).toBe('test-skill-value');
      expect(DOM_IDS.SKILL.UPGRADE('test-skill')).toBe('test-skill-upgrade');
    });
  });

  describe('CSS_CLASSES', () => {
    it('should have the correct passive skill menu classes', () => {
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.OVERLAY).toBe('skill-menu-overlay');
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.CONTAINER).toBe('skill-menu');
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.HEADER).toBe('skill-menu-header');
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.POINTS_DISPLAY).toBe('skill-points-display');
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.CLOSE_BUTTON).toBe('skill-menu-close');
      expect(CSS_CLASSES.PASSIVE_SKILL_MENU.DISABLED).toBe('disabled');
    });

    it('should have the correct skill grid and card classes', () => {
      expect(CSS_CLASSES.SKILL.GRID).toBe('skill-grid');
      expect(CSS_CLASSES.SKILL.CARD).toBe('skill-card');
      expect(CSS_CLASSES.SKILL.CARD_HEADER).toBe('skill-card-header');
      expect(CSS_CLASSES.SKILL.DESCRIPTION).toBe('skill-description');
      expect(CSS_CLASSES.SKILL.EFFECTS).toBe('skill-effects');
      expect(CSS_CLASSES.SKILL.EFFECT).toBe('skill-effect');
      expect(CSS_CLASSES.SKILL.EFFECT_NAME).toBe('skill-effect-name');
      expect(CSS_CLASSES.SKILL.EFFECT_VALUE).toBe('skill-effect-value');
      expect(CSS_CLASSES.SKILL.UPGRADE_BUTTON).toBe('skill-upgrade-btn');
    });

    it('should have the correct game element classes', () => {
      expect(CSS_CLASSES.GAME.BLOOD_NOVA).toBe('blood-nova');
      expect(CSS_CLASSES.GAME.BLOOD_DRAIN_AOE).toBe('blood-drain-aoe');
      expect(CSS_CLASSES.GAME.BAT).toBe('bat');
      expect(CSS_CLASSES.GAME.SHADOW_TRAIL).toBe('shadow-trail');
      expect(CSS_CLASSES.GAME.BLOOD_PARTICLE).toBe('blood-particle');
    });
  });

  describe('SELECTORS', () => {
    it('should correctly create id selectors', () => {
      expect(SELECTORS.id('test-id')).toBe('#test-id');
    });

    it('should correctly create class selectors', () => {
      expect(SELECTORS.class('test-class')).toBe('.test-class');
    });

    it('should correctly create skill selectors', () => {
      expect(SELECTORS.skill.card('test-skill')).toBe('#test-skill-card');
      expect(SELECTORS.skill.value('test-skill')).toBe('#test-skill-value');
      expect(SELECTORS.skill.upgrade('test-skill')).toBe('#test-skill-upgrade');
    });
  });
});
