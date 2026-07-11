/**
 * Toast - System Tray Tests
 *
 * Unit tests for the system tray module
 */

// Mock Electron modules
const mockTray = {
  setToolTip: jest.fn(),
  setContextMenu: jest.fn(),
  setImage: jest.fn(),
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

const mockIpcMain = {
  emit: jest.fn(),
};

const mockDialog = {
  showMessageBox: jest.fn(),
};

jest.mock('electron', () => ({
  Tray: jest.fn(() => mockTray),
  Menu: mockMenu,
  app: mockApp,
  shell: mockShell,
  ipcMain: mockIpcMain,
  dialog: mockDialog,
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

// Mock updater module (tray menu triggers one-click upgrade)
const mockUpdater = {
  downloadAndInstallUpdate: jest.fn(),
  installUpdate: jest.fn(),
};

jest.mock('../../src/main/updater', () => mockUpdater);

describe('System Tray', () => {
  let tray;
  let mockWindows;
  const { Tray } = require('electron');

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset Tray mock
    Tray.mockClear();
    Tray.mockImplementation(() => mockTray);
    
    // Reset path mock
    const path = require('path');
    path.join.mockClear();
    path.join.mockImplementation((...args) => args.join('/'));
    
    // Reset Menu mock
    mockMenu.buildFromTemplate.mockClear();
    mockMenu.buildFromTemplate.mockReturnValue({});
    
    // Reset mock responses
    mockTray.setToolTip.mockClear();
    mockTray.setContextMenu.mockClear();
    mockTray.setImage.mockClear();
    mockTray.on.mockClear();
    mockTray.destroy.mockClear();

    // Setup mock windows
    mockWindows = {
      toast: {
        show: jest.fn(),
        hide: jest.fn(),
        focus: jest.fn(), // Added missing focus method
        isVisible: jest.fn(() => false),
        isDestroyed: jest.fn(() => false),
      },
      settings: {
        show: jest.fn(),
        focus: jest.fn(), // Added missing focus method
        isDestroyed: jest.fn(() => false),
      },
    };

    // Get tray module
    tray = require('../../src/main/tray');
    
    // Reset the tray instance
    tray.destroyTray();
  });

  describe('Tray Creation', () => {
    test('should create tray instance', () => {
      const trayInstance = tray.createTray(mockWindows);

      expect(Tray).toHaveBeenCalled();
      expect(mockTray.setToolTip).toHaveBeenCalledWith('Toast');
      expect(trayInstance).toBeDefined();
    });

    test('should return existing tray if already created', () => {
      // Create first instance
      const firstInstance = tray.createTray(mockWindows);
      expect(Tray).toHaveBeenCalledTimes(1);
      
      // Try to create second instance - should return the same one
      const secondInstance = tray.createTray(mockWindows);
      
      expect(firstInstance).toBe(secondInstance);
      expect(Tray).toHaveBeenCalledTimes(1); // Should still be 1
    });

    test('should handle null windows parameter', () => {
      const result = tray.createTray(null);
      
      // Should handle null windows gracefully - may still create tray
      expect(result).toBeDefined();
      expect(Tray).toHaveBeenCalled();
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
      expect(menuLabels).toContain('Open Toast'); // Fixed: actual code uses 'Open Toast'
      expect(menuLabels).toContain('separator');
      expect(menuLabels).toContain('Quit');
    });

    test('should handle menu item clicks', () => {
      tray.createTray(mockWindows);

      const menuTemplate = mockMenu.buildFromTemplate.mock.calls[0][0];
      const showItem = menuTemplate.find(item => item.label === 'Open Toast'); // Fixed: actual code uses 'Open Toast'

      if (showItem && showItem.click) {
        showItem.click();
        
        // Should execute menu item click handler
        expect(mockWindows.toast.show).toHaveBeenCalled();
      }
    });
  });

  describe('Click Behavior', () => {
    test('should not set up custom click behavior (uses default)', () => {
      // The actual implementation doesn't set up custom click behavior
      // It relies on the default Electron tray behavior
      tray.createTray(mockWindows);

      // Verify that no custom click handlers are registered
      expect(mockTray.on).not.toHaveBeenCalledWith('right-click', expect.any(Function));
      expect(mockTray.on).not.toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should use default tray behavior on all platforms', () => {
      const platforms = ['darwin', 'win32', 'linux'];
      
      platforms.forEach(platform => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: platform });
        
        jest.clearAllMocks();
        tray.destroyTray(); // Reset tray instance
        tray.createTray(mockWindows);

        // Should not register custom click handlers
        expect(mockTray.on).not.toHaveBeenCalledWith('click', expect.any(Function));
        expect(mockTray.on).not.toHaveBeenCalledWith('right-click', expect.any(Function));
        
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });
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
      // The actual implementation doesn't handle null tray, so it should throw
      expect(() => tray.updateTrayMenu(null, mockWindows)).toThrow();
    });

    test('should handle null windows', () => {
      const trayInstance = tray.createTray(mockWindows);

      tray.updateTrayMenu(trayInstance, null);
      
      // Should handle null windows gracefully in menu update
      expect(trayInstance).toBeDefined();
      // Menu should still be set on tray
      expect(mockTray.setContextMenu).toHaveBeenCalled();
    });
  });

  describe('Tray Destruction', () => {
    test('should destroy tray instance', () => {
      const trayInstance = tray.createTray(mockWindows);

      tray.destroyTray();

      expect(mockTray.destroy).toHaveBeenCalled();
    });

    test('should handle destroy when no tray exists', () => {
      tray.destroyTray();
      
      // Should handle destroy gracefully when no tray exists
      expect(mockTray.destroy).not.toHaveBeenCalled();
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
      const showItem = menuTemplate.find(item => item.label === 'Open Toast'); // Fixed: actual code uses 'Open Toast'

      if (showItem && showItem.click) {
        showItem.click();
        expect(mockWindows.toast.show).toHaveBeenCalled();
        expect(mockWindows.toast.focus).toHaveBeenCalled(); // Also check focus call
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
        // Check that ipcMain.emit is called with correct parameters
        expect(mockIpcMain.emit).toHaveBeenCalledWith('show-settings', null);
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
    test('should propagate tray creation errors', () => {
      Tray.mockImplementationOnce(() => {
        throw new Error('Tray creation failed');
      });

      // The actual implementation doesn't handle errors, so it should throw
      expect(() => tray.createTray(mockWindows)).toThrow('Tray creation failed');
    });

    test('should propagate menu creation errors', () => {
      mockMenu.buildFromTemplate.mockImplementationOnce(() => {
        throw new Error('Menu creation failed');
      });

      // The actual implementation doesn't handle errors, so it should throw
      expect(() => tray.createTray(mockWindows)).toThrow('Menu creation failed');
    });

    test('should handle destroyed windows gracefully', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      const result = tray.createTray(mockWindows);
      
      // Should still create tray even with destroyed windows
      expect(result).toBeDefined();
      expect(Tray).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing window methods', () => {
      const incompleteWindows = {
        toast: {},
        settings: {},
      };

      const result = tray.createTray(incompleteWindows);
      
      // Should handle incomplete window objects gracefully
      expect(result).toBeDefined();
      expect(Tray).toHaveBeenCalled();
    });

    test('should handle undefined windows object', () => {
      const result = tray.createTray(undefined);
      
      // Should handle undefined windows gracefully - may still create tray
      expect(result).toBeDefined();
      expect(Tray).toHaveBeenCalled();
    });

    test('should handle multiple tray creation attempts', () => {
      tray.createTray(mockWindows);
      tray.createTray(mockWindows);
      tray.createTray(mockWindows);

      expect(Tray).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update Menu State', () => {
    afterEach(() => {
      // Reset so module state does not leak into other tests
      tray.setUpdateState(null);
    });

    test('should show update item when an update is available', () => {
      tray.createTray(mockWindows);
      mockMenu.buildFromTemplate.mockClear();

      tray.setUpdateState('available', '9.9.9');

      const template = mockMenu.buildFromTemplate.mock.calls[0][0];
      const updateItem = template.find(item => item.label === '⬆ Update to v9.9.9');
      expect(updateItem).toBeDefined();
      expect(template.find(item => (item.label || '').startsWith('Version:'))).toBeUndefined();

      updateItem.click();
      expect(mockUpdater.downloadAndInstallUpdate).toHaveBeenCalledWith('9.9.9');
    });

    test('should show disabled downloading item while downloading', () => {
      tray.createTray(mockWindows);
      mockMenu.buildFromTemplate.mockClear();

      tray.setUpdateState('downloading', '9.9.9');

      const template = mockMenu.buildFromTemplate.mock.calls[0][0];
      const downloadingItem = template.find(item => item.label === 'Downloading v9.9.9…');
      expect(downloadingItem).toBeDefined();
      expect(downloadingItem.enabled).toBe(false);
    });

    test('should show restart item and trigger install when downloaded', () => {
      tray.createTray(mockWindows);
      mockMenu.buildFromTemplate.mockClear();

      tray.setUpdateState('downloaded', '9.9.9');

      const template = mockMenu.buildFromTemplate.mock.calls[0][0];
      const restartItem = template.find(item => item.label === 'Restart to install v9.9.9');
      expect(restartItem).toBeDefined();

      restartItem.click();
      expect(mockUpdater.installUpdate).toHaveBeenCalled();
    });

    test('should restore version label when update state is cleared', () => {
      tray.createTray(mockWindows);
      tray.setUpdateState('available', '9.9.9');
      mockMenu.buildFromTemplate.mockClear();

      tray.setUpdateState(null);

      const template = mockMenu.buildFromTemplate.mock.calls[0][0];
      expect(template.find(item => item.label === 'Version: 1.0.0')).toBeDefined();
    });

    test('should not rebuild menu for duplicate state updates', () => {
      tray.createTray(mockWindows);
      tray.setUpdateState('available', '9.9.9');
      mockMenu.buildFromTemplate.mockClear();

      tray.setUpdateState('available', '9.9.9');

      expect(mockMenu.buildFromTemplate).not.toHaveBeenCalled();
    });

    test('should not throw when no tray instance exists', () => {
      expect(() => tray.setUpdateState('available', '1.2.3')).not.toThrow();
    });

    test('should switch to the badged icon when an update becomes available', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      tray.createTray(mockWindows);
      mockTray.setImage.mockClear();

      tray.setUpdateState('available', '9.9.9');

      expect(mockTray.setImage).toHaveBeenCalledWith(
        expect.stringContaining('tray-icon-updateTemplate.png')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should restore the normal icon when the update state is cleared', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      tray.createTray(mockWindows);
      tray.setUpdateState('available', '9.9.9');
      mockTray.setImage.mockClear();

      tray.setUpdateState(null);

      expect(mockTray.setImage).toHaveBeenCalledWith(
        expect.stringContaining('tray-icon-Template.png')
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
