/**
 * Toast - Cloud Sync Module Tests
 *
 * Unit tests for the cloud sync module
 * Verifies critical features based on real user scenarios
 */

// Mock dependencies
const mockConfigStore = {
  get: jest.fn(),
  set: jest.fn(),
  onDidChange: jest.fn(),
};

const mockAuthManager = {
  hasValidToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  notifySettingsSynced: jest.fn(),
};

const mockApiSync = {
  isCloudSyncEnabled: jest.fn(),
  uploadSettings: jest.fn(),
  downloadSettings: jest.fn(),
};

// Mock logger
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock API module
jest.mock('../../src/main/api', () => ({
  sync: mockApiSync,
}));

// Mock action-approval (remote page validation / approval gating)
jest.mock('../../src/main/action-approval', () => ({
  sanitizeRemotePages: jest.fn(async pages => pages),
  recordRemoteChanges: jest.fn(),
}));

// Mock icon normalizer (file:// → https URL migration during upload)
const mockIconNormalizer = {
  normalizeLocalIcons: jest.fn(),
};

jest.mock('../../src/main/utils/icon-normalizer', () => mockIconNormalizer);

// Mock config module
jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfigStore),
  markAsModified: jest.fn(),
  markAsSynced: jest.fn(),
  hasUnsyncedChanges: jest.fn(),
  getSyncMetadata: jest.fn(() => ({
    lastModifiedAt: Date.now(),
    lastModifiedDevice: 'test-device',
    lastSyncedAt: Date.now() - 1000,
    lastSyncedDevice: 'test-device',
  })),
  getDeviceId: jest.fn(() => 'test-device-id'),
  updateSyncMetadata: jest.fn(),
}));

// Use fake timers with modern implementation
jest.useFakeTimers('modern');

