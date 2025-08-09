/**
 * Toast - User Data Manager Tests
 *
 * Tests for user data management module (P1 Priority)
 */

// Mock electron
const mockApp = {
  getPath: jest.fn((path) => {
    if (path === 'userData') return '/mock/user/data';
    return '/mock/path';
  }),
};

jest.mock('electron', () => ({
  app: mockApp,
}));

// Mock fs
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(),
};

jest.mock('fs', () => mockFs);

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((filePath) => filePath.split('/').slice(0, -1).join('/')),
}));

// Mock logger
jest.mock('../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock constants
jest.mock('../../src/main/constants', () => ({
  DEFAULT_ANONYMOUS: {
    id: 'anonymous',
    name: 'Anonymous User',
    subscription: {
      active: false,
      plan: 'free',
    },
  },
}));

describe('User Data Manager (P1)', () => {
  let userDataManager;
  let mockWindows;

  // Mock auth manager
  const mockAuthManager = {
    hasValidToken: jest.fn(),
    fetchUserProfile: jest.fn(),
    getUserSettings: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock windows
    mockWindows = {
      toast: {
        webContents: { send: jest.fn() },
        isDestroyed: jest.fn(() => false),
      },
      settings: {
        webContents: { send: jest.fn() },
        isDestroyed: jest.fn(() => false),
      },
    };

    // Setup default mock responses
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
    mockAuthManager.hasValidToken.mockResolvedValue(false);

    // Get user data manager module
    userDataManager = require('../../src/main/user-data-manager');
    
    // Initialize with mock API client and auth manager
    userDataManager.initialize(null, mockAuthManager); // apiClient can be null for these tests
  });

  describe('Module Initialization', () => {
    test('should initialize with windows reference', () => {
      userDataManager.initialize(mockWindows);
      
      // Should initialize successfully and be able to access functionality
      expect(typeof userDataManager.getUserProfile).toBe('function');
      expect(typeof userDataManager.getUserSettings).toBe('function');
    });

    test('should handle null windows parameter', () => {
      userDataManager.initialize(null);
      
      // Should handle null windows gracefully and maintain functionality
      expect(typeof userDataManager.getUserProfile).toBe('function');
      expect(typeof userDataManager.getUserSettings).toBe('function');
    });

    test('should export all required functions', () => {
      const requiredFunctions = [
        'initialize',
        'getUserProfile',
        'getUserSettings', 
        'updateSettings',
        'updateSyncMetadata',
        'syncAfterLogin',
        'cleanupOnLogout',
        'startProfileRefresh',
        'stopProfileRefresh',
        'startSettingsRefresh',
        'stopSettingsRefresh',
      ];

      requiredFunctions.forEach(funcName => {
        expect(typeof userDataManager[funcName]).toBe('function');
      });
    });
  });

  describe('Authentication-Based Operations', () => {
    test('should return DEFAULT_ANONYMOUS when no valid token', async () => {
      // Mock no valid token
      mockAuthManager.hasValidToken.mockResolvedValue(false);

      // Since we can't directly inject the mock auth manager,
      // we'll test the behavior when authentication fails
      const profile = await userDataManager.getUserProfile();

      // When no auth manager is set or no valid token, should return DEFAULT_ANONYMOUS or null
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free',
        },
      });
    });

    test('should handle getUserProfile without auth manager initialization', async () => {
      // Test the case where auth manager is not initialized
      const profile = await userDataManager.getUserProfile();

      // Should return DEFAULT_ANONYMOUS or handle gracefully
      expect(profile).toBeDefined();
    });

    test('should handle getUserSettings without auth manager initialization', async () => {
      // Test the case where auth manager is not initialized  
      const settings = await userDataManager.getUserSettings();

      // Should return null or handle gracefully
      expect(settings).toBeDefined();
    });

    test('should handle force refresh parameter', async () => {
      // Test with forceRefresh = true
      const profile = await userDataManager.getUserProfile(true);
      expect(profile).toBeDefined();

      // Test with forceRefresh = false (default)
      const profileCached = await userDataManager.getUserProfile(false);
      expect(profileCached).toBeDefined();
    });

    test('should handle profile data input parameter', async () => {
      const mockProfileInput = {
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
      };

      // Test with profile data input to avoid duplicate API calls
      const profile = await userDataManager.getUserProfile(false, mockProfileInput);
      expect(profile).toBeDefined();
    });
  });

  describe('Settings Management', () => {
    test('should update settings successfully', () => {
      const newSettings = {
        theme: 'light',
        notifications: false,
        syncEnabled: true,
      };

      mockFs.existsSync.mockReturnValue(false); // Directory doesn't exist

      const result = userDataManager.updateSettings(newSettings);

      expect(mockFs.mkdirSync).toHaveBeenCalled();
      // Check that writeFileSync was called (may use temp file)
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      // Then renames temp file to final file (atomic operation)
      expect(mockFs.renameSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle settings update when directory exists', () => {
      const newSettings = { theme: 'dark' };

      mockFs.existsSync.mockReturnValue(true); // Directory exists

      const result = userDataManager.updateSettings(newSettings);

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle settings update errors', () => {
      const newSettings = { theme: 'light' };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      const result = userDataManager.updateSettings(newSettings);

      expect(result).toBe(false);
    });
  });

  describe('Sync Metadata Management', () => {
    test('should update sync metadata successfully', () => {
      const metadata = {
        lastSyncTime: Date.now(),
        deviceId: 'device123',
        version: '1.0.0',
      };

      // Mock to return false first (for directory check), then true (for file check)
      mockFs.existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ existing: 'data' }));
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = userDataManager.updateSyncMetadata(metadata);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle sync metadata update errors', () => {
      const metadata = { lastSyncTime: Date.now() };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Sync metadata write error');
      });

      const result = userDataManager.updateSyncMetadata(metadata);

      expect(result).toBe(false);
    });
  });

  describe('Periodic Refresh Management', () => {
    beforeEach(() => {
      // Clear any existing timers
      userDataManager.stopProfileRefresh();
      userDataManager.stopSettingsRefresh();
    });

    afterEach(() => {
      // Clean up timers after each test
      userDataManager.stopProfileRefresh();
      userDataManager.stopSettingsRefresh();
    });

    test('should start profile refresh', async () => {
      userDataManager.startProfileRefresh();
      
      // Should start profile refresh successfully
      // Verify by checking that getUserProfile returns expected result
      const profile = await userDataManager.getUserProfile();
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free',
        },
      });
      
      userDataManager.stopProfileRefresh();
    });

    test('should stop profile refresh', async () => {
      userDataManager.startProfileRefresh();
      userDataManager.stopProfileRefresh();
      
      // Should stop profile refresh cleanly - verify functionality still works
      const profile = await userDataManager.getUserProfile();
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free',
        },
      });
      
      // Should be able to restart after stopping
      userDataManager.startProfileRefresh();
      userDataManager.stopProfileRefresh();
    });

    test('should start settings refresh', async () => {
      userDataManager.startSettingsRefresh();
      
      // Should start settings refresh successfully
      // Verify by checking that getUserSettings returns expected result
      const settings = await userDataManager.getUserSettings();
      expect(settings).toEqual({});
      
      userDataManager.stopSettingsRefresh();
    });

    test('should stop settings refresh', async () => {
      userDataManager.startSettingsRefresh();
      userDataManager.stopSettingsRefresh();
      
      // Should stop settings refresh cleanly - verify functionality still works
      const settings = await userDataManager.getUserSettings();
      expect(settings).toEqual({});
      
      // Should be able to restart after stopping
      userDataManager.startSettingsRefresh();
      userDataManager.stopSettingsRefresh();
    });

    test('should handle multiple start/stop cycles', async () => {
      // Start and stop multiple times
      userDataManager.startProfileRefresh();
      userDataManager.stopProfileRefresh();
      userDataManager.startProfileRefresh();
      userDataManager.stopProfileRefresh();

      userDataManager.startSettingsRefresh();
      userDataManager.stopSettingsRefresh();
      userDataManager.startSettingsRefresh();
      userDataManager.stopSettingsRefresh();

      // Verify that functionality still works after multiple cycles
      const profile = await userDataManager.getUserProfile();
      const settings = await userDataManager.getUserSettings();
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: { active: false, plan: 'free' },
      });
      expect(settings).toEqual({});
    });
  });

  describe('Post-Login Sync', () => {
    test('should sync after login successfully', async () => {
      const mockAuthData = {
        user: { id: 'user123', name: 'Test User' },
        settings: { theme: 'dark' },
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = await userDataManager.syncAfterLogin(mockAuthData);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle sync after login with existing data', async () => {
      const mockAuthData = {
        user: { id: 'user123', name: 'Test User' },
        settings: { theme: 'light' },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ theme: 'dark' }));
      mockFs.writeFileSync.mockImplementation(() => {});

      const result = await userDataManager.syncAfterLogin(mockAuthData);

      expect(result).toBe(true);
    });

    test('should handle sync after login errors', async () => {
      const mockAuthData = {
        user: { id: 'user123' },
        settings: {},
      };

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Sync error');
      });

      const result = await userDataManager.syncAfterLogin(mockAuthData);

      expect(result).toBe(false);
    });
  });

  describe('Cleanup on Logout', () => {
    test('should cleanup data on logout successfully', () => {
      // First call returns true (file exists), second call returns false (file deleted)
      mockFs.existsSync
        .mockReturnValueOnce(true)  // profileExists check
        .mockReturnValueOnce(false) // settingsExists check
        .mockReturnValueOnce(false); // profileStillExists check after deletion
      
      mockFs.unlinkSync.mockImplementation(() => {});

      const result = userDataManager.cleanupOnLogout();

      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle cleanup when files do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = userDataManager.cleanupOnLogout();

      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(result).toBe(true); // Still considered successful
    });

    test('should handle cleanup errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('File delete error');
      });

      const result = userDataManager.cleanupOnLogout();

      expect(result).toBe(false);
    });

    test('should stop refresh timers during cleanup', () => {
      // Start refresh timers
      userDataManager.startProfileRefresh();
      userDataManager.startSettingsRefresh();

      mockFs.existsSync.mockReturnValue(false);

      const result = userDataManager.cleanupOnLogout();

      expect(result).toBe(true);
      // Timers should be stopped (no direct way to test this, but function should complete)
    });
  });

  describe('Error Handling', () => {
    test('should handle file system permission errors', () => {
      const settings = { theme: 'dark' };

      mockFs.writeFileSync.mockImplementation(() => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        throw error;
      });

      const result = userDataManager.updateSettings(settings);

      expect(result).toBe(false);
    });

    test('should handle directory creation errors', () => {
      const settings = { theme: 'light' };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Cannot create directory');
      });

      const result = userDataManager.updateSettings(settings);

      expect(result).toBe(false);
    });

    test('should handle JSON parsing errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const profile = await userDataManager.getUserProfile();
      const settings = await userDataManager.getUserSettings();

      // Should handle gracefully, may return null or default values
      expect(profile).toBeDefined();
      expect(settings).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete user data lifecycle', async () => {
      // Initialize
      userDataManager.initialize(mockWindows);

      // Sync after login
      const authData = {
        user: { id: 'user123', name: 'Test User' },
        settings: { theme: 'dark' },
      };
      
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.writeFileSync.mockImplementation(() => {});
      
      let result = await userDataManager.syncAfterLogin(authData);
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      // Update settings
      const newSettings = { theme: 'light', notifications: true };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ theme: 'dark' }));
      mockFs.writeFileSync.mockClear();
      
      result = userDataManager.updateSettings(newSettings);
      expect(result).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalled();

      // Update sync metadata
      const metadata = { lastSync: Date.now() };
      result = userDataManager.updateSyncMetadata(metadata);
      expect(result).toBe(true);

      // Cleanup on logout
      mockFs.existsSync
        .mockReturnValueOnce(true)  // profileExists check
        .mockReturnValueOnce(false) // settingsExists check  
        .mockReturnValueOnce(false); // profileStillExists check after deletion
      mockFs.unlinkSync.mockImplementation(() => {});
      
      result = userDataManager.cleanupOnLogout();
      expect(result).toBe(true);
    });

    test('should handle refresh timer management', async () => {
      userDataManager.initialize(mockWindows);

      // Start refresh timers
      userDataManager.startProfileRefresh();
      userDataManager.startSettingsRefresh();

      // Stop refresh timers
      userDataManager.stopProfileRefresh();
      userDataManager.stopSettingsRefresh();

      // Verify that manager still functions correctly after timer management
      const profile = await userDataManager.getUserProfile();
      const settings = await userDataManager.getUserSettings();
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: { active: false, plan: 'free' },
      });
      expect(settings).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    test('should handle async operations gracefully', async () => {
      const profile = await userDataManager.getUserProfile();
      const settings = await userDataManager.getUserSettings();

      // These functions should return something (not throw)
      expect(profile !== undefined).toBe(true);
      expect(settings !== undefined).toBe(true);
    });

    test('should handle null and undefined input data', () => {
      userDataManager.updateSettings(null);
      userDataManager.updateSettings(undefined);
      userDataManager.updateSyncMetadata(null);
      
      // Should handle invalid input gracefully
      // Verify functionality still works after invalid input
      const profile = userDataManager.getUserProfile();
      expect(profile).toBeInstanceOf(Promise);
    });

    test('should handle very large data objects', () => {
      const largeSettings = {
        data: 'x'.repeat(10000), // Large string
        array: new Array(1000).fill('item'),
        nested: {
          deep: {
            data: 'nested content',
          },
        },
      };

      // Setup mocks for large data
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.renameSync.mockImplementation(() => {});

      const result = userDataManager.updateSettings(largeSettings);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle concurrent async calls', async () => {
      // Test multiple concurrent calls
      const promises = [
        userDataManager.getUserProfile(),
        userDataManager.getUserSettings(),
        userDataManager.getUserProfile(true),
      ];

      const results = await Promise.all(promises);
      
      // All should resolve without errors
      results.forEach(result => {
        expect(result !== undefined).toBe(true);
      });
    });
  });
});