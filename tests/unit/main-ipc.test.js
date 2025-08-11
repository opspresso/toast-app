/**
 * Toast - Main IPC Tests
 *
 * Tests for IPC handlers (P0 Priority - Critical Communication Layer)
 */

// Mock electron ipcMain
const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
  removeHandler: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
  shell: {
    openExternal: jest.fn(),
  },
}));

// Mock executor
jest.mock('../../src/main/executor', () => ({
  executeAction: jest.fn(),
  validateAction: jest.fn(),
}));

// Mock config
const mockConfig = {
  get: jest.fn(),
  set: jest.fn(),
  store: {},
};

jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfig),
  resetToDefaults: jest.fn(() => true),
  importConfig: jest.fn(() => true),
  exportConfig: jest.fn(() => true),
  sanitizeSubscription: jest.fn((sub) => sub || {}),
}));

// Mock os
jest.mock('os', () => ({
  hostname: jest.fn(() => 'mock-hostname'),
  userInfo: jest.fn(() => ({ username: 'mock-user' })),
}));

// Mock auth modules
jest.mock('../../src/main/auth', () => ({
  registerProtocolHandler: jest.fn(),
  handleAuthRedirect: jest.fn(),
}));

jest.mock('../../src/main/auth-manager', () => ({
  initialize: jest.fn(),
  initiateLogin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  logout: jest.fn(),
  fetchUserProfile: jest.fn(),
  getUserSettings: jest.fn(),
  fetchSubscription: jest.fn(),
  getAccessToken: jest.fn(),
}));

// Mock user data manager
jest.mock('../../src/main/user-data-manager', () => ({
  initialize: jest.fn(),
  getSyncStatus: jest.fn(),
  setCloudSyncEnabled: jest.fn(),
  manualSync: jest.fn(),
  debugSyncStatus: jest.fn(),
}));

// Mock updater
jest.mock('../../src/main/updater', () => ({
  initAutoUpdater: jest.fn(),
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  installUpdate: jest.fn(),
}));

// Mock shortcuts
jest.mock('../../src/main/shortcuts', () => ({
  unregisterGlobalShortcuts: jest.fn(),
  registerGlobalShortcuts: jest.fn(),
  positionToastWindow: jest.fn(),
}));

// Mock logger
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  handleIpcLogging: jest.fn(),
}));

// Mock utils
jest.mock('../../src/main/utils/app-icon-extractor', () => ({
  extractAppIcon: jest.fn(),
  extractAppNameFromPath: jest.fn(),
  convertToTildePath: jest.fn(),
  resolveTildePath: jest.fn(),
}));

