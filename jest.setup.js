// Mock browser globals
window.innerWidth = 1024;
window.innerHeight = 768;

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));

// Mock DOM properties/methods used by the game
document.createElement = jest.fn().mockImplementation(tag => {
  const element = {
    style: {},
    className: '',
    id: '',
    innerHTML: '',
    appendChild: jest.fn(),
    parentNode: {
      removeChild: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
  
  return element;
});

// Mock audio functionality
window.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(),
  pause: jest.fn(),
  load: jest.fn(),
  oncanplaythrough: null,
  onerror: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  cloneNode: jest.fn().mockReturnThis()
}));

// Mock image functionality
window.Image = jest.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));