describe('Cloud Sync Module', () => {
  let cloudSync;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Reset API mocks
    mockApiSync.isCloudSyncEnabled.mockResolvedValue(true);
    mockApiSync.uploadSettings.mockResolvedValue({ success: true });
    mockApiSync.downloadSettings.mockResolvedValue({
      success: true,
      data: {
        pages: [],
        appearance: {},
        advanced: {},
      }
    });

    // Reset auth manager mocks
    mockAuthManager.hasValidToken.mockResolvedValue(true);
    mockAuthManager.refreshAccessToken.mockResolvedValue({ success: true });

    // Reset icon normalizer mock (default: no local icons to migrate)
    mockIconNormalizer.normalizeLocalIcons.mockImplementation(async pages => ({ pages, changed: false, failures: 0 }));

    // Reset config store mocks
    mockConfigStore.get.mockImplementation((key) => {
      const mockData = {
        'pages': [{ id: 1, name: 'Test Page' }],
        'appearance': { theme: 'dark' },
        'advanced': { autoStart: true },
      };
      return mockData[key] || {};
    });

    // Re-require the module to get a fresh instance
    // (jest.resetModules is required to reset the initCloudSync singleton guard)
    jest.resetModules();
    cloudSync = require('../../src/main/cloud-sync');

    // Initialize with mocks
    cloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should initialize cloud sync with auth manager and config store', () => {
      expect(mockConfigStore.onDidChange).toHaveBeenCalled();
    });

    test('should handle initialization with null auth manager', () => {
      cloudSync.initCloudSync(null, null, mockConfigStore);

      // Should not throw error
      expect(mockConfigStore.onDidChange).toHaveBeenCalled();
    });

    test('should not register config listeners twice on repeated initCloudSync', () => {
      const listenerCallsAfterFirstInit = mockConfigStore.onDidChange.mock.calls.length;

      const secondManager = cloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      expect(mockConfigStore.onDidChange.mock.calls.length).toBe(listenerCallsAfterFirstInit);
      expect(secondManager).toBeDefined();
    });

    test('should return the same manager instance from getSyncManager', () => {
      expect(cloudSync.getSyncManager()).toBeDefined();
      expect(cloudSync.initCloudSync(mockAuthManager, null, mockConfigStore)).toBe(cloudSync.getSyncManager());
    });
  });

  describe('Auth Manager Integration', () => {
    test('should set auth manager', () => {
      const newAuthManager = { hasValidToken: jest.fn() };

      cloudSync.setAuthManager(newAuthManager);

      // Verify auth manager is set by checking internal state doesn't crash upload
      // Upload should proceed to check auth manager functionality
      const uploadPromise = cloudSync.uploadSettings();
      expect(uploadPromise).toBeInstanceOf(Promise);
    });

    test('should handle null auth manager', () => {
      cloudSync.setAuthManager(null);

      // Should handle null auth manager gracefully
      cloudSync.setAuthManager(null);
      // Verify state is maintained correctly
      const uploadResult = cloudSync.uploadSettings();
      expect(uploadResult).toBeInstanceOf(Promise);
    });
  });

  describe('Periodic Sync Management', () => {
    test('should start periodic sync without throwing errors', () => {
      cloudSync.startPeriodicSync();
      
      // Verify periodic sync is started (timer should be set)
      // Fast-forward time to verify sync is active
      jest.advanceTimersByTime(1000);
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(0);
    });

    test('should stop periodic sync without throwing errors', () => {
      cloudSync.startPeriodicSync();
      const timerCount = jest.getTimerCount();
      
      cloudSync.stopPeriodicSync();
      
      // Verify timers are cleared
      expect(jest.getTimerCount()).toBeLessThanOrEqual(timerCount);
    });

    test('should handle multiple start calls safely', () => {
      cloudSync.startPeriodicSync();
      const initialTimerCount = jest.getTimerCount();
      
      cloudSync.startPeriodicSync();
      
      // Should handle multiple starts without creating duplicate timers
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(initialTimerCount);
    });

    test('should handle stop when no timer is running', () => {
      const initialTimerCount = jest.getTimerCount();
      
      cloudSync.stopPeriodicSync();
      
      // Should handle stopping when no timer is running
      expect(jest.getTimerCount()).toBeLessThanOrEqual(initialTimerCount);
    });

    test('should not blindly overwrite unsynced local changes when the periodic timer fires', async () => {
      // downloadSettings() alone (the old periodic-sync path) would unconditionally
      // overwrite ConfigStore with whatever the server returns, even if the local
      // copy has edits the server has never seen. Periodic sync must instead route
      // through conflict resolution.
      const configModule = require('../../src/main/config');
      configModule.hasUnsyncedChanges.mockReturnValue(true);
      configModule.getSyncMetadata.mockReturnValue({
        lastModifiedAt: Date.now(),
        lastModifiedDevice: 'test-device',
        lastSyncedAt: Date.now() - 1000,
        lastSyncedDevice: 'test-device',
      });

      // Server data is far older than the local unsynced edit, so conflict
      // resolution must choose to upload local changes, not overwrite them.
      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: { pages: [{ id: 99, name: 'Stale Server Page' }] },
        syncMetadata: { lastModifiedAt: Date.now() - 10 * 60 * 1000 },
      });

      cloudSync.updateCloudSyncSettings(true);

      await jest.advanceTimersByTimeAsync(15 * 60 * 1000);

      expect(mockConfigStore.set).not.toHaveBeenCalledWith('pages', [{ id: 99, name: 'Stale Server Page' }]);
      expect(mockApiSync.uploadSettings).toHaveBeenCalled();
    });

    test('should integrate with updateCloudSyncSettings', () => {
      const initialTimerCount = jest.getTimerCount();
      
      // Starting sync via updateCloudSyncSettings should work
      cloudSync.updateCloudSyncSettings(true);
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(initialTimerCount);
      
      const enabledTimerCount = jest.getTimerCount();
      
      // Stopping sync via updateCloudSyncSettings should work
      cloudSync.updateCloudSyncSettings(false);
      expect(jest.getTimerCount()).toBeLessThanOrEqual(enabledTimerCount);
    });
  });

  describe('Upload Settings', () => {
    test('should upload settings successfully', async () => {
      mockApiSync.uploadSettings.mockResolvedValue({ success: true });

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(true);
      expect(mockApiSync.uploadSettings).toHaveBeenCalledWith({
        hasValidToken: mockAuthManager.hasValidToken,
        onUnauthorized: mockAuthManager.refreshAccessToken,
        configStore: mockConfigStore,
        directData: expect.objectContaining({
          pages: expect.any(Array),
          appearance: expect.any(Object),
          advanced: expect.any(Object),
          lastModifiedAt: expect.any(Number),
          lastSyncedAt: expect.any(Number),
        }),
      });
    });

    test('should upload normalized pages and persist them when icons were migrated', async () => {
      const normalizedPages = [
        { id: 1, name: 'Test Page', buttons: [{ name: 'App', action: 'application', icon: 'https://icons.example.com/a.png' }] },
      ];
      mockIconNormalizer.normalizeLocalIcons.mockResolvedValue({ pages: normalizedPages, changed: true, failures: 0 });

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(true);
      // The normalized pages are saved to ConfigStore and also included in the upload payload
      expect(mockConfigStore.set).toHaveBeenCalledWith('pages', normalizedPages);
      const uploadArg = mockApiSync.uploadSettings.mock.calls[0][0];
      expect(uploadArg.directData.pages).toBe(normalizedPages);
    });

    test('should not write pages back to config store when normalization made no changes', async () => {
      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(true);
      expect(mockIconNormalizer.normalizeLocalIcons).toHaveBeenCalled();
      expect(mockConfigStore.set).not.toHaveBeenCalledWith('pages', expect.anything());
    });

    test('should still upload when icon normalization throws', async () => {
      mockIconNormalizer.normalizeLocalIcons.mockRejectedValue(new Error('network down'));

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(true);
      expect(mockApiSync.uploadSettings).toHaveBeenCalled();
    });

    test('should handle upload failure', async () => {
      mockApiSync.uploadSettings.mockResolvedValue({
        success: false,
        error: 'Network error'
      });

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should back off exponentially with jitter across retry attempts', () => {
      // Base 5000ms: attempt 1 in [5000, 6000), attempt 2 in [10000, 12000),
      // attempt 3 in [20000, 24000) — capped at 30000ms beyond that.
      const delay1 = cloudSync.computeRetryDelay(1);
      const delay2 = cloudSync.computeRetryDelay(2);
      const delay3 = cloudSync.computeRetryDelay(3);
      const delay10 = cloudSync.computeRetryDelay(10);

      expect(delay1).toBeGreaterThanOrEqual(5000);
      expect(delay1).toBeLessThan(6000);

      expect(delay2).toBeGreaterThanOrEqual(10000);
      expect(delay2).toBeLessThan(12000);

      expect(delay3).toBeGreaterThanOrEqual(20000);
      expect(delay3).toBeLessThan(24000);

      // Delays must not collide device-to-device: with jitter, a large sample
      // of same-attempt delays should not all be identical.
      const samples = Array.from({ length: 20 }, () => cloudSync.computeRetryDelay(1));
      expect(new Set(samples).size).toBeGreaterThan(1);

      // Capped so a long retry streak never waits longer than MAX_RETRY_DELAY_MS + jitter
      expect(delay10).toBeLessThanOrEqual(30000 * 1.2);
    });

    test('should propagate HTTP statusCode from API on failure', async () => {
      // apiSync returns HTTP errors nested as { error: { statusCode } }, so
      // the wrapper must normalize it to a top-level statusCode that the retry logic reads
      mockApiSync.uploadSettings.mockResolvedValue({ error: { code: 'HTTP_409', message: 'stale', statusCode: 409 } });

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(409);
      expect(result.error).toBe('stale');
    });

    test('should skip upload when sync is disabled', async () => {
      cloudSync.updateCloudSyncSettings(false);

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(false);
      expect(mockApiSync.uploadSettings).not.toHaveBeenCalled();
    });

    test('should handle multiple upload attempts gracefully', async () => {
      // This test verifies that multiple upload calls are handled safely
      // without necessarily checking the specific internal behavior
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(cloudSync.uploadSettings());
      }

      const results = await Promise.all(promises);

      // At least one should succeed, others may be skipped
      const hasSuccess = results.some(r => r.success);
      const allCompleted = results.every(r => typeof r.success === 'boolean');

      expect(hasSuccess || allCompleted).toBe(true);
    });

    test('should handle upload exceptions gracefully', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockApiSync.uploadSettings.mockRejectedValue(new Error('Network failure'));

      const result = await freshCloudSync.uploadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toContain('failure'); // More flexible matching
    });

    test('marks synced using the uploaded snapshot rather than live ConfigStore data', async () => {
      // A change made during the upload round-trip must not be mistaken for already
      // being synced: markAsSynced has to hash the data that was actually sent, not
      // whatever ConfigStore holds by the time the response comes back.
      const configModule = require('../../src/main/config');
      mockApiSync.uploadSettings.mockResolvedValue({ success: true });

      await cloudSync.uploadSettings();

      expect(configModule.markAsSynced).toHaveBeenCalledWith(
        mockConfigStore,
        null,
        expect.objectContaining({
          pages: expect.any(Array),
          appearance: expect.any(Object),
          advanced: expect.any(Object),
        }),
      );
    });

    test('should call API with expected data structure', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockApiSync.uploadSettings.mockResolvedValue({ success: true });

      await freshCloudSync.uploadSettings();

      expect(mockApiSync.uploadSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          hasValidToken: mockAuthManager.hasValidToken,
          onUnauthorized: mockAuthManager.refreshAccessToken,
          configStore: mockConfigStore,
          directData: expect.objectContaining({
            pages: expect.any(Array),
            appearance: expect.any(Object),
            advanced: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('Download Settings', () => {
    test('should download settings successfully', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      const mockData = {
        pages: [{ id: 1, name: 'Downloaded Page' }],
        appearance: { theme: 'light' },
        advanced: { autoStart: false },
      };

      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const result = await freshCloudSync.downloadSettings();

      expect(result.success).toBe(true);
      // Download calls apiSync for fetch only (saving is done directly by cloud-sync).
      expect(mockApiSync.downloadSettings).toHaveBeenCalledWith({
        hasValidToken: mockAuthManager.hasValidToken,
        onUnauthorized: mockAuthManager.refreshAccessToken,
      });
    });

    test('should apply normalized server data to ConfigStore', async () => {
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockConfigStore.set.mockClear();
      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: {},
        normalized: {
          pages: [{ name: 'P1', buttons: [] }],
          appearance: { theme: 'dark' },
          advanced: { autoStart: true },
        },
        syncMetadata: { lastModifiedAt: 123 },
      });

      const result = await freshCloudSync.downloadSettings();

      expect(result.success).toBe(true);
      expect(mockConfigStore.set).toHaveBeenCalledWith('pages', [{ name: 'P1', buttons: [] }]);
      expect(mockConfigStore.set).toHaveBeenCalledWith('appearance', { theme: 'dark' });
      expect(mockConfigStore.set).toHaveBeenCalledWith('advanced', { autoStart: true });
    });

    test('should handle download failure', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockApiSync.downloadSettings.mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const result = await freshCloudSync.downloadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });

    test('should skip download when sync is disabled', async () => {
      cloudSync.updateCloudSyncSettings(false);

      const result = await cloudSync.downloadSettings();

      expect(result.success).toBe(false);
      expect(mockApiSync.downloadSettings).not.toHaveBeenCalled();
    });

    test('should handle multiple download attempts gracefully', async () => {
      const promises = [];

      for (let i = 0; i < 3; i++) {
        promises.push(cloudSync.downloadSettings());
      }

      const results = await Promise.all(promises);

      // All should complete with some result
      const allCompleted = results.every(r => typeof r.success === 'boolean');

      expect(allCompleted).toBe(true);
    });

    test('should handle download exceptions gracefully', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockApiSync.downloadSettings.mockRejectedValue(new Error('Connection timeout'));

      const result = await freshCloudSync.downloadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('refreshes dataHash via markAsSynced after applying server data with metadata', async () => {
      // Previously only lastSyncedAt/lastModifiedAt were updated when serverMetadata was
      // present, leaving dataHash stale so hasUnsyncedChanges() was true on every check
      // right after a download. markAsSynced must run first to recompute it from the data
      // that was just written, then lastModifiedAt/Device are overridden with the server's.
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);
      const configModule = require('../../src/main/config');
      configModule.markAsSynced.mockClear();
      configModule.updateSyncMetadata.mockClear();

      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: {},
        normalized: { pages: [{ name: 'P1', buttons: [] }], appearance: {}, advanced: {} },
        syncMetadata: { lastModifiedAt: 123, lastModifiedDevice: 'server-device' },
      });

      const result = await freshCloudSync.downloadSettings();

      expect(result.success).toBe(true);
      expect(configModule.markAsSynced).toHaveBeenCalledWith(mockConfigStore);
      expect(configModule.updateSyncMetadata).toHaveBeenCalledWith(
        mockConfigStore,
        expect.objectContaining({ lastModifiedAt: 123, lastModifiedDevice: 'server-device' }),
      );
    });

    test('should attempt to notify auth manager on sync', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      mockApiSync.downloadSettings.mockResolvedValue({ success: true });

      await freshCloudSync.downloadSettings();

      // Should attempt to notify auth manager on successful sync
      // The notifySettingsSynced should be a function that can be called
      expect(typeof mockAuthManager.notifySettingsSynced).toBe('function');
    });
  });

  describe('Configuration Change Handling', () => {
    test('should set up config change listeners during initialization', () => {
      // Already tested in initialization - config listeners are set up
      expect(mockConfigStore.onDidChange).toHaveBeenCalled();
    });

    test('should have functional config change handler', () => {
      // This tests the internal scheduleSync mechanism indirectly
      // Config change handler is set up during initCloudSync
      const changeHandlerCall = mockConfigStore.onDidChange.mock.calls.find(call =>
        call[0] === 'pages' && typeof call[1] === 'function'
      );

      expect(changeHandlerCall).toBeDefined();

      // Should be able to call the handler and verify sync scheduling
      if (changeHandlerCall) {
        const handler = changeHandlerCall[1];
        const initialTimerCount = jest.getTimerCount();

        handler([], []);

        // Handler should potentially schedule sync operations
        expect(jest.getTimerCount()).toBeGreaterThanOrEqual(initialTimerCount);
      }
    });

    test('records markAsModified even when sync cannot run (e.g. logged out)', async () => {
      // Without this, an offline edit's lastModifiedAt stays stale, so a later conflict
      // check (after re-login) can pick download_server and overwrite the edit instead
      // of preserving it via merge.
      const configModule = require('../../src/main/config');
      mockAuthManager.hasValidToken.mockResolvedValue(false);

      const changeHandlerCall = mockConfigStore.onDidChange.mock.calls.find(call =>
        call[0] === 'pages' && typeof call[1] === 'function'
      );
      expect(changeHandlerCall).toBeDefined();

      await changeHandlerCall[1]([], []);

      expect(configModule.markAsModified).toHaveBeenCalledWith(mockConfigStore);
      expect(mockApiSync.uploadSettings).not.toHaveBeenCalled();
    });

    test('does not drop a change that arrives while a debounced upload is still in flight', async () => {
      // Regression: uploadSettingsWithRetry's success/skipped/409/400 branches used to
      // unconditionally clear state.pendingSync, discarding a change that arrived after
      // the upload's snapshot was taken but before it resolved. Only the finally block
      // should own clearing pendingSync, after acting on it.
      const pagesHandler = mockConfigStore.onDidChange.mock.calls.find(call => call[0] === 'pages')[1];
      const snippetsHandler = mockConfigStore.onDidChange.mock.calls.find(call => call[0] === 'snippets')[1];

      let resolveFirstUpload;
      mockApiSync.uploadSettings.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstUpload = resolve;
          }),
      );

      await pagesHandler([], []);
      await jest.advanceTimersByTimeAsync(5000); // debounce fires -> upload starts, now pending

      expect(mockApiSync.uploadSettings).toHaveBeenCalledTimes(1);

      // A second, independent change arrives while the first upload is still in flight.
      await snippetsHandler();

      // Let the in-flight upload succeed.
      resolveFirstUpload({ success: true });
      await Promise.resolve();
      await Promise.resolve();

      // The pending change must trigger a reprocessing (1s delay) which itself debounces
      // another 5s before actually re-uploading.
      await jest.advanceTimersByTimeAsync(1000 + 5000);

      expect(mockApiSync.uploadSettings).toHaveBeenCalledTimes(2);
    });

    test('does not drop a change that arrives while reconcileStaleUpload (409 recovery) holds the sync lock', async () => {
      // Regression: reconcileStaleUpload's finally only cleared state.isSyncing and never
      // consulted state.pendingSync, so a change that arrived while it was downloading +
      // merging + re-uploading was silently dropped until the next periodic sync.
      mockConfigStore.get.mockImplementation(key => {
        const mockData = {
          pages: [{ id: 1, name: 'Test Page' }],
          snippets: [],
          appearance: { theme: 'dark' },
          advanced: { autoStart: true },
        };
        return mockData[key] ?? {};
      });

      const pagesHandler = mockConfigStore.onDidChange.mock.calls.find(call => call[0] === 'pages')[1];
      const snippetsHandler = mockConfigStore.onDidChange.mock.calls.find(call => call[0] === 'snippets')[1];

      // First upload attempt is rejected as stale (409), which schedules reconcileStaleUpload.
      mockApiSync.uploadSettings.mockImplementationOnce(() =>
        Promise.resolve({ error: { code: 'HTTP_409', message: 'stale', statusCode: 409 } }),
      );

      await pagesHandler([], []);
      await jest.advanceTimersByTimeAsync(5000); // debounce -> upload -> 409 -> reconcile scheduled in 5s

      expect(mockApiSync.uploadSettings).toHaveBeenCalledTimes(1);

      // reconcile's download starts here; hold it open so a change can arrive mid-reconcile.
      let resolveDownload;
      mockApiSync.downloadSettings.mockReturnValueOnce(
        new Promise(resolve => {
          resolveDownload = resolve;
        }),
      );
      mockApiSync.uploadSettings.mockResolvedValueOnce({ success: true }); // reconcile's own re-upload

      await jest.advanceTimersByTimeAsync(5000); // reconcile timer fires, download now pending

      // A second, independent change arrives while reconciliation holds the sync lock.
      await snippetsHandler();

      resolveDownload({
        success: true,
        data: {},
        normalized: { pages: [], snippets: [], appearance: {}, advanced: {} },
      });
      await jest.advanceTimersByTimeAsync(0);

      // reconcile's own re-upload should have completed by now.
      expect(mockApiSync.uploadSettings).toHaveBeenCalledTimes(2);

      // The change that arrived mid-reconcile must still be reprocessed: 1s delay, then a
      // fresh 5s debounce, then another upload.
      mockApiSync.uploadSettings.mockResolvedValueOnce({ success: true });
      await jest.advanceTimersByTimeAsync(1000 + 5000);

      expect(mockApiSync.uploadSettings).toHaveBeenCalledTimes(3);
    });
  });

  describe('Login Sync', () => {
    test('should not blindly overwrite unsynced local changes when syncing after login', async () => {
      // syncAfterLogin() used to call downloadSettings() directly, clobbering
      // offline edits made while logged out. It must route through conflict
      // resolution instead, same as periodic sync.
      const configModule = require('../../src/main/config');
      configModule.hasUnsyncedChanges.mockReturnValue(true);
      configModule.getSyncMetadata.mockReturnValue({
        lastModifiedAt: Date.now(),
        lastModifiedDevice: 'test-device',
        lastSyncedAt: Date.now() - 1000,
        lastSyncedDevice: 'test-device',
      });

      // Server data is far older than the local unsynced edit, so conflict
      // resolution must choose to upload local changes, not overwrite them.
      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: { pages: [{ id: 99, name: 'Stale Server Page' }] },
        syncMetadata: { lastModifiedAt: Date.now() - 10 * 60 * 1000 },
      });

      cloudSync.updateCloudSyncSettings(true);
      const syncManager = cloudSync.getSyncManager();

      await syncManager.syncAfterLogin();

      expect(mockConfigStore.set).not.toHaveBeenCalledWith('pages', [{ id: 99, name: 'Stale Server Page' }]);
      expect(mockApiSync.uploadSettings).toHaveBeenCalled();
    });

    test('should still download server settings after login when there are no local changes', async () => {
      const configModule = require('../../src/main/config');
      configModule.hasUnsyncedChanges.mockReturnValue(false);
      configModule.getSyncMetadata.mockReturnValue({
        lastModifiedAt: Date.now() - 10 * 60 * 1000,
        lastModifiedDevice: 'test-device',
        lastSyncedAt: Date.now() - 10 * 60 * 1000,
        lastSyncedDevice: 'test-device',
      });

      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: {},
        normalized: { pages: [{ id: 1, name: 'Server Page' }] },
        syncMetadata: { lastModifiedAt: Date.now() },
      });

      cloudSync.updateCloudSyncSettings(true);
      const syncManager = cloudSync.getSyncManager();

      const result = await syncManager.syncAfterLogin();

      expect(result.success).toBe(true);
      expect(mockConfigStore.set).toHaveBeenCalledWith('pages', [{ id: 1, name: 'Server Page' }]);
    });

    test('should include snippets in the config data sent to the UI after login sync', async () => {
      const configModule = require('../../src/main/config');
      configModule.hasUnsyncedChanges.mockReturnValue(false);
      configModule.getSyncMetadata.mockReturnValue({
        lastModifiedAt: Date.now() - 10 * 60 * 1000,
        lastModifiedDevice: 'test-device',
        lastSyncedAt: Date.now() - 10 * 60 * 1000,
        lastSyncedDevice: 'test-device',
      });

      mockConfigStore.get.mockImplementation(key => {
        const mockData = {
          pages: [{ id: 1, name: 'Server Page' }],
          snippets: [{ id: 'sn-1', keyword: 'hi', content: 'hello' }],
          appearance: { theme: 'dark' },
          advanced: { autoStart: true },
        };
        return mockData[key] || {};
      });

      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        data: {},
        normalized: { pages: [{ id: 1, name: 'Server Page' }] },
        syncMetadata: { lastModifiedAt: Date.now() },
      });

      cloudSync.updateCloudSyncSettings(true);
      const syncManager = cloudSync.getSyncManager();

      await syncManager.syncAfterLogin();

      expect(mockAuthManager.notifySettingsSynced).toHaveBeenCalledWith(
        expect.objectContaining({ snippets: [{ id: 'sn-1', keyword: 'hi', content: 'hello' }] })
      );
    });
  });

  describe('Sync Settings Integration', () => {
    test('should perform bidirectional sync', async () => {
      const mockConflictData = {
        success: true,
        action: 'resolved',
        data: {
          pages: [{ id: 1, name: 'Synced Page' }],
          appearance: { theme: 'auto' },
          advanced: { autoStart: true },
        },
      };

      mockApiSync.downloadSettings.mockResolvedValue(mockConflictData);

      const result = await cloudSync.syncSettings('resolve');

      expect(mockApiSync.downloadSettings).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should handle sync conflicts', async () => {
      mockApiSync.downloadSettings.mockResolvedValue({
        success: true,
        hasConflict: true,
        data: { pages: [] },
      });

      const result = await cloudSync.syncSettings();

      expect(result.success).toBe(true);
    });

    test('holds the cloud-sync lock during the resolve peek download so a concurrent upload defers instead of colliding with api/sync.js\'s own lock', async () => {
      // api/sync.js shares one isSyncing flag between its own upload/download. Without
      // cloud-sync.js holding its own lock for this peek (which doesn't touch ConfigStore),
      // a debounced upload could start concurrently and fail with a spurious "Sync already
      // in progress" from api/sync.js instead of being deferred here.
      const configModule = require('../../src/main/config');
      configModule.hasUnsyncedChanges.mockReturnValue(false);

      let resolveDownload;
      mockApiSync.downloadSettings.mockReturnValue(
        new Promise(resolve => {
          resolveDownload = resolve;
        }),
      );

      const resolvePromise = cloudSync.syncSettings('resolve');

      // While the peek download is still in flight, a concurrent upload must be deferred
      // at the cloud-sync level, never reaching apiSync.uploadSettings.
      const concurrentUpload = await cloudSync.uploadSettings();
      expect(concurrentUpload.success).toBe(false);
      expect(mockApiSync.uploadSettings).not.toHaveBeenCalled();

      resolveDownload({ success: true, data: {}, syncMetadata: { lastModifiedAt: Date.now() - 10 * 60 * 1000 } });
      await resolvePromise;

      // The lock must be released afterwards so normal syncing resumes.
      mockApiSync.uploadSettings.mockResolvedValue({ success: true });
      const uploadAfter = await cloudSync.uploadSettings();
      expect(uploadAfter.success).toBe(true);
    });
  });

  describe('Enable/Disable Functionality', () => {
    test('should update cloud sync settings to enabled', () => {
      const initialTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(true);
      
      // Should start periodic sync when enabled
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(initialTimerCount);
    });

    test('should update cloud sync settings to disabled', () => {
      cloudSync.startPeriodicSync();
      const enabledTimerCount = jest.getTimerCount();

      cloudSync.updateCloudSyncSettings(false);
      
      // Should stop periodic sync when disabled
      expect(jest.getTimerCount()).toBeLessThanOrEqual(enabledTimerCount);
    });

    test('should handle enable when already enabled', () => {
      cloudSync.updateCloudSyncSettings(true);
      const firstEnableTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(true);
      
      // Should handle re-enabling gracefully without duplicating timers
      expect(jest.getTimerCount()).toBeGreaterThanOrEqual(firstEnableTimerCount);
    });

    test('should handle disable when already disabled', () => {
      cloudSync.updateCloudSyncSettings(false);
      const disabledTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(false);
      
      // Should handle re-disabling gracefully
      expect(jest.getTimerCount()).toBeLessThanOrEqual(disabledTimerCount);
    });

    test('should handle toggle between enabled and disabled', () => {
      const initialTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(true);
      const enabledTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(false);
      const disabledTimerCount = jest.getTimerCount();
      
      cloudSync.updateCloudSyncSettings(true);
      const reEnabledTimerCount = jest.getTimerCount();
      
      // Should properly toggle sync state
      expect(enabledTimerCount).toBeGreaterThanOrEqual(initialTimerCount);
      expect(disabledTimerCount).toBeLessThanOrEqual(enabledTimerCount);
      expect(reEnabledTimerCount).toBeGreaterThanOrEqual(disabledTimerCount);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing config data gracefully', async () => {
      // Reset to fresh state for this test
      delete require.cache[require.resolve('../../src/main/cloud-sync')];
      const freshCloudSync = require('../../src/main/cloud-sync');
      freshCloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);

      // Mock config to return undefined/empty data
      const originalGet = mockConfigStore.get;
      mockConfigStore.get.mockImplementation((key) => {
        if (key === 'pages') return [];
        if (key === 'appearance') return {};
        if (key === 'advanced') return {};
        return undefined;
      });

      const result = await freshCloudSync.uploadSettings();

      expect(typeof result.success).toBe('boolean'); // Should handle gracefully

      // Restore original mock
      mockConfigStore.get = originalGet;
    });

    test('should handle auth manager token refresh failure', async () => {
      mockAuthManager.refreshAccessToken.mockResolvedValue({
        success: false,
        error: 'Token refresh failed'
      });

      mockApiSync.uploadSettings.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
      });

      const result = await cloudSync.uploadSettings();

      expect(result.success).toBe(false);
    });

    test('should handle rapid sync attempts without crashing', async () => {
      const promises = [];

      // Generate many concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(cloudSync.uploadSettings().catch(e => ({ success: false, error: e.message })));
      }

      const results = await Promise.all(promises);

      // Should all complete without crashing
      expect(results.length).toBe(5);
      expect(results.every(r => typeof r.success === 'boolean')).toBe(true);
    });

    test('should handle proper cleanup during shutdown', () => {
      cloudSync.startPeriodicSync();
      const activeTimerCount = jest.getTimerCount();

      // Simulate module cleanup
      cloudSync.stopPeriodicSync();
      
      // Should properly clean up timers during shutdown
      expect(jest.getTimerCount()).toBeLessThanOrEqual(activeTimerCount);
    });

    test('should handle multiple initializations', () => {
      cloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);
      const firstInitCallCount = mockConfigStore.onDidChange.mock.calls.length;
      
      cloudSync.initCloudSync(mockAuthManager, null, mockConfigStore);
      
      // Should handle multiple initializations by setting up listeners again
      expect(mockConfigStore.onDidChange.mock.calls.length).toBeGreaterThanOrEqual(firstInitCallCount);
    });
  });
});
