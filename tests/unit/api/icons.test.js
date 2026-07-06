/**
 * Toast API - Icons Module Tests
 *
 * Tests for the button icon upload API module.
 */

// Mock logger
jest.mock('../../../src/main/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Mock API client
const mockClient = {
  createApiClient: jest.fn(),
  getAccessToken: jest.fn(() => 'test-token'),
  authenticatedRequest: jest.fn(),
  ENDPOINTS: {
    USER_ICONS: 'https://app.toast.sh/api/users/icons',
  },
};

jest.mock('../../../src/main/api/client', () => mockClient);

const fs = require('fs');
const icons = require('../../../src/main/api/icons');

describe('API Icons Module', () => {
  let mockPost;

  beforeEach(() => {
    jest.clearAllMocks();
    icons.resetUploadState();

    fs.promises.stat.mockResolvedValue({ mtimeMs: 1000 });
    fs.promises.readFile.mockResolvedValue(Buffer.from('png-bytes'));

    mockPost = jest.fn().mockResolvedValue({
      data: { success: true, data: { url: 'https://icons.example.com/icons/abc/def.png' } },
    });
    mockClient.createApiClient.mockReturnValue({ post: mockPost });

    // Pass through to the API call by default (success path)
    mockClient.authenticatedRequest.mockImplementation(async apiCall => await apiCall());
  });

  describe('uploadIcon', () => {
    test('uploads the file and returns the server URL', async () => {
      const result = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(result).toEqual({ success: true, url: 'https://icons.example.com/icons/abc/def.png' });
      expect(fs.promises.readFile).toHaveBeenCalledWith('/mock/icons/App.png');

      // multipart 요청: JSON 기본 헤더 없이 생성, Authorization 만 명시
      expect(mockClient.createApiClient).toHaveBeenCalledWith({ timeout: 15000, headers: {} });
      const [url, body, config] = mockPost.mock.calls[0];
      expect(url).toBe(mockClient.ENDPOINTS.USER_ICONS);
      expect(body).toBeInstanceOf(FormData);
      expect(config.headers).toEqual({ Authorization: 'Bearer test-token' });
      expect(config.headers['Content-Type']).toBeUndefined();
    });

    test('returns a cached URL without re-uploading the same file', async () => {
      await icons.uploadIcon({ filePath: '/mock/icons/App.png' });
      const result = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(result).toEqual({ success: true, url: 'https://icons.example.com/icons/abc/def.png', cached: true });
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    test('re-uploads when the file has been modified (different mtime)', async () => {
      await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      fs.promises.stat.mockResolvedValue({ mtimeMs: 2000 });
      await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    test('marks the endpoint unavailable on 404 and short-circuits later calls', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        error: { code: 'HTTP_404', message: 'Not Found', statusCode: 404 },
      });

      const first = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });
      expect(first.success).toBe(false);
      expect(first.unavailable).toBe(true);
      expect(icons.isUploadUnavailable()).toBe(true);

      const second = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });
      expect(second.success).toBe(false);
      expect(second.unavailable).toBe(true);
      // 두 번째 호출은 파일도 읽지 않고 단락되어야 한다
      expect(fs.promises.readFile).toHaveBeenCalledTimes(1);
    });

    test('marks the endpoint unavailable on 503 (server feature disabled)', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        error: { code: 'HTTP_503', message: 'Service Unavailable', statusCode: 503 },
      });

      const result = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(result.unavailable).toBe(true);
      expect(icons.isUploadUnavailable()).toBe(true);
    });

    test('does not mark unavailable on transient errors (500)', async () => {
      mockClient.authenticatedRequest.mockResolvedValue({
        error: { code: 'HTTP_500', message: 'Server Error', statusCode: 500 },
      });

      const result = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(result.success).toBe(false);
      expect(result.unavailable).toBeUndefined();
      expect(icons.isUploadUnavailable()).toBe(false);
    });

    test('passes onUnauthorized through to authenticatedRequest for 401 refresh', async () => {
      const onUnauthorized = jest.fn();
      await icons.uploadIcon({ filePath: '/mock/icons/App.png', onUnauthorized });

      expect(mockClient.authenticatedRequest).toHaveBeenCalledWith(expect.any(Function), { onUnauthorized });
    });

    test('returns an error when the file cannot be read', async () => {
      fs.promises.stat.mockRejectedValue(new Error('ENOENT'));

      const result = await icons.uploadIcon({ filePath: '/missing.png' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read icon file');
      expect(mockPost).not.toHaveBeenCalled();
    });

    test('returns an error on an unexpected response shape', async () => {
      mockPost.mockResolvedValue({ data: { success: true, data: {} } });

      const result = await icons.uploadIcon({ filePath: '/mock/icons/App.png' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid icon upload response');
    });
  });
});
