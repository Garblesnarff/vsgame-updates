import { createLogger } from "../utils/logger";

const logger = createLogger('PassiveSkillMenuEventManager');

/**
 * Helper class to manage event listeners for the PassiveSkillMenu
 * Tracks all listeners and provides a way to remove them all at once
 */
export class PassiveSkillMenuEventManager {
  private eventListeners: Map<HTMLElement, Map<string, EventListener>>;

  constructor() {
    this.eventListeners = new Map();
  }

  /**
   * Add an event listener and track it for later cleanup
   * @param element - DOM element to add listener to
   * @param eventType - Event type (e.g., 'click')
   * @param listener - Event listener function
   */
  addListener(element: HTMLElement, eventType: string, listener: EventListener): void {
    // Skip if element is null or undefined
    if (!element) {
      logger.warn(`Attempted to add ${eventType} listener to null element`);
      return;
    }

    // Get or create element's listener map
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, new Map());
    }
    
    const elementListeners = this.eventListeners.get(element)!;
    
    // Remove any existing listener for this event type
    if (elementListeners.has(eventType)) {
      element.removeEventListener(eventType, elementListeners.get(eventType)!);
    }
    
    // Add the new listener
    element.addEventListener(eventType, listener);
    elementListeners.set(eventType, listener);
    
    logger.debug(`Added ${eventType} listener to element ${element.id || element.className}`);
  }

  /**
   * Remove a specific event listener
   * @param element - DOM element to remove listener from
   * @param eventType - Event type (e.g., 'click')
   */
  removeListener(element: HTMLElement, eventType: string): void {
    if (!element || !this.eventListeners.has(element)) {
      return;
    }
    
    const elementListeners = this.eventListeners.get(element)!;
    
    if (elementListeners.has(eventType)) {
      element.removeEventListener(eventType, elementListeners.get(eventType)!);
      elementListeners.delete(eventType);
      logger.debug(`Removed ${eventType} listener from element ${element.id || element.className}`);
    }
    
    // Remove element from map if it has no more listeners
    if (elementListeners.size === 0) {
      this.eventListeners.delete(element);
    }
  }

  /**
   * Remove all event listeners for an element
   * @param element - DOM element to remove all listeners from
   */
  removeAllListenersFromElement(element: HTMLElement): void {
    if (!element || !this.eventListeners.has(element)) {
      return;
    }
    
    const elementListeners = this.eventListeners.get(element)!;
    
    // Remove each listener
    elementListeners.forEach((listener, eventType) => {
      element.removeEventListener(eventType, listener);
      logger.debug(`Removed ${eventType} listener from element ${element.id || element.className}`);
    });
    
    // Remove element from map
    this.eventListeners.delete(element);
  }

  /**
   * Remove all tracked event listeners
   */
  removeAllListeners(): void {
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach((listener, eventType) => {
        element.removeEventListener(eventType, listener);
      });
    });
    
    this.eventListeners.clear();
    logger.debug('Removed all event listeners');
  }
}

export default PassiveSkillMenuEventManager;