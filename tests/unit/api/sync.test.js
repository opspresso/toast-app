/**
 * Toast API - Sync Module Tests
 *
 * Tests for cloud synchronization API module (P1 Priority)
 */

// Mock os
jest.mock('os', () => ({
  hostname: jest.fn(() => 'test-hostname'),
  userInfo: jest.fn(() => ({ username: 'testuser' })),
}));

// Mock logger
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock API client
const mockClient = {
  createApiClient: jest.fn(),
  getAuthHeaders: jest.fn(),
  authenticatedRequest: jest.fn(),
  ENDPOINTS: {
    SETTINGS: '/api/users/settings',
    SYNC: '/api/sync',
  },
};

jest.mock('../../../src/main/api/client', () => mockClient);

describe('API Sync Module (P1)', () => {
  let sync;
  let mockConfigStore;
  let mockHasValidToken;
  let mockOnUnauthorized;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Setup mock config store
    mockConfigStore = {
      get: jest.fn(),
      set: jest.fn(),
    };

    // Setup mock functions
    mockHasValidToken = jest.fn();
    mockOnUnauthorized = jest.fn();

    // Setup default mock responses
    mockClient.getAuthHeaders.mockReturnValue({
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    });

    // Mock API client methods
    const mockApiClient = {
      get: jest.fn().mockResolvedValue({ data: { message: 'Success' } }),
      put: jest.fn().mockResolvedValue({ data: { message: 'Success' } }),
      post: jest.fn().mockResolvedValue({ data: { message: 'Success' } }),
    };
    
    mockClient.createApiClient.mockReturnValue(mockApiClient);

    // Setup authenticatedRequest mock to handle 401 errors and call onUnauthorized
    mockClient.authenticatedRequest.mockImplementation(async (apiCall, options = {}) => {
      const { onUnauthorized } = options;
      
      try {
        // Execute the API call - this will throw if we've mocked it to reject
        return await apiCall();
      } catch (error) {
        // Handle 401 unauthorized error like the real implementation
        if (error.response && error.response.status === 401 && onUnauthorized) {
          await onUnauthorized();
        }
        throw error;
      }
    });

    // Get sync module
    sync = require('../../../src/main/api/sync');
  });

  describe('Module Exports', () => {
    test('should export all required functions', () => {
      const requiredFunctions = [
        'isCloudSyncEnabled',
        'uploadSettings',
        'downloadSettings',
        'getLastSyncStatus',
      ];

      requiredFunctions.forEach(funcName => {
        expect(typeof sync[funcName]).toBe('function');
      });
    });
  });

  describe('Cloud Sync Eligibility', () => {
    test('should return false when not authenticated', async () => {
      mockHasValidToken.mockResolvedValue(false);

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(false);
      expect(mockHasValidToken).toHaveBeenCalled();
    });

    test('should return false when authenticated but no subscription', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue({
        isSubscribed: false,
        active: false,
        plan: 'free',
      });

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(false);
    });

    test('should return true for premium subscription with cloud sync feature', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue({
        isSubscribed: true,
        active: true,
        plan: 'premium',
        features: {
          cloud_sync: true,
        },
      });

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(true);
    });

    test('should return true for VIP subscription', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue({
        isSubscribed: true,
        active: true,
        plan: 'premium',
        isVip: true,
      });

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(true);
    });

    test('should return true when has additionalFeatures cloudSync', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue({
        isSubscribed: true,
        active: true,
        plan: 'basic',
        additionalFeatures: {
          cloudSync: true,
        },
      });

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(true);
    });

    test('should handle errors gracefully', async () => {
      mockHasValidToken.mockRejectedValue(new Error('Auth check failed'));

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(false);
    });

    test('should handle missing config store', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue(null);

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(false);
    });
  });

  describe('Settings Upload', () => {
    beforeEach(() => {
      // Reset sync state
      jest.resetModules();
      sync = require('../../../src/main/api/sync');
    });

    test('should upload settings successfully', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
        advanced: { hideOnBlur: true },
      };

      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: { message: 'Settings uploaded successfully' },
      });

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      expect(result.success).toBe(true);
      expect(mockClient.authenticatedRequest).toHaveBeenCalled();
    });

    test('should upload direct data when provided', async () => {
      const directData = {
        pages: [{ id: '2', buttons: [{ id: 'btn1' }] }],
        appearance: { theme: 'light' },
      };

      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: { message: 'Direct data uploaded' },
      });

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      expect(result.success).toBe(true);
    });

    test('should handle upload errors', async () => {
      // Test with missing directData (which should cause "Invalid data" error)
      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        // No directData provided - should cause error
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data');
    });

    test('should prevent concurrent uploads', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
      };

      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: { message: 'Settings uploaded' },
      });

      // Start first upload
      const promise1 = sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      // Start second upload immediately
      const promise2 = sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail due to concurrent sync
      const hasFailedSync = result1.success === false || result2.success === false;
      const hasSuccessfulSync = result1.success === true || result2.success === true;

      expect(hasFailedSync).toBe(true);
      expect(hasSuccessfulSync).toBe(true);
      
      // Check that the failed one has the correct error message
      const failedResult = result1.success === false ? result1 : result2;
      expect(failedResult.error).toContain('Sync already in progress');
    });

    test('should handle 401 unauthorized response', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
      };

      // Make the API client PUT method throw 401 error
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };
      
      const mockApiClient = mockClient.createApiClient();
      mockApiClient.put.mockRejectedValue(unauthorizedError);

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      expect(result.success).toBe(false);
      expect(mockOnUnauthorized).toHaveBeenCalled();
    });
  });

  describe('Settings Download', () => {
    beforeEach(() => {
      // Reset sync state
      jest.resetModules();
      sync = require('../../../src/main/api/sync');
    });

    test('should download settings successfully', async () => {
      const mockServerSettings = {
        pages: [{ id: '3', buttons: [] }],
        appearance: { theme: 'system' },
        advanced: { launchAtLogin: false },
      };

      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: mockServerSettings,
      });

      const result = await sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockServerSettings);
      expect(mockClient.authenticatedRequest).toHaveBeenCalled();
    });

    test('should handle download errors', async () => {
      mockClient.authenticatedRequest.mockRejectedValue(new Error('Download failed'));

      const result = await sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Download failed');
    });

    test('should prevent concurrent downloads', async () => {
      // Start first download
      const promise1 = sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      // Start second download immediately
      const promise2 = sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // One should succeed, one should fail due to concurrent sync
      const hasFailedSync = result1.success === false || result2.success === false;
      expect(hasFailedSync).toBe(true);
    });

    test('should handle 401 unauthorized during download', async () => {
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };
      
      // Make the API client GET method throw 401 error
      const mockApiClient = mockClient.createApiClient();
      mockApiClient.get.mockRejectedValue(unauthorizedError);

      const result = await sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      expect(result.success).toBe(false);
      expect(mockOnUnauthorized).toHaveBeenCalled();
    });

    test('should handle empty server response', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      // Should handle null data gracefully
      expect(result.success).toBe(true);
    });
  });

  describe('Sync Status Management', () => {
    test('should return initial sync status', () => {
      const status = sync.getLastSyncStatus();

      expect(status).toHaveProperty('success');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('error');
      expect(typeof status.success).toBe('boolean');
      expect(typeof status.timestamp).toBe('number');
    });

    test('should update sync status after successful upload', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
      };

      await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      const status = sync.getLastSyncStatus();
      expect(status.success).toBe(true);
      expect(status.timestamp).toBeGreaterThan(0);
    });

    test('should update sync status after failed upload', async () => {
      mockClient.authenticatedRequest.mockRejectedValue(new Error('Upload failed'));

      await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      const status = sync.getLastSyncStatus();
      expect(status.success).toBe(false);
      expect(status.error).toBeTruthy();
    });
  });

  describe('Device Information', () => {
    test('should generate device info string', async () => {
      // This tests the internal getDeviceInfo function through module behavior
      // Since it's not exported, we test it indirectly through upload/download operations
      
      // Test device info generation through actual API call verification\n      mockApiClient.post.mockResolvedValue({ data: { success: true } });\n      \n      const result = await sync.uploadSettings({\n        hasValidToken: jest.fn().mockResolvedValue(true),\n        configStore: { get: jest.fn() },\n        directData: { pages: [] }\n      });\n      \n      expect(result.success).toBe(true);\n      expect(mockApiClient.post).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
      };

      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';
      
      // Make the API client PUT method throw timeout error
      const mockApiClient = mockClient.createApiClient();
      mockApiClient.put.mockRejectedValue(timeoutError);

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle malformed server responses', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        // Missing success field
        data: 'unexpected response',
      });

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });

      // Should handle gracefully
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle missing callback functions', async () => {
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
      };

      // Test with missing onUnauthorized callback
      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: null,
        configStore: mockConfigStore,
        directData,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete sync workflow', async () => {
      // Check if sync is enabled
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue({
        isSubscribed: true,
        active: true,
        plan: 'premium',
        features: { cloud_sync: true },
      });

      const isEnabled = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });
      expect(isEnabled).toBe(true);

      // Upload settings
      const directData = {
        pages: [{ id: '1', buttons: [] }],
        appearance: { theme: 'dark' },
        advanced: { hideOnBlur: true },
      };

      const uploadResult = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData,
      });
      expect(uploadResult.success).toBe(true);

      // Reset mock to ensure clean state for download
      const mockApiClient = mockClient.createApiClient();
      mockApiClient.get.mockResolvedValue({
        data: {
          pages: [{ id: '2', buttons: [] }],
          appearance: { theme: 'light' },
          advanced: { hideOnBlur: false },
        },
      });

      // Download settings
      const downloadResult = await sync.downloadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
      });
      expect(downloadResult.success).toBe(true);

      // Check final status
      const finalStatus = sync.getLastSyncStatus();
      expect(finalStatus.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined parameters', async () => {
      const result = await sync.isCloudSyncEnabled({
        hasValidToken: undefined,
        configStore: undefined,
      });

      expect(result).toBe(false);
    });

    test('should handle null config store responses', async () => {
      mockHasValidToken.mockResolvedValue(true);
      mockConfigStore.get.mockReturnValue(null);

      const result = await sync.isCloudSyncEnabled({
        hasValidToken: mockHasValidToken,
        configStore: mockConfigStore,
      });

      expect(result).toBe(false);
    });

    test('should handle very large data uploads', async () => {
      const largeData = {
        pages: new Array(100).fill({}).map((_, i) => ({
          id: `page-${i}`,
          buttons: new Array(50).fill({}).map((_, j) => ({
            id: `btn-${i}-${j}`,
            data: 'x'.repeat(1000),
          })),
        })),
      };

      mockClient.authenticatedRequest.mockResolvedValue({
        success: true,
        data: { message: 'Large upload successful' },
      });

      const result = await sync.uploadSettings({
        hasValidToken: mockHasValidToken,
        onUnauthorized: mockOnUnauthorized,
        configStore: mockConfigStore,
        directData: largeData,
      });

      expect(result.success).toBe(true);
    });
  });
});