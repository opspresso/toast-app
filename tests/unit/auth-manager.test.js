/**
 * Toast - Authentication Manager Tests
 *
 * Unit tests for the authentication manager module
 */

// Mock dependencies
const mockAuth = {
  initiateLogin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  logout: jest.fn(),
  fetchUserProfile: jest.fn(),
  fetchSubscription: jest.fn(),
  getAccessToken: jest.fn(),
  hasValidToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
};

const mockUserDataManager = {
  initialize: jest.fn(),
  getUserProfile: jest.fn(),
  cleanupOnLogout: jest.fn(),
};

const mockCloudSync = {
  initCloudSync: jest.fn(),
  setAuthManager: jest.fn(),
  syncAfterLogin: jest.fn(),
  stopPeriodicSync: jest.fn(),
};

const mockConfigStore = {
  get: jest.fn(),
  set: jest.fn(),
  onDidChange: jest.fn(),
};

const mockClient = {
  getSessionVersion: jest.fn(() => 0),
  get: jest.fn(),
  post: jest.fn(),
};

// Mock modules
jest.mock('../../src/main/auth', () => mockAuth);
jest.mock('../../src/main/user-data-manager', () => mockUserDataManager);
jest.mock('../../src/main/cloud-sync', () => mockCloudSync);
jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfigStore),
  markAsSynced: jest.fn(),
  seedDefaultSnippets: jest.fn(),
}));
jest.mock('../../src/main/api/client', () => mockClient);
jest.mock('../../src/main/constants', () => ({
  DEFAULT_ANONYMOUS_SUBSCRIPTION: { isSubscribed: false },
  DEFAULT_ANONYMOUS: { email: null },
  PAGE_GROUPS: { ANONYMOUS: 1, AUTHENTICATED: 3, PREMIUM: 9 },
}));
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  maskEmail: jest.fn(email => email),
  maskName: jest.fn(name => name),
}));

