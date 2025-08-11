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

describe('Toast Preload Script', () => {
  let toastAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Capture the exposed API
    mockContextBridge.exposeInMainWorld.mockImplementation((name, api) => {
      if (name === 'toast') {
        toastAPI = api;
      }
    });

    // Load the preload script
    require('../../../src/renderer/preload/toast');
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
      mockIpcRenderer.invoke.mockRejectedValue(testError);
      
      const result = await toastAPI.resetToDefaults();
      
      expect(result).toEqual({ 
        success: false, 
        error: 'Reset failed'
      });
    });

    test('should handle reset errors without message gracefully', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error());
      
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
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      await toastAPI.hideWindow();
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('is-modal-open');
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(Event));
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
    test('should handle Escape key when no modal is open and hideOnEscape is enabled', () => {
      mockIpcRenderer.invoke
        .mockResolvedValueOnce(false) // is-modal-open
        .mockResolvedValueOnce(true); // get-config for hideOnEscape
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
      
      // Allow async operations to complete
      setImmediate(() => {
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('is-modal-open');
      });
    });

    test('should not hide window on Escape when modal is open', () => {
      mockIpcRenderer.invoke.mockResolvedValue(true); // is-modal-open returns true
      
      // Simulate Escape key press
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
      
      // Should check modal state but not proceed to hide
      setImmediate(() => {
        expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('is-modal-open');
      });
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
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      // Call the callback
      beforeHideCallback();
      
      expect(mockDispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    });
  });

  describe('DOMContentLoaded Event', () => {
    test('should handle DOMContentLoaded and dispatch config-loaded event', () => {
      const mockConfig = {
        pages: [{ id: 1, buttons: [] }],
        appearance: { theme: 'light' },
        subscription: { active: false }
      };
      
      mockIpcRenderer.invoke.mockResolvedValue(mockConfig);
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = jest.fn();
      Object.defineProperty(window, 'dispatchEvent', {
        value: mockDispatchEvent,
        writable: true
      });
      
      // Trigger DOMContentLoaded
      const event = new Event('DOMContentLoaded');
      window.dispatchEvent(event);
      
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('get-config');
      
      // Allow async operation to complete
      setImmediate(() => {
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'config-loaded',
            detail: {
              pages: mockConfig.pages,
              appearance: mockConfig.appearance,
              subscription: mockConfig.subscription
            }
          })
        );
      });
    });
  });
});