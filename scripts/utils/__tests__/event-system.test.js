import { EventEmitter, GameEvents, EVENTS } from '../event-system';

describe('EventEmitter', () => {
  let eventEmitter;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
  });

  test('should register event handlers and emit events', () => {
    const mockHandler = jest.fn();
    eventEmitter.on('test', mockHandler);
    
    eventEmitter.emit('test', 'data');
    
    expect(mockHandler).toHaveBeenCalledWith('data');
  });

  test('should unregister event handlers with off', () => {
    const mockHandler = jest.fn();
    eventEmitter.on('test', mockHandler);
    eventEmitter.off('test', mockHandler);
    
    eventEmitter.emit('test', 'data');
    
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('should unregister event handlers with returned function', () => {
    const mockHandler = jest.fn();
    const unsubscribe = eventEmitter.on('test', mockHandler);
    unsubscribe();
    
    eventEmitter.emit('test', 'data');
    
    expect(mockHandler).not.toHaveBeenCalled();
  });

  test('should handle once events', () => {
    const mockHandler = jest.fn();
    eventEmitter.once('test', mockHandler);
    
    eventEmitter.emit('test', 'data1');
    eventEmitter.emit('test', 'data2');
    
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith('data1');
  });

  test('should handle multiple event handlers', () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    
    eventEmitter.on('test', mockHandler1);
    eventEmitter.on('test', mockHandler2);
    
    eventEmitter.emit('test', 'data');
    
    expect(mockHandler1).toHaveBeenCalledWith('data');
    expect(mockHandler2).toHaveBeenCalledWith('data');
  });

  test('should not throw error when emitting event with no handlers', () => {
    expect(() => {
      eventEmitter.emit('nonexistent', 'data');
    }).not.toThrow();
  });

  test('should get all listeners for an event', () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    
    eventEmitter.on('test', mockHandler1);
    eventEmitter.on('test', mockHandler2);
    
    const listeners = eventEmitter.listeners('test');
    
    expect(listeners).toHaveLength(2);
    expect(listeners).toContain(mockHandler1);
    expect(listeners).toContain(mockHandler2);
  });

  test('should remove all listeners for a specific event', () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    
    eventEmitter.on('test1', mockHandler1);
    eventEmitter.on('test2', mockHandler2);
    
    eventEmitter.removeAllListeners('test1');
    
    eventEmitter.emit('test1', 'data');
    eventEmitter.emit('test2', 'data');
    
    expect(mockHandler1).not.toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
  });

  test('should remove all listeners for all events', () => {
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    
    eventEmitter.on('test1', mockHandler1);
    eventEmitter.on('test2', mockHandler2);
    
    eventEmitter.removeAllListeners();
    
    eventEmitter.emit('test1', 'data');
    eventEmitter.emit('test2', 'data');
    
    expect(mockHandler1).not.toHaveBeenCalled();
    expect(mockHandler2).not.toHaveBeenCalled();
  });
});

describe('GameEvents', () => {
  test('should be an instance of EventEmitter', () => {
    expect(GameEvents).toBeInstanceOf(EventEmitter);
  });
});

describe('EVENTS', () => {
  test('should contain event constants', () => {
    expect(EVENTS.GAME_INIT).toBe('game:init');
    expect(EVENTS.PLAYER_DAMAGE).toBe('player:damage');
    expect(EVENTS.ENEMY_DEATH).toBe('enemy:death');
    // Add more constants as needed
  });
});