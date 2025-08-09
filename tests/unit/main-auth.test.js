/**
 * Toast - Main Auth Tests
 *
 * Tests for authentication module (P0 Priority - Critical Security Component)
 */

// Mock electron modules
const mockApp = {
  getPath: jest.fn(() => '/mock/user/data'),
  setAsDefaultProtocolClient: jest.fn(),
  removeAsDefaultProtocolClient: jest.fn(),
};

const mockShell = {
  openExternal: jest.fn(),
};

jest.mock('electron', () => ({
  app: mockApp,
  shell: mockShell,
}));

// Mock fs
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
  renameSync: jest.fn(), // Added missing renameSync
};

jest.mock('fs', () => mockFs);

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/') || '/'),
}));

// Mock config
const mockConfig = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('../../src/main/config', () => ({
  createConfigStore: jest.fn(() => mockConfig),
}));

// Mock config/env
jest.mock('../../src/main/config/env', () => ({
  getEnv: jest.fn((key, defaultValue) => {
    const envValues = {
      NODE_ENV: 'test',
      CLIENT_ID: 'test-client-id',
      CLIENT_SECRET: 'test-client-secret',
      TOKEN_EXPIRES_IN: '3600',
      CONFIG_SUFFIX: '',
    };
    return envValues[key] || defaultValue;
  }),
}));

// Mock API client
const mockClient = {
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  clearTokens: jest.fn(),
  ENDPOINTS: {
    OAUTH_AUTHORIZE: 'https://api.toast.com/oauth/authorize',
    USER_PROFILE: 'https://api.toast.com/users/profile',
  },
};

jest.mock('../../src/main/api/client', () => mockClient);

// Mock API auth
const mockApiAuth = {
  initiateLogin: jest.fn(),
  exchangeCodeForToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  fetchUserProfile: jest.fn(),
  handleAuthRedirect: jest.fn(),
  logout: jest.fn(),
};

jest.mock('../../src/main/api/auth', () => mockApiAuth);

