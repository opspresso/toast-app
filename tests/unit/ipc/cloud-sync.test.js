/**
 * Toast - Cloud Sync IPC Handlers Tests
 */

const mockIpcMain = {
  handle: jest.fn(),
  on: jest.fn(),
};

jest.mock('electron', () => ({
  ipcMain: mockIpcMain,
}));

const mockAuthManager = {
  hasValidToken: jest.fn(),
};

jest.mock('../../../src/main/auth-manager', () => mockAuthManager);

jest.mock('../../../src/main/user-data-manager', () => ({}));

jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

const mockBroadcastToWindows = jest.fn();
jest.mock('../../../src/main/broadcast', () => ({
  broadcastToWindows: (...args) => mockBroadcastToWindows(...args),
}));

jest.mock('../../../src/main/config', () => ({
  getDeviceId: jest.fn(() => 'device-123'),
}));

const mockGetSyncManager = jest.fn();
jest.mock('../../../src/main/cloud-sync', () => ({
  getSyncManager: (...args) => mockGetSyncManager(...args),
}));

const { setupCloudSyncHandlers } = require('../../../src/main/ipc/cloud-sync');

function getHandler(channel) {
  const call = mockIpcMain.handle.mock.calls.find(([name]) => name === channel);
  return call && call[1];
}

