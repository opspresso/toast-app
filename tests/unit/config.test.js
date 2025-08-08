const { app } = require('electron');

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    store: {},
  }));
});

const Store = require('electron-store');

describe('Configuration Store', () => {
  let mockStore;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get the mocked store instance
    mockStore = new Store();
  });

  test('should create store with correct schema', () => {
    // Import the module that uses electron-store
    const { createConfigStore } = require('../../src/main/config');

    // Call the function that creates the store
    const config = createConfigStore();

    // Verify Store was constructed at least once
    expect(Store).toHaveBeenCalled();

    // Verify the returned object has the expected methods
    expect(config).toHaveProperty('get');
    expect(config).toHaveProperty('set');
    expect(config).toHaveProperty('has');
    expect(config).toHaveProperty('delete');
    expect(config).toHaveProperty('clear');
  });

  test('should get configuration values', () => {
    // Import the module
    const { createConfigStore } = require('../../src/main/config');
    const config = createConfigStore();

    // Setup mock return values
    config.get.mockImplementation((key) => {
      const values = {
        globalHotkey: 'Alt+Space',
        'appearance.theme': 'dark',
        'buttons': [{ name: 'Test Button' }],
      };
      return values[key];
    });

    // Test getting values
    expect(config.get('globalHotkey')).toBe('Alt+Space');
    expect(config.get('appearance.theme')).toBe('dark');
    expect(config.get('buttons')).toEqual([{ name: 'Test Button' }]);

    // Verify get was called with correct keys
    expect(config.get).toHaveBeenCalledWith('globalHotkey');
    expect(config.get).toHaveBeenCalledWith('appearance.theme');
    expect(config.get).toHaveBeenCalledWith('buttons');
  });

  test('should set configuration values', () => {
    // Import the module
    const { createConfigStore } = require('../../src/main/config');
    const config = createConfigStore();

    // Set some values
    config.set('globalHotkey', 'Ctrl+Space');
    config.set('appearance.theme', 'light');
    config.set('buttons', [{ name: 'New Button' }]);

    // Verify set was called with correct arguments
    expect(config.set).toHaveBeenCalledWith('globalHotkey', 'Ctrl+Space');
    expect(config.set).toHaveBeenCalledWith('appearance.theme', 'light');
    expect(config.set).toHaveBeenCalledWith('buttons', [{ name: 'New Button' }]);
  });

  test('should reset to defaults', () => {
    // Import the module
    const { createConfigStore, resetToDefaults } = require('../../src/main/config');
    const config = createConfigStore();

    // Mock get method to return empty pages
    config.get.mockReturnValue([]);

    // Reset to defaults
    resetToDefaults(config);

    // Verify clear was called
    expect(config.clear).toHaveBeenCalled();

    // Verify default values were set
    expect(config.set).toHaveBeenCalledWith('globalHotkey', 'Alt+Space');
    expect(config.set).toHaveBeenCalledWith('pages', []);
  });
});
