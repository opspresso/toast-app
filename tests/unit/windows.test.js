/**
 * Toast - Windows Management Tests
 *
 * 윈도우 관리 모듈에 대한 단위 테스트
 */

// Mock dependencies
const mockWindow = {
  isDestroyed: jest.fn(() => false),
  setOpacity: jest.fn(),
  loadFile: jest.fn(),
  getPosition: jest.fn(() => [100, 100]),
  setPosition: jest.fn(),
  getBounds: jest.fn(() => ({ width: 800, height: 600 })),
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  close: jest.fn(),
  isVisible: jest.fn(() => true),
  isFullScreen: jest.fn(() => false),
  setAlwaysOnTop: jest.fn(),
  setVisibleOnAllWorkspaces: jest.fn(),
  getNativeWindowHandle: jest.fn(() => 'mock-handle'),
  webContents: {
    openDevTools: jest.fn(),
    send: jest.fn(),
    once: jest.fn((event, callback) => {
      if (event === 'did-finish-load' || event === 'ready-to-show') {
        setTimeout(callback, 0);
      }
    }),
  },
  on: jest.fn(),
  once: jest.fn((event, callback) => {
    if (event === 'ready-to-show') {
      setTimeout(callback, 0);
    }
  }),
};

const mockBrowserWindow = jest.fn(() => mockWindow);
mockBrowserWindow.getAllWindows = jest.fn(() => [mockWindow]);
mockBrowserWindow.getFocusedWindow = jest.fn(() => mockWindow);

const mockScreen = {
  getDisplayNearestPoint: jest.fn(() => ({
    id: 1,
    workArea: { x: 0, y: 0, width: 1920, height: 1080 },
  })),
  getCursorScreenPoint: jest.fn(() => ({ x: 960, y: 540 })),
  getAllDisplays: jest.fn(() => [
    { id: 1, workArea: { x: 0, y: 0, width: 1920, height: 1080 } }
  ]),
};

jest.mock('electron', () => ({
  BrowserWindow: mockBrowserWindow,
  app: {
    isQuitting: false,
  },
  screen: mockScreen,
}));

jest.mock('path', () => ({
  join: jest.fn((...parts) => parts.join('/')),
}));

jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('../../src/main/shortcuts', () => ({
  positionToastWindow: jest.fn(),
}));

jest.mock('../../src/main/ipc', () => ({
  isModalOpened: jest.fn(() => false),
}));

jest.mock('../../src/main/api/auth', () => ({
  isLoginProcessActive: jest.fn(() => false),
}));

const {
  createToastWindow,
  createSettingsWindow,
  showToastWindow,
  hideToastWindow,
  showSettingsWindow,
  closeAllWindows,
  windows,
  positionSettingsWindowOnToastDisplay,
} = require('../../src/main/windows');

const { positionToastWindow } = require('../../src/main/shortcuts');
const { isModalOpened } = require('../../src/main/ipc');
const { isLoginProcessActive } = require('../../src/main/api/auth');
const { app } = require('electron');

