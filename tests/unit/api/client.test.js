/**
 * Toast API - Client Tests
 *
 * Tests for the API client base module
 */

// Mock axios
const mockAxios = {
  create: jest.fn(() => mockAxios),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock('axios', () => mockAxios);

// Mock config/env
jest.mock('../../../src/main/config/env', () => ({
  getEnv: jest.fn((key, defaultValue) => defaultValue),
}));

// Mock constants
jest.mock('../../../src/main/constants', () => ({
  DEFAULT_ANONYMOUS_SUBSCRIPTION: {
    id: 'sub_free_anonymous',
    plan: 'free',
    active: false,
    is_subscribed: false,
  },
}));

describe('API Client', () => {
  let client;
  const { getEnv } = require('../../../src/main/config/env');

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup default mock responses
    getEnv.mockImplementation((key, defaultValue) => defaultValue);
    mockAxios.create.mockReturnValue(mockAxios);

    // Get client module
    client = require('../../../src/main/api/client');
  });

  describe('Module Initialization', () => {
    test('should have correct base URL', () => {
      expect(client.ENDPOINTS.OAUTH_AUTHORIZE).toContain('/api/oauth/authorize');
    });

    test('should have all required endpoints', () => {
      expect(client.ENDPOINTS).toBeDefined();
      expect(client.ENDPOINTS.OAUTH_AUTHORIZE).toContain('/oauth/authorize');
      expect(client.ENDPOINTS.OAUTH_TOKEN).toContain('/oauth/token');
      expect(client.ENDPOINTS.OAUTH_REVOKE).toContain('/oauth/revoke');
      expect(client.ENDPOINTS.USER_PROFILE).toContain('/users/profile');
      expect(client.ENDPOINTS.SETTINGS).toContain('/users/settings');
    });

    test('should have all endpoints with correct structure', () => {
      Object.values(client.ENDPOINTS).forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint).toContain('/api/');
      });
    });
  });

  describe('Token Management', () => {
    test('should set and get access token', () => {
      const testToken = 'test-access-token';

      client.setAccessToken(testToken);

      expect(client.getAccessToken()).toBe(testToken);
    });

    test('should set and get refresh token', () => {
      const testRefreshToken = 'test-refresh-token';

      client.setRefreshToken(testRefreshToken);

      expect(client.getRefreshToken()).toBe(testRefreshToken);
    });

    test('should clear all tokens', () => {
      client.setAccessToken('access-token');
      client.setRefreshToken('refresh-token');

      client.clearTokens();

      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    });

    test('should return null for unset tokens', () => {
      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    });

    test('should handle empty string tokens', () => {
      client.setAccessToken('');
      client.setRefreshToken('');

      expect(client.getAccessToken()).toBe('');
      expect(client.getRefreshToken()).toBe('');
    });

    test('should handle null token assignment', () => {
      client.setAccessToken('token');
      client.setAccessToken(null);

      expect(client.getAccessToken()).toBeNull();
    });
  });

  describe('Authentication Headers', () => {
    test('should generate auth headers with valid token', () => {
      const testToken = 'valid-bearer-token';
      client.setAccessToken(testToken);

      const headers = client.getAuthHeaders();

      expect(headers).toEqual({
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      });
    });

    test('should throw error when no token available', () => {
      client.clearTokens();

      expect(() => client.getAuthHeaders()).toThrow('No authentication token available');
    });

    test('should throw error with empty token', () => {
      client.setAccessToken('');

      expect(() => client.getAuthHeaders()).toThrow('No authentication token available');
    });

    test('should handle special characters in token', () => {
      const tokenWithSpecialChars = 'token.with-special_chars123';
      client.setAccessToken(tokenWithSpecialChars);

      const headers = client.getAuthHeaders();

      expect(headers.Authorization).toBe(`Bearer ${tokenWithSpecialChars}`);
    });
  });

  describe('API Client Creation', () => {
    test('should create axios client with default options', () => {
      const axiosInstance = client.createApiClient();

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://toastapp.io/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(axiosInstance).toBe(mockAxios);
    });

    test('should create axios client with custom options', () => {
      const customOptions = {
        timeout: 5000,
        headers: {
          'Custom-Header': 'custom-value',
        },
      };

      client.createApiClient(customOptions);

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://toastapp.io/api',
        timeout: 5000,
        headers: {
          'Custom-Header': 'custom-value',
        },
      });
    });

    test('should override default options with custom ones', () => {
      const customOptions = {
        baseURL: 'https://different.api.com',
        headers: {
          'Content-Type': 'application/xml',
        },
      };

      client.createApiClient(customOptions);

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://different.api.com',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/xml',
        },
      });
    });

    test('should handle empty options object', () => {
      client.createApiClient({});

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://toastapp.io/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('Authenticated Requests', () => {
    test('should execute API call with valid token', async () => {
      client.setAccessToken('valid-token');
      const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await client.authenticatedRequest(mockApiCall);

      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toEqual({ data: 'success' });
    });

    test('should return error when no token available', async () => {
      client.clearTokens();
      const mockApiCall = jest.fn();

      const result = await client.authenticatedRequest(mockApiCall);

      expect(mockApiCall).not.toHaveBeenCalled();
      expect(result).toEqual({
        error: {
          code: 'NO_TOKEN',
          message: 'Authentication required. Please log in.',
        },
      });
    });

    test('should return default value for unauthenticated requests when allowed', async () => {
      client.clearTokens();
      const mockApiCall = jest.fn();
      const defaultValue = { data: 'default' };

      const result = await client.authenticatedRequest(mockApiCall, {
        allowUnauthenticated: true,
        defaultValue,
      });

      expect(mockApiCall).not.toHaveBeenCalled();
      expect(result).toEqual(defaultValue);
    });

    test('should return default subscription for unauthorized subscription requests', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 },
      });

      const result = await client.authenticatedRequest(mockApiCall, {
        isSubscriptionRequest: true,
      });

      expect(result).toEqual({
        id: 'sub_free_anonymous',
        plan: 'free',
        active: false,
        is_subscribed: false,
      });
    });

    test('should handle API call errors', async () => {
      client.setAccessToken('valid-token');
      const error = new Error('Network error');
      const mockApiCall = jest.fn().mockRejectedValue(error);

      const result = await client.authenticatedRequest(mockApiCall);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toContain('Network error');
    });

    test('should call unauthorized handler on 401 error', async () => {
      client.setAccessToken('expired-token');
      const unauthorizedHandler = jest.fn();
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 },
      });

      await client.authenticatedRequest(mockApiCall, {
        onUnauthorized: unauthorizedHandler,
      });

      expect(unauthorizedHandler).toHaveBeenCalled();
    });

    test('should handle non-HTTP errors', async () => {
      client.setAccessToken('valid-token');
      const networkError = new Error('ECONNREFUSED');
      const mockApiCall = jest.fn().mockRejectedValue(networkError);

      const result = await client.authenticatedRequest(mockApiCall);

      expect(result.error).toBeDefined();
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toContain('ECONNREFUSED');
    });
  });

  describe('Module Exports', () => {
    test('should export required functions and constants', () => {
      expect(typeof client.setAccessToken).toBe('function');
      expect(typeof client.getAccessToken).toBe('function');
      expect(typeof client.setRefreshToken).toBe('function');
      expect(typeof client.getRefreshToken).toBe('function');
      expect(typeof client.clearTokens).toBe('function');
      expect(typeof client.getAuthHeaders).toBe('function');
      expect(typeof client.createApiClient).toBe('function');
      expect(typeof client.authenticatedRequest).toBe('function');
      expect(client.ENDPOINTS).toBeDefined();
    });

    test('should have all endpoint constants', () => {
      const requiredEndpoints = [
        'OAUTH_AUTHORIZE',
        'OAUTH_TOKEN',
        'OAUTH_REVOKE',
        'USER_PROFILE',
        'SETTINGS',
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(client.ENDPOINTS[endpoint]).toBeDefined();
        expect(typeof client.ENDPOINTS[endpoint]).toBe('string');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined options in createApiClient', () => {
      client.createApiClient(undefined);

      expect(mockAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://toastapp.io/api',
        timeout: 10000,
      }));
    });

    test('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);
      client.setAccessToken(longToken);

      const headers = client.getAuthHeaders();

      expect(headers.Authorization).toBe(`Bearer ${longToken}`);
    });

    test('should handle token with whitespace', () => {
      const tokenWithSpaces = '  token-with-spaces  ';
      client.setAccessToken(tokenWithSpaces);

      const headers = client.getAuthHeaders();

      expect(headers.Authorization).toBe(`Bearer ${tokenWithSpaces}`);
    });

    test('should preserve token case sensitivity', () => {
      const mixedCaseToken = 'MiXeD-CaSe-ToKeN';
      client.setAccessToken(mixedCaseToken);

      expect(client.getAccessToken()).toBe(mixedCaseToken);
    });
  });
});