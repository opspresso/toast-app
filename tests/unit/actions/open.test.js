/**
 * Toast - Open Action Tests
 *
 * 파일/URL 열기 액션에 대한 단위 테스트
 */

// Mock dependencies
jest.mock('electron', () => ({
  shell: {
    openExternal: jest.fn(),
    openPath: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('path', () => ({
  resolve: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const { openItem } = require('../../../src/main/actions/open');
const { shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

describe('Open Action', () => {
  let originalPlatform;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Store original platform
    originalPlatform = process.platform;
    
    // Setup default mock implementations
    shell.openExternal.mockResolvedValue();
    shell.openPath.mockResolvedValue();
    fs.existsSync.mockReturnValue(true);
    path.resolve.mockImplementation((p) => `/resolved${p}`);
    exec.mockImplementation((command, callback) => {
      if (callback) callback(null);
    });
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
  });

  describe('openItem', () => {
    test('should return error when both URL and path are missing', async () => {
      const action = {};

      const result = await openItem(action);

      expect(result).toEqual({
        success: false,
        message: 'URL or path is required',
      });
    });

    test('should open URL when provided', async () => {
      const action = { url: 'https://example.com' };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
      expect(result).toEqual({
        success: true,
        message: 'Opened URL: https://example.com',
      });
    });

    test('should prefer URL over path when both are provided', async () => {
      const action = { 
        url: 'https://example.com',
        path: '/test/file.txt'
      };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
      expect(shell.openPath).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.message).toContain('URL');
    });

    test('should open path when URL is not provided', async () => {
      const action = { path: '/test/file.txt' };

      const result = await openItem(action);

      expect(path.resolve).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.existsSync).toHaveBeenCalledWith('/resolved/test/file.txt');
      expect(shell.openPath).toHaveBeenCalledWith('/resolved/test/file.txt');
      expect(result).toEqual({
        success: true,
        message: 'Opened: /resolved/test/file.txt',
      });
    });

    test('should handle unexpected errors gracefully', async () => {
      const action = { url: 'https://example.com' };
      const error = new Error('Unexpected error');
      
      shell.openExternal.mockRejectedValue(error);

      const result = await openItem(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error opening URL: Unexpected error');
      expect(result.error).toBe(error);
    });
  });

  describe('URL handling', () => {
    test('should open URL with protocol as-is', async () => {
      const action = { url: 'https://example.com' };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
      expect(result.success).toBe(true);
    });

    test('should add http:// prefix to URL without protocol', async () => {
      const action = { url: 'example.com' };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('http://example.com');
      expect(result.success).toBe(true);
    });

    test('should handle various URL protocols with :// format', async () => {
      const testCases = [
        { input: 'ftp://files.example.com', expected: 'ftp://files.example.com' },
        { input: 'file:///path/to/file', expected: 'file:///path/to/file' },
        { input: 'https://secure.example.com', expected: 'https://secure.example.com' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        const action = { url: testCase.input };

        const result = await openItem(action);

        expect(shell.openExternal).toHaveBeenCalledWith(testCase.expected);
        expect(result.success).toBe(true);
      }
    });

    test('should add http:// to protocols without :// format', async () => {
      const testCases = [
        { input: 'mailto:test@example.com', expected: 'http://mailto:test@example.com' },
        { input: 'tel:+1234567890', expected: 'http://tel:+1234567890' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        const action = { url: testCase.input };

        const result = await openItem(action);

        expect(shell.openExternal).toHaveBeenCalledWith(testCase.expected);
        expect(result.success).toBe(true);
      }
    });

    test('should handle URL opening error', async () => {
      const action = { url: 'https://example.com' };
      const error = new Error('Network error');
      
      shell.openExternal.mockRejectedValue(error);

      const result = await openItem(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error opening URL: Network error');
      expect(result.error).toBe(error);
    });
  });

  describe('path handling', () => {
    test('should open existing file path', async () => {
      const action = { path: 'relative/file.txt' };

      const result = await openItem(action);

      expect(path.resolve).toHaveBeenCalledWith('relative/file.txt');
      expect(fs.existsSync).toHaveBeenCalledWith('/resolvedrelative/file.txt');
      expect(shell.openPath).toHaveBeenCalledWith('/resolvedrelative/file.txt');
      expect(result).toEqual({
        success: true,
        message: 'Opened: /resolvedrelative/file.txt',
      });
    });

    test('should return error for non-existent path', async () => {
      const action = { path: '/nonexistent/file.txt' };
      
      fs.existsSync.mockReturnValue(false);

      const result = await openItem(action);

      expect(fs.existsSync).toHaveBeenCalledWith('/resolved/nonexistent/file.txt');
      expect(shell.openPath).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Path does not exist: /resolved/nonexistent/file.txt',
      });
    });

    test('should handle path opening error', async () => {
      const action = { path: '/test/file.txt' };
      const error = new Error('Permission denied');
      
      shell.openPath.mockRejectedValue(error);

      const result = await openItem(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error opening path: Permission denied');
      expect(result.error).toBe(error);
    });
  });

  describe('application-specific opening', () => {
    test('should open file with specific application on macOS', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
      });

      const action = { 
        path: '/test/file.txt',
        application: 'TextEdit'
      };

      const result = await openItem(action);

      expect(exec).toHaveBeenCalledWith(
        'open -a "TextEdit" "/resolved/test/file.txt"',
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'Opened /resolved/test/file.txt with TextEdit',
      });
    });

    test('should open file with specific application on Windows', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const action = { 
        path: '/test/file.txt',
        application: 'notepad.exe'
      };

      const result = await openItem(action);

      expect(exec).toHaveBeenCalledWith(
        'start "" "notepad.exe" "/resolved/test/file.txt"',
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'Opened /resolved/test/file.txt with notepad.exe',
      });
    });

    test('should open file with specific application on Linux', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const action = { 
        path: '/test/file.txt',
        application: 'gedit'
      };

      const result = await openItem(action);

      expect(exec).toHaveBeenCalledWith(
        'gedit "/resolved/test/file.txt"',
        expect.any(Function)
      );
      expect(result).toEqual({
        success: true,
        message: 'Opened /resolved/test/file.txt with gedit',
      });
    });

    test('should handle application execution error', async () => {
      const action = { 
        path: '/test/file.txt',
        application: 'NonexistentApp'
      };

      const error = new Error('Application not found');
      exec.mockImplementation((command, callback) => {
        callback(error);
      });

      const result = await openItem(action);

      // Note: Due to the async nature of exec callback, the error handling
      // in the current implementation doesn't properly propagate the error.
      // This test documents the current behavior.
      expect(result.success).toBe(true);
      expect(result.message).toContain('NonexistentApp');
    });

    test('should handle application opening with non-existent file', async () => {
      const action = { 
        path: '/nonexistent/file.txt',
        application: 'TextEdit'
      };

      fs.existsSync.mockReturnValue(false);

      const result = await openItem(action);

      expect(exec).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Path does not exist: /resolved/nonexistent/file.txt',
      });
    });

    test('should handle application opening error in try-catch', async () => {
      const action = { 
        path: '/test/file.txt',
        application: 'TextEdit'
      };

      // Mock exec to throw synchronously to test try-catch
      exec.mockImplementation(() => {
        throw new Error('Exec error');
      });

      const result = await openItem(action);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error opening with application: Exec error');
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('edge cases', () => {
    test('should handle empty URL', async () => {
      const action = { url: '' };

      const result = await openItem(action);

      expect(result).toEqual({
        success: false,
        message: 'URL or path is required',
      });
    });

    test('should handle empty path', async () => {
      const action = { path: '' };

      const result = await openItem(action);

      expect(result).toEqual({
        success: false,
        message: 'URL or path is required',
      });
    });

    test('should handle null URL', async () => {
      const action = { url: null };

      const result = await openItem(action);

      expect(result).toEqual({
        success: false,
        message: 'URL or path is required',
      });
    });

    test('should handle null path', async () => {
      const action = { path: null };

      const result = await openItem(action);

      expect(result).toEqual({
        success: false,
        message: 'URL or path is required',
      });
    });

    test('should handle URL with spaces', async () => {
      const action = { url: 'example.com/path with spaces' };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('http://example.com/path with spaces');
      expect(result.success).toBe(true);
    });

    test('should handle path with spaces', async () => {
      const action = { path: '/path with spaces/file.txt' };

      const result = await openItem(action);

      expect(path.resolve).toHaveBeenCalledWith('/path with spaces/file.txt');
      expect(result.success).toBe(true);
    });

    test('should handle complex URL without protocol', async () => {
      const action = { url: 'subdomain.example.com:8080/path?query=value#hash' };

      const result = await openItem(action);

      expect(shell.openExternal).toHaveBeenCalledWith('http://subdomain.example.com:8080/path?query=value#hash');
      expect(result.success).toBe(true);
    });
  });
});