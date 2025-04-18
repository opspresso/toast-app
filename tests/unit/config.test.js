const Store = require('electron-store');
const { app } = require('electron');

// Mock electron-store
jest.mock('electron-store');

describe('Configuration Store', () => {
  let mockStore;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock implementation
    mockStore = {
      get: jest.fn(),
      set: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      store: {},
    };

    // Make the constructor return our mock
    Store.mockImplementation(() => mockStore);
  });

  test('should create store with correct schema', () => {
    // Import the module that uses electron-store
    const { createConfigStore } = require('../../src/main/config');

    // Call the function that creates the store
    const config = createConfigStore();

    // Verify Store was constructed with the correct schema
    expect(Store).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: expect.objectContaining({
          globalHotkey: expect.any(Object),
          buttons: expect.any(Object),
          appearance: expect.any(Object),
          advanced: expect.any(Object),
        }),
      })
    );

    // Verify the returned object is our mock
    expect(config).toBe(mockStore);
  });

  test('should get configuration values', () => {
    // Setup mock return values
    mockStore.get.mockImplementation((key) => {
      const values = {
        globalHotkey: 'Alt+Space',
        'appearance.theme': 'dark',
        'buttons': [{ name: 'Test Button' }],
      };
      return values[key];
    });

    // Import the module
    const { createConfigStore } = require('../../src/main/config');
    const config = createConfigStore();

    // Test getting values
    expect(config.get('globalHotkey')).toBe('Alt+Space');
    expect(config.get('appearance.theme')).toBe('dark');
    expect(config.get('buttons')).toEqual([{ name: 'Test Button' }]);

    // Verify get was called with correct keys
    expect(mockStore.get).toHaveBeenCalledWith('globalHotkey');
    expect(mockStore.get).toHaveBeenCalledWith('appearance.theme');
    expect(mockStore.get).toHaveBeenCalledWith('buttons');
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
    expect(mockStore.set).toHaveBeenCalledWith('globalHotkey', 'Ctrl+Space');
    expect(mockStore.set).toHaveBeenCalledWith('appearance.theme', 'light');
    expect(mockStore.set).toHaveBeenCalledWith('buttons', [{ name: 'New Button' }]);
  });

  test('should reset to defaults', () => {
    // Import the module
    const { createConfigStore, resetToDefaults } = require('../../src/main/config');
    const config = createConfigStore();

    // Reset to defaults
    resetToDefaults(config);

    // Verify clear was called
    expect(mockStore.clear).toHaveBeenCalled();

    // Verify default values were set
    expect(mockStore.set).toHaveBeenCalledWith(expect.any(String), expect.anything());
  });
});
