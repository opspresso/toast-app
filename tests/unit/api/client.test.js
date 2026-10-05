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

const { version: appVersion } = require('../../../package.json');

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
        baseURL: 'https://toastapp.dev/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Toast-App-Version': appVersion,
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
        baseURL: 'https://toastapp.dev/api',
        timeout: 5000,
        headers: {
          'Custom-Header': 'custom-value',
          'X-Toast-App-Version': appVersion,
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
          'X-Toast-App-Version': appVersion,
        },
      });
    });

    test('should handle empty options object', () => {
      client.createApiClient({});

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://toastapp.dev/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'X-Toast-App-Version': appVersion,
        },
      });
    });

    test('should include the app version header by default', () => {
      client.createApiClient();

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Toast-App-Version': expect.any(String),
          }),
        }),
      );
    });

    test('should use the package version for the app version header', () => {
      client.createApiClient();

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Toast-App-Version': appVersion,
          }),
        }),
      );
    });

    test('should preserve the app version header with custom options', () => {
      client.createApiClient({
        timeout: 5000,
        headers: {
          'Custom-Header': 'custom-value',
        },
      });

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'Custom-Header': 'custom-value',
            'X-Toast-App-Version': appVersion,
          },
        }),
      );
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

    test('does not hide missing credentials behind obsolete default options', async () => {
      client.clearTokens();
      const mockApiCall = jest.fn();
      const defaultValue = { data: 'default' };

      const result = await client.authenticatedRequest(mockApiCall, {
        allowUnauthenticated: true,
        defaultValue,
      });

      expect(mockApiCall).not.toHaveBeenCalled();
      expect(result.error.code).toBe('NO_TOKEN');
    });

    test('does not replace authorization failures with an anonymous subscription', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 },
      });

      const result = await client.authenticatedRequest(mockApiCall, {
        isSubscriptionRequest: true,
      });

      expect(result.error.code).toBe('HTTP_401');
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

  describe('Module Configuration', () => {
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

  describe('Token Refresh Logic', () => {
    test('never retries an old write with a newly signed-in account', async () => {
      client.setAccessToken('account-a');
      const request = jest.fn(async () => {
        client.setAccessToken('account-b');
        throw { response: { status: 401 } };
      });
      const onUnauthorized = jest.fn(async () => ({ success: true }));
      const result = await client.authenticatedRequest(request, { onUnauthorized });
      expect(result.error.code).toBe('AUTH_SESSION_CHANGED');
      expect(request).toHaveBeenCalledTimes(1);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });

    test('preserves server failure status after a successful refresh', async () => {
      client.setAccessToken('old');
      const request = jest.fn().mockRejectedValueOnce({ response: { status: 401 } })
        .mockRejectedValueOnce({ response: { status: 503 }, message: 'Unavailable' });
      const result = await client.authenticatedRequest(request, { onUnauthorized: async () => ({ success: true }) });
      expect(result.error.statusCode).toBe(503);
      expect(result.error.requireRelogin).not.toBe(true);
    });

    test('forces one refresh and retries a rejected request at most once', async () => {
      client.setAccessToken('expired-token');
      const request = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const refresh = jest.fn(async () => ({ success: true }));
      const result = await client.authenticatedRequest(request, { onUnauthorized: refresh });
      expect(result.error).toMatchObject({ code: 'AUTH_REFRESH_FAILED', statusCode: 401, requireRelogin: true });
      expect(refresh).toHaveBeenCalledWith({ force: true });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledTimes(2);
    });

    test('reuses a sibling refresh when an older request receives a late 401', async () => {
      client.setAccessToken('old');
      let rejectLate;
      const late = new Promise((_resolve, reject) => { rejectLate = reject; });
      const request = jest.fn().mockReturnValueOnce(late).mockResolvedValueOnce('second');
      const refresh = jest.fn(async () => {
        client.setAccessToken('refreshed', { refresh: true });
        return { success: true };
      });
      const second = client.authenticatedRequest(request, { onUnauthorized: refresh });
      const firstRequest = jest.fn().mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce('first');
      expect(await client.authenticatedRequest(firstRequest, { onUnauthorized: refresh })).toBe('first');
      rejectLate({ response: { status: 401 } });
      expect(await second).toBe('second');
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledTimes(2);
    });

    test('discards a successful response after the account changes', async () => {
      client.setAccessToken('one');
      let finish;
      const pending = new Promise(resolve => { finish = resolve; });
      const result = client.authenticatedRequest(() => pending);
      client.setAccessToken('two');
      finish({ privateData: 'one' });
      expect((await result).error.code).toBe('AUTH_SESSION_CHANGED');
    });

    test('preserves failed refresh retry despite obsolete default options', async () => {
      client.setAccessToken('expired-token');
      const onUnauthorized = jest.fn().mockResolvedValue({ success: true });

      const firstApiCall = jest.fn().mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce({ data: 'first' });
      await client.authenticatedRequest(firstApiCall, { onUnauthorized });

      const secondApiCall = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const defaultValue = { anonymous: true };
      const result = await client.authenticatedRequest(secondApiCall, {
        onUnauthorized,
        allowUnauthenticated: true,
        defaultValue,
      });

      expect(result.error.code).toBe('AUTH_REFRESH_FAILED');
      expect(secondApiCall).toHaveBeenCalledTimes(2);
    });

    test('does not carry a failure cooldown into a subsequent successful request', async () => {
      client.setAccessToken('old');
      const refresh = jest.fn().mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
      const first = jest.fn().mockRejectedValue({ response: { status: 401 } });
      expect((await client.authenticatedRequest(first, { onUnauthorized: refresh })).error).toBeDefined();
      const second = jest.fn().mockRejectedValueOnce({ response: { status: 401 } }).mockResolvedValueOnce('recovered');
      expect(await client.authenticatedRequest(second, { onUnauthorized: refresh })).toBe('recovered');
      expect(refresh).toHaveBeenCalledTimes(2);
    });

    test('should handle throttled requests with valid tokens', async () => {
      client.setAccessToken('valid-token');
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ data: 'success' });

      const onUnauthorized = jest.fn().mockResolvedValue({
        success: true,
        throttled: true,
        tokenValid: true
      });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result).toEqual({ data: 'success' });
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    test('should handle API error with valid token', async () => {
      client.setAccessToken('valid-token');
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockRejectedValueOnce({
          response: { status: 500 },
          message: 'Internal server error'
        });

      const onUnauthorized = jest.fn().mockResolvedValue({
        success: true,
        throttled: true,
        tokenValid: true
      });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result.error.code).toBe('HTTP_500');
      expect(result.error.statusCode).toBe(500);
      expect(result.error.message).toContain('Internal server error');
    });

    test('should handle refresh failure with retry', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockRejectedValueOnce({ response: { status: 401 } });

      const onUnauthorized = jest.fn().mockResolvedValue({ success: true });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result.error.code).toBe('AUTH_REFRESH_FAILED');
      expect(result.error.requireRelogin).toBe(true);
    });

    test('should retry a subscription request with the refreshed token instead of falling back immediately', async () => {
      client.setAccessToken('expired-token');
      const realSubscription = { id: 'sub_premium_123', plan: 'Premium', active: true };
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce(realSubscription);

      const onUnauthorized = jest.fn().mockResolvedValue({ success: true });

      const result = await client.authenticatedRequest(mockApiCall, {
        isSubscriptionRequest: true,
        onUnauthorized,
      });

      expect(onUnauthorized).toHaveBeenCalled();
      expect(result).toEqual(realSubscription);
    });

    test('preserves refresh failures for subscription consumers', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const onUnauthorized = jest.fn().mockResolvedValue({ success: false });

      const result = await client.authenticatedRequest(mockApiCall, {
        isSubscriptionRequest: true,
        onUnauthorized,
      });

      expect(onUnauthorized).toHaveBeenCalled();
      expect(result.error).toMatchObject({ code: 'AUTH_REFRESH_FAILED', requireRelogin: false });
    });

    test('should reset request counter after successful API call', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({ data: 'success' });

      const onUnauthorized = jest.fn().mockResolvedValue({ success: true });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result).toEqual({ data: 'success' });
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    test('should handle unsuccessful refresh attempts', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 }
      });

      const onUnauthorized = jest.fn().mockResolvedValue({ success: false });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result.error).toBeDefined();
      expect(onUnauthorized).toHaveBeenCalled();
    });

    test('preserves tokens and does not require re-login on a transient refresh failure', async () => {
      // A network error or server 500 during refresh doesn't mean the session is dead —
      // forcing a full logout here would turn a transient blip into an unwanted sign-out.
      client.setAccessToken('expired-token');
      client.setRefreshToken('still-valid-refresh-token');
      const mockApiCall = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const onUnauthorized = jest.fn().mockResolvedValue({ success: false, code: 'REFRESH_EXCEPTION' });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result.error.requireRelogin).toBe(false);
      expect(client.getAccessToken()).toBe('expired-token');
      expect(client.getRefreshToken()).toBe('still-valid-refresh-token');
    });

    test('clears tokens and requires re-login when the refresh callback reports a dead session', async () => {
      client.setAccessToken('expired-token');
      client.setRefreshToken('dead-refresh-token');
      const mockApiCall = jest.fn().mockRejectedValue({ response: { status: 401 } });
      const onUnauthorized = jest.fn().mockResolvedValue({ success: false, code: 'SESSION_EXPIRED', requireRelogin: true });

      const result = await client.authenticatedRequest(mockApiCall, { onUnauthorized });

      expect(result.error.requireRelogin).toBe(true);
      expect(client.getAccessToken()).toBeNull();
      expect(client.getRefreshToken()).toBeNull();
    });
  });

  describe('Environment Configuration', () => {
    test('should use default URL when env var not set', () => {
      getEnv.mockImplementation((key, defaultValue) => defaultValue);

      client.createApiClient();

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://toastapp.dev/api'
        })
      );
    });

    test('should handle custom timeout from environment', () => {
      getEnv.mockImplementation((key, defaultValue) => {
        if (key === 'API_TIMEOUT') return '15000';
        return defaultValue;
      });

      client.createApiClient({ timeout: parseInt(getEnv('API_TIMEOUT', '10000')) });

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined options in createApiClient', () => {
      client.createApiClient(undefined);

      expect(mockAxios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://toastapp.dev/api',
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

    test('should handle null onUnauthorized callback', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 }
      });

      const result = await client.authenticatedRequest(mockApiCall, {
        onUnauthorized: null
      });

      expect(result.error).toBeDefined();
    });

    test('should handle undefined onUnauthorized callback', async () => {
      client.setAccessToken('expired-token');
      const mockApiCall = jest.fn().mockRejectedValue({
        response: { status: 401 }
      });

      const result = await client.authenticatedRequest(mockApiCall, {
        onUnauthorized: undefined
      });

      expect(result.error).toBeDefined();
    });
  });
});