describe('Windows Management', () => {
  let mockConfig;
  let originalNodeEnv;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Clear windows references
    windows.toast = null;
    windows.settings = null;

    // Reset app state
    app.isQuitting = false;

    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Setup mock config
    mockConfig = {
      get: jest.fn((key) => {
        const config = {
          'appearance.opacity': 0.95,
          'advanced.showInTaskbar': false,
          'appearance.size': 'medium',
          'advanced.hideOnBlur': true,
          'pages': ['page1', 'page2'],
          'appearance': { theme: 'dark' },
          'subscription': { active: true },
          'appearance.monitorPositions': {},
        };
        return config[key];
      }),
      set: jest.fn(),
    };

    // Reset mock implementations
    mockWindow.isDestroyed.mockReturnValue(false);
    mockWindow.isVisible.mockReturnValue(true);
    mockWindow.isFullScreen.mockReturnValue(false);
    isModalOpened.mockReturnValue(false);
    isLoginProcessActive.mockReturnValue(false);
    mockBrowserWindow.getFocusedWindow.mockReturnValue(mockWindow);
  });

  afterEach(() => {
    // Restore NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('createToastWindow', () => {
    test('should create new toast window with default medium size', () => {
      const result = createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith({
        width: 700,
        height: 500,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        show: false,
        alwaysOnTop: true,
        alwaysOnTopLevel: 'screen-saver',
        type: 'panel',
        thickFrame: false,
        fullscreen: false,
        fullscreenable: false,
        visibleOnAllWorkspaces: true,
        simpleFullscreen: false,
        kiosk: false,
        webPreferences: expect.objectContaining({
          preload: expect.stringContaining('toast.js'),
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
        }),
      });

      expect(mockWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('toast/index.html')
      );
      expect(mockWindow.setOpacity).toHaveBeenCalledWith(0.95);
      expect(positionToastWindow).toHaveBeenCalledWith(mockWindow, mockConfig);
      expect(result).toBe(mockWindow);
      expect(windows.toast).toBe(mockWindow);
    });

    test('should create toast window with small size', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'appearance.size') return 'small';
        if (key === 'appearance.opacity') return 0.95;
        if (key === 'advanced.showInTaskbar') return false;
        return undefined;
      });

      createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 500,
          height: 350,
        })
      );
    });

    test('should create toast window with large size', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'appearance.size') return 'large';
        if (key === 'appearance.opacity') return 0.95;
        if (key === 'advanced.showInTaskbar') return false;
        return undefined;
      });

      createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 800,
          height: 550,
        })
      );
    });

    test('should create toast window with show in taskbar enabled', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'appearance.size') return 'medium';
        if (key === 'appearance.opacity') return 0.95;
        if (key === 'advanced.showInTaskbar') return true;
        return undefined;
      });

      createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          skipTaskbar: false,
        })
      );
    });

    test('should return existing toast window if not destroyed', () => {
      windows.toast = mockWindow;

      const result = createToastWindow(mockConfig);

      expect(mockBrowserWindow).not.toHaveBeenCalled();
      expect(result).toBe(mockWindow);
    });

    test('should create new toast window if existing is destroyed', () => {
      const destroyedWindow = { ...mockWindow, isDestroyed: jest.fn(() => true) };
      windows.toast = destroyedWindow;

      const result = createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalled();
      expect(result).toBe(mockWindow);
    });

    test('should open dev tools in development mode', () => {
      process.env.NODE_ENV = 'development';

      createToastWindow(mockConfig);

      expect(mockWindow.webContents.openDevTools).toHaveBeenCalledWith({
        mode: 'detach',
      });
    });

    test('should not open dev tools in production mode', () => {
      process.env.NODE_ENV = 'production';

      createToastWindow(mockConfig);

      expect(mockWindow.webContents.openDevTools).not.toHaveBeenCalled();
    });

    test('should set up window event handlers', () => {
      createToastWindow(mockConfig);

      expect(mockWindow.on).toHaveBeenCalledWith('moved', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('blur', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('show', expect.any(Function));
    });
  });

  describe('createSettingsWindow', () => {
    test('should create new settings window', () => {
      const result = createSettingsWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        show: false,
        alwaysOnTop: true,
        alwaysOnTopLevel: 'screen-saver',
        type: 'panel',
        thickFrame: false,
        fullscreen: false,
        fullscreenable: false,
        visibleOnAllWorkspaces: true,
        simpleFullscreen: false,
        kiosk: false,
        webPreferences: expect.objectContaining({
          preload: expect.stringContaining('settings.js'),
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
        }),
      });

      expect(mockWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('settings/index.html')
      );
      expect(result).toBe(mockWindow);
      expect(windows.settings).toBe(mockWindow);
    });

    test('should return existing settings window if not destroyed', () => {
      windows.settings = mockWindow;

      const result = createSettingsWindow(mockConfig);

      expect(mockBrowserWindow).not.toHaveBeenCalled();
      expect(result).toBe(mockWindow);
    });

    test('should open dev tools in development mode', () => {
      process.env.NODE_ENV = 'development';

      createSettingsWindow(mockConfig);

      expect(mockWindow.webContents.openDevTools).toHaveBeenCalledWith({
        mode: 'detach',
      });
    });

    test('should set up window event handlers', () => {
      createSettingsWindow(mockConfig);

      expect(mockWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });
  });

  describe('showToastWindow', () => {
    test('should create and show toast window if it does not exist', () => {
      showToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalled();
      expect(positionToastWindow).toHaveBeenCalledWith(mockWindow, mockConfig);
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test('should use existing toast window if available', () => {
      windows.toast = mockWindow;

      showToastWindow(mockConfig);

      expect(mockBrowserWindow).not.toHaveBeenCalled();
      expect(positionToastWindow).toHaveBeenCalledWith(mockWindow, mockConfig);
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    test('should handle fullscreen mode on macOS', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      mockBrowserWindow.getFocusedWindow.mockReturnValue({
        ...mockWindow,
        isFullScreen: jest.fn(() => true),
      });
      
      windows.toast = mockWindow;

      showToastWindow(mockConfig);

      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
      expect(mockWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(
        true,
        { visibleOnFullScreen: true }
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should handle fullscreen mode on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      mockBrowserWindow.getFocusedWindow.mockReturnValue({
        ...mockWindow,
        isFullScreen: jest.fn(() => true),
      });
      
      windows.toast = mockWindow;

      showToastWindow(mockConfig);

      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 1);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    test('should handle fullscreen mode on Linux', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockBrowserWindow.getFocusedWindow.mockReturnValue({
        ...mockWindow,
        isFullScreen: jest.fn(() => true),
      });
      
      windows.toast = mockWindow;

      showToastWindow(mockConfig);

      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver', 1);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('hideToastWindow', () => {
    test('should hide toast window if visible', () => {
      windows.toast = mockWindow;

      hideToastWindow();

      expect(mockWindow.hide).toHaveBeenCalled();
    });

    test('should not hide window if login is in progress', () => {
      windows.toast = mockWindow;
      isLoginProcessActive.mockReturnValue(true);

      hideToastWindow();

      expect(mockWindow.hide).not.toHaveBeenCalled();
    });

    test('should not hide window if it is destroyed', () => {
      windows.toast = {
        ...mockWindow,
        isDestroyed: jest.fn(() => true),
      };

      hideToastWindow();

      expect(mockWindow.hide).not.toHaveBeenCalled();
    });

    test('should not hide window if it is not visible', () => {
      windows.toast = {
        ...mockWindow,
        isVisible: jest.fn(() => false),
      };

      hideToastWindow();

      expect(mockWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe('showSettingsWindow', () => {
    test('should create and show settings window with tab selection', () => {
      const result = showSettingsWindow(mockConfig, 'account');

      expect(mockBrowserWindow).toHaveBeenCalled();
      expect(result).toBe(mockWindow);
      
      // Verify that the did-finish-load event handler was set up
      expect(mockWindow.webContents.once).toHaveBeenCalledWith(
        'did-finish-load',
        expect.any(Function)
      );
    });

    test('should show existing settings window and select tab', () => {
      windows.settings = mockWindow;

      const result = showSettingsWindow(mockConfig, 'general');

      expect(mockBrowserWindow).not.toHaveBeenCalled();
      expect(mockWindow.show).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
      expect(result).toBe(mockWindow);
    });

    test('should handle fullscreen mode for existing settings window', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      windows.settings = mockWindow;
      mockBrowserWindow.getFocusedWindow.mockReturnValue({
        ...mockWindow,
        isFullScreen: jest.fn(() => true),
      });

      showSettingsWindow(mockConfig);

      expect(mockWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver');
      expect(mockWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(
        true,
        { visibleOnFullScreen: true }
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('positionSettingsWindowOnToastDisplay', () => {
    test('should position settings window based on toast window location', () => {
      windows.toast = {
        ...mockWindow,
        getPosition: jest.fn(() => [500, 300]),
      };

      positionSettingsWindowOnToastDisplay(mockWindow);

      expect(mockScreen.getDisplayNearestPoint).toHaveBeenCalledWith({
        x: 500,
        y: 300,
      });
      expect(mockWindow.setPosition).toHaveBeenCalledWith(560, 240);
    });

    test('should use cursor position if toast window is not available', () => {
      windows.toast = null;

      positionSettingsWindowOnToastDisplay(mockWindow);

      expect(mockScreen.getCursorScreenPoint).toHaveBeenCalled();
      expect(mockScreen.getDisplayNearestPoint).toHaveBeenCalledWith({
        x: 960,
        y: 540,
      });
    });

    test('should handle null settings window gracefully', () => {
      positionSettingsWindowOnToastDisplay(null);
      
      // Should handle null window gracefully without attempting positioning
      // Verify that screen methods are not called with null window
      expect(mockScreen.getAllDisplays).not.toHaveBeenCalled();
      // Verify function exists and can be called safely
      expect(typeof positionSettingsWindowOnToastDisplay).toBe('function');
    });
  });

  describe('closeAllWindows', () => {
    test('should close all windows and set quitting flag', () => {
      const window1 = { ...mockWindow, close: jest.fn() };
      const window2 = { ...mockWindow, close: jest.fn() };
      mockBrowserWindow.getAllWindows.mockReturnValue([window1, window2]);

      closeAllWindows();

      expect(app.isQuitting).toBe(true);
      expect(window1.close).toHaveBeenCalled();
      expect(window2.close).toHaveBeenCalled();
    });

    test('should handle destroyed windows gracefully', () => {
      const destroyedWindow = {
        ...mockWindow,
        isDestroyed: jest.fn(() => true),
        close: jest.fn(),
      };
      const normalWindow = { ...mockWindow, close: jest.fn() };
      mockBrowserWindow.getAllWindows.mockReturnValue([
        destroyedWindow,
        normalWindow,
      ]);

      closeAllWindows();

      expect(destroyedWindow.close).not.toHaveBeenCalled();
      expect(normalWindow.close).toHaveBeenCalled();
    });
  });

  describe('window event handlers', () => {
    test('should handle toast window blur event with hideOnBlur enabled', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'advanced.hideOnBlur') return true;
        return undefined;
      });

      createToastWindow(mockConfig);

      // Get the blur event handler
      const blurHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'blur')?.[1];

      expect(blurHandler).toBeDefined();

      // Call the blur handler
      blurHandler();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('before-hide');
      expect(mockWindow.hide).toHaveBeenCalled();
    });

    test('should not hide on blur when modal is open', () => {
      isModalOpened.mockReturnValue(true);
      mockConfig.get.mockImplementation((key) => {
        if (key === 'advanced.hideOnBlur') return true;
        return undefined;
      });

      createToastWindow(mockConfig);

      const blurHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'blur')?.[1];

      blurHandler();

      expect(mockWindow.hide).not.toHaveBeenCalled();
    });

    test('should handle toast window close event when not quitting', () => {
      createToastWindow(mockConfig);

      const closeHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'close')?.[1];

      const mockEvent = { preventDefault: jest.fn() };
      closeHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockWindow.hide).toHaveBeenCalled();
    });

    test('should handle toast window show event', () => {
      createToastWindow(mockConfig);

      const showHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'show')?.[1];

      showHandler();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'config-updated',
        {
          pages: mockConfig.get('pages'),
          appearance: mockConfig.get('appearance'),
          subscription: mockConfig.get('subscription'),
        }
      );
    });

    test('should handle window move event and save position', () => {
      createToastWindow(mockConfig);

      const moveHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'moved')?.[1];

      mockWindow.getPosition.mockReturnValue([200, 150]);

      moveHandler();

      expect(mockConfig.set).toHaveBeenCalledWith(
        'appearance.monitorPositions',
        { '1': { x: 200, y: 150 } }
      );
    });

    test('should handle settings window closed event', () => {
      createSettingsWindow(mockConfig);

      const closedHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'closed')?.[1];

      closedHandler();

      expect(windows.settings).toBe(null);
    });

    test('should prevent close during login process', () => {
      isLoginProcessActive.mockReturnValue(true);

      createToastWindow(mockConfig);
      createSettingsWindow(mockConfig);

      // Test toast window close prevention
      const toastCloseHandler = mockWindow.on.mock.calls
        .find(([event]) => event === 'close')?.[1];
      
      const toastEvent = { preventDefault: jest.fn() };
      toastCloseHandler(toastEvent);

      expect(toastEvent.preventDefault).toHaveBeenCalled();
      expect(mockWindow.hide).not.toHaveBeenCalled();

      // Test settings window close prevention
      const settingsCloseHandler = mockWindow.on.mock.calls
        .slice(-2)
        .find(([event]) => event === 'close')?.[1];
      
      const settingsEvent = { preventDefault: jest.fn() };
      settingsCloseHandler(settingsEvent);

      expect(settingsEvent.preventDefault).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle config with missing opacity value', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'appearance.opacity') return undefined;
        if (key === 'appearance.size') return 'medium';
        if (key === 'advanced.showInTaskbar') return false;
        return undefined;
      });

      createToastWindow(mockConfig);

      expect(mockWindow.setOpacity).toHaveBeenCalledWith(0.95); // Default value
    });

    test('should handle config with missing size value', () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'appearance.size') return undefined;
        if (key === 'appearance.opacity') return 0.95;
        if (key === 'advanced.showInTaskbar') return false;
        return undefined;
      });

      createToastWindow(mockConfig);

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 700,
          height: 500,
        })
      );
    });

    test('should handle destroyed windows during hideToastWindow', () => {
      windows.toast = {
        isDestroyed: jest.fn(() => false),
        isVisible: jest.fn(() => true),
        hide: jest.fn(),
      };

      // First call should work
      hideToastWindow();
      expect(windows.toast.hide).toHaveBeenCalled();

      // Simulate window being destroyed
      windows.toast.isDestroyed.mockReturnValue(true);
      windows.toast.hide.mockClear();

      // Second call should not attempt to hide
      hideToastWindow();
      expect(windows.toast.hide).not.toHaveBeenCalled();
    });
  });
});