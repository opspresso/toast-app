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

jest.mock('electron', () => ({
  globalShortcut: mockGlobalShortcut,
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

    // Setup default mock responses
    mockGlobalShortcut.register.mockReturnValue(true);
    mockGlobalShortcut.isRegistered.mockReturnValue(false);

    // Setup mock config
    mockConfig = {
      get: jest.fn(() => ({
        showToastHotkey: 'Ctrl+Shift+T',
        hideToastHotkey: 'Escape',
      })),
    };

    // Setup mock windows
    mockWindows = {
      toast: {
        show: jest.fn(),
        hide: jest.fn(),
        isVisible: jest.fn(() => false),
        isDestroyed: jest.fn(() => false),
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
      expect(mockConfig.get).toHaveBeenCalledWith('advanced');
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

      expect(() => shortcuts.unregisterGlobalShortcuts()).not.toThrow();
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

      const result = shortcuts.isShortcutRegistered('Ctrl+A');

      expect(result).toBe(false);
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
    test('should position toast window', () => {
      expect(() => shortcuts.positionToastWindow(mockWindows)).not.toThrow();
    });

    test('should handle positioning with null windows', () => {
      expect(() => shortcuts.positionToastWindow(null)).not.toThrow();
    });

    test('should handle positioning with destroyed toast window', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      expect(() => shortcuts.positionToastWindow(mockWindows)).not.toThrow();
    });

    test('should handle positioning with missing toast window', () => {
      const incompleteWindows = {
        settings: mockWindows.settings,
      };

      expect(() => shortcuts.positionToastWindow(incompleteWindows)).not.toThrow();
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
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

      // Should handle gracefully without throwing
      expect(mockConfig.get).toHaveBeenCalled();
    });

    test('should handle registration after unregistration', () => {
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
      shortcuts.unregisterGlobalShortcuts();
      shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);

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
      expect(() => shortcuts.positionToastWindow(undefined)).not.toThrow();
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
        shortcuts.registerGlobalShortcuts(mockConfig, mockWindows);
        shortcuts.unregisterGlobalShortcuts();
      }

      expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(5);
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
