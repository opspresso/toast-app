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
  maskEmail: jest.fn(email => email),
  maskName: jest.fn(name => name),
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
      // Should initialize successfully without throwing
      expect(() => {
        userDataManager.initialize(mockWindows);
      }).not.toThrow();
    });

    test('should handle null windows parameter', () => {
      // Should handle null windows gracefully without throwing
      expect(() => {
        userDataManager.initialize(null);
      }).not.toThrow();
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

      // Should return DEFAULT_ANONYMOUS when no auth manager is initialized
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free'
        }
      });
    });

    test('should handle getUserSettings without auth manager initialization', async () => {
      // Test the case where auth manager is not initialized  
      const settings = await userDataManager.getUserSettings();

      // Should return {isAuthenticated: false} when no auth manager is initialized
      expect(settings).toEqual({
        isAuthenticated: false
      });
    });

    test('should handle force refresh parameter', async () => {
      // Test with forceRefresh = true
      const profile = await userDataManager.getUserProfile(true);
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free'
        }
      });

      // Test with forceRefresh = false (default)
      const profileCached = await userDataManager.getUserProfile(false);
      expect(profileCached).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free'
        }
      });
    });

    test('should handle profile data input parameter', async () => {
      const mockProfileInput = {
        id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
      };

      // Test with profile data input to avoid duplicate API calls
      const profile = await userDataManager.getUserProfile(false, mockProfileInput);
      
      // Should return DEFAULT_ANONYMOUS without auth manager, even with profile input
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free'
        }
      });
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
  });

  describe('Error Handling', () => {
    test('should handle JSON parsing errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const profile = await userDataManager.getUserProfile();
      const settings = await userDataManager.getUserSettings();

      // Should return DEFAULT_ANONYMOUS when JSON parsing fails for profile
      expect(profile).toEqual({
        id: 'anonymous',
        name: 'Anonymous User',
        subscription: {
          active: false,
          plan: 'free'
        }
      });
      // Should return {isAuthenticated: false} when JSON parsing fails for settings
      expect(settings).toEqual({
        isAuthenticated: false
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle async operations gracefully', async () => {
      // Should complete without throwing errors
      await expect(userDataManager.getUserProfile()).resolves.toBeDefined();
      await expect(userDataManager.getUserSettings()).resolves.toBeDefined();
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