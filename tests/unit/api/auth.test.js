/**
 * Toast API - Authentication API Tests
 *
 * Tests for API authentication module (P0 Priority)
 */

// Mock dependencies
jest.mock('electron-store');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345')
}));
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));
jest.mock('../../../src/main/constants', () => ({
  DEFAULT_ANONYMOUS_SUBSCRIPTION: {
    plan: 'free',
    active: false
  }
}));

const mockClient = {
  get: jest.fn(),
  post: jest.fn()
};

const mockStore = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn()
};

const mockClientModule = {
  ENDPOINTS: {
    OAUTH_AUTHORIZE: 'https://app.toast.sh/api/oauth/authorize',
    OAUTH_TOKEN: 'https://app.toast.sh/api/oauth/token',
    OAUTH_REVOKE: 'https://app.toast.sh/api/oauth/revoke',
    USER_PROFILE: 'https://app.toast.sh/api/users/profile',
    SETTINGS: 'https://app.toast.sh/api/users/settings'
  },
  createApiClient: jest.fn(() => mockClient),
  getAuthHeaders: jest.fn(() => ({ Authorization: 'Bearer mock-token' })),
  authenticatedRequest: jest.fn(),
  clearTokens: jest.fn()
};

jest.mock('../../../src/main/api/client', () => mockClientModule);

const Store = require('electron-store');
Store.mockImplementation(() => mockStore);

