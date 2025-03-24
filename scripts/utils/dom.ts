/**
 * DOM utilities
 * Helper functions for DOM manipulation
 * 
 * This module provides both imperative and declarative approaches to DOM manipulation.
 * For more complex UI elements, prefer the template-based approach from dom-templates.ts.
 */

// Constants are dynamically loaded to avoid circular dependencies

/**
 * Attributes object for createElement function
 */
interface ElementAttributes {
  [key: string]:
    | string
    | number
    | Record<string, string | number>
    | null
    | undefined;
}

/**
 * Progress bar options
 */
interface ProgressBarOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  fillColor?: string;
  containerClass?: string;
  fillClass?: string;
}

/**
 * Progress bar components
 */
interface ProgressBar {
  container: HTMLElement;
  fill: HTMLElement;
  setValue: (value: number) => void;
}

/**
 * Tooltip options
 */
interface TooltipOptions {
  className?: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Position element options
 */
interface PositionOptions {
  offsetX?: number;
  offsetY?: number;
  centerX?: boolean;
  centerY?: boolean;
}

/**
 * Create an element with attributes and content
 * @param tag - Tag name
 * @param attributes - Element attributes
 * @param content - Element content
 * @returns Created element
 */
export function createElement(
  tag: string,
  attributes: ElementAttributes = {},
  content: string | HTMLElement | Array<string | HTMLElement> | null = null
): HTMLElement {
  const element = document.createElement(tag);

  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (key === "className") {
      element.className = value as string;
    } else if (key === "style" && typeof value === "object") {
      for (const [prop, val] of Object.entries(value)) {
        if (val !== null && val !== undefined) {
          (element.style as any)[prop] = val;
        }
      }
    } else {
      element.setAttribute(key, value.toString());
    }
  }

  // Add content
  if (content !== null) {
    if (Array.isArray(content)) {
      content.forEach((item) => {
        if (typeof item === "string") {
          element.appendChild(document.createTextNode(item));
        } else if (item instanceof HTMLElement) {
          element.appendChild(item);
        }
      });
    } else if (typeof content === "string") {
      element.textContent = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    }
  }

  return element;
}

/**
 * Remove all children from an element
 * @param element - Element to clear
 */
export function clearElement(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Set element styles
 * @param element - Element to style
 * @param styles - Styles to apply
 */
export function setStyles(
  element: HTMLElement,
  styles: Record<string, string | number>
): void {
  for (const [prop, value] of Object.entries(styles)) {
    (element.style as any)[prop] = value;
  }
}

/**
 * Create a progress bar element
 * @param value - Initial value (0-100)
 * @param options - Options (width, height, backgroundColor, fillColor)
 * @returns Progress bar components {container, fill, setValue}
 */
export function createProgressBar(
  value: number = 100,
  options: ProgressBarOptions = {}
): ProgressBar {
  // Import the template engine on-demand to avoid circular dependencies
  const { Templates } = require('./dom-templates');
  
  // Create progress bar using template
  const container = Templates.progressBar({
    width: options.width || 100,
    height: options.height || 10,
    backgroundColor: options.backgroundColor || "#333",
    fillColor: options.fillColor || "#4b0082",
    className: options.containerClass || "progress-bar-container",
    fillClassName: options.fillClass || "progress-bar-fill",
    value
  });
  
  // Get the fill element
  const fill = container.querySelector(".progress-bar-fill") as HTMLElement;
  
  // Return components and setValue function
  return {
    container,
    fill,
    setValue: (newValue: number) => {
      fill.style.width = `${newValue}%`;
    },
  };
}

/**
 * Create a tooltip element
 * @param text - Tooltip text
 * @param options - Options (className, backgroundColor, textColor)
 * @returns Tooltip element
 */
export function createTooltip(
  text: string,
  options: TooltipOptions = {}
): HTMLElement {
  // Import the template engine on-demand to avoid circular dependencies
  const { Templates } = require('./dom-templates');
  
  // Create tooltip using template
  return Templates.tooltip({
    text,
    className: options.className || "tooltip",
    backgroundColor: options.backgroundColor || "rgba(0, 0, 0, 0.8)",
    textColor: options.textColor || "white"
  });
}

/**
 * Position an element at specific coordinates
 * @param element - Element to position
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param options - Options (offsetX, offsetY, centerX, centerY)
 */
export function positionElement(
  element: HTMLElement,
  x: number,
  y: number,
  options: PositionOptions = {}
): void {
  const offsetX = options.offsetX || 0;
  const offsetY = options.offsetY || 0;

  let posX = x;
  let posY = y;

  if (options.centerX) {
    posX = x - element.offsetWidth / 2;
  }

  if (options.centerY) {
    posY = y - element.offsetHeight / 2;
  }

  element.style.left = posX + offsetX + "px";
  element.style.top = posY + offsetY + "px";
}

export default {
  createElement,
  clearElement,
  setStyles,
  createProgressBar,
  createTooltip,
  positionElement,
};