describe('Cloud Sync IPC Handlers', () => {
  let windows;
  let config;

  beforeEach(() => {
    jest.clearAllMocks();

    windows = {
      toast: { isDestroyed: jest.fn(() => false), webContents: { send: jest.fn() } },
      settings: { isDestroyed: jest.fn(() => false), webContents: { send: jest.fn() } },
    };
    config = { get: jest.fn(), set: jest.fn() };

    setupCloudSyncHandlers(windows, config);
  });

  describe('get-sync-status', () => {
    test('returns the manager status when the sync manager is initialized', async () => {
      const status = { enabled: true, deviceId: 'device-123', lastSyncTime: 111, lastChangeType: 'upload' };
      mockGetSyncManager.mockReturnValue({ getCurrentStatus: jest.fn(() => status) });

      const result = await getHandler('get-sync-status')();

      expect(result).toBe(status);
    });

    test('falls back to config when the sync manager is not initialized', async () => {
      mockGetSyncManager.mockReturnValue(null);
      config.get.mockImplementation(key => (key === 'cloudSync.enabled' ? false : undefined));

      const result = await getHandler('get-sync-status')();

      expect(result).toEqual({
        enabled: false,
        deviceId: 'device-123',
        lastSyncTime: 0,
        lastChangeType: null,
      });
    });

    test('defaults enabled to true when config has no cloudSync.enabled value and the manager is missing', async () => {
      mockGetSyncManager.mockReturnValue(null);
      config.get.mockReturnValue(undefined);

      const result = await getHandler('get-sync-status')();

      expect(result.enabled).toBe(true);
    });

    test('falls back to config when getSyncManager throws, defaulting enabled to false', async () => {
      mockGetSyncManager.mockImplementation(() => {
        throw new Error('cloud-sync module unavailable');
      });
      config.get.mockReturnValue(undefined);

      const result = await getHandler('get-sync-status')();

      expect(result).toEqual({
        enabled: false,
        deviceId: 'device-123',
        lastSyncTime: 0,
        lastChangeType: null,
      });
    });

    test('returns a safe default when both the sync manager and the config read fail', async () => {
      mockGetSyncManager.mockImplementation(() => {
        throw new Error('cloud-sync module unavailable');
      });
      config.get.mockImplementation(() => {
        throw new Error('config store unavailable');
      });

      const result = await getHandler('get-sync-status')();

      expect(result).toEqual({
        enabled: false,
        deviceId: 'device-123',
        lastSyncTime: 0,
        lastChangeType: null,
      });
    });
  });

  describe('set-cloud-sync-enabled', () => {
    test('enables sync through the manager and returns its status', () => {
      const status = { enabled: true };
      const manager = { enable: jest.fn(), disable: jest.fn(), getCurrentStatus: jest.fn(() => status) };
      mockGetSyncManager.mockReturnValue(manager);

      return getHandler('set-cloud-sync-enabled')({}, true).then(result => {
        expect(manager.enable).toHaveBeenCalled();
        expect(manager.disable).not.toHaveBeenCalled();
        expect(result).toEqual({ success: true, status });
      });
    });

    test('disables sync through the manager', async () => {
      const manager = { enable: jest.fn(), disable: jest.fn(), getCurrentStatus: jest.fn(() => ({ enabled: false })) };
      mockGetSyncManager.mockReturnValue(manager);

      await getHandler('set-cloud-sync-enabled')({}, false);

      expect(manager.disable).toHaveBeenCalled();
      expect(manager.enable).not.toHaveBeenCalled();
    });

    test('returns a failure result when the sync manager is not initialized', async () => {
      mockGetSyncManager.mockReturnValue(null);

      const result = await getHandler('set-cloud-sync-enabled')({}, true);

      expect(result).toEqual({ success: false, error: 'Cloud sync manager not initialized' });
    });

    test('returns a failure result when the manager throws', async () => {
      mockGetSyncManager.mockReturnValue({
        enable: () => {
          throw new Error('boom');
        },
      });

      const result = await getHandler('set-cloud-sync-enabled')({}, true);

      expect(result).toEqual({ success: false, error: 'boom' });
    });
  });

  describe('manual-sync', () => {
    test('rejects an action outside the upload/download/resolve allowlist', async () => {
      const result = await getHandler('manual-sync')({}, 'delete-everything');

      expect(result).toEqual({ success: false, error: 'Invalid sync action: delete-everything' });
      expect(mockGetSyncManager).not.toHaveBeenCalled();
    });

    test('performs the sync and broadcasts config-updated on success', async () => {
      const manager = { manualSync: jest.fn().mockResolvedValue({ success: true }) };
      mockGetSyncManager.mockReturnValue(manager);
      config.get.mockImplementation(key => `value-${key}`);

      const result = await getHandler('manual-sync')({}, 'upload');

      expect(manager.manualSync).toHaveBeenCalledWith('upload');
      expect(result).toEqual({ success: true });
      expect(mockBroadcastToWindows).toHaveBeenCalledWith(
        windows,
        'config-updated',
        expect.objectContaining({ pages: 'value-pages', snippets: 'value-snippets' }),
      );
    });

    test('does not broadcast when the sync result is unsuccessful', async () => {
      const manager = { manualSync: jest.fn().mockResolvedValue({ success: false, error: 'conflict' }) };
      mockGetSyncManager.mockReturnValue(manager);

      const result = await getHandler('manual-sync')({}, 'download');

      expect(result).toEqual({ success: false, error: 'conflict' });
      expect(mockBroadcastToWindows).not.toHaveBeenCalled();
    });

    test('returns a failure result when the sync manager is not initialized', async () => {
      mockGetSyncManager.mockReturnValue(null);

      const result = await getHandler('manual-sync')({}, 'resolve');

      expect(result).toEqual({ success: false, error: 'Cloud sync manager not initialized' });
    });

    test('returns a failure result when manualSync rejects', async () => {
      const manager = { manualSync: jest.fn().mockRejectedValue(new Error('network down')) };
      mockGetSyncManager.mockReturnValue(manager);

      const result = await getHandler('manual-sync')({}, 'upload');

      expect(result).toEqual({ success: false, error: 'network down' });
    });
  });

  describe('debug-sync-status', () => {
    test('reports manager status plus token validity when initialized', async () => {
      const status = { enabled: true };
      mockGetSyncManager.mockReturnValue({ getCurrentStatus: jest.fn(() => status) });
      mockAuthManager.hasValidToken.mockResolvedValue(true);
      config.get.mockReturnValue({ active: true, isSubscribed: true, features: { cloud_sync: true }, plan: 'premium' });

      const result = await getHandler('debug-sync-status')();

      expect(result.success).toBe(true);
      expect(result.status.hasValidToken).toBe(true);
      expect(result.status.subscription).toEqual({ active: true, isSubscribed: true, features: { cloud_sync: true }, plan: 'premium' });
    });

    test('reports failure with debug info when the sync manager is not initialized', async () => {
      mockGetSyncManager.mockReturnValue(null);

      const result = await getHandler('debug-sync-status')();

      expect(result).toEqual({
        success: false,
        error: 'Cloud sync manager not initialized - authManager or userDataManager missing',
        debug: { hasAuthManager: true, hasUserDataManager: true },
      });
    });

    test('returns a failure result when reading status throws', async () => {
      mockGetSyncManager.mockReturnValue({
        getCurrentStatus: () => {
          throw new Error('status unavailable');
        },
      });

      const result = await getHandler('debug-sync-status')();

      expect(result).toEqual({ success: false, error: 'status unavailable' });
    });
  });

  describe('settings-synced forwarding', () => {
    test('forwards the settings-synced event to both windows', () => {
      const call = mockIpcMain.on.mock.calls.find(([name]) => name === 'settings-synced');
      expect(call).toBeDefined();

      const handler = call[1];
      handler({}, { pages: [] });

      expect(mockBroadcastToWindows).toHaveBeenCalledWith(windows, 'settings-synced', { pages: [] });
    });
  });
});
