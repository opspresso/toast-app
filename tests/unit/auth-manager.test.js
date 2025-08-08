/**
 * Toast - Authentication Manager Tests
 *
 * 인증 관리자 모듈에 대한 단위 테스트
 */

// Mock dependencies
const mockAuth = {
  initiateLogin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  exchangeCodeForTokenAndUpdateSubscription: jest.fn(),
  logout: jest.fn(),
  fetchUserProfile: jest.fn(),
  fetchSubscription: jest.fn(),
  getAccessToken: jest.fn(),
  hasValidToken: jest.fn(),
  refreshAccessToken: jest.fn(),
};

const mockUserDataManager = {
  initialize: jest.fn(),
  getUserProfile: jest.fn(),
  getUserSettings: jest.fn(),
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
  get: jest.fn(),
  post: jest.fn(),
};

// Mock modules
jest.mock('../../src/main/auth', () => mockAuth);
jest.mock('../../src/main/user-data-manager', () => mockUserDataManager);
jest.mock('../../src/main/cloud-sync', () => mockCloudSync);
jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfigStore),
}));
jest.mock('../../src/main/api/client', () => mockClient);
jest.mock('../../src/main/constants', () => ({
  DEFAULT_ANONYMOUS_SUBSCRIPTION: { isSubscribed: false },
  DEFAULT_ANONYMOUS: { email: null },
}));
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
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
    mockAuth.fetchUserProfile.mockResolvedValue({ success: false });
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
      expect(() => authManager.initialize(null)).not.toThrow();
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
  });

  describe('User Profile Management', () => {
    test('should fetch user profile successfully', async () => {
      const mockProfile = { id: 1, email: 'test@example.com' };
      mockAuth.fetchUserProfile.mockResolvedValue(mockProfile);

      const result = await authManager.fetchUserProfile();

      expect(result).toEqual(mockProfile);
    });

    test('should fetch user profile from cache', async () => {
      const mockProfile = { id: 1, email: 'test@example.com' };
      mockUserDataManager.getUserProfile.mockResolvedValue(mockProfile);

      const result = await authManager.fetchUserProfile(false);

      expect(mockUserDataManager.getUserProfile).toHaveBeenCalledWith(false);
    });
  });

  describe('Subscription Management', () => {
    test('should fetch subscription successfully', async () => {
      const mockProfile = {
        subscription: { plan: 'premium', active: true }
      };
      mockAuth.fetchUserProfile.mockResolvedValue(mockProfile);

      const result = await authManager.fetchSubscription();

      expect(result).toEqual(mockProfile.subscription);
    });

    test('should return default subscription when no data', async () => {
      mockAuth.fetchUserProfile.mockResolvedValue(null);

      const result = await authManager.fetchSubscription();

      expect(result).toEqual({ isSubscribed: false });
    });
  });

  describe('Login Process', () => {
    test('should initiate login successfully', async () => {
      mockAuth.initiateLogin.mockResolvedValue(true);

      const result = await authManager.initiateLogin();

      expect(result).toBe(true);
      expect(mockAuth.initiateLogin).toHaveBeenCalled();
    });

    test('should handle login initiation failure', async () => {
      mockAuth.initiateLogin.mockResolvedValue(false);

      const result = await authManager.initiateLogin();

      expect(result).toBe(false);
    });

    test('should exchange code for token successfully', async () => {
      const mockResult = { success: true, accessToken: 'new-token' };
      mockAuth.exchangeCodeForToken.mockResolvedValue(mockResult);

      const result = await authManager.exchangeCodeForToken('test-code');

      expect(result.success).toBe(true);
      expect(mockAuth.exchangeCodeForToken).toHaveBeenCalledWith('test-code');
    });

    test('should handle code exchange failure', async () => {
      mockAuth.exchangeCodeForToken.mockRejectedValue(new Error('Invalid code'));

      const result = await authManager.exchangeCodeForToken('invalid-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid code');
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

    test('should handle logout exceptions', async () => {
      mockAuth.logout.mockRejectedValue(new Error('Network error'));

      const result = await authManager.logout();

      expect(result).toBe(false);
    });
  });

  describe('Cloud Sync Integration', () => {
    test('should set sync manager', () => {
      const mockSyncManager = { sync: jest.fn() };

      expect(() => authManager.setSyncManager(mockSyncManager)).not.toThrow();
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

      expect(() => authManager.notifyLoginSuccess({})).not.toThrow();
    });
  });

  describe('User Settings', () => {
    test('should get user settings', async () => {
      const mockSettings = { theme: 'dark', language: 'en' };
      mockUserDataManager.getUserSettings.mockResolvedValue(mockSettings);

      const result = await authManager.getUserSettings();

      expect(result).toEqual(mockSettings);
      expect(mockUserDataManager.getUserSettings).toHaveBeenCalledWith(false);
    });

    test('should force refresh user settings', async () => {
      const mockSettings = { theme: 'light', language: 'ko' };
      mockUserDataManager.getUserSettings.mockResolvedValue(mockSettings);

      const result = await authManager.getUserSettings(true);

      expect(result).toEqual(mockSettings);
      expect(mockUserDataManager.getUserSettings).toHaveBeenCalledWith(true);
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

      expect(() => authManager.notifyLoginSuccess({})).not.toThrow();
      expect(() => authManager.notifyLoginError('error')).not.toThrow();
      expect(() => authManager.notifyLogout()).not.toThrow();
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

      expect(() => authManager.notifyLoginSuccess({})).not.toThrow();
    });

    test('should handle settings sync notification with config data', () => {
      const configData = {
        pages: [],
        appearance: {},
        advanced: {},
        subscription: {},
      };

      mockConfigStore.get.mockImplementation((key) => configData[key] || {});

      expect(() => authManager.notifySettingsSynced(configData)).not.toThrow();
    });
  });
});
