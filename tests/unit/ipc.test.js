/**
 * Toast - IPC Handlers Tests
 *
 * IPC (Inter-Process Communication) 핸들러에 대한 단위 테스트
 */

// Mock dependencies
const mockIpcMain = {
  on: jest.fn(),
  handle: jest.fn(),
};

const mockConfig = {
  get: jest.fn(),
  set: jest.fn(),
  store: { test: 'config' },
};

const mockConfigStore = {
  createConfigStore: jest.fn(() => mockConfig),
  sanitizeSubscription: jest.fn(sub => sub),
  resetToDefaults: jest.fn(),
  importConfig: jest.fn(),
  exportConfig: jest.fn(),
};

const mockExecutor = {
  executeAction: jest.fn(),
  validateAction: jest.fn(),
};

const mockAuthManager = {
  initialize: jest.fn(),
  initiateLogin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  logout: jest.fn(),
  fetchUserProfile: jest.fn(),
  getUserSettings: jest.fn(),
  fetchSubscription: jest.fn(),
  getAccessToken: jest.fn(),
  hasValidToken: jest.fn(),
  notifyAuthStateChange: jest.fn(),
  notifyLoginSuccess: jest.fn(),
  notifyLoginError: jest.fn(),
};

const mockUserDataManager = {
  initialize: jest.fn(),
};

const mockUpdater = {
  initAutoUpdater: jest.fn(),
  checkForUpdates: jest.fn(),
  downloadUpdate: jest.fn(),
  installUpdate: jest.fn(),
};

const mockAuth = {
  registerProtocolHandler: jest.fn(),
  handleAuthRedirect: jest.fn(),
};

const mockWindows = {
  toast: {
    isDestroyed: jest.fn(() => false),
    setAlwaysOnTop: jest.fn(),
    setOpacity: jest.fn(),
    setSize: jest.fn(),
    getPosition: jest.fn(() => [100, 100]),
    setPosition: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    focus: jest.fn(),
    isVisible: jest.fn(() => true),
    webContents: {
      send: jest.fn(),
    },
  },
  settings: {
    isDestroyed: jest.fn(() => false),
    hide: jest.fn(),
    close: jest.fn(),
    webContents: {
      send: jest.fn(),
    },
  },
};

const mockDialog = {
  showOpenDialog: jest.fn(),
  showSaveDialog: jest.fn(),
  showMessageBox: jest.fn(),
};

const mockShell = {
  openExternal: jest.fn(),
};

const mockApp = {
  getVersion: jest.fn(() => '1.0.0'),
  relaunch: jest.fn(),
  exit: jest.fn(),
  quit: jest.fn(),
};

const mockShortcuts = {
  unregisterGlobalShortcuts: jest.fn(),
  registerGlobalShortcuts: jest.fn(),
  positionToastWindow: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockCreateLogger = jest.fn(() => mockLogger);

const mockHandleIpcLogging = jest.fn();

const mockOs = {
  hostname: jest.fn(() => 'test-hostname'),
  userInfo: jest.fn(() => ({ username: 'testuser' })),
};

const mockAppIconExtractor = {
  extractAppIcon: jest.fn(),
  extractAppNameFromPath: jest.fn(),
  convertToTildePath: jest.fn(),
  resolveTildePath: jest.fn(),
};

// Mock modules
jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  shell: mockShell,
  app: mockApp,
}));

jest.mock('../../src/main/executor', () => mockExecutor);
jest.mock('../../src/main/config', () => mockConfigStore);
jest.mock('../../src/main/auth-manager', () => mockAuthManager);
jest.mock('../../src/main/user-data-manager', () => mockUserDataManager);
jest.mock('../../src/main/updater', () => mockUpdater);
jest.mock('../../src/main/auth', () => mockAuth);
jest.mock('../../src/main/shortcuts', () => mockShortcuts);
jest.mock('../../src/main/logger', () => ({
  createLogger: mockCreateLogger,
  handleIpcLogging: mockHandleIpcLogging,
}));