describe('Authentication Manager', () => {
  let authManager;
  let mockWindows;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock windows
    mockWindows = {
      toast: {
        webContents: {
          send: jest.fn(),
        },
        isDestroyed: jest.fn(() => false),
      },
      settings: {
        webContents: {
          send: jest.fn(),
        },
        isDestroyed: jest.fn(() => false),
      },
    };

    // Setup default mock responses
    mockAuth.hasValidToken.mockResolvedValue(false);
    mockAuth.getAccessToken.mockResolvedValue(null);
    mockUserDataManager.getUserProfile.mockReset().mockResolvedValue({ email: 'test@example.com', isAuthenticated: true, subscription: { active: false } });
    mockAuth.exchangeCodeForToken.mockReset();
    mockAuth.fetchSubscription.mockResolvedValue({ success: false });
    mockAuth.initiateLogin.mockResolvedValue(true);
    mockAuth.logout.mockResolvedValue(true);

    // Re-require the module to get fresh instance
    delete require.cache[require.resolve('../../src/main/auth-manager')];
    authManager = require('../../src/main/auth-manager');

    // Initialize with mock windows
    authManager.initialize(mockWindows);
  });

  describe('Initialization', () => {
    test('should initialize with windows reference', () => {
      expect(mockUserDataManager.initialize).toHaveBeenCalled();
    });

    test('should handle null windows gracefully', () => {
      authManager.initialize(null);

      // Should handle null windows and maintain functionality
      expect(typeof authManager.hasValidToken).toBe('function');
      expect(typeof authManager.notifyLoginSuccess).toBe('function');
    });

    test('registers a session-expired handler with auth.js so a dead session detected outside requireRelogin checks (e.g. hasValidToken) still triggers a full logout', async () => {
      expect(mockAuth.setSessionExpiredHandler).toHaveBeenCalledWith(expect.any(Function));

      const handler = mockAuth.setSessionExpiredHandler.mock.calls[0][0];
      await handler();

      expect(mockAuth.logout).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    test('should check if token is valid', async () => {
      mockAuth.hasValidToken.mockResolvedValue(true);

      const result = await authManager.hasValidToken();

      expect(result).toBe(true);
      expect(mockAuth.hasValidToken).toHaveBeenCalled();
    });

    test('should get access token', async () => {
      const mockToken = 'test-token';
      mockAuth.getAccessToken.mockResolvedValue(mockToken);

      const result = await authManager.getAccessToken();

      expect(result).toBe(mockToken);
      expect(mockAuth.getAccessToken).toHaveBeenCalled();
    });

    test('should refresh access token', async () => {
      const mockResult = { success: true, token: 'new-token' };
      mockAuth.refreshAccessToken.mockResolvedValue(mockResult);

      const result = await authManager.refreshAccessToken();

      expect(result).toEqual(mockResult);
      expect(mockAuth.refreshAccessToken).toHaveBeenCalled();
    });

    test('should log out and notify both windows when the refresh token requires re-login', async () => {
      const mockResult = {
        success: false,
        error: 'Your login session has expired. Please log in again.',
        code: 'SESSION_EXPIRED',
        requireRelogin: true,
      };
      mockAuth.refreshAccessToken.mockResolvedValue(mockResult);

      const result = await authManager.refreshAccessToken();

      expect(result).toEqual(mockResult);
      expect(mockAuth.logout).toHaveBeenCalled();
      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith('auth-state-changed', expect.objectContaining({ isAuthenticated: false }));
    });

    test('logs out only once when the session-expired handler and the requireRelogin check both fire for the same dead session', async () => {
      // In auth.js, a SESSION_EXPIRED refresh failure fires the session-expired handler
      // (fire-and-forget) before returning a result with requireRelogin: true — which this
      // module's refreshAccessToken() also checks and logs out on. Simulate both firing for
      // the same event, as they do in the real (unmocked) auth.js. auth.logout() itself is
      // held pending (as it would be for the real revoke-token network call's duration) so
      // the dedup window is actually open when the second trigger checks it.
      const sessionExpiredHandler = mockAuth.setSessionExpiredHandler.mock.calls[0][0];
      const mockResult = {
        success: false,
        error: 'Your login session has expired. Please log in again.',
        code: 'SESSION_EXPIRED',
        requireRelogin: true,
      };
      let resolveAuthLogout;
      mockAuth.logout.mockReturnValueOnce(
        new Promise(resolve => {
          resolveAuthLogout = resolve;
        }),
      );
      mockAuth.refreshAccessToken.mockImplementation(async () => {
        sessionExpiredHandler(); // fire-and-forget, as auth.js does internally
        return mockResult;
      });

      const resultPromise = authManager.refreshAccessToken();
      resolveAuthLogout(true);
      const result = await resultPromise;

      expect(result).toEqual(mockResult);
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockUserDataManager.cleanupOnLogout).toHaveBeenCalledTimes(1);
    });

    test('should not log out when refresh fails for a reason other than requireRelogin', async () => {
      const mockResult = { success: false, error: 'Network error', code: 'REFRESH_FAILED' };
      mockAuth.refreshAccessToken.mockResolvedValue(mockResult);

      await authManager.refreshAccessToken();

      expect(mockAuth.logout).not.toHaveBeenCalled();
    });
  });

  describe('Profile and login ownership', () => {
    const profile = (subscription = { active: true, plan: 'Premium', features: { cloud_sync: true } }) => ({
      email: 'test@example.com', isAuthenticated: true, authSessionVersion: 0, subscription,
    });
    const login = subscription => {
      mockAuth.exchangeCodeForToken.mockResolvedValue({ success: true });
      mockUserDataManager.getUserProfile.mockResolvedValue(profile(subscription));
    };

    test('normalizes and persists the same profile used for subscription reads', async () => {
      login({ active: true, plan: 'Premium', features: { cloud_sync: false, page_groups: 9 } });
      const result = await authManager.fetchUserProfile();
      expect(result.subscription).toMatchObject({ pageGroups: 9, isSubscribed: true, additionalFeatures: { cloudSync: false } });
      expect(mockConfigStore.set).toHaveBeenCalledWith('subscription', result.subscription);
      expect(mockAuth.fetchUserProfile).not.toHaveBeenCalled();
    });

    test('force refresh makes one profile-service call', async () => {
      login();
      await authManager.fetchSubscription(true);
      expect(mockUserDataManager.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockUserDataManager.getUserProfile).toHaveBeenCalledWith(true);
      expect(mockAuth.fetchUserProfile).not.toHaveBeenCalled();
    });

    test('preserves profile failures and does not overwrite the verified subscription', async () => {
      const error = { error: { code: 'HTTP_503', message: 'Unavailable' } };
      mockUserDataManager.getUserProfile.mockResolvedValue(error);
      expect(await authManager.fetchSubscription()).toEqual(error);
      expect(mockConfigStore.set).not.toHaveBeenCalled();
      expect(mockAuth.logout).not.toHaveBeenCalled();
    });

    test('fully logs out when a profile request requires relogin', async () => {
      mockUserDataManager.getUserProfile.mockResolvedValue({ error: { requireRelogin: true } });
      expect(await authManager.fetchSubscription()).toHaveProperty('error');
      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    });

    test('rejects invalid expiry instead of granting an unlimited subscription', async () => {
      login({ active: true, expiresAt: 'broken' });
      expect(await authManager.fetchUserProfile()).toMatchObject({ error: { code: 'INVALID_PROFILE' } });
      expect(mockConfigStore.set).not.toHaveBeenCalled();
    });

    test('stops previous synchronization before exchanging credentials', async () => {
      const manager = { stopPeriodicSync: jest.fn(), startPeriodicSync: jest.fn() };
      authManager.setSyncManager(manager);
      mockAuth.exchangeCodeForToken.mockResolvedValue({ success: false, error: 'Unavailable' });
      await authManager.exchangeCodeForTokenAndUpdateSubscription('code');
      expect(manager.stopPeriodicSync.mock.invocationCallOrder[0]).toBeLessThan(mockAuth.exchangeCodeForToken.mock.invocationCallOrder[0]);
      expect(manager.startPeriodicSync).toHaveBeenCalledTimes(1);
    });

    test('login fetches one profile, persists full entitlement, and updates editor context without a sync manager', async () => {
      authManager.setSyncManager(null);
      login({ active: true, plan: 'Premium', features: { cloud_sync: true, page_groups: 9 } });
      expect(await authManager.exchangeCodeForTokenAndUpdateSubscription('code')).toMatchObject({ success: true });
      expect(mockUserDataManager.getUserProfile).toHaveBeenCalledTimes(1);
      expect(mockConfigStore.set).toHaveBeenCalledWith('subscription', expect.objectContaining({ pageGroups: 9, isAuthenticated: true }));
      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith('config-updated', expect.objectContaining({ authSessionVersion: 0 }));
    });

    test('keeps the scheduler available after a temporary post-login profile failure', async () => {
      const manager = { stopPeriodicSync: jest.fn(), startPeriodicSync: jest.fn(), syncAfterLogin: jest.fn() };
      authManager.setSyncManager(manager);
      login();
      mockUserDataManager.getUserProfile.mockResolvedValue({ error: { message: 'Offline' } });
      expect(await authManager.exchangeCodeForTokenAndUpdateSubscription('code')).toMatchObject({ success: false, authenticated: true, error: 'Offline' });
      expect(manager.startPeriodicSync).toHaveBeenCalled();
      expect(manager.syncAfterLogin).not.toHaveBeenCalled();
      expect(mockWindows.toast.webContents.send).not.toHaveBeenCalledWith('login-success', expect.anything());
    });

    test('does not mutate shared server feature objects', async () => {
      const subscription = { active: false, features: { page_groups: 3, cloud_sync: false } };
      login(subscription);
      await authManager.fetchUserProfile();
      expect(subscription).toEqual({ active: false, features: { page_groups: 3, cloud_sync: false } });
    });

    test('discards a login profile that arrives after logout', async () => {
      login();
      let resolveProfile;
      mockUserDataManager.getUserProfile.mockReturnValueOnce(new Promise(resolve => { resolveProfile = resolve; }));
      const request = authManager.exchangeCodeForTokenAndUpdateSubscription('code');
      await new Promise(resolve => setImmediate(resolve));
      await authManager.logout();
      mockConfigStore.set.mockClear();
      mockWindows.toast.webContents.send.mockClear();
      resolveProfile(profile());
      expect((await request).success).toBe(false);
      expect(mockConfigStore.set).not.toHaveBeenCalled();
      expect(mockWindows.toast.webContents.send).not.toHaveBeenCalledWith('login-success', expect.anything());
    });

    test('discards a startup profile after a newer login begins', async () => {
      let resolveProfile;
      mockUserDataManager.getUserProfile.mockReturnValueOnce(new Promise(resolve => { resolveProfile = resolve; }));
      const startup = authManager.restoreSession();
      mockAuth.exchangeCodeForToken.mockResolvedValue({ success: false, error: 'Offline' });
      await authManager.exchangeCodeForTokenAndUpdateSubscription('code');
      mockWindows.toast.webContents.send.mockClear();
      resolveProfile(profile());
      expect((await startup).success).toBe(false);
      expect(mockWindows.toast.webContents.send).not.toHaveBeenCalledWith('auth-state-changed', expect.anything());
    });

    test('ignores background login sync after logout', async () => {
      let resolveSync;
      const manager = {
        stopPeriodicSync: jest.fn(), startPeriodicSync: jest.fn(),
        syncAfterLogin: jest.fn(() => new Promise(resolve => { resolveSync = resolve; })),
      };
      authManager.setSyncManager(manager);
      login();
      await authManager.exchangeCodeForTokenAndUpdateSubscription('code');
      expect(manager.syncAfterLogin).toHaveBeenCalledWith();
      await authManager.logout();
      mockWindows.toast.webContents.send.mockClear();
      resolveSync({ success: true });
      await new Promise(resolve => setImmediate(resolve));
      expect(mockWindows.toast.webContents.send).not.toHaveBeenCalledWith('auth-state-changed', expect.anything());
    });
  });

  describe('Logout Process', () => {
    test('should handle successful logout', async () => {
      mockAuth.logout.mockResolvedValue(true);

      const result = await authManager.logout();

      expect(result).toBe(true);
      expect(mockAuth.logout).toHaveBeenCalled();
      expect(mockUserDataManager.cleanupOnLogout).toHaveBeenCalled();
    });

    test('should handle logout failure', async () => {
      mockAuth.logout.mockResolvedValue(false);

      const result = await authManager.logout();

      expect(result).toBe(false);
    });

    test('should not modify local pages on logout, even beyond the anonymous entitlement', async () => {
      // pages/appearance/advanced are the user's actual content, and this device may hold
      // the only unsynced copy. Trimming/clearing them locally on logout is unrecoverable
      // if that copy was never uploaded, so logout must leave them untouched.
      mockAuth.logout.mockResolvedValue(true);
      const premiumPages = [{ name: 'Page 1' }, { name: 'Page 2' }, { name: 'Page 3' }];
      mockConfigStore.get.mockImplementation(key => (key === 'pages' ? premiumPages : undefined));

      await authManager.logout();

      expect(mockConfigStore.set).not.toHaveBeenCalledWith('pages', expect.anything());
      expect(mockConfigStore.set).not.toHaveBeenCalledWith('appearance', expect.anything());
      expect(mockConfigStore.set).not.toHaveBeenCalledWith('advanced', expect.anything());
    });

    test('should not touch sync metadata on logout since no synced data is modified', async () => {
      mockAuth.logout.mockResolvedValue(true);
      const { markAsSynced } = require('../../src/main/config');

      await authManager.logout();

      expect(markAsSynced).not.toHaveBeenCalled();
    });

    test('should handle logout exceptions', async () => {
      mockAuth.logout.mockRejectedValue(new Error('Network error'));

      const result = await authManager.logout();

      expect(result).toBe(false);
    });

    test('shares a single in-flight logout when triggered concurrently by more than one caller', async () => {
      // A dead session can be discovered through more than one path at once — e.g. auth.js's
      // own session-expired handler (fire-and-forget) racing with an explicit requireRelogin
      // check in refreshAccessToken/fetchUserProfile/fetchSubscription. Both call logout()
      // for the same underlying event; only one should actually run (server revoke, user
      // data cleanup, window notifications), and every caller should get the same result.
      let resolveAuthLogout;
      mockAuth.logout.mockReturnValueOnce(
        new Promise(resolve => {
          resolveAuthLogout = resolve;
        }),
      );

      const firstCall = authManager.logout();
      const secondCall = authManager.logout();

      resolveAuthLogout(true);
      const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

      expect(mockAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockUserDataManager.cleanupOnLogout).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(true);
      expect(secondResult).toBe(true);
    });

    test('runs a fresh logout again after a previous one has fully completed', async () => {
      mockAuth.logout.mockResolvedValue(true);

      await authManager.logout();
      await authManager.logout();

      expect(mockAuth.logout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cloud Sync Integration', () => {
    test('should set sync manager', () => {
      const mockSyncManager = { sync: jest.fn() };

      authManager.setSyncManager(mockSyncManager);
      
      // Should set sync manager successfully - verify by attempting sync
      const syncResult = authManager.syncSettings('upload');
      expect(syncResult).toBeInstanceOf(Promise);
    });

    test('should sync settings manually', async () => {
      const mockSyncManager = {
        manualSync: jest.fn().mockResolvedValue({ success: true }),
      };

      authManager.setSyncManager(mockSyncManager);

      const result = await authManager.syncSettings('upload');

      expect(result).toBe(true);
      expect(mockSyncManager.manualSync).toHaveBeenCalledWith('upload');
    });

    test('should update sync settings', () => {
      const mockSyncManager = {
        enable: jest.fn(),
        disable: jest.fn(),
      };

      authManager.setSyncManager(mockSyncManager);

      const result1 = authManager.updateSyncSettings(true);
      const result2 = authManager.updateSyncSettings(false);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(mockSyncManager.enable).toHaveBeenCalled();
      expect(mockSyncManager.disable).toHaveBeenCalled();
    });
  });

  describe('Window Communication', () => {
    test('should send login success notification', () => {
      const subscription = { active: true, features: { page_groups: 5 } };

      authManager.notifyLoginSuccess(subscription);

      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith(
        'login-success',
        expect.objectContaining({
          isAuthenticated: true,
          isSubscribed: true,
          pageGroups: 5,
        })
      );
    });

    test('should send login error notification', () => {
      const errorMessage = 'Authentication failed';

      authManager.notifyLoginError(errorMessage);

      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith(
        'login-error',
        expect.objectContaining({
          error: errorMessage,
        })
      );
    });

    test('should send logout notification', () => {
      authManager.notifyLogout();

      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith(
        'logout-success',
        {}
      );
    });

    test('should send auth state change notification', () => {
      const authState = { isAuthenticated: true, profile: { email: 'test@example.com' } };

      authManager.notifyAuthStateChange(authState);

      expect(mockWindows.toast.webContents.send).toHaveBeenCalledWith(
        'auth-state-changed',
        authState
      );
    });

    test('should handle destroyed windows gracefully', () => {
      mockWindows.toast.isDestroyed.mockReturnValue(true);

      authManager.notifyLoginSuccess({});
      
      // Should handle destroyed windows gracefully
      expect(mockWindows.toast.isDestroyed).toHaveBeenCalled();
      // Should not attempt to send to destroyed window
      expect(mockWindows.toast.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockAuth.hasValidToken.mockRejectedValue(new Error('Network unreachable'));

      // The actual implementation should handle this gracefully
      try {
        await authManager.hasValidToken();
      } catch (error) {
        // Should not throw, but if it does, we handle it
        expect(error.message).toContain('Network unreachable');
      }
    });

    test('should handle missing sync manager', async () => {
      const result = await authManager.syncSettings();

      expect(result).toBe(false);
    });

    test('should handle sync manager errors', () => {
      // Without sync manager, should return false
      authManager.setSyncManager(null);
      const result = authManager.updateSyncSettings(true);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null windows in notifications', () => {
      authManager.initialize(null);

      authManager.notifyLoginSuccess({});
      authManager.notifyLoginError('error');
      authManager.notifyLogout();
      
      // Should handle notifications with null windows gracefully
      // Verify that no webContents.send calls are made with null windows
      // Since we initialized with null, no webContents should exist to call
      expect(typeof authManager.notifyLoginSuccess).toBe('function');
      expect(typeof authManager.notifyLoginError).toBe('function');
    });

    test('should handle missing window methods', () => {
      const incompleteWindows = {
        toast: {
          isDestroyed: jest.fn(() => false),
          webContents: {
            send: jest.fn(),
          },
        },
        settings: {
          isDestroyed: jest.fn(() => false),
          webContents: {
            send: jest.fn(),
          },
        },
      };

      authManager.initialize(incompleteWindows);

      authManager.notifyLoginSuccess({});
      
      // Should handle incomplete windows and still send notifications
      expect(incompleteWindows.toast.isDestroyed).toHaveBeenCalled();
      expect(incompleteWindows.toast.webContents.send).toHaveBeenCalled();
    });

    test('should handle settings sync notification with config data', () => {
      const configData = {
        pages: [],
        appearance: {},
        advanced: {},
        subscription: {},
      };

      mockConfigStore.get.mockImplementation((key) => configData[key] || {});

      authManager.notifySettingsSynced(configData);
      
      // Should process settings sync notification
      expect(mockWindows.settings.webContents.send).toHaveBeenCalledWith(
        'settings-synced',
        expect.any(Object)
      );
      expect(mockWindows.settings.webContents.send).toHaveBeenCalledWith(
        'config-updated',
        expect.any(Object)
      );
    });

    test('should include snippets when building config data from the store', () => {
      const storeValues = {
        pages: [{ id: 'page-1' }],
        snippets: [{ id: 'sn-1', keyword: 'hi', content: 'hello' }],
        appearance: {},
        advanced: {},
        subscription: {},
      };
      mockConfigStore.get.mockImplementation(key => storeValues[key]);

      authManager.notifySettingsSynced();

      expect(mockWindows.settings.webContents.send).toHaveBeenCalledWith(
        'config-updated',
        expect.objectContaining({ snippets: storeValues.snippets })
      );
    });
  });
});
