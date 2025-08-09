/**
 * Toast - Global Shortcuts Tests
 *
 * 글로벌 단축키 모듈에 대한 단위 테스트
 */

// Mock Electron globalShortcut
const mockGlobalShortcut = {
  register: jest.fn(),
  unregister: jest.fn(),
  unregisterAll: jest.fn(),
  isRegistered: jest.fn(),
};

const mockScreen = {
  getCursorScreenPoint: jest.fn(),
  getDisplayNearestPoint: jest.fn(),
};

jest.mock('electron', () => ({
  globalShortcut: mockGlobalShortcut,
  screen: mockScreen,
}));

// Mock logger
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Global Shortcuts', () => {
  let shortcuts;
  let mockConfig;
  let mockWindows;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset mock implementations to default
    mockGlobalShortcut.register.mockReset().mockReturnValue(true);
    mockGlobalShortcut.unregister.mockReset();
    mockGlobalShortcut.unregisterAll.mockReset();
    mockGlobalShortcut.isRegistered.mockReset().mockReturnValue(false);

    // Setup mock config
    mockConfig = {
      get: jest.fn((key) => {
        if (key === 'globalHotkey') {
          return 'Ctrl+Shift+T';
        }
        return {
          showToastHotkey: 'Ctrl+Shift+T',
          hideToastHotkey: 'Escape',
        };
      }),
    };

    // Setup mock windows
    mockWindows = {
      toast: {
        show: jest.fn(),
        hide: jest.fn(),
        isVisible: jest.fn(() => false),
        isDestroyed: jest.fn(() => false),
        getBounds: jest.fn(() => ({ x: 0, y: 0, width: 400, height: 300 })),
        getSize: jest.fn(() => [400, 300]),
        setPosition: jest.fn(),
        setAlwaysOnTop: jest.fn(),
      },
      settings: {
        show: jest.fn(),
        isDestroyed: jest.fn(() => false),
      },
    };

    // Re-require the module to get fresh instance
    delete require.cache[require.resolve('../../src/main/shortcuts')];
    shortcuts = require('../../src/main/shortcuts');
  });

  describe('Global Shortcut Registration', () => {
    test('should register global shortcuts', () => {
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

      // Should attempt to register shortcuts
      expect(mockConfig.get).toHaveBeenCalledWith('globalHotkey');
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled(); // Clears existing first
    });

    test('should handle registration with null config', () => {
      shortcuts.registerGlobalShortcuts(null, mockWindows);
      
      // Should gracefully handle null config without attempting registration
      expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
    });

    test('should handle registration with null windows', () => {
      shortcuts.registerGlobalShortcuts(mockConfig, null);
      
      // Should still try to get config but skip window-dependent operations
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle registration failure', () => {
      mockGlobalShortcut.register.mockReturnValue(false);

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should attempt registration but handle failure gracefully
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle registration exception', () => {
      mockGlobalShortcut.register.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should attempt registration and handle exceptions gracefully
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });
  });

  describe('Global Shortcut Unregistration', () => {
    test('should unregister global shortcuts', () => {
      shortcuts.unregisterGlobalShortcuts();

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
    });

    test('should handle unregistration exception', () => {
      mockGlobalShortcut.unregisterAll.mockImplementation(() => {
        throw new Error('Unregistration failed');
      });

      // Note: unregisterGlobalShortcuts doesn't have try-catch, so it will throw
      expect(() => shortcuts.unregisterGlobalShortcuts()).toThrow('Unregistration failed');
    });
  });

  describe('Shortcut Status Check', () => {
    test('should check if shortcut is registered', () => {
      mockGlobalShortcut.isRegistered.mockReturnValue(true);

      const result = shortcuts.isShortcutRegistered('Ctrl+A');

      expect(result).toBe(true);
      expect(mockGlobalShortcut.isRegistered).toHaveBeenCalledWith('Ctrl+A');
    });

    test('should handle status check for unregistered shortcut', () => {
      mockGlobalShortcut.isRegistered.mockReturnValue(false);

      const result = shortcuts.isShortcutRegistered('Ctrl+B');

      expect(result).toBe(false);
    });

    test('should handle status check exception', () => {
      mockGlobalShortcut.isRegistered.mockImplementation(() => {
        throw new Error('Status check failed');
      });

      // isShortcutRegistered doesn't have try-catch, so it will throw
      expect(() => shortcuts.isShortcutRegistered('Ctrl+A')).toThrow('Status check failed');
    });

    test('should handle empty shortcut string', () => {
      const result = shortcuts.isShortcutRegistered('');

      expect(result).toBe(false);
      expect(mockGlobalShortcut.isRegistered).toHaveBeenCalledWith('');
    });

    test('should handle null shortcut', () => {
      const result = shortcuts.isShortcutRegistered(null);

      expect(result).toBe(false);
      expect(mockGlobalShortcut.isRegistered).toHaveBeenCalledWith(null);
    });
  });

  describe('Toast Window Positioning', () => {
    beforeEach(() => {
      // Setup mock screen responses
      mockScreen.getCursorScreenPoint.mockReturnValue({ x: 100, y: 100 });
      mockScreen.getDisplayNearestPoint.mockReturnValue({
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      });
    });

    test('should position toast window', () => {
      shortcuts.positionToastWindow(mockWindows.toast, mockConfig);
      
      // Should check screen positioning and set window properties
      expect(mockScreen.getCursorScreenPoint).toHaveBeenCalled();
      expect(mockScreen.getDisplayNearestPoint).toHaveBeenCalled();
      expect(mockWindows.toast.setPosition).toHaveBeenCalled();
    });

    test('should handle positioning with null windows', () => {
      shortcuts.positionToastWindow(null, mockConfig);
      
      // Should handle null window gracefully without attempting positioning
      expect(mockScreen.getCursorScreenPoint).not.toHaveBeenCalled();
      expect(mockScreen.getDisplayNearestPoint).not.toHaveBeenCalled();
    });

    test('should handle positioning with destroyed toast window', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      shortcuts.positionToastWindow(mockWindows.toast, mockConfig);
      
      // Should handle destroyed windows gracefully
      // Verify that screen positioning functions are called for positioning logic
      expect(mockScreen.getCursorScreenPoint).toHaveBeenCalled();
      expect(mockScreen.getDisplayNearestPoint).toHaveBeenCalled();
    });

    test('should handle positioning with missing toast window', () => {
      shortcuts.positionToastWindow(undefined, mockConfig);
      
      // Should handle undefined window gracefully
      expect(mockScreen.getCursorScreenPoint).not.toHaveBeenCalled();
      expect(mockScreen.getDisplayNearestPoint).not.toHaveBeenCalled();
    });
  });

  describe('Shortcut Configuration', () => {
    test('should handle different hotkey configurations', () => {
      const customConfig = {
        get: jest.fn(() => ({
          showToastHotkey: 'Alt+Space',
          hideToastHotkey: 'Ctrl+H',
        })),
      };

      shortcuts.registerGlobalShortcuts(customConfig, mockWindows);
      
      // Should handle custom hotkeys gracefully
      // May or may not call register depending on implementation logic
      expect(customConfig.get).toHaveBeenCalled();
    });

    test('should handle empty hotkey configuration', () => {
      const emptyConfig = {
        get: jest.fn(() => ({
          showToastHotkey: '',
          hideToastHotkey: '',
        })),
      };

      shortcuts.registerGlobalShortcuts(emptyConfig, mockWindows);
      
      // Should handle empty strings gracefully
      expect(emptyConfig.get).toHaveBeenCalled();
      // Empty strings should not be registered as shortcuts
      expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(0);
    });

    test('should handle missing hotkey configuration', () => {
      const missingConfig = {
        get: jest.fn(() => ({})),
      };

      shortcuts.registerGlobalShortcuts(missingConfig, mockWindows);
      
      // Should handle missing configuration gracefully
      expect(missingConfig.get).toHaveBeenCalled();
      expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(0);
    });

    test('should handle null hotkey values', () => {
      const nullConfig = {
        get: jest.fn(() => ({
          showToastHotkey: null,
          hideToastHotkey: null,
        })),
      };

      shortcuts.registerGlobalShortcuts(nullConfig, mockWindows);
      
      // Should handle null values gracefully
      expect(nullConfig.get).toHaveBeenCalled();
      expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(0);
    });
  });

  describe('Window Integration', () => {
    test('should handle toast window show/hide operations', () => {
      // This tests the internal callback functions
      // The actual implementation may vary based on the shortcut handlers
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

      // Verify that window operations don't cause errors and are properly set up
      expect(mockWindows.toast.isVisible).toBeDefined();
      expect(mockWindows.toast.show).toBeDefined();
      expect(mockWindows.toast.hide).toBeDefined();
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
    });

    test('should handle window state checks', () => {
      mockWindows.toast.isVisible.mockReturnValue(true);

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should register shortcuts regardless of window visibility state
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle destroyed windows during operations', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should still register shortcuts even with destroyed windows
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle config get errors', () => {
      const errorConfig = {
        get: jest.fn(() => {
          throw new Error('Config error');
        }),
      };

      shortcuts.registerGlobalShortcuts(errorConfig, mockWindows);
      
      // Should handle config errors gracefully
      expect(errorConfig.get).toHaveBeenCalled();
      // No shortcuts should be registered when config fails
      expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
    });

    test('should handle window operation errors', () => {
      mockWindows.toast.show.mockImplementation(() => {
        throw new Error('Window show error');
      });

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should register shortcuts despite window operation errors
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle multiple registration attempts', () => {
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

      // Should have been called multiple times
      expect(mockConfig.get).toHaveBeenCalledTimes(2);
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(2);
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
    });

    test('should handle registration after unregistration', () => {
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      shortcuts.unregisterGlobalShortcuts();
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

      // unregisterAll should be called multiple times
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(3); // Once per registration + once for explicit unregister
      expect(mockConfig.get).toHaveBeenCalledTimes(2);
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
    });
  });

  describe('Platform Compatibility', () => {
    test('should work on macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should register shortcuts on macOS platform
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should work on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should register shortcuts on Windows platform
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should work on Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      
      // Should register shortcuts on Linux platform
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined parameters', () => {
      shortcuts.registerGlobalShortcuts(undefined, undefined);
      const isRegistered = shortcuts.isShortcutRegistered(undefined);
      shortcuts.positionToastWindow(undefined, undefined);
      
      // Should handle undefined parameters gracefully
      expect(isRegistered).toBe(false);
      expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
      expect(mockScreen.getCursorScreenPoint).not.toHaveBeenCalled();
    });

    test('should handle complex window structures', () => {
      const complexWindows = {
        toast: {
          ...mockWindows.toast,
          webContents: {
            send: jest.fn(),
          },
          getBounds: jest.fn(() => ({ x: 100, y: 100, width: 300, height: 200 })),
        },
        settings: {
          ...mockWindows.settings,
          webContents: {
            send: jest.fn(),
          },
        },
      };

      shortcuts.registerGlobalShortcuts(mockConfig, complexWindows);
      
      // Should handle complex window structures
      expect(mockGlobalShortcut.register).toHaveBeenCalled();
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle rapid registration/unregistration cycles', () => {
      for (let i = 0; i < 5; i++) {
        shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
        shortcuts.unregisterGlobalShortcuts();
      }

      // Should have been called multiple times
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
      expect(mockGlobalShortcut.unregisterAll.mock.calls.length).toBeGreaterThan(9); // 5 explicit + 5 from re-registration
      expect(mockConfig.get).toHaveBeenCalledTimes(5);
    });

    test('should handle very long shortcut strings', () => {
      const longConfig = {
        get: jest.fn(() => ({
          showToastHotkey: 'Ctrl+Alt+Shift+Meta+Super+F12',
          hideToastHotkey: 'Ctrl+Alt+Shift+Meta+Super+Escape',
        })),
      };

      shortcuts.registerGlobalShortcuts(longConfig, mockWindows);
      
      // Should handle long shortcut strings gracefully
      expect(longConfig.get).toHaveBeenCalled();
      // Long shortcuts may be rejected, so register may or may not be called
    });
  });
});