jest.mock('os', () => mockOs);

jest.mock('../../src/main/utils/app-icon-extractor', () => mockAppIconExtractor);

jest.mock('../../src/main/windows', () => ({
  showSettingsWindow: jest.fn(),
}));

jest.mock('../../src/main/config/env', () => ({
  getEnv: jest.fn(),
}));

jest.mock('../../src/main/cloud-sync', () => ({
  initCloudSync: jest.fn(() => ({
    getCurrentStatus: jest.fn(() => ({ enabled: true })),
    enable: jest.fn(),
    disable: jest.fn(),
    manualSync: jest.fn(),
  })),
}));

// Import the module after mocks are set up
const { setupIpcHandlers, isModalOpened } = require('../../src/main/ipc');

describe('IPC Handlers', () => {
  let mockCloudSyncManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default returns
    mockExecutor.executeAction.mockResolvedValue({ success: true, message: 'Action executed' });
    mockExecutor.validateAction.mockResolvedValue({ valid: true, message: 'Valid action' });
    mockConfig.get.mockImplementation((key) => {
      const config = {
        'pages': [],
        'appearance': { opacity: 0.9, size: 'medium' },
        'subscription': { active: true },
        'advanced': {},
        'cloudSync.enabled': false,
      };
      return config[key];
    });
    mockAuthManager.hasValidToken.mockResolvedValue(true);
    mockUpdater.checkForUpdates.mockResolvedValue({ success: true, hasUpdate: false });
    mockUpdater.downloadUpdate.mockResolvedValue({ success: true });
    mockUpdater.installUpdate.mockResolvedValue({ success: true });
    mockDialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/test/path'] });
    mockDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/test/save' });
    mockDialog.showMessageBox.mockResolvedValue({ response: 0 });
    mockShell.openExternal.mockResolvedValue();
    
    // Setup cloud sync manager mock
    mockCloudSyncManager = {
      getCurrentStatus: jest.fn(() => ({ enabled: true, lastSyncTime: Date.now() })),
      enable: jest.fn(),
      disable: jest.fn(),
      manualSync: jest.fn(() => ({ success: true })),
    };
    
    // Setup original platform
    Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
  });

  describe('setupIpcHandlers', () => {
    test('should register IPC handlers and initialize managers', () => {
      setupIpcHandlers(mockWindows);

      // Verify that managers were initialized
      expect(mockAuthManager.initialize).toHaveBeenCalledWith(mockWindows);
      expect(mockUserDataManager.initialize).toHaveBeenCalledWith(mockWindows);
      expect(mockUpdater.initAutoUpdater).toHaveBeenCalledWith(mockWindows);
      expect(mockAuth.registerProtocolHandler).toHaveBeenCalled();

      // Verify that some key IPC handlers were registered
      expect(mockIpcMain.on).toHaveBeenCalledWith('modal-state-changed', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('is-modal-open', expect.any(Function));
      expect(mockIpcMain.handle).toHaveBeenCalledWith('execute-action', expect.any(Function));

      // Verify protocol handler is set up
      expect(global.handleProtocolRequest).toBeDefined();
      expect(typeof global.handleProtocolRequest).toBe('function');
    });
  });

  describe('modal state management', () => {
    test('should handle modal state changes', () => {
      setupIpcHandlers(mockWindows);

      // Get the modal-state-changed handler
      const modalHandler = mockIpcMain.on.mock.calls
        .find(([event]) => event === 'modal-state-changed')[1];

      expect(isModalOpened()).toBe(false);

      // Simulate modal opening
      modalHandler({}, true);
      expect(isModalOpened()).toBe(true);

      // Simulate modal closing
      modalHandler({}, false);
      expect(isModalOpened()).toBe(false);
    });

    test('should handle is-modal-open requests', () => {
      setupIpcHandlers(mockWindows);

      const isModalOpenHandler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'is-modal-open')[1];

      const result = isModalOpenHandler();
      expect(result).toBe(false);
    });
  });

  describe('window management handlers', () => {
    test('should verify window management handlers are registered', () => {
      setupIpcHandlers(mockWindows);

      // Verify that window management IPC handlers were registered
      const handleEvents = mockIpcMain.handle.mock.calls.map(call => call[0]);
      const onEvents = mockIpcMain.on.mock.calls.map(call => call[0]);

      expect(handleEvents).toContain('set-always-on-top');
      expect(handleEvents).toContain('get-window-position'); 
      expect(handleEvents).toContain('show-window');
      expect(onEvents).toContain('show-toast');
      expect(onEvents).toContain('hide-toast');
    });
  });

  describe('action execution handlers', () => {
    test('should handle execute-action', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'execute-action')[1];

      const testAction = { action: 'test', param: 'value' };
      const result = await handler({}, testAction);

      expect(mockExecutor.executeAction).toHaveBeenCalledWith(testAction);
      expect(result).toEqual({ success: true, message: 'Action executed' });
    });

    test('should handle execute-action errors', async () => {
      setupIpcHandlers(mockWindows);
      mockExecutor.executeAction.mockRejectedValue(new Error('Test error'));

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'execute-action')[1];

      const result = await handler({}, { action: 'test' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error executing action');
      expect(result.error).toBeDefined();
    });

    test('should handle validate-action', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'validate-action')[1];

      const testAction = { action: 'test' };
      const result = await handler({}, testAction);

      expect(mockExecutor.validateAction).toHaveBeenCalledWith(testAction);
      expect(result).toEqual({ valid: true, message: 'Valid action' });
    });

    test('should handle test-action', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'test-action')[1];

      const testAction = { action: 'test' };
      const result = await handler({}, testAction);

      expect(mockExecutor.validateAction).toHaveBeenCalledWith(testAction);
      expect(mockExecutor.executeAction).toHaveBeenCalledWith(testAction);
      expect(result).toEqual({ success: true, message: 'Action executed' });
    });

    test('should handle test-action with invalid action', async () => {
      setupIpcHandlers(mockWindows);
      mockExecutor.validateAction.mockResolvedValue({ valid: false, message: 'Invalid' });

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'test-action')[1];

      const result = await handler({}, { action: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid action');
    });
  });

  describe('configuration handlers', () => {
    test('should handle get-config with key', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'get-config')[1];

      const result = handler({}, 'pages');

      expect(mockConfig.get).toHaveBeenCalledWith('pages');
      expect(result).toEqual([]);
    });

    test('should handle get-config without key', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'get-config')[1];

      const result = handler({});

      expect(result).toEqual(mockConfig.store);
    });

    test('should handle set-config', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'set-config')[1];

      const result = handler({}, 'test.key', 'test value');

      expect(mockConfig.set).toHaveBeenCalledWith('test.key', 'test value');
      expect(result).toBe(true);
    });

    test('should handle set-config with subscription sanitization', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'set-config')[1];

      const subscriptionData = { active: true, features: {} };
      const result = handler({}, 'subscription', subscriptionData);

      expect(mockConfigStore.sanitizeSubscription).toHaveBeenCalledWith(subscriptionData);
      expect(result).toBe(true);
    });

    test('should verify config handlers are registered', () => {
      setupIpcHandlers(mockWindows);

      const handleEvents = mockIpcMain.handle.mock.calls.map(call => call[0]);

      expect(handleEvents).toContain('get-config');
      expect(handleEvents).toContain('set-config');
      expect(handleEvents).toContain('save-config');
      expect(handleEvents).toContain('reset-config');
      expect(handleEvents).toContain('import-config');
      expect(handleEvents).toContain('export-config');
    });

    test('should handle reset-config', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'reset-config')[1];

      const result = await handler();

      expect(mockConfigStore.resetToDefaults).toHaveBeenCalledWith(mockConfig);
      expect(result).toBe(true);
    });
  });

  describe('authentication handlers', () => {
    test('should handle initiate-login', async () => {
      setupIpcHandlers(mockWindows);
      mockAuthManager.initiateLogin.mockResolvedValue({ success: true });

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'initiate-login')[1];

      const result = await handler();

      expect(mockAuthManager.initiateLogin).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle logout', async () => {
      setupIpcHandlers(mockWindows);
      mockAuthManager.logout.mockResolvedValue({ success: true });

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'logout')[1];

      const result = await handler();

      expect(mockAuthManager.logout).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle fetch-user-profile', async () => {
      setupIpcHandlers(mockWindows);
      const profileData = { name: 'Test User' };
      mockAuthManager.fetchUserProfile.mockResolvedValue(profileData);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'fetch-user-profile')[1];

      const result = await handler();

      expect(mockAuthManager.fetchUserProfile).toHaveBeenCalled();
      expect(result).toEqual(profileData);
    });
  });

  describe('system dialog handlers', () => {
    test('should handle show-open-dialog', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'show-open-dialog')[1];

      const options = { filters: [{ name: 'Text', extensions: ['txt'] }] };
      const result = await handler({}, options);

      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(
        mockWindows.toast,
        expect.objectContaining({ modal: true, parent: mockWindows.toast, ...options })
      );
      expect(result).toEqual({ canceled: false, filePaths: ['/test/path'] });
    });

    test('should handle show-save-dialog', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'show-save-dialog')[1];

      const options = { defaultPath: 'test.txt' };
      const result = await handler({}, options);

      expect(mockDialog.showSaveDialog).toHaveBeenCalledWith(
        expect.objectContaining({ modal: true, parent: mockWindows.toast, ...options })
      );
      expect(result).toEqual({ canceled: false, filePath: '/test/save' });
    });

    test('should handle open-url', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'open-url')[1];

      const result = await handler({}, 'https://example.com');

      expect(mockShell.openExternal).toHaveBeenCalledWith('https://example.com');
      expect(result).toBe(true);
    });
  });

  describe('app management handlers', () => {
    test('should handle get-app-version', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'get-app-version')[1];

      const result = handler();

      expect(mockApp.getVersion).toHaveBeenCalled();
      expect(result).toBe('1.0.0');
    });

    test('should handle restart-app', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.on.mock.calls
        .find(([event]) => event === 'restart-app')[1];

      handler();

      expect(mockApp.relaunch).toHaveBeenCalled();
      expect(mockApp.exit).toHaveBeenCalledWith(0);
    });

    test('should handle quit-app', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.on.mock.calls
        .find(([event]) => event === 'quit-app')[1];

      handler();

      expect(mockApp.quit).toHaveBeenCalled();
    });
  });

  describe('update handlers', () => {
    test('should handle check-for-updates', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'check-for-updates')[1];

      const result = await handler({}, false);

      expect(mockUpdater.checkForUpdates).toHaveBeenCalledWith(false);
      expect(result).toEqual({ success: true, hasUpdate: false });
    });

    test('should handle download-update', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'download-update')[1];

      const result = await handler();

      expect(mockUpdater.downloadUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    test('should handle install-update', async () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'install-update')[1];

      const result = await handler();

      expect(mockUpdater.installUpdate).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('logging handlers', () => {
    test('should handle log-info', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'log-info')[1];

      handler({}, 'Test message', 'arg1', 'arg2');

      expect(mockHandleIpcLogging).toHaveBeenCalledWith('info', 'Test message', 'arg1', 'arg2');
    });

    test('should handle log-error', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'log-error')[1];

      handler({}, 'Error message');

      expect(mockHandleIpcLogging).toHaveBeenCalledWith('error', 'Error message');
    });
  });

  describe('shortcut handlers', () => {
    test('should handle temporarily-disable-shortcuts', () => {
      setupIpcHandlers(mockWindows);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'temporarily-disable-shortcuts')[1];

      const result = handler();

      expect(mockShortcuts.unregisterGlobalShortcuts).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle restore-shortcuts', () => {
      setupIpcHandlers(mockWindows);
      mockShortcuts.registerGlobalShortcuts.mockReturnValue(true);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'restore-shortcuts')[1];

      const result = handler();

      expect(mockShortcuts.registerGlobalShortcuts).toHaveBeenCalledWith(mockConfig, mockWindows);
      expect(result).toBe(true);
    });
  });

  describe('utility handlers', () => {
    test('should handle extract-app-icon', async () => {
      setupIpcHandlers(mockWindows);
      mockAppIconExtractor.extractAppNameFromPath.mockReturnValue('TestApp');
      mockAppIconExtractor.extractAppIcon.mockResolvedValue('/path/to/icon.png');
      mockAppIconExtractor.convertToTildePath.mockReturnValue('/path/to/icon.png');

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'extract-app-icon')[1];

      const result = await handler({}, '/Applications/TestApp.app', false);

      expect(mockAppIconExtractor.extractAppNameFromPath).toHaveBeenCalledWith('/Applications/TestApp.app');
      expect(mockAppIconExtractor.extractAppIcon).toHaveBeenCalledWith('TestApp', null, false);
      expect(result).toEqual({
        success: true,
        iconUrl: 'file:///path/to/icon.png',
        iconPath: '/path/to/icon.png',
        appName: 'TestApp',
      });
    });

    test('should handle extract-app-icon with no app name', async () => {
      setupIpcHandlers(mockWindows);
      mockAppIconExtractor.extractAppNameFromPath.mockReturnValue(null);

      const handler = mockIpcMain.handle.mock.calls
        .find(([event]) => event === 'extract-app-icon')[1];

      const result = await handler({}, '/invalid/path');

      expect(result.success).toBe(false);
      expect(result.error).toContain('앱 이름을 추출할 수 없습니다');
    });
  });

  describe('protocol handling', () => {
    test('should handle auth protocol requests', async () => {
      setupIpcHandlers(mockWindows);
      mockAuth.handleAuthRedirect.mockResolvedValue({ success: true, subscription: {} });

      const protocolHandler = global.handleProtocolRequest;
      await protocolHandler('toast-app://auth?action=login&code=testcode');

      expect(mockAuth.handleAuthRedirect).toHaveBeenCalledWith('toast-app://auth?action=login&code=testcode');
      expect(mockWindows.settings.webContents.send).toHaveBeenCalledWith('auth-result', { success: true, subscription: {} });
    });

    test('should handle auth protocol errors', async () => {
      setupIpcHandlers(mockWindows);
      mockAuth.handleAuthRedirect.mockRejectedValue(new Error('Auth error'));

      const protocolHandler = global.handleProtocolRequest;
      await protocolHandler('toast-app://auth?action=login');

      expect(mockAuthManager.notifyLoginError).toHaveBeenCalledWith('Auth error');
    });
  });

  describe('error handling', () => {
    test('should verify error-prone handlers are registered', () => {
      setupIpcHandlers(mockWindows);

      const handleEvents = mockIpcMain.handle.mock.calls.map(call => call[0]);

      // Verify that handlers that need error handling are registered
      expect(handleEvents).toContain('show-open-dialog');
      expect(handleEvents).toContain('show-save-dialog');
      expect(handleEvents).toContain('open-url');
      expect(handleEvents).toContain('check-for-updates');
    });
  });

  describe('edge cases', () => {
    test('should handle setup with null windows gracefully', () => {
      const nullWindows = { toast: null, settings: null };
      
      setupIpcHandlers(nullWindows);

      // Should still register handlers even with null windows
      expect(mockIpcMain.handle).toHaveBeenCalled();
      expect(mockIpcMain.on).toHaveBeenCalled();
    });

    test('should verify utility handlers are registered', () => {
      setupIpcHandlers(mockWindows);

      const handleEvents = mockIpcMain.handle.mock.calls.map(call => call[0]);

      expect(handleEvents).toContain('extract-app-icon');
      expect(handleEvents).toContain('get-app-version');
      expect(handleEvents).toContain('log-info');
      expect(handleEvents).toContain('log-error');
    });
  });
});