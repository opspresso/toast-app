/**
 * Toast Preload Script Tests
 * Tests the security bridge for the main toast popup window
 */

// Mock electron modules
const mockContextBridge = {
  exposeInMainWorld: jest.fn()
};

const mockIpcRenderer = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

jest.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer
}));

// Mock window object for node environment
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  toast: {
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
  }
};

describe('Toast Preload Script', () => {
  let toastAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Setup window mock before loading preload script
    global.window = mockWindow;
    global.CustomEvent = class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    };
    global.Event = class Event {
      constructor(type) {
        this.type = type;
      }
    };
    global.KeyboardEvent = class KeyboardEvent {
      constructor(type, options) {
        this.type = type;
        this.key = options?.key;
      }
    };

    // Capture the exposed API
    mockContextBridge.exposeInMainWorld.mockImplementation((name, api) => {
      if (name === 'toast') {
        toastAPI = api;
      }
    });

    // Load the preload script
    require('../../../src/renderer/preload/toast');
  });

  afterEach(() => {
    // Clean up global mocks
    delete global.window;
    delete global.CustomEvent;
    delete global.Event;
    delete global.KeyboardEvent;
  });

  describe('API Exposure', () => {
    test('should expose toast API to main world', () => {
      expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
        'toast',
        expect.any(Object)
      );
    });

    test('should expose all required logging methods', () => {
      expect(toastAPI.log).toBeDefined();
      expect(toastAPI.log.info).toBeDefined();
      expect(toastAPI.log.warn).toBeDefined();
      expect(toastAPI.log.error).toBeDefined();
      expect(toastAPI.log.debug).toBeDefined();
    });

    test('should expose authentication methods', () => {
      expect(toastAPI.initiateLogin).toBeDefined();
      expect(toastAPI.fetchUserProfile).toBeDefined();
      expect(toastAPI.fetchSubscription).toBeDefined();
      expect(toastAPI.logout).toBeDefined();
    });

    test('should expose configuration and action methods', () => {
      expect(toastAPI.getConfig).toBeDefined();
      expect(toastAPI.executeAction).toBeDefined();
      expect(toastAPI.saveConfig).toBeDefined();
    });

    test('should expose window control methods', () => {
      expect(toastAPI.hideWindow).toBeDefined();
      expect(toastAPI.showSettings).toBeDefined();
      expect(toastAPI.setModalOpen).toBeDefined();
      expect(toastAPI.setAlwaysOnTop).toBeDefined();
    });

    test('should expose utility methods', () => {
      expect(toastAPI.extractAppIcon).toBeDefined();
      expect(toastAPI.resolveTildePath).toBeDefined();
      expect(toastAPI.showOpenDialog).toBeDefined();
    });

    test('should expose event listener methods', () => {
      expect(toastAPI.onConfigUpdated).toBeDefined();
      expect(toastAPI.onLoginSuccess).toBeDefined();
      expect(toastAPI.onLoginError).toBeDefined();
      expect(toastAPI.onLogoutSuccess).toBeDefined();
      expect(toastAPI.onAuthStateChanged).toBeDefined();
      expect(toastAPI.onAuthReloadSuccess).toBeDefined();
    });

    test('should expose platform property', () => {
      expect(toastAPI.platform).toBe(process.platform);
    });
  });

  describe('Logging Functions', () => {
    test('should call ipcRenderer.invoke with correct parameters for log.info', () => {
      const message = 'Test info message';
      const args = ['arg1', 'arg2'];
      
      toastAPI.log.info(message, ...args);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('log-info', message, ...args);
    });

    test('should call ipcRenderer.invoke with correct parameters for log.error', () => {
      const message = 'Test error message';
      const errorObj = new Error('test error');
      
      toastAPI.log.error(message, errorObj);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('log-error', message, errorObj);
    });

    test('should call ipcRenderer.invoke with correct parameters for log.warn', () => {
      const message = 'Test warning message';
      
      toastAPI.log.warn(message);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('log-warn', message);
    });

    test('should call ipcRenderer.invoke with correct parameters for log.debug', () => {
      const message = 'Test debug message';
      const debugData = { key: 'value' };
      
      toastAPI.log.debug(message, debugData);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('log-debug', message, debugData);
    });
  });

  describe('Authentication Functions', () => {
    test('should call initiate-login through IPC', () => {
      toastAPI.initiateLogin();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('initiate-login');
    });

    test('should call fetch-user-profile through IPC', () => {
      toastAPI.fetchUserProfile();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fetch-user-profile');
    });

    test('should call fetch-subscription through IPC', () => {
      toastAPI.fetchSubscription();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('fetch-subscription');
    });

    test('should call logout through IPC', () => {
      toastAPI.logout();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('logout');
    });
  });

  describe('Restricted invoke Function', () => {
    test('should allow whitelisted channels', () => {
      const allowedChannels = ['logout', 'resetToDefaults', 'resetAppSettings'];
      
      allowedChannels.forEach(channel => {
        toastAPI.invoke(channel, 'test-arg');
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(channel, 'test-arg');
      });
    });

    test('should reject disallowed channels', () => {
      expect(() => {
        toastAPI.invoke('malicious-channel', 'test-arg');
      }).toThrow('Disallowed channel: malicious-channel');
    });
  });

  describe('resetToDefaults Function', () => {
    beforeEach(() => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
    });

    test('should reset to defaults without keeping anything', async () => {
      mockIpcRenderer.invoke.mockResolvedValue({ success: true });
      
      const result = await toastAPI.resetToDefaults();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('resetToDefaults');
      expect(result).toEqual({ success: true, message: 'Settings have been reset to defaults.' });
    });

    test('should backup and restore appearance settings when keepAppearance is true', async () => {
      const mockAppearance = { theme: 'dark', fontSize: 'large' };
      mockIpcRenderer.invoke
        .mockResolvedValueOnce(mockAppearance) // get-config for appearance
        .mockResolvedValueOnce({ success: true }) // resetToDefaults
        .mockResolvedValueOnce({ success: true }); // save-config
      
      const result = await toastAPI.resetToDefaults({ keepAppearance: true });
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config', 'appearance');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('resetToDefaults');
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-config', { appearance: mockAppearance });
      expect(result).toEqual({ success: true, message: 'Settings have been reset to defaults.' });
    });

    test('should handle reset errors gracefully', async () => {
      const testError = new Error('Reset failed');
      mockIpcRenderer.invoke.mockRejectedValueOnce(testError);

      const result = await toastAPI.resetToDefaults();

      expect(result).toEqual({
        success: false,
        error: 'Reset failed'
      });
    });

    test('should handle reset errors without message gracefully', async () => {
      const emptyError = new Error('');
      mockIpcRenderer.invoke.mockRejectedValueOnce(emptyError);

      const result = await toastAPI.resetToDefaults();

      expect(result).toEqual({
        success: false,
        error: 'An error occurred while resetting settings.'
      });
    });
  });

  describe('Modal State Functions', () => {
    test('should call modal-state-changed via send', () => {
      toastAPI.setModalOpen(true);
      
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('modal-state-changed', true);
    });
  });

  describe('Window State Functions', () => {
    test('should call set-always-on-top through IPC', () => {
      toastAPI.setAlwaysOnTop(true);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('set-always-on-top', true);
    });

    test('should call get-window-position through IPC', () => {
      toastAPI.getWindowPosition();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-window-position');
    });

    test('should call hide-window-temporarily through IPC', () => {
      toastAPI.hideWindowTemporarily();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('hide-window-temporarily');
    });

    test('should call show-window-after-dialog with position', () => {
      const position = { x: 100, y: 200 };
      
      toastAPI.showWindowAfterDialog(position);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-window-after-dialog', position);
    });

    test('should call show-window through IPC', () => {
      toastAPI.showWindow();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-window');
    });
  });

  describe('Configuration Functions', () => {
    test('should call get-config with key parameter', () => {
      const testKey = 'pages';
      
      toastAPI.getConfig(testKey);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config', testKey);
    });

    test('should call save-config with config parameter', () => {
      const testConfig = { pages: [{ id: 1, buttons: [] }] };
      
      toastAPI.saveConfig(testConfig);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-config', testConfig);
    });

    test('should call get-env with key parameter', () => {
      const envKey = 'NODE_ENV';
      
      toastAPI.getEnv(envKey);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-env', envKey);
    });
  });

  describe('Action Functions', () => {
    test('should call execute-action with action parameter', () => {
      const testAction = { type: 'exec', command: 'ls -la' };
      
      toastAPI.executeAction(testAction);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('execute-action', testAction);
    });
  });

  describe('Window Control Functions', () => {
    test('should hide window when no modal is open', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(false); // is-modal-open returns false

      await toastAPI.hideWindow();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('is-modal-open');
      expect(mockWindow.dispatchEvent).toHaveBeenCalled();
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('hide-toast');
    });

    test('should not hide window when modal is open', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true); // is-modal-open returns true

      await toastAPI.hideWindow();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('is-modal-open');
      expect(mockIpcRenderer.send).not.toHaveBeenCalledWith('hide-toast');
    });

    test('should call show-settings via send', () => {
      toastAPI.showSettings();

      expect(mockIpcRenderer.send).toHaveBeenCalledWith('show-settings');
    });
  });

  describe('Dialog Functions', () => {
    test('should call show-open-dialog with options', () => {
      const options = { title: 'Select App', filters: [{ name: 'Applications', extensions: ['app'] }] };
      
      toastAPI.showOpenDialog(options);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('show-open-dialog', options);
    });
  });

  describe('Utility Functions', () => {
    test('should call extract-app-icon with parameters', () => {
      const appPath = '/Applications/Safari.app';
      const forceRefresh = true;
      
      toastAPI.extractAppIcon(appPath, forceRefresh);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('extract-app-icon', appPath, forceRefresh);
    });

    test('should call extract-app-icon with default forceRefresh false', () => {
      const appPath = '/Applications/Safari.app';
      
      toastAPI.extractAppIcon(appPath);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('extract-app-icon', appPath, false);
    });

    test('should call resolve-tilde-path with path parameter', () => {
      const tildePath = '~/Documents/test.txt';
      
      toastAPI.resolveTildePath(tildePath);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('resolve-tilde-path', tildePath);
    });
  });

  describe('Event Listener Functions', () => {
    test('should register config-updated listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onConfigUpdated(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('config-updated', expect.any(Function));
      expect(typeof cleanup).toBe('function');
      
      // Test cleanup function
      cleanup();
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('config-updated', callback);
    });

    test('should register login-success listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onLoginSuccess(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('login-success', expect.any(Function));
      expect(typeof cleanup).toBe('function');
      
      cleanup();
      expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('login-success', callback);
    });

    test('should register login-error listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onLoginError(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('login-error', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    test('should register logout-success listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onLogoutSuccess(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('logout-success', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    test('should register auth-state-changed listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onAuthStateChanged(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('auth-state-changed', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });

    test('should register auth-reload-success listener and return cleanup function', () => {
      const callback = jest.fn();
      
      const cleanup = toastAPI.onAuthReloadSuccess(callback);
      
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('auth-reload-success', expect.any(Function));
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('Keyboard Event Handling', () => {
    test('should register keydown event listener for keyboard handling', () => {
      // Check that addEventListener was called with keydown
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    test('should register DOMContentLoaded event listener', () => {
      // Check that addEventListener was called with DOMContentLoaded
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });
  });

  describe('IPC Event Handlers', () => {
    test('should register before-hide event handler', () => {
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('before-hide', expect.any(Function));
    });

    test('should handle before-hide event by dispatching window event', () => {
      // Find the before-hide callback
      const beforeHideCall = mockIpcRenderer.on.mock.calls.find(call => call[0] === 'before-hide');
      expect(beforeHideCall).toBeDefined();

      const beforeHideCallback = beforeHideCall[1];

      // Call the callback
      beforeHideCallback();

      expect(mockWindow.dispatchEvent).toHaveBeenCalled();
    });
  });

  describe('DOMContentLoaded Event', () => {
    test('should register DOMContentLoaded event listener', () => {
      // Check that addEventListener was called with DOMContentLoaded
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    test('should invoke get-config on DOMContentLoaded callback', async () => {
      const mockConfig = {
        pages: [{ id: 1, buttons: [] }],
        appearance: { theme: 'light' },
        subscription: { active: false }
      };

      mockIpcRenderer.invoke.mockResolvedValue(mockConfig);

      // Find the DOMContentLoaded callback
      const domLoadedCall = mockWindow.addEventListener.mock.calls.find(call => call[0] === 'DOMContentLoaded');
      expect(domLoadedCall).toBeDefined();

      const domLoadedCallback = domLoadedCall[1];

      // Call the callback
      await domLoadedCallback();

      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config');
    });
  });
});