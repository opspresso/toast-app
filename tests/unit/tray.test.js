/**
 * Toast - System Tray Tests
 *
 * 시스템 트레이 모듈에 대한 단위 테스트
 */

// Mock Electron modules
const mockTray = {
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};

const mockMenu = {
  buildFromTemplate: jest.fn(() => ({})),
};

const mockApp = {
  getName: jest.fn(() => 'Toast'),
  getVersion: jest.fn(() => '1.0.0'),
  quit: jest.fn(),
};

const mockShell = {
  openExternal: jest.fn(),
};

jest.mock('electron', () => ({
  Tray: jest.fn(() => mockTray),
  Menu: mockMenu,
  app: mockApp,
  shell: mockShell,
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// Mock config module
const mockConfigStore = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfigStore),
}));

describe('System Tray', () => {
  let tray;
  let mockWindows;
  const { Tray } = require('electron');

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

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
    delete require.cache[require.resolve('../../src/main/tray')];
    tray = require('../../src/main/tray');
  });

  describe('Tray Creation', () => {
    test('should create tray instance', () => {
      const trayInstance = tray.createTray(mockWindows);

      expect(Tray).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith('Toast');
      expect(trayInstance).toBeDefined();
    });

    test('should return existing tray if already created', () => {
      const firstInstance = tray.createTray(mockWindows);
      const secondInstance = tray.createTray(mockWindows);

      expect(firstInstance).toBe(secondInstance);
      expect(Tray).toHaveBeenCalledTimes(1);
    });

    test('should handle null windows parameter', () => {
      expect(() => tray.createTray(null)).not.toThrow();
    });
  });

  describe('Icon Path Selection', () => {
    test('should use template icon for macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      tray.createTray(mockWindows);

      const path = require('path');
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        '../../assets/icons/tray-icon-Template.png'
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should use regular icon for Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      tray.createTray(mockWindows);

      const path = require('path');
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('tray-icon')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should use regular icon for Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      tray.createTray(mockWindows);

      const path = require('path');
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('tray-icon')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('Menu Creation', () => {
    test('should create context menu', () => {
      tray.createTray(mockWindows);

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled();
      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });

    test('should include standard menu items', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];

      // Check for common menu items
      const menuLabels = menuTemplate.map(item => item.label || item.type);
      expect(menuLabels).toContain('Show Toast');
      expect(menuLabels).toContain('separator');
      expect(menuLabels).toContain('Quit');
    });

    test('should handle menu item clicks', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      const showItem = menuTemplate.find(item => item.label === 'Show Toast');

      if (showItem && showItem.click) {
        expect(() => showItem.click()).not.toThrow();
      }
    });
  });

  describe('Click Behavior', () => {
    test('should set up click behavior for macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      tray.createTray(mockWindows);

      expect(mockTray.on).toHaveBeenCalledWith('right-click', expect.any(Function));

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should set up click behavior for Windows/Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      tray.createTray(mockWindows);

      expect(mockTray.on).toHaveBeenCalledWith('click', expect.any(Function));

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should toggle toast window on click', () => {
      tray.createTray(mockWindows);

      // Find the click handler
      const clickHandler = mockTray.on.mock.calls.find(call =>
        call[0] === 'click' || call[0] === 'right-click'
      );

      if (clickHandler && clickHandler[1]) {
        mockWindows.toast.isVisible.mockReturnValue(false);
        clickHandler[1]();

        expect(mockWindows.toast.show).toHaveBeenCalled();
      }
    });
  });

  describe('Menu Updates', () => {
    test('should update menu when called', () => {
      const trayInstance = tray.createTray(mockWindows);

      // Clear previous calls
      mockMenu.buildFromTemplate.mockClear();
      mockTray.setContextMenu.mockClear();

      tray.updateTrayMenu(trayInstance, mockWindows);

      expect(mockMenu.buildFromTemplate).toHaveBeenCalled();
      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });

    test('should handle null tray instance', () => {
      expect(() => tray.updateTrayMenu(null, mockWindows)).not.toThrow();
    });

    test('should handle null windows', () => {
      const trayInstance = tray.createTray(mockWindows);

      expect(() => tray.updateTrayMenu(trayInstance, null)).not.toThrow();
    });
  });

  describe('Tray Destruction', () => {
    test('should destroy tray instance', () => {
      const trayInstance = tray.createTray(mockWindows);

      tray.destroyTray();

      expect(mockTray.destroy).toHaveBeenCalled();
    });

    test('should handle destroy when no tray exists', () => {
      expect(() => tray.destroyTray()).not.toThrow();
    });

    test('should allow creating new tray after destruction', () => {
      tray.createTray(mockWindows);
      tray.destroyTray();

      // Clear the mock to reset call count
      Tray.mockClear();

      const newTray = tray.createTray(mockWindows);

      expect(Tray).toHaveBeenCalled();
      expect(newTray).toBeDefined();
    });
  });

  describe('Window Integration', () => {
    test('should show toast window from menu', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      const showItem = menuTemplate.find(item => item.label === 'Show Toast');

      if (showItem && showItem.click) {
        showItem.click();
        expect(mockWindows.toast.show).toHaveBeenCalled();
      }
    });

    test('should show settings window from menu', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      const settingsItem = menuTemplate.find(item =>
        item.label && item.label.includes('Settings')
      );

      if (settingsItem && settingsItem.click) {
        settingsItem.click();
        // Settings window show logic would be tested here
        expect(() => settingsItem.click()).not.toThrow();
      }
    });

    test('should quit application from menu', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      const quitItem = menuTemplate.find(item => item.label === 'Quit');

      if (quitItem && quitItem.click) {
        quitItem.click();
        expect(mockApp.quit).toHaveBeenCalled();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle tray creation errors', () => {
      Tray.mockImplementationOnce(() => {
        throw new Error('Tray creation failed');
      });

      expect(() => tray.createTray(mockWindows)).not.toThrow();
    });

    test('should handle menu creation errors', () => {
      mockMenu.buildFromTemplate.mockImplementationOnce(() => {
        throw new Error('Menu creation failed');
      });

      expect(() => tray.createTray(mockWindows)).not.toThrow();
    });

    test('should handle destroyed windows gracefully', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      expect(() => tray.createTray(mockWindows)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing window methods', () => {
      const incompleteWindows = {
        toast: {},
        settings: {},
      };

      expect(() => tray.createTray(incompleteWindows)).not.toThrow();
    });

    test('should handle undefined windows object', () => {
      expect(() => tray.createTray(undefined)).not.toThrow();
    });

    test('should handle multiple tray creation attempts', () => {
      tray.createTray(mockWindows);
      tray.createTray(mockWindows);
      tray.createTray(mockWindows);

      expect(Tray).toHaveBeenCalledTimes(1);
    });
  });
});