describe('Main IPC Handlers (P0)', () => {
  let windows;
  let ipcHandlers;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock windows
    windows = {
      toast: {
        isDestroyed: jest.fn(() => false),
        webContents: { send: jest.fn() },
        setAlwaysOnTop: jest.fn(),
        getBounds: jest.fn(() => ({ x: 100, y: 100, width: 400, height: 300 })),
        setPosition: jest.fn(),
        hide: jest.fn(),
        show: jest.fn(),
        focus: jest.fn(),
        setOpacity: jest.fn(),
        setSize: jest.fn(),
      },
      settings: {
        isDestroyed: jest.fn(() => false),
        webContents: { send: jest.fn() },
        show: jest.fn(),
        focus: jest.fn(),
      },
    };

    // Capture IPC handlers
    ipcHandlers = {};
    mockIpcMain.handle.mockImplementation((channel, handler) => {
      ipcHandlers[channel] = handler;
    });

    // Setup default mock responses
    mockConfig.get.mockReturnValue('default-value');
    
    const executor = require('../../src/main/executor');
    executor.executeAction.mockResolvedValue({ success: true });
    executor.validateAction.mockResolvedValue({ valid: true });

    // Require and setup IPC module
    delete require.cache[require.resolve('../../src/main/ipc')];
    const ipc = require('../../src/main/ipc');
    ipc.setupIpcHandlers(windows);
  });

  describe('IPC Handler Registration', () => {
    test('should register all critical IPC handlers', () => {
      const criticalHandlers = [
        'execute-action',
        'validate-action',
        'get-config',
        'set-config',
        'save-config',
        'initiate-login',
        'logout',
        'fetch-user-profile',
      ];

      criticalHandlers.forEach(handler => {
        expect(ipcHandlers[handler]).toBeDefined();
      });
    });

    test('should register window management handlers', () => {
      const windowHandlers = [
        'is-modal-open',
        'set-always-on-top',
        'get-window-position',
        'hide-window-temporarily',
        'show-window-after-dialog',
        'show-window',
      ];

      windowHandlers.forEach(handler => {
        expect(ipcHandlers[handler]).toBeDefined();
      });
    });

    test('should register utility handlers', () => {
      const utilityHandlers = [
        'get-app-version',
        'open-url',
        'show-open-dialog',
        'show-save-dialog',
        'show-message-box',
        'extract-app-icon',
      ];

      utilityHandlers.forEach(handler => {
        expect(ipcHandlers[handler]).toBeDefined();
      });
    });
  });

  describe('Action Management Handlers', () => {
    test('should handle execute-action requests', async () => {
      const action = { action: 'exec', command: 'echo test' };
      const mockEvent = { sender: { send: jest.fn() } };

      const result = await ipcHandlers['execute-action'](mockEvent, action);

      const executor = require('../../src/main/executor');
      expect(executor.executeAction).toHaveBeenCalledWith(action);
      expect(result).toEqual({ success: true });
    });

    test('should handle validate-action requests', async () => {
      const action = { action: 'exec', command: 'echo test' };
      const mockEvent = { sender: { send: jest.fn() } };

      const result = await ipcHandlers['validate-action'](mockEvent, action);

      const executor = require('../../src/main/executor');
      expect(executor.validateAction).toHaveBeenCalledWith(action);
      expect(result).toEqual({ valid: true });
    });

    test('should handle action execution errors', async () => {
      const action = { action: 'invalid' };
      const mockEvent = { sender: { send: jest.fn() } };
      
      const executor = require('../../src/main/executor');
      executor.executeAction.mockRejectedValue(new Error('Action failed'));

      const result = await ipcHandlers['execute-action'](mockEvent, action);

      expect(result).toEqual({
        success: false,
        message: 'Error executing action: Action failed',
        error: 'Error: Action failed',
      });
    });
  });

  describe('Configuration Handlers', () => {
    test('should handle get-config requests', () => {
      const mockEvent = {};
      const key = 'globalHotkey';

      const result = ipcHandlers['get-config'](mockEvent, key);

      expect(mockConfig.get).toHaveBeenCalledWith(key);
      expect(result).toBe('default-value');
    });

    test('should handle set-config requests', () => {
      const mockEvent = {};
      const key = 'globalHotkey';
      const value = 'Ctrl+Space';

      const result = ipcHandlers['set-config'](mockEvent, key, value);

      expect(mockConfig.set).toHaveBeenCalledWith(key, value);
      expect(result).toBe(true);
    });

    test('should handle save-config requests', async () => {
      const mockEvent = {};
      const changes = {
        globalHotkey: 'Ctrl+Space',
        pages: [{ id: '1', buttons: [] }],
      };

      // Mock config.get for subscription data used in the handler
      mockConfig.get.mockReturnValue({});

      const result = await ipcHandlers['save-config'](mockEvent, changes);

      expect(mockConfig.set).toHaveBeenCalledWith('globalHotkey', 'Ctrl+Space');
      expect(mockConfig.set).toHaveBeenCalledWith('pages', changes.pages);
      expect(result).toBe(true);
    });

    test('should handle reset-config requests', async () => {
      const result = await ipcHandlers['reset-config']();

      const config = require('../../src/main/config');
      expect(config.resetToDefaults).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle import-config requests', async () => {
      const mockEvent = {};
      const filePath = '/path/to/config.json';

      const result = await ipcHandlers['import-config'](mockEvent, filePath);

      const config = require('../../src/main/config');
      expect(config.importConfig).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle export-config requests', async () => {
      const mockEvent = {};
      const filePath = '/path/to/export.json';

      const result = await ipcHandlers['export-config'](mockEvent, filePath);

      const config = require('../../src/main/config');
      expect(config.exportConfig).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('Window Management Handlers', () => {
    test('should handle is-modal-open requests', () => {
      const result = ipcHandlers['is-modal-open']();

      expect(typeof result).toBe('boolean');
    });

    test('should handle set-always-on-top requests', () => {
      const mockEvent = { sender: { getOwnerBrowserWindow: jest.fn(() => windows.toast) } };
      const value = true;

      const result = ipcHandlers['set-always-on-top'](mockEvent, value);

      expect(windows.toast.setAlwaysOnTop).toHaveBeenCalledWith(value);
      expect(result).toBe(true);
    });

    test('should handle get-window-position requests', () => {
      const mockEvent = { sender: { getOwnerBrowserWindow: jest.fn(() => windows.toast) } };
      windows.toast.getPosition = jest.fn(() => [100, 100]);

      const result = ipcHandlers['get-window-position'](mockEvent);

      expect(windows.toast.getPosition).toHaveBeenCalled();
      expect(result).toEqual([100, 100]);
    });

    test('should handle show-window requests', () => {
      const result = ipcHandlers['show-window']();

      expect(windows.toast.show).toHaveBeenCalled();
      expect(windows.toast.focus).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle hide-window-temporarily requests', async () => {
      const mockEvent = { sender: { getOwnerBrowserWindow: jest.fn(() => windows.toast) } };

      const result = await ipcHandlers['hide-window-temporarily'](mockEvent);

      expect(windows.toast.setAlwaysOnTop).toHaveBeenCalledWith(false);
      expect(result).toBe(true);
    });
  });

  describe('Authentication Handlers', () => {
    test('should handle initiate-login requests', async () => {
      const authManager = require('../../src/main/auth-manager');
      authManager.initiateLogin.mockResolvedValue({ success: true, url: 'https://auth.url' });

      const result = await ipcHandlers['initiate-login']();

      expect(authManager.initiateLogin).toHaveBeenCalled();
      expect(result).toEqual({ success: true, url: 'https://auth.url' });
    });

    test('should handle logout requests', async () => {
      const authManager = require('../../src/main/auth-manager');
      authManager.logout.mockResolvedValue({ success: true });

      const result = await ipcHandlers['logout']();

      expect(authManager.logout).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle fetch-user-profile requests', async () => {
      const authManager = require('../../src/main/auth-manager');
      const mockProfile = { id: 'user123', name: 'Test User' };
      authManager.fetchUserProfile.mockResolvedValue(mockProfile);

      const result = await ipcHandlers['fetch-user-profile']();

      expect(authManager.fetchUserProfile).toHaveBeenCalled();
      expect(result).toEqual(mockProfile);
    });

    test('should handle fetch-subscription requests', async () => {
      const authManager = require('../../src/main/auth-manager');
      const mockSubscription = { active: true, plan: 'premium' };
      authManager.fetchSubscription.mockResolvedValue(mockSubscription);

      const result = await ipcHandlers['fetch-subscription']();

      expect(authManager.fetchSubscription).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });
  });

  describe('Dialog Handlers', () => {
    test('should handle show-open-dialog requests', async () => {
      const { dialog } = require('electron');
      const mockEvent = {};
      const options = { filters: [{ name: 'JSON', extensions: ['json'] }] };
      const mockResult = { filePaths: ['/path/to/file.json'] };
      
      dialog.showOpenDialog.mockResolvedValue(mockResult);

      const result = await ipcHandlers['show-open-dialog'](mockEvent, options);

      expect(dialog.showOpenDialog).toHaveBeenCalledWith(windows.toast, {
        ...options,
        modal: true,
        parent: windows.toast,
      });
      expect(result).toEqual(mockResult);
    });

    test('should handle show-save-dialog requests', async () => {
      const { dialog } = require('electron');
      const mockEvent = {};
      const options = { defaultPath: 'config.json' };
      const mockResult = { filePath: '/path/to/save.json' };
      
      dialog.showSaveDialog.mockResolvedValue(mockResult);

      const result = await ipcHandlers['show-save-dialog'](mockEvent, options);

      expect(dialog.showSaveDialog).toHaveBeenCalledWith({
        ...options,
        modal: true,
        parent: windows.toast,
      });
      expect(result).toEqual(mockResult);
    });

    test('should handle show-message-box requests', async () => {
      const { dialog } = require('electron');
      const mockEvent = {};
      const options = { 
        type: 'info',
        title: 'Test',
        message: 'Test message'
      };
      const mockResult = { response: 0 };
      
      dialog.showMessageBox.mockResolvedValue(mockResult);

      const result = await ipcHandlers['show-message-box'](mockEvent, options);

      expect(dialog.showMessageBox).toHaveBeenCalledWith({
        ...options,
        modal: true,
        parent: windows.toast,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('Utility Handlers', () => {
    test('should handle open-url requests', async () => {
      const { shell } = require('electron');
      const mockEvent = {};
      const url = 'https://example.com';

      const result = await ipcHandlers['open-url'](mockEvent, url);

      expect(shell.openExternal).toHaveBeenCalledWith(url);
      expect(result).toBe(true);
    });

    test('should handle get-app-version requests', () => {
      const result = ipcHandlers['get-app-version']();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle extract-app-icon requests', async () => {
      const mockEvent = {};
      const applicationPath = '/Applications/Calculator.app';
      const forceRefresh = false;
      
      const { extractAppIcon, extractAppNameFromPath, convertToTildePath } = require('../../src/main/utils/app-icon-extractor');
      extractAppNameFromPath.mockReturnValue('Calculator');
      extractAppIcon.mockResolvedValue('/path/to/icon.png');
      convertToTildePath.mockReturnValue('/path/to/icon.png');

      const result = await ipcHandlers['extract-app-icon'](mockEvent, applicationPath, forceRefresh);

      expect(extractAppNameFromPath).toHaveBeenCalledWith(applicationPath);
      expect(extractAppIcon).toHaveBeenCalledWith('Calculator', null, forceRefresh);
      expect(result).toEqual({
        success: true,
        iconUrl: 'file:///path/to/icon.png',
        iconPath: '/path/to/icon.png',
        appName: 'Calculator',
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle window destruction gracefully', () => {
      windows.toast.isDestroyed.mockReturnValue(true);

      const mockEvent = { sender: { getOwnerBrowserWindow: jest.fn(() => null) } };
      const result = ipcHandlers['set-always-on-top'](mockEvent, true);
      
      // Should return false when window is destroyed
      expect(result).toBe(false);
      expect(windows.toast.isDestroyed).toHaveBeenCalled();
    });

    test('should handle missing handlers gracefully', () => {
      expect(ipcHandlers['non-existent-handler']).toBeUndefined();
    });

    test('should handle config errors', () => {
      mockConfig.get.mockImplementation(() => {
        throw new Error('Config error');
      });

      const result = ipcHandlers['get-config']({}, 'test-key');
      
      // Handler catches errors and returns null instead of throwing
      expect(result).toBe(null);
    });
  });

  describe('Logging Handlers', () => {
    test('should handle log-info requests', () => {
      const { handleIpcLogging } = require('../../src/main/logger');
      const mockEvent = {};
      const message = 'Test info message';
      const args = ['arg1', 'arg2'];

      ipcHandlers['log-info'](mockEvent, message, ...args);

      expect(handleIpcLogging).toHaveBeenCalledWith('info', message, ...args);
    });

    test('should handle log-error requests', () => {
      const { handleIpcLogging } = require('../../src/main/logger');
      const mockEvent = {};
      const message = 'Test error message';

      ipcHandlers['log-error'](mockEvent, message);

      expect(handleIpcLogging).toHaveBeenCalledWith('error', message);
    });
  });

  describe('Integration Tests', () => {
    test('should setup complete IPC communication pipeline', () => {
      // Verify all critical systems are initialized
      const authManager = require('../../src/main/auth-manager');
      const userDataManager = require('../../src/main/user-data-manager');
      const updater = require('../../src/main/updater');
      const auth = require('../../src/main/auth');

      expect(authManager.initialize).toHaveBeenCalledWith(windows);
      expect(userDataManager.initialize).toHaveBeenCalledWith(windows);
      expect(updater.initAutoUpdater).toHaveBeenCalledWith(windows);
      expect(auth.registerProtocolHandler).toHaveBeenCalled();
    });

    test('should handle complete action workflow', async () => {
      const action = { action: 'exec', command: 'test command' };
      const mockEvent = { sender: { send: jest.fn() } };

      // First validate
      const validationResult = await ipcHandlers['validate-action'](mockEvent, action);
      expect(validationResult.valid).toBe(true);

      // Then execute
      const executionResult = await ipcHandlers['execute-action'](mockEvent, action);
      expect(executionResult.success).toBe(true);
    });
  });
});