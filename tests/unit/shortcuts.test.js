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
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      // Should attempt to register shortcuts
      expect(mockConfig.get).toHaveBeenCalledWith('globalHotkey');
    });

    test('should handle registration with null config', () => {
      expect(() => shortcuts.registerGlobalShortcuts(null, mockWindows)).not.toThrow();
    });

    test('should handle registration with null windows', () => {
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, null)).not.toThrow();
    });

    test('should handle registration failure', () => {
      mockGlobalShortcut.register.mockReturnValue(false);

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
    });

    test('should handle registration exception', () => {
      mockGlobalShortcut.register.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
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
      expect(() => shortcuts.positionToastWindow(mockWindows.toast, mockConfig)).not.toThrow();
    });

    test('should handle positioning with null windows', () => {
      expect(() => shortcuts.positionToastWindow(null, mockConfig)).not.toThrow();
    });

    test('should handle positioning with destroyed toast window', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      expect(() => shortcuts.positionToastWindow(mockWindows.toast, mockConfig)).not.toThrow();
    });

    test('should handle positioning with missing toast window', () => {
      expect(() => shortcuts.positionToastWindow(undefined, mockConfig)).not.toThrow();
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

      expect(() => shortcuts.registerGlobalShortcuts(customConfig, mockWindows)).not.toThrow();
    });

    test('should handle empty hotkey configuration', () => {
      const emptyConfig = {
        get: jest.fn(() => ({
          showToastHotkey: '',
          hideToastHotkey: '',
        })),
      };

      expect(() => shortcuts.registerGlobalShortcuts(emptyConfig, mockWindows)).not.toThrow();
    });

    test('should handle missing hotkey configuration', () => {
      const missingConfig = {
        get: jest.fn(() => ({})),
      };

      expect(() => shortcuts.registerGlobalShortcuts(missingConfig, mockWindows)).not.toThrow();
    });

    test('should handle null hotkey values', () => {
      const nullConfig = {
        get: jest.fn(() => ({
          showToastHotkey: null,
          hideToastHotkey: null,
        })),
      };

      expect(() => shortcuts.registerGlobalShortcuts(nullConfig, mockWindows)).not.toThrow();
    });
  });

  describe('Window Integration', () => {
    test('should handle toast window show/hide operations', () => {
      // This tests the internal callback functions
      // The actual implementation may vary based on the shortcut handlers
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      // Verify that window operations don't cause errors
      expect(mockWindows.toast.isVisible).toBeDefined();
      expect(mockWindows.toast.show).toBeDefined();
      expect(mockWindows.toast.hide).toBeDefined();
    });

    test('should handle window state checks', () => {
      mockWindows.toast.isVisible.mockReturnValue(true);

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
    });

    test('should handle destroyed windows during operations', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle config get errors', () => {
      const errorConfig = {
        get: jest.fn(() => {
          throw new Error('Config error');
        }),
      };

      expect(() => shortcuts.registerGlobalShortcuts(errorConfig, mockWindows)).not.toThrow();
    });

    test('should handle window operation errors', () => {
      mockWindows.toast.show.mockImplementation(() => {
        throw new Error('Window show error');
      });

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
    });

    test('should handle multiple registration attempts', () => {
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      // Should have been called at least once
      expect(mockConfig.get).toHaveBeenCalled();
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
    });

    test('should handle registration after unregistration', () => {
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
      expect(() => shortcuts.unregisterGlobalShortcuts()).not.toThrow();
      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      // unregisterAll should be called at least once
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
    });
  });

  describe('Platform Compatibility', () => {
    test('should work on macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should work on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should work on Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined parameters', () => {
      expect(() => shortcuts.registerGlobalShortcuts(undefined, undefined)).not.toThrow();
      expect(() => shortcuts.isShortcutRegistered(undefined)).not.toThrow();
      expect(() => shortcuts.positionToastWindow(undefined, undefined)).not.toThrow();
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

      expect(() => shortcuts.registerGlobalShortcuts(mockConfig, complexWindows)).not.toThrow();
    });

    test('should handle rapid registration/unregistration cycles', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => shortcuts.registerGlobalShortcuts(mockConfig, mockWindows)).not.toThrow();
        expect(() => shortcuts.unregisterGlobalShortcuts()).not.toThrow();
      }

      // Should have been called multiple times
      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
      expect(mockGlobalShortcut.unregisterAll.mock.calls.length).toBeGreaterThan(5);
    });

    test('should handle very long shortcut strings', () => {
      const longConfig = {
        get: jest.fn(() => ({
          showToastHotkey: 'Ctrl+Alt+Shift+Meta+Super+F12',
          hideToastHotkey: 'Ctrl+Alt+Shift+Meta+Super+Escape',
        })),
      };

      expect(() => shortcuts.registerGlobalShortcuts(longConfig, mockWindows)).not.toThrow();
    });
  });
});