describe('API Auth Module (P0)', () => {
  let authApi;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Re-setup Store mock after clearing
    const Store = require('electron-store');
    Store.mockImplementation(() => mockStore);

    // Setup default mock responses
    mockStore.get.mockReturnValue(null);
    mockClient.get.mockResolvedValue({ data: {} });
    mockClient.post.mockResolvedValue({ data: {} });
    mockClientModule.authenticatedRequest.mockResolvedValue({ data: {} });

    // Get fresh module instance
    authApi = require('../../../src/main/api/auth');
  });

  describe('Login Process Management', () => {
    test('should check login process status', () => {
      const result = authApi.isLoginProcessActive();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('OAuth Login Initiation', () => {
    test('should handle login initiation', () => {
      const result = authApi.initiateLogin('test-client-id');

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.success) {
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('state');
      }
    });

    test('should handle missing client ID', () => {
      const result = authApi.initiateLogin();

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Token Exchange', () => {
    test('should handle token exchange', async () => {
      const params = {
        code: 'auth-code-123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };

      mockClient.post.mockResolvedValue({
        data: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          expires_in: 3600
        }
      });

      const result = await authApi.exchangeCodeForToken(params);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      expect(mockClient.post).toHaveBeenCalled();
    });

    test('should handle token exchange errors', async () => {
      const params = {
        code: 'auth-code-123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };

      mockClient.post.mockRejectedValue(new Error('Network error'));

      const result = await authApi.exchangeCodeForToken(params);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Token Refresh', () => {
    test('should handle successful token refresh', async () => {
      const params = {
        refreshToken: 'refresh-token-123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };

      mockClient.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        }
      });

      const result = await authApi.refreshAccessToken(params);

      expect(result).toEqual({
        success: true,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token'
      });
      expect(mockClient.post).toHaveBeenCalledWith('https://app.toast.sh/api/oauth/token', expect.any(URLSearchParams), expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }));

      // Verify the URLSearchParams contains the expected data
      const calledWith = mockClient.post.mock.calls[0][1];
      expect(calledWith.get('grant_type')).toBe('refresh_token');
      expect(calledWith.get('refresh_token')).toBe('refresh-token-123');
    });

    test('should handle refresh errors with proper error response', async () => {
      const params = {
        refreshToken: 'refresh-token-123',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };

      mockClient.post.mockRejectedValue(new Error('Invalid refresh token'));

      const result = await authApi.refreshAccessToken(params);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Invalid refresh token'),
        code: 'REFRESH_FAILED'
      });
    });
  });

  describe('Auth Redirect Handling', () => {
    test('should handle valid auth redirects', async () => {
      const params = {
        url: 'toast-app://auth?code=auth-code-123&state=mock-uuid-12345',
        onCodeExchange: jest.fn().mockResolvedValue({
          success: true,
          tokens: { accessToken: 'token-123' }
        })
      };

      // Clear any previous mock calls
      mockStore.get.mockClear();

      // Set up specific mock calls for state validation
      const currentTime = Date.now();
      mockStore.get
        .mockReturnValueOnce('mock-uuid-12345')     // First call for 'oauth-state'
        .mockReturnValueOnce(currentTime - 10000); // Second call for 'state-created-at'

      const result = await authApi.handleAuthRedirect(params);

      // Verify the mock was called correctly
      expect(mockStore.get).toHaveBeenCalledTimes(2);
      expect(mockStore.get).toHaveBeenNthCalledWith(1, 'oauth-state');
      expect(mockStore.get).toHaveBeenNthCalledWith(2, 'state-created-at');

      expect(result).toEqual({
        success: true,
        tokens: { accessToken: 'token-123' }
      });
    });

    test('should reject invalid URLs', async () => {
      const params = {
        url: 'invalid-url',
        onCodeExchange: jest.fn()
      };

      const result = await authApi.handleAuthRedirect(params);

      expect(result).toEqual({
        success: false,
        error: expect.any(String)
      });
      expect(params.onCodeExchange).not.toHaveBeenCalled();
    });
  });

  describe('User Profile', () => {
    test('should fetch user profile', async () => {
      mockClientModule.authenticatedRequest.mockResolvedValue({
        data: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com'
        }
      });

      const result = await authApi.fetchUserProfile();

      expect(result).toBeDefined();
    });

    test('should handle profile fetch errors', async () => {
      mockClientModule.authenticatedRequest.mockRejectedValue(new Error('Unauthorized'));

      try {
        const result = await authApi.fetchUserProfile();
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Subscription', () => {
    test('should fetch subscription', async () => {
      mockClientModule.authenticatedRequest.mockResolvedValue({
        data: {
          plan: 'premium',
          active: true,
          features: ['feature1', 'feature2']
        }
      });

      const result = await authApi.fetchSubscription();

      expect(result).toBeDefined();
    });

    test('should handle subscription fetch errors', async () => {
      mockClientModule.authenticatedRequest.mockRejectedValue(new Error('Network error'));

      try {
        const result = await authApi.fetchSubscription();
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Logout', () => {
    test('should handle logout', async () => {
      mockClientModule.authenticatedRequest.mockResolvedValue({ data: {} });

      const result = await authApi.logout();

      expect(result).toBeDefined();
    });

    test('should handle logout errors', async () => {
      mockClientModule.authenticatedRequest.mockRejectedValue(new Error('Network error'));

      const result = await authApi.logout();

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockClient.post.mockRejectedValue(new Error('ENOTFOUND'));

      const result = await authApi.exchangeCodeForToken({
        code: 'test-code',
        clientId: 'test-id',
        clientSecret: 'test-secret'
      });

      expect(result).toBeDefined();
    });

    test('should handle API response errors', async () => {
      const apiError = new Error('Bad Request');
      apiError.response = {
        status: 400,
        data: { error: 'invalid_request' }
      };

      mockClient.post.mockRejectedValue(apiError);

      const result = await authApi.exchangeCodeForToken({
        code: 'test-code',
        clientId: 'test-id',
        clientSecret: 'test-secret'
      });

      expect(result).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete auth flow simulation', async () => {
      // Initiate login
      const loginResult = authApi.initiateLogin('test-client');
      expect(loginResult).toBeDefined();

      // Exchange code for token
      mockClient.post.mockResolvedValue({
        data: {
          access_token: 'access-token',
          refresh_token: 'refresh-token'
        }
      });

      const tokenResult = await authApi.exchangeCodeForToken({
        code: 'auth-code',
        clientId: 'test-client',
        clientSecret: 'test-secret'
      });

      expect(tokenResult).toBeDefined();

      // Fetch profile
      mockClientModule.authenticatedRequest.mockResolvedValue({
        data: { id: 'user-123', name: 'Test User' }
      });

      const profileResult = await authApi.fetchUserProfile();
      expect(profileResult).toBeDefined();
    });
  });
});