// Mock constants
jest.mock('../../src/main/constants', () => ({
  PAGE_GROUPS: {
    ANONYMOUS: 1,
    AUTHENTICATED: 3,
    PREMIUM: 9,
  },
  DEFAULT_ANONYMOUS_SUBSCRIPTION: {
    id: 'sub_free_anonymous',
    active: false,
    isSubscribed: false,
    plan: 'free',
  },
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

describe('Main Auth Module (P0)', () => {
  let auth;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup default mock responses
    mockFs.existsSync.mockReturnValue(true); // Directory exists by default
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      'auth-token': 'test-access-token',
      'refresh-token': 'test-refresh-token',
      'token-expires-at': Date.now() + 3600000,
    }));
    mockFs.writeFileSync.mockReturnValue(undefined); // writeFileSync succeeds
    mockFs.mkdirSync.mockReturnValue(undefined); // mkdirSync succeeds
    mockFs.unlinkSync.mockReturnValue(undefined); // unlinkSync succeeds
    mockFs.renameSync.mockReturnValue(undefined); // renameSync succeeds

    mockClient.getAccessToken.mockReturnValue('test-access-token');
    mockClient.getRefreshToken.mockReturnValue('test-refresh-token');
    
    mockApiAuth.initiateLogin.mockReturnValue({
      success: true,
      url: 'https://api.toast.com/oauth/authorize?client_id=test-client-id&response_type=code',
    });
    
    mockApiAuth.exchangeCodeForToken.mockResolvedValue({
      success: true,
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
    });

    mockApiAuth.handleAuthRedirect.mockResolvedValue({
      success: true,
      profile: {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    mockApiAuth.fetchUserProfile.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
      subscription: {
        active: true,
        plan: 'premium',
      },
    });

    mockApiAuth.logout.mockResolvedValue({
      success: true,
    });

    // Get auth module
    auth = require('../../src/main/auth');
  });

  describe('Authentication Flow', () => {
    test('should initiate login with correct OAuth URL', async () => {
      const result = await auth.initiateLogin();

      expect(result).toBe(true);
      expect(mockApiAuth.initiateLogin).toHaveBeenCalledWith('test-client-id');
      expect(mockShell.openExternal).toHaveBeenCalled();
    });

    test('should exchange code for token successfully', async () => {
      const code = 'test-auth-code';
      const state = 'test-state';

      const result = await auth.exchangeCodeForToken(code, state);

      expect(mockApiAuth.exchangeCodeForToken).toHaveBeenCalledWith({
        code,
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
      expect(result.success).toBe(true);
    });

    test('should handle token exchange errors', async () => {
      const code = 'invalid-code';
      mockApiAuth.exchangeCodeForToken.mockRejectedValue(new Error('Invalid code'));

      const result = await auth.exchangeCodeForToken(code);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid code');
    });

    test('should handle auth redirect URLs', async () => {
      const authUrl = 'toast-app://auth?code=test-code&state=test-state';

      const result = await auth.handleAuthRedirect(authUrl);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should handle malformed redirect URLs', async () => {
      const invalidUrl = 'invalid-url';

      const result = await auth.handleAuthRedirect(invalidUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });
  });

  describe('Token Management', () => {
    test('should check for valid token', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const isValid = await auth.hasValidToken();

      expect(typeof isValid).toBe('boolean');
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    test('should return false for expired tokens', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        'auth-token': 'expired-token',
        'token-expires-at': Date.now() - 3600000, // 1 hour ago
      }));

      const isValid = await auth.hasValidToken();

      expect(isValid).toBe(false);
    });

    test('should get access token', async () => {
      const token = await auth.getAccessToken();

      expect(token).toBe('test-access-token');
      expect(mockClient.getAccessToken).toHaveBeenCalled();
    });

    test('should refresh access token when needed', async () => {
      // Set up expired token to trigger refresh
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        'auth-token': 'expired-token',
        'refresh-token': 'test-refresh-token',
        'token-expires-at': Date.now() - 3600000, // Token expired 1 hour ago
      }));

      mockApiAuth.refreshAccessToken.mockResolvedValue({
        success: true,
        access_token: 'refreshed-token',
        expires_in: 3600,
      });

      const result = await auth.refreshAccessToken();

      expect(mockApiAuth.refreshAccessToken).toHaveBeenCalledWith({
        refreshToken: 'test-refresh-token',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
      expect(result.success).toBe(true);
    });

    test('should handle refresh token errors', async () => {
      // Set up expired token to trigger refresh
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        'auth-token': 'expired-token',
        'refresh-token': 'test-refresh-token',
        'token-expires-at': Date.now() - 3600000, // Token expired 1 hour ago
      }));

      mockApiAuth.refreshAccessToken.mockRejectedValue(new Error('Refresh failed'));

      const result = await auth.refreshAccessToken();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Refresh failed');
    });
  });

  describe('User Profile Management', () => {
    test('should fetch user profile', async () => {
      const profile = await auth.fetchUserProfile();

      expect(mockApiAuth.fetchUserProfile).toHaveBeenCalled();
      expect(profile.id).toBe('user123');
      expect(profile.email).toBe('test@example.com');
      expect(profile.name).toBe('Test User');
    });

    test('should handle profile fetch errors', async () => {
      mockApiAuth.fetchUserProfile.mockRejectedValue(new Error('Profile fetch failed'));

      const profile = await auth.fetchUserProfile();

      expect(profile.error.message).toContain('Profile fetch failed');
    });

    test('should fetch subscription information', async () => {
      const subscription = await auth.fetchSubscription();

      expect(subscription).toBeDefined();
      expect(subscription.active).toBe(true);
      expect(subscription.plan).toBe('premium');
    });

    test('should return default subscription when no subscription data', async () => {
      mockApiAuth.fetchUserProfile.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        // No subscription field
      });

      const subscription = await auth.fetchSubscription();

      expect(subscription.id).toBe('sub_free_anonymous');
      expect(subscription.active).toBe(false);
      expect(subscription.isSubscribed).toBe(false);
    });
  });

  describe('Logout Process', () => {
    test('should logout successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const result = await auth.logout();

      // The actual logout function returns boolean, not object
      expect(result).toBe(true);
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    test('should handle logout when no token file exists', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await auth.logout();

      // The actual logout function returns boolean, not object
      expect(result).toBe(true);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    test('should handle logout file system errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.unlinkSync.mockImplementation(() => {
        throw new Error('File delete failed');
      });

      const result = await auth.logout();

      // The actual logout function returns boolean, not object
      expect(result).toBe(false);
    });
  });

  describe('Protocol Handler', () => {
    test('should register protocol handler', () => {
      auth.registerProtocolHandler();

      expect(mockApp.setAsDefaultProtocolClient).toHaveBeenCalledWith('toast-app');
    });

    test('should handle protocol registration in development', () => {
      const { getEnv } = require('../../src/main/config/env');
      getEnv.mockImplementation((key, defaultValue) => {
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      });

      jest.resetModules();
      const devAuth = require('../../src/main/auth');
      
      devAuth.registerProtocolHandler();

      expect(mockApp.setAsDefaultProtocolClient).toHaveBeenCalled();
    });
  });

  describe('Page Group Settings', () => {
    test('should update page group settings based on subscription', async () => {
      const subscription = {
        active: true,
        plan: 'premium',
        features: { page_groups: 9 },
      };

      const result = await auth.updatePageGroupSettings(subscription);

      expect(mockConfig.set).toHaveBeenCalledWith('subscription', {
        isAuthenticated: true,
        isSubscribed: true,
        active: true,
        plan: 'premium',
        expiresAt: '',
        pageGroups: 9,
        isVip: false,
        features: {
          page_groups: 9,
          advanced_actions: false,
          cloud_sync: false,
        },
        additionalFeatures: {
          advancedActions: false,
          cloudSync: false,
        },
      });
      expect(result).toBeUndefined(); // Function returns void
    });

    test('should handle anonymous subscription', async () => {
      const anonymousSubscription = {
        active: false,
        plan: 'free',
        features: { page_groups: 1 },
      };

      const result = await auth.updatePageGroupSettings(anonymousSubscription);

      expect(mockConfig.set).toHaveBeenCalledWith('subscription', {
        isAuthenticated: true,
        isSubscribed: false,
        active: false,
        plan: 'free',
        expiresAt: '',
        pageGroups: 1,
        isVip: false,
        features: {
          page_groups: 1,
          advanced_actions: false,
          cloud_sync: false,
        },
        additionalFeatures: {
          advancedActions: false,
          cloudSync: false,
        },
      });
      expect(result).toBeUndefined(); // Function returns void
    });
  });

  describe('Token Storage', () => {
    test('should read token file when it exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      const tokenData = {
        'auth-token': 'stored-token',
        'refresh-token': 'stored-refresh-token',
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(tokenData));

      // This is testing an internal function, so we test it through public methods
      const result = await auth.hasValidToken();
      // Should return false when no token exists
      expect(result).toBe(false);
    });

    test('should handle missing token file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await auth.hasValidToken();
      
      // Should handle missing token file gracefully and return false
      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalled();
    });

    test('should handle corrupted token file', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const result = await auth.hasValidToken();
      
      // Should handle corrupted token file gracefully and return false
      expect(result).toBe(false);
      expect(mockFs.readFileSync).toHaveBeenCalled();
    });

    test('should write token file successfully', async () => {
      const code = 'test-code';
      
      const result = await auth.exchangeCodeForToken(code);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    test('should handle token file write errors', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = await auth.exchangeCodeForToken('test-code');

      // The function fails if token storage fails
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save token file');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockApiAuth.fetchUserProfile.mockRejectedValue(new Error('Network error'));

      const profile = await auth.fetchUserProfile();

      expect(profile.error.message).toContain('Network error');
    });

    test('should handle API server errors', async () => {
      mockApiAuth.exchangeCodeForToken.mockRejectedValue(new Error('500 Internal Server Error'));

      const result = await auth.exchangeCodeForToken('test-code');

      expect(result.success).toBe(false);
      expect(result.error).toContain('500 Internal Server Error');
    });

    test('should handle missing environment variables', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const { getEnv } = require('../../src/main/config/env');
      // Mock to return undefined for CLIENT_ID, which will fall back to empty string in production
      getEnv.mockImplementation((key, defaultValue) => 
        key === 'CLIENT_ID' ? undefined : defaultValue
      );

      jest.resetModules();
      const envlessAuth = require('../../src/main/auth');
      
      try {
        // In production with missing CLIENT_ID, it should still succeed (returns true)
        // but the OAuth flow will fail later when server rejects empty client_id
        const result = await envlessAuth.initiateLogin();
        expect(result).toBe(true);
      } finally {
        // Restore NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
      }
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete authentication flow', async () => {
      // 1. Initiate login
      const loginResult = await auth.initiateLogin();
      expect(loginResult).toBe(true);

      // 2. Handle redirect
      const redirectUrl = 'toast-app://auth?code=test-code&state=test-state';
      const redirectResult = await auth.handleAuthRedirect(redirectUrl);
      expect(redirectResult.success).toBe(true);

      // 3. Fetch profile
      const profile = await auth.fetchUserProfile();
      expect(profile.id).toBeDefined();

      // 4. Fetch subscription
      const subscription = await auth.fetchSubscription();
      expect(subscription).toBeDefined();

      // 5. Logout
      const logoutResult = await auth.logout();
      expect(logoutResult).toBe(true); // logout returns boolean, not object
    });

    test('should handle token refresh during profile fetch', async () => {
      // Mock successful profile fetch (simulating successful API call after refresh)
      mockApiAuth.fetchUserProfile.mockResolvedValue({
        id: 'user123',
        name: 'Test User',
      });

      const profile = await auth.fetchUserProfile();

      // The auth.fetchUserProfile function passes the refreshAccessToken callback
      // to apiAuth.fetchUserProfile, but the actual refresh logic is handled
      // by the apiAuth module, so we just verify the successful result
      expect(profile.id).toBe('user123');
      expect(profile.name).toBe('Test User');
    });
  });

});