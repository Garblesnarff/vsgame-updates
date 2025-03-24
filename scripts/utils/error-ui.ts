/**
 * Error UI utilities for displaying user-friendly error messages
 */
import { ErrorSeverity, GameError, isGameError } from './error-handler';
import { createLogger } from './logger';

// Create a logger for the error UI
const logger = createLogger('ErrorUI');

/**
 * Display a toast notification for an error
 * @param error - Error to display
 * @param duration - Duration in milliseconds to show the toast
 */
export function showErrorToast(
  error: Error | GameError | string,
  duration = 5000
): void {
  // Get container for toast notifications
  let container = document.getElementById('error-toast-container');
  
  // Create container if it doesn't exist
  if (!container) {
    container = document.createElement('div');
    container.id = 'error-toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9995';
    document.body.appendChild(container);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  
  // Set content based on error type
  let title = 'Error';
  let message = '';
  
  if (typeof error === 'string') {
    message = error;
  } else if (isGameError(error)) {
    // Use severity to determine title
    switch (error.severity) {
      case ErrorSeverity.LOW:
        title = 'Notice';
        break;
      case ErrorSeverity.MEDIUM:
        title = 'Warning';
        break;
      case ErrorSeverity.HIGH:
        title = 'Error';
        break;
    }
    
    // Set message
    message = error.message;
  } else {
    // Regular Error object
    message = error.message || 'An unknown error occurred';
  }
  
  // Set toast content
  toast.innerHTML = `
    <div class="error-toast-title">${title}</div>
    <div class="error-toast-message">${message}</div>
  `;
  
  // At this point, container is guaranteed to exist because we created it if it didn't exist
  container.appendChild(toast);
  
  // Store container in a variable to ensure it's captured in the closure
  const containerRef = container;
  
  // Remove after duration
  setTimeout(() => {
    if (toast.parentNode === containerRef) {
      toast.parentNode.removeChild(toast);
    }
  }, duration);
  
  logger.debug(`Displayed error toast: ${title} - ${message}`);
}

/**
 * Show a full-screen error message for critical errors
 * @param message - Error message to display
 */
export function showCriticalError(message: string): void {
  // Check if error container already exists
  if (document.querySelector('.error-container')) {
    return; // Don't show multiple critical errors
  }
  
  // Create error container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-container';
  
  // Set content
  errorContainer.innerHTML = `
    <div class="error-message">
      <h2>Oops! Something went wrong</h2>
      <p>${message}</p>
      <p>Please try refreshing the page. If the problem persists, clear your browser cache.</p>
      <button id="error-refresh">Refresh Page</button>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(errorContainer);
  
  // Add refresh button handler
  const refreshButton = document.getElementById('error-refresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  logger.error(`Displayed critical error: ${message}`);
}

/**
 * Show a storage warning banner
 * @param message - Warning message to display
 */
export function showStorageWarning(message: string): void {
  // Check if warning already exists
  if (document.querySelector('.storage-warning')) {
    return;
  }
  
  // Create warning element
  const warningEl = document.createElement('div');
  warningEl.className = 'storage-warning';
  warningEl.textContent = message;
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.marginLeft = '10px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '18px';
  
  // Add click handler to close button
  closeButton.addEventListener('click', () => {
    if (warningEl.parentNode) {
      warningEl.parentNode.removeChild(warningEl);
    }
  });
  
  // Add close button to warning
  warningEl.appendChild(closeButton);
  
  // Add to beginning of document body
  document.body.insertBefore(warningEl, document.body.firstChild);
  
  logger.warn(`Displayed storage warning: ${message}`);
}

/**
 * Display a game-friendly error message in the game UI
 * @param message - Error message to display
 * @param duration - Duration in milliseconds to show the message (0 for indefinite)
 * @returns The created error element for potential later removal
 */
export function showGameError(message: string, duration = 3000): HTMLDivElement | null {
  // Get game container
  const gameContainer = document.getElementById('game-container');
  if (!gameContainer) {
    // Fallback to toast if game container not found
    showErrorToast(message, duration);
    return null;
  }
  
  // Create error element
  const errorEl = document.createElement('div');
  errorEl.className = 'game-error';
  errorEl.textContent = message;
  errorEl.style.position = 'absolute';
  errorEl.style.bottom = '20px';
  errorEl.style.left = '50%';
  errorEl.style.transform = 'translateX(-50%)';
  errorEl.style.backgroundColor = 'rgba(50, 0, 0, 0.8)';
  errorEl.style.color = '#ff6666';
  errorEl.style.padding = '10px 20px';
  errorEl.style.borderRadius = '5px';
  errorEl.style.border = '1px solid #ff0000';
  errorEl.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
  errorEl.style.zIndex = '9990';
  errorEl.style.textAlign = 'center';
  errorEl.style.fontSize = '16px';
  errorEl.style.fontWeight = 'bold';
  
  // Add to game container
  gameContainer.appendChild(errorEl);
  
  // Store gameContainer reference for the closure
  const containerRef = gameContainer;
  
  // Remove after duration (if not indefinite)
  if (duration > 0) {
    setTimeout(() => {
      if (errorEl.parentNode === containerRef) {
        containerRef.removeChild(errorEl);
      }
    }, duration);
  }
  
  logger.warn(`Displayed game error: ${message}`);
  
  // Return the element for potential manual removal later
  return errorEl;
}

/**
 * Remove a game error message
 * @param errorElement - Error element to remove
 */
export function removeGameError(errorElement: HTMLElement): void {
  if (errorElement && errorElement.parentNode) {
    errorElement.parentNode.removeChild(errorElement);
    logger.debug('Removed game error element');
  }
}

// Export default object for easy importing
export default {
  showErrorToast,
  showCriticalError,
  showStorageWarning,
  showGameError,
  removeGameError
};
